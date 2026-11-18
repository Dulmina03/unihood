import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { UniversityRepository } from '../src/universities/university.repository';
import { SyntheticActors, syntheticConfig } from '../src/identity/synthetic-actors';
const input = { key: '40000000-0000-4000-8000-000000000040', draft: { title: 'Synthetic Community Study Home', description: 'Fictional community context; no real accommodation.', locality: null, facilities: ['Study space'], privacyAcknowledged: true, mediaGuidanceAcknowledged: true } };
const enabled = { APP_ENV: 'test', NODE_ENV: 'test', ENABLE_SYNTHETIC_ACTORS: 'true', SYNTHETIC_ACTOR: 'contributor' };
async function setup(env: NodeJS.ProcessEnv = enabled) {
  const calls: string[] = [];
  const query = async (sql: string) => { calls.push(sql); return []; };
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(UniversityRepository).useValue({ includeSynthetic: true, query, transaction: async (work: (q: typeof query) => Promise<unknown>) => work(query) }).overrideProvider(SyntheticActors).useFactory({ factory: () => new SyntheticActors(syntheticConfig(env)) }).compile();
  const app = module.createNestApplication(); configureApp(app); await app.init(); return { app, calls };
}
describe('UNI-040 guarded boarding recommendation intake', () => {
  it('accepts a contributing actor, returns a no-store private receipt and touches no canonical/owner tables', async () => {
    const { app, calls } = await setup();
    try { const result = await request(app.getHttpServer()).post('/api/v1/contributions/boarding').send(input).expect(200);
      expect(result.headers['cache-control']).toBe('no-store');
      expect(result.body).toMatchObject({ published: false, reviewState: 'PENDING', publisherKind: 'COMMUNITY_RECOMMENDATION', dataKind: 'SYNTHETIC' });
      expect(JSON.stringify(result.body)).not.toMatch(/Study Home|description|actor|payload_hash/);
      expect(calls.some(sql => sql.includes('INSERT INTO unihood_private.boarding_recommendation_intake'))).toBe(true);
      expect(calls.join(' ')).not.toMatch(/public\.places|public\.listings|public\.boarding_properties|boarding_locations|boarding_units|official_prices|vacancy_confirmations|media_assets/);
    } finally { await app.close(); }
  });
  it.each(['staging', 'production', 'unknown'])('fails closed in %s despite flags and forged headers, before database access', async APP_ENV => {
    const { app, calls } = await setup({ ...enabled, APP_ENV });
    try { await request(app.getHttpServer()).post('/api/v1/contributions/boarding').set('X-Role', 'owner').set('X-User-Id', 'synthetic:contributor').send(input).expect(401); expect(calls).toEqual([]); } finally { await app.close(); }
  });
  it('rejects protected/private fields and false consent without reflecting values or writing', async () => {
    const { app, calls } = await setup();
    try { for (const patch of [{ entrance: { lat: 42, lng: 43 } }, { price: 12345 }, { vacancy: 'AVAILABLE' }, { phone: 'PRIVATE_CANARY' }, { publisherKind: 'OWNER_OFFICIAL' }, { privacyAcknowledged: false }, { mediaUrl: 'https://private.example' }]) {
      const result = await request(app.getHttpServer()).post('/api/v1/contributions/boarding').send({ ...input, draft: { ...input.draft, ...patch } }).expect(400); expect(JSON.stringify(result.body)).not.toContain('PRIVATE_CANARY');
    } expect(calls).toEqual([]); } finally { await app.close(); }
  });
  it('holds contact/address/link signals without echoing submitted text; absence of signals never publishes', async () => {
    const { app } = await setup();
    try { const result = await request(app.getHttpServer()).post('/api/v1/contributions/boarding').send({ ...input, draft: { ...input.draft, description: 'Synthetic contact test +12025550100 https://example.invalid' } }).expect(200); expect(result.body.reviewState).toBe('NEEDS_EVIDENCE'); expect(result.body.published).toBe(false); expect(JSON.stringify(result.body)).not.toMatch(/5550100|example\.invalid/); } finally { await app.close(); }
  });
  it('denies cross-site/forwarded requests and grants no student official-field rights', async () => {
    const { app, calls } = await setup();
    try { for (const [key, value] of [['Origin', 'https://evil.example'], ['X-Forwarded-For', '127.0.0.1']]) await request(app.getHttpServer()).post('/api/v1/contributions/boarding').set(key, value).send(input).expect(401);
      await request(app.getHttpServer()).patch('/api/v1/boardings/00000000-0000-4000-8000-000000000001/visibility').send({}).expect(403);
      expect(calls).toEqual([]);
    } finally { await app.close(); }
  });
});
