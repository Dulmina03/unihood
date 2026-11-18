import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const receipt = { contributionId: '40000000-0000-4000-8000-000000000040', outcome: 'HELD_RECOMMENDATION', reviewState: 'NEEDS_EVIDENCE', publisherKind: 'COMMUNITY_RECOMMENDATION', dataKind: 'SYNTHETIC', published: false, resolution: 'REVIEW_REQUIRED', canonicalBoardingId: null };
async function capture(page: import('@playwright/test').Page, name: string, project: string) {
  const out = resolve(process.env.UI_EVIDENCE_DIR ?? '../../docs/verification/UNI-040'); await mkdir(out, { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
  await page.screenshot({ path: `${out}/${name}-${project}.png` }); await page.screenshot({ path: `${out}/${name}-${project}-full.png`, fullPage: true });
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await writeFile(`${out}/${name}-${project}-axe.json`, JSON.stringify({ violations: axe.violations }, null, 2)); expect(axe.violations).toEqual([]);
}
async function prepare(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Use synthetic example' }).click();
  await page.getByLabel(/I have permission/).check(); await page.getByLabel(/I understand the separate photo/).check();
  await page.getByRole('button', { name: 'Review recommendation' }).click();
  await expect(page.getByRole('heading', { name: '3. Review before sending.' })).toBeFocused();
  await page.getByRole('radio', { name: 'Keep separate and hold for review' }).check();
  await page.getByRole('textbox', { name: 'Why should this stay separate?' }).fill('Separate fictional operator for a held test recommendation.');
}
test('UNI-040 hub separates public POIs from boarding recommendations; held draft has no exact-pin or official-field path', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/contribute'); await expect(page.getByRole('heading', { name: 'Share what helps.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add Public Place' })).toHaveAttribute('href', '/contribute/place');
  await capture(page, 'contribution-hub', info.project.name);
  await page.getByRole('link', { name: 'Recommend Boarding' }).click();
  await expect(page.getByRole('heading', { name: 'Recommend a boarding.' })).toBeVisible();
  await expect(page.locator('input[type="file"],input[name="lat"],input[name="lng"]')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search public advertisement titles' }).fill('Synthetic');
  await page.getByRole('button', { name: 'Search advertisements' }).click();
  await expect(page.getByRole('link', { name: 'Synthetic Courtyard study home', exact: true })).toBeVisible();
  await prepare(page); await expect(page.getByText('Community-submitted · not owner-verified', { exact: true })).toBeVisible();
  await capture(page, 'recommendation-review', info.project.name);
  const requests: string[] = [];
  await page.route('**/api/v1/contributions/boarding/resolve', async route => {
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3180', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' };
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    requests.push(route.request().postData()!); await route.fulfill({ json: receipt, headers });
  });
  await page.getByRole('button', { name: 'Submit held recommendation' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Needs evidence.' })).toBeFocused();
  expect(requests).toHaveLength(1); const sent = JSON.parse(requests[0]);
  expect(Object.keys(sent).sort()).toEqual(['draft', 'key', 'resolution']);
  expect(Object.keys(sent.draft).sort()).toEqual(['description', 'facilities', 'locality', 'mediaGuidanceAcknowledged', 'privacyAcknowledged', 'title']);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/Student Study Annex|description|contributionId/);
  await capture(page, 'recommendation-receipt', info.project.name);
  for (const width of [320, 768]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.reload(); await expect(page.getByRole('textbox', { name: 'Recommendation title' })).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Needs evidence.' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('UNI-040 errors retry the same intent; invalid consent and unavailable public search do not publish', async ({ page }) => {
  let attempt = 0; const bodies: string[] = [];
  await page.route('**/api/v1/contributions/boarding/resolve', async route => {
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3180', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' };
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    bodies.push(route.request().postData()!); attempt++; await route.fulfill(attempt === 1 ? { status: 503, json: {}, headers } : { json: { ...receipt, reviewState: 'NEEDS_EVIDENCE' }, headers });
  });
  await page.goto('/contribute/boarding');
  await page.getByRole('button', { name: 'Use synthetic example' }).click(); await page.getByRole('button', { name: 'Review recommendation' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('both privacy acknowledgements'); expect(bodies).toEqual([]);
  await prepare(page); await page.getByRole('button', { name: 'Submit held recommendation' }).click(); await expect(page.locator('main').getByRole('alert')).toContainText('Retry the unchanged');
  await page.getByRole('button', { name: 'Submit held recommendation' }).click(); await expect(page.getByRole('heading', { name: 'Needs evidence.' })).toBeVisible();
  expect(bodies[0]).toBe(bodies[1]);
  await page.getByRole('button', { name: 'Edit draft', exact: true }).click(); await expect(page.getByRole('textbox', { name: 'Permitted description' })).toBeFocused();
  await page.getByRole('button', { name: 'Clear unsent draft' }).click(); await expect(page.getByRole('textbox', { name: 'Recommendation title' })).toHaveValue('');
});

test('UNI-040 long fictional names retain unverified source labels and reflow without a pin or owner badge', async ({ page }, info) => {
  await page.goto('/contribute/boarding'); await page.getByRole('button', { name: 'Use synthetic example' }).click();
  const title = 'Synthetic ' + 'A thoughtful community study setting '.repeat(4).slice(0, 110).trimEnd();
  await page.getByRole('textbox', { name: 'Recommendation title' }).fill(title);
  await page.getByLabel(/I have permission/).check(); await page.getByLabel(/I understand the separate photo/).check();
  await page.getByRole('button', { name: 'Review recommendation' }).click();
  const preview = page.getByRole('region', { name: 'Recommendation preview and outcome' });
  await expect(preview.getByRole('heading', { name: title })).toBeVisible();
  await expect(preview.getByText('Community-submitted · not owner-verified', { exact: true })).toBeVisible();
  await expect(preview.getByText('Owner verified', { exact: true })).toHaveCount(0);
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.setViewportSize(info.project.use.viewport!); await capture(page, 'recommendation-long-name', info.project.name);
});
