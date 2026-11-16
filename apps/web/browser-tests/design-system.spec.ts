import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const evidence = fileURLToPath(new URL('../../../docs/verification/UNI-003/', import.meta.url));
test.beforeEach(async ({page}) => {
  await page.goto('/design-system');
  await page.evaluate(() => document.fonts.ready);
});

test('responsive library, accessibility and screenshot evidence', async ({page}, info) => {
  await mkdir(evidence, {recursive: true});
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByRole('heading', {level: 1})).toContainText('Familiar places.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('img').evaluateAll(async (images) => {await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));});
  const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
  await writeFile(`${evidence}/accessibility-${info.project.name}.json`, JSON.stringify({url: '/design-system', viewport: page.viewportSize(), tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'], violations: results.violations, passedRules: results.passes.map((rule) => rule.id), incompleteRules: results.incomplete.map((rule) => ({id: rule.id, nodes: rule.nodes.map((node) => ({html: node.html, summary: node.failureSummary}))}))}, null, 2) + '\n');
  expect(await page.evaluate(() => performance.getEntriesByType('resource').filter((entry) => entry.name.startsWith('http')).every((entry) => new URL(entry.name).origin === location.origin))).toBe(true);
  const size = info.project.name === 'mobile' ? '390x844' : '1440x900';
  await page.screenshot({path: `${evidence}/design-system-${size}.png`});
  await page.screenshot({path: `${evidence}/design-system-${size}-full.png`, fullPage: true});
  await page.locator('#map-components').scrollIntoViewIfNeeded();
  await page.screenshot({path: `${evidence}/map-components-${size}.png`});
  await page.locator('.uh-map-preview').scrollIntoViewIfNeeded();
  await page.screenshot({path: `${evidence}/map-preview-${size}.png`});
  expect(errors).toEqual([]);
});

test('keyboard navigation and native modal contain and restore focus', async ({page}, info) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: 'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  if (info.project.name === 'mobile') {
    const menu = page.getByRole('button', {name: /^(Open|Close) navigation$/});
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('navigation', {name: 'Primary'}).getByRole('link', {name: 'Foundations'}).focus();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
    await menu.click();
    await page.getByRole('navigation', {name: 'Primary'}).getByRole('link', {name: 'Listing cards'}).click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  }
  const trigger = page.getByRole('button', {name: 'Explore visibility choices'});
  await trigger.click();
  const dialog = page.getByRole('dialog', {name: 'Choose what you share.'});
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.x + bounds!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThanOrEqual(1);
  await expect(dialog.getByRole('radio', {name: /Location hidden/})).toBeChecked();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path: `${evidence}/visibility-dialog-${info.project.name}.png`});
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('filters, saved state, recovery, validation and privacy examples', async ({page}, info) => {
  const collection = page.locator('#collection');
  await collection.getByRole('button', {name: 'Community recommendations', exact: true}).click();
  await expect(collection.getByRole('article')).toHaveCount(1);
  const community = collection.getByRole('article');
  await expect(community).toContainText('Community-submitted');
  await expect(community).toContainText('Availability unknown');
  await expect(community).not.toContainText('LKR');
  await expect(community.getByRole('link')).toHaveCount(0);
  await community.getByRole('button', {name: /Save Synthetic/}).click();
  await expect(collection.getByRole('status')).toHaveText('Saved in this demo: 1');
  await community.getByRole('button', {name: 'Preview advertisement'}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Community recommendation only');
  await expect(dialog.getByRole('link')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await collection.getByRole('combobox').selectOption('error');
  await expect(collection.getByRole('alert')).toBeVisible();
  await collection.getByRole('alert').scrollIntoViewIfNeeded();
  await page.screenshot({path: `${evidence}/collection-error-${info.project.name}.png`});
  await collection.getByRole('button', {name: 'Retry examples'}).click();
  await expect(collection.getByRole('article')).toHaveCount(1);
  await collection.getByRole('combobox').selectOption('loading');
  await expect(collection.getByText('Loading advertisements')).toHaveCount(3);
  await collection.getByRole('combobox').selectOption('empty');
  await collection.getByRole('button', {name: 'Reset sample filters'}).click();
  await expect(collection.getByRole('article')).toHaveCount(3);
  await collection.getByRole('searchbox').fill('nonexistent');
  await collection.getByRole('button', {name: 'Search', exact: true}).click();
  await expect(collection.getByRole('heading', {name: 'A little more room to explore.'})).toBeVisible();
  await collection.getByRole('button', {name: 'Reset sample filters'}).click();
  const hidden = collection.getByRole('article', {name: 'Synthetic quiet corner'});
  await expect(hidden).toContainText('Location not shared');
  await expect(hidden.getByRole('link')).toHaveCount(0);
  await page.getByRole('button', {name: 'Validate example'}).click();
  await expect(page.getByRole('textbox', {name: 'Advertisement title (required)'})).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('textbox', {name: 'Advertisement title (required)'}).fill('Synthetic example');
  await page.getByRole('button', {name: 'Validate example'}).click();
  await expect(page.getByText('Demo title accepted. Nothing was published.')).toBeVisible();
});

test('map layer exclusion and list fallback; intermediate widths', async ({page}) => {
  const map = page.locator('#map-components');
  await expect(map.getByRole('complementary', {name: 'Owner-public property preview'})).toBeVisible();
  await expect(map).not.toContainText('Synthetic quiet corner');
  await expect(map).not.toContainText('Synthetic community find');
  await map.getByRole('button', {name: 'Owner boardings', exact: true}).click();
  await expect(map.getByRole('complementary', {name: 'Owner-public property preview'})).toHaveCount(0);
  await map.getByRole('button', {name: 'Pharmacies', exact: true}).click();
  await expect(map.getByText('Selected layers: Pharmacies', {exact: true})).toBeVisible();
  await map.getByRole('button', {name: 'Show listing examples'}).click();
  await expect(map.getByRole('article')).toHaveCount(1);
  for (const width of [320, 768]) {
    await page.setViewportSize({width, height: 900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await map.getByRole('button', {name: 'Map layout', exact: true}).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 768) {
      const link = page.getByRole('navigation', {name: 'Primary'}).getByRole('link', {name: 'Foundations'});
      await expect(link).toBeVisible(); await link.click();
      await expect(page.locator('#foundations')).toBeFocused();
    }
  }
});
