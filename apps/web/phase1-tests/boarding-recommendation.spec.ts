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
  await page.getByRole('radio', { name: 'Keep separate and hold for review' }).check();
  await page.getByRole('textbox', { name: 'Why should this stay separate?' }).fill('Separate fictional operator for the integrated held-flow test.');
  const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/contributions/boarding/resolve' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit held recommendation' }).click();
  const response = await responsePromise; expect(response.status()).toBe(200); expect(response.headers()['cache-control']).toBe('no-store');
  const receipt = await response.json(); expect(receipt).toMatchObject({ published: false, outcome: 'HELD_RECOMMENDATION', publisherKind: 'COMMUNITY_RECOMMENDATION' });
  await expect(page.getByRole('heading', { name: 'Needs evidence.' })).toBeFocused();
  const body = response.request().postData()!;
  expect(JSON.parse(body).draft).not.toHaveProperty('entrance');
  const replay = await page.evaluate(async ({ url, body }) => { const result = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, credentials: 'omit', cache: 'no-store' }); return { status: result.status, data: await result.json() }; }, { url: response.url(), body });
  expect(replay.status).toBe(200); expect(replay.data).toEqual(receipt);
  expect((await request.get(base + '/api/boardings/' + receipt.contributionId)).status()).toBe(404);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/Integrated Study Home|contributionId/);
  await page.reload(); await expect(page.getByRole('textbox', { name: 'Recommendation title' })).toHaveValue('');
  await expect(page.locator('.proposal-receipt')).toHaveCount(0);
});

test('UNI-041 real candidate choice attaches a held contribution and reopens the same canonical advertisement', async ({page}, info) => {
 const base=process.env.PHASE1_PROPOSAL_BASE_URL!;
 await page.goto(base+'/contribute/boarding');await page.getByRole('button',{name:'Use synthetic example'}).click();
 await page.getByRole('textbox',{name:'Recommendation title'}).fill('Synthetic Quiet nook');await page.getByLabel(/I have permission/).check();await page.getByLabel(/I understand the separate photo/).check();
 await page.getByRole('textbox',{name:'Permitted description'}).fill('Fictional public context for the '+info.project.name+' held canonical association test.');
 await page.getByRole('button',{name:'Review recommendation'}).click();await page.getByRole('radio',{name:'Suggest information about Synthetic Quiet nook',exact:true}).check();
 await expect(page.getByText('Location not shared',{exact:true})).toBeVisible();
 const responsePromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/contributions/boarding/resolve'&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Submit held recommendation'}).click();const response=await responsePromise;expect(response.status()).toBe(200);expect(await response.json()).toMatchObject({resolution:'ATTACHED_FOR_REVIEW',published:false,canonicalBoardingId:'71000000-0000-4000-8000-000000000002'});
 await expect(page.getByRole('heading',{name:'Held for review.'})).toBeFocused();await page.getByRole('link',{name:'View the current public advertisement'}).click();await expect(page).toHaveURL(base+'/boardings/71000000-0000-4000-8000-000000000002');await expect(page.getByRole('heading',{name:'Synthetic Quiet nook',exact:true})).toBeVisible();await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
});
