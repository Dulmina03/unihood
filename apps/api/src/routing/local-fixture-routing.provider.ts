import {
  PedestrianAccessResultSchema,
  PedestrianRoutingResultSchema,
  parsePedestrianRouteObservationsResult,
  parsePedestrianRouteSegmentsResult,
  SyntheticAccessFixtureSchema,
  SyntheticObservationFixtureSchema,
  SyntheticRoutingFixtureSchema,
  SyntheticSegmentFixtureSchema,
  type PedestrianAccessRequest,
  type PedestrianAccessResult,
  type PedestrianRoutingRequest,
  type PedestrianRoutingResult,
  type PedestrianRouteSegmentsRequest,
  type PedestrianRouteSegmentsResultUnion,
  type PedestrianRouteObservationsRequest,
  type PedestrianRouteObservationsResultUnion,
  type SyntheticAccessFixture,
  type SyntheticAccessFixtureCase,
  type SyntheticObservationFixture,
  type SyntheticObservationFixtureCase,
  type SyntheticRouteFixtureCase,
  type SyntheticRoutingFixture,
  type SyntheticSegmentFixture,
  type SyntheticSegmentFixtureCase,
} from '@unihood/contracts';
import fixtureInput from './fixtures/synthetic-routes.v1.json';
import accessFixtureInput from './fixtures/synthetic-access.v1.json';
import segmentFixtureInput from './fixtures/synthetic-segments.v1.json';
import observationFixtureInput from './fixtures/synthetic-observations.v1.json';
import type {
  PedestrianRoutingExecutionContext,
  PedestrianRoutingProvider,
} from './pedestrian-routing.provider';

function fixtureKey(caseValue: Pick<SyntheticRouteFixtureCase, 'gateId' | 'boardingId' | 'timeContext'>): string {
  return `${caseValue.gateId}\u0000${caseValue.boardingId}\u0000${caseValue.timeContext}`;
}

function accessFixtureKey(caseValue: Pick<SyntheticAccessFixtureCase, 'boardingId' | 'poiId'>): string {
  return `${caseValue.boardingId}\u0000${caseValue.poiId}`;
}

function segmentFixtureKey(caseValue: Pick<SyntheticSegmentFixtureCase, 'gateId' | 'boardingId' | 'timeContext'>): string {
  return `${caseValue.gateId}\u0000${caseValue.boardingId}\u0000${caseValue.timeContext}`;
}

function observationFixtureKey(caseValue: Pick<SyntheticObservationFixtureCase, 'gateId' | 'boardingId' | 'timeContext'>): string {
  return `${caseValue.gateId}\u0000${caseValue.boardingId}\u0000${caseValue.timeContext}`;
}

export class LocalFixtureRoutingProvider implements PedestrianRoutingProvider {
  readonly providerId = 'LOCAL_FIXTURE' as const;
  private readonly fixture: SyntheticRoutingFixture;
  private readonly cases: ReadonlyMap<string, SyntheticRouteFixtureCase>;
  private readonly accessFixture: SyntheticAccessFixture;
  private readonly accessCases: ReadonlyMap<string, SyntheticAccessFixtureCase>;
  private readonly segmentFixture: SyntheticSegmentFixture;
  private readonly segmentCases: ReadonlyMap<string, SyntheticSegmentFixtureCase>;
  private readonly observationFixture: SyntheticObservationFixture;
  private readonly observationCases: ReadonlyMap<string, SyntheticObservationFixtureCase>;

  constructor(
    routeInput: unknown = fixtureInput,
    accessInput: unknown = accessFixtureInput,
    segmentInput: unknown = segmentFixtureInput,
    observationInput: unknown = observationFixtureInput,
  ) {
    this.fixture = SyntheticRoutingFixtureSchema.parse(routeInput);
    this.cases = new Map(this.fixture.cases.map((item) => [fixtureKey(item), item]));
    this.accessFixture = SyntheticAccessFixtureSchema.parse(accessInput);
    this.accessCases = new Map(this.accessFixture.cases.map((item) => [accessFixtureKey(item), item]));
    this.segmentFixture = SyntheticSegmentFixtureSchema.parse(segmentInput);
    this.segmentCases = new Map(this.segmentFixture.cases.map((item) => [segmentFixtureKey(item), item]));
    this.observationFixture = SyntheticObservationFixtureSchema.parse(observationInput);
    this.observationCases = new Map(this.observationFixture.cases.map((item) => [observationFixtureKey(item), item]));
  }

  async route(
    request: PedestrianRoutingRequest,
    context: PedestrianRoutingExecutionContext = {},
  ): Promise<PedestrianRoutingResult> {
    if (context.signal?.aborted) {
      return this.unavailable(request, 'CANCELLED');
    }

    const item = this.cases.get(fixtureKey({
      gateId: request.origin.gateId,
      boardingId: request.destination.boardingId,
      timeContext: request.timeContext,
    }));

    if (!item) return this.unavailable(request, 'NO_ROUTE');
    if (item.status === 'UNAVAILABLE') return this.unavailable(request, item.reason);

    const selected = request.includeAlternatives ? item.options : item.options.slice(0, 1);
    return PedestrianRoutingResultSchema.parse({
      status: 'AVAILABLE',
      timeContext: request.timeContext,
      providerId: this.providerId,
      sourceVersion: this.fixture.fixtureVersion,
      options: selected.map((option) => ({
        ...option,
        provenance: {
          dataKind: 'SYNTHETIC',
          provider: this.providerId,
          sourceVersion: this.fixture.fixtureVersion,
          sourceLabel: this.fixture.sourceLabel,
          verifiedAt: null,
        },
      })),
    });
  }

