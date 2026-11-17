import { readFile } from 'node:fs/promises';
import { assertSeedEnvironment,loadMigrations,transaction,DatabaseToolError } from './database.mjs';
export async function seedBoardingAdvertisements(client,url,env,ownerDemo=false){
 assertSeedEnvironment(url,env);
 const fixtures=JSON.parse(await readFile(new URL('../../infra/db/seeds/boardings.synthetic.json',import.meta.url),'utf8'));
 if(ownerDemo)fixtures.splice(0,fixtures.length,{id:'00000000-0000-4000-8000-000000000001',listingId:'73000000-0000-4000-8000-000000000001',title:'Synthetic Owner Courtyard',summary:'A closed fictional owner fixture, not a real property or owner. No rooms or availability are offered.',publisherKind:'OWNER_OFFICIAL',visibility:'HIDDEN',locality:null});
 const migrations=await loadMigrations();
 return transaction(client,async()=>{
  const applied=(await client.query('SELECT migration_id,checksum FROM unihood_migrations.schema_migrations ORDER BY migration_id')).rows;
  if(applied.length!==migrations.length||applied.some((row,i)=>row.migration_id!==migrations[i].id||row.checksum!==migrations[i].checksum))throw new DatabaseToolError('Run db:migrate or inspect checksum/history drift before boarding demo seeds');
  // Compare every field we insert; ON CONFLICT never overwrites local data.
  const put=async(table,values)=>{
   const keys=Object.keys(values),params=Object.values(values);
   await client.query(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT DO NOTHING`,params);
   const actual=(await client.query(`SELECT ${keys.join(',')} FROM ${table} WHERE ${keys[0]}=$1`,[params[0]])).rows[0];
   if(!actual||keys.some(key=>JSON.stringify(actual[key])!==JSON.stringify(values[key])))throw new DatabaseToolError('Synthetic boarding seed conflict; existing data preserved');
  };
  for(const r of fixtures){
   if(!r.title.startsWith('Synthetic ')||!r.summary.includes('fictional'))throw new DatabaseToolError('Invalid curated synthetic boarding fixture');
   await put('public.places',{id:r.id,kind:'BOARDING',canonical_name:r.title,normalized_name:r.title.toLowerCase(),status:'ACTIVE',data_kind:'SYNTHETIC',source_label:ownerDemo?'UNI-034 closed synthetic owner fixture':'UNI-031 synthetic boarding demonstration',building_id:null,category:null,merged_into:null,verified_at:null});
   await put('public.boarding_properties',{place_id:r.id,data_kind:'SYNTHETIC',visibility:r.visibility,general_locality:r.locality,locality_consent:r.visibility==='AREA_ONLY',authorization_status:r.publisherKind==='OWNER_OFFICIAL'?'LOCAL_TEST_AUTHORIZED':'UNVERIFIED',public_map_consent:false,map_consent_at:null,description:''});
   await put('public.listings',{id:r.listingId,boarding_id:r.id,revision:1,publisher_kind:r.publisherKind,publication_status:'PUBLISHED',title:r.title,description:'',visibility_snapshot:r.visibility,is_current:true,published_at:new Date('2026-11-17T00:00:00Z')});
   await put('public.boarding_advertisement_previews',{listing_id:r.listingId,boarding_id:r.id,data_kind:'SYNTHETIC',title:r.title,summary:r.summary,visibility:r.visibility,locality:r.locality,updated_at:new Date('2026-11-17T00:00:00Z')});
  }
  return fixtures.length;
 });
}
