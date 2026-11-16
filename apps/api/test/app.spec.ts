import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
describe('bootstrap HTTP boundary', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({imports: [AppModule]}).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  it.each(['/health', '/api/v1/health'])('returns only public liveness fields: %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(200).expect({status: 'ok', service: 'unihood-api'});
  });
  it.each(['/api/v1/boardings', '/api/v1/contributions/boarding', '/api/v1/property-claims'])('does not expose a write route: %s', async (path) => {
    await request(app.getHttpServer()).post(path).set('X-Role', 'owner').send({}).expect(404);
  });
});
