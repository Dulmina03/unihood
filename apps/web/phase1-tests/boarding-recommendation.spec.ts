import { test, expect } from '@playwright/test';
// Existing owned contributor simulator, real Next/Nest/PostGIS; no intake mocks.
test('UNI-040 real synthetic recommendation stays held and replays without granting owner or map publication', async ({ page, request }, info) => {
  const base = process.env.PHASE1_PROPOSAL_BASE_URL!;
  await page.goto(base + '/contribute/boarding');
  await page.getByRole('button', { name: 'Use synthetic example' }).click();
  await page.getByRole('textbox', { name: 'Recommendation title' }).fill('Synthetic Integrated Study Home ' + info.project.name);
  await page.getByLabel(/I have permission/).check(); await page.getByLabel(/I understand the separate photo/).check();
  await page.getByRole('button', { name: 'Review recommendation' }).click();
  await expect(page.getByRole('heading', { name: '3. Review before sending.' })).toBeFocused();
  const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/contributions/boarding' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit held recommendation' }).click();
  const response = await responsePromise; expect(response.status()).toBe(200); expect(response.headers()['cache-control']).toBe('no-store');
  const receipt = await response.json(); expect(receipt).toMatchObject({ published: false, outcome: 'HELD_RECOMMENDATION', publisherKind: 'COMMUNITY_RECOMMENDATION' });
  await expect(page.getByRole('heading', { name: 'Held for review.' })).toBeFocused();
  const body = response.request().postData()!;
  expect(JSON.parse(body).draft).not.toHaveProperty('entrance');
  const replay = await page.evaluate(async ({ url, body }) => { const result = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, credentials: 'omit', cache: 'no-store' }); return { status: result.status, data: await result.json() }; }, { url: response.url(), body });
  expect(replay.status).toBe(200); expect(replay.data).toEqual(receipt);
  expect((await request.get(base + '/api/boardings/' + receipt.contributionId)).status()).toBe(404);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/Integrated Study Home|contributionId/);
  await page.reload(); await expect(page.getByRole('textbox', { name: 'Recommendation title' })).toHaveValue('');
  await expect(page.locator('.proposal-receipt')).toHaveCount(0);
});
