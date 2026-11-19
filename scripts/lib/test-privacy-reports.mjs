import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {chmod,mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {seedBoardingAdvertisements} from './boarding-seeds.mjs';
import {runMigrations} from './database.mjs';
const a='00000000-0000-4000-8000-000000000001',poi='42000000-0000-4000-8000-000000000044',unit='46000000-0000-4000-8000-000000000001',route='47000000-0000-4000-8000-000000000001';
const key='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
export async function testPrivacyReports({client,url,migrations}){
 const storageRoot=await mkdtemp(join(tmpdir(),'unihood-report-test-'));await chmod(storageRoot,0o700);
 const children=[];
 let reviewId=null;
 const start=async fixture=>{const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,APP_ENV:'test',NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:String(port),ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:fixture,REPORT_ENCRYPTION_KEY_HEX:key,MEDIA_STORAGE_ROOT:storageRoot}});children.push(child);const base=`http://127.0.0.1:${port}`;for(let i=0;i<40;i++){try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(1000)})).ok)return base;}catch{}if(i===39||child.exitCode!==null)throw new Error('Privacy report test API startup failed');await delay(250);}};
 const post=(base,path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const json=async(response)=>await response.json();
 try{
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.report_cases')).rows[0].n,0);
  await seedBoardingAdvertisements(client,url,{APP_ENV:'test',NODE_ENV:'test'},true);
  await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,category,data_kind,source_label,status) VALUES($1,'POI','Synthetic Report POI','synthetic report poi','pharmacy','SYNTHETIC','UNI-044 explicitly fictional report fixture','ACTIVE')",[poi]);
  await client.query('INSERT INTO public.public_place_locations(place_id,entrance_geo,source) VALUES($1,ST_SetSRID(ST_Point(0.0009,0.0008),4326),$2)',[poi,'UNI-044 explicitly synthetic entrance']);
  await client.query("INSERT INTO public.boarding_units(id,boarding_id,label,room_type,capacity) VALUES($1,$2,'Synthetic Report Unit','SHARED_ROOM',1)",[unit,a]);
  await client.query("INSERT INTO public.boarding_official_prices(id,boarding_id,unit_id,revision,currency,period,basis,rent_minor,deposit_minor,utility_terms,meal_terms,effective_at,author_ref,change_reason) VALUES($1,$2,$3,1,'LKR','MONTH','ROOM',1800000,0,'NOT_SHARED','NOT_SHARED','2026-11-01T00:00:00Z','synthetic:owner-a','INITIAL')",[randomUUID(),a,unit]);
  const priceBefore=(await client.query('SELECT rent_minor,deposit_minor,revision,recorded_at FROM public.boarding_official_prices WHERE unit_id=$1 ORDER BY revision DESC',[unit])).rows[0];
  reviewId=randomUUID();
  await client.query("INSERT INTO unihood_private.review_intake(id,actor_ref,idempotency_key,payload_hash,target_type,target_id,review_kind,rating,observation,review_state,source_confidence,source_label) VALUES($1,'synthetic:contributor',$2,$3,'BOARDING',$4,'GENERAL_OBSERVATION',2,'Synthetic negative observation remains legitimate community feedback.','PENDING','COMMUNITY_SUBMITTED','SYNTHETIC')",[reviewId,randomUUID(),'a'.repeat(64),a]);
  const reviewBefore=(await client.query('SELECT review_state,observation FROM unihood_private.review_intake WHERE id=$1',[reviewId])).rows[0];

  const owner=await start('owner-a'),contributor=await start('contributor'),operator=await start('operator');
  const upload=new FormData();upload.append('consent','true');upload.append('requestKey',randomUUID());upload.append('image',new Blob([await readFile(resolve(process.cwd(),'infra/db/fixtures/boarding-media.synthetic.jpg'))],{type:'image/jpeg'}),'synthetic.jpg');
  const uploadResponse=await fetch(`${owner}/api/v1/owner/boardings/${a}/privacy/media`,{method:'POST',body:upload,signal:AbortSignal.timeout(10000)});assert.equal(uploadResponse.status,200);const assetId=(await json(uploadResponse)).assetId;
  assert.equal((await fetch(`${owner}/api/v1/owner/boardings/${a}/privacy/media/${assetId}/content`)).status,200);

  const fee={key:randomUUID(),targetType:'BOARDING',targetId:a,reportType:'WRONG_FEE',details:'Synthetic fictional official fee mismatch context; never a real claim.',syntheticAcknowledged:true};
  assert.equal((await fetch(contributor+'/api/v1/reports',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.invalid'},body:JSON.stringify(fee)})).status,401);
  const feeResponse=await post(contributor,'/api/v1/reports',fee);assert.equal(feeResponse.status,200);const feeReceipt=await json(feeResponse);assert.equal(feeReceipt.severity,'P1');assert.equal(feeReceipt.status,'HELD');assert.equal(feeReceipt.published,false);assert.ok(!JSON.stringify(feeReceipt).includes('Synthetic fictional official'));
  assert.deepEqual(await json(await post(contributor,'/api/v1/reports',fee)),feeReceipt);
  assert.equal((await post(contributor,'/api/v1/reports',{...fee,details:'Synthetic fictional different fee mismatch context.'.padEnd(60,'x')})).status,409);
  assert.deepEqual((await client.query('SELECT rent_minor,deposit_minor,revision,recorded_at FROM public.boarding_official_prices WHERE unit_id=$1 ORDER BY revision DESC',[unit])).rows[0],priceBefore);
  assert.deepEqual((await client.query('SELECT review_state,observation FROM unihood_private.review_intake WHERE id=$1',[reviewId])).rows[0],reviewBefore);
  const negative={key:randomUUID(),targetType:'BOARDING',targetId:a,reportType:'NEGATIVE_REVIEW',details:'Synthetic report about a negative review that must not be deleted.',syntheticAcknowledged:true};
  const negativeReceipt=await json(await post(contributor,'/api/v1/reports',negative));assert.equal(negativeReceipt.severity,'P2');assert.equal(negativeReceipt.status,'HELD');
  assert.deepEqual((await client.query('SELECT review_state,observation FROM unihood_private.review_intake WHERE id=$1',[reviewId])).rows[0],reviewBefore);

  const revisionBefore=(await client.query("SELECT revision FROM unihood_private.public_projection_revisions WHERE name='reports'")).rows[0].revision;
  const media={key:randomUUID(),targetType:'MEDIA',targetId:assetId,reportType:'PRIVATE_DATA_EXPOSED',details:'Synthetic PRIVATE_EVIDENCE_CANARY: fictional exposed upload context only.',syntheticAcknowledged:true};
  const mediaResponse=await post(contributor,'/api/v1/reports',media);assert.equal(mediaResponse.status,200);const mediaReceipt=await json(mediaResponse);assert.equal(mediaReceipt.severity,'P0');assert.equal(mediaReceipt.status,'SUPPRESSED');assert.equal(mediaReceipt.outcome,'SUPPRESSED_HELD_REPORT');
  const suppression=(await client.query("SELECT state,effect FROM unihood_private.report_suppressions WHERE report_id=$1",[mediaReceipt.reportId])).rows[0];assert.deepEqual(suppression,{state:'ACTIVE',effect:'MEDIA_BLOCKED'});
  const revisionAfter=(await client.query("SELECT revision FROM unihood_private.public_projection_revisions WHERE name='reports'")).rows[0].revision;assert.ok(Number(revisionAfter)>Number(revisionBefore));
  const stored=(await client.query('SELECT details_ciphertext,octet_length(details_iv) AS iv,octet_length(details_auth_tag) AS tag FROM unihood_private.report_cases WHERE id=$1',[mediaReceipt.reportId])).rows[0];assert.ok(!stored.details_ciphertext.toString('utf8').includes('PRIVATE_EVIDENCE_CANARY'));assert.equal(stored.iv,12);assert.equal(stored.tag,16);
  assert.equal((await fetch(`${owner}/api/v1/owner/boardings/${a}/privacy/media/${assetId}/content`)).status,404);
  const hidden=await json(await fetch(`${owner}/api/v1/owner/boardings/${a}/privacy/media`));assert.ok(!hidden.items.some(item=>item.id===assetId));
  const statusResponse=await fetch(`${contributor}/api/v1/reports/${mediaReceipt.reportId}`);assert.equal(statusResponse.status,200);assert.equal(statusResponse.headers.get('cache-control'),'no-store');const status=await json(statusResponse);assert.equal(status.targetId,null);assert.equal(status.publicEffect,'MEDIA_BLOCKED');assert.equal(status.reporterIdentity,'PROTECTED');assert.ok(!JSON.stringify(status).match(/PRIVATE_EVIDENCE_CANARY|synthetic:contributor|ciphertext|details/));

  assert.equal((await post(contributor,`/api/v1/reports/${mediaReceipt.reportId}/operator`,{key:randomUUID(),action:'DISMISS_REPORT',syntheticAcknowledged:true})).status,403);
  const ownerAppeal=await post(owner,`/api/v1/reports/${mediaReceipt.reportId}/appeal`,{key:randomUUID(),reason:'Synthetic fictional affected-owner appeal reason only.',syntheticAcknowledged:true});assert.equal(ownerAppeal.status,200);const appealReceipt=await json(ownerAppeal);assert.equal(appealReceipt.status,'OPEN');
  const denied=await post(operator,`/api/v1/reports/${mediaReceipt.reportId}/operator`,{key:randomUUID(),action:'DECIDE_APPEAL',appealId:appealReceipt.appealId,decision:'DENIED',syntheticAcknowledged:true});assert.equal(denied.status,200);assert.equal((await json(denied)).appeal.outcome,'DENIED');
  assert.equal((await fetch(`${owner}/api/v1/owner/boardings/${a}/privacy/media/${assetId}/content`)).status,404);
  const restore=await post(operator,`/api/v1/reports/${mediaReceipt.reportId}/operator`,{key:randomUUID(),action:'RESTORE_PUBLIC',syntheticAcknowledged:true});assert.equal(restore.status,200);const restored=await json(restore);assert.equal(restored.publicEffect,'NONE');assert.equal(restored.status,'HELD');
  assert.equal((await client.query("SELECT state FROM unihood_private.report_suppressions WHERE report_id=$1",[mediaReceipt.reportId])).rows[0].state,'RESTORED');
  assert.equal((await fetch(`${owner}/api/v1/owner/boardings/${a}/privacy/media/${assetId}/content`)).status,200);
  const revisionRestored=(await client.query("SELECT revision FROM unihood_private.public_projection_revisions WHERE name='reports'")).rows[0].revision;assert.ok(Number(revisionRestored)>Number(revisionAfter));
  const visible=await json(await fetch(`${owner}/api/v1/owner/boardings/${a}/privacy/media`));assert.ok(visible.items.some(item=>item.id===assetId));

  assert.equal((await fetch(`${owner}/api/v1/boardings/${a}`)).status,200);
  const boardingExposure={key:randomUUID(),targetType:'BOARDING',targetId:a,reportType:'PRIVATE_DATA_EXPOSED',details:'Synthetic fictional private-data exposure in the public advertisement.',syntheticAcknowledged:true};
  const boardingReceipt=await json(await post(contributor,'/api/v1/reports',boardingExposure));assert.equal(boardingReceipt.status,'SUPPRESSED');
  assert.deepEqual((await client.query("SELECT l.publication_status,l.is_current,s.prior_publication_status,s.prior_is_current FROM public.listings l JOIN unihood_private.report_suppressions s ON s.listing_ref=l.id WHERE s.report_id=$1",[boardingReceipt.reportId])).rows[0],{publication_status:'DISPUTED',is_current:false,prior_publication_status:'PUBLISHED',prior_is_current:true});
  assert.equal((await fetch(`${owner}/api/v1/boardings/${a}`)).status,404);
  const dismissed=await post(operator,`/api/v1/reports/${boardingReceipt.reportId}/operator`,{key:randomUUID(),action:'DISMISS_REPORT',syntheticAcknowledged:true});assert.equal(dismissed.status,200);assert.equal((await json(dismissed)).status,'DISMISSED');assert.equal((await fetch(`${owner}/api/v1/boardings/${a}`)).status,200);
  assert.deepEqual((await client.query('SELECT publication_status,is_current FROM public.listings WHERE boarding_id=$1 AND is_current',[a])).rows[0],{publication_status:'PUBLISHED',is_current:true});

  const poiReport={key:randomUUID(),targetType:'POI',targetId:poi,reportType:'WRONG_VACANCY',details:'Synthetic fictional POI detail mismatch context only.',syntheticAcknowledged:true};
  const poiReceipt=await json(await post(contributor,'/api/v1/reports',poiReport));assert.equal(poiReceipt.status,'HELD');
  assert.equal((await fetch(`${owner}/api/v1/reports/${poiReceipt.reportId}`)).status,404);
  assert.equal((await post(owner,`/api/v1/reports/${poiReceipt.reportId}/appeal`,{key:randomUUID(),reason:'Synthetic fictional unrelated appeal reason only.',syntheticAcknowledged:true})).status,404);
  const reporterAppeal=await post(contributor,`/api/v1/reports/${feeReceipt.reportId}/appeal`,{key:randomUUID(),reason:'Synthetic fictional reporter appeal reason only.',syntheticAcknowledged:true});assert.equal(reporterAppeal.status,200);
  assert.equal((await post(contributor,`/api/v1/reports/${feeReceipt.reportId}/appeal`,{key:randomUUID(),reason:'Synthetic fictional second reporter appeal reason.',syntheticAcknowledged:true})).status,409);

  const routeReport={key:randomUUID(),targetType:'ROUTE_SEGMENT',targetId:route,reportType:'ROUTE_INFORMATION',details:'Synthetic fictional route information issue context.',syntheticAcknowledged:true};
  assert.equal((await post(contributor,'/api/v1/reports',routeReport)).status,404);
  await client.query("INSERT INTO public.route_segments(id,data_kind,source_version,public_status,geometry) VALUES($1,'SYNTHETIC','UNI-044 synthetic eligibility fixture','ELIGIBLE',ST_SetSRID(ST_MakeLine(ST_Point(0,0),ST_Point(0.001,0.001)),4326))",[route]);
  const routeReceipt=await json(await post(contributor,'/api/v1/reports',routeReport));assert.equal(routeReceipt.severity,'P2');assert.equal(routeReceipt.status,'HELD');
  assert.equal((await post(contributor,'/api/v1/reports',{...routeReport,key:randomUUID(),targetType:'BOARDING'})).status,400);

  const historyResponse=await fetch(`${contributor}/api/v1/contributions?kind=REPORT&pageSize=20`);assert.equal(historyResponse.status,200);const history=await json(historyResponse);assert.ok(history.items.length>=4);assert.ok(history.items.every(item=>item.kind==='REPORT'&&item.reportType&&item.severity&&item.placeId===null));assert.ok(!JSON.stringify(history).match(/PRIVATE_EVIDENCE_CANARY|details|synthetic:contributor|ciphertext/));
  const audit=await client.query('SELECT event_type,redacted_detail FROM unihood_private.report_audit_events WHERE report_id=ANY($1::uuid[]) ORDER BY occurred_at',[[mediaReceipt.reportId,boardingReceipt.reportId]]);assert.ok(audit.rows.some(row=>row.event_type==='PUBLIC_SUPPRESSION_APPLIED'&&row.redacted_detail==='SUPPRESSED'));assert.ok(audit.rows.some(row=>row.event_type==='PUBLIC_SUPPRESSION_RESTORED'&&row.redacted_detail==='RESTORED'));assert.ok(audit.rows.every(row=>!row.redacted_detail.includes('PRIVATE_EVIDENCE_CANARY')));

  await client.query('DELETE FROM unihood_private.risk_evaluations');
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['019_boarding_requests']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['018_risk_rules']);
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);
  console.log('PASS: UNI-044 held wrong-fee/negative-review reports leave official fees and legitimate reviews intact; confidential evidence encrypted; media/listing suppression reversible with cache-revision invalidation, redacted audit and affect-owner appeals; route reports require an eligible segment; deployed/guest and unrelated-actor actions fail closed');
 }finally{
  await Promise.all(children.map(async child=>{if(child.exitCode!==null)return;child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}));
  await rm(storageRoot,{recursive:true,force:true});
  await client.query('DELETE FROM unihood_private.report_audit_events');
  await client.query('DELETE FROM unihood_private.report_suppressions');
  await client.query('DELETE FROM unihood_private.report_appeals');
  await client.query('DELETE FROM unihood_private.report_cases');
  await client.query('DELETE FROM public.route_segments');
  if(reviewId)await client.query('DELETE FROM unihood_private.review_intake WHERE id=$1',[reviewId]);
  await client.query('DELETE FROM public.boarding_official_prices WHERE unit_id=$1',[unit]);
  await client.query('DELETE FROM public.boarding_units WHERE id=$1',[unit]);
  await client.query('DELETE FROM unihood_private.boarding_privacy_events WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM unihood_private.boarding_media WHERE boarding_id=$1',[a]);
  await client.query("DELETE FROM unihood_private.media_assets WHERE uploader_ref='synthetic:owner-a'");
  await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM public.listings WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM public.boarding_properties WHERE place_id=$1',[a]);
  await client.query('DELETE FROM public.public_place_locations WHERE place_id=$1',[poi]);
  await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[[a,poi]]);
 }
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['017_privacy_reports']);
 await runMigrations(client,migrations,'migrate');
 assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: UNI-044 populated rollback refusal, empty rollback and idempotent re-migration');
}
