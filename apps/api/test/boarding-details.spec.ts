import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { UniversityRepository } from '../src/universities/university.repository';
import { SyntheticActors, syntheticConfig, SYNTHETIC_PROPERTY_A as a, SYNTHETIC_PROPERTY_B as b } from '../src/identity/synthetic-actors';

const enabled = {
  APP_ENV: 'test',
  NODE_ENV: 'test',
  ENABLE_SYNTHETIC_ACTORS: 'true',
  SYNTHETIC_ACTOR: 'owner-a',
};

async function setup(queryHandler: (sql: string, params?: unknown[]) => Promise<unknown[]>) {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const query = async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    return queryHandler(sql, params);
  };
  const m = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(UniversityRepository)
    .useValue({
      includeSynthetic: true,
      query,
      transaction: async () => {
        throw new Error('PRIVATE_CANARY');
      },
    })
    .overrideProvider(SyntheticActors)
    .useFactory({ factory: () => new SyntheticActors(syntheticConfig(enabled)) })
    .compile();

  const app = m.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, calls };
}

describe('UNI-038 Boarding Details, Nearby Essentials & Comparison', () => {
  it('GET /api/v1/boardings/:id/nearby-essentials returns essentials for PUBLIC_MAP', async () => {
    const { app, calls } = await setup(async (sql) => {
      if (sql.includes("FROM public.boarding_properties b")) {
        return [{
          place_id: a,
          title: 'Synthetic Owner Courtyard',
          lat: '6.795',
          lng: '79.901',
        }];
      }
      if (sql.includes("FROM public.places p")) {
        return [{
          id: '40000000-0000-4000-8000-000000000001',
          name: 'Synthetic Pharmacy',
          category: { code: 'pharmacy', label: 'Pharmacy' },
          location: { lat: 6.796, lng: 79.902 },
          distanceMeters: 140,
          provenance: {
            dataKind: 'SYNTHETIC',
            sourceLabel: 'UNI-021 synthetic fixture',
            verifiedAt: null,
          },
        }];
      }
      return [];
    });

    try {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/boardings/${a}/nearby-essentials`)
        .expect(200);

      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.boardingId).toBe(a);
      expect(res.body.visibility).toBe('PUBLIC_MAP');
      expect(res.body.entrance).toEqual({ lat: 6.795, lng: 79.901 });
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('Synthetic Pharmacy');
      expect(res.body.items[0].distanceMeters).toBe(140);

      // Verify privacy SQL guards
      expect(calls[0].sql).toContain("b.visibility = 'PUBLIC_MAP'");
      expect(calls[0].sql).toContain("b.public_map_consent = true");
      expect(calls[1].sql).toContain("ST_DWithin");
      expect(calls[1].sql).toContain("ST_Distance");
      expect(calls[1].sql).not.toContain("unihood_private");
    } finally {
      await app.close();
    }
  });

  it('GET /api/v1/boardings/:id/nearby-essentials returns 404 for AREA_ONLY or HIDDEN', async () => {
    const { app } = await setup(async () => {
      // Return empty because boarding is not PUBLIC_MAP or lacks consent
      return [];
    });

    try {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/boardings/${b}/nearby-essentials`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('The resource was not found.');
    } finally {
      await app.close();
    }
  });

  it('GET /api/v1/boardings/compare routes before :id and compares public vs private listings safely', async () => {
    const { app } = await setup(async (sql, params) => {
      if (sql.includes("FROM public.boarding_properties b")) {
        const id = (params as unknown[])?.[1];
        if (id === a) {
          return [{
            id: a,
            title: 'Synthetic Owner Courtyard',
            publisher_kind: 'OWNER_OFFICIAL',
            visibility: 'PUBLIC_MAP',
            general_locality: null,
            locality_consent: false,
            public_map_consent: true,
            authorization_status: 'LOCAL_TEST_AUTHORIZED',
            summary: 'Public preview summary.',
            updatedAt: '2026-11-17T00:00:00.000Z',
            lat: '6.795',
            lng: '79.901',
          }];
        }
        return [{
          id: b,
          title: 'Synthetic Quiet Nook',
          publisher_kind: 'OWNER_OFFICIAL',
          visibility: 'AREA_ONLY',
          general_locality: 'Synthetic Broad Locality',
          locality_consent: true,
          public_map_consent: false,
          authorization_status: 'LOCAL_TEST_AUTHORIZED',
          summary: 'Area preview summary.',
          updatedAt: '2026-11-17T00:00:00.000Z',
          lat: null,
          lng: null,
        }];
      }
      if (sql.includes("FROM public.boarding_units u")) {
        return [{
          id: '75000000-0000-4000-8000-000000000001',
          label: 'Single Room',
          template: 'STUDY_ROOM',
          capacity: 1,
          rentMinor: 2000000,
          basis: 'ROOM',
          vacancyStatus: 'AVAILABLE',
          confirmedAt: '2026-11-17T00:00:00.000Z',
          expiresAt: '2026-11-20T00:00:00.000Z',
        }];
      }
      if (sql.includes("GROUP BY c.code, c.label")) {
        return [{
          category: 'pharmacy',
          label: 'Pharmacy',
          count: 1,
          nearestDistanceMeters: 140,
        }];
      }
      return [];
    });

    try {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/boardings/compare?ids=${a},${b}`)
        .expect(200);

      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.requestedCount).toBe(2);
      expect(res.body.comparedCount).toBe(2);
      expect(res.body.items).toHaveLength(2);

      const publicItem = res.body.items.find((i: { id: string }) => i.id === a);
      const areaItem = res.body.items.find((i: { id: string }) => i.id === b);

      // Public map item has entrance and nearby essentials
      expect(publicItem.visibility).toBe('PUBLIC_MAP');
      expect(publicItem.hasExactEntrance).toBe(true);
      expect(publicItem.entrance).toEqual({ lat: 6.795, lng: 79.901 });
      expect(publicItem.nearbyEssentials).toHaveLength(1);
      expect(publicItem.price.rentMonthly).toBe(20000);

      // Area only item strictly has NO entrance or nearby essentials
      expect(areaItem.visibility).toBe('AREA_ONLY');
      expect(areaItem.hasExactEntrance).toBe(false);
      expect(areaItem.entrance).toBeNull();
      expect(areaItem.nearbyEssentials).toBeNull();
      expect(areaItem.locationLabel).toBe('Synthetic Broad Locality');
    } finally {
      await app.close();
    }
  });

  it('GET /api/v1/boardings/compare validates IDs and rejects invalid inputs with 400', async () => {
    const { app } = await setup(async () => []);
    try {
      await request(app.getHttpServer()).get('/api/v1/boardings/compare').expect(400);
      await request(app.getHttpServer()).get('/api/v1/boardings/compare?ids=').expect(400);
      await request(app.getHttpServer()).get('/api/v1/boardings/compare?ids=not-a-uuid').expect(400);
    } finally {
      await app.close();
    }
  });
});
