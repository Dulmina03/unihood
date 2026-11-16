import { readFile } from 'node:fs/promises';
const source = 'UNI-021 synthetic fixture; not a real business or location';
export async function seedPublicPois(client) {
  const graph = JSON.parse(await readFile(new URL('../../infra/db/seeds/places.synthetic.json', import.meta.url), 'utf8'));
  for (const row of graph.categories) {
    if (!/^[a-z][a-z0-9_]{0,59}$/.test(row.code) || typeof row.label !== 'string' || !row.label.trim() || row.label.length > 120) throw new Error('Invalid synthetic category fixture');
    await client.query('INSERT INTO public.poi_categories(code,label) VALUES($1,$2) ON CONFLICT DO NOTHING', [row.code, row.label]);
    if ((await client.query('SELECT label FROM public.poi_categories WHERE code=$1', [row.code])).rows[0]?.label !== row.label) throw new Error('Synthetic POI seed conflict; existing data preserved');
  }
  for (const row of graph.places) {
    if (!row.name.startsWith('Synthetic ') || !Number.isFinite(row.lng) || !Number.isFinite(row.lat) || Math.abs(row.lng)>180 || Math.abs(row.lat)>90) throw new Error('Invalid synthetic POI fixture');
    const values = [row.id, row.name, row.name.toLowerCase(), row.category, source];
    await client.query(`INSERT INTO public.places(id,kind,canonical_name,normalized_name,category,status,data_kind,source_label)
      VALUES($1,'POI',$2,$3,$4,'ACTIVE','SYNTHETIC',$5) ON CONFLICT DO NOTHING`, values);
    const expected = {kind:'POI',canonical_name:row.name,normalized_name:row.name.toLowerCase(),category:row.category,status:'ACTIVE',data_kind:'SYNTHETIC',source_label:source,building_id:null,merged_into:null,verified_at:null};
    const stored = (await client.query('SELECT kind,canonical_name,normalized_name,category,status,data_kind,source_label,building_id,merged_into,verified_at FROM public.places WHERE id=$1', [row.id])).rows[0];
    if (JSON.stringify(stored)!==JSON.stringify(expected)) throw new Error('Synthetic POI seed conflict; existing data preserved');
    await client.query(`INSERT INTO public.public_place_locations(place_id,entrance_geo,source)
      VALUES($1,ST_SetSRID(ST_Point($2,$3),4326),$4) ON CONFLICT DO NOTHING`, [row.id,row.lng,row.lat,source]);
    const point = (await client.query('SELECT ST_X(entrance_geo) AS lng,ST_Y(entrance_geo) AS lat,source,last_confirmed_at FROM public.public_place_locations WHERE place_id=$1', [row.id])).rows[0];
    if (!point || point.lng!==row.lng || point.lat!==row.lat || point.source!==source || point.last_confirmed_at!==null) throw new Error('Synthetic POI seed conflict; existing data preserved');
  }
  return graph.categories.length + graph.places.length * 2;
}
