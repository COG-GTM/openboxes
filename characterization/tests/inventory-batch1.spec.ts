import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { PRODUCTS, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2, Inventory & Stock - Batch 1: the consumption/list,
 * consumption/pivot, consumption/show, inventory/browse,
 * inventory/createTransaction and inventory/editBinLocation screens are now
 * React routes inside the SPA (served by /common/react under their legacy
 * URLs). These tests exercise the migrated screens against the seeded demo
 * data.
 */
test.describe('inventory & stock batch 1 (React screens)', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    // The pinned released image (characterization.yml) predates these
    // screens; only the source-built app (characterization-java21.yml)
    // serves them. Skip when the new API surface is absent.
    const probe = await page.request.get(url('/api/consumption/aggregate'));
    test.skip(probe.status() === 404, 'app image predates the Batch 1 React screens');
  });

  test('inventory browser lists seeded products with quantity on hand', async ({ page }) => {
    await page.goto(url('/inventory/browse'));
    await expect(page.getByTestId('inventory-browse-table')).toBeVisible();
    // With no filters the legacy screen defaults to the ROOT category, which
    // has no direct products in the seeded dataset, so the list is empty.
    await expect(page.getByTestId('inventory-browse-total')).toContainText(': 0');
    await captureStep(page, 'inventory-batch1', 'browse');

    // Selecting a seeded category and searching narrows the results to the
    // seeded product.
    await page.selectOption('#inventory-browse-category', { label: 'ARVS' });
    await page.fill('#inventory-browse-search', PRODUCTS.lamivudine.name);
    await page.click('button[type="submit"]');
    await expect(page.getByTestId('inventory-browse-total')).not.toContainText(': 0');
    const rows = page.getByTestId('inventory-browse-table').locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first()).toContainText(PRODUCTS.lamivudine.name);
    await captureStep(page, 'inventory-batch1', 'browse-search');
  });

  test('consumption list renders the aggregate pivot table', async ({ page }) => {
    await page.goto(url('/consumption/list'));
    await expect(page.getByTestId('consumption-list-table')).toBeVisible();
    await captureStep(page, 'inventory-batch1', 'consumption-list');
  });

  test('consumption pivot renders with configurable dimensions', async ({ page }) => {
    await page.goto(url('/consumption/pivot'));
    await expect(page.getByTestId('consumption-pivot-table')).toBeVisible();
    await page.selectOption('#pivot-row-dimension', 'categoryName');
    await expect(page.getByTestId('consumption-pivot-table')).toBeVisible();
    await captureStep(page, 'inventory-batch1', 'consumption-pivot');
  });

  test('consumption report renders the per-product summary table', async ({ page }) => {
    await page.goto(url('/consumption/show'));
    await expect(page.getByTestId('consumption-report-table')).toBeVisible();
    await captureStep(page, 'inventory-batch1', 'consumption-show');
  });

  test('record transaction screen lists candidate rows for a product', async ({ page }) => {
    // Resolve the seeded product id through the API (codes are random).
    const searchRes = await page.request.get(
      url(`/api/products/search?name=${encodeURIComponent(PRODUCTS.lamivudine.name)}`),
    );
    expect(searchRes.status()).toBe(200);
    const products = (await searchRes.json()).data;
    const product = products.find(
      (p: { name: string }) => p.name === PRODUCTS.lamivudine.name,
    );
    expect(product).toBeTruthy();

    // Transaction type 3 = Adjustment credit (install migration primary key).
    await page.goto(url(`/inventory/createTransaction?transactionType.id=3&product.id=${product.id}`));
    await expect(page.getByTestId('record-transaction-table')).toBeVisible();
    const rows = page.getByTestId('record-transaction-table').locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first()).toContainText(PRODUCTS.lamivudine.name);
    await captureStep(page, 'inventory-batch1', 'create-transaction');
  });

  test('edit bin location screen shows the adjust stock form', async ({ page }) => {
    const searchRes = await page.request.get(
      url(`/api/products/search?name=${encodeURIComponent(PRODUCTS.lamivudine.name)}`),
    );
    const products = (await searchRes.json()).data;
    const product = products.find(
      (p: { name: string }) => p.name === PRODUCTS.lamivudine.name,
    );
    expect(product).toBeTruthy();

    // Resolve a real bin/lot pairing the same way the manage screen does.
    const candidatesRes = await page.request.get(
      url(`/api/inventories/transactionCandidates?product.id=${product.id}`),
    );
    expect(candidatesRes.status()).toBe(200);
    const entry = (await candidatesRes.json()).data
      .find((e: { inventoryItem: unknown }) => e.inventoryItem);
    expect(entry).toBeTruthy();

    const query = new URLSearchParams({
      productCode: product.productCode,
      binLocation: entry.binLocation?.name ?? '',
      lotNumber: entry.inventoryItem?.lotNumber ?? '',
    });
    await page.goto(url(`/inventory/editBinLocation?${query.toString()}`));
    await expect(page.getByTestId('adjust-stock-details')).toBeVisible();
    await expect(page.getByTestId('adjust-stock-details')).toContainText(product.productCode);
    await expect(page.locator('#adjust-stock-new-quantity')).toBeVisible();
    await captureStep(page, 'inventory-batch1', 'edit-bin-location');
  });
});
