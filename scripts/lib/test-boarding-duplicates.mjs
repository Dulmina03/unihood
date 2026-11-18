import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { runMigrations } from './database.mjs';
export async function testBoardingDuplicates({client,url,migrations,get}){
 const a='71000000-0000-4000-8000-000000000141',b='71000000-0000-4000-8000-000000000142',listings=['72000000-0000-4000-8000-000000000141','72000000-0000-4000-8000-000000000142'],building=randomUUID();
 assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_recommendation_intake')).rows[0].n,0);
 const children=[];
 async function start(actor){const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));const child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{...process.env,DATABASE_URL:url,API_HOST:'127.0.0.1',API_PORT:String(port),APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:actor}});children.push(child);const base=`http://127.0.0.1:${port}`;for(let i=0;i<40;i++){try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(1000)})).ok)return base;}catch{}if(i===39||child.exitCode!==null)throw new Error('Boarding duplicate API startup failed');await delay(250);}}
 const draft={title:'Synthetic Quiet Nook Annex',description:'Fictional independent operator context, not real accommodation.',locality:null,facilities:['Study space'],privacyAcknowledged:true,mediaGuidanceAcknowledged:true};
 const post=(base,suffix,body)=>fetch(base+'/api/v1/contributions/boarding/'+suffix,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const check=(base,title=draft.title,locality=null)=>post(base,'duplicates',{title,locality});
 try{
  await client.query("INSERT INTO public.buildings(id,public_geo,data_kind,source_label) VALUES($1,ST_SetSRID(ST_Point(43.654321,42.123456),4326),'SYNTHETIC','UNI-041 fictional shared building; not real geography')",[building]);
  for(const [i,id] of [a,b].entries()){
   const visibility=i?'AREA_ONLY':'HIDDEN',locality=i?'Synthetic North Quarter':null,title=i?'Synthetic Quiet Nook Annex East':'Synthetic Quiet Nook Annex';
   await client.query("INSERT INTO public.places(id,kind,canonical_name,normalized_name,data_kind,source_label,status) VALUES($1,'BOARDING','Synthetic PRIVATE_CANONICAL_NAME_CANARY','synthetic private canonical name canary','SYNTHETIC','UNI-041 synthetic matcher fixture; no real ownership','ACTIVE')",[id]);
   await client.query("INSERT INTO public.boarding_properties(place_id,data_kind,visibility,general_locality,locality_consent,authorization_status) VALUES($1,'SYNTHETIC',$2,$3,$4,'LOCAL_TEST_AUTHORIZED')",[id,visibility,locality,Boolean(i)]);
   await client.query('INSERT INTO unihood_private.boarding_building_links VALUES($1,$2)',[id,building]);
   await client.query("INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,address_enc,retention_policy) VALUES($1,ST_SetSRID(ST_Point(43.654321,42.123456),4326),decode('53594e544845544943','hex'),'synthetic-test-only')",[id]);
   await client.query("INSERT INTO public.listings(id,boarding_id,revision,publisher_kind,publication_status,title,description,visibility_snapshot,is_current,published_at) VALUES($1,$2,1,'OWNER_OFFICIAL','PUBLISHED','PRIVATE_LISTING_TITLE_CANARY','PRIVATE_DESCRIPTION_CANARY',$3,true,CURRENT_TIMESTAMP)",[listings[i],id,visibility]);
   await client.query('INSERT INTO public.boarding_advertisement_previews(listing_id,boarding_id,title,summary,visibility,locality,updated_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)',[listings[i],id,title,'Curated fictional public summary only.',visibility,locality]);
  }
  const contributor=await start('contributor'),other=await start('owner-a');
  const initial=await check(contributor,'Synthetic Ｑuiet--Nook Annex');assert.equal(initial.status,200);assert.equal(initial.headers.get('cache-control'),'no-store');const matches=await initial.json();assert.equal(matches.candidates[0].boardingId,a);assert.equal(matches.candidates[0].nameScore,100);assert.equal(matches.candidates.length,2);assert.ok(!/PRIVATE_|42\.123456|43\.654321|entrance|distance|buildingId|fingerprint|actor_ref/.test(JSON.stringify(matches)));
  const coarse=await(await check(contributor,draft.title,'Synthetic Garden District')).json();assert.deepEqual(coarse.candidates.map(row=>row.boardingId),[a]);
  const before=(await client.query('SELECT place_id,visibility,inventory_revision,public_map_consent FROM public.boarding_properties WHERE place_id=ANY($1::uuid[]) ORDER BY place_id',[[a,b]])).rows;
  const key=randomUUID(),input={key,draft,resolution:{kind:'EXISTING',boardingId:a}};
  const raced=await Promise.all([post(contributor,'resolve',input),post(contributor,'resolve',input)]);assert.ok(raced.every(row=>row.status===200));const receipts=await Promise.all(raced.map(row=>row.json()));assert.deepEqual(receipts[0],receipts[1]);assert.equal(receipts[0].canonicalBoardingId,a);assert.equal(receipts[0].published,false);assert.equal(receipts[0].resolution,'ATTACHED_FOR_REVIEW');
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_recommendation_resolutions')).rows[0].n,1);
  assert.equal((await post(contributor,'resolve',{...input,resolution:{kind:'EXISTING',boardingId:b}})).status,409);
  const otherResponse=await post(other,'resolve',input);assert.equal(otherResponse.status,200);const otherReceipt=await otherResponse.json();assert.notEqual(otherReceipt.contributionId,receipts[0].contributionId);assert.equal(otherReceipt.canonicalBoardingId,a);
  const unrelated={key:randomUUID(),draft:{...draft,title:'Synthetic Different Garden Studio'},resolution:{kind:'EXISTING',boardingId:a}};assert.equal((await post(contributor,'resolve',unrelated)).status,409);
  const nonexistent={...input,key:randomUUID(),resolution:{kind:'EXISTING',boardingId:randomUUID()}};assert.equal((await post(contributor,'resolve',nonexistent)).status,409);
  const distinct=(title)=>({key:randomUUID(),draft:{...draft,title},resolution:{kind:'DISTINCT',reason:'Separate fictional operator; no private address or ownership claim.'}});
  const pending1=await post(contributor,'resolve',distinct('Synthetic Maple Student Lodge'));assert.equal(pending1.status,200);const p1=await pending1.json();
  const pending2=await post(other,'resolve',distinct('Synthetic Maple Student Lodg'));assert.equal(pending2.status,200);const p2=await pending2.json();assert.equal(p1.resolution,'REVIEW_REQUIRED');assert.equal(p2.resolution,'REVIEW_REQUIRED');assert.equal(p2.canonicalBoardingId,null);assert.ok(!JSON.stringify(p2).includes(p1.contributionId));
  const relation=(await client.query('SELECT possible_related_intake_id FROM unihood_private.boarding_recommendation_resolutions WHERE contribution_id=$1',[p2.contributionId])).rows[0];assert.equal(relation.possible_related_intake_id,p1.contributionId);
  assert.deepEqual((await client.query('SELECT place_id,visibility,inventory_revision,public_map_consent FROM public.boarding_properties WHERE place_id=ANY($1::uuid[]) ORDER BY place_id',[[a,b]])).rows,before);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_building_links WHERE building_id=$1',[building])).rows[0].n,2);
  assert.equal((await fetch(contributor+`/api/v1/boardings/${a}/prices`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(other+`/api/v1/owner/boardings/${a}/privacy/contact`)).status,403);
  await client.query("UPDATE public.listings SET publication_status='DISPUTED',is_current=false WHERE id=$1",[listings[0]]);const stale=await post(contributor,'resolve',input);assert.equal(stale.status,200);const suppressed=await stale.json();assert.equal(suppressed.canonicalBoardingId,null);assert.equal(suppressed.resolution,'REVIEW_REQUIRED');
  await client.query("UPDATE public.listings SET publication_status='PUBLISHED',is_current=true WHERE id=$1",[listings[0]]);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_recommendation_intake')).rows[0].n,4);
  await client.query("CREATE FUNCTION public.synthetic_resolution_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$; CREATE TRIGGER synthetic_resolution_failure BEFORE INSERT ON unihood_private.boarding_recommendation_resolutions FOR EACH ROW EXECUTE FUNCTION public.synthetic_resolution_failure()");
  assert.equal((await post(contributor,'resolve',{...input,key:randomUUID(),resolution:{kind:'EXISTING',boardingId:b}})).status,503);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_recommendation_intake')).rows[0].n,4);
  await client.query('DROP TRIGGER synthetic_resolution_failure ON unihood_private.boarding_recommendation_resolutions; DROP FUNCTION public.synthetic_resolution_failure()');

  assert.equal((await get('/api/v1/boardings/map')).status,200);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);await assert.rejects(runMigrations(client,migrations,'rollback'),/populated tables/);await runMigrations(client,migrations,'migrate');
  console.log('PASS: UNI-041 real curated nonspatial Unicode/typo candidates, hidden-locality exclusion, same-building distinct identities, canonical held associations, cross-actor/replay/race isolation, private pending grouping and current-eligibility suppression without owner authority or public mutation');
 }finally{
  await Promise.all(children.map(async child=>{if(child.exitCode!==null)return;child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}));
  await client.query('DELETE FROM unihood_private.boarding_recommendation_resolutions');await client.query('DELETE FROM unihood_private.boarding_recommendation_intake');
  await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM public.listings WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM unihood_private.boarding_building_links WHERE boarding_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM public.boarding_properties WHERE place_id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM public.places WHERE id=ANY($1::uuid[])',[[a,b]]);await client.query('DELETE FROM public.buildings WHERE id=$1',[building]);
 }
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);
 assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);
 await client.query('CREATE VIEW public.synthetic_resolution_dependency AS SELECT contribution_id FROM unihood_private.boarding_recommendation_resolutions');await assert.rejects(runMigrations(client,migrations,'rollback'),error=>error.code==='2BP01');await client.query('DROP VIEW public.synthetic_resolution_dependency');assert.deepEqual(await runMigrations(client,migrations,'rollback'),['014_boarding_recommendation_resolutions']);await runMigrations(client,migrations,'migrate');assert.deepEqual(await runMigrations(client,migrations,'migrate'),[]);
 console.log('PASS: UNI-041 populated/dependency rollback guards, empty resolution down/up/repeat and canonical/private data and extension ownership preserved');
}
