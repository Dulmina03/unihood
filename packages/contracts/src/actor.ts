// Policy/provider decisions remain deferred to Phase 7.
export interface ActorContext {
  actorId: string | null;
  authStatus: 'GUEST' | 'VERIFIED_ACCOUNT' | 'LOCAL_TEST_ACTOR';
  memberships: Array<{ boardingId: string; permissions: string[] }>;
}
export interface IdentityProvider {
  resolveRequestActor(request: unknown): Promise<ActorContext>;
}
export interface PermissionService {
  canSuggestPlace(actor: ActorContext): Promise<boolean>;
  canManageProperty(actor: ActorContext, boardingId: string): Promise<boolean>;
  canPublishExactBoardingLocation(actor: ActorContext, boardingId: string): Promise<boolean>;
  canSetOfficialPrice(actor: ActorContext, boardingId: string): Promise<boolean>;
  canManageMedia(actor: ActorContext, boardingId: string): Promise<boolean>;
  canManageContact(actor: ActorContext, boardingId: string): Promise<boolean>;
  canConfirmVacancy(actor: ActorContext, boardingId: string): Promise<boolean>;
}

