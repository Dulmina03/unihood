import { SyntheticActors, syntheticConfig, SYNTHETIC_PROPERTY_A as a, SYNTHETIC_PROPERTY_B as b } from '../src/identity/synthetic-actors';
const local = {socket: {remoteAddress: '127.0.0.1', localAddress: '127.0.0.1'}, headers: {host: '127.0.0.1:3001'}};
const env = {APP_ENV: 'test', NODE_ENV: 'test', ENABLE_SYNTHETIC_ACTORS: 'true', SYNTHETIC_ACTOR: 'owner-a'};
describe('synthetic capability boundary', () => {
  it.each([
    {}, {APP_ENV: 'local'}, {...env, ENABLE_SYNTHETIC_ACTORS: 'false'}, {...env, ENABLE_SYNTHETIC_ACTORS: 'TRUE'},
    {...env, APP_ENV: 'production'}, {...env, APP_ENV: 'staging'}, {...env, NODE_ENV: 'production'},
    {...env, APP_ENV: 'local', NODE_ENV: 'test'}, {...env, APP_ENV: 'unknown'}, {...env, API_HOST: '0.0.0.0'}, {...env, API_HOST: 'localhost'},
  ])('fails closed for unsafe or incomplete configuration %#', async (input) => {
    const actors = new SyntheticActors(syntheticConfig(input));
    const actor = await actors.resolveRequestActor(local);
    expect(actor.authStatus).toBe('GUEST');
    expect(await actors.canManageProperty(actor, a)).toBe(false);
  });
  it('supports explicit loopback local mode without enabling NODE_ENV production', () => {
    expect(syntheticConfig({APP_ENV: 'local', ENABLE_SYNTHETIC_ACTORS: 'true'}).enabled).toBe(true);
    expect(syntheticConfig({...env, APP_ENV: 'local', NODE_ENV: 'production'}).enabled).toBe(false);
  });
  it.each([
    {socket: {remoteAddress: '203.0.113.1', localAddress: '127.0.0.1'}, headers: local.headers},
    {...local, headers: {host: 'evil.example'}}, {...local, headers: {...local.headers, origin: 'https://evil.example'}},
    {...local, headers: {...local.headers, origin: 'null'}}, {...local, headers: {...local.headers, 'x-forwarded-for': '127.0.0.1'}},
    {...local, headers: {...local.headers, 'sec-fetch-site': 'cross-site'}}, {}, null,
  ])('rejects remote, proxied, rebinding and cross-origin requests %#', async (input) => {
    expect((await new SyntheticActors(syntheticConfig(env)).resolveRequestActor(input)).authStatus).toBe('GUEST');
  });
  it('uses only configured fixtures and issued capability records', async () => {
    const actors = new SyntheticActors(syntheticConfig(env));
    const actor = await actors.resolveRequestActor({...local, headers: {...local.headers, 'x-role': 'admin', 'x-user-id': 'real-user'}});
    expect(actor.actorId).toBe('synthetic:owner-a');
    expect(await actors.canSuggestPlace(actor)).toBe(true);
    for (const method of ['canManageProperty', 'canPublishExactBoardingLocation', 'canSetOfficialPrice', 'canConfirmVacancy','canManageMedia','canManageContact'] as const) {
      expect(await actors[method](actor, a)).toBe(true); expect(await actors[method](actor, b)).toBe(false);
      expect(await actors[method]({...actor}, a)).toBe(false);
      expect(await actors[method]({...actor, authStatus: 'VERIFIED_ACCOUNT'}, a)).toBe(false);
    }
    actor.memberships.push({boardingId: b, permissions: ['MANAGE_PROPERTY', 'SET_OFFICIAL_PRICE']});
    expect(await actors.canSetOfficialPrice(actor, b)).toBe(false);
    expect(await new SyntheticActors(syntheticConfig(env)).canManageProperty(actor, a)).toBe(false);
  });
  it('contributors and limited managers cannot escalate to exact map/vacancy', async () => {
    for (const fixture of ['contributor', 'price-manager-a', 'unknown']) {
      const actors = new SyntheticActors(syntheticConfig({...env, SYNTHETIC_ACTOR: fixture}));
      const actor = await actors.resolveRequestActor(local);
      expect(await actors.canPublishExactBoardingLocation(actor, a)).toBe(false);
      expect(await actors.canConfirmVacancy(actor, a)).toBe(false);expect(await actors.canManageMedia(actor,a)).toBe(false);expect(await actors.canManageContact(actor,a)).toBe(false);
      expect(await actors.canSetOfficialPrice(actor, a)).toBe(fixture === 'price-manager-a');
    }
  });
});
