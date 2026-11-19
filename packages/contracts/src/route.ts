import { z } from 'zod';
import { RouteTimeContextSchema } from './enums';
import { PublicIdSchema } from './rest';

const label = z.string().trim().min(1).max(160);
const sourceVersion = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const routeId = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const RouteCoordinateSchema = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type RouteCoordinate = z.infer<typeof RouteCoordinateSchema>;

export const PedestrianRouteGeometrySchema = z.strictObject({
  type: z.literal('LineString'),
  coordinates: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(2)
    .max(5000),
});
export type PedestrianRouteGeometry = z.infer<typeof PedestrianRouteGeometrySchema>;

export const PedestrianRouteProvenanceSchema = z.strictObject({
  dataKind: z.literal('SYNTHETIC'),
  provider: z.literal('LOCAL_FIXTURE'),
  sourceVersion,
  sourceLabel: label.refine((value) => /synthetic/i.test(value), 'Synthetic provenance label required'),
  verifiedAt: z.null(),
});
export type PedestrianRouteProvenance = z.infer<typeof PedestrianRouteProvenanceSchema>;

export const PedestrianRouteOptionSchema = z.strictObject({
  routeId,
  label,
  geometry: PedestrianRouteGeometrySchema,
  distanceMeters: z.number().int().positive().max(50000),
  durationSeconds: z.number().int().positive().max(21600),
  provenance: PedestrianRouteProvenanceSchema,
});
export type PedestrianRouteOption = z.infer<typeof PedestrianRouteOptionSchema>;

export const PedestrianRoutingRequestSchema = z.strictObject({
  origin: z.strictObject({
    gateId: PublicIdSchema,
    coordinate: RouteCoordinateSchema,
  }),
  destination: z.strictObject({
    boardingId: PublicIdSchema,
    coordinate: RouteCoordinateSchema,
  }),
  timeContext: RouteTimeContextSchema,
  includeAlternatives: z.boolean(),
});
export type PedestrianRoutingRequest = z.infer<typeof PedestrianRoutingRequestSchema>;

export const SyntheticRouteFixtureOptionSchema = z.strictObject({
  routeId,
  label,
  geometry: PedestrianRouteGeometrySchema,
  distanceMeters: z.number().int().positive().max(50000),
  durationSeconds: z.number().int().positive().max(21600),
});
export type SyntheticRouteFixtureOption = z.infer<typeof SyntheticRouteFixtureOptionSchema>;

export const SyntheticRouteFixtureCaseSchema = z
  .discriminatedUnion('status', [
    z.strictObject({
      gateId: PublicIdSchema,
      boardingId: PublicIdSchema,
      timeContext: RouteTimeContextSchema,
      status: z.literal('AVAILABLE'),
      options: z.array(SyntheticRouteFixtureOptionSchema).min(1).max(3),
    }),
    z.strictObject({
      gateId: PublicIdSchema,
      boardingId: PublicIdSchema,
      timeContext: RouteTimeContextSchema,
      status: z.literal('UNAVAILABLE'),
      reason: z.enum(['NO_ROUTE', 'UNSUPPORTED_TIME_CONTEXT']),
    }),
  ])
  .superRefine((value, context) => {
    if (value.status !== 'AVAILABLE') return;
    const ids = new Set<string>();
    for (const [index, option] of value.options.entries()) {
      if (ids.has(option.routeId)) {
        context.addIssue({
          code: 'custom',
          message: 'Fixture route option identifiers must be unique.',
          path: ['options', index, 'routeId'],
        });
      }
      ids.add(option.routeId);
    }
  });
export type SyntheticRouteFixtureCase = z.infer<typeof SyntheticRouteFixtureCaseSchema>;

export const SyntheticRoutingFixtureSchema = z
  .strictObject({
    fixtureVersion: sourceVersion,
    dataKind: z.literal('SYNTHETIC'),
    sourceLabel: label.refine((value) => /synthetic/i.test(value), 'Synthetic fixture label required'),
    cases: z.array(SyntheticRouteFixtureCaseSchema).min(1).max(100),
  })
  .superRefine((value, context) => {
    const keys = new Set<string>();
    for (const [index, item] of value.cases.entries()) {
      const key = `${item.gateId}\u0000${item.boardingId}\u0000${item.timeContext}`;
      if (keys.has(key)) {
        context.addIssue({
          code: 'custom',
          message: 'Fixture gate, boarding and time-context keys must be unique.',
          path: ['cases', index],
        });
      }
      keys.add(key);
    }
  });
export type SyntheticRoutingFixture = z.infer<typeof SyntheticRoutingFixtureSchema>;

export const RoutingUnavailableReasonSchema = z.enum([
  'NO_ROUTE',
  'PROVIDER_DISABLED',
  'CANCELLED',
  'TIMEOUT',
  'PROVIDER_ERROR',
  'INVALID_RESPONSE',
  'UNSUPPORTED_TIME_CONTEXT',
]);
export type RoutingUnavailableReason = z.infer<typeof RoutingUnavailableReasonSchema>;

export const PedestrianRoutingResultSchema = z
  .discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('AVAILABLE'),
      timeContext: RouteTimeContextSchema,
      providerId: z.literal('LOCAL_FIXTURE'),
      sourceVersion,
      options: z.array(PedestrianRouteOptionSchema).min(1).max(3),
    }),
    z.strictObject({
      status: z.literal('UNAVAILABLE'),
      timeContext: RouteTimeContextSchema,
      providerId: z.enum(['LOCAL_FIXTURE', 'DISABLED']),
      reason: RoutingUnavailableReasonSchema,
    }),
  ])
  .superRefine((result, context) => {
    if (result.status === 'UNAVAILABLE') {
      if (result.providerId === 'DISABLED' && result.reason !== 'PROVIDER_DISABLED') {
        context.addIssue({
          code: 'custom',
          message: 'Disabled providers only return PROVIDER_DISABLED.',
          path: ['reason'],
        });
      }
      if (result.providerId === 'LOCAL_FIXTURE' && result.reason === 'PROVIDER_DISABLED') {
        context.addIssue({
          code: 'custom',
          message: 'Local fixtures cannot report a disabled provider.',
          path: ['reason'],
        });
      }
      return;
    }

    const ids = new Set<string>();
    for (const [index, option] of result.options.entries()) {
      if (ids.has(option.routeId)) {
        context.addIssue({
          code: 'custom',
          message: 'Route option identifiers must be unique.',
          path: ['options', index, 'routeId'],
        });
      }
      ids.add(option.routeId);
      if (option.provenance.sourceVersion !== result.sourceVersion) {
        context.addIssue({
          code: 'custom',
          message: 'Route provenance must match the provider source version.',
          path: ['options', index, 'provenance', 'sourceVersion'],
        });
      }
    }
  });
export type PedestrianRoutingResult = z.infer<typeof PedestrianRoutingResultSchema>;

export function parsePedestrianRoutingRequest(input: unknown): PedestrianRoutingRequest {
  return PedestrianRoutingRequestSchema.parse(input);
}

export function parsePedestrianRoutingResult(input: unknown): PedestrianRoutingResult {
  return PedestrianRoutingResultSchema.parse(input);
}
