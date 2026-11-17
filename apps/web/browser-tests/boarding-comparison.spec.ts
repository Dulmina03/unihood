import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const publicId = '71000000-0000-4000-8000-000000000010';
const areaId = '71000000-0000-4000-8000-000000000001';

async function capture(page: import('@playwright/test').Page, name: string, project: string) {
  const out = resolve(process.env.UI_EVIDENCE_DIR ?? '../../docs/verification/UNI-038');
  await mkdir(out, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: `${out}/${name}-${project}.png` });
  await page.screenshot({ path: `${out}/${name}-${project}-full.png`, fullPage: true });
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await writeFile(`${out}/${name}-${project}-axe.json`, JSON.stringify({ violations: axe.violations }, null, 2));
  expect(axe.violations).toEqual([]);
}

test('synthetic boarding comparison distinguishes public consented coordinates and nearby essentials from private area-only', async ({ page }, info) => {
  await page.goto(`/compare?ids=${publicId},${areaId}`);

  await expect(page.getByRole('heading', { name: 'Compare accommodations' })).toBeVisible();
  await expect(page.getByText('Synthetic Consented Public Home')).toBeVisible();
  await expect(page.getByText('Synthetic Courtyard study home')).toBeVisible();

  // Public map details
  await expect(page.getByText('Consented public entrance')).toBeVisible();
  await expect(page.getByText(/Pharmacy \(1\): 140m/)).toBeVisible();
  await expect(page.getByText('LKR 20,000', { exact: true })).toBeVisible();
  await expect(page.getByText('Available')).toBeVisible();

  // Area only details (ADR-0002/0003 enforcement in UI)
  await expect(page.getByText('Synthetic broad locality')).toBeVisible();
  await expect(page.getByText('Not shared (location private)')).toBeVisible();
  await expect(page.getByText('Not shared / Unpriced')).toBeVisible();

  // Capture evidence on comparison matrix
  await capture(page, 'boarding-compare', info.project.name);

  // Responsive check
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(hasHorizontalOverflow).toBe(false);
    if (width === 768 && info.project.name === 'desktop') {
      await page.screenshot({
        path: `${resolve(process.env.UI_EVIDENCE_DIR ?? '../../docs/verification/UNI-038')}/boarding-compare-tablet.png`,
        fullPage: true,
      });
    }
  }

  // Remove action
  await page.setViewportSize({ width: 1440, height: 900 });
  const removeButtons = page.getByRole('button', { name: /Remove .* from comparison/ });
  await expect(removeButtons).toHaveCount(2);
  await removeButtons.nth(1).click();
  await expect(page.getByText('Synthetic Courtyard study home')).not.toBeVisible();
});

test('advertisement details enforce privacy boundaries while comparison offers full public vs private evaluation', async ({ page }, info) => {
  // 1. Visit AREA_ONLY boarding advertisement detail
  await page.goto(`/boardings/${areaId}`);
  await expect(page.getByRole('heading', { name: 'Synthetic Courtyard study home' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nearby essentials & amenities' })).toBeVisible();
  await expect(page.getByText('Proximity is not computed for private listings.')).toBeVisible();
  await expect(page.getByText('Walking distances and nearby public services are available only for owner-consented public map listings.')).toBeVisible();

  // Verify compare link is present
  const compareLink = page.getByRole('link', { name: 'Compare this boarding' });
  await expect(compareLink).toBeVisible();
  expect(await compareLink.getAttribute('href')).toContain(`/compare?ids=${areaId}`);

  await capture(page, 'boarding-advertisement-privacy', info.project.name);

  // 2. Click compare link to transition to comparison page
  await compareLink.click();
  await expect(page.getByRole('heading', { name: 'Compare accommodations' })).toBeVisible();
  await expect(page.getByText('Synthetic Courtyard study home')).toBeVisible();
  await expect(page.getByText('Not shared (location private)')).toBeVisible();
});
