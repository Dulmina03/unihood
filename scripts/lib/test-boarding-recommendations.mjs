import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { runMigrations } from './database.mjs';
export async function testBoardingRecommendations({ client, url, migrations, get }) {
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_recommendation_intake')).rows[0].n, 0);
  const before = (await client.query('SELECT (SELECT count(*) FROM public.places)::int AS places,(SELECT count(*) FROM public.listings)::int AS listings')).rows[0];
  const children = [];
  async function start(actor) {
    const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const child = spawn(process.execPath, ['apps/api/dist/main.js'], { stdio: 'ignore', env: { ...process.env, APP_ENV: 'test', NODE_ENV: 'test', DATABASE_URL: url, API_HOST: '127.0.0.1', API_PORT: String(port), ENABLE_SYNTHETIC_ACTORS: 'true', SYNTHETIC_ACTOR: actor } }); children.push(child);
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 40; i++) { try { if ((await fetch(base + '/health', { signal: AbortSignal.timeout(1000) })).ok) return base; } catch {} if (i === 39 || child.exitCode !== null) throw new Error('Synthetic recommendation API startup failed'); await delay(250); }
  }
  const input = { key: randomUUID(), draft: { title: 'Synthetic Community Study Home', description: 'Fictional recommendation for testing only; no real accommodation.', locality: null, facilities: ['Wi-Fi', 'Study space'], privacyAcknowledged: true, mediaGuidanceAcknowledged: true } };
  try {
    const contributor = await start('contributor'), owner = await start('owner-a');
    const post = (base, body) => fetch(base + '/api/v1/contributions/boarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    const results = await Promise.all([post(contributor, input), post(contributor, input)]);
    assert.ok(results.every(r => r.status === 200)); const receipts = await Promise.all(results.map(r => r.json())); assert.deepEqual(receipts[0], receipts[1]);
    assert.equal(receipts[0].published, false); assert.equal(receipts[0].publisherKind, 'COMMUNITY_RECOMMENDATION');
    assert.ok(!/Study Home|description|payload_hash|actor_ref/.test(JSON.stringify(receipts[0])));
    assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_recommendation_intake')).rows[0].n, 1);
    const reordered = await post(contributor, { ...input, draft: { ...input.draft, facilities: [...input.draft.facilities].reverse() } }); assert.equal(reordered.status, 200); assert.deepEqual(await reordered.json(), receipts[0]);
    assert.equal((await post(contributor, { ...input, draft: { ...input.draft, title: 'Synthetic Changed Intent' } })).status, 409);
    const anotherActor = await post(owner, input); assert.equal(anotherActor.status, 200); assert.notEqual((await anotherActor.json()).contributionId, receipts[0].contributionId);
    const flagged = await post(contributor, { key: randomUUID(), draft: { ...input.draft, description: 'Synthetic contact canary +12025550100 https://example.invalid' } }); assert.equal(flagged.status, 200); const flaggedReceipt = await flagged.json(); assert.equal(flaggedReceipt.reviewState, 'NEEDS_EVIDENCE'); assert.ok(!JSON.stringify(flaggedReceipt).includes('5550100'));
    for (const patch of [{ entrance: { lat: 42, lng: 43 } }, { price: 12345 }, { vacancy: 'AVAILABLE' }, { phone: 'PRIVATE_CANARY' }, { publisherKind: 'OWNER_OFFICIAL' }]) assert.equal((await post(contributor, { ...input, draft: { ...input.draft, ...patch } })).status, 400);
    assert.equal((await get('/api/v1/contributions/boarding')).status, 404);
    assert.equal((await get('/api/v1/boardings/' + receipts[0].contributionId)).status, 404);
    const after = (await client.query('SELECT (SELECT count(*) FROM public.places)::int AS places,(SELECT count(*) FROM public.listings)::int AS listings')).rows[0]; assert.deepEqual(after, before);
    assert.equal((await fetch(contributor + '/api/v1/boardings/00000000-0000-4000-8000-000000000001/prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    assert.deepEqual(await runMigrations(client,migrations,'rollback'),['017_privacy_reports']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);
    assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);
    assert.deepEqual(await runMigrations(client, migrations, 'rollback'), ['014_boarding_recommendation_resolutions']);
    await assert.rejects(runMigrations(client, migrations, 'rollback'), /populated tables/);
    await runMigrations(client, migrations, 'migrate');
    assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_private.boarding_recommendation_intake')).rows[0].n, 3);
    const columns = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='unihood_private' AND table_name='boarding_recommendation_intake'")).rows.map(row => row.column_name); assert.ok(!columns.some(name => /geo|phone|price|vacancy|owner_verified/.test(name)));
    assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='unihood_private' AND a.grantee=0 AND a.privilege_type='USAGE'")).rows[0].n, 0);
    console.log('PASS: UNI-040 real guarded synthetic boarding intake, concurrent/reordered replay, changed-key conflict, actor isolation, held privacy signals and zero canonical/owner/publication writes');
  } finally {
    await Promise.all(children.map(async child => { if (child.exitCode !== null) return; child.kill('SIGTERM'); await new Promise(resolve => { const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 3000); child.once('exit', () => { clearTimeout(timer); resolve(); }); }); }));
    await client.query('DELETE FROM unihood_private.boarding_recommendation_intake');
  }
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['017_privacy_reports']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['016_review_intake']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['015_poi_correction_intake']);
  assert.deepEqual(await runMigrations(client, migrations, 'rollback'), ['014_boarding_recommendation_resolutions']);
  await client.query('CREATE VIEW public.synthetic_intake_dependency AS SELECT id FROM unihood_private.boarding_recommendation_intake');
  await assert.rejects(runMigrations(client, migrations, 'rollback'), error => error.code === '2BP01');
  await client.query('DROP VIEW public.synthetic_intake_dependency');
  assert.deepEqual(await runMigrations(client, migrations, 'rollback'), ['013_boarding_recommendation_intake']);
  await runMigrations(client, migrations, 'migrate'); assert.deepEqual(await runMigrations(client, migrations, 'migrate'), []);
  console.log('PASS: UNI-040 populated/dependency rollback guards, empty down/up/repeat, private schema ACL and existing extension/data preservation');
}
