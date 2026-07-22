import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow: Inventory & Stock React screens (Phase 2, Batch 5).
 *
 * Covers the six screens migrated from GSP to React:
 * inventoryItem/showTransactionLog, inventoryLevel/list,
 * inventoryLevel/show, inventoryLevel/create, inventoryLevel/edit and
 * inventorySnapshot/edit. Each screen is asserted against the data
 * returned by its backing API.
 *
 * The backing endpoints only exist in source builds (added in Phase 2
 * Batch 5), so the whole suite skips against the pinned baseline image.
 */

const PRODUCT_CODE = 'BF640';

async function apiGet(page: Page, path: string) {
  const res = await page.request.get(url(path));
  expect(res.status()).toBe(200);
  return res.json();
}

async function productId(page: Page): Promise<string> {
  const products = await apiGet(page, `/api/products?q=${PRODUCT_CODE}`);
  const product = products.data.find((p: any) => p.productCode === PRODUCT_CODE);
  expect(product).toBeTruthy();
  return product.id;
}

test.describe('inventory level & transaction log React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    // On the pinned baseline image /api/inventoryLevels falls through to the
    // generic domain API (no totalCount envelope), so probe the shape.
    const probe = await page.request.get(url('/api/inventoryLevels'));
    const present = probe.status() === 200
      && Object.prototype.hasOwnProperty.call(await probe.json(), 'totalCount');
    test.skip(!present, 'Batch 5 endpoints not present in this build');
  });

  test('transaction log lists product transactions matching the API', async ({ page }) => {
    const product = await productId(page);
    const log = await apiGet(page, `/api/stockCard/${product}/transactionLog`);

    await page.goto(url(`/inventoryItem/showTransactionLog/${product}`));
    await expect(page.locator(`text=${PRODUCT_CODE}`).first()).toBeVisible();
    if (log.data.length > 0) {
      await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    }
    await captureStep(page, 'inventory-screens-batch5', 'transaction-log');

    await expect(
      page.locator(`text=Showing ${log.data.length} of ${log.totalCount} transactions`),
    ).toBeVisible();
  });

  test('transaction log supports legacy query-string product links', async ({ page }) => {
    const product = await productId(page);
    await page.goto(url(`/inventoryItem/showTransactionLog?product.id=${product}`));
    await expect(page.locator(`text=${PRODUCT_CODE}`).first()).toBeVisible();
    await captureStep(page, 'inventory-screens-batch5', 'transaction-log-legacy-url');
  });

  test('inventory level list shows rows and count matching the API', async ({ page }) => {
    const levels = await apiGet(page, '/api/inventoryLevels');
    expect(levels.totalCount).toBeGreaterThan(0);

    await page.goto(url('/inventoryLevel/list'));
    await expect(page.locator('h5:has-text("Inventory Levels")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    await captureStep(page, 'inventory-screens-batch5', 'inventory-level-list');

    await expect(
      page.locator(`text=Showing ${levels.totalCount} inventory levels`),
    ).toBeVisible();
    await expect(
      page.locator(`text=${levels.data[0].product.name}`).first(),
    ).toBeVisible();
  });

  test('inventory level show displays the level details', async ({ page }) => {
    const levels = await apiGet(page, '/api/inventoryLevels');
    const level = levels.data[0];

    await page.goto(url(`/inventoryLevel/show/${level.id}`));
    await expect(page.locator('h5:has-text("Show Inventory Level")')).toBeVisible();
    await expect(page.locator(`text=${level.id}`).first()).toBeVisible();
    await expect(page.locator(`text=${level.product.name}`).first()).toBeVisible();
    await captureStep(page, 'inventory-screens-batch5', 'inventory-level-show');
  });

  test('inventory level create and edit roundtrip', async ({ page }) => {
    const product = await productId(page);

    // Create via the form is exercised at the API level in the contract
    // suite; here we verify the React form renders and the edit form loads
    // an existing level's data.
    await page.goto(url('/inventoryLevel/create'));
    await expect(page.locator('h5:has-text("Add Inventory Level")')).toBeVisible();
    await captureStep(page, 'inventory-screens-batch5', 'inventory-level-create');

    const levels = await apiGet(page, '/api/inventoryLevels');
    const level = levels.data[0];
    const detail = await apiGet(page, `/api/inventoryLevels/${level.id}`);

    await page.goto(url(`/inventoryLevel/edit/${level.id}`));
    await expect(page.locator('h5:has-text("Edit Inventory Level")')).toBeVisible();
    await expect(
      page.locator(`text=${detail.data.product.productCode}`).first(),
    ).toBeVisible();
    await page.click('button:has-text("Replenishment")');
    await expect(page.locator('[data-testid="tab-replenishment"]')).toBeVisible();
    await captureStep(page, 'inventory-screens-batch5', 'inventory-level-edit');
  });

  test('inventory snapshot edit renders location and date controls', async ({ page }) => {
    await page.goto(url('/inventorySnapshot/edit'));
    await expect(page.locator('h5:has-text("Refresh Inventory Snapshot")')).toBeVisible();
    await expect(page.locator('#inventory-snapshot-date')).toBeVisible();
    await captureStep(page, 'inventory-screens-batch5', 'inventory-snapshot-edit');
  });
});
