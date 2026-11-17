import { startLandingIntegration } from './test-landing.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { seedBoardingAdvertisements } from './boarding-seeds.mjs';
import { runMigrations } from './database.mjs';
export async function testBoardingInventory({client,url,migrations,get,endpoint}){
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',otherUnit='74000000-0000-4000-8000-000000000002';
 for(const id of [a,b])assert.equal((await client.query('SELECT count(*)::int AS n FROM public.places WHERE id=$1',[id])).rows[0].n,0);
 const children=[];
 async function actor(fixture){const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,APP_ENV:'test',NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:String(port),WEB_PORT:'3180',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:fixture}});children.push(child);const base=`http://127.0.0.1:${port}`;for(let i=0;i<40;i++){try{if((await fetch(base+'/health')).ok)return base;}catch{}if(i===39||child.exitCode!==null)throw new Error('Inventory actor API startup failed');await delay(250);}}
 let owner,manager,web;
 const send=(base,path,body,method='POST')=>fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const inventory=async()=>{const r=await fetch(owner+`/api/v1/owner/boardings/${a}/inventory`);assert.equal(r.status,200);return r.json();};
 const units=async()=>{const r=await get(`/api/v1/boardings/${a}/units`);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const body=await r.json();assert.ok(!/42\.123456|43\.654321|exact_geo|address_enc|author_ref|actorId|availableBeds|"lat"|"lng"|"route"|distanceMeters/.test(JSON.stringify(body)));if(web){const proxy=await fetch(web.base+`/api/boardings/${a}/units`);assert.equal(proxy.status,200);assert.deepEqual(await proxy.json(),body);}return body.items;};
 const path=`/api/v1/boardings/${a}/prices`;let unitId;
 try{
  owner=await actor('owner-a');manager=await actor('price-manager-a');if(process.env.TEST_LANDING_WEB==='1')web=await startLandingIntegration(endpoint);
  assert.equal(await seedBoardingAdvertisements(client,url,{APP_ENV:'test',NODE_ENV:'test'},true),1);
  await client.query("INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,address_enc,retention_policy) VALUES($1,ST_SetSRID(ST_Point(43.654321,42.123456),4326),decode('53594e544845544943','hex'),'synthetic-test-only')",[a]);
  assert.deepEqual(await units(),[]);assert.equal((await inventory()).inventoryRevision,0);
  let r=await send(owner,`/api/v1/owner/boardings/${a}/units`,{expectedInventoryRevision:0,template:'STUDY_ROOM',capacity:4});assert.equal(r.status,200);unitId=(await r.json()).unitId;
  assert.equal((await send(owner,`/api/v1/owner/boardings/${a}/units`,{expectedInventoryRevision:0,template:'STUDY_ROOM',capacity:4})).status,409);
  assert.equal((await send(owner,`/api/v1/owner/boardings/${a}/units`,{expectedInventoryRevision:1,template:'SHARED_ROOM',capacity:2})).status,200);
  const input={unitId,expectedPriceRevision:0,currency:'LKR',period:'MONTH',basis:'BED',rentMinor:1000000,depositMinor:2500000,utilityTerms:'SEPARATE',mealTerms:'NOT_SHARED',effectiveAt:'2000-01-01T00:00:00Z',reason:'INITIAL'};
  assert.equal((await send(manager,path,input)).status,200); // no map capability, no forced location disclosure
  assert.equal((await units()).find(u=>u.id===unitId).price.rentMinor,1000000);
  assert.equal((await send(owner,path,{...input,expectedPriceRevision:1,rentMinor:99000000,effectiveAt:'2099-01-01T00:00:00Z',reason:'FEE_CHANGE'})).status,200);
  assert.equal((await units()).find(u=>u.id===unitId).price.revision,1);const owned=(await inventory()).units.find(u=>u.id===unitId);assert.equal(owned.priceRevision,2);assert.equal(owned.priceHistory[0].rentMinor,99000000);assert.ok(!JSON.stringify(owned).includes('synthetic:price-manager-a'));
  assert.ok((await units()).every(u=>u.vacancy.status==='UNKNOWN'));assert.equal((await client.query('SELECT visibility,public_map_consent FROM public.boarding_properties WHERE place_id=$1',[a])).rows[0].visibility,'HIDDEN');
  await client.query('UPDATE public.boarding_units SET available_beds=3 WHERE id=$1',[unitId]);assert.equal((await send(owner,`/api/v1/owner/boardings/${a}/units/${unitId}`,{expectedRevision:1,template:'STUDY_ROOM',capacity:2},'PATCH')).status,400);assert.equal((await send(owner,`/api/v1/owner/boardings/${a}/units/${unitId}`,{expectedRevision:1,template:'STUDY_ROOM',capacity:5},'PATCH')).status,200);assert.equal((await units()).find(u=>u.id===unitId).vacancy.status,'UNKNOWN');
  console.log('PASS: real owner inventory and scoped price-manager LKR revisions; exact minor amounts/deposit/terms, future-effective exclusion, retained minimal history, capacity constraints and UNKNOWN vacancy without hidden geometry or map consent');
  await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,data_kind,source_label,status) VALUES($1,'BOARDING','Synthetic Separate Property','synthetic separate property','SYNTHETIC','Synthetic unit target-isolation fixture','ACTIVE')",[b]);await client.query("INSERT INTO public.boarding_properties(place_id,data_kind) VALUES($1,'SYNTHETIC')",[b]);await client.query("INSERT INTO public.boarding_units(id,boarding_id,label,room_type,capacity) VALUES($1,$2,'Synthetic separate unit','STUDY_ROOM',1)",[otherUnit,b]);
  assert.equal((await send(owner,path,{...input,unitId:otherUnit})).status,404);assert.equal((await send(owner,`/api/v1/boardings/${b}/prices`,{...input,unitId:otherUnit})).status,403);
  const guest=await get(`/api/v1/boardings/${b}/units`);assert.equal(guest.status,404);
  await assert.rejects(client.query("INSERT INTO public.boarding_official_prices(id,boarding_id,unit_id,revision,currency,period,basis,rent_minor,utility_terms,meal_terms,effective_at,author_ref,change_reason) VALUES(gen_random_uuid(),$1,$2,1,'LKR','MONTH','ROOM',1,'NOT_SHARED','NOT_SHARED',CURRENT_TIMESTAMP,'synthetic:owner-a','INITIAL')",[a,otherUnit]),e=>e.code==='23503');
  const parallel=await Promise.all([send(owner,path,{...input,expectedPriceRevision:2,rentMinor:2000000,effectiveAt:'2020-01-01T00:00:00Z',reason:'CORRECTION'}),send(owner,path,{...input,expectedPriceRevision:2,rentMinor:3000000,effectiveAt:'2020-01-01T00:00:00Z',reason:'CORRECTION'})]);assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);
  await client.query("CREATE FUNCTION public.synthetic_price_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.price_revision>OLD.price_revision THEN RAISE EXCEPTION 'PRIVATE_CANARY synthetic price failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_price_failure BEFORE UPDATE ON public.boarding_units FOR EACH ROW EXECUTE FUNCTION public.synthetic_price_failure()");
  const zero={...input,expectedPriceRevision:3,rentMinor:0,depositMinor:0,effectiveAt:'2025-01-01T00:00:00Z',reason:'CORRECTION'};const failure=await send(owner,path,zero);assert.equal(failure.status,503);assert.ok(!JSON.stringify(await failure.json()).includes('PRIVATE_CANARY'));assert.equal((await client.query('SELECT count(*)::int AS n FROM public.boarding_official_prices WHERE unit_id=$1',[unitId])).rows[0].n,3);
  await client.query('DROP TRIGGER synthetic_price_failure ON public.boarding_units; DROP FUNCTION public.synthetic_price_failure()');assert.equal((await send(owner,path,zero)).status,200);assert.equal((await units()).find(u=>u.id===unitId).price.rentMinor,0);
  for(let revision=4;revision<21;revision++)assert.equal((await send(owner,path,{...input,expectedPriceRevision:revision,rentMinor:100+revision,effectiveAt:'2001-01-01T00:00:00Z',reason:'CORRECTION'})).status,200);
  const latest=(await inventory()).units.find(u=>u.id===unitId);assert.equal(latest.priceHistory.length,20);assert.equal(latest.hasMoreHistory,true);
  const historyPath=`/api/v1/owner/boardings/${a}/units/${unitId}/prices`;
  const older=await fetch(owner+historyPath+'?page=2&pageSize=20');assert.equal(older.status,200);const history=await older.json();assert.deepEqual(history.page,{page:2,pageSize:20,hasNextPage:false});assert.deepEqual(history.items.map(p=>p.revision),[1]);assert.ok(!JSON.stringify(history).includes('author_ref'));assert.equal((await get(historyPath)).status,401);
  assert.equal((await fetch(owner+historyPath+'?page=1&page=2')).status,400);assert.equal((await fetch(owner+historyPath.replace(unitId,otherUnit))).status,404);
  assert.equal((await units()).find(u=>u.id===unitId).price.revision,4);
  for(const sql of ["UPDATE public.boarding_properties SET authorization_status='UNVERIFIED' WHERE place_id=$1","UPDATE public.places SET status='ARCHIVED' WHERE id=$1"]){await client.query(sql,[a]);assert.equal((await get(`/api/v1/boardings/${a}/units`)).status,404);await client.query("UPDATE public.places SET status='ACTIVE' WHERE id=$1",[a]);await client.query("UPDATE public.boarding_properties SET authorization_status='LOCAL_TEST_AUTHORIZED' WHERE place_id=$1",[a]);}
  const {BoardingInventoryService}=await import('../../apps/api/dist/boardings/boarding-inventory.service.js');const deployed=new BoardingInventoryService({includeSynthetic:false,query:async(sql,v)=>(await client.query(sql,v)).rows});await assert.rejects(deployed.publicUnits(a,{}),e=>e.getStatus()===404);
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);assert.equal((await client.query('SELECT count(*)::int AS n FROM public.boarding_official_prices WHERE unit_id=$1',[unitId])).rows[0].n,21);
  console.log('PASS: real unit/property target isolation and FK, price race/replay conflict, insert+revision rollback after injected failure, zero vs missing fees, current-authority/archive and deployed filtering; populated pricing rollback preserves data');
 }finally{
  if(web)await web.close();
  await Promise.all(children.map(async child=>{if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>{const timer=setTimeout(()=>{child.kill('SIGKILL');r();},5000);child.once('exit',()=>{clearTimeout(timer);r();});});}}));
  // Both IDs were proven absent before this owned disposable test inserted them.
  await client.query('DELETE FROM public.boarding_official_prices WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM public.boarding_units WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=$1',[a]);await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=$1',[a]);await client.query('DELETE FROM public.listings WHERE boarding_id=$1',[a]);await client.query('DELETE FROM public.boarding_properties WHERE place_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[[a,b]]);
 }
 await client.query('CREATE VIEW public.synthetic_price_dependency AS SELECT unit_id FROM public.boarding_official_prices');await assert.rejects(runMigrations(client,migrations,'rollback'),e=>e.code==='2BP01');await client.query('DROP VIEW public.synthetic_price_dependency');assert.deepEqual(await runMigrations(client,migrations,'rollback'),['010_boarding_inventory_prices']);await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: pricing dependency rollback atomic; empty down/up/repeat preserves prior units/properties, existing SQL checksums and extension ownership');
}
