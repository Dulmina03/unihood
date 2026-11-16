import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadMigrations } from './database.mjs';

async function fixture(action) {
  const directory = await mkdtemp(join(tmpdir(), 'unihood-migration-files-'));
  try {
    for (const suffix of ['up', 'down']) {
      const text = await readFile(new URL(`../../infra/db/migrations/001_extensions.${suffix}.sql`, import.meta.url), 'utf8');
      await writeFile(join(directory, `001_extensions.${suffix}.sql`), text);
    }
    await action(directory, pathToFileURL(`${directory}/`));
  } finally { await rm(directory, {recursive: true, force: true}); }
}

test('migration files require matched rollback files and unique ordered IDs', async () => {
  await fixture(async (directory, url) => {
    await writeFile(join(directory, '002_probe.up.sql'), 'SELECT 1;');
    await assert.rejects(loadMigrations(url), /Missing rollback/);
    await writeFile(join(directory, '002_probe.down.sql'), 'SELECT 1;');
    assert.deepEqual((await loadMigrations(url)).map((entry) => entry.id), ['001_extensions', '002_probe']);
    await writeFile(join(directory, '002_duplicate.up.sql'), 'SELECT 1;');
    await writeFile(join(directory, '002_duplicate.down.sql'), 'SELECT 1;');
    await assert.rejects(loadMigrations(url), /Duplicate migration number/);
  });
});

test('migration checksum covers both directions and runner owns transactions', async () => {
  await fixture(async (directory, url) => {
    const before = (await loadMigrations(url))[0].checksum;
    const down = join(directory, '001_extensions.down.sql');
    await writeFile(down, (await readFile(down, 'utf8')).replace('COMMIT;', '-- changed rollback\nCOMMIT;'));
    assert.notEqual((await loadMigrations(url))[0].checksum, before);
    await writeFile(join(directory, '002_probe.up.sql'), 'BEGIN;\nSELECT 1;\nCOMMIT;');
    await writeFile(join(directory, '002_probe.down.sql'), 'SELECT 1;');
    await assert.rejects(loadMigrations(url), /Runner-managed transactions/);
    await writeFile(join(directory, '002_probe.up.sql'), 'START TRANSACTION; SELECT 1; COMMIT WORK;');
    await assert.rejects(loadMigrations(url), /Runner-managed transactions/);
  });
});

test('CLI seed refusal redacts credentials and cannot fall back to a development target', () => {
  const result = spawnSync(process.execPath, ['scripts/db.mjs', 'seed', '--test'], {
    encoding: 'utf8', env: {...process.env, APP_ENV: 'production',
      DATABASE_URL: 'postgresql://user:synthetic-secret@127.0.0.1/dev', TEST_DATABASE_URL: ''},
  });
  assert.equal(result.status, 1);
  assert.ok(!`${result.stdout}${result.stderr}`.includes('synthetic-secret'));
  assert.match(result.stderr, /Invalid seed database URL/);
  const alias = spawnSync(process.execPath, ['scripts/db.mjs', 'migrate', '--test'], {
    encoding: 'utf8', env: {...process.env,
      DATABASE_URL: 'postgresql://dev:secret@127.0.0.1:5432/dev',
      TEST_DATABASE_URL: 'postgresql://test:other@localhost/dev'},
  });
  assert.equal(alias.status, 1);
  assert.match(alias.stderr, /Test and development URLs must differ/);
});
