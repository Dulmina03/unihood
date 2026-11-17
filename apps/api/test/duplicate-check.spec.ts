import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PoiMatcherService } from '../src/duplicates/poi-matcher.service';
import { DuplicateRateGuard } from '../src/duplicates/duplicate.controller';
import { localDuplicateOrigin } from '../src/duplicates/local-cors';
import { SyntheticActors,syntheticConfig } from '../src/identity/synthetic-actors';
const enabled={APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'contributor'};
const input={kind:'POI',name:'Synthetic pharmacy',category:'pharmacy',location:{lat:0,lng:0}};
const result={policyVersion:'public-poi-v1',scope:'PUBLIC_POI_ONLY',candidates:[],hasMore:false,incomplete:false,requiresReview:true};
async function setup(env:NodeJS.ProcessEnv=enabled,match:()=>Promise<unknown>=async()=>result){
 const calls:unknown[]=[];
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(SyntheticActors).useFactory({factory:()=>new SyntheticActors(syntheticConfig(env))})
 .overrideProvider(PoiMatcherService).useValue({match:async(value:unknown)=>{calls.push(value);return match();}}).compile();
 const app=module.createNestApplication();configureApp(app);await app.init();return {app,calls};
}
describe('guarded public duplicate HTTP preflight',()=>{
 it('permits a configured contributor, no-store and no mutation',async()=>{const {app,calls}=await setup();try{
  const response=await request(app.getHttpServer()).post('/api/v1/duplicates/check').send(input).expect(200);
  expect(response.body).toEqual({...result,checkOnly:true});expect(response.headers['cache-control']).toBe('no-store');expect(calls).toEqual([input]);
  for(const body of [{...input,kind:'BOARDING'},{...input,source:{provider:'test',externalId:'PRIVATE_CANARY'}},{...input,location:{lat:100,lng:0}},{...input,privateAddress:'PRIVATE_CANARY'}]){
   const invalid=await request(app.getHttpServer()).post('/api/v1/duplicates/check').send(body).expect(400);expect(JSON.stringify(invalid.body)).not.toContain('PRIVATE_CANARY');
  }expect(calls).toHaveLength(1);
 }finally{await app.close();}});
 it.each(['staging','production','unknown',''])('fails closed in %s despite forged identity headers',async APP_ENV=>{const {app,calls}=await setup({...enabled,APP_ENV});try{
  await request(app.getHttpServer()).post('/api/v1/duplicates/check').set('X-Role','owner').set('X-User-Id','synthetic:contributor').send(input).expect(401);expect(calls).toHaveLength(0);
 }finally{await app.close();}});
 it('denies guests, disabled actors, cross-site and forwarded loopback requests',async()=>{
  for(const env of [{...enabled,ENABLE_SYNTHETIC_ACTORS:'false'},{...enabled,SYNTHETIC_ACTOR:'unknown'}]){const {app,calls}=await setup(env);try{await request(app.getHttpServer()).post('/api/v1/duplicates/check').send(input).expect(401);expect(calls).toHaveLength(0);}finally{await app.close();}}
  const {app,calls}=await setup();try{for(const [key,value] of [['Origin','https://evil.example'],['X-Forwarded-For','127.0.0.1'],['Sec-Fetch-Site','cross-site']])await request(app.getHttpServer()).post('/api/v1/duplicates/check').set(key,value).send(input).expect(401);expect(calls).toHaveLength(0);}finally{await app.close();}
 });
 it('sanitizes unavailable database and malformed matcher projections',async()=>{for(const match of [async()=>{throw new Error('PRIVATE_CANARY');},async()=>({...result,private:'PRIVATE_CANARY'})]){const {app}=await setup(enabled,match);try{const response=await request(app.getHttpServer()).post('/api/v1/duplicates/check').send(input).expect(503);expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');expect(JSON.stringify(response.body)).not.toContain('PRIVATE_CANARY');}finally{await app.close();}}});
 it('bounds a shared rate window without identity-key memory growth',()=>{const guard=new DuplicateRateGuard();for(let i=0;i<20;i++)expect(guard.canActivate()).toBe(true);expect(()=>guard.canActivate()).toThrow();});
 it('returns HTTP 429 after the shared twenty-check budget',async()=>{const {app,calls}=await setup();try{for(let i=0;i<20;i++)await request(app.getHttpServer()).post('/api/v1/duplicates/check').send(input).expect(200);const response=await request(app.getHttpServer()).post('/api/v1/duplicates/check').send(input).expect(429);expect(response.body.error.code).toBe('RATE_LIMITED');expect(calls).toHaveLength(20);}finally{await app.close();}});
 it('bounds concurrent expensive checks and releases capacity after completion',async()=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});const {app,calls}=await setup(enabled,async()=>{await gate;return result;});
  const pending=[1,2,3].map(()=>request(app.getHttpServer()).post('/api/v1/duplicates/check').send(input).then(response=>response));
  try{
   for(let i=0;i<100&&calls.length<3;i++)await new Promise(resolve=>setTimeout(resolve,10));
   expect(calls).toHaveLength(3);await request(app.getHttpServer()).post('/api/v1/duplicates/check').send(input).expect(429);
   release();for(const response of await Promise.all(pending))expect(response.status).toBe(200);
   await request(app.getHttpServer()).post('/api/v1/duplicates/check').send(input).expect(200);
  }finally{release();await Promise.all(pending);await app.close();}
 });
 it('allows browser CORS only for configured loopback development, never credentials or a deployed bypass',()=>{
  expect(localDuplicateOrigin('http://127.0.0.1:3000',enabled)).toBe(true);
  for(const origin of ['http://evil.example:3000','http://127.0.0.1:9999','null','http://127.0.0.1:3000/'])expect(localDuplicateOrigin(origin,enabled)).toBe(false);
  for(const APP_ENV of ['production','staging','unknown'])expect(localDuplicateOrigin('http://127.0.0.1:3000',{...enabled,APP_ENV})).toBe(false);
 });
});
