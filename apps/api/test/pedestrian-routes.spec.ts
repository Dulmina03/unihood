import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ServiceUnavailableException, type ArgumentsHost, type INestApplication } from '@nestjs/common';
import {
  ErrorResponseSchema,
  PublicRouteResponseSchema,
  type PedestrianAccessRequest,
  type PedestrianAccessResult,
  type PedestrianRoutingRequest,
  type PedestrianRoutingResult,
  type PedestrianRouteSegmentsRequest,
  type PedestrianRouteSegmentsResultUnion,
  type PedestrianRouteObservationsRequest,
  type PedestrianRouteObservationsResultUnion,
} from '@unihood/contracts';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { ApiExceptionFilter } from '../src/http/api-exception.filter';
import { RequestCancelledException } from '../src/http/request-cancelled.exception';
import { UniversityRepository } from '../src/universities/university.repository';
import { BoundedRoutingProvider } from '../src/routing/bounded-routing.provider';
import { DisabledRoutingProvider } from '../src/routing/disabled-routing.provider';
import { LocalFixtureRoutingProvider } from '../src/routing/local-fixture-routing.provider';
import type {
  PedestrianRoutingExecutionContext,
  PedestrianRoutingProvider,
} from '../src/routing/pedestrian-routing.provider';
import { PedestrianRoutesService } from '../src/routing/pedestrian-routes.service';
import { PEDESTRIAN_ROUTING_PROVIDER } from '../src/routing/routing.tokens';

const gateId = '30000000-0000-4000-8000-000000000001';
const secondaryGateId = '30000000-0000-4000-8000-000000000002';
const boardingId = '00000000-0000-4000-8000-000000000001';
const endpoint = { gate_lat: 0, gate_lng: 0, boarding_lat: 0, boarding_lng: 0 };

class CountingProvider implements PedestrianRoutingProvider {
  calls = 0;
  constructor(private readonly inner: PedestrianRoutingProvider) {}
  get providerId(): PedestrianRoutingProvider['providerId'] { return this.inner.providerId; }
  route(request: PedestrianRoutingRequest, context?: PedestrianRoutingExecutionContext): Promise<PedestrianRoutingResult> {
    this.calls += 1;
    return this.inner.route(request, context);
  }
  access(request: PedestrianAccessRequest, context?: PedestrianRoutingExecutionContext): Promise<PedestrianAccessResult> {
    this.calls += 1;
    return this.inner.access(request, context);
  }
  accessMany(requests: PedestrianAccessRequest[], context?: PedestrianRoutingExecutionContext, options?: { concurrency?: number; budgetMs?: number }): Promise<PedestrianAccessResult[]> {
    return this.inner.accessMany(requests, context, options);
  }
  segments(request: PedestrianRouteSegmentsRequest, context?: PedestrianRoutingExecutionContext): Promise<PedestrianRouteSegmentsResultUnion> {
    this.calls += 1;
    return this.inner.segments(request, context);
  }
  observations(request: PedestrianRouteObservationsRequest, context?: PedestrianRoutingExecutionContext): Promise<PedestrianRouteObservationsResultUnion> {
    this.calls += 1;
    return this.inner.observations(request, context);
  }
}

type SetupOptions = {
  row?: Record<string, unknown> | null;
  includeSynthetic?: boolean;
  provider?: PedestrianRoutingProvider;
};

async function setup(options: SetupOptions = {}) {
  const calls: { sql: string; values: unknown[] }[] = [];
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    return options.row ? [options.row] : [];
  };
  const counted = new CountingProvider(options.provider ?? new LocalFixtureRoutingProvider());
  const provider = new BoundedRoutingProvider(counted, 50);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(UniversityRepository)
    .useValue({
      includeSynthetic: options.includeSynthetic ?? true,
      query,
      transaction: async () => { throw new Error('PRIVATE_CANARY'); },
    })
    .overrideProvider(PEDESTRIAN_ROUTING_PROVIDER).useValue(provider)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, service: moduleRef.get(PedestrianRoutesService), counted, calls };
}

const url = (query: string) => `/api/v1/routes?${query}`;
const dayQuery = `gateId=${gateId}&boardingId=${boardingId}&timeContext=DAY`;

