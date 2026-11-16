import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import 'reflect-metadata';
import { Controller, Get, Post, Param, Query, HttpException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ErrorResponseSchema, HealthResponseSchema, PaginationQuerySchema } from '@unihood/contracts';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { DatabaseReadinessService } from '../src/database-readiness.service';
import { RequirePermission } from '../src/identity/protected-boundary.guard';
import { SyntheticActors, syntheticConfig, SYNTHETIC_PROPERTY_A as a, SYNTHETIC_PROPERTY_B as b } from '../src/identity/synthetic-actors';
import { ContractValidationPipe } from '../src/http/contract-validation.pipe';

// Test module only. No fixture controller is imported by AppModule or the production build.
@Controller('contract-boundary')
class BoundaryFixture {
  @Get('validate') validate(@Query(new ContractValidationPipe(PaginationQuerySchema)) input: unknown) {return input;}
  @Get('explode') explode() {throw new Error('PRIVATE_CANARY postgres://private');}
  @Get('status/:status') status(@Param('status') status: string) {throw new HttpException('PRIVATE_CANARY', Number(status));}
  @Post('suggest') @RequirePermission({action: 'suggest'}) suggest() {return {synthetic: true};}
  @Post('unannotated') unannotated() {return {synthetic: true};}
  @Post(':boardingId/price') @RequirePermission({action: 'setPrice'}) price() {return {synthetic: true};}
  @Post(':boardingId/map') @RequirePermission({action: 'publishMap'}) map() {return {synthetic: true};}
}
async function createApp(env: NodeJS.ProcessEnv, fixtures = true) {
  const module = await Test.createTestingModule({imports: [AppModule], controllers: fixtures ? [BoundaryFixture] : []})
    .overrideProvider(DatabaseReadinessService).useValue({isReady: async () => false})
    .overrideProvider(SyntheticActors).useFactory({factory: () => new SyntheticActors(syntheticConfig(env))}).compile();
  const app = module.createNestApplication(); configureApp(app); await app.init(); return app;
}
const enabled = {APP_ENV: 'test', NODE_ENV: 'test', ENABLE_SYNTHETIC_ACTORS: 'true', SYNTHETIC_ACTOR: 'owner-a'};
describe('actual HTTP authorization and error boundary', () => {
  let app: INestApplication;
  beforeAll(async () => {app = await createApp(enabled);});
  afterAll(async () => {await app.close();});
  it('enforces target permissions and denies an unannotated mutation', async () => {
    await request(app.getHttpServer()).post(`/contract-boundary/${a}/price`).expect(201);
    const denied = await request(app.getHttpServer()).post(`/contract-boundary/${b}/price`).expect(403);
    expect(ErrorResponseSchema.parse(denied.body).error.code).toBe('FORBIDDEN');
    await request(app.getHttpServer()).post('/contract-boundary/unannotated').expect(403);
    await request(app.getHttpServer()).post(`/contract-boundary/${a}/map`).set('Origin', 'https://evil.example').expect(401);
    await request(app.getHttpServer()).post(`/contract-boundary/${a}/price`).set('X-Forwarded-For', '127.0.0.1').expect(401);
  });
  it('validates HTTP query strings without reflecting user keys or values', async () => {
    await request(app.getHttpServer()).get('/contract-boundary/validate?page=2&pageSize=100').expect(200).expect({page: '2', pageSize: '100'});
    for (const query of ['pageSize=101', 'page=1&page=2', 'sort=distance', 'PRIVATE_CANARY=secret']) {
      const response = await request(app.getHttpServer()).get(`/contract-boundary/validate?${query}`).expect(400);
      expect(ErrorResponseSchema.parse(response.body).error.code).toBe('VALIDATION_FAILED');
      expect(JSON.stringify(response.body)).not.toMatch(/PRIVATE_CANARY|secret|distance/);
    }
  });
  it.each([400, 401, 403, 404, 409, 422, 429, 500, 503])('redacts exception text for status %s', async (status) => {
    const response = await request(app.getHttpServer()).get(`/contract-boundary/status/${status}`).set('X-Request-Id', 'PRIVATE_CANARY').expect(status);
    const body = ErrorResponseSchema.parse(response.body);
    expect(body.error.requestId).toBe(response.headers['x-request-id']);
    expect(JSON.stringify(body)).not.toContain('PRIVATE_CANARY');
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('refuses an OpenAPI export when a controller lacks contract metadata', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/openapi.json').expect(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
  it('redacts unexpected errors, unknown URL and malformed JSON', async () => {
    for (const [url, status] of [['/contract-boundary/explode', 500], ['/PRIVATE_CANARY', 404]] as const) {
      const response = await request(app.getHttpServer()).get(url).expect(status);
      expect(ErrorResponseSchema.safeParse(response.body).success).toBe(true);
      expect(JSON.stringify(response.body)).not.toMatch(/PRIVATE_CANARY|postgres|stack/);
    }
    const response = await request(app.getHttpServer()).post('/contract-boundary/suggest').set('Content-Type', 'application/json').send('{"PRIVATE_CANARY":').expect(400);
    expect(ErrorResponseSchema.safeParse(response.body).success).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_CANARY');
  });
});

describe('HTTP environment isolation', () => {
  it.each(['staging', 'production', 'unknown'])('denies writes in %s even with flags and forged actor headers', async (environment) => {
    const app = await createApp({...enabled, APP_ENV: environment});
    try {
      const response = await request(app.getHttpServer()).post(`/contract-boundary/${a}/price`).set('X-Role', 'owner').set('X-User-Id', 'synthetic:owner-a').expect(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    } finally {await app.close();}
  });
  it('does not turn a configured contributor into an owner using headers', async () => {
    const app = await createApp({...enabled, SYNTHETIC_ACTOR: 'contributor'});
    try {
      await request(app.getHttpServer()).post('/contract-boundary/suggest').expect(201);
      await request(app.getHttpServer()).post(`/contract-boundary/${a}/price`).set('X-Role', 'owner').set('X-User-Id', 'synthetic:owner-a').expect(403);
    } finally {await app.close();}
  });
});

describe('live OpenAPI baseline', () => {
  let app: INestApplication;
  beforeAll(async () => {app = await createApp({}, false);});
  afterAll(async () => {await app.close();});
  it('documents only live read routes and resolves all schema refs', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/openapi.json').expect(200);
    const document = response.body;
    expect(document.openapi).toBe('3.1.0');
    expect(document).toEqual(JSON.parse(readFileSync(resolve(process.cwd(), '../../docs/api/openapi.json'), 'utf8')));
    expect(Object.keys(document.paths).sort()).toEqual(['/health', '/health/ready', '/api/v1/health', '/api/v1/health/ready', '/api/v1/openapi.json', '/api/v1/universities', '/api/v1/universities/{id}/campuses', '/api/v1/universities/{id}/entrances'].sort());
    for (const [path, methods] of Object.entries(document.paths)) {
      expect(Object.keys(methods as object)).toEqual(['get']);
      const url = path.replace('{id}', '10000000-0000-4000-8000-000000000001');
      await request(app.getHttpServer()).get(url).expect(path.endsWith('/ready') || path.includes('/universities') ? 503 : 200);
    }
    const refs = JSON.stringify(document).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g);
    for (const [, name] of refs) expect(document.components.schemas[name.split('/')[0]]).toBeDefined();
    expect(JSON.stringify(document)).not.toMatch(/contract-boundary|synthetic:owner|DATABASE_URL|property_memberships/);
    expect(document.paths['/api/v1/universities/{id}/entrances'].get.parameters).toEqual([
      {name: 'id', in: 'path', required: true, schema: {$ref: '#/components/schemas/PublicId'}},
      ...['page', 'pageSize', 'campusId'].map((name) => ({name, in: 'query', required: false, schema: {$ref: `#/components/schemas/EntranceListQuery/properties/${name}`}})),
    ]);
    for (const [, reference] of JSON.stringify(document).matchAll(/"\$ref":"#([^"]+)"/g)) {
      let value: unknown = document;
      for (const key of reference.slice(1).split('/')) value = (value as Record<string, unknown>)[key.replace(/~1/g, '/').replace(/~0/g, '~')];
      expect(value).toBeDefined();
    }
    expect(document.components.schemas.PublicBoardingResponse).toBeDefined();
    expect(HealthResponseSchema.safeParse((await request(app.getHttpServer()).get('/api/v1/health')).body).success).toBe(true);
    for (const path of ['/api/v1/boardings', '/api/v1/property-claims', '/api/v1/contributions/boarding']) await request(app.getHttpServer()).post(path).expect(404);
  });
});
