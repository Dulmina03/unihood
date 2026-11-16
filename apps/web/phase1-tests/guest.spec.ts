import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { syntheticStyle } from '../browser-tests/fixtures/map-style';
const evidence = resolve(process.env.UI_EVIDENCE_DIR ?? '/tmp/unihood-phase1-evidence');
const campus = '20000000-0000-4000-8000-000000000001';
const entrance = '30000000-0000-4000-8000-000000000001';
const selected = `/explore?university=synthetic-demo-university&campus=${campus}&entrance=${entrance}`;
async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeEnabled();
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await target.evaluate((node) => node === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard focus did not reach the named control within 60 tabs');
}
async function mockMap(page: Page) {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.request().url().endsWith('/styles/liberty') ? route.fulfill({json: syntheticStyle, headers: {'Access-Control-Allow-Origin': '*'}}) : route.abort());
}
async function axe(page: Page, name: string) {
  const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await mkdir(evidence, {recursive: true});
  await writeFile(`${evidence}/${name}-axe.json`, JSON.stringify({violations: result.violations, passes: result.passes.map((row) => row.id)}, null, 2) + '\n');
  expect(result.violations).toEqual([]);
}
test('one complete keyboard guest journey: QR → gate preview → save → Saved → reopen and share', async ({page, context}, info) => {
  await mockMap(page);
  // No directory interception: SSR, browser adapters and Saved all read real Nest/PostGIS.
  await page.goto('/u/synthetic-demo-university');
  await expect(page.getByRole('heading', {name: 'Welcome to Synthetic Demo University.'})).toBeVisible();
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', {name: 'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#main')).toBeFocused();
  const campusSelect = page.getByRole('combobox', {name: 'Campus', exact: true});
  await tabTo(page, campusSelect); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(campusSelect).toHaveValue(campus);
  const gateSelect = page.getByRole('combobox', {name: 'Public entrance', exact: true});
  await tabTo(page, gateSelect); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(gateSelect).toHaveValue(entrance);
  await tabTo(page, page.getByRole('button', {name: 'Explore selected campus', exact: true})); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`entrance=${entrance}`));
  await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  await expect(page.locator('.explore-context small')).toContainText('Map ready', {timeout: 20000});
  if (info.project.name === 'mobile') {
    await tabTo(page, page.getByRole('button', {name: 'Collapse results', exact: true})); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', {name: 'Expand results'})).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter'); await expect(page.getByRole('button', {name: 'Collapse results'})).toHaveAttribute('aria-expanded', 'true');
  }
  // Explicit result selection must focus the grounded preview.
  const result = page.locator('.discovery-card-open').first(); await tabTo(page, result); await page.keyboard.press('Enter');
  await expect(page.locator('.explore-preview')).toBeFocused();
  const save = page.locator('.explore-preview').getByRole('button', {name: 'Save Synthetic Primary Gate', exact: true});
  await tabTo(page, save); await page.keyboard.press('Enter'); await expect(save).toHaveAttribute('aria-pressed', 'true');
  await axe(page, `journey-explore-${info.project.name}`);
  const savedLink = page.locator('.discovery-saved-link a'); await tabTo(page, savedLink); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/saved$/); await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('unihood:guest-entrances:v1')!));
  expect(stored).toEqual({version: 1, entrances: [{universityId: '10000000-0000-4000-8000-000000000001', campusId: campus, entranceId: entrance}]});
  await axe(page, `journey-saved-${info.project.name}`);
  await tabTo(page, page.getByRole('link', {name: 'Explore this gate'})); await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', {name: 'Public entrance', exact: true})).toHaveValue(entrance);
  await page.goBack(); await expect(page).toHaveURL(/\/saved$/); await page.goForward(); await expect(page).toHaveURL(new RegExp(`entrance=${entrance}`));
  await tabTo(page, page.getByRole('button', {name: 'Share', exact: true})); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', {name: 'Share your starting point'})).toBeVisible();
  const shared = await page.getByLabel('Shareable exploration link').inputValue(); expect(new URL(shared).pathname + new URL(shared).search).toBe(selected);
  expect(shared).not.toMatch(/lat=|lng=|role=|token=|saved=/);
  await expect(page.getByRole('button', {name: 'Close dialog', exact: true})).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByLabel('Shareable exploration link')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', {name: 'Copy link', exact: true})).toBeFocused();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']); await page.keyboard.press('Enter');
  await expect(page.getByText('Link copied.', {exact: true})).toBeVisible(); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shared);
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', {name: 'Share', exact: true})).toBeFocused();
  const guest = await context.newPage(); await mockMap(guest); await guest.goto(shared); await expect(guest.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible(); await guest.close();
});
test('UI-01/UI-03 reference evidence, responsive controls and URL/filter/history acceptance', async ({page}, info) => {
  await mockMap(page); await page.goto('/'); await expect(page.getByRole('combobox', {name: 'University', exact: true})).toBeEnabled(); await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 768, 1440]) {await page.setViewportSize({width, height: width === 390 ? 844 : 900}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);}
  await page.setViewportSize(info.project.use.viewport!); await mkdir(evidence, {recursive: true}); await page.screenshot({path: `${evidence}/ui-01-${info.project.name}.png`}); await axe(page, `ui-01-${info.project.name}`);
  await page.goto(selected); await expect(page.locator('.explore-context small')).toContainText('Map ready', {timeout: 20000});
  await page.evaluate(() => document.fonts.ready);
  if (info.project.name === 'mobile') await page.getByRole('button', {name: 'Collapse results'}).click();
  await page.screenshot({path: `${evidence}/ui-03-${info.project.name}.png`}); await axe(page, `ui-03-${info.project.name}`);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: width === 390 ? 844 : 900}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ['OpenFreeMap', '© OpenMapTiles', '© OpenStreetMap']) await expect(page.getByRole('link', {name: `${name} (opens a new tab)`, exact: true})).toBeInViewport();
    if (width === 768) {await page.getByRole('button', {name: 'Hide results', exact: true}).click(); await page.getByRole('button', {name: 'Show results', exact: true}).click(); if (info.project.name === 'desktop') await page.screenshot({path: `${evidence}/ui-03-tablet.png`});}
  }
  await page.setViewportSize(info.project.use.viewport!); await page.getByRole('button', {name: 'List', exact: true}).click();
  await page.getByRole('button', {name: 'Filters', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Refine your view'}); await dialog.getByLabel('Entrance name filter').fill('Primary'); await dialog.getByRole('combobox', {name: 'Gate type', exact: true}).selectOption('primary'); await dialog.getByRole('combobox', {name: 'Sort entrances', exact: true}).selectOption('name');
  await page.getByRole('button', {name: 'Apply filters'}).click(); await expect(page.getByRole('button', {name: 'Filters', exact: true})).toBeFocused();
  expect(page.url()).toContain('q=Primary'); expect(page.url()).toContain('gate=primary'); expect(page.url()).toContain('sort=name');
  await expect(page.locator('.discovery-card')).toHaveCount(1); await page.reload(); await expect(page.getByRole('combobox', {name: 'Gate type', exact: true})).toHaveValue('primary');
  await page.getByRole('button', {name: 'Map', exact: true}).click(); await expect(page.locator('.campus-map-marker')).toHaveCount(1);
  await page.goBack(); await expect(page.locator('.maplibregl-canvas')).toHaveCount(0); await page.goForward(); await expect(page.locator('.campus-map-marker')).toHaveCount(1);
  await page.getByRole('button', {name: 'List', exact: true}).click(); await page.getByRole('button', {name: 'Reset result filters'}).click(); await expect(page.locator('.discovery-card')).toHaveCount(2);
  await page.getByRole('combobox', {name: 'Public entrance', exact: true}).selectOption('30000000-0000-4000-8000-000000000002'); await expect(page.locator('.explore-preview')).toBeFocused(); await expect(page.getByRole('heading', {name: 'Synthetic Secondary Gate'})).toBeVisible();
});
test('bounded loading/empty/error/retry and map failure keep the real public list usable', async ({page, request}, info) => {
  // Deliberate browser-response faults; successful recovery goes back to actual Nest/PostGIS.
  let release!: () => void, fail = true; const hold = new Promise<void>((done) => {release = done;});
  await page.route('**/api/universities?*', async (route) => {await hold; if (fail) await route.fulfill({status: 503, json: {message: 'PRIVATE_CANARY'}}); else await route.continue();});
  await page.goto('/explore?view=list'); await expect(page.getByText('Loading public places…')).toBeVisible(); release(); await expect(page.getByText('We couldn’t load public places')).toBeVisible(); await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');
  fail = false; await page.getByRole('button', {name: 'Retry public places'}).click(); await expect(page.getByRole('combobox', {name: 'University', exact: true})).toBeEnabled();
  await page.unrouteAll({behavior: 'wait'}); await page.goto(`${selected}&view=list`); await expect(page.locator('.discovery-card')).toHaveCount(2);
  await page.getByLabel('Find a public entrance').fill('No such synthetic entrance'); await page.getByRole('button', {name: 'Search entrances', exact: true}).click(); await expect(page.getByText('No entrances match')).toBeVisible(); await page.getByRole('button', {name: 'Clear search'}).click(); await expect(page.locator('.discovery-card')).toHaveCount(2);
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort()); await page.getByRole('button', {name: 'Map', exact: true}).click(); await expect(page.getByText(/The map could not load/)).toBeVisible();
  await page.unroute('https://tiles.openfreemap.org/**'); await mockMap(page); await page.getByRole('button', {name: 'Retry map'}).click(); await expect(page.locator('.explore-context small')).toContainText('Map ready', {timeout: 20000});
  await page.goto(`${process.env.PHASE1_LIST_BASE_URL}${selected}`); await expect(page.getByText(/No map provider is configured/)).toBeVisible(); await page.getByRole('button', {name: 'Explore the list'}).click(); await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  await axe(page, `fallback-${info.project.name}`);
  const response = await request.post('/api/universities', {headers: {'X-Role': 'owner', 'X-User-Id': 'admin'}}); expect(response.status()).toBe(405);
  expect((await request.get('/api/universities?lat=PRIVATE_CANARY')).status()).toBe(400);
  await expect(page.locator('body')).not.toContainText(/Owner.verified|\d+ km|\d+ min/);
});
