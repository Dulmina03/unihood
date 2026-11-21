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

// UNI-051 public route read. The provider boundary above is unchanged; this is a
// separate wire contract so query strings never reach provider configuration.
// Wire booleans stay strings like every other public query contract.
export const RoutePublicQuerySchema = z.strictObject({
  gateId: PublicIdSchema,
  boardingId: PublicIdSchema,
  timeContext: RouteTimeContextSchema,
  includeAlternatives: z.enum(['true', 'false']).optional(),
});
export type RoutePublicQuery = z.infer<typeof RoutePublicQuerySchema>;

// A public option is exactly the provider option: synthetic-only provenance with
// null verification and bounded geometry/metrics. No separate coordinates exist.
export const PublicRouteOptionSchema = PedestrianRouteOptionSchema;
export type PublicRouteOption = PedestrianRouteOption;

// Only provider-domain absence is a public 200 outcome. Disabled/timeout/error/
// invalid/cancelled outcomes become the shared SERVICE_UNAVAILABLE envelope.
export const PublicRouteUnavailableReasonSchema = z.enum(['NO_ROUTE', 'UNSUPPORTED_TIME_CONTEXT']);
export type PublicRouteUnavailableReason = z.infer<typeof PublicRouteUnavailableReasonSchema>;

export const PublicRouteResponseSchema = z.discriminatedUnion('status', [
  z.strictObject({
    gateId: PublicIdSchema,
    boardingId: PublicIdSchema,
    timeContext: RouteTimeContextSchema,
    status: z.literal('AVAILABLE'),
    sourceVersion,
    options: z.array(PublicRouteOptionSchema).min(1).max(3),
  }),
  z.strictObject({
    gateId: PublicIdSchema,
    boardingId: PublicIdSchema,
    timeContext: RouteTimeContextSchema,
    status: z.literal('UNAVAILABLE'),
    reason: PublicRouteUnavailableReasonSchema,
  }),
]);
export type PublicRouteResponse = z.infer<typeof PublicRouteResponseSchema>;

export function parsePublicRouteResponse(input: unknown): PublicRouteResponse {
  return PublicRouteResponseSchema.parse(input);
}

// UNI-052 additive provider capability: public boarding-entrance to essential-POI
// walking access. The existing gate-to-boarding PedestrianRoutingRequest/Result
// is unchanged; this is a separate wire contract so the two operations can never
// be confused. Coordinates are server-resolved only and never accepted from the
// client. No time context is used for essentials walking access.
export const PedestrianAccessRequestSchema = z.strictObject({
  origin: z.strictObject({
    boardingId: PublicIdSchema,
    coordinate: RouteCoordinateSchema,
  }),
  destination: z.strictObject({
    poiId: PublicIdSchema,
    coordinate: RouteCoordinateSchema,
  }),
});
export type PedestrianAccessRequest = z.infer<typeof PedestrianAccessRequestSchema>;

export const PedestrianAccessAvailableSchema = z.strictObject({
  status: z.literal('AVAILABLE'),
  providerId: z.literal('LOCAL_FIXTURE'),
  sourceVersion,
  durationSeconds: z.number().int().positive().max(21600),
  walkingDistanceMeters: z.number().int().positive().max(50000).optional(),
  provenance: PedestrianRouteProvenanceSchema,
});
export type PedestrianAccessAvailable = z.infer<typeof PedestrianAccessAvailableSchema>;

export const PedestrianAccessUnavailableSchema = z.strictObject({
  status: z.literal('UNAVAILABLE'),
  providerId: z.enum(['LOCAL_FIXTURE', 'DISABLED']),
  reason: RoutingUnavailableReasonSchema,
});
export type PedestrianAccessUnavailable = z.infer<typeof PedestrianAccessUnavailableSchema>;

export const PedestrianAccessResultSchema = z.discriminatedUnion('status', [
  PedestrianAccessAvailableSchema,
  PedestrianAccessUnavailableSchema,
]);
export type PedestrianAccessResult = z.infer<typeof PedestrianAccessResultSchema>;

export function parsePedestrianAccessResult(input: unknown): PedestrianAccessResult {
  return PedestrianAccessResultSchema.parse(input);
}

export const SyntheticAccessFixtureCaseSchema = z.strictObject({
  boardingId: PublicIdSchema,
  poiId: PublicIdSchema,
  status: z.enum(['AVAILABLE', 'UNAVAILABLE']),
  durationSeconds: z.number().int().positive().max(21600).optional(),
  walkingDistanceMeters: z.number().int().positive().max(50000).optional(),
  reason: z.enum(['PROVIDER_DISABLED', 'NO_ROUTE', 'TIMEOUT', 'PROVIDER_ERROR', 'INVALID_RESPONSE']).optional(),
}).refine((value) => {
  if (value.status === 'AVAILABLE') {
    return value.durationSeconds !== undefined;
  }
  return value.reason !== undefined;
}, 'AVAILABLE cases require durationSeconds; UNAVAILABLE cases require a reason');
export type SyntheticAccessFixtureCase = z.infer<typeof SyntheticAccessFixtureCaseSchema>;

export const SyntheticAccessFixtureSchema = z.strictObject({
  fixtureVersion: sourceVersion,
  dataKind: z.literal('SYNTHETIC'),
  sourceLabel: label.refine((value) => /synthetic/i.test(value), 'Synthetic fixture label required'),
  cases: z.array(SyntheticAccessFixtureCaseSchema).min(1).max(1000),
}).superRefine((value, context) => {
  const keys = new Set<string>();
  for (const [index, item] of value.cases.entries()) {
    const key = `${item.boardingId}\u0000${item.poiId}`;
    if (keys.has(key)) {
      context.addIssue({
        code: 'custom',
        message: 'Fixture boarding and POI keys must be unique.',
        path: ['cases', index],
      });
    }
    keys.add(key);
  }
});
export type SyntheticAccessFixture = z.infer<typeof SyntheticAccessFixtureSchema>;
