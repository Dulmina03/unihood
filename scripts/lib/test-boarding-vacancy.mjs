import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {seedBoardingAdvertisements} from './boarding-seeds.mjs';
import {runMigrations} from './database.mjs';
import {startLandingIntegration} from './test-landing.mjs';
export async function testBoardingVacancy({client,url,migrations,get,endpoint}){
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',other='76000000-0000-4000-8000-000000000002';
 for(const id of [a,b])assert.equal((await client.query('SELECT count(*)::int AS n FROM public.places WHERE id=$1',[id])).rows[0].n,0);
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));let child,web,unitId;
 const base=`http://127.0.0.1:${port}`,path=`/api/v1/boardings/${a}/vacancy-confirmations`;
 const send=(route,body,method='POST')=>fetch(base+route,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const units=async()=>{const response=await get(`/api/v1/boardings/${a}/units`);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const body=await response.json();assert.ok(!/42\.123456|43\.654321|exact_geo|author_ref|actorId|address_enc|"lat"|"lng"|distanceMeters|"route"/.test(JSON.stringify(body)));if(web){const proxy=await fetch(web.base+`/api/boardings/${a}/units`);assert.equal(proxy.status,200);assert.deepEqual(await proxy.json(),body);}return body.items.find(u=>u.id===unitId);};
 const inventory=async()=>{const response=await fetch(base+`/api/v1/owner/boardings/${a}/inventory`);assert.equal(response.status,200);return (await response.json()).units.find(u=>u.id===unitId);};
 try{
  child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,APP_ENV:'test',NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:String(port),WEB_PORT:'3180',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'owner-a',VACANCY_TTL_DAYS:'1'}});
  for(let i=0;i<40;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}if(i===39||child.exitCode!==null)throw new Error('Vacancy actor API startup failed');await delay(250);}
  if(process.env.TEST_LANDING_WEB==='1')web=await startLandingIntegration(endpoint);
  await seedBoardingAdvertisements(client,url,{APP_ENV:'test',NODE_ENV:'test'},true);
  await client.query("INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,address_enc,retention_policy) VALUES($1,ST_SetSRID(ST_Point(43.654321,42.123456),4326),decode('53594e544845544943','hex'),'synthetic-test-only')",[a]);
  let response=await send(`/api/v1/owner/boardings/${a}/units`,{expectedInventoryRevision:0,template:'STUDY_ROOM',capacity:4});assert.equal(response.status,200);unitId=(await response.json()).unitId;
  assert.equal((await units()).vacancy.status,'UNKNOWN');
  const input={unitId,expectedUnitRevision:1,expectedVacancyRevision:0,status:'AVAILABLE',availableBeds:2,reason:'INITIAL'};
  assert.equal((await send(path,{...input,availableBeds:5})).status,400);assert.equal((await send(path,{...input,confirmedAt:'PRIVATE_CANARY'})).status,400);const {unitId:pathUnit,...canonical}=input;assert.equal((await send(`/api/v1/boardings/${a}/units/${pathUnit}/availability`,canonical,'PATCH')).status,200);
  let current=(await units()).vacancy;assert.equal(current.status,'AVAILABLE');assert.equal(current.availableBeds,2);assert.equal(Date.parse(current.expiresAt)-Date.parse(current.confirmedAt),86400000);assert.equal((await client.query('SELECT visibility,public_map_consent FROM public.boarding_properties WHERE place_id=$1',[a])).rows[0].visibility,'HIDDEN');
  assert.equal((await send(path,input)).status,409);assert.equal((await send(path,{...input,expectedVacancyRevision:1,status:'FULL',availableBeds:0,reason:'STATUS_CHANGE'})).status,200);assert.equal((await units()).vacancy.status,'FULL');
  assert.equal((await send(path,{...input,expectedVacancyRevision:2,status:'UNKNOWN',availableBeds:null,reason:'STATUS_CHANGE'})).status,200);current=(await units()).vacancy;assert.equal(current.status,'UNKNOWN');assert.ok(current.confirmedAt);assert.equal(current.availableBeds,null);
  assert.equal((await send(path,{...input,expectedVacancyRevision:3,availableBeds:3,reason:'RECONFIRMATION'})).status,200);
  assert.equal((await send(`/api/v1/owner/boardings/${a}/units/${unitId}`,{expectedRevision:1,template:'STUDY_ROOM',capacity:6},'PATCH')).status,200);assert.deepEqual((await units()).vacancy,{status:'UNKNOWN',confirmedAt:null,expiresAt:null});assert.equal((await send(path,{...input,expectedVacancyRevision:4,reason:'RECONFIRMATION'})).status,409);
  assert.equal((await send(path,{...input,expectedUnitRevision:2,expectedVacancyRevision:4,availableBeds:4,reason:'RECONFIRMATION'})).status,200);
  // Deliberate database-only clock fixtures; no API can submit confirmation time.
  await client.query("UPDATE public.boarding_vacancy_confirmations SET confirmed_at=CURRENT_TIMESTAMP-INTERVAL '2 days',expires_at=CURRENT_TIMESTAMP-INTERVAL '1 day' WHERE unit_id=$1 AND revision=5",[unitId]);current=(await units()).vacancy;assert.equal(current.status,'UNKNOWN');assert.equal(current.availableBeds,null);assert.ok(current.confirmedAt);assert.equal((await inventory()).vacancyHistory[0].status,'AVAILABLE');
  await client.query("UPDATE public.boarding_vacancy_confirmations SET confirmed_at=CURRENT_TIMESTAMP+INTERVAL '1 hour',expires_at=CURRENT_TIMESTAMP+INTERVAL '1 day' WHERE unit_id=$1 AND revision=5",[unitId]);assert.deepEqual((await units()).vacancy,{status:'UNKNOWN',confirmedAt:null,expiresAt:null});
  console.log('PASS: real guarded per-unit AVAILABLE/FULL/UNKNOWN assertions, exact configured TTL/server dates, explicit counts, missing/expired/future UNKNOWN, capacity-revision invalidation and minimal public Next/Nest/PostGIS facts without hidden geometry/map consent');
  const parallel=await Promise.all([send(path,{...input,expectedUnitRevision:2,expectedVacancyRevision:5,reason:'RECONFIRMATION'}),send(path,{...input,expectedUnitRevision:2,expectedVacancyRevision:5,availableBeds:3,reason:'RECONFIRMATION'})]);assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);
  await client.query("CREATE FUNCTION public.synthetic_uni036_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.vacancy_revision>OLD.vacancy_revision THEN RAISE EXCEPTION 'PRIVATE_CANARY synthetic confirmation failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_uni036_failure BEFORE UPDATE ON public.boarding_units FOR EACH ROW EXECUTE FUNCTION public.synthetic_uni036_failure()");
  const next={...input,expectedUnitRevision:2,expectedVacancyRevision:6,status:'UNKNOWN',availableBeds:null,reason:'CORRECTION'};const failed=await send(path,next);assert.equal(failed.status,503);assert.ok(!JSON.stringify(await failed.json()).includes('PRIVATE_CANARY'));assert.equal((await client.query('SELECT count(*)::int AS n FROM public.boarding_vacancy_confirmations WHERE unit_id=$1',[unitId])).rows[0].n,6);
  await client.query('DROP TRIGGER synthetic_uni036_failure ON public.boarding_units; DROP FUNCTION public.synthetic_uni036_failure()');assert.equal((await send(path,next)).status,200);
  for(let revision=7;revision<21;revision++)assert.equal((await send(path,{...input,expectedUnitRevision:2,expectedVacancyRevision:revision,availableBeds:1,reason:'RECONFIRMATION'})).status,200);
  const owned=await inventory();assert.equal(owned.vacancyRevision,21);assert.equal(owned.vacancyHistory.length,20);assert.equal(owned.hasMoreVacancyHistory,true);assert.ok(!JSON.stringify(owned).includes('synthetic:owner-a'));
  const history=`/api/v1/owner/boardings/${a}/units/${unitId}/vacancy-confirmations`;response=await fetch(base+history+'?page=2&pageSize=20');assert.equal(response.status,200);const older=await response.json();assert.deepEqual(older.items.map(c=>c.revision),[1]);assert.equal(older.page.hasNextPage,false);assert.equal((await get(history)).status,401);assert.equal((await fetch(base+history+'?page=1&page=2')).status,400);
  await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,data_kind,source_label,status) VALUES($1,'BOARDING','Synthetic Other Unit Property','synthetic other unit property','SYNTHETIC','Synthetic vacancy target-isolation fixture','ACTIVE')",[b]);await client.query("INSERT INTO public.boarding_properties(place_id,data_kind) VALUES($1,'SYNTHETIC')",[b]);await client.query("INSERT INTO public.boarding_units(id,boarding_id,label,room_type,capacity) VALUES($1,$2,'Synthetic other unit','STUDY_ROOM',1)",[other,b]);
  assert.equal((await send(path,{...input,unitId:other})).status,404);assert.equal((await send(`/api/v1/boardings/${b}/vacancy-confirmations`,{...input,unitId:other})).status,403);assert.equal((await fetch(base+history.replace(unitId,other))).status,404);
  const sql="INSERT INTO public.boarding_vacancy_confirmations(id,boarding_id,unit_id,revision,unit_revision,capacity_snapshot,status,available_beds,expires_at,author_ref,change_reason) VALUES(gen_random_uuid(),$1,$2,999,2,6,'AVAILABLE',$3,CURRENT_TIMESTAMP+INTERVAL '1 day','synthetic:owner-a','CORRECTION')";
  await assert.rejects(client.query(sql,[a,other,1]),e=>e.code==='23503');await assert.rejects(client.query(sql,[a,unitId,null]),e=>e.code==='23514');await assert.rejects(client.query(sql,[a,unitId,7]),e=>e.code==='23514');
  await client.query("UPDATE public.boarding_properties SET authorization_status='UNVERIFIED' WHERE place_id=$1",[a]);assert.equal((await get(`/api/v1/boardings/${a}/units`)).status,404);await client.query("UPDATE public.boarding_properties SET authorization_status='LOCAL_TEST_AUTHORIZED' WHERE place_id=$1",[a]);
  console.log('PASS: real confirmation concurrency/replay/target isolation, composite FK/count constraints, insert+version atomic rollback, retained 21-revision paginated history and authority suppression; no public actor evidence');
  await client.query('DELETE FROM unihood_private.risk_evaluations');
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['019_boarding_requests']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['018_risk_rules']);
assert.deepEqual(await runMigrations(client,migrations,'rollback'),['017_privacy_reports']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['014_boarding_recommendation_resolutions']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['013_boarding_recommendation_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['012_boarding_media_contacts']);
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);assert.equal((await client.query('SELECT count(*)::int AS n FROM public.boarding_vacancy_confirmations WHERE unit_id=$1',[unitId])).rows[0].n,21);
  console.log('PASS: populated confirmation rollback refuses without erasing history or unit versions');
 }finally{
  if(web)await web.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),delay(3000)]);if(child.exitCode===null)child.kill('SIGKILL');}
  // Only IDs proven absent above, in the owned disposable test database.
  await client.query('DELETE FROM public.boarding_vacancy_confirmations WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM public.boarding_units WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=$1',[a]);await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=$1',[a]);await client.query('DELETE FROM public.listings WHERE boarding_id=$1',[a]);await client.query('DELETE FROM public.boarding_properties WHERE place_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[[a,b]]);
 }
 await client.query('CREATE VIEW public.synthetic_vacancy_dependency AS SELECT unit_id FROM public.boarding_vacancy_confirmations');await assert.rejects(runMigrations(client,migrations,'rollback'),e=>e.code==='2BP01');await client.query('DROP VIEW public.synthetic_vacancy_dependency');assert.deepEqual(await runMigrations(client,migrations,'rollback'),['011_boarding_vacancy_confirmations']);await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: confirmation dependency rollback atomic; empty down/up/repeat preserves prior schema, SQL checksums, persistent data and extension ownership');
}
