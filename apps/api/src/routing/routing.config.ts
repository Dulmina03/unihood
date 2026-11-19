import { BoundedRoutingProvider } from './bounded-routing.provider';
import { DisabledRoutingProvider } from './disabled-routing.provider';
import { LocalFixtureRoutingProvider } from './local-fixture-routing.provider';
import type { PedestrianRoutingProvider } from './pedestrian-routing.provider';

export type RoutingProviderKind = 'disabled' | 'local-fixture';

export function routingProviderKind(environment: NodeJS.ProcessEnv = process.env): RoutingProviderKind {
  if (environment.ROUTING_PROVIDER !== 'local-fixture') return 'disabled';
  const local = environment.APP_ENV === 'local'
    && (environment.NODE_ENV === undefined || environment.NODE_ENV === 'development');
  const test = environment.APP_ENV === 'test' && environment.NODE_ENV === 'test';
  const loopback = ['127.0.0.1', '::1'].includes(environment.API_HOST ?? '127.0.0.1');
  return local && loopback || test && loopback ? 'local-fixture' : 'disabled';
}

export function createPedestrianRoutingProvider(
  environment: NodeJS.ProcessEnv = process.env,
): PedestrianRoutingProvider {
  if (routingProviderKind(environment) === 'local-fixture') {
    return new BoundedRoutingProvider(new LocalFixtureRoutingProvider());
  }
  return new DisabledRoutingProvider();
}