  async access(
    request: PedestrianAccessRequest,
    context: PedestrianRoutingExecutionContext = {},
  ): Promise<PedestrianAccessResult> {
    if (context.signal?.aborted) {
      return this.unavailableAccess('CANCELLED');
    }

    const item = this.accessCases.get(accessFixtureKey({
      boardingId: request.origin.boardingId,
      poiId: request.destination.poiId,
    }));

    if (!item) return this.unavailableAccess('NO_ROUTE');
    if (item.status === 'UNAVAILABLE') return this.unavailableAccess(item.reason!);

    return PedestrianAccessResultSchema.parse({
      status: 'AVAILABLE',
      providerId: this.providerId,
      sourceVersion: this.accessFixture.fixtureVersion,
      durationSeconds: item.durationSeconds!,
      walkingDistanceMeters: item.walkingDistanceMeters,
      provenance: {
        dataKind: 'SYNTHETIC',
        provider: this.providerId,
        sourceVersion: this.accessFixture.fixtureVersion,
        sourceLabel: this.accessFixture.sourceLabel,
        verifiedAt: null,
      },
    });
  }

  async accessMany(
    requests: PedestrianAccessRequest[],
    context: PedestrianRoutingExecutionContext = {},
  ): Promise<PedestrianAccessResult[]> {
    const results: PedestrianAccessResult[] = new Array(requests.length);
    for (let i = 0; i < requests.length; i++) {
      results[i] = await this.access(requests[i], context);
    }
    return results;
  }

  async segments(
    request: PedestrianRouteSegmentsRequest,
    context: PedestrianRoutingExecutionContext = {},
  ): Promise<PedestrianRouteSegmentsResultUnion> {
    if (context.signal?.aborted) {
      return this.unavailableSegments(request, 'CANCELLED');
    }

    const item = this.segmentCases.get(segmentFixtureKey({
      gateId: request.gateId,
      boardingId: request.boardingId,
      timeContext: request.timeContext,
    }));

    if (!item) return this.unavailableSegments(request, 'NO_ROUTE');
    if (item.status === 'UNAVAILABLE') return this.unavailableSegments(request, item.reason!);

    return parsePedestrianRouteSegmentsResult({
      status: 'AVAILABLE',
      gateId: request.gateId,
      boardingId: request.boardingId,
      timeContext: request.timeContext,
      providerId: this.providerId,
      sourceVersion: this.segmentFixture.fixtureVersion,
      segments: item.segments!,
    });
  }

  async observations(
    request: PedestrianRouteObservationsRequest,
    context: PedestrianRoutingExecutionContext = {},
  ): Promise<PedestrianRouteObservationsResultUnion> {
    if (context.signal?.aborted) {
      return this.unavailableObservations(request, 'CANCELLED');
    }

    const item = this.observationCases.get(observationFixtureKey({
      gateId: request.gateId,
      boardingId: request.boardingId,
      timeContext: request.timeContext,
    }));

    if (!item) return this.unavailableObservations(request, 'NO_ROUTE');
    if (item.status === 'UNAVAILABLE') return this.unavailableObservations(request, item.reason!);

    return parsePedestrianRouteObservationsResult({
      status: 'AVAILABLE',
      gateId: request.gateId,
      boardingId: request.boardingId,
      timeContext: request.timeContext,
      providerId: this.providerId,
      sourceVersion: this.observationFixture.fixtureVersion,
      observations: item.observations!,
    });
  }

  private unavailable(
    request: PedestrianRoutingRequest,
    reason: Extract<PedestrianRoutingResult, { status: 'UNAVAILABLE' }>['reason'],
  ): PedestrianRoutingResult {
    return {
      status: 'UNAVAILABLE',
      timeContext: request.timeContext,
      providerId: this.providerId,
      reason,
    };
  }

  private unavailableAccess(reason: Extract<PedestrianAccessResult, { status: 'UNAVAILABLE' }>['reason']): PedestrianAccessResult {
    return {
      status: 'UNAVAILABLE',
      providerId: this.providerId,
      reason,
    };
  }

  private unavailableSegments(
    request: PedestrianRouteSegmentsRequest,
    reason: Extract<PedestrianRouteSegmentsResultUnion, { status: 'UNAVAILABLE' }>['reason'],
  ): PedestrianRouteSegmentsResultUnion {
    return {
      status: 'UNAVAILABLE',
      gateId: request.gateId,
      boardingId: request.boardingId,
      timeContext: request.timeContext,
      providerId: this.providerId,
      reason,
    };
  }

  private unavailableObservations(
    request: PedestrianRouteObservationsRequest,
    reason: Extract<PedestrianRouteObservationsResultUnion, { status: 'UNAVAILABLE' }>['reason'],
  ): PedestrianRouteObservationsResultUnion {
    return {
      status: 'UNAVAILABLE',
      gateId: request.gateId,
      boardingId: request.boardingId,
      timeContext: request.timeContext,
      providerId: this.providerId,
      reason,
    };
  }
}
