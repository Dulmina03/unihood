import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import {
  PublicRouteResponseSchema,
  type PedestrianRoutingRequest,
  type PedestrianRoutingResult,
  type PublicRouteResponse,
  type RoutePublicQuery,
  type PedestrianRouteSegmentsRequest,
  type PedestrianRouteSegmentsResultUnion,
  type PedestrianRouteObservationsRequest,
  type PedestrianRouteObservationsResultUnion,
} from '@unihood/contracts';
import { UniversityRepository } from '../universities/university.repository';
import { RequestCancelledException } from '../http/request-cancelled.exception';
import type { PedestrianRoutingProvider } from './pedestrian-routing.provider';
import { PEDESTRIAN_ROUTING_PROVIDER } from './routing.tokens';

// Same visibility semantics as UniversityService.visible(): a gate, its campus and
// its university must each be active and verified unless synthetic data is allowed.
const visible = (alias: string) => `${alias}.status='ACTIVE' AND ($1::boolean OR ${alias}.data_kind='VERIFIED')`;

// Mirror of the strict public-map policy in boarding-map.service.ts. Do not relax:
// route geometry discloses more than a map pin, so the weakest matching policy is
// not acceptable. Keep this list in sync if that policy changes.
const publicBoardingEligible = `p.kind='BOARDING' AND p.status='ACTIVE' AND p.merged_into IS NULL AND p.data_kind='SYNTHETIC' AND b.data_kind='SYNTHETIC' AND a.data_kind='SYNTHETIC'
 AND b.visibility='PUBLIC_MAP' AND b.authorization_status='LOCAL_TEST_AUTHORIZED' AND b.public_map_consent AND b.map_consent_at=e.consent_at
 AND l.publisher_kind='OWNER_OFFICIAL' AND l.publication_status='PUBLISHED' AND l.is_current AND l.visibility_snapshot='PUBLIC_MAP' AND a.visibility='PUBLIC_MAP'
 AND e.purpose='OWNER_SELECTED_PUBLIC_ENTRANCE'`;

// One statement resolves both public endpoints so a denial is atomic. Only public
// campus-entrance and consented public-entrance geometry is selected; the private
// verification schema is never referenced.
const resolveEndpoints = `SELECT ST_Y(g.geo) AS gate_lat, ST_X(g.geo) AS gate_lng,
 ST_Y(e.entrance_geo) AS boarding_lat, ST_X(e.entrance_geo) AS boarding_lng
 FROM public.campus_entrances g
 JOIN public.campuses c ON c.id=g.campus_id
 JOIN public.universities u ON u.id=c.university_id
 JOIN public.boarding_public_entrances e ON e.boarding_id=$2
 JOIN public.boarding_properties b ON b.place_id=e.boarding_id
 JOIN public.places p ON p.id=b.place_id
 JOIN public.listings l ON l.id=e.listing_id AND l.boarding_id=b.place_id
 JOIN public.boarding_advertisement_previews a ON a.listing_id=l.id AND a.boarding_id=b.place_id
 WHERE g.id=$3 AND ${visible('u')} AND ${visible('c')} AND ${visible('g')} AND ${publicBoardingEligible}
 LIMIT 1`;

@Injectable()
export class PedestrianRoutesService {
  constructor(
    private readonly repository: UniversityRepository,
    @Inject(PEDESTRIAN_ROUTING_PROVIDER) private readonly provider: PedestrianRoutingProvider,
  ) {}

