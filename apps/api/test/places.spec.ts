import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { UniversityRepository } from '../src/universities/university.repository';
const bbox='-0.01,-0.01,0.01,0.01';
const row={id:'40000000-0000-4000-8000-000000000001',kind:'POI',name:'Synthetic pharmacy',category:{code:'pharmacy',label:'Pharmacy'},location:{lat:0,lng:0},provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic fixture',verifiedAt:null},lastConfirmedAt:null};
describe('public POI HTTP projections and query boundaries',()=>{
 let app:INestApplication; let rows:unknown[]=[];const calls:Array<{sql:string;values:unknown[]}>=[];
 beforeAll(async()=>{const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(UniversityRepository).useValue({includeSynthetic:true,query:async(sql:string,values:unknown[])=>{calls.push({sql,values});return rows;}}).compile();app=module.createNestApplication();configureApp(app);await app.init();});
 afterAll(async()=>{await app.close();});beforeEach(()=>{rows=[];calls.length=0;});
 it('pages eligible public POIs using parameterized bbox/name filters and stable sorting',async()=>{
  rows=[row,{...row,id:'40000000-0000-4000-8000-000000000002'}];
  const r=await request(app.getHttpServer()).get('/api/v1/places').query({bbox,q:'%_\\',category:'pharmacy',pageSize:'1',page:'2',sort:'name'}).expect(200);
  expect(r.body.page).toEqual({page:2,pageSize:1,hasNextPage:true});expect(r.body.items).toEqual([row]);expect(r.headers['cache-control']).toBe('no-store');
  expect(calls[0].values.slice(0,6)).toEqual([true,-.01,-.01,.01,.01,'pharmacy']);expect(calls[0].values.slice(-2)).toEqual([2,1]);expect(calls[0].sql).not.toContain('pharmacy');expect(calls[0].sql).toContain("p.kind='POI'");expect(calls[0].sql).not.toContain('private_boarding');
 });
 it.each(['','?bbox=0,0,3,1',`?bbox=${bbox}&bbox=${bbox}`,`?bbox=${bbox}&sort=distance`,`?bbox=${bbox}&pageSize=101`,`?bbox=${bbox}&visibility=HIDDEN`])('rejects unsafe query %s',async(query)=>{await request(app.getHttpServer()).get('/api/v1/places'+query).expect(400);expect(calls).toHaveLength(0);});
 it('returns category metadata and rejects sensitive/boarding/unexpected upstream fields',async()=>{
  rows=[{code:'pharmacy',label:'Pharmacy'}];await request(app.getHttpServer()).get('/api/v1/place-categories').query({bbox}).expect(200);
  for(const invalid of [{...row,kind:'BOARDING'},{...row,privateAddress:'PRIVATE_CANARY'},{...row,distanceMeters:1}]){rows=[invalid];const r=await request(app.getHttpServer()).get('/api/v1/places').query({bbox}).expect(500);expect(JSON.stringify(r.body)).not.toContain('PRIVATE_CANARY');}
 });
 it('does not enable anonymous or header-selected writes',async()=>{await request(app.getHttpServer()).post('/api/v1/places').set('X-Role','owner').send({}).expect(404);});
 it('projects a canonical public detail with separate freshness and parameterized identity',async()=>{
  rows=[{...row,updatedAt:'2026-11-16T00:00:00Z'}];
  const r=await request(app.getHttpServer()).get('/api/v1/places/'+row.id).expect(200);
  expect(r.body).toEqual(rows[0]);expect(r.headers['cache-control']).toBe('no-store');
  expect(calls[0].values).toEqual([true,row.id]);expect(calls[0].sql).toContain("p.status='ACTIVE'");expect(calls[0].sql).toContain('p.merged_into IS NULL');expect(calls[0].sql).toContain("p.kind='POI'");expect(calls[0].sql).toContain('public.public_place_locations');
 });
 it('rejects invalid IDs without querying and gives generic 404 for unavailable identity',async()=>{
  await request(app.getHttpServer()).get('/api/v1/places/not-a-uuid').expect(400);expect(calls).toHaveLength(0);
  const r=await request(app.getHttpServer()).get('/api/v1/places/'+row.id).expect(404);expect(r.body.error.code).toBe('NOT_FOUND');
 });
 it('redacts unexpected or private detail projections and denies anonymous mutations',async()=>{
  rows=[{...row,updatedAt:'2026-11-16T00:00:00Z',privateAddress:'PRIVATE_CANARY'}];
  const r=await request(app.getHttpServer()).get('/api/v1/places/'+row.id).expect(500);expect(JSON.stringify(r.body)).not.toContain('PRIVATE_CANARY');
  await request(app.getHttpServer()).patch('/api/v1/places/'+row.id).set('X-Role','owner').send({}).expect(404);
 });
});
