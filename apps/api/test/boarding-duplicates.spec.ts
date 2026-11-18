import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { UniversityRepository } from '../src/universities/university.repository';
import { SyntheticActors,syntheticConfig } from '../src/identity/synthetic-actors';
const id='40000000-0000-4000-8000-000000000041';
const enabled={APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'contributor'};
const draft={title:'Synthetic Quiet Nook Annex',description:'Fictional permitted context, not a real property.',locality:null,facilities:[],privacyAcknowledged:true,mediaGuidanceAcknowledged:true};
async function setup(env:NodeJS.ProcessEnv=enabled,rows:Record<string,unknown>[]=[]){
 const calls:string[]=[];
 const query=async(sql:string)=>{calls.push(sql);return sql.includes('SELECT p.id,a.title')?rows:[];};
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(UniversityRepository).useValue({includeSynthetic:true,query,transaction:async(work:(q:typeof query)=>Promise<unknown>)=>work(query)}).overrideProvider(SyntheticActors).useFactory({factory:()=>new SyntheticActors(syntheticConfig(env))}).compile();const app=module.createNestApplication();configureApp(app);await app.init();return {app,calls};
}
describe('UNI-041 nonspatial boarding duplicate HTTP boundary',()=>{
 it('projects only curated public title/source/mode and approved locality, never other columns or private-name scoring',async()=>{
  const {app,calls}=await setup(enabled,[{id,title:draft.title,publisher_kind:'OWNER_OFFICIAL',visibility:'HIDDEN',locality:'PRIVATE_LOCALITY_CANARY',private_geo:'POINT(43.654321 42.123456)',canonical_name:'PRIVATE_TITLE_CANARY'}]);
  try{const r=await request(app.getHttpServer()).post('/api/v1/contributions/boarding/duplicates').send({title:'Synthetic Ｑuiet--Nook Annex',locality:null}).expect(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.body.candidates[0]).toMatchObject({boardingId:id,locality:null,nameScore:100});expect(JSON.stringify(r.body)).not.toMatch(/PRIVATE_|42\.123456|43\.654321|entrance|distance/);expect(calls.join(' ')).not.toMatch(/unihood_private|\bST_[A-Za-z]+\s*\(|canonical_name|boarding_locations|boarding_contacts/);}finally{await app.close();}
 });
 it('uses public broad-locality filtering without locating hidden advertisements',async()=>{
  const rows=[{id,title:draft.title,publisher_kind:'OWNER_OFFICIAL',visibility:'HIDDEN',locality:null},{id:'40000000-0000-4000-8000-000000000042',title:draft.title,publisher_kind:'OWNER_OFFICIAL',visibility:'AREA_ONLY',locality:'Synthetic Garden District'}];const {app}=await setup(enabled,rows);
  try{const r=await request(app.getHttpServer()).post('/api/v1/contributions/boarding/duplicates').send({title:draft.title,locality:'Synthetic North Quarter'}).expect(200);expect(r.body.candidates.map((v:{boardingId:string})=>v.boardingId)).toEqual([id]);}finally{await app.close();}
 });
 it.each(['staging','production','unknown'])('fails closed in %s on check and resolution despite actor headers',async APP_ENV=>{
  const {app,calls}=await setup({...enabled,APP_ENV});try{for(const suffix of ['duplicates','resolve'])await request(app.getHttpServer()).post('/api/v1/contributions/boarding/'+suffix).set('X-Role','owner').set('X-User-Id','synthetic:contributor').send({}).expect(401);expect(calls).toEqual([]);}finally{await app.close();}
 });
 it('rejects spatial/private evidence and forged ownership before any query',async()=>{
  const {app,calls}=await setup();try{for(const patch of [{lat:42},{phone:'PRIVATE_CANARY'},{imageHash:'PRIVATE_CANARY'},{sort:'distance'}]){const r=await request(app.getHttpServer()).post('/api/v1/contributions/boarding/duplicates').send({title:draft.title,locality:null,...patch}).expect(400);expect(JSON.stringify(r.body)).not.toContain('PRIVATE_CANARY');}await request(app.getHttpServer()).post('/api/v1/contributions/boarding/resolve').send({key:id,draft,resolution:{kind:'EXISTING',boardingId:id,publish:true}}).expect(400);expect(calls).toEqual([]);}finally{await app.close();}
 });
 it('attaches only a held suggestion without canonical/owner mutation',async()=>{
  const {app,calls}=await setup(enabled,[{id,title:draft.title,publisher_kind:'OWNER_OFFICIAL',visibility:'HIDDEN',locality:null}]);try{const r=await request(app.getHttpServer()).post('/api/v1/contributions/boarding/resolve').send({key:id,draft,resolution:{kind:'EXISTING',boardingId:id}}).expect(200);expect(r.body).toMatchObject({published:false,resolution:'ATTACHED_FOR_REVIEW',canonicalBoardingId:id,publisherKind:'COMMUNITY_RECOMMENDATION'});expect(calls.some(sql=>sql.includes('INSERT INTO unihood_private.boarding_recommendation_resolutions'))).toBe(true);expect(calls.filter(sql=>/^(INSERT|UPDATE|DELETE)/.test(sql)).every(sql=>sql.startsWith('INSERT INTO unihood_private.boarding_recommendation_')||sql.startsWith('INSERT INTO unihood_private.risk_evaluations'))).toBe(true);}finally{await app.close();}
 });
 it('rejects an unavailable candidate without probing private membership or returning internals',async()=>{
  const {app,calls}=await setup();try{const r=await request(app.getHttpServer()).post('/api/v1/contributions/boarding/resolve').send({key:id,draft,resolution:{kind:'EXISTING',boardingId:id}}).expect(409);expect(JSON.stringify(r.body)).not.toMatch(/unihood_private|payload_hash/);expect(calls.some(sql=>sql.includes('FOR SHARE'))).toBe(false);}finally{await app.close();}
 });
});
