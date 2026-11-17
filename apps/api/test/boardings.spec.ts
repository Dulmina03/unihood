import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { UniversityRepository } from '../src/universities/university.repository';
const id='71000000-0000-4000-8000-000000000001';
const item={listing:{id,listingId:'72000000-0000-4000-8000-000000000001',kind:'BOARDING',title:'Synthetic preview',publisherKind:'COMMUNITY_RECOMMENDATION',visibility:'HIDDEN',locationLabel:null,entrance:null,distanceMeters:null,route:null,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null},disclaimer:'Community-submitted, not owner-verified',provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic fixture',verifiedAt:null}},summary:'Fictional public preview',updatedAt:'2026-11-17T00:00:00Z'};
describe('boarding advertisement public HTTP boundary',()=>{
 let app:INestApplication;let rows:unknown[]=[];const calls:Array<{sql:string;values:unknown[]}>=[];
 beforeAll(async()=>{const m=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(UniversityRepository).useValue({includeSynthetic:true,query:async(sql:string,values:unknown[])=>{calls.push({sql,values});return rows;}}).compile();app=m.createNestApplication();configureApp(app);await app.init();});
 afterAll(async()=>app.close());beforeEach(()=>{rows=[];calls.length=0;});
 it('bounds pages and parameterizes only approved title/locality filters with stable nonspatial order',async()=>{
  rows=[{payload:item},{payload:item}];const r=await request(app.getHttpServer()).get('/api/v1/boardings').query({publisherKind:'COMMUNITY_RECOMMENDATION',visibility:'HIDDEN',q:'%_',pageSize:'1',page:'2',sort:'title'}).expect(200);
  expect(r.body).toEqual({items:[item],page:{page:2,pageSize:1,hasNextPage:true}});expect(r.headers['cache-control']).toBe('no-store');expect(calls[0].values).toEqual([true,'COMMUNITY_RECOMMENDATION','HIDDEN','%\\%\\_%',2,1]);
  expect(calls[0].sql).toContain('b.visibility=a.visibility');expect(calls[0].sql).toContain('l.is_current');expect(calls[0].sql).not.toMatch(/\bST_[A-Z]|unihood_private|description|available_beds|object_key/);
 });
 it.each(['lat=0','bbox=0,0,1,1','sort=distance','visibility=PUBLIC_MAP','q=a&q=b','pageSize=101','publisherKind=owner','__proto__=x'])('rejects unsupported query %s before reading',async(q)=>{await request(app.getHttpServer()).get('/api/v1/boardings?'+q).expect(400);expect(calls).toHaveLength(0);});
 it('reads canonical identity and redacts malformed upstream/private payloads',async()=>{
  rows=[{payload:item}];await request(app.getHttpServer()).get('/api/v1/boardings/'+id).expect(200);expect(calls[0].values).toEqual([true,id]);
  rows=[{payload:{...item,privateAddress:'PRIVATE_CANARY'}}];const r=await request(app.getHttpServer()).get('/api/v1/boardings/'+id).expect(500);expect(JSON.stringify(r.body)).not.toContain('PRIVATE_CANARY');
 });
 it('returns generic missing state, rejects bad IDs and adds no writes',async()=>{
  await request(app.getHttpServer()).get('/api/v1/boardings/'+id).expect(404);calls.length=0;await request(app.getHttpServer()).get('/api/v1/boardings/'+id+'?lat=0').expect(400);await request(app.getHttpServer()).get('/api/v1/boardings/not-an-id').expect(400);expect(calls).toHaveLength(0);
  await request(app.getHttpServer()).post('/api/v1/boardings').set('X-Role','owner').send(item).expect(404);
 });
});
