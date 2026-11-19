import 'reflect-metadata';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AppModule} from '../src/app.module';
import {configureApp} from '../src/configure-app';
import {UniversityRepository} from '../src/universities/university.repository';
import {SyntheticActors,syntheticConfig} from '../src/identity/synthetic-actors';

const boardingId='00000000-0000-4000-8000-000000000001',requestId='46000000-0000-4000-8000-000000000001',key='46000000-0000-4000-8000-000000000002';
const body={requestKey:key,boardingId,kind:'CONTACT_OWNER',syntheticAcknowledged:true};
const row={id:requestId,requester_ref:'synthetic:contributor',boarding_id:boardingId,kind:'CONTACT_OWNER',status:'MOCK_PENDING',data_kind:'SYNTHETIC',payload_hash:'0'.repeat(64),created_at:'2026-11-19T00:00:00.000000Z'};
function setup(fixture:string,env:NodeJS.ProcessEnv){
 const query=async(sql:string)=>{
  if(sql.includes('pg_advisory_xact_lock')||sql.startsWith('INSERT'))return[];
  if(sql.includes('FROM public.boarding_advertisement_previews'))return [{visibility:'AREA_ONLY'}];
  if(sql.includes('WHERE id=$1 AND requester_ref=$2'))return [{...row}];
  if(sql.includes('WHERE id=$1'))return [{...row}];
  if(sql.includes('FROM unihood_private.boarding_requests'))return [];
  return[];
 };
 return Test.createTestingModule({imports:[AppModule]}).overrideProvider(UniversityRepository).useValue({includeSynthetic:true,query,transaction:async(work:(q:typeof query)=>Promise<unknown>)=>work(query)}).overrideProvider(SyntheticActors).useFactory({factory:()=>new SyntheticActors(syntheticConfig({...env,SYNTHETIC_ACTOR:fixture}))}).compile();
}
const local={APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',WEB_PORT:'3180'};
describe('UNI-046 mock request HTTP boundaries',()=>{
 it.each(['staging','production','unknown'])('denies %s writes despite spoofed actor headers',async APP_ENV=>{
  const app=(await setup('contributor',{...local,APP_ENV})).createNestApplication();configureApp(app);await app.init();
  try{await request(app.getHttpServer()).post('/api/v1/boarding-requests').set('X-User-Id','synthetic:contributor').set('Origin','http://127.0.0.1:3180').send(body).expect(401);}finally{await app.close();}
 });
 it('accepts only exact loopback contributor requests with a no-store, private-free receipt',async()=>{
  const saved={APP_ENV:process.env.APP_ENV,NODE_ENV:process.env.NODE_ENV,ENABLE_SYNTHETIC_ACTORS:process.env.ENABLE_SYNTHETIC_ACTORS,SYNTHETIC_ACTOR:process.env.SYNTHETIC_ACTOR};Object.assign(process.env,local);
  const app=(await setup('contributor',local)).createNestApplication();configureApp(app);await app.init();
  try{
   const response=await request(app.getHttpServer()).post('/api/v1/boarding-requests').set('Origin','http://127.0.0.1:3180').send(body).expect(200);
   expect(response.headers['cache-control']).toBe('no-store');
   const text=JSON.stringify(response.body);
   expect(text).not.toMatch(/synthetic:contributor|phone|email|coordinate|latitude|longitude/);
   expect(response.body).toMatchObject({requestId,boardingId,kind:'CONTACT_OWNER',status:'MOCK_PENDING',ownerNotified:false,locationDisclosed:false,synthetic:true,dataKind:'SYNTHETIC'});
   await request(app.getHttpServer()).post('/api/v1/boarding-requests').set('Origin','https://example.invalid').send(body).expect(401);
   await request(app.getHttpServer()).post('/api/v1/boarding-requests').send({...body,phone:'+12025550100'}).expect(400);
   await request(app.getHttpServer()).post('/api/v1/boarding-requests').send({...body,syntheticAcknowledged:false}).expect(400);
   await request(app.getHttpServer()).post('/api/v1/boarding-requests').send({...body,kind:'MESSAGE_OWNER'}).expect(400);
   await request(app.getHttpServer()).get('/api/v1/boarding-requests/'+requestId).set('Origin','http://127.0.0.1:3180').expect(200);
  }finally{await app.close();for(const [name,value] of Object.entries(saved)){if(value===undefined)delete process.env[name];else process.env[name]=value;}}
 });
 it('rejects owner and operator fixtures from student mock requests',async()=>{
  const saved={APP_ENV:process.env.APP_ENV,NODE_ENV:process.env.NODE_ENV,ENABLE_SYNTHETIC_ACTORS:process.env.ENABLE_SYNTHETIC_ACTORS,SYNTHETIC_ACTOR:process.env.SYNTHETIC_ACTOR};Object.assign(process.env,local);
  try{
   for(const fixture of ['owner-a','operator']){const app=(await setup(fixture,local)).createNestApplication();configureApp(app);await app.init();try{await request(app.getHttpServer()).post('/api/v1/boarding-requests').set('Origin','http://127.0.0.1:3180').send(body).expect(403);}finally{await app.close();}}
  }finally{for(const [name,value] of Object.entries(saved)){if(value===undefined)delete process.env[name];else process.env[name]=value;}}
 });
});