function expectUnavailable(body: unknown, reason: string) {
  const parsed = PublicRouteResponseSchema.parse(body);
  expect(parsed.status).toBe('UNAVAILABLE');
  if (parsed.status !== 'UNAVAILABLE') throw new Error('Expected unavailable route');
  expect(parsed.reason).toBe(reason);
  expect(JSON.stringify(parsed)).not.toMatch(/geometry|distanceMeters|durationSeconds|options/);
}

describe('UNI-051 public pedestrian routes', () => {
  let app: INestApplication;
  let counted: CountingProvider;
  let calls: { sql: string; values: unknown[] }[];

  beforeEach(async () => {
    const result = await setup({ row: endpoint });
    app = result.app;
    counted = result.counted;
    calls = result.calls;
  });

  afterEach(async () => { await app.close(); });

  it('returns the deterministic day fixture with alternatives by default', async () => {
    const response = await request(app.getHttpServer()).get(url(dayQuery)).expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = PublicRouteResponseSchema.parse(response.body);
    expect(body.status).toBe('AVAILABLE');
    if (body.status !== 'AVAILABLE') throw new Error('Expected available route');
    expect(body.gateId).toBe(gateId);
    expect(body.boardingId).toBe(boardingId);
    expect(body.sourceVersion).toBe('uni-050-synthetic-routes-v1');
    expect(body.options.map((option) => option.routeId)).toEqual([
      'synthetic-primary-day-a',
      'synthetic-primary-day-b',
    ]);
    expect(body.options.every((option) => option.provenance.dataKind === 'SYNTHETIC' && option.provenance.verifiedAt === null)).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/origin|destination|42\.123456|43\.654321|exact_geo|address_enc|actor_ref|consent_at|revision|listingId/i);
    expect(counted.calls).toBe(1);
  });

  it('honours includeAlternatives=false and the night time context', async () => {
    const single = await request(app.getHttpServer()).get(url(`${dayQuery}&includeAlternatives=false`)).expect(200);
    const singleBody = PublicRouteResponseSchema.parse(single.body);
    if (singleBody.status !== 'AVAILABLE') throw new Error('Expected available route');
    expect(singleBody.options.map((option) => option.routeId)).toEqual(['synthetic-primary-day-a']);

    const night = await request(app.getHttpServer()).get(url(`gateId=${gateId}&boardingId=${boardingId}&timeContext=NIGHT`)).expect(200);
    const nightBody = PublicRouteResponseSchema.parse(night.body);
    if (nightBody.status !== 'AVAILABLE') throw new Error('Expected available route');
    expect(nightBody.options.map((option) => option.routeId)).toEqual(['synthetic-primary-night-a']);
  });

  it('returns a typed no-route result without metrics for the established fixture', async () => {
    const response = await request(app.getHttpServer())
      .get(url(`gateId=${secondaryGateId}&boardingId=${boardingId}&timeContext=DAY`))
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expectUnavailable(response.body, 'NO_ROUTE');
  });

  it('resolves both endpoints in one bounded eligibility statement using public coordinates only', async () => {
    await request(app.getHttpServer()).get(url(dayQuery)).expect(200);
    expect(calls).toHaveLength(1);
    const [{ sql, values }] = calls;
    expect(values).toEqual([true, boardingId, gateId]);
    for (const predicate of [
      "p.kind='BOARDING'",
      "p.status='ACTIVE'",
      'p.merged_into IS NULL',
      "b.visibility='PUBLIC_MAP'",
      "b.authorization_status='LOCAL_TEST_AUTHORIZED'",
      'b.public_map_consent',
      'b.map_consent_at=e.consent_at',
      "l.publisher_kind='OWNER_OFFICIAL'",
      "l.publication_status='PUBLISHED'",
      'l.is_current',
      "l.visibility_snapshot='PUBLIC_MAP'",
      "a.visibility='PUBLIC_MAP'",
      "e.purpose='OWNER_SELECTED_PUBLIC_ENTRANCE'",
      'g.status=\'ACTIVE\'',
      'c.status=\'ACTIVE\'',
      'u.status=\'ACTIVE\'',
    ]) expect(sql).toContain(predicate);
    expect(sql).not.toMatch(/unihood_private|exact_geo|address_enc|ST_Distance|boarding_locations/);
    expect(sql).toContain('ST_Y(e.entrance_geo)');
    expect(sql).toContain('ST_Y(g.geo)');
  });

  it('fails closed with a generic 404 and no provider call when either endpoint is not eligible', async () => {
    const denied = await setup({ row: null });
    try {
      const response = await request(denied.app.getHttpServer()).get(url(dayQuery)).expect(404);
      expect(ErrorResponseSchema.parse(response.body).error.code).toBe('NOT_FOUND');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(denied.counted.calls).toBe(0);
      expect(JSON.stringify(response.body)).not.toMatch(/visibility|consent|PUBLIC_MAP|synthetic|CODE/);
      expect(denied.calls).toHaveLength(1);
    } finally { await denied.app.close(); }
  });

  it('applies the same generic denial to unknown, inactive, hidden, area-only and unpublished cases', async () => {
    const denied = await setup({ row: null });
    try {
      const bodies: unknown[] = [];
      for (const query of [
        `gateId=${secondaryGateId}&boardingId=${boardingId}&timeContext=DAY`,
        `gateId=${gateId}&boardingId=${boardingId}&timeContext=NIGHT`,
        `gateId=${gateId}&boardingId=71000000-0000-4000-8000-000000000002&timeContext=DAY`,
      ]) {
        const response = await request(denied.app.getHttpServer()).get(url(query)).expect(404);
        bodies.push(ErrorResponseSchema.parse(response.body).error);
      }
      const [first] = bodies as { code: string; message: string }[];
      expect(bodies.map((body) => (body as { message: string }).message)).toEqual([first.message, first.message, first.message]);
      expect(denied.counted.calls).toBe(0);
    } finally { await denied.app.close(); }
  });

  it('passes the deployed synthetic-exclusion flag and never invokes the provider', async () => {
    const denied = await setup({ row: null, includeSynthetic: false });
    try {
      await request(denied.app.getHttpServer()).get(url(dayQuery)).expect(404);
      expect(denied.calls[0]?.values[0]).toBe(false);
      expect(denied.counted.calls).toBe(0);
    } finally { await denied.app.close(); }
  });

  it.each([
    ['missing gateId', `boardingId=${boardingId}&timeContext=DAY`],
    ['missing boardingId', `gateId=${gateId}&timeContext=DAY`],
    ['missing timeContext', `gateId=${gateId}&boardingId=${boardingId}`],
    ['malformed gate uuid', `gateId=nope&boardingId=${boardingId}&timeContext=DAY`],
    ['malformed boarding uuid', `gateId=${gateId}&boardingId=nope&timeContext=DAY`],
    ['invalid time context', `gateId=${gateId}&boardingId=${boardingId}&timeContext=EVENING`],
    ['invalid boolean', `${dayQuery}&includeAlternatives=yes`],
    ['unknown parameter', `${dayQuery}&latitude=0`],
    ['repeated parameter', `${dayQuery}&gateId=${secondaryGateId}`],
  ])('rejects %s before touching the database or provider', async (_label, query) => {
    const response = await request(app.getHttpServer()).get(url(query)).expect(400);
    expect(ErrorResponseSchema.parse(response.body).error.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(response.body)).not.toMatch(/latitude|EVENING|nope/);
    expect(calls).toHaveLength(0);
    expect(counted.calls).toBe(0);
  });

  it('maps every operational provider outcome to the redacted 503 envelope', async () => {
    const cases: [string, PedestrianRoutingProvider][] = [
      ['disabled', new DisabledRoutingProvider()],
      ['timeout', new BoundedRoutingProvider({ providerId: 'LOCAL_FIXTURE', route: () => new Promise(() => {}), access: () => new Promise(() => {}), accessMany: async () => [], segments: () => new Promise(() => {}), observations: () => new Promise(() => {}) }, 10)],
      ['exception', new BoundedRoutingProvider({ providerId: 'LOCAL_FIXTURE', route: async () => { throw new Error('PRIVATE_UPSTREAM_CANARY'); }, access: async () => { throw new Error('PRIVATE_UPSTREAM_CANARY'); }, accessMany: async () => [], segments: async () => { throw new Error('PRIVATE_UPSTREAM_CANARY'); }, observations: async () => { throw new Error('PRIVATE_UPSTREAM_CANARY'); } }, 50)],
      ['invalid', new BoundedRoutingProvider({ providerId: 'LOCAL_FIXTURE', route: async () => ({ status: 'AVAILABLE', timeContext: 'DAY', providerId: 'LOCAL_FIXTURE', sourceVersion: 'v', options: [] } as unknown as PedestrianRoutingResult), access: async () => ({ status: 'AVAILABLE' as const } as unknown as PedestrianAccessResult), accessMany: async () => [], segments: async () => ({ status: 'AVAILABLE' as const } as unknown as PedestrianRouteSegmentsResultUnion), observations: async () => ({ status: 'AVAILABLE' as const } as unknown as PedestrianRouteObservationsResultUnion) }, 50)],
    ];
    for (const [label, provider] of cases) {
      const current = await setup({ row: endpoint, provider });
      try {
        const response = await request(current.app.getHttpServer()).get(url(dayQuery)).expect(503);
        const body = ErrorResponseSchema.parse(response.body);
        expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
        expect(response.headers['cache-control']).toBe('no-store');
        expect(JSON.stringify(body)).not.toMatch(/PRIVATE_UPSTREAM_CANARY|stack|postgres|geometry|distanceMeters/);
        expect(current.counted.calls).toBeLessThanOrEqual(1);
      } finally { await current.app.close(); }
      expect(label).toBeTruthy();
    }
  });

  it('ends silently, without a response attempt or provider call, when the request is already cancelled', async () => {
    const current = await setup({ row: endpoint });
    try {
      const abort = new AbortController();
      abort.abort();
      await expect(current.service.route({ gateId, boardingId, timeContext: 'DAY' }, abort.signal)).rejects.toBeInstanceOf(RequestCancelledException);
      expect(current.counted.calls).toBe(0);
      const host = { switchToHttp: () => { throw new Error('NO_RESPONSE_ATTEMPT'); } } as unknown as ArgumentsHost;
      expect(() => new ApiExceptionFilter().catch(new RequestCancelledException(), host)).not.toThrow();
    } finally { await current.app.close(); }
  });

  it('ends silently when the provider reports cancellation for an in-flight request', async () => {
    const provider: PedestrianRoutingProvider = {
      providerId: 'LOCAL_FIXTURE',
      route: async () => ({ status: 'UNAVAILABLE', timeContext: 'DAY', providerId: 'LOCAL_FIXTURE', reason: 'CANCELLED' }),
      access: async () => ({ status: 'UNAVAILABLE', providerId: 'LOCAL_FIXTURE', reason: 'CANCELLED' }),
      accessMany: async () => [],
      segments: async () => ({ status: 'UNAVAILABLE', gateId: '', boardingId: '', timeContext: 'DAY', providerId: 'LOCAL_FIXTURE', reason: 'CANCELLED' }),
      observations: async () => ({ status: 'UNAVAILABLE', gateId: '', boardingId: '', timeContext: 'DAY', providerId: 'LOCAL_FIXTURE', reason: 'CANCELLED' }),
    };
    const current = await setup({ row: endpoint, provider });
    try {
      await expect(current.service.route({ gateId, boardingId, timeContext: 'DAY' })).rejects.toBeInstanceOf(RequestCancelledException);
      expect(current.counted.calls).toBe(1);
    } finally { await current.app.close(); }
  });

  it('still writes the redacted 503 envelope for non-cancellation operational failures', () => {
    const calls: string[] = [];
    const response = {
      setHeader: () => calls.push('header'),
      status: () => ({ json: () => calls.push('body') }),
    };
    const host = {
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => response }),
    } as unknown as ArgumentsHost;
    new ApiExceptionFilter().catch(new ServiceUnavailableException(), host);
    expect(calls).toEqual(['header', 'header', 'header', 'body']);
  });
});
