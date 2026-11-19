import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {seedBoardingAdvertisements} from './boarding-seeds.mjs';
import {runMigrations} from './database.mjs';
const a='00000000-0000-4000-8000-000000000001',listing='73000000-0000-4000-8000-000000000001';
export async function testBoardingRequests({client,url,migrations}){
 const children=[];
 const start=async fixture=>{const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,APP_ENV:'test',NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:String(port),WEB_PORT:'3180',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:fixture}});children.push(child);const base=`http://127.0.0.1:${port}`;for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok)return base;}catch{}if(child.exitCode!==null)throw new Error('Request API startup failed');await delay(250);}throw new Error('Request API startup timed out');};
 const post=(base,body)=>fetch(base+'/api/v1/boarding-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const request=kind=>({requestKey:randomUUID(),boardingId:a,kind,syntheticAcknowledged:true});
 try{
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_requests')).rows[0].n,0);
  await seedBoardingAdvertisements(client,url,{APP_ENV:'test',NODE_ENV:'test'},true);
  const contributor=await start('contributor'),owner=await start('owner-a');
  const before=(await client.query('SELECT l.publication_status,l.is_current,b.visibility,a.visibility AS preview_visibility FROM public.listings l JOIN public.boarding_properties b ON b.place_id=$1 JOIN public.boarding_advertisement_previews a ON a.boarding_id=$1 AND a.listing_id=l.id WHERE l.id=$2',[a,listing])).rows[0];
  assert.deepEqual(before,{publication_status:'PUBLISHED',is_current:true,visibility:'HIDDEN',preview_visibility:'HIDDEN'});

  const contact=request('CONTACT_OWNER'),contactResponse=await post(contributor,contact);assert.equal(contactResponse.status,200);
  const contactReceipt=await contactResponse.json();
  assert.equal(contactReceipt.boardingId,a);assert.equal(contactReceipt.kind,'CONTACT_OWNER');assert.equal(contactReceipt.status,'MOCK_PENDING');assert.equal(contactReceipt.synthetic,true);assert.equal(contactReceipt.ownerNotified,false);assert.equal(contactReceipt.locationDisclosed,false);assert.equal(contactReceipt.duplicate,false);assert.equal(contactReceipt.dataKind,'SYNTHETIC');
  assert.ok(!JSON.stringify(contactReceipt).match(/phone|email|coordinate|latitude|longitude|synthetic:contributor|requester_ref|request_key|payload_hash/));
  const rows=(await client.query('SELECT * FROM unihood_private.boarding_requests ORDER BY created_at')).rows;
  assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]).sort(),['boarding_id','created_at','data_kind','id','kind','payload_hash','request_key','requester_ref','status']);
  assert.equal(rows[0].requester_ref,'synthetic:contributor');assert.equal(rows[0].data_kind,'SYNTHETIC');assert.equal(rows[0].payload_hash.length,64);
  const unchanged=(await client.query('SELECT l.publication_status,l.is_current,b.visibility,a.visibility AS preview_visibility FROM public.listings l JOIN public.boarding_properties b ON b.place_id=$1 JOIN public.boarding_advertisement_previews a ON a.boarding_id=$1 AND a.listing_id=l.id WHERE l.id=$2',[a,listing])).rows[0];
  assert.deepEqual(unchanged,before);

  const replay=await (await post(contributor,contact)).json();assert.equal(replay.requestId,contactReceipt.requestId);assert.equal(replay.duplicate,true);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_requests')).rows[0].n,1);

  const location=await (await post(contributor,request('REQUEST_LOCATION'))).json();
  assert.equal(location.kind,'REQUEST_LOCATION');assert.equal(location.status,'MOCK_PENDING');assert.equal(location.locationDisclosed,false);assert.equal(location.ownerNotified,false);
  const locationReplay=await (await post(contributor,request('REQUEST_LOCATION'))).json();assert.equal(locationReplay.requestId,location.requestId);assert.equal(locationReplay.duplicate,true);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_requests')).rows[0].n,2);
  assert.equal((await post(contributor,{...contact,kind:'REQUEST_LOCATION'})).status,409);

  const statusResponse=await fetch(contributor+'/api/v1/boarding-requests/'+contactReceipt.requestId);assert.equal(statusResponse.status,200);
  const status=await statusResponse.json();assert.equal(status.requestId,contactReceipt.requestId);assert.equal(status.status,'MOCK_PENDING');assert.ok(!JSON.stringify(status).match(/phone|email|latitude|longitude|synthetic:contributor/));
  assert.equal((await fetch(owner+'/api/v1/boarding-requests/'+contactReceipt.requestId)).status,403);
  assert.equal((await fetch(contributor+'/api/v1/boarding-requests/'+randomUUID())).status,404);
  assert.equal((await post(owner,request('CONTACT_OWNER'))).status,403);

  await client.query("UPDATE public.listings SET publisher_kind='COMMUNITY_RECOMMENDATION' WHERE id=$1",[listing]);
  assert.equal((await post(contributor,request('CONTACT_OWNER'))).status,404);
  await client.query("UPDATE public.listings SET publisher_kind='OWNER_OFFICIAL' WHERE id=$1",[listing]);

  await client.query("UPDATE public.boarding_properties SET visibility='PUBLIC_MAP',public_map_consent=true,map_consent_at=CURRENT_TIMESTAMP WHERE place_id=$1",[a]);
  await client.query("UPDATE public.boarding_advertisement_previews SET visibility='PUBLIC_MAP' WHERE boarding_id=$1",[a]);
  assert.equal((await post(contributor,request('REQUEST_LOCATION'))).status,404);
  await client.query("UPDATE public.boarding_advertisement_previews SET visibility='HIDDEN' WHERE boarding_id=$1",[a]);
  await client.query("UPDATE public.boarding_properties SET visibility='HIDDEN',public_map_consent=false,map_consent_at=NULL WHERE place_id=$1",[a]);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_requests')).rows[0].n,2);

  const boardingRequestsMigration=migrations.find(m=>m.id==='019_boarding_requests');
  await assert.rejects(client.query(boardingRequestsMigration.down),/populated mock request history/);
  await client.query('DELETE FROM unihood_private.boarding_requests');
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['020_multi_actor_fixtures']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['019_boarding_requests']);
  await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
  console.log('PASS: UNI-046 owner contact/location mock requests stay pending, synthetic and requester-scoped; duplicates and key reuse are bounded; community/public-map eligibility and hidden visibility cannot be bypassed; no owner contact or coordinate disclosure occurs; populated rollback refuses');
 }finally{
  await client.query('DELETE FROM unihood_private.boarding_requests WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM public.listings WHERE id=$1',[listing]);
  await client.query('DELETE FROM public.boarding_properties WHERE place_id=$1',[a]);
  await client.query('DELETE FROM public.public_place_locations WHERE place_id=$1',[a]);
  await client.query('DELETE FROM public.places WHERE id=$1',[a]);
  for(const child of children)child.kill();
 }
}
