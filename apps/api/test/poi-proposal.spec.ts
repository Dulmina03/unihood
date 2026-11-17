import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PoiSubmissionService } from '../src/duplicates/poi-submission.service';
import { SyntheticActors,syntheticConfig } from '../src/identity/synthetic-actors';
import { poiReviewPolicy } from '../src/duplicates/poi-review-policy';
const enabled={APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'contributor'};
const input={key:'59000000-0000-4000-8000-000000000001',draft:{kind:'POI',name:'Synthetic Public Pharmacy',category:'pharmacy',location:{lat:0,lng:0}},resolution:{action:'continue_as_distinct_with_reason',reason:'A fictional distinct public business'},sourceNote:'Original synthetic observation',publicBusinessConfirmed:true};
async function setup(env:NodeJS.ProcessEnv=enabled){let calls=0;
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(SyntheticActors).useFactory({factory:()=>new SyntheticActors(syntheticConfig(env))})
 .overrideProvider(PoiSubmissionService).useValue({prepare:async()=>{calls++;return {outcome:'PENDING_REVIEW',proposalId:input.key,requiresReview:true,reviewState:'PENDING'};}}).compile();
 const app=module.createNestApplication();configureApp(app);await app.init();return {app,calls:()=>calls};
}
describe('protected synthetic public-place proposals',()=>{
 it('accepts an issued loopback contributor and rejects client authority/private fields',async()=>{const {app,calls}=await setup();try{
  const result=await request(app.getHttpServer()).post('/api/v1/places/proposals').send(input).expect(200);expect(result.headers['cache-control']).toBe('no-store');expect(result.body.reviewState).toBe('PENDING');
  for(const body of [{...input,publicBusinessConfirmed:false},{...input,reviewState:'PUBLISHED'},{...input,actorId:'synthetic:owner-a'},{...input,source:{provider:'PRIVATE_CANARY',externalId:'private'}}]){const response=await request(app.getHttpServer()).post('/api/v1/places/proposals').send(body).expect(400);expect(JSON.stringify(response.body)).not.toContain('PRIVATE_CANARY');}expect(calls()).toBe(1);
 }finally{await app.close();}});
 it.each(['staging','production','unknown',''])('fails closed in %s with flags and spoofed headers',async APP_ENV=>{const {app,calls}=await setup({...enabled,APP_ENV});try{await request(app.getHttpServer()).post('/api/v1/places/proposals').set('X-Role','owner').set('X-User-Id','synthetic:contributor').send(input).expect(401);expect(calls()).toBe(0);}finally{await app.close();}});
 it('denies disabled, forwarded and cross-site simulation before service access',async()=>{const {app,calls}=await setup();try{for(const [key,value] of [['Origin','https://evil.example'],['X-Forwarded-For','127.0.0.1']])await request(app.getHttpServer()).post('/api/v1/places/proposals').set(key,value).send(input).expect(401);expect(calls()).toBe(0);}finally{await app.close();}
 const disabled=await setup({...enabled,ENABLE_SYNTHETIC_ACTORS:'false'});try{await request(disabled.app.getHttpServer()).post('/api/v1/places/proposals').send(input).expect(401);}finally{await disabled.app.close();}});
 it('assigns conservative evidence holds without treating clean text as approval',()=>{
  expect(poiReviewPolicy('Original synthetic public observation')).toEqual({reviewState:'PENDING',flags:[]});
  expect(poiReviewPolicy('owner phone +00000000000 https://example.invalid')).toEqual({reviewState:'NEEDS_EVIDENCE',flags:['PRIVATE_TEXT','CONTACT_TEXT','EXTERNAL_REFERENCE']});
  expect(poiReviewPolicy('කෘත්‍රිම උදාහරණය').reviewState).toBe('PENDING'); // Still held; no multilingual safety certification.
 });
});
