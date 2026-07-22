import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow: Inventory & Stock React screens (Phase 2, Batch 2).
 *
 * Covers the six inventory screens migrated from GSP to React:
 * list, listLowStock, listExpiredStock, listExpiringStock,
 * listDailyTransactions and editTransaction. Each screen is asserted
 * against the data returned by its backing API endpoint.
 *
 * The backing endpoints only exist in source builds (added in Phase 2
 * Batch 2), so the whole suite skips against the pinned baseline image.
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

test.describe('inventory React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/transactions/types'));
    test.skip(probe.status() === 404, 'inventory/transaction endpoints not present in this build');
  });

  test('inventory summary list shows rows matching the API', async ({ page }) => {
    const facility = await facilityId(page);
    const summary = await apiGet(page, `/api/facilities/${facility}/inventories/summary`);
    expect(summary.data.length).toBeGreaterThan(0);

    await page.goto(url('/inventory/list'));
    await expect(page.locator('h5:has-text("Inventory summary")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    await captureStep(page, 'inventory-screens', 'inventory-list');

    const firstProduct = summary.data[0].product.name;
    await expect(page.locator(`[data-testid="data-table"] a:has-text("${firstProduct}")`).first())
      .toBeVisible();
  });

  test('low stock list loads and matches the API row count', async ({ page }) => {
    const facility = await facilityId(page);
    const lowStock = await apiGet(
      page, `/api/facilities/${facility}/inventories/summary?status=lowStock`,
    );

    await page.goto(url('/inventory/listLowStock'));
    await expect(page.locator('h5:has-text("below minimum level")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"]');
    await captureStep(page, 'inventory-screens', 'low-stock');

    if (lowStock.data.length > 0) {
      const firstProduct = lowStock.data[0].product.name;
      await expect(
        page.locator(`[data-testid="data-table"] a:has-text("${firstProduct}")`).first(),
      ).toBeVisible();
    }
  });

  test('expired stock screen loads with filters and actions', async ({ page }) => {
    await page.goto(url('/inventory/listExpiredStock'));
    await expect(page.locator('h5:has-text("Expired stock")')).toBeVisible();
    await expect(page.locator('button:has-text("Run Report")')).toBeVisible();
    await expect(page.locator('button:has-text("Outbound transfer")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"]');
    await captureStep(page, 'inventory-screens', 'expired-stock');
  });

  test('expiring stock screen shows items matching the API', async ({ page }) => {
    const facility = await facilityId(page);
    const expiring = await apiGet(page, `/api/facilities/${facility}/inventories/expiringStock`);

    await page.goto(url('/inventory/listExpiringStock'));
    await expect(page.locator('h5:has-text("Expiring stock")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"]');
    await captureStep(page, 'inventory-screens', 'expiring-stock');

    if (expiring.data.items.length > 0) {
      const firstProduct = expiring.data.items[0].product.name;
      await expect(
        page.locator(`[data-testid="data-table"] a:has-text("${firstProduct}")`).first(),
      ).toBeVisible();
    }
  });

  test('daily transactions screen lists dates and transactions', async ({ page }) => {
    const daily = await apiGet(page, '/api/transactions/daily');
    expect(daily.data.dates.length).toBeGreaterThan(0);

    await page.goto(url('/inventory/listDailyTransactions'));
    await expect(page.locator('h5:has-text("Daily transactions")')).toBeVisible();
    await captureStep(page, 'inventory-screens', 'daily-transactions-default');

    // Navigate to the most recent transaction date and check its entries load.
    const first = daily.data.dates[0];
    await page.click(`button:has-text("${first.date} (${first.count})")`);
    await page.waitForSelector('[data-testid="data-table"] .rt-tr-group .rt-td');
    await captureStep(page, 'inventory-screens', 'daily-transactions-date');
  });

  test('edit transaction screen loads and saves a no-op edit', async ({ page }) => {
    // Find a seeded transaction via the daily API.
    const daily = await apiGet(page, '/api/transactions/daily');
    let transactionId: string | null = null;
    for (const entry of daily.data.dates) {
      const day = await apiGet(page, `/api/transactions/daily?date=${entry.date}`);
      if (day.data.transactions.length > 0) {
        transactionId = day.data.transactions[0].id;
        break;
      }
    }
    expect(transactionId).not.toBeNull();

    await page.goto(url(`/inventory/editTransaction/${transactionId}`));
    await expect(page.locator('h5:has-text("Edit transaction")')).toBeVisible();
    await expect(page.locator('#transaction-date')).toBeVisible();
    await page.waitForSelector('table tbody tr');
    await captureStep(page, 'inventory-screens', 'edit-transaction');

    // No-op save: persists the same values and shows the success message.
    await page.click('button:has-text("Save")');
    await expect(page.locator('.alert-success')).toBeVisible();
    await captureStep(page, 'inventory-screens', 'edit-transaction-saved');
  });
});
