import {
  PedestrianRoutingResultSchema,
  SyntheticRoutingFixtureSchema,
  type PedestrianRoutingRequest,
  type PedestrianRoutingResult,
  type SyntheticRoutingFixture,
  type SyntheticRouteFixtureCase,
} from '@unihood/contracts';
import fixtureInput from './fixtures/synthetic-routes.v1.json';
import type {
  PedestrianRoutingExecutionContext,
  PedestrianRoutingProvider,
} from './pedestrian-routing.provider';

function fixtureKey(caseValue: Pick<SyntheticRouteFixtureCase, 'gateId' | 'boardingId' | 'timeContext'>): string {
  return `${caseValue.gateId}\u0000${caseValue.boardingId}\u0000${caseValue.timeContext}`;
}

export class LocalFixtureRoutingProvider implements PedestrianRoutingProvider {
  readonly providerId = 'LOCAL_FIXTURE' as const;
  private readonly fixture: SyntheticRoutingFixture;
  private readonly cases: ReadonlyMap<string, SyntheticRouteFixtureCase>;

  constructor(input: unknown = fixtureInput) {
    this.fixture = SyntheticRoutingFixtureSchema.parse(input);
    this.cases = new Map(this.fixture.cases.map((item) => [fixtureKey(item), item]));
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
}
