import { seedUniversities } from './university-seeds.mjs';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';

export class DatabaseToolError extends Error {}
export const migrationsDirectory = new URL('../../infra/db/migrations/', import.meta.url);

export async function loadMigrations(directory = migrationsDirectory) {
  const files = await readdir(directory);
  const names = files.filter((name) => /^\d{3}_[a-z0-9_]+\.up\.sql$/.test(name)).sort();
  const seen = new Set();
  const migrations = [];
  for (const name of names) {
    const id = name.replace('.up.sql', '');
    const number = id.slice(0, 3);
    if (seen.has(number)) throw new DatabaseToolError('Duplicate migration number');
    seen.add(number);
    const downName = `${id}.down.sql`;
    if (!files.includes(downName)) throw new DatabaseToolError(`Missing rollback for ${id}`);
    const up = await readFile(new URL(name, directory), 'utf8');
    const down = await readFile(new URL(downName, directory), 'utf8');
    const checksum = createHash('sha256').update(up).update('\0').update(down).digest('hex');
    const body = (source) => {
      // UNI-001 remains byte-for-byte compatible with its standalone psql harness.
      // Only its explicit legacy outer wrapper is removed; the runner owns the transaction.
      if (id === '001_extensions') {
        const wrapped = source.match(/^(?:--[^\n]*(?:\n|$)|\s)*BEGIN;\s*([\s\S]*?)\s*COMMIT;\s*$/i);
        if (!wrapped) throw new DatabaseToolError('Unexpected legacy bootstrap transaction wrapper');
        source = wrapped[1];
      }
      // Ignore quoted function bodies/literals and comments before checking top-level
      // transaction commands (including COMMIT WORK and START TRANSACTION).
      const statements = source.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|(\$(?:[A-Za-z_]\w*)?\$)[\s\S]*?\1/g, ' ');
      if (/(?:^|;)\s*(?:BEGIN\b|START\s+TRANSACTION\b|COMMIT\b|END\b|ROLLBACK\b|PREPARE\s+TRANSACTION\b)/i.test(statements) || /^\s*\\/m.test(statements)) {
        throw new DatabaseToolError(`Runner-managed transactions required for ${id}`);
      }
      return source;
    };
    migrations.push({ id, checksum, up: body(up), down: body(down) });
  }
  if (migrations[0]?.id !== '001_extensions') throw new DatabaseToolError('Bootstrap migration must be first');
  const paired = new Set(names.flatMap((name) => [name, name.replace('.up.sql', '.down.sql')]));
  if (files.some((name) => name.endsWith('.sql') && !paired.has(name))) {
    throw new DatabaseToolError('Unrecognized or unpaired SQL migration');
  }
  return migrations;
}

export function createClient(connectionString) {
  if (!connectionString) throw new DatabaseToolError('Database URL is required; no implicit database target');
  return new pg.Client({ connectionString, connectionTimeoutMillis: 3000, statement_timeout: 30000 });
}

export async function transaction(client, action) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query('SELECT pg_advisory_xact_lock(73201, 1)');
    const result = await action();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function assertBaseline(client) {
  const { rows: [row] } = await client.query(`SELECT
    EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AND
    EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS extensions,
    to_regclass('unihood_migrations.bootstrap_extensions') IS NOT NULL AS metadata`);
  if (!row.extensions || !row.metadata) throw new DatabaseToolError('Bootstrap database drift; inspect extensions/ownership state');
  const { rowCount } = await client.query("SELECT 1 FROM unihood_migrations.bootstrap_extensions WHERE migration_id = '001_extensions'");
  if (!rowCount) throw new DatabaseToolError('Bootstrap ownership record missing; inspect database drift');
}

