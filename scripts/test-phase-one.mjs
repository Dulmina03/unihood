// Own every service: never accept an external database URL or reuse a developer server.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { createClient, loadMigrations, runMigrations, seedDatabase } from './lib/database.mjs';
import { startLandingIntegration } from './lib/test-landing.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const playwrightCli = fileURLToPath(new URL('../apps/web/node_modules/@playwright/test/cli.js', import.meta.url));
const name = `unihood-phase1-${randomUUID().slice(0, 12)}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function docker(args, optional = false) {
  const result = spawnSync('docker', args, {cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024});
  if (!optional && (result.error || result.status !== 0)) throw new Error('Phase 1 owned Docker operation failed');
  return result;
}
async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  const port = server.address().port; await new Promise((resolve) => server.close(resolve)); return port;
}
let owned = false, api, browser, client, map, list, interrupted = false;
const interrupt = () => {interrupted = true; browser?.kill('SIGTERM'); api?.kill('SIGTERM');};
process.once('SIGTERM', interrupt); process.once('SIGINT', interrupt);
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(3000)]);
  if (child.exitCode === null && child.signalCode === null) {child.kill('SIGKILL'); await new Promise((resolve) => child.once('exit', resolve));}
}
try {
  await access(playwrightCli);
  await access(new URL('../apps/api/dist/main.js', import.meta.url));
  await access(new URL('../apps/web/.next/BUILD_ID', import.meta.url));
  const compose = ['compose', '--env-file', '.env', '-f', 'infra/compose.yaml', '--profile', 'test'];
  const started = docker([...compose, 'run', '--detach', '--no-deps', '--name', name, '-p', '127.0.0.1::5432', 'db-test'], true);
  // A partially started owned service must also be removed on startup failure.
  owned = docker(['inspect', name], true).status === 0;
  if (started.error || started.status !== 0 || !owned) throw new Error('Phase 1 isolated database did not start');
  const details = JSON.parse(docker(['inspect', name]).stdout)[0];
  assert.ok(Object.hasOwn(details.HostConfig.Tmpfs ?? {}, '/var/lib/postgresql/data'));
  assert.ok(!details.Mounts.some((mount) => ['bind', 'volume'].includes(mount.Type)), 'Persistent storage is forbidden');
  assert.ok(docker(['exec', name, 'cat', '/proc/mounts']).stdout.split('\n').some((line) => line.split(' ')[1] === '/var/lib/postgresql/data' && line.split(' ')[2] === 'tmpfs'));
  const binding = details.NetworkSettings.Ports['5432/tcp'][0]; assert.equal(binding.HostIp, '127.0.0.1');
  const url = `postgresql://unihood_test:unihood_test_only@127.0.0.1:${binding.HostPort}/unihood_test`;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (interrupted) throw new Error('Interrupted');
    const probe = createClient(url);
    try {await probe.connect(); await probe.query('SELECT 1'); break;}
    catch {if (attempt === 59) throw new Error('Phase 1 database readiness timeout'); await delay(500);}
    finally {await probe.end();}
  }
  client = createClient(url); await client.connect();
  assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, 'unihood_test');
  const migrations = await loadMigrations();
  await runMigrations(client, migrations, 'migrate');
  await seedDatabase(client, url, {APP_ENV: 'test', NODE_ENV: 'test'});
  const port = await freePort();
  api = spawn(process.execPath, ['apps/api/dist/main.js'], {cwd: root, stdio: 'ignore', env: {...process.env, API_HOST: '127.0.0.1', API_PORT: String(port), DATABASE_URL: url, APP_ENV: 'test', NODE_ENV: 'test', ENABLE_SYNTHETIC_ACTORS: 'false', SYNTHETIC_ACTOR: ''}});
  const endpoint = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (interrupted || api.exitCode !== null) throw new Error('Phase 1 API interrupted/unavailable');
    try {if ((await fetch(`${endpoint}/health/ready`, {signal: AbortSignal.timeout(3000)})).status === 200) break;} catch { /* Wait for owned Nest process. */ }
    if (attempt === 59) throw new Error('Phase 1 API readiness timeout'); await delay(250);
  }
  map = await startLandingIntegration(endpoint, {provider: 'openfreemap'});
  if (interrupted) throw new Error('Interrupted');
  list = await startLandingIntegration(endpoint, {provider: 'disabled'});
  if (interrupted) throw new Error('Interrupted');
  console.log('PASS: Phase 1 browser services use real Next → Nest → migrated/seeded isolated tmpfs PostGIS; actors disabled');
  const env = {...process.env, APP_ENV: 'test', ENABLE_SYNTHETIC_ACTORS: 'false', SYNTHETIC_ACTOR: '', NEXT_TELEMETRY_DISABLED: '1', PHASE1_ISOLATED: '1', PHASE1_BASE_URL: map.base, PHASE1_LIST_BASE_URL: list.base};
  delete env.DATABASE_URL; // The browser runner does not need even the disposable DB credential.
  browser = spawn(process.execPath, [playwrightCli, 'test', '--config=playwright.phase1.config.ts'], {cwd: `${root}apps/web`, stdio: 'inherit', env});
  const timeout = setTimeout(() => {interrupted = true; browser.kill('SIGTERM');}, 600000);
  try {
    const status = await new Promise((resolve, reject) => {browser.once('error', reject); browser.once('exit', (code) => resolve(code));});
    if (status !== 0 || interrupted) throw new Error('Phase 1 browser acceptance failed or was interrupted');
  } finally {clearTimeout(timeout);}
} catch {
  console.error('FAIL: Phase 1 acceptance. Build contracts/API/web, check Docker/Chromium availability and inspect the browser failure above; raw server/DB errors are not printed.');
  process.exitCode = 1;
} finally {
  const cleanup = await Promise.allSettled([stop(browser), list?.close(), map?.close(), stop(api), client?.end()]);
  let clean = cleanup.every((result) => result.status === 'fulfilled');
  try {if (owned) docker(['rm', '--force', name]);} catch {clean = false;}
  process.removeListener('SIGTERM', interrupt); process.removeListener('SIGINT', interrupt);
  if (clean) console.log('Phase 1 cleanup complete: owned services stopped; no persistent database was targeted.');
  else {console.error(`FAIL: Phase 1 cleanup incomplete; inspect owned service ${name}`); process.exitCode = 1;}
}
