import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UniversityPageSchema, CampusPageSchema, CampusEntrancePageSchema, ErrorResponseSchema } from '@unihood/contracts';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { UniversityRepository } from '../src/universities/university.repository';
const id = '10000000-0000-4000-8000-000000000001';
const campus = '20000000-0000-4000-8000-000000000001';
const provenance = {dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic fixture', verifiedAt: null};
describe('university HTTP contracts and parameterized projections', () => {
  let app: INestApplication;
  const calls: Array<{sql: string; values: unknown[]}> = [];
  let result: unknown[] = [];
  beforeAll(async () => {
    const module = await Test.createTestingModule({imports: [AppModule]}).overrideProvider(UniversityRepository).useValue({includeSynthetic: true, query: async (sql: string, values: unknown[]) => {
      calls.push({sql, values});
      if (sql.startsWith('SELECT u.id FROM') || sql.startsWith('SELECT c.id FROM')) return [{id}];
      return result;
    }}).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
  });
  afterAll(async () => {await app.close();});
  beforeEach(() => {calls.length = 0; result = [];});
  it('returns a bounded page without requiring identity headers', async () => {
    const row = {id, slug: 'synthetic-demo', name: 'Synthetic Demo', city: 'Synthetic City', country: 'ZZ', provenance};
    result = [row, {...row, id: campus}];
    const response = await request(app.getHttpServer()).get('/api/v1/universities?pageSize=1&slug=synthetic-demo').expect(200);
    const body = UniversityPageSchema.parse(response.body);
    expect(body.page).toEqual({page: 1, pageSize: 1, hasNextPage: true});
    expect(body.items).toHaveLength(1);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(calls[0].values).toEqual([true, 'synthetic-demo', 2, 0]);
    expect(calls[0].sql).not.toContain('synthetic-demo');
  });
  it('returns parent-linked campuses and gates through strict schemas', async () => {
    result = [{id: campus, universityId: id, name: 'Synthetic Campus', publicArea: null, provenance}];
    const campuses = await request(app.getHttpServer()).get(`/api/v1/universities/${id}/campuses`).expect(200);
    expect(CampusPageSchema.parse(campuses.body).items[0].universityId).toBe(id);
    result = [{id, campusId: campus, name: 'Synthetic Gate', location: {lat: 0, lng: 0}, isPrimary: true, provenance}];
    const gates = await request(app.getHttpServer()).get(`/api/v1/universities/${id}/entrances?campusId=${campus}`).expect(200);
    expect(CampusEntrancePageSchema.parse(gates.body).items[0].campusId).toBe(campus);
    expect(calls.at(-1)?.values).toEqual([true, id, campus, 21, 0]);
  });
  it.each(['?pageSize=101', '?page=1&page=2', '?slug=invalid%27', '?privateAddress=PRIVATE_CANARY', '?sort=distance'])('validates query before repository access: %s', async (query) => {
    const response = await request(app.getHttpServer()).get(`/api/v1/universities${query}`).expect(400);
    expect(ErrorResponseSchema.parse(response.body).error.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_CANARY');
    expect(calls).toHaveLength(0);
  });
  it('rejects invalid path/campus IDs before repository access', async () => {
    await request(app.getHttpServer()).get('/api/v1/universities/PRIVATE_CANARY/entrances').expect(400);
    await request(app.getHttpServer()).get(`/api/v1/universities/${id}/entrances?campusId=invalid`).expect(400);
    expect(calls).toHaveLength(0);
  });
  it('does not serialize unknown fields supplied by a repository', async () => {
    result = [{id, slug: 'synthetic-demo', name: 'Synthetic Demo', city: 'Synthetic City', country: 'ZZ', provenance, privateAddress: 'PRIVATE_CANARY'}];
    const response = await request(app.getHttpServer()).get('/api/v1/universities').expect(500);
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_CANARY');
  });
  it.each(['post', 'put', 'patch', 'delete'] as const)('exposes no %s university route despite forged authority', async (verb) => {
    await request(app.getHttpServer())[verb]('/api/v1/universities').set('X-Role', 'owner').set('X-User-Id', 'admin').send({}).expect(404);
    expect(calls).toHaveLength(0);
  });
});
describe('university repository deployment and failure guards', () => {
  it.each(['staging', 'production', 'unknown', undefined])('does not publish synthetic fixtures in %s', async (environment) => {
    const before = {...process.env};
    try {
      if (environment) process.env.APP_ENV = environment; else delete process.env.APP_ENV;
      delete process.env.DATABASE_URL;
      const repository = new UniversityRepository();
      expect(repository.includeSynthetic).toBe(false);
      await expect(repository.query('SELECT 1', [])).rejects.toMatchObject({status: 503});
      await repository.onModuleDestroy();
    } finally {process.env = before;}
  });
  it.each([['local', 'staging'], ['test', 'staging'], ['test', 'development'], ['test', undefined]])('fails closed for incompatible environment %s/%s', async (appEnv, nodeEnv) => {
    const before = {...process.env};
    try {
      process.env.APP_ENV = appEnv; if (nodeEnv) process.env.NODE_ENV = nodeEnv; else delete process.env.NODE_ENV;
      delete process.env.DATABASE_URL;
      const repository = new UniversityRepository(); expect(repository.includeSynthetic).toBe(false); await repository.onModuleDestroy();
    } finally {process.env = before;}
  });
  it('NODE_ENV=production blocks fixtures even with APP_ENV=local', async () => {
    const before = {...process.env};
    try {
      process.env.APP_ENV = 'local'; process.env.NODE_ENV = 'production'; delete process.env.DATABASE_URL;
      const repository = new UniversityRepository(); expect(repository.includeSynthetic).toBe(false); await repository.onModuleDestroy();
    } finally {process.env = before;}
  });
});
