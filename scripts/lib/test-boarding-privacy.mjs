import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {chmod,mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
const require=createRequire(new URL('../../apps/api/package.json',import.meta.url));
const sharp=require('sharp');
import {seedBoardingAdvertisements} from './boarding-seeds.mjs';
import {runMigrations} from './database.mjs';

export async function testBoardingPrivacy({client,url,migrations}){
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
 for(const id of [a,b])assert.equal((await client.query('SELECT count(*)::int AS n FROM public.places WHERE id=$1',[id])).rows[0].n,0);

 const storageRoot=await mkdtemp(join(tmpdir(),'unihood-media-test-'));
 await chmod(storageRoot,0o700);
 const encryptionKey='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 let child;
 const base=`http://127.0.0.1:${port}`;
 const privacyBase=`/api/v1/owner/boardings/${a}/privacy`;

 const json=(route,body,method='POST')=>fetch(base+route,{
  method,
  headers:{'Content-Type':'application/json'},
  body:body?JSON.stringify(body):undefined,
  signal:AbortSignal.timeout(8000)
 });

 const upload=(route,form)=>fetch(base+route,{
  method:'POST',
  body:form,
  signal:AbortSignal.timeout(10000)
 });

 const jpegBytes=await readFile(resolve(process.cwd(),'infra/db/fixtures/boarding-media.synthetic.jpg'));

 try{
  child=spawn(process.execPath,['apps/api/dist/main.js'],{
   stdio:'ignore',
   env:{
    ...process.env,
    DATABASE_URL:url,
    APP_ENV:'test',
    NODE_ENV:'test',
    API_HOST:'127.0.0.1',
    API_PORT:String(port),
    WEB_PORT:'3180',
    ENABLE_SYNTHETIC_ACTORS:'true',
    SYNTHETIC_ACTOR:'owner-a',
    MEDIA_STORAGE_ROOT:storageRoot,
    CONTACT_ENCRYPTION_KEY_HEX:encryptionKey
   }
  });

  for(let i=0;i<40;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}if(i===39||child.exitCode!==null)throw new Error('Privacy actor API startup failed');await delay(250);}

  await seedBoardingAdvertisements(client,url,{APP_ENV:'test',NODE_ENV:'test'},true);

  // 1. Overview check
  const overviewRes=await fetch(base+privacyBase+'/overview');
  assert.equal(overviewRes.status,200);
  const overview=await overviewRes.json();
  assert.equal(overview.id,a);
  assert.equal(overview.synthetic,true);
  assert.equal(overview.storageConfigured,true);
  assert.equal(overview.encryptionConfigured,true);
  assert.equal(overview.scanner,'NOT_CONFIGURED');
  assert.equal(overview.publicMediaDelivery,'DISABLED');
  assert.equal(overview.publicContactDelivery,'DISABLED');

  // 2. Media upload with EXIF/XMP canary stripping
  const requestKey1=randomUUID();
  const form1=new FormData();
  form1.append('consent','true');
  form1.append('requestKey',requestKey1);
  form1.append('image',new Blob([jpegBytes],{type:'image/jpeg'}),'canary.jpg');

  const uploadRes1=await upload(privacyBase+'/media',form1);
  assert.equal(uploadRes1.status,200);
  const receipt1=await uploadRes1.json();
  assert.equal(receipt1.id,a);
  assert.equal(receipt1.synthetic,true);
  assert.equal(receipt1.published,false);
  assert.equal(receipt1.cleanupPending,false);
  const assetId1=receipt1.assetId;

  // DB record check
  const mediaRows=await client.query('SELECT * FROM unihood_private.boarding_media WHERE asset_id=$1',[assetId1]);
  assert.equal(mediaRows.rows.length,1);
  const mediaRow=mediaRows.rows[0];
  assert.equal(mediaRow.state,'ACTIVE');
  assert.equal(mediaRow.retained_asset_id,assetId1);
  assert.equal(mediaRow.object_key,`${assetId1}.webp`);
  assert.equal(mediaRow.cleanup_pending,false);

  // media_assets check
  const assetRows=await client.query('SELECT * FROM unihood_private.media_assets WHERE id=$1',[assetId1]);
  assert.equal(assetRows.rows.length,1);
  assert.equal(assetRows.rows[0].consent_status,'GRANTED');
  assert.equal(assetRows.rows[0].moderation_status,'PENDING');
  assert.equal(assetRows.rows[0].metadata_status,'STRIPPED');
  assert.equal(assetRows.rows[0].mime,'image/webp');

  // Stored file check on disk: mode 0600, stripped of EXIF/XMP/GPS
  const storedFilePath=join(storageRoot,`${assetId1}.webp`);
  const fileStat=await stat(storedFilePath);
  assert.equal(fileStat.mode&0o077,0);
  const storedBytes=await readFile(storedFilePath);
  assert.ok(!storedBytes.toString().includes('SYNTHETIC_PRIVATE_CANARY'));
  const storedMeta=await sharp(storedBytes).metadata();
  assert.equal(storedMeta.format,'webp');
  assert.equal(storedMeta.exif,undefined);
  assert.equal(storedMeta.xmp,undefined);

  // 3. Content preview
  const previewRes=await fetch(`${base}${privacyBase}/media/${assetId1}/content`);
  assert.equal(previewRes.status,200);
  assert.equal(previewRes.headers.get('content-type'),'image/webp');
  assert.equal(previewRes.headers.get('cache-control'),'no-store');
  assert.equal(previewRes.headers.get('x-content-type-options'),'nosniff');
  assert.equal(previewRes.headers.get('content-security-policy'),"default-src 'none'; sandbox");
  assert.deepEqual(Buffer.from(await previewRes.arrayBuffer()),storedBytes);

  // 4. Interrupted upload / Staging recovery:
  // Replaying the EXACT SAME requestKey and image content returns the existing reservation and completes cleanly
  const replayRes=await upload(privacyBase+'/media',form1);
  assert.equal(replayRes.status,200);
  const replayReceipt=await replayRes.json();
  assert.equal(replayReceipt.assetId,assetId1);

  // Conflicting requestKey with different image bytes returns 409
  const validWebp=await sharp({create:{width:10,height:10,channels:3,background:{r:0,g:128,b:128}}}).webp().toBuffer();
  const diffForm=new FormData();
  diffForm.append('consent','true');
  diffForm.append('requestKey',requestKey1);
  diffForm.append('image',new Blob([validWebp],{type:'image/webp'}),'diff.webp');
  assert.equal((await upload(privacyBase+'/media',diffForm)).status,409);

  // 5. Revocation of media
  const revokeRes=await json(`${privacyBase}/media/${assetId1}`,{expectedRevision:receipt1.revision},'DELETE');
  assert.equal(revokeRes.status,200);
  const revokeReceipt=await revokeRes.json();
  assert.equal(revokeReceipt.cleanupPending,false);

  // DB state is REVOKED
  const revokedRows=await client.query('SELECT state,cleanup_pending FROM unihood_private.boarding_media WHERE asset_id=$1',[assetId1]);
  assert.equal(revokedRows.rows[0].state,'REVOKED');
  assert.equal(revokedRows.rows[0].cleanup_pending,false);

  // Stored file is deleted
  await assert.rejects(stat(storedFilePath),e=>e.code==='ENOENT');

  // Preview after revocation returns 404
  assert.equal((await fetch(`${base}${privacyBase}/media/${assetId1}/content`)).status,404);

  // 6. Private contact
  const initialContact=await (await fetch(base+privacyBase+'/contact')).json();
  assert.equal(initialContact.state,'ABSENT');
  assert.equal(initialContact.maskedPhone,null);
  assert.equal(initialContact.revision,0);
  assert.equal(initialContact.readable,true);

  // Set fictional contact
  const setContactRes=await json(privacyBase+'/contact',{
   expectedRevision:0,
   contactFixture:'fictional-contact-a',
   publicConsent:false,
   privacyAcknowledged:true
  },'PUT');
  assert.equal(setContactRes.status,200);
  const contactReceipt=await setContactRes.json();
  assert.equal(contactReceipt.revision,1);
  assert.equal(contactReceipt.publicAvailable,false);

  // Verify DB state
  const contactRows=await client.query('SELECT * FROM unihood_private.boarding_contacts WHERE boarding_id=$1',[a]);
  assert.equal(contactRows.rows.length,1);
  assert.equal(contactRows.rows[0].state,'PRIVATE');
  assert.equal(contactRows.rows[0].verification_status,'UNVERIFIED');
  assert.equal(contactRows.rows[0].public_consent,false);
  assert.ok(contactRows.rows[0].ciphertext.length>0);
  assert.ok(!contactRows.rows[0].ciphertext.toString().includes('0100'));
  assert.equal(contactRows.rows[0].iv.length,12);
  assert.equal(contactRows.rows[0].auth_tag.length,16);

  // GET contact shows mask
  const privateContact=await (await fetch(base+privacyBase+'/contact')).json();
  assert.equal(privateContact.state,'PRIVATE');
  assert.equal(privateContact.maskedPhone,'•••0100');
  assert.equal(privateContact.readable,true);
  assert.equal(privateContact.publicAvailable,false);
  assert.equal(privateContact.publicConsent,false);

  // Corrupted auth_tag returns readable: false without crashing or leaking plaintext
  const origTag=contactRows.rows[0].auth_tag;
  const badTag=Buffer.from(origTag);
  badTag[0]^=1;
  await client.query('UPDATE unihood_private.boarding_contacts SET auth_tag=$1 WHERE boarding_id=$2',[badTag,a]);
  const corruptedContact=await (await fetch(base+privacyBase+'/contact')).json();
  assert.equal(corruptedContact.state,'PRIVATE');
  assert.equal(corruptedContact.readable,false);
  assert.equal(corruptedContact.maskedPhone,null);
  await client.query('UPDATE unihood_private.boarding_contacts SET auth_tag=$1 WHERE boarding_id=$2',[origTag,a]);

  // Remove contact
  const removeContactRes=await json(privacyBase+'/contact',{expectedRevision:1},'DELETE');
  assert.equal(removeContactRes.status,200);
  const removedReceipt=await removeContactRes.json();
  assert.equal(removedReceipt.revision,2);

  const removedRows=await client.query('SELECT state,ciphertext,iv,auth_tag FROM unihood_private.boarding_contacts WHERE boarding_id=$1',[a]);
  assert.equal(removedRows.rows[0].state,'REMOVED');
  assert.equal(removedRows.rows[0].ciphertext,null);
  assert.equal(removedRows.rows[0].iv,null);
  assert.equal(removedRows.rows[0].auth_tag,null);

  // 7. Audit events check
  const eventsRes=await fetch(base+privacyBase+'/events?page=1&pageSize=20');
  assert.equal(eventsRes.status,200);
  const events=await eventsRes.json();
  const eventTypes=events.items.map(e=>e.event);
  assert.ok(eventTypes.includes('MEDIA_UPLOAD_STAGED'));
  assert.ok(eventTypes.includes('MEDIA_QUARANTINED'));
  assert.ok(eventTypes.includes('MEDIA_CONSENT_REVOKED'));
  assert.ok(eventTypes.includes('PRIVATE_CONTACT_SET'));
  assert.ok(eventTypes.includes('PRIVATE_CONTACT_REMOVED'));
  const eventsJson=JSON.stringify(events);
  assert.ok(!eventsJson.includes('0100'));
  assert.ok(!eventsJson.includes(storageRoot));
  assert.ok(!eventsJson.includes('canary.jpg'));

  // 8. Boundary checks: property B is forbidden for owner-a
  assert.equal((await fetch(base+`/api/v1/owner/boardings/${b}/privacy/overview`)).status,403);
  assert.equal((await fetch(base+`/api/v1/owner/boardings/${b}/privacy/contact`)).status,403);
  assert.equal((await fetch(base+`/api/v1/owner/boardings/${b}/privacy/media`)).status,403);

  // 9. Remove only the empty later leaf before testing populated 012 refusal.
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['014_boarding_recommendation_resolutions']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['013_boarding_recommendation_intake']);
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);

  await runMigrations(client,migrations,'migrate');
  console.log('PASS: real private media upload, EXIF/XMP stripping, WebP storage, staging recovery, contact AES-GCM encryption, corrupted tag recovery, audit event logging and property capability boundaries');
 }finally{
  if(child&&child.exitCode===null){
   child.kill('SIGTERM');
   await Promise.race([new Promise(r=>child.once('exit',r)),delay(3000)]);
   if(child.exitCode===null)child.kill('SIGKILL');
  }
  await rm(storageRoot,{recursive:true,force:true});
  // Clean up test data
  await client.query('DELETE FROM unihood_private.boarding_privacy_events WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);
  await client.query('DELETE FROM unihood_private.boarding_contacts WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);
  await client.query('DELETE FROM unihood_private.boarding_media WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);
  await client.query('DELETE FROM unihood_private.media_assets WHERE uploader_ref=$1',['synthetic:owner-a']);
  await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM public.listings WHERE boarding_id=$1',[a]);
  await client.query('DELETE FROM public.boarding_properties WHERE place_id=ANY($1::uuid[])',[[a,b]]);
  await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[[a,b]]);
 }

 // Test migration 012 rollback and re-migrate on empty tables
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['014_boarding_recommendation_resolutions']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['013_boarding_recommendation_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['012_boarding_media_contacts']);
 await runMigrations(client,migrations,'migrate');
 assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: 012_boarding_media_contacts rollback and re-migrate clean and idempotent');
}
