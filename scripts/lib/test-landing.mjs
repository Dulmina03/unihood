import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function startLandingIntegration(apiEndpoint, {provider = 'disabled', port: requestedPort} = {}) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  let port=requestedPort;
  if(port===undefined){const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});port=probe.address().port;await new Promise(resolve=>probe.close(resolve));}
  assert.ok(Number.isInteger(port)&&port>0&&port<=65535);
  const child = spawn(process.execPath, ['scripts/next.mjs', 'start'], {cwd: `${root}apps/web`, stdio: 'ignore',
    env: {...process.env, MAP_PROVIDER: provider, MAP_STYLE: 'liberty', APP_ENV: 'test', WEB_PORT: String(port), API_BASE_URL: `${apiEndpoint}/api/v1`, ENABLE_SYNTHETIC_ACTORS: 'false', SYNTHETIC_ACTOR: '', NEXT_TELEMETRY_DISABLED: '1'}});
  const base = `http://127.0.0.1:${port}`;
  const get = (path) => fetch(`${base}${path}`, {signal: AbortSignal.timeout(8000)});
  const close = async () => {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(3000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  };
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {if ((await get('/')).status === 200) break;} catch { /* Wait for this owned Next process. */ }
      if (child.exitCode !== null || attempt === 59) throw new Error('Landing test server unavailable; build the web app first');
      await delay(250);
    }
    const {UniversityPageSchema, CampusPageSchema, CampusEntrancePageSchema, ErrorResponseSchema} = await import('../../packages/contracts/dist/index.js');
    const uid = '10000000-0000-4000-8000-000000000001', cid = '20000000-0000-4000-8000-000000000001';
    const directory = await get('/api/universities'); assert.equal(directory.status, 200);
    const universities = UniversityPageSchema.parse(await directory.json()); assert.equal(universities.items.length, 2);
    const campusResponse = await get(`/api/universities/${uid}/campuses`); assert.equal(campusResponse.status, 200);
    assert.equal(CampusPageSchema.parse(await campusResponse.json()).items[0].universityId, uid);
    const gates = await get(`/api/universities/${uid}/entrances?campusId=${cid}`); assert.equal(gates.status, 200);
    assert.equal(CampusEntrancePageSchema.parse(await gates.json()).items.length, 2);
    const qr = await get('/u/synthetic-demo-university'); assert.equal(qr.status, 200);
    const html = await qr.text(); assert.match(html, /Synthetic Demo University/); assert.match(html, /YOUR UNIVERSITY, YOUR STARTING POINT/);
    assert.ok(!html.includes('unihood_test_only') && !html.includes('DATABASE_URL'));
    for (const slug of ['INVALID', 'unknown-university']) {
      const missing = await get(`/u/${slug}`); assert.ok([200, 404].includes(missing.status));
      const content = await missing.text(); assert.match(content, /University not found/); assert.match(content, /noindex/);
    }
    const invalid = await get('/api/universities?page=1&page=2'); assert.equal(invalid.status, 400);
    assert.equal(ErrorResponseSchema.parse(await invalid.json()).error.code, 'VALIDATION_FAILED');
    const wrongParent = await get(`/api/universities/${uid}/entrances?campusId=20000000-0000-4000-8000-000000000002`); assert.equal(wrongParent.status, 404);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await fetch(`${base}/api/universities`, {method, headers: {'X-Role': 'owner', 'X-User-Id': 'admin'}, signal: AbortSignal.timeout(4000)});
      assert.equal(response.status, 405);
    }
    const explore = await get(`/explore?university=synthetic-demo-university&campus=${cid}&entrance=30000000-0000-4000-8000-000000000001&view=list`);
    assert.equal(explore.status, 200);
    const shell = await explore.text();
    assert.match(shell, /Explore your university neighborhood/);
    assert.match(shell, /Loading exploration controls/);
    assert.ok(!shell.includes('DATABASE_URL') && !shell.includes('unihood_test_only'));
    console.log('PASS: real Next explore shell/landing/QR and read-only adapter → Nest UNI-010 API → isolated PostGIS; invalid/unknown slug and parent scope');
    return {base, close, async checkOutage() {
      const response = await get('/api/universities'); assert.equal(response.status, 503);
      const error = ErrorResponseSchema.parse(await response.json()); assert.equal(error.error.code, 'SERVICE_UNAVAILABLE');
      assert.ok(!JSON.stringify(error).includes('postgres') && !JSON.stringify(error).includes('127.0.0.1'));
      const qr = await get('/u/synthetic-demo-university'); const html = await qr.text();
      assert.match(html, /We couldn’t open this university/); assert.match(html, /does not mean your QR link is invalid/);
      console.log('PASS: real Next adapter outage is redacted 503; QR outage renders retry instead of false not-found');
    }};
  } catch (error) {await close(); throw error;}
}
