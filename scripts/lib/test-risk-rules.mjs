import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {seedBoardingAdvertisements} from './boarding-seeds.mjs';
import {runMigrations} from './database.mjs';
const a='00000000-0000-4000-8000-000000000001';
const key='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
export async function testRiskRules({client,url,migrations}){
 const children=[];
 const start=async fixture=>{const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,APP_ENV:'test',NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:String(port),WEB_PORT:'3180',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:fixture,REPORT_ENCRYPTION_KEY_HEX:key}});children.push(child);const base=`http://127.0.0.1:${port}`;for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok)return base;}catch{}if(child.exitCode!==null)throw new Error('Risk API startup failed');await delay(250);}throw new Error('Risk API startup timed out');};
 const post=(base,path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const json=async response=>await response.json();
 const history=async(base,kind)=>{const response=await fetch(base+`/api/v1/contributions?kind=${kind}&pageSize=20`);assert.equal(response.status,200);return await json(response);};
 const recommendation=(description,title='Synthetic Risk Annex')=>({key:randomUUID(),draft:{title,description,locality:null,facilities:[],privacyAcknowledged:true,mediaGuidanceAcknowledged:true}});
 const review=(observation,targetType='BOARDING',targetId=a)=>({key:randomUUID(),targetType,targetId,reviewKind:'GENERAL_OBSERVATION',rating:4,observation,sourceConfidence:'COMMUNITY_SUBMITTED',sourceLabel:'SYNTHETIC',syntheticAcknowledged:true});
 const contributions=[];
 try{
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.risk_evaluations')).rows[0].n,0);
  await seedBoardingAdvertisements(client,url,{APP_ENV:'test',NODE_ENV:'test'},true);
  const owner=await start('owner-a'),contributor=await start('contributor'),operator=await start('operator');

  // A routine, safe recommendation is still held by the closed publication gate.
  const routine=recommendation('Synthetic fictional shared kitchen and study space context only.');
  const routineResponse=await post(contributor,'/api/v1/contributions/boarding',routine);assert.equal(routineResponse.status,200);
  const routineReceipt=await json(routineResponse);contributions.push(['BOARDING_RECOMMENDATION',routineReceipt.contributionId]);
  assert.equal(routineReceipt.published,false);assert.equal(routineReceipt.reviewState,'PENDING');
  const routineRisk=(await client.query('SELECT decision,rule_version,reasons,explanation FROM unihood_private.risk_evaluations WHERE contribution_kind=$1 AND contribution_id=$2',['BOARDING_RECOMMENDATION',routineReceipt.contributionId])).rows[0];
  assert.equal(routineRisk.decision,'HOLD');assert.equal(routineRisk.rule_version,'risk-rules-v1');
  assert.ok(routineRisk.reasons.includes('RR-018-PUBLICATION-GATE-CLOSED'));
  assert.ok(!routineRisk.reasons.includes('RR-019-ROUTINE-LOW-RISK'));
  const routineHistory=(await history(contributor,'BOARDING_RECOMMENDATION')).items.find(item=>item.id===routineReceipt.contributionId);
  assert.equal(routineHistory.riskDecision,'HOLD');assert.equal(routineHistory.riskRuleVersion,'risk-rules-v1');
  assert.ok(routineHistory.riskExplanation.includes('publication stays disabled'));assert.ok(!routineHistory.riskExplanation.includes('Synthetic fictional'));

  // Replay is idempotent: one contribution and one evaluation, same decision.
  assert.deepEqual(await json(await post(contributor,'/api/v1/contributions/boarding',routine)),routineReceipt);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.risk_evaluations WHERE contribution_kind=$1 AND contribution_id=$2',['BOARDING_RECOMMENDATION',routineReceipt.contributionId])).rows[0].n,1);

  // Contact/link/private signals require evidence and never publish.
  const sensitive=recommendation('Synthetic fictional address and phone 555-0100 context only.');
  const sensitiveReceipt=await json(await post(contributor,'/api/v1/contributions/boarding',sensitive));contributions.push(['BOARDING_RECOMMENDATION',sensitiveReceipt.contributionId]);
  assert.equal(sensitiveReceipt.reviewState,'NEEDS_EVIDENCE');
  const sensitiveRisk=(await client.query('SELECT decision,reasons FROM unihood_private.risk_evaluations WHERE contribution_kind=$1 AND contribution_id=$2',['BOARDING_RECOMMENDATION',sensitiveReceipt.contributionId])).rows[0];
  assert.equal(sensitiveRisk.decision,'NEEDS_EVIDENCE');assert.ok(sensitiveRisk.reasons.includes('RR-006-CONTACT-OR-LINK'));

  // Caller-supplied official fields are rejected with no persisted evaluation.
  const before=(await client.query("SELECT count(*)::int AS n FROM unihood_private.risk_evaluations WHERE contribution_kind='BOARDING_RECOMMENDATION'")).rows[0].n;
  assert.equal((await post(contributor,'/api/v1/contributions/boarding',{...routine,key:randomUUID(),officialFee:1800000,ownerVerified:true})).status,400);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM unihood_private.risk_evaluations WHERE contribution_kind='BOARDING_RECOMMENDATION'")).rows[0].n,before);

  // Owner self-review is refused before any risk record exists.
  assert.equal((await post(owner,'/api/v1/contributions/review',review('Synthetic fictional self review context only.'))).status,403);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM unihood_private.risk_evaluations WHERE contribution_kind='REVIEW' AND contribution_id NOT IN (SELECT id FROM unihood_private.review_intake)")).rows[0].n,0);

  // A normal review is held; a sensitive one requires evidence, with no vote proof.
  const reviewReceipt=await json(await post(contributor,'/api/v1/contributions/review',review('Synthetic fictional general observation context only.')));contributions.push(['REVIEW',reviewReceipt.contributionId]);
  const reviewRisk=(await client.query('SELECT decision,reasons FROM unihood_private.risk_evaluations WHERE contribution_kind=$1 AND contribution_id=$2',['REVIEW',reviewReceipt.contributionId])).rows[0];
  assert.equal(reviewRisk.decision,'HOLD');
  const evidenceReceipt=await json(await post(contributor,'/api/v1/contributions/review',review('Synthetic fictional phone 555-0100 observation context only.')));contributions.push(['REVIEW',evidenceReceipt.contributionId]);
  const evidenceRisk=(await client.query('SELECT decision,reasons FROM unihood_private.risk_evaluations WHERE contribution_kind=$1 AND contribution_id=$2',['REVIEW',evidenceReceipt.contributionId])).rows[0];
  assert.equal(evidenceRisk.decision,'NEEDS_EVIDENCE');assert.ok(evidenceRisk.reasons.includes('RR-006-CONTACT-OR-LINK'));

  // UNI-044 suppression remains authoritative; risk classification stays separate.
  const report={key:randomUUID(),targetType:'BOARDING',targetId:a,reportType:'PRIVATE_DATA_EXPOSED',details:'Synthetic fictional exposed private-data report context only.',syntheticAcknowledged:true};
  const reportResponse=await post(contributor,'/api/v1/reports',report);assert.equal(reportResponse.status,200);const receipt=await json(reportResponse);contributions.push(['REPORT',receipt.reportId]);
  assert.equal(receipt.status,'SUPPRESSED');assert.equal((await fetch(`${contributor}/api/v1/boardings/${a}`)).status,404);
  const reportRisk=(await client.query('SELECT decision,risk_level,reasons FROM unihood_private.risk_evaluations WHERE contribution_kind=$1 AND contribution_id=$2',['REPORT',receipt.reportId])).rows[0];
  assert.equal(reportRisk.decision,'ESCALATE');assert.equal(reportRisk.risk_level,'HIGH');assert.ok(reportRisk.reasons.includes('RR-004-SENSITIVE-REPORT'));
  assert.equal((await client.query("SELECT count(*)::int AS n FROM unihood_private.report_cases WHERE id=$1 AND status='SUPPRESSED'",[receipt.reportId])).rows[0].n,1);
  const reportHistory=(await history(contributor,'REPORT')).items.find(item=>item.id===receipt.reportId);
  assert.equal(reportHistory.riskDecision,'ESCALATE');assert.equal(reportHistory.riskExplanation.includes('restricted support'),true);
  assert.ok(!JSON.stringify(reportHistory).match(/Synthetic fictional|555-0100|synthetic:contributor|details_ciphertext/));
  assert.equal((await post(operator,`/api/v1/reports/${receipt.reportId}/operator`,{key:randomUUID(),action:'DISMISS_REPORT',syntheticAcknowledged:true})).status,200);
  assert.equal((await fetch(`${contributor}/api/v1/boardings/${a}`)).status,200);

  // No real flow may produce routine publication while the gate is closed.
  assert.equal((await client.query("SELECT count(*)::int AS n FROM unihood_private.risk_evaluations WHERE decision='AUTO_PUBLISH'")).rows[0].n,0);

  // Populated history is preserved; an empty rollback/re-migrate is repeatable.
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated history/);
  for(const [kind,id] of contributions)await client.query('DELETE FROM unihood_private.risk_evaluations WHERE contribution_kind=$1 AND contribution_id=$2',[kind,id]);
  await client.query('DELETE FROM unihood_private.report_audit_events');
  await client.query('DELETE FROM unihood_private.report_suppressions');
  await client.query('DELETE FROM unihood_private.report_appeals');
  await client.query('DELETE FROM unihood_private.report_cases');
  await client.query('DELETE FROM unihood_private.review_intake');
  await client.query('DELETE FROM unihood_private.boarding_recommendation_intake');
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['018_risk_rules']);
  await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
  console.log('PASS: UNI-045 versioned explainable risk rules hold routine contributions behind the closed publication gate, require evidence for private/contact content, escalate sensitive reports without overriding suppression, reject official/self-review attempts, keep replays idempotent and preserve populated history on rollback');
 }finally{
  await Promise.all(children.map(async child=>{if(child.exitCode!==null)return;child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}));
  await client.query('DELETE FROM unihood_private.risk_evaluations');
  await client.query('DELETE FROM unihood_private.report_audit_events');
  await client.query('DELETE FROM unihood_private.report_suppressions');
  await client.query('DELETE FROM unihood_private.report_appeals');
  await client.query('DELETE FROM unihood_private.report_cases');
  await client.query('DELETE FROM unihood_private.review_intake');
  await client.query('DELETE FROM unihood_private.boarding_recommendation_intake');
  await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM public.listings WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM public.boarding_properties WHERE place_id=$1',[a]);
  await client.query('DELETE FROM public.public_place_locations WHERE place_id=$1',[a]);
  await client.query('DELETE FROM public.places WHERE id=$1',[a]);
 }
}
