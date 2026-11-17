import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { seedBoardingAdvertisements } from './boarding-seeds.mjs';
import { runMigrations } from './database.mjs';
export async function testBoardingAdvertisements({client,url,migrations,get}){
 const read=async path=>{const response=await get(path);return {status:response.status,body:await response.json()};};
 const fixtures=JSON.parse(await readFile(new URL('../../infra/db/seeds/boardings.synthetic.json',import.meta.url),'utf8'));
 assert.equal((await client.query('SELECT count(*)::int AS n FROM public.boarding_advertisement_previews')).rows[0].n,0);
 const ids=fixtures.map(r=>r.id),listingIds=fixtures.map(r=>r.listingId),env={APP_ENV:'test',NODE_ENV:'test'};
 try{
  assert.equal(await seedBoardingAdvertisements(client,url,env),4);assert.equal(await seedBoardingAdvertisements(client,url,env),4);
  await assert.rejects(seedBoardingAdvertisements(client,url,{APP_ENV:'production'}));
  const {BoardingService}=await import('../../apps/api/dist/boardings/boarding.service.js');
  const deployed=new BoardingService({includeSynthetic:false,query:async(sql,values)=>(await client.query(sql,values)).rows});
  assert.equal((await deployed.list({})).items.length,0);await assert.rejects(deployed.detail(ids[0]),error=>error.getStatus()===404);
  const list=await read('/api/v1/boardings?pageSize=2');assert.equal(list.status,200);assert.equal(list.body.items.length,2);assert.equal(list.body.page.hasNextPage,true);
  for(const pub of ['OWNER_OFFICIAL','COMMUNITY_RECOMMENDATION']){const r=await read('/api/v1/boardings?publisherKind='+pub);assert.equal(r.status,200);assert.equal(r.body.items.length,2);assert.ok(r.body.items.every(x=>x.listing.publisherKind===pub));}
  assert.equal((await read('/api/v1/boardings?visibility=HIDDEN')).body.items.length,2);
  assert.equal((await read('/api/v1/boardings?q=Quiet')).body.items.length,1);
  assert.equal((await read('/api/v1/boardings?q=%25')).body.items.length,0);
  await client.query("UPDATE public.listings SET title='PRIVATE_CANARY 1 Secret Road',description='PRIVATE_CANARY phone and location' WHERE id=$1",[listingIds[0]]);
  await client.query("UPDATE public.boarding_properties SET description='PRIVATE_CANARY private evidence' WHERE place_id=$1",[ids[0]]);
  // Fictional negative canaries only, never a real residence or API fixture.
  await client.query("INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,address_enc,retention_policy) SELECT id,ST_SetSRID(ST_MakePoint(43.654321,42.123456),4326),decode('53594e544845544943','hex'),'synthetic-test-only' FROM unnest($1::uuid[]) AS selected(id)",[ids.slice(0,2)]);
  for(const id of ids.slice(0,2)){const r=await read('/api/v1/boardings/'+id);assert.equal(r.status,200);assert.equal(r.body.listing.entrance,null);assert.ok(!/42\.123456|43\.654321|exact_geo|address_enc|authorizationStatus|localityConsent|publicMapConsent/.test(JSON.stringify(r.body)));}
  const privateList=await read('/api/v1/boardings');assert.equal(privateList.status,200);assert.ok(!/42\.123456|43\.654321|exact_geo|address_enc|authorizationStatus|localityConsent|publicMapConsent/.test(JSON.stringify(privateList.body)));assert.equal((await read('/api/v1/boardings?q=42.123456')).body.items.length,0);
  const detail=await read('/api/v1/boardings/'+ids[0]);assert.equal(detail.status,200);assert.equal(detail.body.listing.title,fixtures[0].title);assert.equal(detail.body.listing.entrance,null);assert.equal(detail.body.listing.price,null);assert.equal(detail.body.listing.vacancy.status,'UNKNOWN');assert.ok(!JSON.stringify(detail.body).includes('PRIVATE_CANARY'));
  await assert.rejects(seedBoardingAdvertisements(client,url,env),/existing data preserved/);
  await client.query("UPDATE public.boarding_properties SET visibility='HIDDEN',general_locality=NULL,locality_consent=false WHERE place_id=$1",[ids[0]]);
  assert.equal((await read('/api/v1/boardings/'+ids[0])).status,404);assert.equal((await read('/api/v1/boardings?q=Courtyard')).body.items.length,0);
  await client.query("UPDATE public.boarding_properties SET authorization_status='UNVERIFIED' WHERE place_id=$1",[ids[1]]);assert.equal((await read('/api/v1/boardings/'+ids[1])).status,404);
  await client.query("UPDATE public.boarding_properties SET authorization_status='LOCAL_TEST_AUTHORIZED' WHERE place_id=$1",[ids[1]]);assert.equal((await read('/api/v1/boardings/'+ids[1])).status,200);
  await client.query("UPDATE public.listings SET publication_status='DISPUTED',is_current=false WHERE id=$1",[listingIds[1]]);assert.equal((await read('/api/v1/boardings/'+ids[1])).status,404);
  await client.query("UPDATE public.places SET status='ARCHIVED' WHERE id=$1",[ids[2]]);assert.equal((await read('/api/v1/boardings/'+ids[2])).status,404);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['009_boarding_public_entrances']);
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated table/);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.boarding_advertisement_previews')).rows[0].n,4);
  console.log('PASS: curated synthetic boarding seeds repeat safely and preserve conflicts; real public feed/detail/source/visibility/search/paging exclude unreviewed private text, actual private geometry/ciphertext and internal policy facts and suppress revoked/disputed/archived records; populated preview rollback refuses');
 }finally{
  // Only fixture IDs in the already-proven owned disposable target; no production reset.
  await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.listings WHERE id=ANY($1::uuid[])',[listingIds]);
  await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.boarding_properties WHERE place_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[ids]);
 }
 await client.query('CREATE VIEW public.synthetic_ad_dependency AS SELECT listing_id FROM public.boarding_advertisement_previews');
 await assert.rejects(runMigrations(client,migrations,'rollback'),e=>e.code==='2BP01');
 await client.query('DROP VIEW public.synthetic_ad_dependency');
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['008_boarding_advertisement_previews']);
 await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: advertisement preview dependency rollback is atomic; empty down/up/repeat preserves existing foundation and extensions');
}
