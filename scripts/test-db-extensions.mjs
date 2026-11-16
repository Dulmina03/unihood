// Integration checks use the running Compose service's exact image, with tmpfs
// storage and no network/volumes. Never run test DDL against the persistent DB.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const compose = ['compose', '--env-file', '.env', '-f', 'infra/compose.yaml'];
const container = `unihood-extension-test-${randomUUID().slice(0, 12)}`;
const up = readFileSync(new URL('../infra/db/migrations/001_extensions.up.sql', import.meta.url), 'utf8');
const down = readFileSync(new URL('../infra/db/migrations/001_extensions.down.sql', import.meta.url), 'utf8');

function docker(args, input, allowFailure = false) {
  const result = spawnSync('docker', args, {
    cwd: root, encoding: 'utf8', input, timeout: 60000, maxBuffer: 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(result.stderr || `Docker exited ${result.status}`);
  }
  return result;
}
function sql(input, allowFailure = false) {
  return docker(['exec', '-i', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
    '-U', 'unihood_test', '-d', 'unihood_test'], input, allowFailure);
}
function query(input) { return sql(input).stdout.trim(); }
function extensions() {
  return JSON.parse(query("SELECT json_agg(extname ORDER BY extname) FROM pg_extension;"));
}
function ownsTrgm() {
  return query("SELECT owns_pg_trgm FROM unihood_migrations.bootstrap_extensions WHERE migration_id = '001_extensions';");
}
function sentinel() {
  return query("SELECT label || ':' || ST_AsText(location) FROM public.migration_sentinel ORDER BY id;");
}

let started = false;
try {
  const service = docker([...compose, 'ps', '-q', 'db']).stdout.trim();
  assert.ok(service, 'Start the Compose db service with pnpm db:up first');
  const image = docker(['inspect', '--format', '{{.Image}}', service]).stdout.trim();
  docker(['run', '--detach', '--rm', '--name', container, '--network', 'none',
    '--tmpfs', '/var/lib/postgresql/data:rw',
    '--env', 'POSTGRES_USER=unihood_test', '--env', 'POSTGRES_PASSWORD=ephemeral_test_only',
    '--env', 'POSTGRES_DB=unihood_test', image]);
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = docker(['exec', container, 'sh', '-c',
      '[ "$(cat /proc/1/comm)" = postgres ] && pg_isready -U unihood_test -d unihood_test'], undefined, true);
    if (result.status === 0) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'Disposable PostGIS initialization did not finish in 60 seconds');
  const baseline = extensions();
  assert.ok(baseline.includes('postgis') && baseline.includes('postgis_topology'));
  assert.ok(!baseline.includes('pg_trgm'), 'Fresh image unexpectedly preinstalls pg_trgm');
  sql(down);
  assert.deepEqual(extensions(), baseline, 'Rollback without metadata must preserve image extensions');
  console.log('PASS: fresh image initialization and rollback before first migrate');

  sql(up);
  assert.equal(ownsTrgm(), 't');
  sql(up);
  assert.equal(ownsTrgm(), 't', 'Repeated migrate must not adopt its own extension');
  sql(`CREATE TABLE public.migration_sentinel (id integer PRIMARY KEY, label text NOT NULL, location geometry(Point,4326));
    INSERT INTO public.migration_sentinel VALUES (1, 'synthetic fixture', ST_SetSRID(ST_Point(1, 2),4326));
    CREATE INDEX migration_sentinel_trgm ON public.migration_sentinel USING gin (label gin_trgm_ops);`);
  const originalData = sentinel();
  const blocked = sql(down, true);
  assert.notEqual(blocked.status, 0, 'Dependent trigram index must block rollback');
  assert.match(blocked.stderr, /depend/);
  assert.equal(ownsTrgm(), 't', 'Failed rollback must retain the migration record');
  assert.equal(sentinel(), originalData);
  assert.equal(query("SELECT to_regclass('public.migration_sentinel_trgm') IS NOT NULL;"), 't');
  console.log('PASS: dependency blocks rollback atomically; migration state, index and data survive');

  // Remove only our disposable test index so the owned-extension path can run.
  sql('DROP INDEX public.migration_sentinel_trgm;');
  sql(down);
  assert.deepEqual(extensions(), baseline);
  assert.equal(ownsTrgm(), '');
  assert.equal(sentinel(), originalData, 'PostGIS-backed table/data must survive rollback');
  sql(down);
  assert.deepEqual(extensions(), baseline);
  sql(up);
  assert.equal(ownsTrgm(), 't');
  assert.equal(sentinel(), originalData);
  console.log('PASS: migrate, repeated migrate, rollback, repeated rollback and re-migration');

  sql(down);
  // Simulate a database migrated by the original untracked bootstrap SQL.
  sql(`CREATE EXTENSION pg_trgm;
    CREATE INDEX migration_sentinel_trgm ON public.migration_sentinel USING gin (label gin_trgm_ops);`);
  const adopted = extensions();
  sql(up);
  assert.equal(ownsTrgm(), 'f');
  sql(up);
  sql(down);
  assert.deepEqual(extensions(), adopted);
  assert.equal(sentinel(), originalData);
  assert.equal(query("SELECT to_regclass('public.migration_sentinel_trgm') IS NOT NULL;"), 't');
  sql(down);
  sql(up);
  assert.equal(ownsTrgm(), 'f');
  assert.equal(sentinel(), originalData);
  console.log('PASS: legacy/pre-existing pg_trgm, dependent index and spatial data retained across cycles');
} finally {
  if (started) docker(['rm', '--force', container]);
}
