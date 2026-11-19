import { describe, expect, it } from 'vitest';
import {
  PedestrianRoutingRequestSchema,
  PedestrianRoutingResultSchema,
  type PedestrianRoutingRequest,
  type PedestrianRoutingResult,
} from './route';

const gateId = '30000000-0000-4000-8000-000000000001';
const boardingId = '00000000-0000-4000-8000-000000000001';
const sourceVersion = 'uni-050-synthetic-routes-v1';
const sourceLabel = 'UNI-050 synthetic route fixture; fictional path, distance and time';

const request: PedestrianRoutingRequest = {
  origin: { gateId, coordinate: { lat: 0, lng: 0 } },
  destination: { boardingId, coordinate: { lat: 0.0006, lng: 0.0008 } },
  timeContext: 'DAY',
  includeAlternatives: true,
};

function available(overrides: Record<string, unknown> = {}): PedestrianRoutingResult {
  return PedestrianRoutingResultSchema.parse({
    status: 'AVAILABLE',
    timeContext: 'DAY',
    providerId: 'LOCAL_FIXTURE',
    sourceVersion,
    options: [
      {
        routeId: 'synthetic-primary-day-a',
        label: 'Synthetic daytime option A',
        geometry: { type: 'LineString', coordinates: [[0, 0], [0.0002, 0.0002], [0.0008, 0.0006]] },
        distanceMeters: 112,
        durationSeconds: 95,
        provenance: { dataKind: 'SYNTHETIC', provider: 'LOCAL_FIXTURE', sourceVersion, sourceLabel, verifiedAt: null },
      },
    ],
    ...overrides,
  });
}

describe('UNI-050 pedestrian routing provider contracts', () => {
  it('accepts a strict synthetic provider request without client-selected provider settings', () => {
    expect(PedestrianRoutingRequestSchema.safeParse(request).success).toBe(true);
    for (const extra of [
      { provider: 'LOCAL_FIXTURE' },
      { providerUrl: 'https://example.invalid' },
      { origin: { gateId, coordinate: { lat: 0, lng: 0 }, label: 'real place' } },
      { destination: { boardingId, coordinate: { lat: 0, lng: 0 }, visibility: 'HIDDEN' } },
    ]) {
      expect(PedestrianRoutingRequestSchema.safeParse({ ...request, ...extra }).success).toBe(false);
    }
  });

  it('accepts available synthetic routes with matching provenance', () => {
    const value = available();
    expect(value.status).toBe('AVAILABLE');
    if (value.status !== 'AVAILABLE') throw new Error('Expected available route');
    expect(value.options).toHaveLength(1);
    expect(value.options[0]?.provenance.sourceVersion).toBe(value.sourceVersion);
  });

  it('rejects malformed geometry metrics and unsafe provenance', () => {
    const base = available();
    if (base.status !== 'AVAILABLE') throw new Error('Expected available route');
    const option = base.options[0]!;
    for (const badOption of [
      { ...option, geometry: { type: 'LineString', coordinates: [[0, 0]] } },
      { ...option, geometry: { type: 'LineString', coordinates: [[0, 0], [181, 0]] } },
      { ...option, distanceMeters: 0 },
      { ...option, distanceMeters: -1 },
      { ...option, durationSeconds: Number.NaN },
      { ...option, durationSeconds: Number.POSITIVE_INFINITY },
      { ...option, provenance: { ...option.provenance, dataKind: 'VERIFIED' } },
      { ...option, provenance: { ...option.provenance, sourceLabel: 'Real verified route' } },
      { ...option, provenance: { ...option.provenance, sourceVersion: 'different-version' } },
      { ...option, safe: true },
    ]) {
      expect(PedestrianRoutingResultSchema.safeParse({ ...base, options: [badOption] }).success).toBe(false);
    }
  });

  it('rejects partial or duplicate available responses', () => {
    expect(PedestrianRoutingResultSchema.safeParse({ ...available(), options: [] }).success).toBe(false);
    const base = available();
    if (base.status !== 'AVAILABLE') throw new Error('Expected available route');
    expect(PedestrianRoutingResultSchema.safeParse({ ...base, options: [base.options[0], base.options[0]] }).success).toBe(false);
    expect(PedestrianRoutingResultSchema.safeParse({ ...base, options: base.options.concat(base.options, base.options, base.options) }).success).toBe(false);
  });

  it('keeps unavailable responses free of invented route metrics', () => {
    const unavailable = {
      status: 'UNAVAILABLE',
      timeContext: 'NIGHT',
      providerId: 'LOCAL_FIXTURE',
      reason: 'NO_ROUTE',
    } as const;
    expect(PedestrianRoutingResultSchema.safeParse(unavailable).success).toBe(true);
    for (const extra of [
      { distanceMeters: 120 },
      { durationSeconds: 100 },
      { geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
      { options: [] },
    ]) {
      expect(PedestrianRoutingResultSchema.safeParse({ ...unavailable, ...extra }).success).toBe(false);
    }
  });

  it('constrains disabled-provider results to the disabled reason', () => {
    expect(PedestrianRoutingResultSchema.safeParse({
      status: 'UNAVAILABLE',
      timeContext: 'DAY',
      providerId: 'DISABLED',
      reason: 'PROVIDER_DISABLED',
    }).success).toBe(true);
    expect(PedestrianRoutingResultSchema.safeParse({
      status: 'UNAVAILABLE',
      timeContext: 'DAY',
      providerId: 'DISABLED',
      reason: 'NO_ROUTE',
    }).success).toBe(false);
    expect(PedestrianRoutingResultSchema.safeParse({
      status: 'UNAVAILABLE',
      timeContext: 'DAY',
      providerId: 'LOCAL_FIXTURE',
      reason: 'PROVIDER_DISABLED',
    }).success).toBe(false);
  });
});
