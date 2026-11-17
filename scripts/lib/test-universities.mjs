import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient, runMigrations, seedDatabase } from './database.mjs';
const uid = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const cid = '20000000-0000-4000-8000-000000000001';
const otherCampus = '20000000-0000-4000-8000-000000000002';
const gate = '30000000-0000-4000-8000-000000000001';
const absent = '90000000-0000-4000-8000-000000000099';
export async function testUniversities({client, url, get, endpoint, migrations}) {
  const env = {APP_ENV: 'test', NODE_ENV: 'test'};
  const cli = (command, expected = 0) => {
    const result = spawnSync('pnpm', [command, '--test'], {encoding: 'utf8', timeout: 30000,
      env: {...process.env, ...env, TEST_DATABASE_URL: url, DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:1/not_the_test_target'}});
    if (result.error) throw result.error;
    assert.equal(result.status, expected, `${command} --test returned an unexpected exit status`);
    return `${result.stdout}${result.stderr}`;
  };
  const {UniversityPageSchema, CampusPageSchema, CampusEntrancePageSchema, ErrorResponseSchema} = await import('../../packages/contracts/dist/index.js');
  const before = (await client.query('SELECT * FROM public.universities ORDER BY id')).rows;
  const peer = createClient(url); await peer.connect();
  try {await Promise.all([seedDatabase(client, url, env), seedDatabase(peer, url, env)]);} finally {await peer.end();}
  assert.deepEqual((await client.query('SELECT * FROM public.universities ORDER BY id')).rows, before);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.campuses')).rows[0].n, 2);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.campus_entrances')).rows[0].n, 3);
  await client.query("UPDATE public.campuses SET name='Synthetic local edit' WHERE id=$1", [cid]);
  await assert.rejects(seedDatabase(client, url, env), /existing data preserved/);
  assert.equal((await client.query('SELECT name FROM public.campuses WHERE id=$1', [cid])).rows[0].name, 'Synthetic local edit');
  await client.query("UPDATE public.campuses SET name='Synthetic Demo Campus' WHERE id=$1", [cid]);
  // A late conflict must roll back newly inserted earlier rows in the same seed transaction.
  await client.query('DELETE FROM public.campus_entrances WHERE id=$1', [gate]);
  await client.query("UPDATE public.campus_entrances SET name='Synthetic late conflict' WHERE id=$1", ['30000000-0000-4000-8000-000000000003']);
  await assert.rejects(seedDatabase(client, url, env), /existing data preserved/);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.campus_entrances WHERE id=$1', [gate])).rows[0].n, 0);
  await client.query("UPDATE public.campus_entrances SET name='Synthetic Other University Gate' WHERE id=$1", ['30000000-0000-4000-8000-000000000003']);
  await seedDatabase(client, url, env);
  console.log('PASS: university deterministic/concurrent seeds; conflicts preserve edits and roll back partial inserts');

  // Every failing statement runs independently against this disposable tmpfs DB.
  const invalid = [
    ['INSERT INTO public.universities SELECT $1::uuid, slug, name, city, country, status, data_kind, source_label, verified_at FROM public.universities WHERE id=$2', [absent, uid], '23505'],
    ["UPDATE public.universities SET slug='Invalid Slug' WHERE id=$1", [uid], '23514'],
    ['UPDATE public.campuses SET university_id=$1 WHERE id=$2', [absent, cid], '23503'],
    ['UPDATE public.campus_entrances SET campus_id=$1 WHERE id=$2', [absent, gate], '23503'],
    ['DELETE FROM public.universities WHERE id=$1', [uid], '23503'],
    ['DELETE FROM public.campuses WHERE id=$1', [cid], '23503'],
    ["UPDATE public.campus_entrances SET geo=ST_SetSRID(ST_Point(181,0),4326) WHERE id=$1", [gate], '23514'],
    ["UPDATE public.campus_entrances SET geo=ST_SetSRID(ST_Point(0,91),4326) WHERE id=$1", [gate], '23514'],
    ["UPDATE public.campus_entrances SET geo=ST_GeomFromText('POINT EMPTY',4326) WHERE id=$1", [gate], '23514'],
    ["UPDATE public.campus_entrances SET geo=ST_SetSRID(ST_Point('NaN'::float,0),4326) WHERE id=$1", [gate], '23514'],
    ["UPDATE public.campus_entrances SET geo=ST_SetSRID(ST_Point('Infinity'::float,0),4326) WHERE id=$1", [gate], '23514'],
    ["UPDATE public.campus_entrances SET geo=ST_SetSRID(ST_Point(0,0),3857) WHERE id=$1", [gate], '22023'],
    ["UPDATE public.campus_entrances SET geo=ST_GeomFromText('LINESTRING(0 0,1 1)',4326) WHERE id=$1", [gate], '22023'],
    ['UPDATE public.campus_entrances SET geo=NULL WHERE id=$1', [gate], '23502'],
    ['UPDATE public.campus_entrances SET is_primary=true WHERE id=$1', ['30000000-0000-4000-8000-000000000002'], '23505'],
    ["UPDATE public.campus_entrances SET data_kind='VERIFIED' WHERE id=$1", [gate], '23514'],
  ];
  for (const [sql, values, code] of invalid) await assert.rejects(client.query(sql, values), (error) => error.code === code);
  console.log('PASS: university unique slugs/FKs/restricted deletes/primary gates/provenance and PostGIS coordinate constraints');

  const base = '/api/v1/universities';
  async function read(path, schema) {const response = await get(path); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store'); return schema.parse(await response.json());}
  const first = await read(`${base}?pageSize=1`, UniversityPageSchema);
  const second = await read(`${base}?pageSize=1&page=2`, UniversityPageSchema);
  assert.equal(first.page.hasNextPage, true); assert.equal(second.page.hasNextPage, false);
  assert.notEqual(first.items[0].id, second.items[0].id);
  assert.equal((await read(`${base}?slug=synthetic-demo-university`, UniversityPageSchema)).items[0].id, uid);
  const campuses = await read(`${base}/${uid}/campuses`, CampusPageSchema);
  assert.deepEqual(campuses.items.map((row) => row.universityId), [uid]);
  const gates = await read(`${base}/${uid}/entrances?campusId=${cid}`, CampusEntrancePageSchema);
  assert.equal(gates.items.length, 2);
  assert.ok(gates.items.every((row) => row.campusId === cid && row.provenance.dataKind === 'SYNTHETIC' && row.name.startsWith('Synthetic')));
  assert.deepEqual((await read(`${base}/${other}/entrances`, CampusEntrancePageSchema)).items.map((row) => row.campusId), [otherCampus]);
  for (const [path, status] of [[`${base}/${absent}/entrances`, 404], [`${base}/${uid}/entrances?campusId=${otherCampus}`, 404], [`${base}/invalid/entrances`, 400], [`${base}?pageSize=101`, 400], [`${base}?slug=anything%27%20OR%201=1`, 400], [`${base}?page=1&page=2`, 400], [`${base}?PRIVATE_CANARY=private`, 400]]) {
    const response = await get(path); assert.equal(response.status, status); assert.ok(!JSON.stringify(ErrorResponseSchema.parse(await response.json())).includes('PRIVATE_CANARY'));
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await fetch(`${endpoint}${base}`, {method, headers: {'X-Role': 'owner', 'X-User-Id': 'admin'}, signal: AbortSignal.timeout(4000)});
    assert.equal(response.status, 404);
  }
  // Archive any parent: child gates disappear; no alternate university/campus lookup bypass.
  for (const [table, id] of [['universities', uid], ['campuses', cid], ['campus_entrances', gate]]) {
    await client.query(`UPDATE public.${table} SET status='ARCHIVED' WHERE id=$1`, [id]);
    if (table === 'universities') assert.equal((await get(`${base}/${uid}/entrances`)).status, 404);
    else assert.equal((await read(`${base}/${uid}/entrances`, CampusEntrancePageSchema)).items.length, table === 'campuses' ? 0 : 1);
    await client.query(`UPDATE public.${table} SET status='ACTIVE' WHERE id=$1`, [id]);
  }
  console.log('PASS: real university/campus/gate HTTP pagination, parent isolation, archived filtering, validation, public projections and absent writes');

  // Verify deployed read policy on the actual same DB using the built service, without inventing real data.
  const {UniversityRepository} = await import('../../apps/api/dist/universities/university.repository.js');
  const {UniversityService} = await import('../../apps/api/dist/universities/university.service.js');
  const previous = {...process.env};
  let repository;
  try {
    process.env.APP_ENV = 'staging'; process.env.DATABASE_URL = url;
    repository = new UniversityRepository(); const service = new UniversityService(repository);
    assert.deepEqual((await service.universities({})).items, []);
    await assert.rejects(service.entrances(uid, {}), (error) => error.status === 404);
    // Test-only VERIFIED source label explicitly says synthetic: this is a branch test, not a real claim.
    for (const [table, id] of [['universities', uid], ['campuses', cid], ['campus_entrances', gate]]) await client.query(`UPDATE public.${table} SET data_kind='VERIFIED', verified_at='2026-01-01T00:00:00Z' WHERE id=$1`, [id]);
    assert.equal((await service.universities({})).items.length, 1);
    const verified = await service.entrances(uid, {}); assert.equal(verified.items.length, 1);
    assert.equal(verified.items[0].provenance.verifiedAt, '2026-01-01T00:00:00.000000Z');
  } finally {
    await repository?.onModuleDestroy(); process.env = previous;
    for (const [table, id] of [['universities', uid], ['campuses', cid], ['campus_entrances', gate]]) await client.query(`UPDATE public.${table} SET data_kind='SYNTHETIC', verified_at=NULL WHERE id=$1`, [id]);
  }
  console.log('PASS: deployed reads exclude synthetic rows/ancestors; verified-only projection and UTC provenance branch tested synthetically');

  // Remove only synthetic POI fixtures in this proven disposable database, then
  // exercise UNI-010 rollback itself. Never a development reset.
  assert.equal((await client.query("SELECT count(*)::int AS n FROM public.places WHERE data_kind<>'SYNTHETIC'")).rows[0].n, 0);
  await client.query('DELETE FROM public.place_aliases; DELETE FROM public.place_source_refs; DELETE FROM public.public_place_locations; DELETE FROM public.places; DELETE FROM public.buildings; DELETE FROM public.poi_categories');
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['008_boarding_advertisement_previews']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['007_boarding_property_foundation']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['006_poi_proposal_review']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['005_poi_submission_transactions']);
  assert.deepEqual(await runMigrations(client,migrations,'rollback'),['004_public_poi_geography_index']);
  await runMigrations(client, migrations, 'rollback');
  const ledger = (await client.query('SELECT * FROM unihood_migrations.schema_migrations ORDER BY migration_id')).rows;
  await assert.rejects(runMigrations(client, migrations, 'rollback'), /populated tables/);
  assert.deepEqual((await client.query('SELECT * FROM unihood_migrations.schema_migrations ORDER BY migration_id')).rows, ledger);
  assert.deepEqual((await client.query('SELECT * FROM public.universities ORDER BY id')).rows, before);
  // Destructive test preparation is scoped to this helper's already-proven disposable tmpfs DB only.
  // The production rollback never deletes data. An external dependency must also block empty-table removal.
  await client.query('DELETE FROM public.campus_entrances; DELETE FROM public.campuses; DELETE FROM public.universities');
  await client.query('CREATE VIEW public.unihood_university_guard AS SELECT id FROM public.universities');
  await assert.rejects(runMigrations(client, migrations, 'rollback'), (error) => error.code === '2BP01');
  assert.equal((await client.query("SELECT to_regclass('public.campus_entrances') AS name")).rows[0].name, 'campus_entrances');
  await client.query('DROP VIEW public.unihood_university_guard');
  // A writer that commits while rollback is waiting must be seen by the emptiness guard.
  const writer = createClient(url); await writer.connect();
  const rollbackPid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  let pending;
  try {
    await writer.query('BEGIN');
    await writer.query(`INSERT INTO public.universities (id,slug,name,city,country,data_kind,source_label)
      VALUES ($1,'synthetic-concurrent-writer','Synthetic Concurrent Writer','Synthetic City','ZZ','SYNTHETIC','Synthetic rollback race test')`, [absent]);
    pending = runMigrations(client, migrations, 'rollback').then(() => null, (error) => error);
    for (let attempt = 0; attempt < 50; attempt++) {
      const waiting = (await writer.query('SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND NOT granted) AS waiting', [rollbackPid])).rows[0].waiting;
      if (waiting) break;
      assert.ok(attempt < 49, 'Rollback must wait for the concurrent table writer');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await writer.query('COMMIT');
    assert.match((await pending)?.message ?? '', /populated tables/);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM public.universities WHERE id=$1', [absent])).rows[0].n, 1);
  } finally {await writer.end(); if (pending) await pending;}
  await client.query('DELETE FROM public.universities WHERE id=$1', [absent]);
  assert.match(cli('db:rollback'), /002_university_navigation/);
  assert.equal((await client.query("SELECT to_regclass('public.universities') AS name")).rows[0].name, null);
  assert.equal((await get('/api/v1/health/ready')).status, 503);
  // Never adopt/replace an unrelated pre-existing table during migration.
  await client.query("CREATE TABLE public.universities (label text); INSERT INTO public.universities VALUES ('Synthetic pre-existing guard')");
  await assert.rejects(runMigrations(client, migrations, 'migrate'), (error) => error.code === '42P07');
  assert.equal((await client.query('SELECT label FROM public.universities')).rows[0].label, 'Synthetic pre-existing guard');
  assert.equal((await client.query("SELECT to_regclass('public.campuses') AS name")).rows[0].name, null);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM unihood_migrations.schema_migrations')).rows[0].n, 1);
  await client.query('DROP TABLE public.universities RESTRICT');
  assert.match(cli('db:migrate'), /002_university_navigation/);
  assert.match(cli('db:migrate'), /no changes/);
  assert.equal((await get('/api/v1/health/ready')).status, 200);
  cli('db:seed'); cli('db:seed');
  await client.query('DELETE FROM public.public_place_locations; DELETE FROM public.places; DELETE FROM public.poi_categories');
  assert.match(cli('db:rollback'), /008_boarding_advertisement_previews/);
  assert.match(cli('db:rollback'), /007_boarding_property_foundation/);
  assert.match(cli('db:rollback'), /006_poi_proposal_review/);
  assert.match(cli('db:rollback'), /005_poi_submission_transactions/);
  assert.match(cli('db:rollback'), /004_public_poi_geography_index/);
  assert.match(cli('db:rollback'), /003_public_poi_foundation/);
  assert.match(cli('db:rollback', 1), /Database operation failed \(P0001\); connection details redacted/);
  assert.deepEqual((await client.query('SELECT * FROM public.universities ORDER BY id')).rows, before);
  // Leave tables empty for the original bootstrap-extension rollback regression below.
  await client.query('DELETE FROM public.campus_entrances; DELETE FROM public.campuses; DELETE FROM public.universities');
  // Applied files remain immutable, including this newly exercised up/down pair.
  assert.ok((await readFile(new URL('../../infra/db/migrations/002_university_navigation.down.sql', import.meta.url), 'utf8')).includes('RESTRICT'));
  console.log('PASS: populated rollback refused with ledger/data intact; concurrent writer preserved; external dependency rollback atomic; pre-existing table preserved; real db CLI rollback/migrate/seed repeatable');
}
