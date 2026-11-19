import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {seedBoardingAdvertisements} from './boarding-seeds.mjs';
const a='00000000-0000-4000-8000-000000000001',b='71000000-0000-4000-8000-000000000002',community='71000000-0000-4000-8000-000000000003';
const contactKey='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const fixtures=JSON.parse(await readFile(new URL('../../infra/db/seeds/boardings.synthetic.json',import.meta.url),'utf8'));
export async function testRoleBoundaryRegressions({client,url}){
 const children=[];
 const start=async fixture=>{const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,APP_ENV:'test',NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:String(port),WEB_PORT:'3180',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:fixture,CONTACT_ENCRYPTION_KEY_HEX:contactKey,REPORT_ENCRYPTION_KEY_HEX:contactKey}});children.push(child);const base=`http://127.0.0.1:${port}`;for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok)return base;}catch{}if(child.exitCode!==null)throw new Error('Role boundary API startup failed');await delay(250);}throw new Error('Role boundary API startup timed out');};
 const post=(base,path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const put=(base,path,body)=>fetch(base+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const review=(rating,observation='Synthetic fictional shared-kitchen observation context only.')=>({key:randomUUID(),targetType:'BOARDING',targetId:a,reviewKind:'GENERAL_OBSERVATION',rating,observation,sourceConfidence:'COMMUNITY_SUBMITTED',sourceLabel:'SYNTHETIC',syntheticAcknowledged:true});
 const report=type=>({key:randomUUID(),targetType:'BOARDING',targetId:a,reportType:type,details:'Synthetic fictional wrong-fee context only.',syntheticAcknowledged:true});
 const contact=expectedRevision=>({expectedRevision,contactFixture:'fictional-contact-a',publicConsent:false,privacyAcknowledged:true});
 const snapshot=async()=>(await client.query("SELECT l.publication_status,l.is_current,b.visibility,a.visibility AS preview_visibility FROM public.listings l JOIN public.boarding_properties b ON b.place_id=$1 JOIN public.boarding_advertisement_previews a ON a.boarding_id=$1 AND a.listing_id=l.id WHERE l.id=$2",[a,'73000000-0000-4000-8000-000000000001'])).rows[0];
 try{
  assert.equal(await seedBoardingAdvertisements(client,url,{APP_ENV:'test',NODE_ENV:'test'},true),1);
  assert.equal(await seedBoardingAdvertisements(client,url,{APP_ENV:'test',NODE_ENV:'test'}),4);
  await client.query("UPDATE public.places SET source_label='UNI-034 closed synthetic owner fixture' WHERE id=$1",[b]);
  const contributor=await start('contributor'),contributorB=await start('contributor-b'),ownerA=await start('owner-a'),ownerB=await start('owner-b');
  const before=await snapshot();
  assert.deepEqual(before,{publication_status:'PUBLISHED',is_current:true,visibility:'HIDDEN',preview_visibility:'HIDDEN'});

  // Multi-owner separation: each owner controls only its own advertisement.
  assert.equal((await fetch(ownerA+'/api/v1/owner/boardings/'+a+'/privacy/overview')).status,200);
  assert.equal((await fetch(ownerB+'/api/v1/owner/boardings/'+b+'/privacy/overview')).status,200);
  assert.equal((await fetch(ownerA+'/api/v1/owner/boardings/'+b+'/privacy/overview')).status,403);
  assert.equal((await fetch(ownerB+'/api/v1/owner/boardings/'+a+'/privacy/overview')).status,403);
  assert.equal((await fetch(ownerA+'/api/v1/owner/boardings/'+b+'/map-settings')).status,403);
  assert.equal((await put(ownerA,'/api/v1/owner/boardings/'+a+'/privacy/contact',contact(0))).status,200);
  assert.equal((await put(ownerB,'/api/v1/owner/boardings/'+b+'/privacy/contact',contact(0))).status,200);
  assert.equal((await put(ownerA,'/api/v1/owner/boardings/'+b+'/privacy/contact',contact(0))).status,403);
  assert.equal((await put(ownerB,'/api/v1/owner/boardings/'+a+'/privacy/contact',contact(1))).status,403);
  for(const base of [a,b]){const response=await fetch(contributor+'/api/v1/boardings/'+base);assert.equal(response.status,200);const text=await response.text();assert.ok(!text.includes('+12025550100'));assert.ok(!text.includes('•••0100'));assert.ok(!/latitude|longitude|contact_ciphertext/.test(text));}

  // False ownership and student writes fail before any official mutation.
  assert.equal((await put(contributor,'/api/v1/owner/boardings/'+a+'/privacy/contact',contact(0))).status,403);
  assert.equal((await fetch(contributor+'/api/v1/owner/boardings/'+a+'/privacy/overview')).status,403);
  assert.equal((await fetch(contributor+'/api/v1/owner/boardings/'+b+'/map-settings')).status,403);
  assert.equal((await post(contributor,'/api/v1/owner/boardings/'+a+'/draft-check',{title:'Synthetic false claim',summary:'Synthetic claim attempt',locality:null,facilities:[],requestedVisibility:'PUBLIC_MAP',privacyAcknowledged:true,mediaGuidanceAcknowledged:true})).status,403);
  assert.equal((await post(contributor,'/api/v1/boardings/'+a+'/prices',{unitId:a,expectedPriceRevision:0,currency:'LKR',period:'MONTH',basis:'ROOM',rentMinor:100000,depositMinor:null,utilityTerms:'NOT_SHARED',mealTerms:'NOT_SHARED',effectiveAt:'2026-11-17T00:00:00Z',reason:'INITIAL'})).status,403);
  assert.equal((await fetch(contributor+'/api/v1/owner/claims')).status,404);
  assert.equal((await fetch(contributor+'/api/v1/owner/boardings/'+b+'/privacy/overview',{headers:{'X-User-Id':'synthetic:owner-b','X-Role':'owner'}})).status,403);

  // Multiple contributors can submit independent, contradictory reviews; none publishes or proves ownership.
  const first=review(5),firstReceipt=await (await post(contributor,'/api/v1/contributions/review',first)).json();
  const second=review(1,'Synthetic fictional contradictory quiet-room observation context only.'),secondReceipt=await (await post(contributorB,'/api/v1/contributions/review',second)).json();
  assert.notEqual(firstReceipt.contributionId,secondReceipt.contributionId);
  for(const receipt of [firstReceipt,secondReceipt])assert.deepEqual(receipt,{contributionId:receipt.contributionId,outcome:'HELD_REVIEW',reviewState:'PENDING',published:false,dataKind:'SYNTHETIC'});
  assert.deepEqual(await (await post(contributor,'/api/v1/contributions/review',first)).json(),firstReceipt);
  const repeated=await (await post(contributor,'/api/v1/contributions/review',{...review(5),key:randomUUID()})).json();assert.notEqual(repeated.contributionId,firstReceipt.contributionId);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.review_intake WHERE target_id=$1',[a])).rows[0].n,3);
  assert.equal((await client.query('SELECT count(DISTINCT actor_ref)::int AS n FROM unihood_private.review_intake WHERE target_id=$1',[a])).rows[0].n,2);
  const history=async base=>{const response=await fetch(base+'/api/v1/contributions?kind=REVIEW&pageSize=20');assert.equal(response.status,200);return await response.json();};
  const firstHistory=await history(contributor),secondHistory=await history(contributorB);
  assert.deepEqual(firstHistory.items.map(item=>item.id).sort(),[firstReceipt.contributionId,repeated.contributionId].sort());
  assert.deepEqual(secondHistory.items.map(item=>item.id),[secondReceipt.contributionId]);
  assert.ok(!JSON.stringify(firstHistory).match(/contradictory|synthetic:contributor-b|synthetic:owner|555-0100|contact_ciphertext/));
  assert.deepEqual(await snapshot(),before);

  // Confidential multi-contributor reports stay private, separate and non-publishing.
  const reportInputOne=report('WRONG_FEE'),reportOne=await (await post(contributor,'/api/v1/reports',reportInputOne)).json();
  const reportTwo=await (await post(contributorB,'/api/v1/reports',report('STALE_INFORMATION'))).json();
  assert.notEqual(reportOne.reportId,reportTwo.reportId);
  for(const receipt of [reportOne,reportTwo])assert.equal(receipt.published,false);
  assert.deepEqual(await (await post(contributor,'/api/v1/reports',reportInputOne)).json(),reportOne);
  assert.equal((await client.query('SELECT count(DISTINCT reporter_ref)::int AS n FROM unihood_private.report_cases WHERE target_ref=$1',[a])).rows[0].n,2);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM unihood_private.risk_evaluations WHERE decision='AUTO_PUBLISH'")).rows[0].n,0);
  assert.deepEqual(await snapshot(),before);

  // UNI-046 requests remain student-only simulations and cannot reveal either owner's private data.
  const request=await (await post(contributor,'/api/v1/boarding-requests',{requestKey:randomUUID(),boardingId:a,kind:'REQUEST_LOCATION',syntheticAcknowledged:true})).json();
  assert.equal(request.status,'MOCK_PENDING');assert.equal(request.locationDisclosed,false);assert.equal(request.ownerNotified,false);
  assert.equal((await fetch(ownerB+'/api/v1/boarding-requests/'+request.requestId)).status,403);
  assert.equal((await post(ownerB,'/api/v1/boarding-requests',{requestKey:randomUUID(),boardingId:b,kind:'CONTACT_OWNER',syntheticAcknowledged:true})).status,403);
  assert.equal((await post(contributor,'/api/v1/boarding-requests',{requestKey:randomUUID(),boardingId:community,kind:'CONTACT_OWNER',syntheticAcknowledged:true})).status,404);

  // Exact coordinates and private contact remain outside public/history/request payloads.
  await client.query("INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,address_enc,retention_policy) VALUES($1,ST_SetSRID(ST_MakePoint(43.654321,42.123456),4326),decode('53594e544845544943','hex'),'synthetic-test-only')",[a]);
  const canaries=[await fetch(contributor+'/api/v1/boardings/'+a).then(r=>r.text()),JSON.stringify(firstHistory),JSON.stringify(request)];
  for(const text of canaries)assert.ok(!/42\.123456|43\.654321|555-0100|synthetic:owner-b|latitude|longitude/.test(text));
  await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=$1',[a]);
  console.log('PASS: UNI-047 multi-contributor reviews/reports stay independent, held and private; two owners control disjoint advertisements; false ownership claims cannot gain contact, location, management, price, visibility or publication authority; votes are not proof; UNI-046 requests remain mock-only');
 }finally{
  for(const child of children)child.kill('SIGTERM');
  const ids=[a,...fixtures.map(row=>row.id)];
  await client.query('DELETE FROM unihood_private.boarding_requests WHERE boarding_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM unihood_private.risk_evaluations');
  await client.query('DELETE FROM unihood_private.report_audit_events');
  await client.query('DELETE FROM unihood_private.report_suppressions');
  await client.query('DELETE FROM unihood_private.report_appeals');
  await client.query('DELETE FROM unihood_private.report_cases');
  await client.query('DELETE FROM unihood_private.review_intake');
  await client.query('DELETE FROM unihood_private.boarding_contacts WHERE boarding_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.listings WHERE boarding_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.boarding_properties WHERE place_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.public_place_locations WHERE place_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[ids]);
 }
}
