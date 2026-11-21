import type { PedestrianAccessRequest, PedestrianAccessResult, PedestrianRoutingRequest, PedestrianRoutingResult, PedestrianRouteSegmentsRequest, PedestrianRouteSegmentsResultUnion, PedestrianRouteObservationsRequest, PedestrianRouteObservationsResultUnion } from '@unihood/contracts';

export type PedestrianRoutingExecutionContext = {
  readonly signal?: AbortSignal;
};

export interface PedestrianRoutingProvider {
  readonly providerId: 'LOCAL_FIXTURE' | 'DISABLED';
  route(
    request: PedestrianRoutingRequest,
    context?: PedestrianRoutingExecutionContext,
  ): Promise<PedestrianRoutingResult>;
  // UNI-052 additive capability: public boarding-entrance to essential-POI
  // walking access. Existing gate-to-boarding route() is unchanged.
  access(
    request: PedestrianAccessRequest,
    context?: PedestrianRoutingExecutionContext,
  ): Promise<PedestrianAccessResult>;

  // UNI-052: bounded per-POI walking access across multiple POIs. Results are
  // returned in request order. Default implementations may run sequentially;
  // BoundedRoutingProvider applies concurrency and a shared budget.
  accessMany(
    requests: PedestrianAccessRequest[],
    context?: PedestrianRoutingExecutionContext,
    options?: { concurrency?: number; budgetMs?: number },
  ): Promise<PedestrianAccessResult[]>;

  // UNI-053: route segments for a gate-to-boarding pair under a time context.
  segments(
    request: PedestrianRouteSegmentsRequest,
    context?: PedestrianRoutingExecutionContext,
  ): Promise<PedestrianRouteSegmentsResultUnion>;

  // UNI-053: day/night structured observation reports for a gate-to-boarding pair.
  observations(
    request: PedestrianRouteObservationsRequest,
    context?: PedestrianRoutingExecutionContext,
  ): Promise<PedestrianRouteObservationsResultUnion>;
}

export const ROUTING_TIMEOUT_MS = 2000;
