import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient,runMigrations } from './database.mjs';
// Called only by the harness after proving ownership, loopback and tmpfs storage.
export async function testBoardingFoundation({client,url,migrations,get}){
 const tables=['public.listing_media','unihood_private.media_assets','public.listings','public.boarding_units','unihood_private.boarding_locations','unihood_private.boarding_building_links','public.boarding_properties'];
 for(const table of tables)assert.equal((await client.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,0);
 const ids=[randomUUID(),randomUUID()],building=randomUUID(),unit=randomUUID(),listings=[randomUUID(),randomUUID()],asset=randomUUID();
 const reject=async(sql,args=[],code='23514')=>assert.rejects(client.query(sql,args),error=>error.code===code);
 const history=async()=>(await client.query("SELECT count(*)::int AS n FROM unihood_migrations.schema_migrations WHERE migration_id='007_boarding_property_foundation'")).rows[0].n;
 try{
  await client.query("INSERT INTO public.buildings(id,public_geo,data_kind,source_label) VALUES($1,ST_SetSRID(ST_Point(0,0),4326),'SYNTHETIC','Synthetic shared building; not real geography')",[building]);
  for(const id of ids)await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,data_kind,source_label,status) VALUES($1,'BOARDING','Synthetic Independent Boarding','synthetic independent boarding','SYNTHETIC','Synthetic isolated schema test; no real residence','ACTIVE')",[id]);
  await reject("INSERT INTO public.boarding_properties(place_id,data_kind) VALUES($1,'VERIFIED')",[ids[0]],'23503');
  for(const id of ids){await client.query("INSERT INTO public.boarding_properties(place_id,data_kind) VALUES($1,'SYNTHETIC')",[id]);await client.query('INSERT INTO unihood_private.boarding_building_links VALUES($1,$2)',[id,building]);}
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_building_links WHERE building_id=$1',[building])).rows[0].n,2);
  const defaults=(await client.query('SELECT visibility,authorization_status,public_map_consent,general_locality FROM public.boarding_properties WHERE place_id=$1',[ids[0]])).rows[0];assert.deepEqual(defaults,{visibility:'HIDDEN',authorization_status:'UNVERIFIED',public_map_consent:false,general_locality:null});
  await reject("UPDATE public.boarding_properties SET general_locality='Synthetic private label' WHERE place_id=$1",[ids[0]]);
  await reject("UPDATE public.boarding_properties SET visibility='AREA_ONLY' WHERE place_id=$1",[ids[0]]);
  await client.query("UPDATE public.boarding_properties SET visibility='AREA_ONLY',general_locality='Synthetic owner-approved broad area',locality_consent=true WHERE place_id=$1",[ids[0]]);
  await reject("UPDATE public.boarding_properties SET visibility='PUBLIC_MAP' WHERE place_id=$1",[ids[0]]);
  await client.query("UPDATE public.boarding_properties SET visibility='PUBLIC_MAP',authorization_status='LOCAL_TEST_AUTHORIZED',public_map_consent=true,map_consent_at=CURRENT_TIMESTAMP WHERE place_id=$1",[ids[0]]);
  await client.query("INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,retention_policy) VALUES($1,ST_SetSRID(ST_Point(0,0),4326),'synthetic-test-only')",[ids[0]]);
  await reject('UPDATE unihood_private.boarding_locations SET exact_geo=ST_SetSRID(ST_Point(181,0),4326) WHERE boarding_id=$1',[ids[0]]);
  await reject("UPDATE unihood_private.boarding_locations SET retention_policy='' WHERE boarding_id=$1",[ids[0]]);
  await reject('UPDATE unihood_private.boarding_locations SET exact_geo=NULL WHERE boarding_id=$1',[ids[0]]);
  await reject("INSERT INTO public.public_place_locations(place_id,place_kind,source,entrance_geo) VALUES($1,'BOARDING','Synthetic rejected boarding point',ST_SetSRID(ST_Point(0,0),4326))",[ids[0]]);
  await reject("UPDATE public.places SET kind='POI',category='pharmacy' WHERE id=$1",[ids[0]],'23503');
  for(const id of ids)assert.equal((await get('/api/v1/places/'+id)).status,404);
  await client.query('CREATE ROLE unihood_synthetic_public_reader NOLOGIN');
  try{await client.query('SET ROLE unihood_synthetic_public_reader');await reject('SELECT * FROM unihood_private.boarding_locations',[],'42501');await reject('SELECT * FROM unihood_private.media_assets',[],'42501');}finally{await client.query('RESET ROLE');await client.query('DROP ROLE unihood_synthetic_public_reader');}
  await client.query("INSERT INTO public.boarding_units(id,boarding_id,label,room_type,capacity) VALUES($1,$2,'Synthetic unit','Synthetic shared',2)",[unit,ids[0]]);
  await reject('UPDATE public.boarding_units SET available_beds=3 WHERE id=$1',[unit]);await reject('UPDATE public.boarding_units SET capacity=-1 WHERE id=$1',[unit]);
  await client.query('UPDATE public.boarding_units SET available_beds=2 WHERE id=$1',[unit]);await reject('UPDATE public.boarding_units SET capacity=1 WHERE id=$1',[unit]);
  const listingSql="INSERT INTO public.listings(id,boarding_id,revision,publisher_kind,publication_status,title,is_current,published_at) VALUES($1,$2,$3,'COMMUNITY_RECOMMENDATION','PUBLISHED','Synthetic schema advertisement',true,CURRENT_TIMESTAMP)";
  await client.query(listingSql,[listings[0],ids[0],1]);await reject(listingSql,[listings[1],ids[0],2],'23505');
  await reject("UPDATE public.listings SET visibility_snapshot='PUBLIC_MAP' WHERE id=$1",[listings[0]]);
  await client.query("UPDATE public.listings SET is_current=false,publication_status='ARCHIVED' WHERE id=$1",[listings[0]]);await client.query(listingSql,[listings[1],ids[0],2]);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.listings WHERE boarding_id=$1 AND is_current',[ids[0]])).rows[0].n,1);
  await client.query("INSERT INTO unihood_private.media_assets(id,object_key,mime,bytes,checksum) VALUES($1,'synthetic/quarantined-fixture','image/jpeg',100,$2)",[asset,'a'.repeat(64)]);
  await reject("UPDATE unihood_private.media_assets SET moderation_status='APPROVED' WHERE id=$1",[asset]);await reject("UPDATE unihood_private.media_assets SET mime='image/svg+xml' WHERE id=$1",[asset]);
  for(const assignment of ["bytes=0","checksum='invalid'","width=10"])await reject(`UPDATE unihood_private.media_assets SET ${assignment} WHERE id=$1`,[asset]);
  await client.query('INSERT INTO public.listing_media VALUES($1,$2,0)',[listings[1],asset]);
  await reject('DELETE FROM public.boarding_properties WHERE place_id=$1',[ids[0]],'23503');
  await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);assert.equal(await history(),1);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_locations')).rows[0].n,1);
  console.log('PASS: boarding canonical/property/shared-building/unit/listing/media relationships and revision uniqueness; synthetic-only map metadata, hidden/locality/consent guards, private schema ACL, public POI exclusion, capacity/media constraints and populated rollback retention');
 }finally{
  // All new tables were proven empty in this uniquely owned disposable database.
  for(const table of tables)await client.query(`DELETE FROM ${table}`);
 }
 const writer=createClient(url);await writer.connect();let pending;
 try{
  await writer.query('BEGIN');await writer.query("INSERT INTO public.boarding_properties(place_id,data_kind) VALUES($1,'SYNTHETIC')",[ids[0]]);
  const pid=(await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  pending=runMigrations(client,migrations,'rollback').then(()=>null,error=>error);
  let blocked=false;for(let i=0;i<40;i++){if((await writer.query('SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND NOT granted) AS waiting',[pid])).rows[0].waiting){blocked=true;break;}await delay(25);}assert.ok(blocked);
  await writer.query('COMMIT');assert.match((await pending).message,/populated tables/);assert.equal(await history(),1);
 }finally{await writer.query('ROLLBACK');await writer.end();if(pending)await pending;await client.query('DELETE FROM public.boarding_properties');}
 await client.query('CREATE VIEW public.synthetic_boarding_dependency AS SELECT boarding_id FROM unihood_private.boarding_locations');
 await assert.rejects(runMigrations(client,migrations,'rollback'),error=>error.code==='2BP01');assert.equal(await history(),1);
 await client.query('DROP VIEW public.synthetic_boarding_dependency');
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['007_boarding_property_foundation']);
 await client.query("CREATE TABLE public.boarding_units (label text); INSERT INTO public.boarding_units VALUES('Synthetic pre-existing object')");
 await assert.rejects(runMigrations(client,migrations,'migrate'),error=>error.code==='42P07');assert.equal(await history(),0);
 assert.equal((await client.query('SELECT label FROM public.boarding_units')).rows[0].label,'Synthetic pre-existing object');
 assert.equal((await client.query("SELECT to_regnamespace('unihood_private') AS name")).rows[0].name,null);
 await client.query('DROP TABLE public.boarding_units RESTRICT');
 await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[ids]);await client.query('DELETE FROM public.buildings WHERE id=$1',[building]);
 console.log('PASS: boarding migration preserves a concurrent writer and external/pre-existing objects atomically; empty down/up/repeat keeps old canonical POIs and extension ownership unchanged');
}
