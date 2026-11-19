import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type {
  PedestrianRoutingRequest,
  PedestrianRoutingResult,
} from '@unihood/contracts';
import { SyntheticRoutingFixtureSchema } from '@unihood/contracts';
import { AppModule } from '../src/app.module';
import { BoundedRoutingProvider } from '../src/routing/bounded-routing.provider';
import { DisabledRoutingProvider } from '../src/routing/disabled-routing.provider';
import fixtureInput from '../src/routing/fixtures/synthetic-routes.v1.json';
import { LocalFixtureRoutingProvider } from '../src/routing/local-fixture-routing.provider';
import type { PedestrianRoutingProvider } from '../src/routing/pedestrian-routing.provider';
import { createPedestrianRoutingProvider, routingProviderKind } from '../src/routing/routing.config';
import { PEDESTRIAN_ROUTING_PROVIDER } from '../src/routing/routing.tokens';

const gateId = '30000000-0000-4000-8000-000000000001';
const secondaryGateId = '30000000-0000-4000-8000-000000000002';
const boardingId = '00000000-0000-4000-8000-000000000001';
const fixture = SyntheticRoutingFixtureSchema.parse(fixtureInput);

const request: PedestrianRoutingRequest = {
  origin: { gateId, coordinate: { lat: 0, lng: 0 } },
  destination: { boardingId, coordinate: { lat: 0.0006, lng: 0.0008 } },
  timeContext: 'DAY',
  includeAlternatives: true,
};

function unavailableReason(result: PedestrianRoutingResult): string {
  if (result.status !== 'UNAVAILABLE') throw new Error('Expected unavailable result');
  return result.reason;
}

