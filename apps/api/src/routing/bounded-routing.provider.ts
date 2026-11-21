import {
  parsePedestrianAccessResult,
  parsePedestrianRoutingResult,
  type PedestrianAccessRequest,
  type PedestrianAccessResult,
  type PedestrianRoutingRequest,
  type PedestrianRoutingResult,
} from '@unihood/contracts';
import {
  ROUTING_TIMEOUT_MS,
  type PedestrianRoutingExecutionContext,
  type PedestrianRoutingProvider,
} from './pedestrian-routing.provider';

const timeoutMarker = Symbol('routing-timeout');

// Wraps a single provider call with the shared timeout, cancellation, and
// invalid-response normalization used by UNI-050/UNI-051. Does not change any
// existing gate-to-boarding behaviour.
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
    return this.single(request, context);
  }

  // UNI-052: single boarding-entrance to essential-POI walking-access call with
  // the same bounded-protection semantics as route().
  async access(
    request: PedestrianAccessRequest,
    context: PedestrianRoutingExecutionContext = {},
  ): Promise<PedestrianAccessResult> {
    return this.singleAccess(request, context);
  }

  // UNI-052: executes per-POI walking-access calls under a shared budget and
  // bounded concurrency. Results are returned in the same order as requests.
  // When the overall budget expires, remaining unscheduled items are marked
  // UNAVAILABLE/TIMEOUT; in-flight calls are aborted via the linked signal.
  async accessMany(
    requests: PedestrianAccessRequest[],
    context: PedestrianRoutingExecutionContext = {},
    options: { concurrency?: number; budgetMs?: number } = {},
  ): Promise<PedestrianAccessResult[]> {
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 5, requests.length));
    const budgetMs = Math.max(0, options.budgetMs ?? ROUTING_TIMEOUT_MS);
    const results: PedestrianAccessResult[] = new Array(requests.length);
    const controller = new AbortController();
    const linked = context.signal ? AbortSignal.any([context.signal, controller.signal]) : controller.signal;
    const deadline = Date.now() + budgetMs;
    let stopped = false;
    let running = 0;
    let nextIndex = 0;

    const runOne = async (index: number, request: PedestrianAccessRequest): Promise<void> => {
      try {
        results[index] = await this.singleAccess(request, { signal: linked });
      } catch {
        results[index] = {
          status: 'UNAVAILABLE',
          providerId: this.providerId,
          reason: 'PROVIDER_ERROR',
        };
      } finally {
        running--;
        drain();
      }
    };

    const drain = (): void => {
      while (
        running < concurrency &&
        nextIndex < requests.length &&
        !stopped &&
        Date.now() < deadline
      ) {
        const index = nextIndex++;
        running++;
        void runOne(index, requests[index]);
      }
      if (Date.now() >= deadline) {
        stopped = true;
        controller.abort();
      }
      for (let i = 0; i < requests.length; i++) {
        if (results[i] === undefined && stopped) {
          results[i] = {
            status: 'UNAVAILABLE',
            providerId: this.providerId,
            reason: 'TIMEOUT',
          };
        }
      }
    };

    drain();

    // Wait for all in-flight calls to settle (or be aborted).
    while (running > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      drain();
    }

    // Any result still undefined (should not happen) is treated as timeout.
    for (let i = 0; i < results.length; i++) {
      if (results[i] === undefined) {
        results[i] = {
          status: 'UNAVAILABLE',
          providerId: this.providerId,
          reason: 'TIMEOUT',
        };
      }
    }

    return results;
  }

  private async single(
    request: PedestrianRoutingRequest,
    context: PedestrianRoutingExecutionContext,
  ): Promise<PedestrianRoutingResult> {
    if (context.signal?.aborted || this.provider.providerId === 'DISABLED') {
      return this.unavailable(request, this.provider.providerId === 'DISABLED' ? 'PROVIDER_DISABLED' : 'CANCELLED');
    }

    const subController = new AbortController();
    let timedOut = false;
    let cancelled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      subController.abort();
    }, this.timeoutMs);
    timer.unref?.();

    const onAbort = () => {
      cancelled = true;
      subController.abort();
    };
    context.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const result = await Promise.race<PedestrianRoutingResult | typeof timeoutMarker>([
        this.provider.route(request, { signal: subController.signal }),
        new Promise<typeof timeoutMarker>((resolve) => {
          subController.signal.addEventListener('abort', () => resolve(timeoutMarker), { once: true });
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

  private async singleAccess(
    request: PedestrianAccessRequest,
    context: PedestrianRoutingExecutionContext,
  ): Promise<PedestrianAccessResult> {
    if (context.signal?.aborted || this.provider.providerId === 'DISABLED') {
      return this.unavailableAccess(this.provider.providerId === 'DISABLED' ? 'PROVIDER_DISABLED' : 'CANCELLED');
    }

    const subController = new AbortController();
    let timedOut = false;
    let cancelled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      subController.abort();
    }, this.timeoutMs);
    timer.unref?.();

    const onAbort = () => {
      cancelled = true;
      subController.abort();
    };
    context.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const result = await Promise.race<PedestrianAccessResult | typeof timeoutMarker>([
        this.provider.access(request, { signal: subController.signal }),
        new Promise<typeof timeoutMarker>((resolve) => {
          subController.signal.addEventListener('abort', () => resolve(timeoutMarker), { once: true });
        }),
      ]);

      if (timedOut) return this.unavailableAccess('TIMEOUT');
      if (cancelled) return this.unavailableAccess('CANCELLED');
      if (result === timeoutMarker) return this.unavailableAccess('TIMEOUT');

      let parsed: PedestrianAccessResult;
      try {
        parsed = parsePedestrianAccessResult(result);
      } catch {
        return this.unavailableAccess('INVALID_RESPONSE');
      }
      if (parsed.providerId !== this.provider.providerId) return this.unavailableAccess('INVALID_RESPONSE');
      return parsed;
    } catch {
      if (timedOut) return this.unavailableAccess('TIMEOUT');
      if (cancelled) return this.unavailableAccess('CANCELLED');
      return this.unavailableAccess('PROVIDER_ERROR');
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

  private unavailableAccess(reason: Extract<PedestrianAccessResult, { status: 'UNAVAILABLE' }>['reason']): PedestrianAccessResult {
    return {
      status: 'UNAVAILABLE',
      providerId: this.provider.providerId,
      reason,
    };
  }
}
