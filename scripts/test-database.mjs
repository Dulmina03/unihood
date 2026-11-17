import {testBoardingPrivacy} from './lib/test-boarding-privacy.mjs';
import {testBoardingVacancy} from './lib/test-boarding-vacancy.mjs';
import { testBoardingInventory } from './lib/test-boarding-inventory.mjs';
import { testBoardingMap } from './lib/test-boarding-map.mjs';
import { testBoardingFoundation } from './lib/test-boarding-foundation.mjs';
import { testPoiProposalApi } from './lib/test-poi-proposal-api.mjs';
import { testPoiSubmissions } from './lib/test-poi-submissions.mjs';
import { testPoiMatching } from './lib/test-poi-matching.mjs';
import { testPublicPois } from './lib/test-public-pois.mjs';
import { startLandingIntegration } from './lib/test-landing.mjs';
import { testPlaces } from './lib/test-places.mjs';
import { testUniversities } from './lib/test-universities.mjs';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { assertSeedEnvironment, createClient, loadMigrations, runMigrations, seedDatabase } from './lib/database.mjs';
import { testBoardingAdvertisements } from './lib/test-boarding-advertisements.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const compose = ['compose', '--env-file', '.env', '-f', 'infra/compose.yaml', '--profile', 'test'];
const name = `unihood-db-test-${randomUUID().slice(0, 12)}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function docker(args, allowFailure = false) {
  const result = spawnSync('docker', args, {cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024});
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) throw new Error('Docker test operation failed; inspect the isolated test service');
  return result;
}
async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
let started = false;
let api;
let client;
let paused = false;
let landing;
try {
  docker([...compose, 'run', '--detach', '--no-deps', '--name', name, '-p', '127.0.0.1::5432', 'db-test']);
  started = true;
  const details = JSON.parse(docker(['inspect', name]).stdout)[0];
  assert.ok(Object.hasOwn(details.HostConfig.Tmpfs ?? {}, '/var/lib/postgresql/data'));
  const mounts = docker(['exec', name, 'cat', '/proc/mounts']).stdout;
  assert.ok(mounts.split('\n').some((line) => line.split(' ')[1] === '/var/lib/postgresql/data' && line.split(' ')[2] === 'tmpfs'));
  assert.ok(!details.Mounts.some((mount) => ['volume', 'bind'].includes(mount.Type)), 'Tests must never mount persistent data');
  const binding = details.NetworkSettings.Ports['5432/tcp'][0];
  assert.equal(binding.HostIp, '127.0.0.1');
  const url = `postgresql://unihood_test:unihood_test_only@127.0.0.1:${binding.HostPort}/unihood_test`;
  for (let attempt = 0; attempt < 60; attempt++) {
    const probe = createClient(url);
    try {
      await probe.connect();
      await probe.query('SELECT 1');
      break;
    } catch {
      if (attempt === 59) throw new Error('Test DB initialization timeout');
      await delay(500);
    } finally { await probe.end(); }
  }
  client = createClient(url);
  await client.connect();
  assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, 'unihood_test');
  const baseline = (await client.query('SELECT extname, extversion FROM pg_extension ORDER BY extname')).rows;
  const migrations = await loadMigrations();
  const bootstrap = migrations.slice(0, 1);
  const port = await freePort();
  api = spawn(process.execPath, ['apps/api/dist/main.js'], { cwd: root,
    env: {...process.env, API_HOST: '127.0.0.1', API_PORT: String(port), DATABASE_URL: url, APP_ENV: 'test', NODE_ENV: 'test', ENABLE_SYNTHETIC_ACTORS: 'false', SYNTHETIC_ACTOR: ''},
    stdio: 'ignore' });
  const endpoint = `http://127.0.0.1:${port}`;
  async function get(path) { return fetch(`${endpoint}${path}`, {signal: AbortSignal.timeout(4000)}); }
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await get('/health')).status === 200) break; } catch { /* Wait for the real API. */ }
    if (api.exitCode !== null) throw new Error('API failed to start; run pnpm build before db:test');
    if (attempt === 39) throw new Error('API startup timeout');
    await delay(250);
  }
  const expectReadiness = async (ready) => {
    const response = await get('/api/v1/health/ready');
    assert.equal(response.status, ready ? 200 : 503);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.deepEqual(await response.json(), {status: ready ? 'ready' : 'not_ready', service: 'unihood-api',
      checks: { database: ready ? 'ready' : 'unavailable' }});
  };
  await expectReadiness(false);
  console.log('PASS: isolated tmpfs database; API liveness 200 and unmigrated readiness 503');

  const peer = createClient(url);
  await peer.connect();
  try { await Promise.all([runMigrations(client, migrations, 'migrate'), runMigrations(peer, migrations, 'migrate')]); }
  finally { await peer.end(); }
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_migrations.schema_migrations')).rows[0].n, migrations.length);
  assert.equal((await client.query('SELECT owns_pg_trgm FROM unihood_migrations.bootstrap_extensions')).rows[0].owns_pg_trgm, true);
  await expectReadiness(true);
  console.log('PASS: concurrent/repeated migrate serializes without duplicating history or losing ownership');

  const second = { id: '900_order_probe', checksum: '2'.repeat(64),
    up: `CREATE TABLE public.unihood_migration_probe (id integer PRIMARY KEY, label text, location geometry(Point,4326));
      INSERT INTO public.unihood_migration_probe VALUES (1, 'Synthetic probe', ST_SetSRID(ST_Point(0,0),4326));`,
    down: 'DROP TABLE public.unihood_migration_probe RESTRICT;' };
  const third = { id: '901_order_probe', checksum: '3'.repeat(64),
    up: 'CREATE INDEX unihood_probe_trgm ON public.unihood_migration_probe USING gin (label gin_trgm_ops);',
    down: 'DROP INDEX public.unihood_probe_trgm;' };
  const fail = {...third, up: 'SELECT intentionally_missing_column;'};
  await assert.rejects(runMigrations(client, [...migrations, second, fail], 'migrate'));
  assert.equal((await client.query("SELECT to_regclass('public.unihood_migration_probe') AS name")).rows[0].name, null);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_migrations.schema_migrations')).rows[0].n, migrations.length);
  const ordered = [...migrations, second, third];
  assert.deepEqual(await runMigrations(client, ordered, 'migrate'), ['900_order_probe', '901_order_probe']);
  assert.deepEqual(await runMigrations(client, ordered, 'rollback'), ['901_order_probe']);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.unihood_migration_probe')).rows[0].n, 1);
  await assert.rejects(runMigrations(client, [migrations[0], {...migrations[1], checksum: 'changed'}], 'migrate'), /checksum mismatch/);
  assert.deepEqual(await runMigrations(client, ordered, 'rollback'), ['900_order_probe']);
  console.log('PASS: ordered migration/reverse order; failing batch rolls back DDL/history; checksum drift rejected');

  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['012_boarding_media_contacts']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['011_boarding_vacancy_confirmations']);

  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['010_boarding_inventory_prices']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['009_boarding_public_entrances']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['008_boarding_advertisement_previews']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['007_boarding_property_foundation']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['006_poi_proposal_review']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['005_poi_submission_transactions']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['004_public_poi_geography_index']);
  await testPlaces({client, url, migrations:migrations.slice(0,3)});
  await runMigrations(client,migrations,'migrate');
  const env = {APP_ENV: 'test', NODE_ENV: 'test'};
  await seedDatabase(client, url, env);
  await seedDatabase(client, url, env);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_fixtures.samples')).rows[0].n, 1);
  const original = (await client.query('SELECT id, label, ST_AsText(location::geometry) AS point FROM unihood_fixtures.samples ORDER BY id')).rows;
  // Deliberate corruption only in this disposable DB: seeds must not write through drift.
  await client.query("UPDATE unihood_migrations.schema_migrations SET checksum='test-drift' WHERE migration_id='001_extensions'");
  await assert.rejects(seedDatabase(client, url, env), /checksum\/history drift/);
  await client.query("UPDATE unihood_migrations.schema_migrations SET checksum=$1 WHERE migration_id='001_extensions'", [migrations[0].checksum]);
  assert.throws(() => assertSeedEnvironment(url, {APP_ENV: 'production'}));
  assert.throws(() => assertSeedEnvironment(url, {APP_ENV: 'test', NODE_ENV: 'production'}));
  assert.throws(() => assertSeedEnvironment('postgresql://example.com/remote', env));
  await client.query("UPDATE unihood_fixtures.samples SET label='Synthetic local edit'");
  await assert.rejects(seedDatabase(client, url, env), /existing data preserved/);
  assert.equal((await client.query('SELECT label FROM unihood_fixtures.samples')).rows[0].label, 'Synthetic local edit');
  await client.query('UPDATE unihood_fixtures.samples SET label=$1', [original[0].label]);
  console.log('PASS: repeatable synthetic seeds; production/remote refusal; local edits preserved on conflict');

  await testPublicPois({client,url,get,endpoint});
  await testBoardingPrivacy({client,url,migrations,get,endpoint});
  await testBoardingVacancy({client,url,migrations,get,endpoint});
  await testBoardingInventory({client,migrations,url,get,endpoint});
  await testBoardingMap({client,migrations,url,get,endpoint});
  await testBoardingAdvertisements({client,migrations,url,get});
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['012_boarding_media_contacts']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['011_boarding_vacancy_confirmations']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['010_boarding_inventory_prices']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['009_boarding_public_entrances']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['008_boarding_advertisement_previews']);
  await testBoardingFoundation({client,migrations:migrations.slice(0,7),url,get});
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['007_boarding_property_foundation']);
  await testPoiProposalApi({client,migrations:migrations.slice(0,6),url,endpoint});
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['006_poi_proposal_review']);
  await testPoiSubmissions({client,migrations:migrations.slice(0,5),url,endpoint});
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['005_poi_submission_transactions']);
  await testPoiMatching({client,migrations:migrations.slice(0,4),url});
  await runMigrations(client,migrations,'migrate');
  await testUniversities({client, url, get, endpoint, migrations});
  await runMigrations(client, migrations, 'rollback');
  await client.query(`CREATE TABLE public.unihood_extension_guard (label text, location geometry(Point,4326));
    INSERT INTO public.unihood_extension_guard VALUES ('Synthetic guard', ST_SetSRID(ST_Point(0,0),4326));
    CREATE INDEX unihood_extension_guard_trgm ON public.unihood_extension_guard USING gin (label gin_trgm_ops);`);
  await assert.rejects(runMigrations(client, bootstrap, 'rollback'), (error) => error.code === '2BP01');
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_migrations.schema_migrations')).rows[0].n, 1);
  await client.query('DROP INDEX public.unihood_extension_guard_trgm');
  await runMigrations(client, bootstrap, 'rollback');
  assert.deepEqual((await client.query('SELECT extname, extversion FROM pg_extension ORDER BY extname')).rows, baseline);
  assert.deepEqual((await client.query('SELECT id, label, ST_AsText(location::geometry) AS point FROM unihood_fixtures.samples ORDER BY id')).rows, original);
  await expectReadiness(false);
  assert.deepEqual(await runMigrations(client, bootstrap, 'rollback'), []);
  await runMigrations(client, bootstrap, 'migrate');
  await expectReadiness(false);
  console.log('PASS: dependency failure preserves both ledgers/data; owned extension rollback and re-migrate retain spatial fixtures');

  await runMigrations(client, bootstrap, 'rollback');
  await client.query('CREATE EXTENSION pg_trgm');
  // Simulate the exact pre-runner UNI-001 metadata; do not infer ownership again.
  await client.query(await readFile(new URL('../infra/db/migrations/001_extensions.up.sql', import.meta.url), 'utf8'));
  await runMigrations(client, bootstrap, 'migrate');
  assert.equal((await client.query('SELECT owns_pg_trgm FROM unihood_migrations.bootstrap_extensions')).rows[0].owns_pg_trgm, false);
  await runMigrations(client, bootstrap, 'rollback');
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_extension WHERE extname='pg_trgm'")).rows[0].n, 1);
  await runMigrations(client, bootstrap, 'migrate');
  await expectReadiness(false);
  console.log('PASS: legacy ownership adoption and pre-existing extensions preserved');

  await runMigrations(client, migrations, 'migrate');
  await seedDatabase(client, url, env);
  await expectReadiness(true);

  if (process.env.TEST_LANDING_WEB === '1') landing = await startLandingIntegration(endpoint);

  docker(['pause', name]);
  paused = true;
  const before = Date.now();
  await expectReadiness(false);
  assert.ok(Date.now() - before < 4000, 'Database outage must have bounded readiness latency');
  assert.equal((await get('/health')).status, 200);
  const unavailable = await get('/api/v1/universities');
  assert.equal(unavailable.status, 503);
  const failure = await unavailable.json();
  assert.equal(failure.error.code, 'SERVICE_UNAVAILABLE');
  assert.ok(!JSON.stringify(failure).includes('postgres'));
  if (landing) await landing.checkOutage();
  docker(['unpause', name]);
  paused = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    const response = await get('/health/ready');
    if (response.status === 200) break;
    if (attempt === 14) throw new Error('Readiness did not recover after database resumed');
    await delay(250);
  }
  await expectReadiness(true);
  console.log('PASS: real DB outage returns redacted 503 within deadline, liveness stays 200, readiness recovers');
} finally {
  if (landing) await landing.close();
  if (paused) docker(['unpause', name], true);
  if (api) {
    api.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => api.once('exit', resolve)), delay(3000)]);
    if (api.exitCode === null) api.kill('SIGKILL');
  }
  if (client) await client.end();
  if (started) docker(['rm', '--force', name]);
}
