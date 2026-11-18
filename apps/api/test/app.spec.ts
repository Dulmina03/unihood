import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { DatabaseReadinessService } from '../src/database-readiness.service';
describe('bootstrap HTTP boundary', () => {
  let app: INestApplication;
  let ready = false;
  beforeAll(async () => {
    const module = await Test.createTestingModule({imports: [AppModule]})
      .overrideProvider(DatabaseReadinessService).useValue({ isReady: async () => ready }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  it.each(['/health', '/api/v1/health'])('returns only public liveness fields: %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(200).expect({status: 'ok', service: 'unihood-api'});
  });
  it.each(['/health/ready', '/api/v1/health/ready'])('separates readiness from liveness: %s', async (path) => {
    ready = false;
    await request(app.getHttpServer()).get(path).expect(503).expect({ status: 'not_ready', service: 'unihood-api', checks: { database: 'unavailable' } });
    await request(app.getHttpServer()).get('/health').expect(200);
    ready = true;
    await request(app.getHttpServer()).get(path).expect(200).expect({ status: 'ready', service: 'unihood-api', checks: { database: 'ready' } });
  });
  it.each(['/api/v1/boardings', '/api/v1/contributions/boarding', '/api/v1/property-claims'])('keeps unavailable or protected writes closed: %s', async (path) => {
    await request(app.getHttpServer()).post(path).set('X-Role', 'owner').send({}).expect(path === '/api/v1/contributions/boarding' ? 401 : 404);
  });
});
