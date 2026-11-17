import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const hiddenId = '71000000-0000-4000-8000-000000000002';
const areaId = '71000000-0000-4000-8000-000000000001';
const communityId = '71000000-0000-4000-8000-000000000003';
const publicId = '71000000-0000-4000-8000-000000000010';

test('UNI-039 Comprehensive Privacy Matrix: HIDDEN vs AREA_ONLY vs COMMUNITY vs PUBLIC_MAP', async ({ page, request }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  const out = resolve(process.env.UI_EVIDENCE_DIR ?? '../../docs/verification/UNI-039');
  await mkdir(out, { recursive: true });

  const capture = async (name: string) => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: `${out}/${name}-${info.project.name}.png`, fullPage: false });
    await page.screenshot({ path: `${out}/${name}-${info.project.name}-full.png`, fullPage: true });
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    await writeFile(`${out}/${name}-${info.project.name}-axe.json`, JSON.stringify({ violations: axe.violations }, null, 2));
    expect(axe.violations).toEqual([]);
  };

  // 1. HIDDEN Listing Inspection
  await page.goto(`/boardings/${hiddenId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Verify headers and robots tag (SEO privacy boundary)
  const metaRobots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(metaRobots).toContain('noindex');

  // Verify UI location hiding copy
  await expect(page.getByText('Location not shared')).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'The location stays private.' })).toBeVisible();
  await expect(page.getByText(/No locality, address or exact point is shared/)).toBeVisible();
  await expect(page.getByText(/Proximity is not computed for private listings/)).toBeVisible();

  // Intercept network response: verify no-store cache header and zero coordinates
  const hiddenApiResponse = await request.get(`/api/boardings/${hiddenId}`);
  expect(hiddenApiResponse.headers()['cache-control']).toBe('no-store');
  const hiddenJson = await hiddenApiResponse.json();
  expect(hiddenJson.listing.entrance).toBeNull();
  expect(hiddenJson.listing.locationLabel).toBeNull();
  expect(hiddenJson.listing.distanceMeters).toBeNull();
  expect(hiddenJson.listing.route).toBeNull();

  await capture('privacy-hidden-detail');

  // 2. AREA_ONLY Listing Inspection
  await page.goto(`/boardings/${areaId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Locality is shown as an area label, not a destination
  await expect(page.getByRole('heading', { level: 3, name: 'A broad area, by choice.' })).toBeVisible();
  await expect(page.getByText(/Only the explicitly shared synthetic locality is shown\. It is not a destination\./)).toBeVisible();
  await expect(page.getByText(/Proximity is not computed for private listings/)).toBeVisible();

  const areaApiResponse = await request.get(`/api/boardings/${areaId}`);
  expect(areaApiResponse.headers()['cache-control']).toBe('no-store');
  const areaJson = await areaApiResponse.json();
  expect(areaJson.listing.entrance).toBeNull();
  expect(areaJson.listing.locationLabel).not.toBeNull();
  expect(areaJson.listing.distanceMeters).toBeNull();

  await capture('privacy-area-detail');

  // 3. COMMUNITY_RECOMMENDATION Inspection
  await page.goto(`/boardings/${communityId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Unverified community disclaimer and unknown availability
  await expect(page.getByText(/Community-submitted, not owner-verified/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Availability unknown.' })).toBeVisible();
  await expect(page.getByText(/Community recommendations cannot set official rent or confirmed vacancy/)).toBeVisible();

  const communityApiResponse = await request.get(`/api/boardings/${communityId}`);
  const communityJson = await communityApiResponse.json();
  expect(communityJson.listing.price).toBeNull();
  expect(communityJson.listing.vacancy.status).toBe('UNKNOWN');
  expect(communityJson.listing.disclaimer).toBe('Community-submitted, not owner-verified');

  await capture('privacy-community-detail');

  // 4. Comparison Matrix: Public Consented vs Private Accommodation Separation
  await page.goto(`/compare?ids=${publicId},${hiddenId},${areaId}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Compare accommodations' })).toBeVisible();
  const matrix = page.getByRole('table', { name: 'Boarding comparison matrix' });
  await expect(matrix.locator('thead th')).toHaveCount(4);
  const locationCells = matrix.locator('tbody tr').nth(0).locator('td');
  await expect(locationCells.nth(0)).toContainText('Consented public entrance');
  await expect(locationCells.nth(1)).toContainText('Location not shared');
  await expect(locationCells.nth(2)).toContainText('Synthetic broad locality');
  const essentialsCells = matrix.locator('tbody tr').nth(4).locator('td');
  await expect(essentialsCells.nth(0)).toContainText('Pharmacy');
  for (const index of [1, 2]) {
    await expect(essentialsCells.nth(index)).toContainText('Not shared (location private)');
    await expect(locationCells.nth(index)).not.toContainText('6.9012');
  }
  const comparisonResponse = await request.get(`/api/boardings/compare?ids=${publicId},${hiddenId},${areaId}`);
  const comparison = await comparisonResponse.json();
  expect(comparison.items[0].entrance).toEqual({ lat: 6.9012, lng: 79.8612 });
  for (const item of comparison.items.slice(1)) {
    expect(item.entrance).toBeNull();
    expect(item.nearbyEssentials).toBeNull();
    expect(item.hasExactEntrance).toBe(false);
  }

  // Responsive viewports
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 768 && info.project.name === 'desktop') {
      await page.screenshot({ path: `${out}/privacy-comparison-tablet.png`, fullPage: true });
    }
  }
  await page.setViewportSize(info.project.use.viewport!);

  await capture('privacy-comparison-matrix');

  expect(errors).toEqual([]);
});

test('UNI-039 comparison revalidates revoked consent without storing geometry', async ({ page, request }) => {
  const source = await request.get(`/api/boardings/compare?ids=${publicId}`);
  expect(source.ok()).toBe(true);
  const initial = await source.json();
  let revoked = false;
  await page.route('**/api/boardings/compare?*', async route => {
    const data = structuredClone(initial);
    if (revoked) {
      Object.assign(data.items[0], { visibility: 'HIDDEN', entrance: null, locationLabel: null,
        hasExactEntrance: false, nearbyEssentials: null });
    }
    await route.fulfill({ json: data, headers: { 'cache-control': 'no-store' } });
  });
  await page.goto(`/compare?ids=${publicId}`);
  await expect(page.getByText('Consented public entrance', { exact: true })).toBeVisible();
  revoked = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Location hidden', { exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Boarding comparison matrix' })).not.toContainText('6.9012');
  await expect(page.getByRole('table', { name: 'Boarding comparison matrix' })).not.toContainText('79.8612');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/6\.9012|79\.8612|entrance/);
  await page.reload();
  await expect(page.getByText('Location hidden', { exact: true })).toBeVisible();
});
