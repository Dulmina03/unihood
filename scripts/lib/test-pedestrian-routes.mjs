import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const boardingId = '00000000-0000-4000-8000-000000000001';
const listingId = '73000000-0000-4000-8000-000000000001';
const primaryGate = '30000000-0000-4000-8000-000000000001';
const secondaryGate = '30000000-0000-4000-8000-000000000002';
const unknownGate = '30000000-0000-4000-8000-000000000099';
const privateCanary = /42\.123456|43\.654321|exact_geo|address_enc|unihood_private|actor_ref|consent_at/;

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function seedPublicDestination(client) {
  await client.query(`INSERT INTO public.places(id,kind,canonical_name,normalized_name,data_kind,source_label,status)
    VALUES($1,'BOARDING','Synthetic Route Test Home','synthetic route test home','SYNTHETIC','UNI-051 synthetic route fixture','ACTIVE')`, [boardingId]);
  await client.query(`INSERT INTO public.boarding_properties(place_id,data_kind,visibility,authorization_status,public_map_consent,map_consent_at,description)
    VALUES($1,'SYNTHETIC','PUBLIC_MAP','LOCAL_TEST_AUTHORIZED',true,CURRENT_TIMESTAMP,'Synthetic route fixture property')`, [boardingId]);
  await client.query(`INSERT INTO public.listings(id,boarding_id,revision,publisher_kind,publication_status,title,description,visibility_snapshot,is_current,published_at)
    VALUES($1,$2,1,'OWNER_OFFICIAL','PUBLISHED','Synthetic Route Test Home','','PUBLIC_MAP',true,CURRENT_TIMESTAMP)`, [listingId, boardingId]);
  await client.query(`INSERT INTO public.boarding_advertisement_previews(listing_id,boarding_id,data_kind,title,summary,visibility,locality,updated_at)
    VALUES($1,$2,'SYNTHETIC','Synthetic Route Test Home','Synthetic route fixture summary.','PUBLIC_MAP',NULL,CURRENT_TIMESTAMP)`, [listingId, boardingId]);
  await client.query(`INSERT INTO public.boarding_public_entrances(boarding_id,listing_id,purpose,entrance_geo,consent_at)
    SELECT $1,$2,'OWNER_SELECTED_PUBLIC_ENTRANCE',ST_SetSRID(ST_MakePoint(0,0),4326),map_consent_at FROM public.boarding_properties WHERE place_id=$1`, [boardingId, listingId]);
  // A private verification point must never influence or appear in a public route.
  await client.query(`INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,address_enc,retention_policy)
    VALUES($1,ST_SetSRID(ST_Point(43.654321,42.123456),4326),decode('53594e544845544943','hex'),'synthetic-test-only')`, [boardingId]);
}

async function cleanup(client) {
  await client.query('DELETE FROM public.boarding_public_entrances WHERE boarding_id=$1', [boardingId]);
  await client.query('DELETE FROM public.boarding_advertisement_previews WHERE boarding_id=$1', [boardingId]);
  await client.query('DELETE FROM public.listings WHERE boarding_id=$1', [boardingId]);
  await client.query('DELETE FROM unihood_private.boarding_locations WHERE boarding_id=$1', [boardingId]);
  await client.query('DELETE FROM public.boarding_properties WHERE place_id=$1', [boardingId]);
  await client.query('DELETE FROM public.places WHERE id=$1', [boardingId]);
}

