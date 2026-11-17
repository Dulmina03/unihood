import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { SyntheticActors,syntheticConfig,SYNTHETIC_PROPERTY_A as a,SYNTHETIC_PROPERTY_B as b } from '../src/identity/synthetic-actors';
const env={APP_ENV:'test',NODE_ENV:'test',ENABLE_SYNTHETIC_ACTORS:'true',SYNTHETIC_ACTOR:'owner-a'};
const draft={version:1,title:'Synthetic Study courtyard',summary:'A fictional example, never a real property.',facilities:['Study space'],requestedVisibility:'HIDDEN',locality:null,mediaConsent:false};
async function appFor(config:NodeJS.ProcessEnv){const m=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(SyntheticActors).useFactory({factory:()=>new SyntheticActors(syntheticConfig(config))}).compile();const app=m.createNestApplication();configureApp(app);await app.init();return app;}
const path=(id=a)=>`/api/v1/owner/boardings/${id}/draft-check`;
describe('real HTTP owner wizard draft-only boundary',()=>{
 it('checks issued property A drafts, not B, arbitrary fields or a publication',async()=>{const app=await appFor(env);try{
  for(const visibility of ['HIDDEN','AREA_ONLY','PUBLIC_MAP']){const input={...draft,requestedVisibility:visibility,locality:visibility==='AREA_ONLY'?'Synthetic North Quarter':null};const r=await request(app.getHttpServer()).post(path()).send(input).expect(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.body).toEqual({outcome:'DRAFT_ONLY',published:false,draft:input});}
  await request(app.getHttpServer()).post(path(b)).send(draft).expect(403);
  const bad=await request(app.getHttpServer()).post(path()).send({...draft,entrance:{lat:1,lng:2},phone:'PRIVATE_CANARY'}).expect(400);expect(JSON.stringify(bad.body)).not.toContain('PRIVATE_CANARY');
  await request(app.getHttpServer()).post('/api/v1/owner/boardings/'+a+'/publish').send(draft).expect(404);
 }finally{await app.close();}});
 it.each(['staging','production','unknown'])('fails closed in %s with flags and spoofed headers',async APP_ENV=>{const app=await appFor({...env,APP_ENV});try{await request(app.getHttpServer()).post(path()).set('X-Role','owner').set('X-User-Id','synthetic:owner-a').send(draft).expect(401);}finally{await app.close();}});
 it('denies contributor and limited-manager map escalation',async()=>{for(const fixture of ['contributor','price-manager-a']){const app=await appFor({...env,SYNTHETIC_ACTOR:fixture});try{await request(app.getHttpServer()).post(path()).send(draft).expect(fixture==='contributor'?403:200);await request(app.getHttpServer()).post(path()).send({...draft,requestedVisibility:'PUBLIC_MAP'}).expect(403);}finally{await app.close();}}});
 it('denies forwarded, remote-origin and actor-disabled simulation',async()=>{const app=await appFor(env);try{for(const headers of [{'X-Forwarded-For':'127.0.0.1'},{Origin:'https://evil.example'}])await request(app.getHttpServer()).post(path()).set(headers).send(draft).expect(401);}finally{await app.close();}const disabled=await appFor({...env,ENABLE_SYNTHETIC_ACTORS:'false'});try{await request(disabled.getHttpServer()).post(path()).send(draft).expect(401);}finally{await disabled.close();}});
 it('provides narrow credential-free loopback preflight only when the simulator is enabled',async()=>{
  const keys=['APP_ENV','NODE_ENV','ENABLE_SYNTHETIC_ACTORS','WEB_PORT'] as const;const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));Object.assign(process.env,env,{WEB_PORT:'3000'});const app=await appFor(env);
  try{const r=await request(app.getHttpServer()).options(path()).set('Origin','http://127.0.0.1:3000').expect(204);expect(r.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');expect(r.headers['access-control-allow-methods']).toBe('POST');expect(r.headers['access-control-allow-credentials']).toBeUndefined();
   for(const origin of ['https://evil.example','http://127.0.0.1:9999']){const denied=await request(app.getHttpServer()).options(path()).set('Origin',origin);expect(denied.headers['access-control-allow-origin']).toBeUndefined();}
   process.env.APP_ENV='staging';const denied=await request(app.getHttpServer()).options(path()).set('Origin','http://127.0.0.1:3000');expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  }finally{await app.close();for(const k of keys){if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];}}
 });
});
