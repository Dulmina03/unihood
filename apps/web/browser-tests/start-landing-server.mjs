// Test-only HTTP upstream. Never imported by runtime code or bundled in the app.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const graph = JSON.parse(await readFile(new URL('../../../infra/db/seeds/universities.synthetic.json', import.meta.url), 'utf8'));
const provenance = (row) => ({dataKind: row.data_kind, sourceLabel: row.source_label, verifiedAt: row.verified_at});
const universities = graph.universities.map((row) => ({id: row.id, slug: row.slug, name: row.name, city: row.city, country: row.country, provenance: provenance(row)}));
const campuses = graph.campuses.map((row) => ({id: row.id, universityId: row.university_id, name: row.name, publicArea: row.public_area, provenance: provenance(row)}));
const entrances = graph.entrances.map((row) => ({id: row.id, campusId: row.campus_id, name: row.name, location: {lat: row.lat, lng: row.lng}, isPrimary: row.is_primary, provenance: provenance(row)}));
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
  if (url.searchParams.get('slug') === 'synthetic-unavailable') {response.statusCode = 503; response.end('{}'); return;}
  let rows;
  if (url.pathname === '/api/v1/universities') rows = universities.filter((row) => !url.searchParams.has('slug') || row.slug === url.searchParams.get('slug'));
  else {
    const match = url.pathname.match(/^\/api\/v1\/universities\/([^/]+)\/(campuses|entrances)$/);
    if (!match || !universities.some((row) => row.id === match[1])) {response.statusCode = 404; response.end('{}'); return;}
    rows = match[2] === 'campuses' ? campuses.filter((row) => row.universityId === match[1]) : entrances.filter((row) => campuses.some((campus) => campus.universityId === match[1] && campus.id === row.campusId) && (!url.searchParams.has('campusId') || row.campusId === url.searchParams.get('campusId')));
  }
  const page = Number(url.searchParams.get('page') ?? 1), pageSize = Number(url.searchParams.get('pageSize') ?? 20);
  response.end(JSON.stringify({items: rows.slice((page - 1) * pageSize, page * pageSize), page: {page, pageSize, hasNextPage: rows.length > page * pageSize}}));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const children = [[process.env.UI_TEST_WEB_PORT ?? '3180', 'disabled'], [process.env.UI_TEST_MAP_PORT ?? '3181', 'openfreemap']].map(([webPort, provider]) => spawn(process.execPath, ['--env-file-if-exists=../../.env', 'scripts/next.mjs', 'start'], {stdio: 'inherit', env: {...process.env, WEB_PORT: webPort, MAP_PROVIDER: provider, MAP_STYLE: 'liberty', API_BASE_URL: `http://127.0.0.1:${port}/api/v1`}}));
let closing = false;
const close = (signal = 'SIGTERM') => {if (closing) return; closing = true; for (const child of children) child.kill(signal); server.close();};
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => close(signal));
for (const child of children) child.once('exit', (code) => {if (!closing) {process.exitCode = code ?? 1; close();}});
