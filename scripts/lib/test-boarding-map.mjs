import { startLandingIntegration } from './test-landing.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { seedBoardingAdvertisements } from './boarding-seeds.mjs';
import { runMigrations } from './database.mjs';
export async function testBoardingMap({client,url,migrations,get,endpoint:guestEndpoint}){
 const id='00000000-0000-4000-8000-000000000001',env={APP_ENV:'test',NODE_ENV:'test'};
 assert.equal((await client.query('SELECT count(*)::int AS n FROM public.places WHERE id=$1',[id])).rows[0].n,0);
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,...env,API_HOST:'127.0.0.1',API_PORT:String(port),WEB_PORT:'3180',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'owner-a'}});
 const endpoint=`http://127.0.0.1:${port}`,path='/api/v1/owner/boardings/'+id+'/map-settings';
 let web;
 const readMap=async()=>{const r=await get('/api/v1/boardings/map');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const body=await r.json();if(web){const proxy=await fetch(web.base+'/api/boardings/map');assert.equal(proxy.status,200);assert.equal(proxy.headers.get('cache-control'),'no-store');assert.deepEqual(await proxy.json(),body);}return body;};
 const change=(expectedRevision,choice,ownerAlias=false)=>fetch(endpoint+(ownerAlias?path:'/api/v1/boardings/'+id+'/visibility'),{method:ownerAlias?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision,choice}),signal:AbortSignal.timeout(8000)});
 const publicChoice={visibility:'PUBLIC_MAP',entranceFixture:'synthetic-courtyard-entrance',publicMapConsent:true,externalCopiesAcknowledged:true};
 try{
  for(let i=0;i<40;i++){try{if((await fetch(endpoint+'/health')).ok)break;}catch{}if(i===39||child.exitCode!==null)throw new Error('Owner map API startup failed');await delay(250);}
  assert.equal(await seedBoardingAdvertisements(client,url,env,true),1);assert.equal(await seedBoardingAdvertisements(client,url,env,true),1);
  await client.query("INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,address_enc,retention_policy) VALUES($1,ST_SetSRID(ST_Point(43.654321,42.123456),4326),decode('53594e544845544943','hex'),'synthetic-test-only')",[id]);
  if(process.env.TEST_LANDING_WEB==='1')web=await startLandingIntegration(guestEndpoint);
  assert.equal((await readMap()).items.length,0);assert.equal((await get('/api/v1/boardings/'+id)).status,200);
  assert.equal((await fetch(endpoint+path)).status,200);
  assert.equal((await change(1,publicChoice,true)).status,200);const map=await readMap();assert.equal(map.items.length,1);assert.equal(map.items[0].id,id);assert.deepEqual(map.items[0].entrance,{lat:0,lng:0});assert.ok(!/42\.123456|43\.654321|exact_geo|address_enc|actor_ref/.test(JSON.stringify(map)));
  assert.equal((await get('/api/v1/boardings/'+id)).status,404); // private-only ad route never masks map geometry
  assert.equal((await change(1,{visibility:'HIDDEN'})).status,409);
  const hidden=await change(2,{visibility:'HIDDEN'});assert.equal(hidden.status,200);const hiddenBody=await hidden.json();assert.equal(hiddenBody.id,id);assert.equal(hiddenBody.revision,3);assert.ok(!/"lat"|"lng"|42\.123456|43\.654321/.test(JSON.stringify(hiddenBody)));
  assert.equal((await readMap()).items.length,0);assert.equal((await client.query('SELECT count(*)::int AS n FROM public.boarding_public_entrances')).rows[0].n,0);
  const detail=await get('/api/v1/boardings/'+id);assert.equal(detail.status,200);const payload=await detail.json();assert.equal(payload.listing.id,id);assert.equal(payload.listing.entrance,null);assert.equal(payload.listing.locationLabel,null);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.listings WHERE boarding_id=$1',[id])).rows[0].n,3);assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_locations WHERE boarding_id=$1',[id])).rows[0].n,1);
  await assert.rejects(seedBoardingAdvertisements(client,url,env,true),/existing data preserved/);
  console.log('PASS: real guarded owner HTTP publishes only separately selected synthetic public entrance; hidden revocation removes point immediately, preserves canonical ID, private verification and listing history; seeds repeat/conflict safely');
  const parallel=await Promise.all([change(3,publicChoice),change(3,{visibility:'AREA_ONLY',locality:'Synthetic North Quarter'})]);assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);
  let settings=await (await fetch(endpoint+path)).json();assert.equal(settings.revision,4);
  assert.equal((await change(4,publicChoice)).status,200);
  for(const sql of ["UPDATE public.boarding_properties SET authorization_status='DISPUTED',visibility='HIDDEN',public_map_consent=false,map_consent_at=NULL WHERE place_id=$1","UPDATE public.places SET status='ARCHIVED' WHERE id=$1"]){
   await client.query('BEGIN');try{await client.query(sql,[id]);assert.equal((await readMap()).items.length,1); // uncommitted transaction is invisible to readers
   }finally{await client.query('ROLLBACK');}
  }
  await client.query("UPDATE public.boarding_properties SET authorization_status='DISPUTED',visibility='HIDDEN',public_map_consent=false,map_consent_at=NULL WHERE place_id=$1",[id]);assert.equal((await readMap()).items.length,0);
  await client.query("UPDATE public.boarding_properties SET authorization_status='LOCAL_TEST_AUTHORIZED',visibility='PUBLIC_MAP',public_map_consent=true,map_consent_at=(SELECT consent_at FROM public.boarding_public_entrances WHERE boarding_id=$1) WHERE place_id=$1",[id]);assert.equal((await readMap()).items.length,1);
  const {BoardingMapService}=await import('../../apps/api/dist/boardings/boarding-map.service.js');const deployed=new BoardingMapService({includeSynthetic:false,query:async(sql,values)=>(await client.query(sql,values)).rows});assert.equal((await deployed.list({})).items.length,0);
  await client.query("UPDATE public.places SET status='ARCHIVED' WHERE id=$1",[id]);assert.equal((await readMap()).items.length,0);await client.query("UPDATE public.places SET status='ACTIVE' WHERE id=$1",[id]);
  await client.query("UPDATE public.listings SET publication_status='DISPUTED',is_current=false WHERE boarding_id=$1 AND is_current",[id]);assert.equal((await readMap()).items.length,0);
  await client.query("UPDATE public.listings SET publication_status='PUBLISHED',is_current=true WHERE boarding_id=$1 AND revision=5",[id]);
  await client.query("CREATE FUNCTION public.synthetic_map_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$; CREATE TRIGGER synthetic_map_failure BEFORE INSERT ON unihood_private.boarding_visibility_events FOR EACH ROW EXECUTE FUNCTION public.synthetic_map_failure()");
  assert.equal((await change(5,{visibility:'HIDDEN'})).status,503);assert.equal((await readMap()).items.length,1);settings=await (await fetch(endpoint+path)).json();assert.equal(settings.revision,5);
  await client.query('DROP TRIGGER synthetic_map_failure ON unihood_private.boarding_visibility_events; DROP FUNCTION public.synthetic_map_failure()');
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['017_privacy_reports']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['014_boarding_recommendation_resolutions']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['013_boarding_recommendation_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['012_boarding_media_contacts']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['011_boarding_vacancy_confirmations']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['010_boarding_inventory_prices']);
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);
  assert.equal((await change(5,{visibility:'AREA_ONLY',locality:'Synthetic Garden District'})).status,200);assert.equal((await readMap()).items.length,0);assert.equal((await (await get('/api/v1/boardings/'+id)).json()).listing.locationLabel,'Synthetic Garden District');
  console.log('PASS: real visibility race has one winner and revision conflict; archived/disputed records excluded; mid-write failure rolls back consent/point/history atomically; populated rollback retains data');
 }finally{
  await web?.close();
  if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>{const timer=setTimeout(()=>{child.kill('SIGKILL');r();},5000);child.once('exit',()=>{clearTimeout(timer);r();});});}
  await client.query('DELETE FROM public.boarding_public_entrances WHERE boarding_id=$1',[id]);await client.query('DELETE FROM unihood_private.boarding_visibility_events WHERE boarding_id=$1',[id]);await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=$1',[id]);await client.query('DELETE FROM public.listings WHERE boarding_id=$1',[id]);await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=$1',[id]);await client.query('DELETE FROM public.boarding_properties WHERE place_id=$1',[id]);await client.query('DELETE FROM public.places WHERE id=$1',[id]);
 }
 await client.query('CREATE VIEW public.synthetic_map_dependency AS SELECT boarding_id FROM public.boarding_public_entrances');await assert.rejects(runMigrations(client,migrations,'rollback'),e=>e.code==='2BP01');await client.query('DROP VIEW public.synthetic_map_dependency');
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['009_boarding_public_entrances']);await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: public entrance dependency rollback atomic; empty down/up/repeat preserves immutable migrations, persistent-data guards and extension ownership');
}
