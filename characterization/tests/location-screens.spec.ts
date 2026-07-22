import { test, expect } from '@playwright/test';
import { LOCATIONS, url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React location screens (Phase 2 Batch 31 migration of location/list,
 * location/edit, location/showBinLocations, location/showZoneLocations,
 * location/showContents and location/uploadLogo).
 *
 * The legacy GSP URLs now serve the SPA, so the same URLs are exercised here
 * against the React implementations, cross-checked against the JSON API.
 */
test.describe('location screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    // The React location screens (and their APIs) only exist in builds
    // containing the Batch 31 migration. Against an older pinned baseline
    // image, skip; re-baseline OB_VERSION after release to activate.
    const probe = await page.request.get(url('/api/locations/search?max=1'));
    let deployed = false;
    if (probe.status() === 200) {
      try {
        deployed = 'totalCount' in (await probe.json());
      } catch {
        deployed = false;
      }
    }
    test.skip(!deployed, 'React location screens not present in deployed app image');
  });

  test('location list shows seeded depots and filters by search term', async ({ page }) => {
    await page.goto(url('/location/list'));
    await expect(page.locator('.rt-table')).toBeVisible();
    await expect(
      page.locator(`.rt-tbody a:has-text("${LOCATIONS.mainWarehouse.name}")`).first(),
    ).toBeVisible();
    await captureStep(page, 'location-screens', 'list');

    // Row data matches the API for the same (default DEPOT) filter.
    const apiRes = await page.request.get(
      url('/api/locations/search?q=Main Warehouse'),
    );
    expect(apiRes.status()).toBe(200);
    const body = await apiRes.json();
    expect(body.data.some((l: { name: string }) => l.name === LOCATIONS.mainWarehouse.name)).toBe(true);
  });

  test('location edit loads the seeded depot with its details', async ({ page }) => {
    await page.goto(url(`/location/edit/${LOCATIONS.mainWarehouse.id}`));
    await expect(page.locator(`input[value="${LOCATIONS.mainWarehouse.name}"]`)).toBeVisible();
    await captureStep(page, 'location-screens', 'edit');
  });

  test('bin locations screen matches the API row count', async ({ page }) => {
    await page.goto(url(`/location/showBinLocations/${LOCATIONS.mainWarehouse.id}`));
    await expect(page.locator('.rt-table')).toBeVisible();
    await captureStep(page, 'location-screens', 'bin-locations');

    const apiRes = await page.request.get(
      url(`/api/locations/${LOCATIONS.mainWarehouse.id}/binLocations`),
    );
    const { data } = await apiRes.json();
    expect(data.length).toBeGreaterThan(0);
    await expect(page.locator('span', { hasText: /^Bin Locations/ }).first())
      .toContainText(`(${data.length})`);
  });

  test('zone locations screen loads', async ({ page }) => {
    await page.goto(url(`/location/showZoneLocations/${LOCATIONS.mainWarehouse.id}`));
    await expect(page.locator('.rt-table')).toBeVisible();
    await captureStep(page, 'location-screens', 'zone-locations');

    const apiRes = await page.request.get(
      url(`/api/locations/${LOCATIONS.mainWarehouse.id}/zoneLocations`),
    );
    const { data } = await apiRes.json();
    await expect(page.locator('span', { hasText: /^Zone Locations/ }).first())
      .toContainText(`(${data.length})`);
  });

  test('bin contents screen loads for a seeded bin', async ({ page }) => {
    const binsRes = await page.request.get(
      url(`/api/locations/${LOCATIONS.mainWarehouse.id}/binLocations`),
    );
    const bins = (await binsRes.json()).data;
    expect(bins.length).toBeGreaterThan(0);
    const bin = bins[0];

    await page.goto(url(`/location/showContents/${bin.id}`));
    await expect(page.locator('.rt-table')).toBeVisible();
    await expect(page.locator('span', { hasText: /^Contents/ }).first())
      .toContainText(bin.name);
    await captureStep(page, 'location-screens', 'contents');
  });

  test('upload logo screen loads with no current logo', async ({ page }) => {
    await page.goto(url(`/location/uploadLogo/${LOCATIONS.mainWarehouse.id}`));
    await expect(page.locator('text=Current logo')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await captureStep(page, 'location-screens', 'upload-logo');
  });
});
