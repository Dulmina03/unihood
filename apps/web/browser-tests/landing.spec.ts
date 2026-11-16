import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const evidence = resolve(process.env.UI_EVIDENCE_DIR ?? '../../docs/verification/UNI-011');
const universityId = '10000000-0000-4000-8000-000000000001';
const campusId = '20000000-0000-4000-8000-000000000001';
const entranceId = '30000000-0000-4000-8000-000000000001';
test('editorial landing reference evidence, accessibility and responsive composition', async ({page}, info) => {
  await mkdir(evidence, {recursive: true});
  await page.goto('/'); await page.getByRole('option', {name: 'Synthetic Demo University · Demo'}).waitFor({state: 'attached'});
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Find your place.Discover your neighborhood.');
  await expect(page.getByText('No live listings, prices, vacancies or owner claims.', {exact: false})).toBeVisible();
  await expect(page.locator('.inspiration-card')).toHaveCount(3);
  for (const caption of await page.locator('.inspiration-image figcaption').all()) {
    await caption.scrollIntoViewIfNeeded(); await expect(caption).toBeInViewport();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: width === 390 ? 844 : 900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByLabel('University', {exact: true})).toBeVisible();
    if (width === 768 && info.project.name === 'desktop') await page.screenshot({path: `${evidence}/landing-tablet.png`});
  }
  await page.setViewportSize(info.project.use.viewport!);
  await page.screenshot({path: `${evidence}/landing-${info.project.name}.png`});
  await page.screenshot({path: `${evidence}/landing-${info.project.name}-full.png`, fullPage: true});
  const accessibility = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await writeFile(`${evidence}/landing-${info.project.name}-axe.json`, JSON.stringify({violations: accessibility.violations, passes: accessibility.passes.map((item) => item.id)}, null, 2));
  expect(accessibility.violations).toEqual([]);
});
test('guest picker, direct QR route, keyboard and truthful unavailable feature actions', async ({page}, info) => {
  await page.goto('/u/synthetic-demo-university');
  await expect(page.getByRole('heading', {name: 'Welcome to Synthetic Demo University.'})).toBeVisible();
  await expect(page.getByLabel('University', {exact: true})).toHaveValue(universityId);
  await page.getByLabel('Campus', {exact: true}).selectOption(campusId);
  await page.getByLabel('Public entrance').selectOption(entranceId);
  await expect(page.getByText(/Demonstration only; this is not a real gate/)).toBeVisible();
  await mkdir(evidence, {recursive: true});
  await page.screenshot({path: `${evidence}/university-${info.project.name}.png`, fullPage: true});
  await page.getByLabel('University', {exact: true}).selectOption('10000000-0000-4000-8000-000000000002');
  await page.getByRole('button', {name: 'Open university'}).click();
  await expect(page).toHaveURL(/\/u\/synthetic-second-university$/);
  await expect(page.getByRole('heading', {name: 'Welcome to Synthetic Second University.'})).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('University', {exact: true})).toHaveValue(universityId);
  await expect(page.getByLabel('Public entrance')).toHaveValue('');
  await page.getByLabel('Campus', {exact: true}).selectOption(campusId);
  await page.getByLabel('Public entrance').selectOption(entranceId);
  await page.getByLabel('Public entrance').focus(); await page.keyboard.press('Tab');
  await page.getByRole('button', {name: 'Explore Map', exact: true}).click();
  await page.getByRole('dialog').getByRole('link', {name: 'Choose a university'}).click();
  await expect(page.locator('#campus-start')).toBeFocused();
  await page.getByRole('button', {name: 'Explore Map', exact: true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await new AxeBuilder({page}).include('dialog').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', {name: 'Explore Map', exact: true})).toBeFocused();
  if (info.project.name === 'mobile') {
    await page.getByRole('button', {name: 'Open navigation'}).click();
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', {name: 'Open navigation'})).toBeFocused();
  }
  await page.goto('/'); await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: 'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#main')).toBeFocused();
});
test('invalid QR, unknown slug, upstream failure and API read-only boundary', async ({page, request}) => {
  for (const slug of ['INVALID', 'unknown-university']) {
    const response = await page.goto(`/u/${slug}`);
    // Next can stream notFound after loading UI; the semantic 404/noindex is verified too.
    expect([200, 404]).toContain(response?.status());
    await expect(page.getByRole('heading', {name: 'University not found.'})).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
  }
  await page.goto('/u/synthetic-unavailable');
  await expect(page.getByText('We couldn’t open this university')).toBeVisible();
  await expect(page.getByText(/does not mean your QR link is invalid/)).toBeVisible();
  expect((await request.post('/api/universities', {headers: {'X-Role': 'owner'}})).status()).toBe(405);
  const bad = await request.get('/api/universities?PRIVATE_CANARY=private');
  expect(bad.status()).toBe(400); expect(await bad.text()).not.toContain('PRIVATE_CANARY');
});
test('loading, empty, retry and dependent fetch error states remain distinct', async ({page}) => {
  let resolve!: () => void;
  const hold = new Promise<void>((done) => {resolve = done;});
  let fail = true;
  await page.route('**/api/universities?*', async (route) => {
    await hold;
    if (fail) await route.fulfill({status: 503, json: {}});
    else await route.fulfill({json: {items: [], page: {page: 1, pageSize: 100, hasNextPage: false}}});
  });
  await page.goto('/');
  await expect(page.getByText('Loading the public university directory…')).toBeVisible();
  resolve(); await expect(page.getByText('We couldn’t load universities')).toBeVisible();
  fail = false; await page.getByRole('button', {name: 'Try universities again'}).click();
  await expect(page.getByText(/No universities are available yet/)).toBeVisible();
  await expect(page.getByRole('button', {name: 'Open university'})).toBeDisabled();
  await page.unrouteAll({behavior: 'wait'});
  await page.route('**/campuses?*', (route) => route.fulfill({status: 503, json: {}}));
  await page.goto('/u/synthetic-demo-university');
  await expect(page.getByText('We couldn’t load campuses.')).toBeVisible();
  await page.unrouteAll({behavior: 'wait'}); await page.getByRole('button', {name: 'Retry campuses'}).click();
  await page.getByLabel('Campus', {exact: true}).selectOption(campusId);
  await page.route('**/entrances?*', (route) => route.fulfill({json: {items: [], page: {page: 1, pageSize: 100, hasNextPage: false}}}));
  // Reload the campus selection to exercise a genuinely empty entrance response.
  await page.getByLabel('Campus', {exact: true}).selectOption(''); await page.getByLabel('Campus', {exact: true}).selectOption(campusId);
  await expect(page.getByText('No public entrances are available yet.')).toBeVisible();
});
