import {
  BoardingRequestInputSchema,
  ReportInputSchema,
  ReviewInputSchema,
} from '@unihood/contracts';
import {
  SyntheticActors,
  SYNTHETIC_PROPERTY_A as a,
  SYNTHETIC_PROPERTY_B as unrelated,
  SYNTHETIC_SECOND_OWNER_PROPERTY as b,
  syntheticConfig,
} from '../src/identity/synthetic-actors';

const local = {socket: {remoteAddress: '127.0.0.1', localAddress: '127.0.0.1'}, headers: {host: '127.0.0.1:3001'}};
const env = {APP_ENV: 'test', NODE_ENV: 'test', ENABLE_SYNTHETIC_ACTORS: 'true', SYNTHETIC_ACTOR: 'owner-a'};
const actorFor = async (fixture: string) => new SyntheticActors(syntheticConfig({...env, SYNTHETIC_ACTOR: fixture})).resolveRequestActor(local);
const methods = ['canManageProperty', 'canPublishExactBoardingLocation', 'canSetOfficialPrice', 'canConfirmVacancy', 'canManageMedia', 'canManageContact'] as const;

describe('UNI-047 multi-owner and multi-contributor boundaries', () => {
  it('gives two legitimate owners disjoint property capabilities', async () => {
    const ownerA = new SyntheticActors(syntheticConfig(env)), ownerB = new SyntheticActors(syntheticConfig({...env, SYNTHETIC_ACTOR: 'owner-b'}));
    const first = await ownerA.resolveRequestActor(local), second = await ownerB.resolveRequestActor(local);
    expect(first.actorId).toBe('synthetic:owner-a'); expect(second.actorId).toBe('synthetic:owner-b');
    for (const method of methods) {
      expect(await ownerA[method](first, a)).toBe(true); expect(await ownerA[method](first, b)).toBe(false);
      expect(await ownerB[method](second, b)).toBe(true); expect(await ownerB[method](second, a)).toBe(false);
      expect(await ownerA[method](second, a)).toBe(false); expect(await ownerB[method](first, b)).toBe(false);
      expect(await ownerA[method](first, unrelated)).toBe(false);
    }
    expect(await ownerA.canManageProperty({...first}, a)).toBe(false);
    expect(await ownerB.canManageProperty({...second, memberships: [...second.memberships, {boardingId: a, permissions: ['MANAGE_PROPERTY']}]}, a)).toBe(false);
  });

  it('keeps independent contributors separate and unable to manage or operate', async () => {
    const firstActors = new SyntheticActors(syntheticConfig({...env, SYNTHETIC_ACTOR: 'contributor'})), secondActors = new SyntheticActors(syntheticConfig({...env, SYNTHETIC_ACTOR: 'contributor-b'}));
    const first = await firstActors.resolveRequestActor(local), second = await secondActors.resolveRequestActor(local);
    expect(first.actorId).not.toBe(second.actorId);
    for (const [actors, actor] of [[firstActors, first], [secondActors, second]] as const) {
      expect(await actors.canSuggestPlace(actor)).toBe(true);
      expect(await actors.canOperateReports(actor)).toBe(false);
      for (const method of methods) expect(await actors[method](actor, a)).toBe(false);
    }
    expect((await new SyntheticActors(syntheticConfig({...env, SYNTHETIC_ACTOR: 'unknown'})).resolveRequestActor(local)).authStatus).toBe('GUEST');
    expect((await new SyntheticActors(syntheticConfig({...env, SYNTHETIC_ACTOR: 'contributor-b', APP_ENV: 'production'})).resolveRequestActor(local)).authStatus).toBe('GUEST');
  });

  it('rejects caller ownership, identity, vote-proof and privilege fields in contribution inputs', async () => {
    const key = '47000000-0000-4000-8000-000000000001', boardingId = a;
    expect(ReviewInputSchema.safeParse({key, targetType: 'BOARDING', targetId: boardingId, reviewKind: 'GENERAL_OBSERVATION', rating: 5, sourceConfidence: 'COMMUNITY_SUBMITTED', sourceLabel: 'SYNTHETIC', syntheticAcknowledged: true}).success).toBe(true);
    for (const extra of [{ownerId: 'synthetic:owner-a'}, {actorId: 'synthetic:owner-b'}, {verifiedOwner: true}, {votes: 99}, {publicationStatus: 'PUBLISHED'}, {exactLocation: {lat: 1, lng: 2}}]) {
      expect(ReviewInputSchema.safeParse({key, targetType: 'BOARDING', targetId: boardingId, reviewKind: 'GENERAL_OBSERVATION', rating: 5, sourceConfidence: 'COMMUNITY_SUBMITTED', sourceLabel: 'SYNTHETIC', syntheticAcknowledged: true, ...extra}).success).toBe(false);
      expect(ReportInputSchema.safeParse({key, targetType: 'BOARDING', targetId: boardingId, reportType: 'WRONG_FEE', details: 'Synthetic fictional fee mismatch context only.', syntheticAcknowledged: true, ...extra}).success).toBe(false);
      expect(BoardingRequestInputSchema.safeParse({requestKey: key, boardingId, kind: 'CONTACT_OWNER', syntheticAcknowledged: true, ...extra}).success).toBe(false);
    }
  });
});
