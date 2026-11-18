import 'reflect-metadata';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AppModule} from '../src/app.module';
import {configureApp} from '../src/configure-app';
import {UniversityRepository} from '../src/universities/university.repository';
import {SyntheticActors,syntheticConfig} from '../src/identity/synthetic-actors';
const encryptionKey='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const target='00000000-0000-4000-8000-000000000001',key='44000000-0000-4000-8000-000000000001';
const body={key,targetType:'BOARDING',targetId:target,reportType:'WRONG_FEE',details:'Synthetic fictional fee mismatch context only.',syntheticAcknowledged:true};
function setup(fixture:string,env:NodeJS.ProcessEnv){
 const calls:unknown[][]=[];
 const query=async(sql:string,args:unknown[])=>{calls.push([sql,args]);
  if(sql.includes('pg_advisory_xact_lock')||sql.startsWith('INSERT'))return[];
  if(sql.includes('payload_hash FROM unihood_private.report_cases')||sql.includes('FROM unihood_private.report_appeals'))return[];
  if(sql.includes('FROM public.places p JOIN public.boarding_properties'))return[{id:target}];
  if(sql.includes('FROM unihood_private.report_cases WHERE id=$1'))return[];
  return[];
 };
 return Test.createTestingModule({imports:[AppModule]}).overrideProvider(UniversityRepository).useValue({includeSynthetic:true,query,transaction:async(work:(q:typeof query)=>Promise<unknown>)=>work(query)}).overrideProvider(SyntheticActors).useFactory({factory:()=>new SyntheticActors(syntheticConfig({...env,SYNTHETIC_ACTOR:fixture}))}).compile();
}
const local={APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',WEB_PORT:'3180',REPORT_ENCRYPTION_KEY_HEX:encryptionKey};
describe('UNI-044 report HTTP privacy boundaries',()=>{
 it.each(['staging','production','unknown'])('denies %s writes despite spoofed actor headers',async APP_ENV=>{const app=(await setup('contributor',{...local,APP_ENV})).createNestApplication();configureApp(app);await app.init();try{await request(app.getHttpServer()).post('/api/v1/reports').set('X-User-Id','synthetic:operator').set('Origin','http://127.0.0.1:3180').send(body).expect(401);}finally{await app.close();}});
 it('accepts only loopback local/test actors and returns a redacted no-store receipt',async()=>{
  const saved={APP_ENV:process.env.APP_ENV,NODE_ENV:process.env.NODE_ENV,ENABLE_SYNTHETIC_ACTORS:process.env.ENABLE_SYNTHETIC_ACTORS,SYNTHETIC_ACTOR:process.env.SYNTHETIC_ACTOR,REPORT_ENCRYPTION_KEY_HEX:process.env.REPORT_ENCRYPTION_KEY_HEX};Object.assign(process.env,local);
  const module=await setup('contributor',local);const app=module.createNestApplication();configureApp(app);await app.init();
  try{
   const response=await request(app.getHttpServer()).post('/api/v1/reports').set('Origin','http://127.0.0.1:3180').send(body).expect(200);
   expect(response.headers['cache-control']).toBe('no-store');const text=JSON.stringify(response.body);expect(text).not.toMatch(/Synthetic fictional fee|synthetic:contributor|ciphertext|details/);expect(response.body).toMatchObject({status:'HELD',severity:'P1',published:false,reporterIdentity:'PROTECTED'});
   await request(app.getHttpServer()).post('/api/v1/reports').set('Origin','https://example.invalid').send(body).expect(401);
   await request(app.getHttpServer()).post('/api/v1/reports').send({...body,severity:'P0',reporterRef:'x'}).expect(400);
   await request(app.getHttpServer()).post('/api/v1/reports').send({...body,targetType:'ROUTE_SEGMENT'}).expect(400);
   await request(app.getHttpServer()).post('/api/v1/reports').send({...body,details:'short'}).expect(400);
  }finally{await app.close();for(const [name,value] of Object.entries(saved)){if(value===undefined)delete process.env[name];else process.env[name]=value;}}
 });
 it('keeps operator transitions and non-operator writes separated',async()=>{
  const saved={APP_ENV:process.env.APP_ENV,NODE_ENV:process.env.NODE_ENV,ENABLE_SYNTHETIC_ACTORS:process.env.ENABLE_SYNTHETIC_ACTORS,SYNTHETIC_ACTOR:process.env.SYNTHETIC_ACTOR,REPORT_ENCRYPTION_KEY_HEX:process.env.REPORT_ENCRYPTION_KEY_HEX};Object.assign(process.env,local);
  try{
   const contributor=(await setup('contributor',local)).createNestApplication();configureApp(contributor);await contributor.init();
   try{await request(contributor.getHttpServer()).post(`/api/v1/reports/${key}/operator`).send({key,action:'DISMISS_REPORT',syntheticAcknowledged:true}).expect(403);await request(contributor.getHttpServer()).get(`/api/v1/reports/${key}`).expect(404);await request(contributor.getHttpServer()).get('/api/v1/reports/not-a-uuid').expect(400);}finally{await contributor.close();}
   const operator=(await setup('operator',local)).createNestApplication();configureApp(operator);await operator.init();
   try{await request(operator.getHttpServer()).post('/api/v1/reports').send(body).expect(403);await request(operator.getHttpServer()).post(`/api/v1/reports/${key}/operator`).send({key,action:'DISMISS_REPORT',syntheticAcknowledged:true}).expect(404);}finally{await operator.close();}
  }finally{for(const [name,value] of Object.entries(saved)){if(value===undefined)delete process.env[name];else process.env[name]=value;}}
 });
});
