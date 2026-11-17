import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { runMigrations } from './database.mjs';
// Only the owning harness calls this after proving its unique database uses tmpfs.
export async function testPoiProposalApi({client,url,migrations,endpoint:guestEndpoint}) {
 for(const table of ['poi_submission_requests','poi_pending_source_refs','poi_pending_proposals']) assert.equal((await client.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n,0);
 const canonical=(await client.query('SELECT id,canonical_name FROM public.places ORDER BY id')).rows;
 const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,APP_ENV:'test',NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:String(port),WEB_PORT:'3180',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'contributor'}});
 const endpoint=`http://127.0.0.1:${port}`;
 const body={key:randomUUID(),draft:{kind:'POI',name:'Synthetic Proposal Pharmacy',category:'pharmacy',location:{lat:30,lng:30}},resolution:{action:'continue_as_distinct_with_reason',reason:'Synthetic separate public business used only for isolated acceptance.'},sourceNote:'Original fictional fixture; no external data or private residence.',publicBusinessConfirmed:true};
 const post=(input,headers={},base=endpoint)=>fetch(base+'/api/v1/places/proposals',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(input),signal:AbortSignal.timeout(8000)});
 try {
  for(let i=0;i<40;i++){try{if((await fetch(endpoint+'/health',{signal:AbortSignal.timeout(2000)})).ok)break;}catch{}if(i===39||child.exitCode!==null)throw new Error('Proposal API startup failed');await delay(250);}
  const response=await post(body,{Origin:'http://127.0.0.1:3180'});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const receipt=await response.json();assert.equal(receipt.outcome,'PENDING_REVIEW');assert.equal(receipt.reviewState,'PENDING');assert.equal(receipt.requiresReview,true);
  assert.deepEqual(await (await post(body)).json(),receipt);
  assert.equal((await post({...body,sourceNote:'Changed synthetic explanation'})).status,409);
  assert.deepEqual(await (await post({...body,key:randomUUID()})).json(),{outcome:'REVIEW_REQUIRED',requiresReview:true});
  const stored=(await client.query('SELECT source_note,review_state,risk_flags FROM public.poi_pending_proposals WHERE id=$1',[receipt.proposalId])).rows[0];assert.equal(stored.source_note,body.sourceNote);assert.equal(stored.review_state,'PENDING');assert.deepEqual(stored.risk_flags,[]);
  assert.equal((await fetch(guestEndpoint+'/api/v1/places/'+receipt.proposalId)).status,404);
  for(const invalid of [{...body,actorId:'synthetic:admin'},{...body,source:{provider:'private',externalId:'secret'}},{...body,publicBusinessConfirmed:false},{...body,draft:{...body.draft,kind:'BOARDING'}}]) assert.equal((await post(invalid)).status,400);
  for(const headers of [{'X-Forwarded-For':'127.0.0.1'},{Origin:'https://evil.example'}]) assert.equal((await post(body,headers)).status,401);
  assert.equal((await post(body,{},guestEndpoint)).status,401);
  const held={...body,key:randomUUID(),draft:{...body.draft,name:'Synthetic Held Pharmacy',location:{lat:31,lng:31}},sourceNote:'Synthetic owner contact +00000000000 at https://example.invalid'};
  const heldReceipt=await (await post(held)).json();assert.equal(heldReceipt.outcome,'PENDING_REVIEW');assert.equal(heldReceipt.reviewState,'NEEDS_EVIDENCE');assert.ok(!JSON.stringify(heldReceipt).includes('00000000000'));
  const flags=(await client.query('SELECT risk_flags FROM public.poi_pending_proposals WHERE id=$1',[heldReceipt.proposalId])).rows[0].risk_flags;assert.deepEqual(new Set(flags),new Set(['PRIVATE_TEXT','CONTACT_TEXT','EXTERNAL_REFERENCE']));
  // Failure after the initial INSERT must roll back both metadata and receipt.
  await client.query(`CREATE FUNCTION public.synthetic_review_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='Synthetic Metadata Failure Pharmacy' THEN RAISE EXCEPTION 'synthetic metadata failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER synthetic_review_failure BEFORE UPDATE ON public.poi_pending_proposals FOR EACH ROW EXECUTE FUNCTION public.synthetic_review_failure()`);
  const failed={...body,key:randomUUID(),draft:{...body.draft,name:'Synthetic Metadata Failure Pharmacy',location:{lat:32,lng:32}}};
  const unavailable=await post(failed);assert.equal(unavailable.status,503);assert.ok(!JSON.stringify(await unavailable.json()).includes('synthetic metadata failure'));
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.poi_pending_proposals WHERE name=$1',[failed.draft.name])).rows[0].n,0);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.poi_submission_requests WHERE idempotency_key=$1',[failed.key])).rows[0].n,0);
  await client.query('DROP TRIGGER synthetic_review_failure ON public.poi_pending_proposals; DROP FUNCTION public.synthetic_review_failure()');
  assert.equal((await (await post(failed)).json()).outcome,'PENDING_REVIEW');
  await assert.rejects(client.query("UPDATE public.poi_pending_proposals SET review_state='PUBLISHED' WHERE id=$1",[receipt.proposalId]),error=>error.code==='23514');
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated proposal review metadata/);
  assert.equal((await client.query('SELECT source_note FROM public.poi_pending_proposals WHERE id=$1',[receipt.proposalId])).rows[0].source_note,body.sourceNote);
  assert.deepEqual((await client.query('SELECT id,canonical_name FROM public.places ORDER BY id')).rows,canonical);
  console.log('PASS: real contributing proposal HTTP → PostGIS held receipt; replay/conflict, risk holds, public exclusion, strict authority fields and guest/cross-site denials');
 } finally {
  if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
  // These three tables were asserted empty in this uniquely owned disposable DB.
  await client.query('DELETE FROM public.poi_submission_requests; DELETE FROM public.poi_pending_source_refs; DELETE FROM public.poi_pending_proposals');
 }
 await client.query('CREATE VIEW public.synthetic_review_dependency AS SELECT source_note FROM public.poi_pending_proposals');
 await assert.rejects(runMigrations(client,migrations,'rollback'),error=>error.code==='2BP01');
 assert.equal((await client.query("SELECT count(*)::int AS n FROM unihood_migrations.schema_migrations WHERE migration_id='006_poi_proposal_review'")).rows[0].n,1);
 await client.query('DROP VIEW public.synthetic_review_dependency');
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['006_poi_proposal_review']);
 assert.deepEqual(await runMigrations(client,migrations,'migrate'),['006_poi_proposal_review']);
 assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: review metadata populated rollback refused; external dependency failure atomic; empty rollback/re-migration repeatable without canonical changes');
}
