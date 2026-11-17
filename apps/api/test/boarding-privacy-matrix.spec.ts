import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { UniversityRepository } from '../src/universities/university.repository';
import {
  SyntheticActors,
  syntheticConfig,
  SYNTHETIC_PROPERTY_A as propA,
  SYNTHETIC_PROPERTY_B as propB,
} from '../src/identity/synthetic-actors';

const propC = '00000000-0000-4000-8000-000000000003';

const defaultTestEnv = {
  APP_ENV: 'test',
  NODE_ENV: 'test',
  ENABLE_SYNTHETIC_ACTORS: 'true',
  SYNTHETIC_ACTOR: 'owner-a',
};

async function createTestApp(
  envOverrides: Record<string, string> = {},
  queryHandler?: (sql: string, params?: unknown[]) => Promise<unknown[]>
) {
  const env = { ...defaultTestEnv, ...envOverrides };
  const calls: Array<{ sql: string; params?: unknown[] }> = [];

  const defaultQuery = async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    if (queryHandler) {
      return queryHandler(sql, params);
    }
    return [];
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(UniversityRepository)
    .useValue({
      includeSynthetic: true,
      query: defaultQuery,
      transaction: async (work: (q: typeof defaultQuery) => Promise<unknown>) => work(defaultQuery),
    })
    .overrideProvider(SyntheticActors)
    .useFactory({ factory: () => new SyntheticActors(syntheticConfig(env)) })
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, calls };
}

