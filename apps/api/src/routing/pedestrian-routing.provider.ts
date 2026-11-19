import type { PedestrianRoutingRequest, PedestrianRoutingResult } from '@unihood/contracts';

export type PedestrianRoutingExecutionContext = {
  readonly signal?: AbortSignal;
};

export interface PedestrianRoutingProvider {
  readonly providerId: 'LOCAL_FIXTURE' | 'DISABLED';
  route(
    request: PedestrianRoutingRequest,
    context?: PedestrianRoutingExecutionContext,
  ): Promise<PedestrianRoutingResult>;
}

export const ROUTING_TIMEOUT_MS = 2000;
