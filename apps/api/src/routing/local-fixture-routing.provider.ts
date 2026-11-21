import {
  PedestrianAccessResultSchema,
  PedestrianRoutingResultSchema,
  SyntheticAccessFixtureSchema,
  SyntheticRoutingFixtureSchema,
  type PedestrianAccessRequest,
  type PedestrianAccessResult,
  type PedestrianRoutingRequest,
  type PedestrianRoutingResult,
  type SyntheticAccessFixture,
  type SyntheticAccessFixtureCase,
  type SyntheticRoutingFixture,
  type SyntheticRouteFixtureCase,
} from '@unihood/contracts';
import fixtureInput from './fixtures/synthetic-routes.v1.json';
import accessFixtureInput from './fixtures/synthetic-access.v1.json';
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

export class LocalFixtureRoutingProvider implements PedestrianRoutingProvider {
  readonly providerId = 'LOCAL_FIXTURE' as const;
  private readonly fixture: SyntheticRoutingFixture;
  private readonly cases: ReadonlyMap<string, SyntheticRouteFixtureCase>;
  private readonly accessFixture: SyntheticAccessFixture;
  private readonly accessCases: ReadonlyMap<string, SyntheticAccessFixtureCase>;

  constructor(routeInput: unknown = fixtureInput, accessInput: unknown = accessFixtureInput) {
    this.fixture = SyntheticRoutingFixtureSchema.parse(routeInput);
    this.cases = new Map(this.fixture.cases.map((item) => [fixtureKey(item), item]));
    this.accessFixture = SyntheticAccessFixtureSchema.parse(accessInput);
    this.accessCases = new Map(this.accessFixture.cases.map((item) => [accessFixtureKey(item), item]));
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
}
