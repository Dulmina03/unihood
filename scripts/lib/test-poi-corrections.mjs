import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {runMigrations} from './database.mjs';
export async function testPoiCorrections({client,url,migrations,get}){
 const place='42000000-0000-4000-8000-000000000042',boarding='42000000-0000-4000-8000-000000000043',pendingId=randomUUID(),boardingIntake=randomUUID(),children=[];
 assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.poi_correction_intake')).rows[0].n,0);
 async function start(actor){const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,API_HOST:'127.0.0.1',API_PORT:String(port),APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:actor}});children.push(child);const base=`http://127.0.0.1:${port}`;for(let i=0;i<40;i++){try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(1000)})).ok)return base;}catch{}if(i===39||child.exitCode!==null)throw new Error('POI correction test API startup failed');await delay(250);}}
 const input={key:randomUUID(),placeId:place,change:{kind:'CATEGORY',category:'clinic'},observedOn:'2026-11-16',evidenceNote:'Synthetic PRIVATE_EVIDENCE_CANARY; fictional service context only.',publicBusinessConfirmed:true,syntheticAcknowledged:true};
 const post=(base,body)=>fetch(base+'/api/v1/contributions/correction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const history=(base,query='')=>fetch(base+'/api/v1/contributions'+query,{signal:AbortSignal.timeout(8000)});
 try{
  await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,category,data_kind,source_label,status) VALUES($1,'POI','Synthetic Correction Fixture','synthetic correction fixture','pharmacy','SYNTHETIC','UNI-042 explicitly fictional test service','ACTIVE')",[place]);
  await client.query('INSERT INTO public.public_place_locations(place_id,entrance_geo,source) VALUES($1,ST_SetSRID(ST_Point(0.0008,0.0007),4326),$2)',[place,'UNI-042 explicitly synthetic entrance fixture']);
  await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,data_kind,source_label,status) VALUES($1,'BOARDING','Synthetic PRIVATE_BOARDING_CANARY','synthetic private boarding canary','SYNTHETIC','UNI-042 fictional private residence test','ACTIVE')",[boarding]);
  await client.query("INSERT INTO public.boarding_properties(place_id,data_kind,visibility) VALUES($1,'SYNTHETIC','HIDDEN')",[boarding]);
  await client.query("INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,retention_policy) VALUES($1,ST_SetSRID(ST_Point(43.654321,42.123456),4326),'synthetic-test-only')",[boarding]);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid='unihood_private.poi_correction_intake'::regclass AND a.grantee=0")).rows[0].n,0);
  const before=(await client.query('SELECT p.canonical_name,p.category,p.status,p.updated_at,ST_AsText(l.entrance_geo) AS geo FROM public.places p JOIN public.public_place_locations l ON l.place_id=p.id WHERE p.id=$1',[place])).rows;
  const contributor=await start('contributor'),other=await start('owner-a');
  assert.equal((await get('/api/v1/contributions')).status,401);
  assert.deepEqual((await(await history(contributor)).json()).items,[]);
  const races=await Promise.all([post(contributor,input),post(contributor,input)]);assert.ok(races.every(r=>r.status===200));const receipts=await Promise.all(races.map(r=>r.json()));assert.deepEqual(receipts[0],receipts[1]);assert.equal(receipts[0].reviewState,'PENDING');assert.equal(receipts[0].published,false);assert.ok(!JSON.stringify(receipts[0]).includes('PRIVATE_EVIDENCE_CANARY'));
  assert.deepEqual(await(await post(contributor,{...input,change:{category:'clinic',kind:'CATEGORY'}})).json(),receipts[0]);
  assert.equal((await post(contributor,{...input,change:{kind:'CATEGORY',category:'restaurant'}})).status,409);
  const isolated=await post(other,input);assert.equal(isolated.status,200);assert.notEqual((await isolated.json()).contributionId,receipts[0].contributionId);
  for(const change of [{kind:'NAME',name:'Synthetic Proposed Replacement'},{kind:'CLOSURE',state:'PERMANENTLY_CLOSED'},{kind:'MOVED',publicEntrance:{lat:42.123456,lng:43.654321}},{kind:'DETAILS',description:'Synthetic different opening-hours context, not real service hours.'}]){const r=await post(contributor,{...input,key:randomUUID(),change});assert.equal(r.status,200);const body=await r.json();assert.equal(body.published,false);if(['CLOSURE','MOVED'].includes(change.kind))assert.equal(body.reviewState,'NEEDS_EVIDENCE');}
  assert.equal((await post(contributor,{...input,key:randomUUID(),observedOn:'2100-01-01'})).status,400);
  assert.equal((await post(contributor,{...input,key:randomUUID(),placeId:randomUUID()})).status,404);
  assert.equal((await post(contributor,{...input,key:randomUUID(),placeId:boarding})).status,404);
  assert.equal((await post(contributor,{...input,key:randomUUID(),change:{kind:'CATEGORY',category:'synthetic_missing_category'}})).status,409);
  await client.query("CREATE FUNCTION public.synthetic_correction_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$; CREATE TRIGGER synthetic_correction_failure BEFORE INSERT ON unihood_private.poi_correction_intake FOR EACH ROW EXECUTE FUNCTION public.synthetic_correction_failure()");
  assert.equal((await post(contributor,{...input,key:randomUUID()})).status,503);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.poi_correction_intake')).rows[0].n,6);
  await client.query('DROP TRIGGER synthetic_correction_failure ON unihood_private.poi_correction_intake; DROP FUNCTION public.synthetic_correction_failure()');
  await client.query("INSERT INTO public.poi_pending_proposals(id,actor_ref,name,normalized_name,category,public_entrance,distinct_reason) VALUES($1,'synthetic:contributor','Synthetic PRIVATE_PENDING_NAME_CANARY','synthetic private pending name canary','pharmacy',ST_SetSRID(ST_Point(42.123456,43.654321),4326),'Synthetic PRIVATE_PENDING_REASON_CANARY')",[pendingId]);
  await client.query("INSERT INTO unihood_private.boarding_recommendation_intake(id,actor_ref,idempotency_key,payload_hash,title,description,locality,facilities,review_state,privacy_acknowledged,media_guidance_acknowledged) VALUES($1,'synthetic:contributor',$2,$3,'Synthetic PRIVATE_BOARDING_TITLE_CANARY','Synthetic PRIVATE_BOARDING_DESCRIPTION_CANARY',NULL,'{}','PENDING',true,true)",[boardingIntake,randomUUID(),'0'.repeat(64)]);
  const allResponse=await history(contributor);assert.equal(allResponse.status,200);assert.equal(allResponse.headers.get('cache-control'),'no-store');const all=await allResponse.json();assert.equal(all.items.length,7);assert.deepEqual(new Set(all.items.map(row=>row.kind)),new Set(['POI_CORRECTION','POI_PROPOSAL','BOARDING_RECOMMENDATION']));assert.ok(!/PRIVATE_|42\.123456|43\.654321|actor_ref|payload|evidenceNote|publicEntrance|facilities/.test(JSON.stringify(all)));
  const small=await(await history(contributor,'?page=1&pageSize=2')).json(),next=await(await history(contributor,'?page=2&pageSize=2')).json();assert.equal(small.items.length,2);assert.equal(small.page.hasNextPage,true);assert.ok(next.items.every(item=>!small.items.some(prior=>prior.id===item.id)));
  const needs=await(await history(contributor,'?kind=POI_CORRECTION&state=NEEDS_EVIDENCE')).json();assert.equal(needs.items.length,2);assert.ok(needs.items.every(row=>row.state==='NEEDS_EVIDENCE'));
  const otherHistory=await(await history(other)).json();assert.equal(otherHistory.items.length,1);assert.ok(otherHistory.items.every(row=>!all.items.some(item=>item.id===row.id)));
  assert.equal((await history(other,'?actorId=synthetic:contributor')).status,400);
  assert.deepEqual((await client.query('SELECT p.canonical_name,p.category,p.status,p.updated_at,ST_AsText(l.entrance_geo) AS geo FROM public.places p JOIN public.public_place_locations l ON l.place_id=p.id WHERE p.id=$1',[place])).rows,before);
  await client.query('DELETE FROM public.public_place_locations WHERE place_id=$1',[place]);const replay=await post(contributor,input);assert.equal(replay.status,200);assert.equal((await replay.json()).placeId,null);const suppressed=await(await history(contributor)).json();assert.ok(suppressed.items.every(row=>row.placeId===null));
  assert.equal((await client.query('SELECT ST_AsText(exact_geo) AS geo FROM unihood_private.boarding_locations WHERE boarding_id=$1',[boarding])).rows[0].geo,'POINT(43.654321 42.123456)');
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);
  await runMigrations(client,migrations,'migrate');
  console.log('PASS: UNI-042 real held name/category/closure/moved/details, concurrency/replay/conflict/actor isolation, future/boarding/unknown denials, injected atomic rollback, own three-kind paginated/filter history without private payloads and source-withdrawal suppression; canonical public facts unchanged');
 }finally{
  await Promise.all(children.map(async child=>{if(child.exitCode!==null)return;child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}));
  await client.query('DELETE FROM unihood_private.poi_correction_intake WHERE place_id=$1',[place]);await client.query('DELETE FROM public.poi_pending_proposals WHERE id=$1',[pendingId]);await client.query('DELETE FROM unihood_private.boarding_recommendation_intake WHERE id=$1',[boardingIntake]);await client.query('DELETE FROM public.public_place_locations WHERE place_id=$1',[place]);await client.query('DELETE FROM public.places WHERE id=$1',[place]);await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=$1',[boarding]);await client.query('DELETE FROM public.boarding_properties WHERE place_id=$1',[boarding]);await client.query('DELETE FROM public.places WHERE id=$1',[boarding]);
 }
 await client.query('CREATE VIEW public.synthetic_correction_dependency AS SELECT id FROM unihood_private.poi_correction_intake');assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);await assert.rejects(runMigrations(client,migrations,'rollback'),error=>error.code==='2BP01');await client.query('DROP VIEW public.synthetic_correction_dependency');assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: UNI-042 private ACL/data boundaries and populated/dependency refusal, empty rollback/re-migration repeatability, prior schema and extension ownership preserved');
}