export async function runMigrations(client, migrations, action) {
  if (!['migrate', 'rollback'].includes(action)) throw new DatabaseToolError('Unknown migration action');
  return transaction(client, async () => {
    await client.query(`CREATE SCHEMA IF NOT EXISTS unihood_migrations;
      CREATE TABLE IF NOT EXISTS unihood_migrations.schema_migrations (
        migration_id text PRIMARY KEY, checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
    let { rows } = await client.query('SELECT migration_id, checksum FROM unihood_migrations.schema_migrations ORDER BY migration_id');
    if (!rows.length) {
      const { rows: [legacy] } = await client.query("SELECT to_regclass('unihood_migrations.bootstrap_extensions') IS NOT NULL AS present");
      if (legacy.present) {
        const { rowCount } = await client.query("SELECT 1 FROM unihood_migrations.bootstrap_extensions WHERE migration_id = '001_extensions'");
        if (rowCount) {
          await assertBaseline(client);
          await client.query('INSERT INTO unihood_migrations.schema_migrations (migration_id, checksum) VALUES ($1, $2)',
            [migrations[0].id, migrations[0].checksum]);
          rows = [{ migration_id: migrations[0].id, checksum: migrations[0].checksum }];
        }
      }
    }
    for (let index = 0; index < rows.length; index++) {
      if (rows[index].migration_id !== migrations[index]?.id || rows[index].checksum !== migrations[index].checksum) {
        throw new DatabaseToolError('Migration history/checksum mismatch; applied migrations must be an unchanged prefix');
      }
    }
    if (rows.length) await assertBaseline(client);
    if (action === 'migrate') {
      const applied = [];
      for (const migration of migrations.slice(rows.length)) {
        await client.query(migration.up);
        await client.query('INSERT INTO unihood_migrations.schema_migrations (migration_id, checksum) VALUES ($1, $2)',
          [migration.id, migration.checksum]);
        applied.push(migration.id);
      }
      return applied;
    }
    if (!rows.length) return [];
    const latest = migrations[rows.length - 1];
    await client.query(latest.down);
    await client.query('DELETE FROM unihood_migrations.schema_migrations WHERE migration_id = $1', [latest.id]);
    return [latest.id];
  });
}

export function assertSeedEnvironment(connectionString, environment) {
  let url;
  try { url = new URL(connectionString); } catch { throw new DatabaseToolError('Invalid seed database URL'); }
  if (!['local', 'test'].includes(environment.APP_ENV) || environment.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new DatabaseToolError('Synthetic seeds require APP_ENV=local/test, a loopback database and non-production NODE_ENV');
  }
}

export async function seedDatabase(client, connectionString, environment) {
  assertSeedEnvironment(connectionString, environment);
  const migrations = await loadMigrations();
  const fixtures = JSON.parse(await readFile(new URL('../../infra/db/seeds/synthetic.json', import.meta.url), 'utf8'));
  return transaction(client, async () => {
    await assertBaseline(client);
    const { rows: applied } = await client.query('SELECT migration_id, checksum FROM unihood_migrations.schema_migrations ORDER BY migration_id');
    if (applied.length !== migrations.length || applied.some((row, index) =>
      row.migration_id !== migrations[index]?.id || row.checksum !== migrations[index]?.checksum)) {
      throw new DatabaseToolError('Run db:migrate or inspect checksum/history drift before seeding');
    }
    await client.query(`CREATE SCHEMA IF NOT EXISTS unihood_fixtures;
      CREATE TABLE IF NOT EXISTS unihood_fixtures.samples (
        id uuid PRIMARY KEY, label text NOT NULL CHECK (label LIKE 'Synthetic%'),
        synthetic boolean NOT NULL CHECK (synthetic), location geography(Point,4326) NOT NULL
      )`);
    for (const fixture of fixtures) {
      await client.query(`INSERT INTO unihood_fixtures.samples (id, label, synthetic, location)
        VALUES ($1, $2, true, ST_SetSRID(ST_MakePoint($3, $4),4326)::geography) ON CONFLICT (id) DO NOTHING`,
      [fixture.id, fixture.label, fixture.lng, fixture.lat]);
      const { rows: [row] } = await client.query(`SELECT label, synthetic,
        ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat FROM unihood_fixtures.samples WHERE id=$1`, [fixture.id]);
      if (row.label !== fixture.label || !row.synthetic || row.lng !== fixture.lng || row.lat !== fixture.lat) {
        throw new DatabaseToolError('Synthetic seed conflict; existing data preserved');
      }
    }
    return fixtures.length + await seedUniversities(client);
  });
}