describe('UNI-050 local deterministic pedestrian routing fixtures', () => {
  it('returns identical normalized results for identical requests', async () => {
    const provider = new LocalFixtureRoutingProvider();
    const first = await provider.route(request);
    const second = await provider.route(structuredClone(request));
    expect(second).toEqual(first);
    expect(first.status).toBe('AVAILABLE');
    if (first.status !== 'AVAILABLE') throw new Error('Expected available route');
    expect(first.sourceVersion).toBe('uni-050-synthetic-routes-v1');
    expect(first.options.map((option) => option.routeId)).toEqual([
      'synthetic-primary-day-a',
      'synthetic-primary-day-b',
    ]);
    expect(first.options.every((option) => option.provenance.dataKind === 'SYNTHETIC')).toBe(true);
  });

  it('honours day/night context and alternatives without inventing extra options', async () => {
    const provider = new LocalFixtureRoutingProvider();
    const night = await provider.route({ ...request, timeContext: 'NIGHT' });
    expect(night.status).toBe('AVAILABLE');
    if (night.status !== 'AVAILABLE') throw new Error('Expected available route');
    expect(night.options.map((option) => option.routeId)).toEqual(['synthetic-primary-night-a']);

    const single = await provider.route({ ...request, includeAlternatives: false });
    expect(single.status).toBe('AVAILABLE');
    if (single.status !== 'AVAILABLE') throw new Error('Expected available route');
    expect(single.options.map((option) => option.routeId)).toEqual(['synthetic-primary-day-a']);
  });

  it('uses exact keys only and never falls back to a nearby or guessed route', async () => {
    const provider = new LocalFixtureRoutingProvider();
    expect(unavailableReason(await provider.route({
      ...request,
      origin: { gateId: secondaryGateId, coordinate: { lat: 0.001, lng: 0.001 } },
    }))).toBe('NO_ROUTE');
    expect(unavailableReason(await provider.route({
      ...request,
      origin: { gateId: '30000000-0000-4000-8000-000000000099', coordinate: { lat: 0, lng: 0 } },
    }))).toBe('NO_ROUTE');
    expect(unavailableReason(await provider.route({
      ...request,
      destination: { boardingId: '00000000-0000-4000-8000-000000000099', coordinate: { lat: 0.0006, lng: 0.0008 } },
    }))).toBe('NO_ROUTE');
  });

  it('normalizes pre-aborted calls without returning a partial route', async () => {
    const provider = new LocalFixtureRoutingProvider();
    const controller = new AbortController();
    controller.abort();
    const result = await provider.route(request, { signal: controller.signal });
    expect(unavailableReason(result)).toBe('CANCELLED');
    expect(result).not.toHaveProperty('options');
    expect(result).not.toHaveProperty('distanceMeters');
    expect(result).not.toHaveProperty('durationSeconds');
  });

  it('rejects malformed fixtures, duplicate keys and duplicate route ids', () => {
    expect(() => new LocalFixtureRoutingProvider({ fixtureVersion: 'bad' })).toThrow();
    const duplicateKey = structuredClone(fixture);
    duplicateKey.cases.push(structuredClone(duplicateKey.cases[0]!));
    expect(() => new LocalFixtureRoutingProvider(duplicateKey)).toThrow();

    const duplicateRoute = structuredClone(fixture);
    const first = duplicateRoute.cases[0];
    if (first.status !== 'AVAILABLE') throw new Error('Expected fixture route');
    first.options[1]!.routeId = first.options[0]!.routeId;
    expect(() => new LocalFixtureRoutingProvider(duplicateRoute)).toThrow();

    const badGeometry = structuredClone(fixture);
    const geometryCase = badGeometry.cases[0];
    if (geometryCase.status !== 'AVAILABLE') throw new Error('Expected fixture route');
    geometryCase.options[0]!.geometry.coordinates = [[0, 0]];
    expect(() => new LocalFixtureRoutingProvider(badGeometry)).toThrow();

    const badMetric = structuredClone(fixture);
    const metricCase = badMetric.cases[0];
    if (metricCase.status !== 'AVAILABLE') throw new Error('Expected fixture route');
    metricCase.options[0]!.durationSeconds = 0;
    expect(() => new LocalFixtureRoutingProvider(badMetric)).toThrow();
  });

  it('audits fixtures for privacy canaries, unsafe claims and non-synthetic labels', () => {
    const text = JSON.stringify(fixture);
    expect(text).not.toMatch(/PRIVATE_CANARY|42\.123456|43\.654321|exact_geo|address_enc/);
    expect(text).not.toMatch(/synthetic:(?:owner|contributor|operator)/);
    expect(text).not.toMatch(/@|\+94|phone|email/i);
    expect(text).not.toMatch(/\b(?:safe|safest|safetyScore)\b/i);
    for (const item of fixture.cases) {
      if (item.status === 'AVAILABLE') {
        for (const option of item.options) {
          expect(option.distanceMeters).toBeGreaterThan(0);
          expect(option.durationSeconds).toBeGreaterThan(0);
          expect(option.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
          expect(option.routeId).toMatch(/^synthetic-/);
        }
      }
    }
    const parsed = new LocalFixtureRoutingProvider(fixture);
    expect(parsed.providerId).toBe('LOCAL_FIXTURE');
  });

  it('makes no external network request', async () => {
    const originalFetch = global.fetch;
    let fetchCalls = 0;
    global.fetch = (() => {
      fetchCalls += 1;
      return Promise.reject(new Error('network forbidden'));
    }) as typeof fetch;
    try {
      const provider = new LocalFixtureRoutingProvider();
      await provider.route(request);
      expect(fetchCalls).toBe(0);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('UNI-050 provider boundary and configuration', () => {
  it('returns a typed unavailable result when routing is disabled', async () => {
    const result = await new DisabledRoutingProvider().route(request);
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.providerId).toBe('DISABLED');
    expect(unavailableReason(result)).toBe('PROVIDER_DISABLED');
  });

  it('normalizes provider exceptions to PROVIDER_ERROR without raw details', async () => {
    const failing: PedestrianRoutingProvider = {
      providerId: 'LOCAL_FIXTURE',
      route: async () => { throw new Error('PRIVATE_UPSTREAM_CANARY'); },
    };
    const result = await new BoundedRoutingProvider(failing, 100).route(request);
    expect(unavailableReason(result)).toBe('PROVIDER_ERROR');
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_UPSTREAM_CANARY|stack|postgres/);
  });

  it('normalizes timeouts and external cancellation at the execution boundary', async () => {
    const stalled: PedestrianRoutingProvider = {
      providerId: 'LOCAL_FIXTURE',
      route: () => new Promise(() => {}),
    };
    const timeout = await new BoundedRoutingProvider(stalled, 10).route(request);
    expect(unavailableReason(timeout)).toBe('TIMEOUT');

    const controller = new AbortController();
    const pending = new BoundedRoutingProvider(stalled, 1000).route(request, { signal: controller.signal });
    controller.abort();
    expect(unavailableReason(await pending)).toBe('CANCELLED');
  });

  it('rejects malformed available provider responses wholly', async () => {
    const malformed: PedestrianRoutingProvider = {
      providerId: 'LOCAL_FIXTURE',
      route: async () => ({
        status: 'AVAILABLE',
        timeContext: 'DAY',
        providerId: 'LOCAL_FIXTURE',
        sourceVersion: 'uni-050-synthetic-routes-v1',
        options: [],
      } as unknown as PedestrianRoutingResult),
    };
    const result = await new BoundedRoutingProvider(malformed, 100).route(request);
    expect(unavailableReason(result)).toBe('INVALID_RESPONSE');
    expect(result).not.toHaveProperty('options');
  });

  it('enables the fixture provider only in explicit loopback local/test configuration', () => {
    expect(routingProviderKind({ ROUTING_PROVIDER: 'local-fixture', APP_ENV: 'test', NODE_ENV: 'test', API_HOST: '127.0.0.1' })).toBe('local-fixture');
    expect(routingProviderKind({ ROUTING_PROVIDER: 'local-fixture', APP_ENV: 'local', API_HOST: '127.0.0.1' })).toBe('local-fixture');
    expect(routingProviderKind({ ROUTING_PROVIDER: 'local-fixture', APP_ENV: 'production', NODE_ENV: 'production', API_HOST: '127.0.0.1' })).toBe('disabled');
    expect(routingProviderKind({ ROUTING_PROVIDER: 'local-fixture', APP_ENV: 'test', NODE_ENV: 'test', API_HOST: '0.0.0.0' })).toBe('disabled');
    expect(routingProviderKind({ ROUTING_PROVIDER: 'unknown', APP_ENV: 'test', NODE_ENV: 'test' })).toBe('disabled');
    expect(createPedestrianRoutingProvider({ ROUTING_PROVIDER: 'disabled' }).providerId).toBe('DISABLED');
  });

  it('injects the disabled provider by default through the Nest application module', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    try {
      const provider = moduleRef.get<PedestrianRoutingProvider>(PEDESTRIAN_ROUTING_PROVIDER);
      expect(provider.providerId).toBe('DISABLED');
      const result = await provider.route(request);
      expect(unavailableReason(result)).toBe('PROVIDER_DISABLED');
    } finally {
      await moduleRef.close();
    }
  });
});
