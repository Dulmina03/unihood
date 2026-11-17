import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { SyntheticActors,syntheticConfig,SYNTHETIC_PROPERTY_A as a,SYNTHETIC_PROPERTY_B as b } from '../src/identity/synthetic-actors';
const env={APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'owner-a'};
async function appFor(config:NodeJS.ProcessEnv){const m=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(SyntheticActors).useFactory({factory:()=>new SyntheticActors(syntheticConfig(config))}).compile();const app=m.createNestApplication();configureApp(app);await app.init();return app;}
const path=(id=a)=>`/api/v1/owner/boardings/${id}/visibility-preview`;
const publicInput={visibility:'PUBLIC_MAP',entranceFixture:'synthetic-courtyard-entrance',publicMapConsent:true,externalCopiesAcknowledged:true};
describe('actual server-derived synthetic owner preview',()=>{
 it('projects each mode without changing property identity, publishing or reflecting unreviewed/private input',async()=>{const app=await appFor(env);try{
  for(const input of [{visibility:'HIDDEN'},{visibility:'AREA_ONLY',locality:'Synthetic North Quarter'},publicInput]){const response=await request(app.getHttpServer()).post(path()).send(input).expect(200);expect(response.headers['cache-control']).toBe('no-store');expect(response.body).toMatchObject({outcome:'PREVIEW_ONLY',published:false,preview:{id:a,visibility:input.visibility,price:null,vacancy:{status:'UNKNOWN'}}});
   if(input.visibility==='PUBLIC_MAP')expect(response.body.preview.entrance).toEqual({lat:0,lng:0});else{expect(response.body.preview.entrance).toBeNull();expect(response.body.preview.distanceMeters).toBeNull();expect(response.body.preview.route).toBeNull();expect(JSON.stringify(response.body)).not.toMatch(/"lat"|"lng"|\(0,0\)/);}
   if(input.visibility==='HIDDEN')expect(response.body.preview.locationLabel).toBeNull();
  }
  for(const input of [{visibility:'HIDDEN',entrance:{lat:42.123456,lng:43.654321}},{visibility:'HIDDEN',title:'PRIVATE_CANARY'},{visibility:'AREA_ONLY',locality:'PRIVATE_CANARY'},{...publicInput,publicMapConsent:false},{...publicInput,externalCopiesAcknowledged:false},{...publicInput,entranceFixture:'another-private-property'}]){const r=await request(app.getHttpServer()).post(path()).send(input).expect(400);expect(JSON.stringify(r.body)).not.toMatch(/PRIVATE_CANARY|42\.123456|43\.654321/);}
  await request(app.getHttpServer()).post(path(b)).send(publicInput).expect(403);
 }finally{await app.close();}});
 it('requires separate map capability and never promotes a contributor',async()=>{for(const fixture of ['contributor','price-manager-a']){const app=await appFor({...env,SYNTHETIC_ACTOR:fixture});try{await request(app.getHttpServer()).post(path()).send({visibility:'HIDDEN'}).expect(fixture==='contributor'?403:200);await request(app.getHttpServer()).post(path()).send(publicInput).expect(403);}finally{await app.close();}}});
 it.each(['staging','production','unknown'])('denies %s despite explicit flags and forged headers',async APP_ENV=>{const app=await appFor({...env,APP_ENV});try{const r=await request(app.getHttpServer()).post(path()).set('X-Role','owner').set('X-User-Id','synthetic:owner-a').send(publicInput).expect(401);expect(JSON.stringify(r.body)).not.toMatch(/"lat"|"lng"|entranceFixture/);}finally{await app.close();}});
 it('rejects forwarded and hostile-origin owner preview requests',async()=>{const app=await appFor(env);try{await request(app.getHttpServer()).post(path()).set('X-Forwarded-For','127.0.0.1').send(publicInput).expect(401);await request(app.getHttpServer()).post(path()).set('Origin','https://evil.example').send(publicInput).expect(401);}finally{await app.close();}});
});
