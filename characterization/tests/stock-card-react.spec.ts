import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow: Inventory & Stock React screens (Phase 2, Batch 4).
 *
 * Covers the six screens migrated from GSP to React:
 * inventoryBrowser/list, inventoryItem/showStockCard,
 * inventoryItem/showLotNumbers, inventoryItem/showRecordInventory,
 * inventoryItem/showGraph and inventoryItem/editInventoryLevel.
 * Each screen is asserted against the data returned by its backing API.
 *
 * The backing endpoints only exist in source builds (added in Phase 2
 * Batch 4), so the whole suite skips against the pinned baseline image.
 */

const PRODUCT_CODE = 'BF640';

async function apiGet(page: Page, path: string) {
  const res = await page.request.get(url(path));
  expect(res.status()).toBe(200);
  return res.json();
}

async function facilityId(page: Page): Promise<string> {
  const session = await apiGet(page, '/api/getAppContext');
  return session.data.location.id;
}

async function productId(page: Page): Promise<string> {
  const products = await apiGet(page, `/api/products?q=${PRODUCT_CODE}`);
  const product = products.data.find((p: any) => p.productCode === PRODUCT_CODE);
  expect(product).toBeTruthy();
  return product.id;
}

test.describe('stock card React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const facility = await facilityId(page);
    const probe = await page.request.get(
      url(`/api/facilities/${facility}/inventories/productGroupSummary`),
    );
    test.skip(probe.status() === 404, 'Batch 4 endpoints not present in this build');
  });

  test('inventory browser lists product groups matching the API', async ({ page }) => {
    const facility = await facilityId(page);
    const statuses = ['IN_STOCK', 'STOCK_OUT', 'LOW_STOCK', 'REORDER', 'IDEAL_STOCK', 'OVERSTOCK', 'INVALID']
      .map((s) => `status=${s}`).join('&');
    const summary = await apiGet(
      page, `/api/facilities/${facility}/inventories/productGroupSummary?${statuses}`,
    );
    expect(summary.data.rows.length).toBeGreaterThan(0);

    await page.goto(url('/inventoryBrowser/list'));
    await expect(page.locator('h5:has-text("Inventory Snapshots")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    await captureStep(page, 'stock-card-react', 'inventory-browser');

    await expect(page.locator(`text=${summary.data.totalValueFormatted}`).first()).toBeVisible();
  });

  test('stock card shows summary, current stock and tabs', async ({ page }) => {
    const product = await productId(page);
    const summary = await apiGet(page, `/api/stockCard/${product}/summary`);

    await page.goto(url(`/inventoryItem/showStockCard/${product}`));
    await expect(page.locator(`text=${summary.data.product.productCode}`).first()).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    await captureStep(page, 'stock-card-react', 'stock-card');

    await expect(
      page.locator(`.stock-card-header >> text=${summary.data.totalQuantityOnHand}`).first(),
    ).toBeVisible();

    // Stock history tab loads rows from the API
    const history = await apiGet(page, `/api/stockCard/${product}/stockHistory`);
    await page.click('text=Stock History');
    await page.waitForSelector('[data-testid="data-table"]');
    if (history.data.rows.length > 0) {
      await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    }
    await captureStep(page, 'stock-card-react', 'stock-history');
  });

  test('stock card supports legacy query-string product links', async ({ page }) => {
    const product = await productId(page);
    await page.goto(url(`/inventoryItem/showStockCard?product.id=${product}`));
    await expect(page.locator(`text=${PRODUCT_CODE}`).first()).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"]');
  });

  test('lot numbers screen lists the product lots', async ({ page }) => {
    const product = await productId(page);
    const items = await apiGet(page, `/api/products/${product}/allInventoryItems`);
    expect(items.data.length).toBeGreaterThan(0);

    await page.goto(url(`/inventoryItem/showLotNumbers/${product}`));
    await expect(page.locator('h5:has-text("Lot Numbers")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    await captureStep(page, 'stock-card-react', 'lot-numbers');

    const withLot = items.data.find((it: any) => it.lotNumber);
    if (withLot) {
      await expect(
        page.locator(`[data-testid="data-table"] >> text=${withLot.lotNumber}`).first(),
      ).toBeVisible();
    }
  });

  test('record stock screen prefills the current rows', async ({ page }) => {
    const facility = await facilityId(page);
    const product = await productId(page);
    const recordStock = await apiGet(
      page, `/api/facilities/${facility}/inventory/record-stock?product.id=${product}`,
    );
    expect(recordStock.data.recordInventoryRows.length).toBeGreaterThan(0);

    await page.goto(url(`/inventoryItem/showRecordInventory/${product}`));
    await expect(page.locator('h5:has-text("Record Stock")')).toBeVisible();
    await expect(page.locator('button:has-text("Record Stock")')).toBeVisible();
    await page.waitForSelector('table tbody tr');
    await captureStep(page, 'stock-card-react', 'record-stock');

    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBe(recordStock.data.recordInventoryRows.length);
  });

  test('graph screen preserves the legacy placeholder', async ({ page }) => {
    const product = await productId(page);
    await page.goto(url(`/inventoryItem/showGraph/${product}`));
    await expect(page.locator('h5:has-text("Consumption")')).toBeVisible();
    await expect(page.locator('text=has not been implemented yet')).toBeVisible();
    await captureStep(page, 'stock-card-react', 'graph');
  });

  test('edit inventory level shows the current status', async ({ page }) => {
    const facility = await facilityId(page);
    const product = await productId(page);
    const level = await apiGet(
      page, `/api/facilities/${facility}/products/${product}/inventoryLevel`,
    );

    await page.goto(url(`/inventoryItem/editInventoryLevel/${product}`));
    await expect(page.locator('h5:has-text("Edit Inventory Level")')).toBeVisible();
    await captureStep(page, 'stock-card-react', 'edit-inventory-level');

    const select = page.locator('#inventory-level-status');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue(level.data.status ?? '');
  });
});
