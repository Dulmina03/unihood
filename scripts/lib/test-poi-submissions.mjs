import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient,runMigrations } from './database.mjs';
// Parent proves a unique loopback tmpfs DB with no persistent mounts first.
export async function testPoiSubmissions({client,url,migrations,endpoint}){
 const {UniversityRepository}=await import('../../apps/api/dist/universities/university.repository.js');
 const {PoiSubmissionService}=await import('../../apps/api/dist/duplicates/poi-submission.service.js');
 const {SyntheticActors}=await import('../../apps/api/dist/identity/synthetic-actors.js');
 const names=['APP_ENV','NODE_ENV','DATABASE_URL'],old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 let first,second;
 try{Object.assign(process.env,{APP_ENV:'test',NODE_ENV:'test',DATABASE_URL:url});first=new UniversityRepository();second=new UniversityRepository();}
 finally{for(const key of names){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}}
 const identity=new SyntheticActors({enabled:true,fixture:'contributor'}),otherIdentity=new SyntheticActors({enabled:true,fixture:'owner-a'});
 const request={socket:{remoteAddress:'127.0.0.1',localAddress:'127.0.0.1'},headers:{host:'127.0.0.1:3001'}};
 const actor=await identity.resolveRequestActor(request),other=await otherIdentity.resolveRequestActor(request);
 const service=new PoiSubmissionService(first,identity),peerService=new PoiSubmissionService(second,otherIdentity);
 const draft=(point=20,name='Synthetic Parallel Pharmacy')=>({key:randomUUID(),draft:{kind:'POI',name,category:'pharmacy',location:{lat:point,lng:point}},resolution:{action:'continue_as_distinct_with_reason',reason:'A separately described synthetic public business'}});
 const refs=[],boarding='58000000-0000-4000-8000-000000000099';
 const canonical='40000000-0000-4000-8000-000000000001';
 const snapshot=async()=>JSON.stringify((await client.query('SELECT id,kind,canonical_name,status,merged_into,updated_at FROM public.places ORDER BY id')).rows);
 const counts=async()=>(await client.query('SELECT (SELECT count(*)::int FROM public.poi_pending_proposals) AS proposals,(SELECT count(*)::int FROM public.poi_pending_source_refs) AS sources,(SELECT count(*)::int FROM public.poi_submission_requests) AS requests')).rows[0];
 const insertCanonical=async(external,place=canonical)=>{const id=randomUUID();refs.push(id);await client.query("INSERT INTO public.place_source_refs(id,place_id,provider,external_id,license_tag) VALUES($1,$2,'synthetic-025',$3,'Original synthetic test; no import')",[id,place,external]);return id;};
 const waitForBlock=async()=>{for(let i=0;i<60;i++){if((await client.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND classid=25025 AND objid=1 AND NOT granted) AS waiting")).rows[0].waiting)return;await delay(10);}throw new Error('Expected real advisory-lock waiter');};
 assert.deepEqual(await counts(),{proposals:0,sources:0,requests:0});
 const before=await snapshot();
 try{
  // Same actor/key double tap: independent connections, exact replay result.
  const input=draft();const replay=await Promise.all([service.prepare(actor,input),service.prepare(actor,input),service.prepare(actor,input)]);
  assert.ok(replay.every(r=>JSON.stringify(r)===JSON.stringify(replay[0])));assert.equal(replay[0].outcome,'PENDING_REVIEW');assert.equal((await counts()).proposals,1);
  assert.deepEqual(await service.prepare(actor,{resolution:input.resolution,draft:input.draft,key:input.key}),replay[0]);
  await assert.rejects(service.prepare(actor,{...input,resolution:{...input.resolution,reason:'Different payload under an already used key'}}),error=>error.getStatus()===409);
  // A different actor using the same UUID cannot replay the first actor's ID.
  const otherResult=await peerService.prepare(other,input);assert.deepEqual(otherResult,{outcome:'REVIEW_REQUIRED',requiresReview:true});assert.equal((await counts()).proposals,1);
  // Two different keys/actors, same POI, forced to wait on a real shared lock.
  const parallel=draft(21);await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(25025,1)');
  const raceA=service.prepare(actor,parallel),raceB=peerService.prepare(other,{...parallel,key:randomUUID()});
  await waitForBlock();await client.query('COMMIT');const outcomes=await Promise.all([raceA,raceB]);assert.deepEqual(outcomes.map(r=>r.outcome).sort(),['PENDING_REVIEW','REVIEW_REQUIRED']);
  assert.equal((await counts()).proposals,2);
  // Legitimate separate businesses/categories at one public point stay separate.
  await service.prepare(actor,draft(22,'Synthetic Willow Pharmacy'));
  const restaurant=draft(22,'Synthetic River Restaurant');restaurant.draft.category='restaurant';assert.equal((await peerService.prepare(other,restaurant)).outcome,'PENDING_REVIEW');
  // Canonical recheck ignores any earlier empty client preflight and never merges.
  const update=draft(0,'Synthetic Demo Pharmacy');update.draft.location={lat:0.0003,lng:0.0005};update.resolution={action:'suggest_update',placeId:canonical};
  assert.deepEqual(await service.prepare(actor,update),{outcome:'EXISTING_PUBLIC_PLACE',placeId:canonical,requiresReview:true});
  const location=(await client.query('SELECT place_kind,place_status,ST_X(entrance_geo) AS lng,ST_Y(entrance_geo) AS lat,source,last_confirmed_at FROM public.public_place_locations WHERE place_id=$1',[canonical])).rows[0];
  await client.query('DELETE FROM public.public_place_locations WHERE place_id=$1',[canonical]);
  try{assert.deepEqual(await service.prepare(actor,update),{outcome:'REVIEW_REQUIRED',requiresReview:true});}
  finally{await client.query('INSERT INTO public.public_place_locations(place_id,place_kind,place_status,entrance_geo,source,last_confirmed_at) VALUES($1,$2,$3,ST_SetSRID(ST_Point($4,$5),4326),$6,$7)',[canonical,location.place_kind,location.place_status,location.lng,location.lat,location.source,location.last_confirmed_at]);}
  const separateA=draft(29,'Synthetic AAAA Medicines'),separateB=draft(29,'Synthetic ZZZZ Chemist');
  assert.equal((await service.prepare(actor,separateA)).outcome,'PENDING_REVIEW');assert.equal((await peerService.prepare(other,separateB)).outcome,'PENDING_REVIEW');
  // Pending source identities survive geometry drift; exact opaque IDs unchanged.
  const source=draft(23);source.source={provider:'synthetic-025',externalId:'pending',licenseTag:'Original synthetic test'};
  const reserved=await service.prepare(actor,source);assert.equal(reserved.outcome,'PENDING_REVIEW');
  assert.deepEqual(await peerService.prepare(other,{...source,key:randomUUID(),draft:{...source.draft,location:{lat:40,lng:40}}}),{outcome:'REVIEW_REQUIRED',requiresReview:true});
  const raw=draft(24);raw.source={provider:'synthetic-025',externalId:' ００１ ',licenseTag:'Synthetic identity'};assert.equal((await service.prepare(actor,raw)).outcome,'PENDING_REVIEW');
  const distinct=draft(25);distinct.source={...raw.source,externalId:'001'};assert.equal((await service.prepare(actor,distinct)).outcome,'PENDING_REVIEW');
  await insertCanonical('canonical');assert.deepEqual(await service.prepare(actor,{...draft(26),source:{provider:'synthetic-025',externalId:'canonical',licenseTag:'Synthetic test'}}),{outcome:'EXISTING_PUBLIC_PLACE',placeId:canonical,requiresReview:true});
  // A private canonical source can never return a private place ID or geometry.
  await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,status,data_kind,source_label) VALUES($1,'BOARDING','Synthetic private intent canary','synthetic private intent canary','ACTIVE','SYNTHETIC','Synthetic exclusion fixture')",[boarding]);
  await insertCanonical('private',boarding);
  const hidden=await service.prepare(actor,{...draft(27),source:{provider:'synthetic-025',externalId:'private',licenseTag:'Synthetic test'}});assert.deepEqual(hidden,{outcome:'REVIEW_REQUIRED',requiresReview:true});assert.ok(!JSON.stringify(hidden).includes(boarding));
  // Rollback after an injected mid-transaction failure, then same-key retry.
  const failed=draft(28);failed.source={provider:'synthetic-025',externalId:'retry',licenseTag:'Synthetic test'};const baseline=await counts();
  const broken=new PoiSubmissionService({includeSynthetic:true,transaction:work=>first.transaction(query=>work((sql,values)=>sql.startsWith('INSERT INTO public.poi_pending_source_refs')?Promise.reject(new Error('PRIVATE_CANARY')):query(sql,values)))},identity);
  await assert.rejects(broken.prepare(actor,failed),error=>error.getStatus()===503&&!error.message.includes('PRIVATE_CANARY'));assert.deepEqual(await counts(),baseline);assert.equal((await service.prepare(actor,failed)).outcome,'PENDING_REVIEW');
  // SQL constraints cover cross-table canonical/pending source races both ways.
  await assert.rejects(insertCanonical('pending'),error=>error.code==='23505');
  const change=await insertCanonical('before-change');await assert.rejects(client.query("UPDATE public.place_source_refs SET external_id='pending' WHERE id=$1",[change]),error=>error.code==='23505');
  const connection=createClient(url);await connection.connect();
  try{
   await client.query('BEGIN');await insertCanonical('race-canonical');
   await connection.query('BEGIN ISOLATION LEVEL READ COMMITTED');
   const waiting=connection.query("INSERT INTO public.poi_pending_source_refs(proposal_id,provider,external_id,license_tag) VALUES($1,'synthetic-025','race-canonical','Synthetic')",[reserved.proposalId]).then(()=>null,error=>error);
   await waitForBlock();await client.query('COMMIT');assert.equal((await waiting).code,'23505');await connection.query('ROLLBACK');
   await client.query('BEGIN');await client.query("INSERT INTO public.poi_pending_source_refs(proposal_id,provider,external_id,license_tag) VALUES($1,'synthetic-025','race-pending','Synthetic')",[reserved.proposalId]);
   const id=randomUUID();refs.push(id);const reverse=connection.query("INSERT INTO public.place_source_refs(id,place_id,provider,external_id,license_tag) VALUES($1,$2,'synthetic-025','race-pending','Synthetic')",[id,canonical]).then(()=>null,error=>error);
   await waitForBlock();await client.query('COMMIT');assert.equal((await reverse).code,'23505');
   await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ');const id2=randomUUID();refs.push(id2);
   await assert.rejects(connection.query("INSERT INTO public.place_source_refs(id,place_id,provider,external_id,license_tag) VALUES($1,$2,'synthetic-025','snapshot','Synthetic')",[id2,canonical]),error=>error.code==='23514');await connection.query('ROLLBACK');
  }finally{await client.query('ROLLBACK');await connection.query('ROLLBACK');await connection.end();}
  const ledger=(await client.query('SELECT * FROM unihood_migrations.schema_migrations ORDER BY migration_id')).rows;
  const saved=await counts();await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);assert.deepEqual(await counts(),saved);assert.deepEqual((await client.query('SELECT * FROM unihood_migrations.schema_migrations ORDER BY migration_id')).rows,ledger);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.public_place_locations WHERE place_id IN(SELECT id FROM public.poi_pending_proposals)')).rows[0].n,0);
  assert.equal((await fetch(`${endpoint}/api/v1/places/${reserved.proposalId}`)).status,404);
  const publicWindow=await fetch(`${endpoint}/api/v1/places?bbox=19.99,19.99,20.01,20.01`);assert.equal(publicWindow.status,200);assert.deepEqual((await publicWindow.json()).items,[]);
  console.log('PASS: real pooled transactions; same-key replay/conflict/actor isolation, simultaneous pending double-check, separate businesses, canonical/source drift/private exclusion, source races both orders, snapshot-isolation refusal, injected failure rollback/retry and populated migration rollback refusal; no publication or merge');
 }finally{
  await client.query('ROLLBACK');
  // These new tables were asserted empty on entry to this proven disposable DB.
  await client.query('DELETE FROM public.poi_submission_requests; DELETE FROM public.poi_pending_source_refs; DELETE FROM public.poi_pending_proposals');
  await client.query('DELETE FROM public.place_source_refs WHERE id=ANY($1::uuid[])',[refs]);await client.query('DELETE FROM public.places WHERE id=$1',[boarding]);
  await first.onModuleDestroy();await second.onModuleDestroy();
 }
 assert.equal(await snapshot(),before);
 // A writer commits while migration 005 waits: rollback must see its row.
 const writer=createClient(url);await writer.connect();const inserted=randomUUID();let pendingRollback;
 try{
  await writer.query('BEGIN');await writer.query("INSERT INTO public.poi_pending_proposals(id,actor_ref,name,normalized_name,category,public_entrance,distinct_reason) VALUES($1,'synthetic:rollback-writer','Synthetic rollback writer','synthetic rollback writer','pharmacy',ST_SetSRID(ST_Point(41,41),4326),'Synthetic concurrent rollback fixture')",[inserted]);
  const pid=(await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  pendingRollback=runMigrations(client,migrations,'rollback').then(()=>null,error=>error);
  let blocked=false;for(let i=0;i<100;i++){if((await writer.query('SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND NOT granted) AS waiting',[pid])).rows[0].waiting){blocked=true;break;}await delay(10);}
  assert.equal(blocked,true);await writer.query('COMMIT');assert.match((await pendingRollback).message,/populated tables/);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.poi_pending_proposals WHERE id=$1',[inserted])).rows[0].n,1);
 }finally{await writer.query('ROLLBACK');if(pendingRollback)await pendingRollback;await writer.end();await client.query('DELETE FROM public.poi_pending_proposals WHERE id=$1',[inserted]);}
 const extensions=(await client.query('SELECT extname,extversion FROM pg_extension ORDER BY extname')).rows;
 await client.query('CREATE VIEW public.unihood_pending_dependency AS SELECT id FROM public.poi_pending_proposals');
 await assert.rejects(runMigrations(client,migrations,'rollback'),error=>error.code==='2BP01');assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgname IN('poi_canonical_source_identity_guard','poi_pending_source_identity_guard')")).rows[0].n,2);
 await client.query('DROP VIEW public.unihood_pending_dependency');
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['005_poi_submission_transactions']);assert.equal(await snapshot(),before);
 assert.deepEqual(await runMigrations(client,migrations,'migrate'),['005_poi_submission_transactions']);assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);assert.deepEqual((await client.query('SELECT extname,extversion FROM pg_extension ORDER BY extname')).rows,extensions);
 await runMigrations(client,migrations,'rollback');
 await client.query("CREATE TABLE public.poi_pending_proposals(label text); INSERT INTO public.poi_pending_proposals VALUES('Synthetic unrelated existing object')");
 await assert.rejects(runMigrations(client,migrations,'migrate'),error=>error.code==='42P07');assert.equal((await client.query('SELECT label FROM public.poi_pending_proposals')).rows[0].label,'Synthetic unrelated existing object');
 await client.query('DROP TABLE public.poi_pending_proposals RESTRICT');await runMigrations(client,migrations,'migrate');
 console.log('PASS: pending foundation empty rollback/remigration/repeatability; populated concurrent writer retained, external dependency failure atomic, pre-existing object preserved; canonical data, triggers and extension ownership preserved');
}
