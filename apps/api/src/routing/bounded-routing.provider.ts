import { parsePedestrianRoutingResult, type PedestrianRoutingRequest, type PedestrianRoutingResult } from '@unihood/contracts';
import {
  ROUTING_TIMEOUT_MS,
  type PedestrianRoutingExecutionContext,
  type PedestrianRoutingProvider,
} from './pedestrian-routing.provider';

const timeoutMarker = Symbol('routing-timeout');

export class BoundedRoutingProvider implements PedestrianRoutingProvider {
  readonly providerId: PedestrianRoutingProvider['providerId'];

  constructor(
    private readonly provider: PedestrianRoutingProvider,
    private readonly timeoutMs = ROUTING_TIMEOUT_MS,
  ) {
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid routing timeout');
    this.providerId = provider.providerId;
  }

  async route(
    request: PedestrianRoutingRequest,
    context: PedestrianRoutingExecutionContext = {},
  ): Promise<PedestrianRoutingResult> {
    if (context.signal?.aborted || this.provider.providerId === 'DISABLED') {
      return this.unavailable(request, this.provider.providerId === 'DISABLED' ? 'PROVIDER_DISABLED' : 'CANCELLED');
    }

    const controller = new AbortController();
    let timedOut = false;
    let cancelled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    timer.unref?.();

    const onAbort = () => {
      cancelled = true;
      controller.abort();
    };
    context.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const result = await Promise.race<PedestrianRoutingResult | typeof timeoutMarker>([
        this.provider.route(request, { signal: controller.signal }),
        new Promise<typeof timeoutMarker>((resolve) => {
          controller.signal.addEventListener('abort', () => resolve(timeoutMarker), { once: true });
        }),
      ]);

      if (timedOut) return this.unavailable(request, 'TIMEOUT');
      if (cancelled) return this.unavailable(request, 'CANCELLED');
      if (result === timeoutMarker) return this.unavailable(request, 'TIMEOUT');

      let parsed: PedestrianRoutingResult;
      try {
        parsed = parsePedestrianRoutingResult(result);
      } catch {
        return this.unavailable(request, 'INVALID_RESPONSE');
      }
      if (parsed.providerId !== this.provider.providerId) return this.unavailable(request, 'INVALID_RESPONSE');
      return parsed;
    } catch {
      if (timedOut) return this.unavailable(request, 'TIMEOUT');
      if (cancelled) return this.unavailable(request, 'CANCELLED');
      return this.unavailable(request, 'PROVIDER_ERROR');
    } finally {
      clearTimeout(timer);
      context.signal?.removeEventListener('abort', onAbort);
    }
  }

  private unavailable(
    request: PedestrianRoutingRequest,
    reason: Extract<PedestrianRoutingResult, { status: 'UNAVAILABLE' }>['reason'],
  ): PedestrianRoutingResult {
    return {
      status: 'UNAVAILABLE',
      timeContext: request.timeContext,
      providerId: this.provider.providerId,
      reason,
    };
  }
}
