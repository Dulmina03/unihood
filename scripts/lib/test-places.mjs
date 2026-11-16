import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient, runMigrations } from './database.mjs';

// Called only after the owning harness proves disposable tmpfs, no persistent mounts,
// loopback binding and current_database=unihood_test. Never a development seed/reset.
export async function testPlaces({client, url, migrations}) {
  const ids = Array.from({length: 12}, () => randomUUID());
  const ledger = async () => (await client.query('SELECT * FROM unihood_migrations.schema_migrations ORDER BY migration_id')).rows;
  const before = await ledger();
  const extensions = (await client.query('SELECT extname,extversion FROM pg_extension ORDER BY extname')).rows;
  const categories = ['pharmacy', 'restaurant', 'clinic', 'hardware'];
  for (const code of categories) await client.query('INSERT INTO public.poi_categories VALUES ($1,$2)', [code, `Synthetic ${code}`]);
  await client.query(`INSERT INTO public.buildings(id,public_geo,address_label,data_kind,source_label)
    VALUES ($1,ST_SetSRID(ST_Point(0,0),4326),'Synthetic public building','SYNTHETIC','Synthetic test only, no real geography')`, [ids[0]]);
  for (const [index, code] of categories.entries()) {
    await client.query(`INSERT INTO public.places(id,kind,canonical_name,normalized_name,building_id,category,status,data_kind,source_label)
      VALUES ($1,'POI',$2,$3,$4,$5,'ACTIVE','SYNTHETIC','Synthetic integration fixture; not a real business')`,
    [ids[index + 1], index < 2 ? 'Synthetic Shared Name' : `Synthetic ${code}`, 'synthetic shared name', ids[0], code]);
    await client.query(`INSERT INTO public.public_place_locations(place_id,entrance_geo,source)
      VALUES ($1,ST_SetSRID(ST_Point(0,0),4326),'Synthetic integration fixture, not real geography')`, [ids[index + 1]]);
  }
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.places WHERE building_id=$1', [ids[0]])).rows[0].n, 4);
  for (const code of categories) assert.equal((await client.query('SELECT count(*)::int AS n FROM public.places WHERE category=$1', [code])).rows[0].n, 1);
  assert.equal((await client.query('SELECT count(DISTINCT place_id)::int AS n FROM public.public_place_locations')).rows[0].n, 4);
  await client.query(`INSERT INTO public.places(id,kind,canonical_name,normalized_name,status,data_kind,source_label)
    VALUES ($1,'BOARDING','Synthetic private placeholder','synthetic private placeholder','ACTIVE','SYNTHETIC','Synthetic privacy rejection fixture only')`, [ids[5]]);
  const invalid = [
    ["UPDATE public.places SET category='missing' WHERE id=$1", [ids[1]], '23503'],
    ['UPDATE public.places SET building_id=$1 WHERE id=$2', [ids[11], ids[1]], '23503'],
    ['UPDATE public.places SET category=NULL WHERE id=$1', [ids[1]], '23514'],
    ['UPDATE public.places SET building_id=$1 WHERE id=$2', [ids[0], ids[5]], '23514'],
    ['UPDATE public.public_place_locations SET place_id=$1 WHERE place_id=$2', [ids[5], ids[1]], '23503'],
    ["UPDATE public.public_place_locations SET place_kind='BOARDING' WHERE place_id=$1", [ids[1]], '23514'],
    ["UPDATE public.places SET status='ARCHIVED' WHERE id=$1", [ids[1]], '23503'],
    ["UPDATE public.places SET kind='BOARDING',category=NULL,building_id=NULL WHERE id=$1", [ids[1]], '23503'],
    ["UPDATE public.places SET canonical_name='   ' WHERE id=$1", [ids[1]], '23514'],
    ["UPDATE public.places SET data_kind='VERIFIED' WHERE id=$1", [ids[1]], '23514'],
    ['UPDATE public.places SET merged_into=id WHERE id=$1', [ids[1]], '23514'],
    ["UPDATE public.places SET updated_at='-infinity' WHERE id=$1", [ids[1]], '23514'],
    ['DELETE FROM public.buildings WHERE id=$1', [ids[0]], '23503'],
    ['DELETE FROM public.places WHERE id=$1', [ids[1]], '23503'],
    ["DELETE FROM public.poi_categories WHERE code='pharmacy'", [], '23503'],
  ];
  for (const column of ['public_geo', 'entrance_geo']) {
    const table = column === 'public_geo' ? 'buildings' : 'public_place_locations';
    const key = column === 'public_geo' ? 'id' : 'place_id';
    const id = column === 'public_geo' ? ids[0] : ids[1];
    for (const geometry of ["ST_SetSRID(ST_Point(181,0),4326)", "ST_SetSRID(ST_Point(0,91),4326)", "ST_SetSRID(ST_Point('NaN'::float,0),4326)", "ST_SetSRID(ST_Point('Infinity'::float,0),4326)", "ST_GeomFromText('POINT EMPTY',4326)"]) {
      invalid.push([`UPDATE public.${table} SET ${column}=${geometry} WHERE ${key}=$1`, [id], '23514']);
    }
    invalid.push([`UPDATE public.${table} SET ${column}=ST_SetSRID(ST_Point(0,0),3857) WHERE ${key}=$1`, [id], '22023']);
    invalid.push([`UPDATE public.${table} SET ${column}=ST_GeomFromText('LINESTRING(0 0,1 1)',4326) WHERE ${key}=$1`, [id], '22023']);
  }
  for (const [sql, values, code] of invalid) await assert.rejects(client.query(sql, values), (error) => error.code === code);
  await client.query('INSERT INTO public.place_aliases VALUES ($1,$2,$3,$4)', [ids[6], ids[1], 'Synthetic multilingual alias · සිංහල தமிழ்', 'synthetic multilingual alias']);
  await assert.rejects(client.query('INSERT INTO public.place_aliases VALUES ($1,$2,$3,$4)', [ids[7], ids[1], 'Synthetic alias variant', 'synthetic multilingual alias']), (error) => error.code === '23505');
  await client.query('INSERT INTO public.place_aliases VALUES ($1,$2,$3,$4)', [ids[7], ids[2], 'Synthetic alias variant', 'synthetic multilingual alias']);
  // Unique source identity holds under actual concurrent connections; names/geo do not merge.
  const peer = createClient(url); await peer.connect();
  try {
    const sql = 'INSERT INTO public.place_source_refs(id,place_id,provider,external_id,license_tag) VALUES ($1,$2,$3,$4,$5)';
    const results = await Promise.allSettled([
      client.query(sql, [ids[8], ids[1], 'synthetic-provider', 'synthetic-external-id', 'Synthetic fixture; no imported content']),
      peer.query(sql, [ids[9], ids[2], 'synthetic-provider', 'synthetic-external-id', 'Synthetic fixture; no imported content']),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(results.find((r) => r.status === 'rejected').reason.code, '23505');
    await client.query(sql, [ids[10], ids[1], 'synthetic-other-provider', 'synthetic-external-id', 'Synthetic fixture only']);
  } finally {await peer.end();}
  const indexes = (await client.query("SELECT indexdef FROM pg_indexes WHERE schemaname='public'")).rows.map((r) => r.indexdef).join('\n');
  for (const name of ['buildings_public_geo_idx', 'public_place_locations_geo_idx', 'places_normalized_name_trgm_idx', 'place_aliases_normalized_alias_trgm_idx', 'places_category_status_idx']) assert.ok(indexes.includes(name));
  assert.match(indexes, /USING gist/); assert.match(indexes, /gin_trgm_ops/);
  await assert.rejects(runMigrations(client, migrations, 'rollback'), /populated tables/);
  assert.deepEqual(await ledger(), before);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.public_place_locations')).rows[0].n, 4);
  console.log('PASS: POI categories/shared-building identities/aliases/concurrent source uniqueness; valid public geometry; boarding geometry/kind transitions denied; populated rollback preserves rows/history');

  // Delete only synthetic fixtures in this proven disposable test database.
  await client.query('DELETE FROM public.place_aliases; DELETE FROM public.place_source_refs; DELETE FROM public.public_place_locations; DELETE FROM public.places; DELETE FROM public.buildings; DELETE FROM public.poi_categories');
  await client.query('CREATE VIEW public.unihood_poi_guard AS SELECT place_id FROM public.public_place_locations');
  await assert.rejects(runMigrations(client, migrations, 'rollback'), (error) => error.code === '2BP01');
  assert.deepEqual(await ledger(), before);
  assert.equal((await client.query("SELECT to_regclass('public.place_aliases') AS name")).rows[0].name, 'place_aliases');
  await client.query('DROP VIEW public.unihood_poi_guard');
  const writer = createClient(url); await writer.connect();
  const pid = (await client.query('SELECT pg_backend_pid() AS id')).rows[0].id;
  let pending;
  try {
    await writer.query('BEGIN');
    await writer.query("INSERT INTO public.poi_categories VALUES ('synthetic_race','Synthetic concurrent rollback guard')");
    pending = runMigrations(client, migrations, 'rollback').then(() => null, (error) => error);
    for (let attempt = 0; attempt < 50; attempt++) {
      if ((await writer.query('SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND NOT granted) AS waiting', [pid])).rows[0].waiting) break;
      assert.ok(attempt < 49, 'POI rollback must lock against a concurrent category writer');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await writer.query('COMMIT');
    assert.match((await pending)?.message ?? '', /populated tables/);
    assert.deepEqual(await ledger(), before);
  } finally {await writer.end(); if (pending) await pending;}
  assert.equal((await client.query("SELECT label FROM public.poi_categories WHERE code='synthetic_race'")).rows[0].label, 'Synthetic concurrent rollback guard');
  await client.query("DELETE FROM public.poi_categories WHERE code='synthetic_race'");
  assert.deepEqual(await runMigrations(client, migrations, 'rollback'), ['003_public_poi_foundation']);
  await client.query("CREATE TABLE public.buildings(label text); INSERT INTO public.buildings VALUES ('Synthetic pre-existing guard')");
  await assert.rejects(runMigrations(client, migrations, 'migrate'), (error) => error.code === '42P07');
  assert.equal((await client.query('SELECT label FROM public.buildings')).rows[0].label, 'Synthetic pre-existing guard');
  assert.equal((await client.query("SELECT to_regclass('public.poi_categories') AS name")).rows[0].name, null);
  await client.query('DROP TABLE public.buildings RESTRICT');
  assert.deepEqual(await runMigrations(client, migrations, 'migrate'), ['003_public_poi_foundation']);
  assert.deepEqual(await runMigrations(client, migrations, 'migrate'), []);
  assert.deepEqual((await client.query('SELECT extname,extversion FROM pg_extension ORDER BY extname')).rows, extensions);
  console.log('PASS: POI GiST/trigram/filter indexes; concurrent rollback writer retained; RESTRICT dependency failure atomic; unrelated pre-existing table retained; empty rollback/re-migration/repeat migrate; extension versions preserved');
}
