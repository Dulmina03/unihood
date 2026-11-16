import assert from 'node:assert/strict';
import { seedDatabase } from './database.mjs';
export async function testPublicPois({client,url,get,endpoint}) {
  const bbox='-0.01,-0.01,0.01,0.01', path=`/api/v1/places?bbox=${bbox}`, id='40000000-0000-4000-8000-000000000001';
  const {PublicPoiDetailSchema,PoiPageSchema,PoiCategoryPageSchema}=await import('../../packages/contracts/dist/index.js');
  const read=async suffix=>{const response=await get(path+suffix);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');return PoiPageSchema.parse(await response.json());};
  assert.equal((await read('')).items.length,4);
  const detailPath='/api/v1/places/'+id;
  const detailResponse=await get(detailPath);assert.equal(detailResponse.status,200);assert.equal(detailResponse.headers.get('cache-control'),'no-store');
  const detail=PublicPoiDetailSchema.parse(await detailResponse.json());assert.equal(detail.id,id);assert.equal(detail.lastConfirmedAt,null);assert.ok(detail.updatedAt);
  assert.equal((await get('/api/v1/places/not-a-uuid')).status,400);
  assert.equal((await get('/api/v1/places/40000000-0000-4000-8000-000000000099')).status,404);
  const boarding='60000000-0000-4000-8000-000000000022';
  await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,status,data_kind,source_label) VALUES ($1,'BOARDING','Synthetic private residence canary','synthetic private residence canary','ACTIVE','SYNTHETIC','Synthetic privacy fixture')",[boarding]);
  try{const hidden=await get('/api/v1/places/'+boarding);assert.equal(hidden.status,404);assert.ok(!JSON.stringify(await hidden.json()).includes('residence'));}finally{await client.query('DELETE FROM public.places WHERE id=$1',[boarding]);}
  for(const category of ['pharmacy','restaurant','clinic','hardware']){const page=await read('&category='+category);assert.equal(page.items.length,1);assert.equal(page.items[0].category.code,category);}
  const one=await read('&pageSize=1&sort=name'),two=await read('&pageSize=1&page=2&sort=name');
  assert.equal(one.page.hasNextPage,true);assert.notEqual(one.items[0].id,two.items[0].id);
  assert.equal((await read('&q=Pharmacy')).items[0].id,id);assert.equal((await read('&q=%25')).items.length,0);
  assert.equal((await read('&sort=newest')).items.length,4);assert.equal((await read('&page=9999')).items.length,0);
  const categoriesResponse=await get('/api/v1/place-categories?bbox='+bbox);assert.equal(categoriesResponse.status,200);assert.equal(PoiCategoryPageSchema.parse(await categoriesResponse.json()).items.length,4);
  assert.equal((await get('/api/v1/places?bbox=1,1,1.01,1.01')).status,200);assert.equal((await(await get('/api/v1/places?bbox=1,1,1.01,1.01')).json()).items.length,0);
  for(const suffix of ['', '?bbox=0,0,2,1',`?bbox=${bbox}&bbox=${bbox}`,`?bbox=${bbox}&pageSize=101`,`?bbox=${bbox}&sort=distance`]) assert.equal((await get('/api/v1/places'+suffix)).status,400);
  for(const method of ['POST','PATCH','PUT','DELETE'])assert.equal((await fetch(endpoint+'/api/v1/places',{method,headers:{'X-Role':'owner'},signal:AbortSignal.timeout(4000)})).status,404);
  // Publication is explicit, not inferred from status/category/source or an unrelated building.
  await client.query('BEGIN');
  try{
    await client.query('DELETE FROM public.public_place_locations WHERE place_id=$1',[id]);
    await client.query("UPDATE public.places SET status='ARCHIVED' WHERE id=$1",[id]);
    // The HTTP API uses a separate connection: commit this test transition before reading.
    await client.query('COMMIT');assert.equal((await read('&category=pharmacy')).items.length,0);assert.equal((await get(detailPath)).status,404);
  }catch(error){await client.query('ROLLBACK');throw error;}
  await client.query("UPDATE public.places SET status='ACTIVE' WHERE id=$1",[id]);
  assert.equal((await read('&category=pharmacy')).items.length,0);assert.equal((await get(detailPath)).status,404);
  await client.query("UPDATE public.places SET status='MERGED',merged_into='40000000-0000-4000-8000-000000000002' WHERE id=$1",[id]);assert.equal((await get(detailPath)).status,404);
  await client.query("UPDATE public.places SET status='PENDING',merged_into=NULL WHERE id=$1",[id]);assert.equal((await get(detailPath)).status,404);
  await client.query("UPDATE public.places SET status='ACTIVE' WHERE id=$1",[id]);
  await seedDatabase(client,url,{APP_ENV:'test',NODE_ENV:'test'});
  const before=(await client.query('SELECT id,canonical_name,created_at,updated_at FROM public.places ORDER BY id')).rows;
  await seedDatabase(client,url,{APP_ENV:'test',NODE_ENV:'test'});assert.deepEqual((await client.query('SELECT id,canonical_name,created_at,updated_at FROM public.places ORDER BY id')).rows,before);
  await client.query("UPDATE public.places SET canonical_name='Synthetic local POI edit' WHERE id=$1",[id]);
  await assert.rejects(seedDatabase(client,url,{APP_ENV:'test',NODE_ENV:'test'}),/existing data preserved/);
  assert.equal((await client.query('SELECT canonical_name FROM public.places WHERE id=$1',[id])).rows[0].canonical_name,'Synthetic local POI edit');
  await client.query("UPDATE public.places SET canonical_name='Synthetic Demo Pharmacy' WHERE id=$1",[id]);
  // A late conflict must undo a point inserted earlier in the same guarded seed transaction.
  await client.query('DELETE FROM public.public_place_locations WHERE place_id=$1',[id]);
  const last='40000000-0000-4000-8000-000000000004';
  await client.query("UPDATE public.places SET canonical_name='Synthetic late seed conflict' WHERE id=$1",[last]);
  await assert.rejects(seedDatabase(client,url,{APP_ENV:'test',NODE_ENV:'test'}),/existing data preserved/);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.public_place_locations WHERE place_id=$1',[id])).rows[0].n,0);
  await client.query("UPDATE public.places SET canonical_name='Synthetic Demo Hardware' WHERE id=$1",[last]);
  await seedDatabase(client,url,{APP_ENV:'test',NODE_ENV:'test'});
  const {UniversityRepository}=await import('../../apps/api/dist/universities/university.repository.js');
  const {PlaceService}=await import('../../apps/api/dist/places/place.service.js');
  const previous={...process.env};let repository;
  try{
    process.env.APP_ENV='production';process.env.DATABASE_URL=url;repository=new UniversityRepository();const service=new PlaceService(repository);
    await assert.rejects(service.detail(id),error=>error.getStatus()===404);
    assert.deepEqual((await service.list({bbox})).items,[]);assert.deepEqual((await service.categories(bbox)).items,[]);
    await client.query("UPDATE public.places SET data_kind='VERIFIED',verified_at='2026-01-01T00:00:00Z' WHERE id=$1",[id]);
    assert.equal((await service.list({bbox})).items.length,1);
    await client.query("UPDATE public.public_place_locations SET last_confirmed_at='2026-11-01T00:00:00Z' WHERE place_id=$1",[id]);
    const verified=await service.detail(id);assert.equal(verified.id,id);assert.equal(verified.provenance.dataKind,'VERIFIED');assert.ok(verified.provenance.verifiedAt.startsWith('2026-01-01'));assert.ok(verified.lastConfirmedAt.startsWith('2026-11-01'));
  }finally{await repository?.onModuleDestroy();process.env=previous;await client.query('UPDATE public.public_place_locations SET last_confirmed_at=NULL WHERE place_id=$1',[id]);await client.query("UPDATE public.places SET data_kind='SYNTHETIC',verified_at=NULL WHERE id=$1",[id]);}
  console.log('PASS: real public POI API bbox/category/text/sort/pagination/empty/errors/read-only; unlisted/archived excluded; deployed synthetic filtering; repeatable/conflict-safe seeds');
}
