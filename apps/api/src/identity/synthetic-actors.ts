import { Injectable } from '@nestjs/common';
import type { ActorContext, IdentityProvider, PermissionService } from '@unihood/contracts';

export const SYNTHETIC_PROPERTY_A = '00000000-0000-4000-8000-000000000001';
export const SYNTHETIC_PROPERTY_B = '00000000-0000-4000-8000-000000000002';
export type SyntheticConfig = Readonly<{enabled: boolean; fixture: string | undefined}>;
export function syntheticConfig(env: NodeJS.ProcessEnv): SyntheticConfig {
  const local = env.APP_ENV === 'local' && (env.NODE_ENV === undefined || env.NODE_ENV === 'development');
  const test = env.APP_ENV === 'test' && env.NODE_ENV === 'test';
  const host = env.API_HOST ?? '127.0.0.1';
  return Object.freeze({enabled: env.ENABLE_SYNTHETIC_ACTORS === 'true' && (local || test) && ['127.0.0.1', '::1'].includes(host), fixture: env.SYNTHETIC_ACTOR});
}
const loopback = (address: unknown) => typeof address === 'string' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
const guest = (): ActorContext => ({actorId: null, authStatus: 'GUEST', memberships: []});
type RequestBoundary = {socket?: {remoteAddress?: string; localAddress?: string}; headers?: Record<string, unknown>};
function localRequest(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false;
  const request = input as RequestBoundary, headers = request.headers ?? {};
  if (!loopback(request.socket?.remoteAddress) || !loopback(request.socket?.localAddress)) return false;
  if (['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-real-ip'].some((key) => headers[key] !== undefined)) return false;
  if (headers['sec-fetch-site'] === 'cross-site') return false;
  try {
    const host = new URL(`http://${headers.host}`);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname) || host.username || host.password || host.pathname !== '/' || host.search || host.hash) return false;
    if (headers.origin !== undefined) {
      const origin = new URL(String(headers.origin));
      if (!['http:', 'https:'].includes(origin.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return false;
    }
  } catch {return false;}
  return true;
}
type Grants = {actorId: string; contribute: boolean; properties: ReadonlyArray<{boardingId: string; permissions: readonly string[]}>};
const ownerPermissions = ['MANAGE_PROPERTY', 'PUBLISH_EXACT_LOCATION', 'SET_OFFICIAL_PRICE', 'CONFIRM_VACANCY', 'MANAGE_MEDIA', 'MANAGE_CONTACT'];
// No request header/cookie/body selects a fixture. Selection is server-side and synthetic only.
@Injectable()
export class SyntheticActors implements IdentityProvider, PermissionService {
  private readonly issued = new WeakMap<ActorContext, Grants>();
  constructor(private readonly config: SyntheticConfig = syntheticConfig(process.env)) {}
  async resolveRequestActor(request: unknown): Promise<ActorContext> {
    if (!this.config.enabled || !localRequest(request) || !['contributor', 'owner-a', 'price-manager-a'].includes(this.config.fixture ?? '')) return guest();
    const properties = this.config.fixture === 'contributor' ? [] : [{boardingId: SYNTHETIC_PROPERTY_A, permissions: this.config.fixture === 'owner-a' ? [...ownerPermissions] : ['MANAGE_PROPERTY', 'SET_OFFICIAL_PRICE']}];
    const actor: ActorContext = {actorId: `synthetic:${this.config.fixture}`, authStatus: 'LOCAL_TEST_ACTOR', memberships: structuredClone(properties)};
    // Privileges come from this instance's private issuance record, never mutable caller-supplied fields.
    this.issued.set(actor, {actorId: actor.actorId!, contribute: true, properties});
    return actor;
  }
  private grants(actor:ActorContext):Grants|undefined {
    const value=this.issued.get(actor);
    return actor.authStatus==='LOCAL_TEST_ACTOR'&&value?.actorId===actor.actorId?value:undefined;
  }
  private permitted(actor: ActorContext, boardingId: string, permission: string): boolean {
    return this.config.enabled && this.grants(actor)?.properties.some((membership) => membership.boardingId === boardingId && membership.permissions.includes('MANAGE_PROPERTY') && membership.permissions.includes(permission)) === true;
  }
  async canSuggestPlace(actor: ActorContext): Promise<boolean> {return this.config.enabled && this.grants(actor)?.contribute === true;}
  async canManageProperty(actor: ActorContext, id: string) {return this.permitted(actor, id, 'MANAGE_PROPERTY');}
  async canPublishExactBoardingLocation(actor: ActorContext, id: string) {return this.permitted(actor, id, 'PUBLISH_EXACT_LOCATION');}
  async canSetOfficialPrice(actor: ActorContext, id: string) {return this.permitted(actor, id, 'SET_OFFICIAL_PRICE');}
  async canManageMedia(actor:ActorContext,id:string){return this.permitted(actor,id,'MANAGE_MEDIA');}
  async canManageContact(actor:ActorContext,id:string){return this.permitted(actor,id,'MANAGE_CONTACT');}
  async canConfirmVacancy(actor: ActorContext, id: string) {return this.permitted(actor, id, 'CONFIRM_VACANCY');}
}
