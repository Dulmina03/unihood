import { testDuplicateApi } from './test-duplicate-api.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient, runMigrations } from './database.mjs';
// Owning harness proves unique tmpfs DB, loopback and no persistent mounts first.
export async function testPoiMatching({client,migrations,url}) {
 const {normalizePoiName}=await import('../../packages/contracts/dist/index.js');
 const {PoiMatcherService}=await import('../../apps/api/dist/duplicates/poi-matcher.service.js');
 const graph=JSON.parse(await readFile(new URL('../../infra/db/fixtures/poi-matching.synthetic.json',import.meta.url),'utf8'));
 const building='53000000-0000-4000-8000-000000000001',boarding='50000000-0000-4000-8000-000000000099';
 const ids=[...graph.places.map(p=>p.id),boarding];
 const byKey=Object.fromEntries(graph.places.map(p=>[p.key,p]));
 const query=async(sql,values)=>(await client.query(sql,values)).rows;
 const service=new PoiMatcherService({includeSynthetic:true,query});
 const draft={kind:'POI',name:'Synthetic Lotus Pharmacy',category:'pharmacy',location:{lat:0,lng:0},limit:20};
 const match=patch=>service.match({...draft,...patch});
 const snapshot=async()=>JSON.stringify((await client.query('SELECT id,kind,canonical_name,normalized_name,status,merged_into,updated_at FROM public.places ORDER BY id')).rows);
 const find=(result,key)=>result.candidates.find(c=>c.id===byKey[key].id);
 try {
  await client.query("INSERT INTO public.buildings(id,public_geo,address_label,data_kind,source_label) VALUES ($1,ST_SetSRID(ST_Point(0,0),4326),'Synthetic shared public building','SYNTHETIC','Synthetic matching fixture')",[building]);
  for(const p of graph.places){
   await client.query(`INSERT INTO public.places(id,kind,canonical_name,normalized_name,building_id,category,status,merged_into,data_kind,source_label)
    VALUES($1,'POI',$2,$3,$4,$5,$6,$7,'SYNTHETIC','UNI-023 fictional matching fixture; no real business or geography')`,
   [p.id,p.name,p.key==='legacy'?p.name.toLowerCase():normalizePoiName(p.name),p.building?building:null,p.category,p.status??'ACTIVE',p.status==='MERGED'?byKey.pharmacy.id:null]);
   if(!p.status&&!p.unlisted)await client.query("INSERT INTO public.public_place_locations(place_id,entrance_geo,source) VALUES($1,ST_SetSRID(ST_Point($2,$3),4326),'Synthetic matching fixture, not a real location')",[p.id,p.lng,p.lat]);
   if(p.alias)await client.query('INSERT INTO public.place_aliases(id,place_id,alias,normalized_alias) VALUES($1,$2,$3,$4)',['51000000-0000-4000-8000-000000000005',p.id,p.alias,normalizePoiName(p.alias)]);
   if(p.source)await client.query("INSERT INTO public.place_source_refs(id,place_id,provider,external_id,license_tag) VALUES($1,$2,'synthetic-matcher',$3,'Original synthetic fixtures; no provider import')",[p.id,p.id,p.source]);
  }
  await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,status,data_kind,source_label) VALUES($1,'BOARDING','Synthetic private boarding canary','synthetic private boarding canary','ACTIVE','SYNTHETIC','Synthetic private exclusion fixture')",[boarding]);
  await client.query("INSERT INTO public.place_source_refs(id,place_id,provider,external_id,license_tag) VALUES($1,$1,'synthetic-matcher','private-boarding-id','Synthetic exclusion fixture')",[boarding]);
  await client.query("INSERT INTO public.place_source_refs(id,place_id,provider,external_id,license_tag) VALUES('57000000-0000-4000-8000-000000000001',$1,' synthetic identity ',' ００１ ','Synthetic opaque identifier fixture')",[byKey.legacy.id]);
  const before=await snapshot();
  await testDuplicateApi(url);
  assert.equal(await snapshot(),before);
  // Actual read-only SQL transaction, not just mocked assertions about SELECT.
  await client.query('BEGIN READ ONLY');
  try {
   const drift=(await client.query("SELECT ST_X(p::geometry) AS lng,ST_Y(p::geometry) AS lat FROM (SELECT ST_Project(ST_SetSRID(ST_Point(0,0),4326)::geography,12,pi()/2) AS p) x")).rows[0];
   const typo=await match({name:'Synthetic Lotus Pharmcy',location:drift});assert.ok(find(typo,'pharmacy'));assert.equal(find(typo,'pharmacy').signals.withinRadius,true);assert.equal(find(typo,'other_town'),undefined);
   const shared=await match({buildingId:building});assert.equal(find(shared,'pharmacy').classification,'REVIEW_REQUIRED');assert.equal(find(shared,'adjacent').classification,'REVIEW_REQUIRED');assert.equal(find(shared,'restaurant').classification,'REVIEW_REQUIRED');
   assert.equal(find(shared,'restaurant').signals.categoryMatch,false);
   for(const key of ['archived','pending','merged','unlisted'])assert.equal(find(shared,key),undefined);
   assert.ok(!JSON.stringify(shared).match(/boarding|private|lat|lng|address|contact/i));
   const imported=await match({category:'hardware',source:{provider:'synthetic-matcher',externalId:'stable-import-id'}});assert.equal(find(imported,'source_drift').signals.sourceMatch,true);assert.equal(find(imported,'source_drift').signals.withinRadius,false);
   const opaque=await match({category:'clinic',location:{lat:-30,lng:-30},source:{provider:' synthetic identity ',externalId:' ００１ '}});assert.equal(find(opaque,'legacy').signals.sourceMatch,true);
   assert.deepEqual((await match({location:{lat:-30,lng:-30},source:{provider:'synthetic identity',externalId:'001'}})).candidates,[]);
   const conflict=await match({category:'clinic',source:{provider:'synthetic-matcher',externalId:'lotus'}});assert.equal(find(conflict,'pharmacy').classification,'REVIEW_REQUIRED');
   assert.equal(find(await match({name:byKey.multilingual.alias,category:'clinic'}),'multilingual').signals.normalizedNameExact,true);
   assert.equal(find(await match({name:'Synthetic SUN Clinic',category:'clinic'}),'legacy').signals.normalizedNameExact,true);
   assert.ok(find(await match({name:'Synthetic Dateline Clinic',category:'clinic',location:{lat:0,lng:-179.9999}}),'dateline'));
   assert.ok(find(await match({name:'Synthetic Polar Clinic',category:'clinic',location:{lat:89.9999,lng:0}}),'polar'));
   const peer=createClient(url);await peer.connect();
   try{await peer.query('BEGIN READ ONLY');const second=new PoiMatcherService({includeSynthetic:true,query:async(sql,values)=>(await peer.query(sql,values)).rows});
    const repeated=await Promise.all([match({}),second.match(draft)]);assert.deepEqual(repeated[0],repeated[1]);assert.equal(repeated[0].requiresReview,true);
   }finally{await peer.query('ROLLBACK');await peer.end();}
   assert.deepEqual((await match({location:{lat:-30,lng:-30}})).candidates,[]);
   assert.deepEqual((await match({location:{lat:-30,lng:-30},source:{provider:'synthetic-matcher',externalId:'private-boarding-id'}})).candidates,[]);
   await client.query("SET LOCAL pg_trgm.similarity_threshold=0.99");const high=await match({name:'Synthetic Lotus Pharmcy'});
   await client.query("SET LOCAL pg_trgm.similarity_threshold=0.01");assert.deepEqual(await match({name:'Synthetic Lotus Pharmcy'}),high);
   await client.query('SET LOCAL enable_seqscan=off');
   const plan=JSON.stringify((await client.query("EXPLAIN (FORMAT JSON) SELECT place_id FROM public.public_place_locations WHERE ST_DWithin(entrance_geo::geography,ST_SetSRID(ST_Point(0,0),4326)::geography,50)")).rows);
   assert.ok(plan.includes('public_place_locations_geography_idx'));
  } finally {await client.query('ROLLBACK');}
  assert.equal(await snapshot(),before);
  // Metre boundary generated by PostGIS, never fabricated real campus coordinates.
  for(const [index,distance] of [49,51].entries()){
   const id=`54000000-0000-4000-8000-00000000000${index+1}`;ids.push(id);
   await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,category,status,data_kind,source_label) VALUES($1,'POI','Synthetic Radius Clinic','synthetic radius clinic','clinic','ACTIVE','SYNTHETIC','Synthetic distance-boundary fixture')",[id]);
   await client.query("INSERT INTO public.public_place_locations(place_id,entrance_geo,source) VALUES($1,ST_Project(ST_SetSRID(ST_Point(0,0),4326)::geography,$2::double precision,0::double precision)::geometry,'Synthetic projected fixture')",[id,distance]);
  }
  const radius=await match({name:'Synthetic Radius Clinic',category:'clinic'});assert.ok(radius.candidates.some(c=>c.id===ids.at(-2)));assert.ok(!radius.candidates.some(c=>c.id===ids.at(-1)));
  // An existing merged record may be restored by a separate reviewed process;
  // the matcher neither performs the restore nor mutates a canonical identity.
  await client.query("UPDATE public.places SET status='ACTIVE',merged_into=NULL WHERE id=$1",[byKey.merged.id]);
  await client.query("INSERT INTO public.public_place_locations(place_id,entrance_geo,source) VALUES($1,ST_SetSRID(ST_Point(0,0),4326),'Synthetic restoration fixture')",[byKey.merged.id]);
  assert.ok(find(await match({}),'merged'));
  const production=new PoiMatcherService({includeSynthetic:false,query});assert.deepEqual((await production.match(draft)).candidates,[]);
  await client.query("INSERT INTO public.place_aliases(id,place_id,alias,normalized_alias) SELECT ('56000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,'Synthetic extra alias '||n,'synthetic extra alias '||n FROM generate_series(1,21) n",[byKey.pharmacy.id]);
  assert.equal((await match({})).incomplete,true);
  await client.query('DELETE FROM public.place_aliases WHERE place_id=$1',[byKey.pharmacy.id]);
  const dense=(await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,category,status,data_kind,source_label) SELECT ('55000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'POI','Synthetic Dense Pharmacy '||n,'synthetic dense pharmacy '||n,'pharmacy','ACTIVE','SYNTHETIC','Synthetic dense truncation fixture' FROM generate_series(1,202) n RETURNING id")).rows.map(r=>r.id);ids.push(...dense);
  await client.query("INSERT INTO public.public_place_locations(place_id,entrance_geo,source) SELECT id,ST_SetSRID(ST_Point(0,0),4326),'Synthetic dense point' FROM public.places WHERE id=ANY($1::uuid[])",[dense]);
  const capped=await match({});assert.equal(capped.incomplete,true);assert.ok(capped.candidates.length<=20);assert.equal(capped.requiresReview,true);
  await client.query('UPDATE public.buildings SET public_geo=NULL WHERE id=$1',[building]);
  const hiddenBuilding=await match({buildingId:building,location:{lat:-30,lng:-30}});assert.deepEqual(hiddenBuilding.candidates,[]);
  await client.query('UPDATE public.buildings SET public_geo=ST_SetSRID(ST_Point(0,0),4326) WHERE id=$1',[building]);
  await client.query("UPDATE public.places SET data_kind='VERIFIED',verified_at='2026-01-01T00:00:00Z' WHERE id=$1",[byKey.pharmacy.id]);
  const verified=await production.match({...draft,source:{provider:'synthetic-matcher',externalId:'lotus'}});assert.equal(verified.candidates.length,1);assert.equal(verified.candidates[0].id,byKey.pharmacy.id);
  await client.query("UPDATE public.places SET data_kind='SYNTHETIC',verified_at=NULL WHERE id=$1",[byKey.pharmacy.id]);
  const fullBefore=await snapshot(),extensions=(await client.query('SELECT extname,extversion FROM pg_extension ORDER BY extname')).rows;
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['004_public_poi_geography_index']);assert.equal(await snapshot(),fullBefore);
  assert.deepEqual(await runMigrations(client,migrations,'migrate'),['004_public_poi_geography_index']);assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
  assert.deepEqual((await client.query('SELECT extname,extversion FROM pg_extension ORDER BY extname')).rows,extensions);
  await runMigrations(client,migrations,'rollback');
  await client.query('CREATE INDEX public_place_locations_geography_idx ON public.places(canonical_name)');
  const unrelated=(await client.query("SELECT indexdef FROM pg_indexes WHERE indexname='public_place_locations_geography_idx'")).rows;
  await assert.rejects(runMigrations(client,migrations,'migrate'),error=>error.code==='42P07');
  assert.deepEqual((await client.query("SELECT indexdef FROM pg_indexes WHERE indexname='public_place_locations_geography_idx'")).rows,unrelated);
  await client.query('DROP INDEX public.public_place_locations_geography_idx RESTRICT');
  await runMigrations(client,migrations,'migrate');
  assert.equal(await snapshot(),fullBefore);
  console.log('PASS: real read-only POI matching; typo/12m drift, multilingual aliases/legacy names, separate towns/shared businesses, source geometry drift, nonpublic/boarding exclusion, dateline/pole/metre boundary, deterministic ranking, no mutations; geography index rollback/re-migrate preserves populated data/extensions');
 } finally {
  await client.query('ROLLBACK');
  await client.query('DELETE FROM public.place_aliases WHERE place_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.place_source_refs WHERE place_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.public_place_locations WHERE place_id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[ids]);
  await client.query('DELETE FROM public.buildings WHERE id=$1',[building]);
 }
}
