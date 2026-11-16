import { readFile } from 'node:fs/promises';
// Called only inside seedDatabase's guarded, advisory-locked transaction.
// No upsert updates/deletes: a conflicting row aborts the entire seed batch.
export async function seedUniversities(client) {
  const graph = JSON.parse(await readFile(new URL('../../infra/db/seeds/universities.synthetic.json', import.meta.url), 'utf8'));
  const definitions = [
    ['universities', graph.universities, ['id', 'slug', 'name', 'city', 'country', 'status', 'data_kind', 'source_label', 'verified_at']],
    ['campuses', graph.campuses, ['id', 'university_id', 'name', 'public_area', 'status', 'data_kind', 'source_label', 'verified_at']],
    ['campus_entrances', graph.entrances, ['id', 'campus_id', 'name', 'is_primary', 'status', 'data_kind', 'source_label', 'verified_at', 'lng', 'lat']],
  ];
  for (const [table, fixtures, fields] of definitions) for (const fixture of fixtures) {
    if (fixture.data_kind !== 'SYNTHETIC' || !fixture.name.startsWith('Synthetic') || fixture.verified_at !== null ||
      (table === 'campus_entrances' && (!Number.isFinite(fixture.lat) || !Number.isFinite(fixture.lng) || Math.abs(fixture.lat) > 90 || Math.abs(fixture.lng) > 180))) {
      throw new Error('Invalid synthetic university fixture');
    }
    const columns = fields.filter((field) => !['lng', 'lat'].includes(field));
    const values = columns.map((field) => fixture[field]);
    let placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    if (table === 'campus_entrances') {
      columns.push('geo'); values.push(fixture.lng, fixture.lat);
      placeholders += `, ST_SetSRID(ST_MakePoint($${values.length - 1}, $${values.length}),4326)`;
    }
    // Table/column identifiers are internal constants, never fixture/user-controlled.
    await client.query(`INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
    const projection = fields.map((field) => field === 'lng' ? 'ST_X(geo) AS lng' : field === 'lat' ? 'ST_Y(geo) AS lat' : field).join(', ');
    const {rows: [row]} = await client.query(`SELECT ${projection} FROM public.${table} WHERE id=$1`, [fixture.id]);
    if (!row || fields.some((field) => row[field] !== fixture[field])) throw new Error('Synthetic university seed conflict; existing data preserved');
  }
  return graph.universities.length + graph.campuses.length + graph.entrances.length;
}
