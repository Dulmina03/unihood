import type { PedestrianAccessRequest, PedestrianAccessResult, PedestrianRoutingRequest, PedestrianRoutingResult, PedestrianRouteObservationsRequest, PedestrianRouteObservationsResultUnion, PedestrianRouteSegmentsRequest, PedestrianRouteSegmentsResultUnion } from '@unihood/contracts';
import type { PedestrianRoutingProvider } from './pedestrian-routing.provider';

export class DisabledRoutingProvider implements PedestrianRoutingProvider {
  readonly providerId = 'DISABLED' as const;

  async route(request: PedestrianRoutingRequest): Promise<PedestrianRoutingResult> {
    return {
      status: 'UNAVAILABLE',
      timeContext: request.timeContext,
      providerId: this.providerId,
      reason: 'PROVIDER_DISABLED',
    };
  }

  async access(): Promise<PedestrianAccessResult> {
    return {
      status: 'UNAVAILABLE',
      providerId: this.providerId,
      reason: 'PROVIDER_DISABLED',
    };
  }

  async accessMany(
    requests: PedestrianAccessRequest[],
  ): Promise<PedestrianAccessResult[]> {
    return requests.map(() => ({
      status: 'UNAVAILABLE',
      providerId: this.providerId,
      reason: 'PROVIDER_DISABLED',
    }));
  }

  async segments(_request: PedestrianRouteSegmentsRequest): Promise<PedestrianRouteSegmentsResultUnion> {
    return {
      status: 'UNAVAILABLE',
      gateId: _request.gateId,
      boardingId: _request.boardingId,
      timeContext: _request.timeContext,
      providerId: this.providerId,
      reason: 'PROVIDER_DISABLED',
    };
  }

  async observations(_request: PedestrianRouteObservationsRequest): Promise<PedestrianRouteObservationsResultUnion> {
    return {
      status: 'UNAVAILABLE',
      gateId: _request.gateId,
      boardingId: _request.boardingId,
      timeContext: _request.timeContext,
      providerId: this.providerId,
      reason: 'PROVIDER_DISABLED',
    };
  }
}