describe('UNI-039 Comprehensive Privacy Matrix across API Endpoints (ADR-0001–0005 & §13.2)', () => {
  describe('Public Discovery & Details Matrix (/boardings, :id, /map, /nearby-essentials, /compare)', () => {
    it('GET /api/v1/boardings enforces no-store, strict pagination, and rejects spatial inference parameters', async () => {
      const { app, calls } = await createTestApp({}, async () => []);
      try {
        // 1. Valid nonspatial listing search
        const res = await request(app.getHttpServer())
          .get('/api/v1/boardings')
          .query({ visibility: 'HIDDEN', pageSize: 10, page: 1 })
          .expect(200);

        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.body.page).toEqual({ page: 1, pageSize: 10, hasNextPage: false });

        // 2. Spatial inference attack attempts must be rejected with 400 before querying database
        const spatialAttacks = [
          'lat=6.795&lng=79.901',
          'bbox=79.9,6.7,80.0,6.8',
          'sort=distance',
          'visibility=PUBLIC_MAP', // Public map listings use dedicated /boardings/map endpoint
          'near=campus_entrance',
          'radius=500',
        ];

        for (const attack of spatialAttacks) {
          calls.length = 0;
          const badRes = await request(app.getHttpServer())
            .get(`/api/v1/boardings?${attack}`)
            .expect(400);
          expect(badRes.body.error).toBeDefined();
          expect(calls).toHaveLength(0); // Zero database calls on rejected spatial queries
        }
      } finally {
        await app.close();
      }
    });

    it('GET /api/v1/boardings/:id returns correct privacy projection for HIDDEN vs AREA_ONLY vs COMMUNITY', async () => {
      const { app } = await createTestApp({}, async (sql, params) => {
        const id = (params as unknown[])?.[1];
        if (id === propA) {
          // Owner HIDDEN
          return [{
            payload: {
              listing: {
                id: propA,
                listingId: '72000000-0000-4000-8000-000000000001',
                kind: 'BOARDING',
                title: 'Hidden Owner Residence',
                publisherKind: 'OWNER_OFFICIAL',
                ownerVerified: true,
                visibility: 'HIDDEN',
                locationLabel: null,
                entrance: null,
                distanceMeters: null,
                route: null,
                price: null,
                vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
                provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'Test fixture', verifiedAt: null },
              },
              summary: 'Location hidden residence',
              updatedAt: '2026-11-17T00:00:00Z',
            },
            policy: {
              dataKind: 'SYNTHETIC',
              authorizationStatus: 'LOCAL_TEST_AUTHORIZED',
              visibility: 'HIDDEN',
              localityConsent: false,
              publicMapConsent: false,
            },
          }];
        }
        if (id === propB) {
          // Owner AREA_ONLY
          return [{
            payload: {
              listing: {
                id: propB,
                listingId: '72000000-0000-4000-8000-000000000002',
                kind: 'BOARDING',
                title: 'Area Only Boarding',
                publisherKind: 'OWNER_OFFICIAL',
                ownerVerified: true,
                visibility: 'AREA_ONLY',
                locationLabel: 'Katubedda North',
                entrance: null,
                distanceMeters: null,
                route: null,
                price: null,
                vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
                provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'Test fixture', verifiedAt: null },
              },
              summary: 'Area only advertisement',
              updatedAt: '2026-11-17T00:00:00Z',
            },
            policy: {
              dataKind: 'SYNTHETIC',
              authorizationStatus: 'LOCAL_TEST_AUTHORIZED',
              visibility: 'AREA_ONLY',
              localityConsent: true,
              publicMapConsent: false,
            },
          }];
        }
        if (id === propC) {
          // Student COMMUNITY_RECOMMENDATION
          return [{
            payload: {
              listing: {
                id: propC,
                listingId: '72000000-0000-4000-8000-000000000003',
                kind: 'BOARDING',
                title: 'Student Recommended Boarding',
                publisherKind: 'COMMUNITY_RECOMMENDATION',
                visibility: 'AREA_ONLY',
                locationLabel: 'Near University Gate',
                entrance: null,
                distanceMeters: null,
                route: null,
                price: null,
                vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
                disclaimer: 'Community-submitted, not owner-verified',
                provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'Test fixture', verifiedAt: null },
              },
              summary: 'Community recommendation ad',
              updatedAt: '2026-11-17T00:00:00Z',
            },
            policy: {
              dataKind: 'SYNTHETIC',
              authorizationStatus: 'UNVERIFIED',
              visibility: 'AREA_ONLY',
              localityConsent: true,
              publicMapConsent: false,
            },
          }];
        }
        return [];
      });

      try {
        // HIDDEN: entrance null, locationLabel null, distance null
        const resA = await request(app.getHttpServer()).get(`/api/v1/boardings/${propA}`).expect(200);
        expect(resA.headers['cache-control']).toBe('no-store');
        expect(resA.body.listing.entrance).toBeNull();
        expect(resA.body.listing.locationLabel).toBeNull();
        expect(resA.body.listing.distanceMeters).toBeNull();
        expect(resA.body.listing.route).toBeNull();

        // AREA_ONLY: entrance null, locationLabel string, distance null
        const resB = await request(app.getHttpServer()).get(`/api/v1/boardings/${propB}`).expect(200);
        expect(resB.body.listing.entrance).toBeNull();
        expect(resB.body.listing.locationLabel).toBe('Katubedda North');
        expect(resB.body.listing.distanceMeters).toBeNull();
        expect(resB.body.listing.route).toBeNull();

        // COMMUNITY_RECOMMENDATION: price null, vacancy UNKNOWN, entrance null, disclaimer present
        const resC = await request(app.getHttpServer()).get(`/api/v1/boardings/${propC}`).expect(200);
        expect(resC.body.listing.price).toBeNull();
        expect(resC.body.listing.vacancy).toEqual({ status: 'UNKNOWN', confirmedAt: null, expiresAt: null });
        expect(resC.body.listing.entrance).toBeNull();
        expect(resC.body.listing.disclaimer).toBe('Community-submitted, not owner-verified');
      } finally {
        await app.close();
      }
    });

    it('GET /api/v1/boardings/map returns ONLY consented public map pins, excluding private listings', async () => {
      const { app, calls } = await createTestApp({}, async (sql) => {
        if (sql.includes('public.boarding_public_entrances e')) {
          return [{
            id: propA,
            title: 'Consented Public Boarding',
            data_kind: 'SYNTHETIC',
            authorization_status: 'LOCAL_TEST_AUTHORIZED',
            public_map_consent: true,
            purpose: 'OWNER_SELECTED_PUBLIC_ENTRANCE',
            lat: 6.795,
            lng: 79.901,
          }];
        }
        return [];
      });

      try {
        const res = await request(app.getHttpServer())
          .get('/api/v1/boardings/map')
          .expect(200);

        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].id).toBe(propA);
        expect(res.body.items[0].entrance).toEqual({ lat: 6.795, lng: 79.901 });

        // SQL invariant check: must enforce PUBLIC_MAP and public_map_consent = true
        const mapSql = calls.find((c) => c.sql.includes('boarding_public_entrances'));
        expect(mapSql).toBeDefined();
        expect(mapSql?.sql).toContain("b.visibility='PUBLIC_MAP'");
        expect(mapSql?.sql).toContain('b.public_map_consent');
      } finally {
        await app.close();
      }
    });

    it('GET /api/v1/boardings/:id/nearby-essentials strictly refuses AREA_ONLY and HIDDEN with 404', async () => {
      const { app } = await createTestApp({}, async () => []);

      try {
        // Attempting to calculate essentials for private boarding returns 404
        const res = await request(app.getHttpServer())
          .get(`/api/v1/boardings/${propB}/nearby-essentials`)
          .expect(404);

        expect(res.body.error.code).toBe('NOT_FOUND');
      } finally {
        await app.close();
      }
    });

    it('GET /api/v1/boardings/compare cleanly segregates public essentials vs private nulls', async () => {
      const { app } = await createTestApp({}, async (sql, params) => {
        if (sql.includes('FROM public.boarding_properties b')) {
          const id = (params as unknown[])?.[1];
          if (id === propA) {
            return [{
              id: propA,
              title: 'Public Boarding A',
              publisher_kind: 'OWNER_OFFICIAL',
              visibility: 'PUBLIC_MAP',
              general_locality: null,
              locality_consent: false,
              public_map_consent: true,
              authorization_status: 'LOCAL_TEST_AUTHORIZED',
              summary: 'Public preview',
              updatedAt: '2026-11-17T00:00:00.000Z',
              lat: '6.795',
              lng: '79.901',
            }];
          }
          if (id === propB) {
            return [{
              id: propB,
              title: 'Area Boarding B',
              publisher_kind: 'OWNER_OFFICIAL',
              visibility: 'AREA_ONLY',
              general_locality: 'Katubedda North',
              locality_consent: true,
              public_map_consent: false,
              authorization_status: 'LOCAL_TEST_AUTHORIZED',
              summary: 'Area preview',
              updatedAt: '2026-11-17T00:00:00.000Z',
              lat: null,
              lng: null,
            }];
          }
        }
        if (sql.includes('FROM public.places p')) {
          // Places returned only for propA
          return [{
            id: '40000000-0000-4000-8000-000000000001',
            name: 'Campus Pharmacy',
            category: 'pharmacy',
            label: 'Pharmacy',
            nearestDistanceMeters: 140,
            count: 1,
          }];
        }
        return [];
      });

      try {
        const res = await request(app.getHttpServer())
          .get('/api/v1/boardings/compare')
          .query({ ids: `${propA},${propB}` })
          .expect(200);

        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.body.items).toHaveLength(2);

        // Public item has entrance and nearby essentials
        const publicItem = res.body.items.find((i: { id: string }) => i.id === propA);
        expect(publicItem.hasExactEntrance).toBe(true);
        expect(publicItem.entrance).toEqual({ lat: 6.795, lng: 79.901 });
        expect(publicItem.nearbyEssentials).not.toBeNull();

        // Area item strictly nullifies entrance and essentials
        const areaItem = res.body.items.find((i: { id: string }) => i.id === propB);
        expect(areaItem.hasExactEntrance).toBe(false);
        expect(areaItem.entrance).toBeNull();
        expect(areaItem.nearbyEssentials).toBeNull();
        expect(areaItem.locationLabel).toBe('Katubedda North');
      } finally {
        await app.close();
      }
    });
  });

  describe('Authorization & IDOR Boundaries (ADR-0003 & ADR-0005)', () => {
    it('denies student contributor on all owner write endpoints (prices, vacancies, visibility, media, contact)', async () => {
      const { app, calls } = await createTestApp({ SYNTHETIC_ACTOR: 'contributor' });
      try {
        // Attempt price update
        await request(app.getHttpServer())
          .post(`/api/v1/boardings/${propA}/prices`)
          .send({ expectedRevision: 0, unitId: '75000000-0000-4000-8000-000000000001', basis: 'ROOM', rentMonthly: 15000, verifiedSource: 'OWNER', effectiveAt: '2026-11-20T00:00:00.000Z' })
          .expect(403);

        // Attempt vacancy update
        await request(app.getHttpServer())
          .post(`/api/v1/boardings/${propA}/vacancy-confirmations`)
          .send({ expectedRevision: 0, unitId: '75000000-0000-4000-8000-000000000001', status: 'AVAILABLE', reason: 'Verified by owner' })
          .expect(403);

        // Attempt map visibility update
        await request(app.getHttpServer())
          .patch(`/api/v1/boardings/${propA}/visibility`)
          .send({ expectedRevision: 0, choice: { visibility: 'AREA_ONLY', locality: 'Katubedda' } })
          .expect(403);

        // Attempt private contact update
        await request(app.getHttpServer())
          .put(`/api/v1/owner/boardings/${propA}/privacy/contact`)
          .send({ expectedRevision: 0, contactFixture: 'fictional-contact-a', publicConsent: false, privacyAcknowledged: true })
          .expect(403);

        expect(calls).toEqual([]); // Zero DB mutations
      } finally {
        await app.close();
      }
    });

    it('enforces property-specific IDOR boundary: owner-a cannot mutate property B', async () => {
      const { app, calls } = await createTestApp({ SYNTHETIC_ACTOR: 'owner-a' });
      try {
        // owner-a targeting propB must fail with 403 Forbidden
        await request(app.getHttpServer())
          .post(`/api/v1/boardings/${propB}/prices`)
          .send({ expectedRevision: 0, unitId: '75000000-0000-4000-8000-000000000001', basis: 'ROOM', rentMonthly: 20000, verifiedSource: 'OWNER', effectiveAt: '2026-11-20T00:00:00.000Z' })
          .expect(403);

        await request(app.getHttpServer())
          .put(`/api/v1/owner/boardings/${propB}/privacy/contact`)
          .send({ expectedRevision: 0, contactFixture: 'fictional-contact-a', publicConsent: false, privacyAcknowledged: true })
          .expect(403);

        await request(app.getHttpServer())
          .get(`/api/v1/owner/boardings/${propB}/privacy/contact`)
          .expect(403);

        expect(calls).toEqual([]);
      } finally {
        await app.close();
      }
    });

    it('fails closed when ENABLE_SYNTHETIC_ACTORS is false (production simulation)', async () => {
      const { app, calls } = await createTestApp({
        ENABLE_SYNTHETIC_ACTORS: 'false',
        APP_ENV: 'production',
      });
      try {
        // In production or when synthetic actors are disabled, all protected writes reject with 401
        await request(app.getHttpServer())
          .post(`/api/v1/boardings/${propA}/prices`)
          .send({ expectedRevision: 0, unitId: '75000000-0000-4000-8000-000000000001', basis: 'ROOM', rentMonthly: 15000, verifiedSource: 'OWNER', effectiveAt: '2026-11-20T00:00:00.000Z' })
          .expect(401);

        await request(app.getHttpServer())
          .get(`/api/v1/owner/boardings/${propA}/privacy/overview`)
          .expect(401);

        expect(calls).toEqual([]);
      } finally {
        await app.close();
      }
    });
  });

  describe('Error Sanitization & Canary Leak Resistance', () => {
    it('never reflects canary strings or database internals in 400/404/500 errors', async () => {
      // 1. App where query returns empty (triggering 404)
      const { app: notFoundApp } = await createTestApp({}, async () => []);
      try {
        const canaryPayload = 'CANARY_PRIVATE_COORDINATES_6.795123_79.901456';

        // 400 Bad Request with malformed ID
        const res400 = await request(notFoundApp.getHttpServer())
          .get(`/api/v1/boardings/${canaryPayload}`)
          .expect(400);

        expect(JSON.stringify(res400.body)).not.toContain('unihood_private');
        expect(JSON.stringify(res400.body)).not.toContain('CANARY_PRIVATE_COORDINATES');

        // 404 Not Found
        const res404 = await request(notFoundApp.getHttpServer())
          .get(`/api/v1/boardings/00000000-0000-4000-8000-999999999999`)
          .expect(404);

        expect(JSON.stringify(res404.body)).not.toContain('unihood_private');
        expect(res404.body.error.message).toBe('The resource was not found.');
      } finally {
        await notFoundApp.close();
      }

      // 2. App where query throws an internal SQL error
      const { app: errorApp } = await createTestApp({}, async () => {
        throw new Error('INTERNAL_DB_ERROR_CANARY: SELECT * FROM unihood_private.boarding_locations');
      });
      try {
        const res500 = await request(errorApp.getHttpServer())
          .get(`/api/v1/boardings/00000000-0000-4000-8000-000000000001`)
          .expect(500);

        // Crucial security invariant: 500 error must NOT echo internal SQL or private table names
        expect(JSON.stringify(res500.body)).not.toContain('unihood_private');
        expect(JSON.stringify(res500.body)).not.toContain('INTERNAL_DB_ERROR_CANARY');
      } finally {
        await errorApp.close();
      }
    });
  });
});