  async route(query: RoutePublicQuery, signal?: AbortSignal): Promise<PublicRouteResponse> {
    if (signal?.aborted) throw new RequestCancelledException();

    // Eligibility is resolved before any provider call, so an ineligible or
    // unknown endpoint can never reach the routing provider.
    const rows = await this.repository.query(resolveEndpoints, [
      this.repository.includeSynthetic,
      query.boardingId,
      query.gateId,
    ]);
    const endpoint = rows[0];
    if (!endpoint) throw new NotFoundException();

    const request: PedestrianRoutingRequest = {
      origin: {
        gateId: query.gateId,
        coordinate: { lat: Number(endpoint.gate_lat), lng: Number(endpoint.gate_lng) },
      },
      destination: {
        boardingId: query.boardingId,
        coordinate: { lat: Number(endpoint.boarding_lat), lng: Number(endpoint.boarding_lng) },
      },
      timeContext: query.timeContext,
      includeAlternatives: query.includeAlternatives !== 'false',
    };

    const result = await this.invoke(request, signal);

    if (result.status === 'AVAILABLE') {
      if (result.timeContext !== request.timeContext) throw new ServiceUnavailableException();
      if (result.options.some((option) => option.provenance.sourceVersion !== result.sourceVersion)) {
        throw new ServiceUnavailableException();
      }
      return PublicRouteResponseSchema.parse({
        gateId: request.origin.gateId,
        boardingId: request.destination.boardingId,
        timeContext: result.timeContext,
        status: 'AVAILABLE',
        sourceVersion: result.sourceVersion,
        options: result.options.map((option) => ({
          routeId: option.routeId,
          label: option.label,
          geometry: option.geometry,
          distanceMeters: option.distanceMeters,
          durationSeconds: option.durationSeconds,
          provenance: {
            dataKind: option.provenance.dataKind,
            provider: option.provenance.provider,
            sourceVersion: option.provenance.sourceVersion,
            sourceLabel: option.provenance.sourceLabel,
            verifiedAt: option.provenance.verifiedAt,
          },
        })),
      });
    }

    if (result.reason === 'NO_ROUTE' || result.reason === 'UNSUPPORTED_TIME_CONTEXT') {
      return PublicRouteResponseSchema.parse({
        gateId: request.origin.gateId,
        boardingId: request.destination.boardingId,
        timeContext: result.timeContext,
        status: 'UNAVAILABLE',
        reason: result.reason,
      });
    }

    // Cancellation means the client disconnected: end silently instead of attempting a response.
    if (result.reason === 'CANCELLED') throw new RequestCancelledException();

    // Disabled, timeout, provider error and invalid response are operational
    // failures: the existing redacted 503 envelope is used.
    throw new ServiceUnavailableException();
  }

  async segments(query: PedestrianRouteSegmentsRequest, signal?: AbortSignal): Promise<PedestrianRouteSegmentsResultUnion> {
    if (signal?.aborted) throw new RequestCancelledException();

    const rows = await this.repository.query(resolveEndpoints, [
      this.repository.includeSynthetic,
      query.boardingId,
      query.gateId,
    ]);
    const endpoint = rows[0];
    if (!endpoint) throw new NotFoundException();

    const result = await this.invokeSegments({
      gateId: query.gateId,
      boardingId: query.boardingId,
      timeContext: query.timeContext,
    }, signal);

    if (result.status === 'UNAVAILABLE') {
      if (result.reason === 'NO_ROUTE' || result.reason === 'UNSUPPORTED_TIME_CONTEXT') return result;
      if (result.reason === 'CANCELLED') throw new RequestCancelledException();
      throw new ServiceUnavailableException();
    }
    return result;
  }

  async observations(query: PedestrianRouteObservationsRequest, signal?: AbortSignal): Promise<PedestrianRouteObservationsResultUnion> {
    if (signal?.aborted) throw new RequestCancelledException();

    const rows = await this.repository.query(resolveEndpoints, [
      this.repository.includeSynthetic,
      query.boardingId,
      query.gateId,
    ]);
    const endpoint = rows[0];
    if (!endpoint) throw new NotFoundException();

    const result = await this.invokeObservations({
      gateId: query.gateId,
      boardingId: query.boardingId,
      timeContext: query.timeContext,
    }, signal);

    if (result.status === 'UNAVAILABLE') {
      if (result.reason === 'NO_ROUTE' || result.reason === 'UNSUPPORTED_TIME_CONTEXT') return result;
      if (result.reason === 'CANCELLED') throw new RequestCancelledException();
      throw new ServiceUnavailableException();
    }
    return result;
  }

  private async invoke(
    request: PedestrianRoutingRequest,
    signal?: AbortSignal,
  ): Promise<PedestrianRoutingResult> {
    try {
      return await this.provider.route(request, { signal });
    } catch {
      if (signal?.aborted) throw new RequestCancelledException();
      throw new ServiceUnavailableException();
    }
  }

  private async invokeSegments(
    request: PedestrianRouteSegmentsRequest,
    signal?: AbortSignal,
  ): Promise<PedestrianRouteSegmentsResultUnion> {
    try {
      return await this.provider.segments(request, { signal });
    } catch {
      if (signal?.aborted) throw new RequestCancelledException();
      throw new ServiceUnavailableException();
    }
  }

  private async invokeObservations(
    request: PedestrianRouteObservationsRequest,
    signal?: AbortSignal,
  ): Promise<PedestrianRouteObservationsResultUnion> {
    try {
      return await this.provider.observations(request, { signal });
    } catch {
      if (signal?.aborted) throw new RequestCancelledException();
      throw new ServiceUnavailableException();
    }
  }
}
