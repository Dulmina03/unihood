import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const evidence = resolve(process.env.UI_EVIDENCE_DIR ?? '../../docs/verification/UNI-012');
const university = 'synthetic-demo-university', campus = '20000000-0000-4000-8000-000000000001', entrance = '30000000-0000-4000-8000-000000000001';
const selected = `/explore?university=${university}&campus=${campus}&entrance=${entrance}`;
test('Urban Map responsive composition, usable list and accessible evidence', async ({page}, info) => {
  await mkdir(evidence, {recursive: true});
  await page.goto(selected); await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: width === 390 ? 844 : 900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.explore-context small')).toContainText('Map unavailable');
    await expect(page.getByRole('button', {name: 'Filters', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'List', exact: true})).toBeVisible();
    if (width === 768) {
      await page.getByRole('button', {name: 'Hide results', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Show results', exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Show results', exact: true}).click();
      if (info.project.name === 'desktop') await page.screenshot({path: `${evidence}/explore-tablet.png`});
    }
  }
  await page.setViewportSize(info.project.use.viewport!);
  // Scroll the results rather than the document to reveal the selected card on mobile/tablet.
  if (info.project.name === 'mobile') await page.getByRole('heading', {name: 'Synthetic Primary Gate'}).scrollIntoViewIfNeeded();
  if (info.project.name === 'desktop') {
    const card = await page.locator('.explore-preview').boundingBox();
    const message = await page.locator('.explore-map-message').boundingBox();
    expect(message!.x).toBeGreaterThanOrEqual(card!.x + card!.width + 16);
  }
  await page.screenshot({path: `${evidence}/explore-${info.project.name}.png`});
  if (info.project.name === 'mobile') {
    await page.locator('.explore-rail-content').evaluate((element) => {element.scrollTop = 0;});
    await page.screenshot({path: `${evidence}/explore-controls-mobile.png`});
  }
  const report = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await writeFile(`${evidence}/explore-${info.project.name}-axe.json`, JSON.stringify({violations: report.violations, passes: report.passes.map((item) => item.id)}, null, 2));
  expect(report.violations).toEqual([]);
  await page.getByRole('button', {name: 'List', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Map unavailable'})).not.toBeVisible();
  await page.getByRole('heading', {name: 'Synthetic Primary Gate'}).scrollIntoViewIfNeeded();
  await page.screenshot({path: `${evidence}/explore-list-${info.project.name}.png`});
  expect((await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});
test('URL restoration, share, Back/Forward, search and category filters preserve selection', async ({page, context}) => {
  await page.goto(selected); await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  await page.getByRole('button', {name: 'List', exact: true}).click();
  await expect(page).toHaveURL(/view=list/);
  await page.reload(); await expect(page.getByLabel('Public entrance', {exact: true})).toHaveValue(entrance);
  await page.getByRole('button', {name: 'Filters', exact: true}).click();
  await page.getByRole('dialog').getByLabel('Entrance name filter').fill('no match');
  await page.getByRole('button', {name: 'Apply filters'}).click();
  await expect(page.getByText('No entrances match')).toBeVisible();
  await page.goBack(); await expect(page.getByLabel('Find a public entrance')).toHaveValue('');
  await page.goForward(); await expect(page.getByLabel('Find a public entrance')).toHaveValue('no match');
  await page.getByRole('button', {name: 'Clear search'}).click();
  await page.getByRole('button', {name: 'Boardings', exact: true}).click();
  await expect(page.getByText('Boarding advertisements respect privacy')).toBeVisible();
  await page.getByRole('button', {name: 'Show campus gates'}).click();
  await page.getByRole('button', {name: 'Share', exact: true}).click();
  const link = await page.getByLabel('Shareable exploration link').inputValue();
  expect(link).toContain(`entrance=${entrance}`); expect(link).not.toMatch(/lat=|lng=|role=/);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', {name: 'Copy link', exact: true}).click();
  await expect(page.getByText('Link copied.', {exact: true})).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async () => {throw new Error('Unavailable');}}}));
  await page.getByRole('button', {name: 'Copy link', exact: true}).click();
  await expect(page.getByText('Copy is unavailable. Select the link above and copy it manually.')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', {name: 'Share', exact: true})).toBeFocused();
  const other = await context.newPage(); await other.goto(link);
  await expect(other.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible(); await other.close();
  await page.getByLabel('Campus', {exact: true}).selectOption('');
  await expect(page.getByLabel('Public entrance', {exact: true})).toHaveValue(''); expect(page.url()).not.toContain('entrance=');
  await page.goBack(); await expect(page.getByLabel('Public entrance', {exact: true})).toHaveValue(entrance);
});
test('invalid and missing selections, real empty results, network retry and delayed loading', async ({page}) => {
  for (const query of ['university=INVALID&PRIVATE_CANARY=secret', `university=${university}&campus=20000000-0000-4000-8000-000000000099`, `university=${university}&campus=${campus}&entrance=30000000-0000-4000-8000-000000000099`, 'university=unknown-university']) {
    await page.goto(`/explore?${query}`); await expect(page.getByText('This selection is invalid')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');
    await page.getByRole('button', {name: 'Reset selections'}).click(); await expect(page).toHaveURL(/\/explore$/);
  }
  let release!: () => void; const hold = new Promise<void>((done) => {release = done;}); let fail = true;
  await page.route('**/api/universities?*', async (route) => {await hold; await route.fulfill(fail ? {status: 503, json: {}} : {json: {items: [], page: {page: 1, pageSize: 100, hasNextPage: false}}});});
  await page.goto('/explore?view=list'); await expect(page.getByText('Loading public places…')).toBeVisible();
  release(); await expect(page.getByText('We couldn’t load public places')).toBeVisible();
  fail = false; await page.getByRole('button', {name: 'Retry public places'}).click();
  await expect(page.getByText('No universities available')).toBeVisible();
  await page.unrouteAll({behavior: 'wait'});
  await page.route('**/entrances?*', (route) => route.fulfill({status: 503, json: {}}));
  await page.goto(`${selected}&view=list`); await expect(page.getByText('We couldn’t load public places')).toBeVisible();
  await page.unrouteAll({behavior: 'wait'}); await page.getByRole('button', {name: 'Retry public places'}).click();
  await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  await page.route('**/entrances?*', (route) => route.fulfill({json: {items: [], page: {page: 1, pageSize: 100, hasNextPage: false}}}));
  await page.goto(`/explore?university=${university}&campus=${campus}&view=list`);
  await expect(page.getByText('No public entrances yet')).toBeVisible();
});
test('mobile sheet, keyboard focus, modal restoration and selected preview controls', async ({page}, info) => {
  await page.goto(selected); await expect(page.getByRole('heading', {name: 'Synthetic Primary Gate'})).toBeVisible();
  if (info.project.name === 'mobile') {
    const handle = page.getByRole('button', {name: 'Collapse results', exact: true}); await handle.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', {name: 'Expand results'})).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter'); await expect(handle).toHaveAttribute('aria-expanded', 'true');
    const box = await handle.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 12); await page.mouse.down(); await page.mouse.move(box!.x + box!.width / 2, box!.y + 90); await page.mouse.up();
    await expect(page.getByRole('button', {name: 'Expand results'})).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', {name: 'Expand results'}).click();
  }
  await page.getByRole('button', {name: 'Filters', exact: true}).click();
  expect((await new AxeBuilder({page}).include('dialog').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', {name: 'Filters', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'List', exact: true}).click();
  await page.getByRole('button', {name: 'Close entrance preview'}).click();
  await expect(page.getByRole('heading', {name: 'Public places', exact: true})).toBeFocused();
  await page.getByRole('button', {name: /PUBLIC CAMPUS ENTRANCE · 01/}).click();
  await expect(page.locator('.explore-preview')).toBeFocused();
  await page.goto('/explore'); await page.keyboard.press('Tab'); await expect(page.getByRole('link', {name: 'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#explore-main')).toBeFocused();
});