describe('UNI-039 comparison authority and unavailable future surfaces', () => {
  it('never queries or serializes official unit facts for community recommendations', async () => {
    const { app, calls } = await createTestApp({}, async sql => {
      if (sql.includes('FROM public.boarding_units')) throw new Error('PRIVATE_UNIT_CANARY');
      if (sql.includes('FROM public.boarding_properties b')) return [{
        id: propA, title: 'Synthetic community recommendation', publisher_kind: 'COMMUNITY_RECOMMENDATION',
        visibility: 'HIDDEN', general_locality: null, locality_consent: false,
        public_map_consent: false, authorization_status: 'UNVERIFIED',
        summary: 'Synthetic recommendation only', updatedAt: '2026-11-18T00:00:00Z', lat: null, lng: null,
      }];
      return [];
    });
    try {
      const response = await request(app.getHttpServer()).get(`/api/v1/boardings/compare?ids=${propA}`).expect(200);
      expect(response.body.items[0].unitsSummary).toEqual([]);
      expect(response.body.items[0].price).toBeNull();
      expect(response.body.items[0].vacancy.status).toBe('UNKNOWN');
      expect(calls.some(c => c.sql.includes('FROM public.boarding_units'))).toBe(false);
    } finally { await app.close(); }
  });

  it('has no route, generic essentials or private lookup shortcut before their roadmap issues', async () => {
    const { app, calls } = await createTestApp();
    try {
      for (const path of ['/routes', '/essentials', '/search']) {
        const response = await request(app.getHttpServer()).get(`/api/v1${path}?boardingId=${propB}&lat=42.123456`).expect(404);
        expect(JSON.stringify(response.body)).not.toMatch(/42\.123456|unihood_private/);
      }
      expect(calls).toEqual([]);
    } finally { await app.close(); }
  });
});
