import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const evidence = resolve(process.env.UI_EVIDENCE_DIR ?? '../../docs/verification/UNI-013');
import { syntheticStyle as style } from './fixtures/map-style';
const campus = '20000000-0000-4000-8000-000000000001';
const first = '30000000-0000-4000-8000-000000000001', second = '30000000-0000-4000-8000-000000000002';
const selected = `http://127.0.0.1:3181/explore?university=synthetic-demo-university&campus=${campus}&entrance=${first}`;
test.beforeEach(async ({request}) => {await expect.poll(async () => {try {return (await request.get('http://127.0.0.1:3181/explore')).status();} catch {return 0;}}, {timeout: 20000}).toBe(200);});
async function mockProvider(page: Page) {await page.route('https://tiles.openfreemap.org/**', (route) => route.request().url().endsWith('/styles/liberty') ? route.fulfill({json: style, headers: {'Access-Control-Allow-Origin': '*'}}) : route.abort());}
async function ready(page: Page) {await expect(page.locator('.explore-context small')).toContainText('Map ready', {timeout: 20000}); await expect(page.getByText('Mock map resources · synthetic geometry')).toBeVisible();}
test('real MapLibre worker, synthetic resource screenshots, responsive composition and accessibility', async ({page}, info) => {
  await mockProvider(page); await page.goto(selected); await ready(page); await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(1);
  await expect(page.getByRole('button', {name: 'Select Synthetic Primary Gate on map · Synthetic example', exact: true})).toHaveAttribute('aria-pressed', 'true');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: width === 390 ? 844 : 900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const label of ['OpenFreeMap', '© OpenMapTiles', '© OpenStreetMap']) await expect(page.getByRole('link', {name: `${label} (opens a new tab)`, exact: true})).toBeInViewport();
    if (width === 768) {
      const toggle = await page.getByRole('button', {name: 'Hide results', exact: true}).boundingBox();
      const legend = await page.locator('.campus-map-legend').boundingBox();
      expect(toggle!.y + toggle!.height).toBeLessThanOrEqual(legend!.y - 8);
      await page.getByRole('button', {name: 'Hide results', exact: true}).click();
      await page.getByRole('button', {name: 'Show results', exact: true}).click();
      await expect(page.locator('.maplibregl-canvas')).toHaveCount(1);
      if (info.project.name === 'desktop') {await mkdir(evidence, {recursive: true}); await page.screenshot({path: `${evidence}/map-tablet.png`});}
    }
  }
  await page.setViewportSize(info.project.use.viewport!);
  if (info.project.name === 'mobile') await page.getByRole('button', {name: 'Collapse results'}).click();
  await page.getByRole('button', {name: 'Recenter gates'}).click(); await page.waitForTimeout(200);
  await mkdir(evidence, {recursive: true}); await page.screenshot({path: `${evidence}/map-${info.project.name}.png`});
  const report = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await writeFile(`${evidence}/map-${info.project.name}-axe.json`, JSON.stringify({violations: report.violations, passes: report.passes.map((item) => item.id)}, null, 2));
  expect(report.violations).toEqual([]);
  if (info.project.name === 'mobile') {await page.getByRole('button', {name: 'Expand results'}).tap(); await page.getByRole('heading', {name: 'Synthetic Primary Gate'}).scrollIntoViewIfNeeded(); await page.screenshot({path: `${evidence}/map-sheet-mobile.png`});}
  await expect(page.locator('body')).not.toContainText(/Owner.verified|\d+ min|\d+ km/);
});
test('marker keyboard/touch selection, list and URL history remain synchronized without duplicate maps', async ({page}, info) => {
  await mockProvider(page); await page.goto(selected); await ready(page);
  if (info.project.name === 'mobile') await page.getByRole('button', {name: 'Collapse results'}).click();
  const marker = page.getByRole('button', {name: 'Select Synthetic Secondary Gate on map · Synthetic example', exact: true});
  await marker.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`entrance=${second}`)); await expect(page.locator('.explore-preview')).toBeFocused();
  await expect(page.getByRole('heading', {name: 'Synthetic Secondary Gate'})).toBeVisible();
  await page.goBack(); await expect(page.getByLabel('Public entrance', {exact: true})).toHaveValue(first);
  await page.goForward(); await expect(page.getByLabel('Public entrance', {exact: true})).toHaveValue(second);
  if (info.project.name === 'mobile') {
    await page.getByRole('button', {name: 'Collapse results'}).click();
    await page.getByRole('button', {name: 'Select Synthetic Primary Gate on map · Synthetic example', exact: true}).tap();
    await expect(page).toHaveURL(new RegExp(`entrance=${first}`)); await page.goBack();
    await expect(page.getByLabel('Public entrance', {exact: true})).toHaveValue(second);
  }
  await page.reload(); await ready(page); await expect(page.getByLabel('Public entrance', {exact: true})).toHaveValue(second);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', {name: 'List', exact: true}).click(); await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
    await expect.poll(() => page.workers().length).toBe(0);
    await page.getByRole('button', {name: 'Map', exact: true}).click(); await ready(page); await expect(page.locator('.maplibregl-canvas')).toHaveCount(1);
  }
  await page.getByRole('link', {name: 'University page'}).click();
  await expect(page).toHaveURL(/\/u\/synthetic-demo-university$/); await expect.poll(() => page.workers().length).toBe(0);
  await page.goBack(); await ready(page);
  await page.getByRole('button', {name: 'List', exact: true}).click();
  await page.getByLabel('Find a public entrance').fill('Primary'); await page.getByRole('button', {name: 'Search entrances', exact: true}).click();
  await page.getByRole('button', {name: 'Map', exact: true}).click(); await ready(page); await expect(page.locator('.campus-map-marker')).toHaveCount(1);
  await page.getByRole('button', {name: 'List', exact: true}).click(); await page.getByRole('button', {name: 'Boardings', exact: true}).click();
  await page.getByRole('button', {name: 'Map', exact: true}).click(); await ready(page); await expect(page.locator('.campus-map-marker')).toHaveCount(0);
});
test('network failure, delayed loading, retry and missing configuration preserve list access', async ({page}, info) => {
  let fail = true, release!: () => void; const hold = new Promise<void>((done) => {release = done;});
  await page.route('https://tiles.openfreemap.org/**', async (route) => {await hold; if (fail) await route.fulfill({status: 503, body: 'PRIVATE_CANARY', headers: {'Access-Control-Allow-Origin': '*'}}); else await route.fulfill({json: style, headers: {'Access-Control-Allow-Origin': '*'}});});
  await page.goto(selected); await expect(page.getByText(/Loading the map…/)).toBeVisible(); release();
  await expect(page.getByText(/The map could not load/)).toBeVisible(); await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');
  await mkdir(evidence, {recursive: true}); await page.screenshot({path: `${evidence}/map-error-${info.project.name}.png`});
  expect((await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  fail = false; await page.getByRole('button', {name: 'Retry map'}).click(); await ready(page);
  await page.getByRole('button', {name: 'List', exact: true}).click(); await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  await page.goto('/explore'); await expect(page.getByText(/No map provider is configured/)).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0); await page.getByRole('button', {name: 'Explore the list'}).click(); await expect(page).toHaveURL(/view=list/);
});
test('native WebGL context loss and unavailable WebGL recover with a fresh map or list', async ({page}) => {
  await mockProvider(page); await page.goto(selected); await ready(page);
  await page.locator('.maplibregl-canvas').evaluate((canvas) => {const context = (canvas as HTMLCanvasElement).getContext('webgl2')!; context.getExtension('WEBGL_lose_context')!.loseContext();});
  await expect(page.getByText(/The map graphics connection was lost/)).toBeVisible(); await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  await page.getByRole('button', {name: 'Retry map'}).click(); await ready(page);
  await page.addInitScript(() => {const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {if (type.startsWith('webgl')) return null; return Reflect.apply(original, this, [type, ...args]);} as typeof original;});
  await page.reload(); await expect(page.getByText(/Interactive maps are unavailable in this browser/)).toBeVisible();
  await page.getByRole('button', {name: 'List', exact: true}).click(); await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
});
