import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow: Inventory & Stock React screens (Phase 2, Batch 3).
 *
 * Covers the six inventory screens migrated from GSP to React:
 * listReorderStock, listTransactions, manage, showProducts,
 * showTransaction and upload. Each screen is asserted against the data
 * returned by its backing API endpoint.
 *
 * The backing endpoints only exist in source builds (added in Phase 2
 * Batch 3), so the whole suite skips against the pinned baseline image.
 */

async function apiGet(page: Page, path: string) {
  const res = await page.request.get(url(path));
  expect(res.status()).toBe(200);
  return res.json();
}

async function facilityId(page: Page): Promise<string> {
  const session = await apiGet(page, '/api/getAppContext');
  return session.data.location.id;
}

test.describe('inventory React screens (batch 3)', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/transactions'));
    test.skip(probe.status() === 404, 'batch 3 endpoints not present in this build');
  });

  test('reorder stock list loads and matches the API row count', async ({ page }) => {
    const facility = await facilityId(page);
    const reorder = await apiGet(
      page, `/api/facilities/${facility}/inventories/summary?status=reorderStock`,
    );

    await page.goto(url('/inventory/listReorderStock'));
    await expect(page.locator('h5:has-text("below reorder level")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"]');
    await captureStep(page, 'inventory-screens-batch3', 'reorder-stock');

    if (reorder.data.length > 0) {
      const firstProduct = reorder.data[0].product.name;
      await expect(
        page.locator(`[data-testid="data-table"] a:has-text("${firstProduct}")`).first(),
      ).toBeVisible();
    }
  });

  test('transactions list shows rows matching the API', async ({ page }) => {
    const transactions = await apiGet(page, '/api/transactions');
    expect(transactions.data.length).toBeGreaterThan(0);

    await page.goto(url('/inventory/listTransactions'));
    await expect(page.locator('h5:has-text("Transactions")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    await captureStep(page, 'inventory-screens-batch3', 'transactions-list');

    await expect(
      page.locator(`text=Showing ${transactions.totalCount} transactions`),
    ).toBeVisible();
  });

  test('show transaction screen renders details and entries', async ({ page }) => {
    const transactions = await apiGet(page, '/api/transactions');
    expect(transactions.data.length).toBeGreaterThan(0);
    const transaction = transactions.data[0];

    await page.goto(url(`/inventory/showTransaction/${transaction.id}`));
    await expect(page.locator('h5:has-text("View transaction")')).toBeVisible();
    await expect(page.locator('h6:has-text("Transaction details")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"]');
    await captureStep(page, 'inventory-screens-batch3', 'show-transaction');

    if (transaction.transactionType?.name) {
      await expect(
        page.locator(`td:has-text("${transaction.transactionType.name}")`).first(),
      ).toBeVisible();
    }
  });

  test('manage inventory screen lists bin locations matching the API', async ({ page }) => {
    const facility = await facilityId(page);
    const binLocations = await apiGet(page, `/api/facilities/${facility}/inventories/binLocations`);
    expect(binLocations.data.length).toBeGreaterThan(0);

    await page.goto(url('/inventory/manage'));
    await expect(page.locator('h5:has-text("Manage inventory")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    await captureStep(page, 'inventory-screens-batch3', 'manage-inventory');

    const firstProduct = binLocations.data[0].product.name;
    await expect(
      page.locator(`[data-testid="data-table"] a:has-text("${firstProduct}")`).first(),
    ).toBeVisible();
  });

  test('show products screen matches the API', async ({ page }) => {
    const products = await apiGet(page, '/api/inventories/productsWithoutDefaultInventoryItem');

    await page.goto(url('/inventory/showProducts'));
    await expect(
      page.locator('h5:has-text("Products without a default inventory item")'),
    ).toBeVisible();
    await captureStep(page, 'inventory-screens-batch3', 'show-products');

    if (products.data.length > 0) {
      await expect(
        page.locator(`a:has-text("${products.data[0].name}")`).first(),
      ).toBeVisible();
    } else {
      await expect(page.locator('text=No products found')).toBeVisible();
    }
  });

  test('upload inventory screen renders the upload form', async ({ page }) => {
    await page.goto(url('/inventory/upload'));
    await expect(page.locator('h5:has-text("Upload inventory")')).toBeVisible();
    await expect(page.locator('#inventory-upload-file')).toBeVisible();
    await expect(page.locator('button:has-text("Upload")')).toBeDisabled();
    await captureStep(page, 'inventory-screens-batch3', 'upload-inventory');
  });
});