export async function testPedestrianRoutes({ client, url, get }) {
  const env = { APP_ENV: 'test', NODE_ENV: 'test' };
  const port = await freePort();
  const child = spawn(process.execPath, ['apps/api/dist/main.js'], {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: url, ...env, API_HOST: '127.0.0.1', API_PORT: String(port), WEB_PORT: '3181', ROUTING_PROVIDER: 'local-fixture', ENABLE_SYNTHETIC_ACTORS: 'false', SYNTHETIC_ACTOR: '' },
  });
  const endpoint = `http://127.0.0.1:${port}`;
  const route = async (query) => {
    const response = await fetch(`${endpoint}/api/v1/routes?${query}`, { signal: AbortSignal.timeout(5000) });
    let body = null;
    try { body = await response.json(); } catch { /* Empty body is a failure path, not a route payload. */ }
    return { status: response.status, headers: response.headers, body, text: JSON.stringify(body) };
  };
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      try { if ((await fetch(`${endpoint}/health`)).ok) break; } catch { /* Wait for the real API. */ }
      if (child.exitCode !== null) throw new Error('Routing API startup failed; run pnpm build first');
      if (attempt === 39) throw new Error('Routing API startup timeout');
      await delay(250);
    }
    await seedPublicDestination(client);

    const dayQuery = `gateId=${primaryGate}&boardingId=${boardingId}&timeContext=DAY`;
    const day = await route(dayQuery);
    assert.equal(day.status, 200);
    assert.equal(day.headers.get('cache-control'), 'no-store');
    assert.equal(day.body.status, 'AVAILABLE');
    assert.equal(day.body.gateId, primaryGate);
    assert.equal(day.body.boardingId, boardingId);
    assert.equal(day.body.sourceVersion, 'uni-050-synthetic-routes-v1');
    assert.deepEqual(day.body.options.map((option) => option.routeId), ['synthetic-primary-day-a', 'synthetic-primary-day-b']);
    assert.ok(day.body.options.every((option) => option.provenance.dataKind === 'SYNTHETIC' && option.provenance.verifiedAt === null));
    assert.ok(!/origin|destination/.test(day.text));
    assert.ok(!privateCanary.test(day.text), 'Public route must not expose private geometry or internals');

    const single = await route(`${dayQuery}&includeAlternatives=false`);
    assert.equal(single.body.options.length, 1);
    const night = await route(`gateId=${primaryGate}&boardingId=${boardingId}&timeContext=NIGHT`);
    assert.deepEqual(night.body.options.map((option) => option.routeId), ['synthetic-primary-night-a']);

    const noRoute = await route(`gateId=${secondaryGate}&boardingId=${boardingId}&timeContext=DAY`);
    assert.equal(noRoute.status, 200);
    assert.equal(noRoute.body.status, 'UNAVAILABLE');
    assert.equal(noRoute.body.reason, 'NO_ROUTE');
    assert.ok(!/geometry|distanceMeters|durationSeconds|options/.test(noRoute.text));

    assert.equal((await route(`gateId=${unknownGate}&boardingId=${boardingId}&timeContext=DAY`)).status, 404);
    assert.equal((await route(`gateId=${primaryGate}&boardingId=${unknownGate}&timeContext=DAY`)).status, 404);
    assert.equal((await route(`gateId=${primaryGate}&boardingId=${boardingId}&timeContext=DAY&lat=42.123456`)).status, 400);
    assert.equal((await route(`gateId=${primaryGate}&boardingId=${boardingId}&timeContext=EVENING`)).status, 400);

    // Hidden revocation removes route eligibility immediately and identically.
    await client.query("UPDATE public.boarding_properties SET visibility='HIDDEN',public_map_consent=false,map_consent_at=NULL WHERE place_id=$1", [boardingId]);
    const hidden = await route(dayQuery);
    assert.equal(hidden.status, 404);
    assert.ok(!privateCanary.test(hidden.text));
    await client.query("UPDATE public.boarding_properties SET visibility='PUBLIC_MAP',public_map_consent=true,map_consent_at=(SELECT consent_at FROM public.boarding_public_entrances WHERE boarding_id=$1) WHERE place_id=$1", [boardingId]);
    assert.equal((await route(dayQuery)).status, 200);

    // Mismatched consent authorship (preview not public) also denies without provider data.
    await client.query("UPDATE public.boarding_advertisement_previews SET visibility='AREA_ONLY',locality='Synthetic Area' WHERE boarding_id=$1", [boardingId]);
    assert.equal((await route(dayQuery)).status, 404);
    await client.query("UPDATE public.boarding_advertisement_previews SET visibility='PUBLIC_MAP',locality=NULL WHERE boarding_id=$1", [boardingId]);

    // The default main harness API has routing disabled: eligibility passes, then 503.
    const disabled = await get(`/api/v1/routes?${dayQuery}`);
    assert.equal(disabled.status, 503);
    assert.equal((await disabled.json()).error.code, 'SERVICE_UNAVAILABLE');

    // Deployed synthetic exclusion and provider non-invocation, using the built service.
    const { PedestrianRoutesService } = await import('../../apps/api/dist/routing/pedestrian-routes.service.js');
    const { LocalFixtureRoutingProvider } = await import('../../apps/api/dist/routing/local-fixture-routing.provider.js');
    let providerCalls = 0;
    const counting = {
      providerId: 'LOCAL_FIXTURE',
      route: (request, context) => { providerCalls += 1; return new LocalFixtureRoutingProvider().route(request, context); },
    };
    const sql = [];
    const deployed = new PedestrianRoutesService({
      includeSynthetic: false,
      query: async (statement, values) => { sql.push(statement); return (await client.query(statement, values)).rows; },
    }, counting);
    await assert.rejects(deployed.route({ gateId: primaryGate, boardingId, timeContext: 'DAY' }), (error) => error.getStatus() === 404);
    assert.equal(providerCalls, 0);
    assert.ok(sql.every((statement) => !/unihood_private|exact_geo|address_enc|boarding_locations|ST_Distance/.test(statement)));

    const synthetic = new PedestrianRoutesService({
      includeSynthetic: true,
      query: async (statement, values) => (await client.query(statement, values)).rows,
    }, counting);
    const projected = await synthetic.route({ gateId: primaryGate, boardingId, timeContext: 'DAY' });
    assert.equal(projected.status, 'AVAILABLE');
    assert.ok(!privateCanary.test(JSON.stringify(projected)));
    assert.equal(providerCalls, 1);

    console.log('PASS: UNI-051 real PostGIS gate/entrance resolution, provider fixture parity, generic denial with zero provider calls and no private geometry');
  } finally {
    await cleanup(client);
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(3000)]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }
  }
}
