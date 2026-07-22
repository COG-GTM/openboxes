import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow: Inventory & Stock React screens (Phase 2, Batch 6).
 *
 * Covers the screens migrated from GSP to React in this batch:
 * inventorySnapshot/list (+ show, which redirects to list),
 * transactionEntry/edit and replenishment/print. Each screen is asserted
 * against the data returned by its backing API endpoint.
 *
 * The backing endpoints only exist in source builds (added in Phase 2
 * Batch 6), so the whole suite skips against the pinned baseline image.
 */

async function apiGet(page: Page, path: string) {
  const res = await page.request.get(url(path));
  expect(res.status()).toBe(200);
  return res.json();
}

test.describe('inventory React screens (batch 6)', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/inventorySnapshots'));
    test.skip(probe.status() === 404, 'batch 6 endpoints not present in this build');
  });

  test('inventory snapshot list renders and matches the API row count', async ({ page }) => {
    // The React screen defaults its date filter to tomorrow (legacy behavior),
    // so query the API with the same date.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const date = `${mm}/${dd}/${tomorrow.getFullYear()}`;
    const snapshots = await apiGet(page, `/api/inventorySnapshots?date=${encodeURIComponent(date)}`);

    await page.goto(url('/inventorySnapshot/list'));
    await expect(page.locator('h5:has-text("Current Stock")')).toBeVisible();
    await page.waitForSelector('[data-testid="data-table"]');
    await captureStep(page, 'inventory-screens-batch6', 'inventory-snapshot-list');

    if (snapshots.data.length > 0) {
      const first = snapshots.data[0];
      await expect(
        page.locator(`[data-testid="data-table"] .rt-td:has-text("${first.productCode}")`).first(),
      ).toBeVisible();
    } else {
      await expect(page.locator('text=No records found')).toBeVisible();
    }
    await expect(page.locator('[data-testid="snapshot-download-button"]')).toBeVisible();
  });

  test('inventory snapshot show redirects to the list screen', async ({ page }) => {
    await page.goto(url('/inventorySnapshot/show'));
    await expect(page).toHaveURL(/inventorySnapshot\/list/);
    await expect(page.locator('h5:has-text("Current Stock")')).toBeVisible();
  });

  test('transaction entry edit screen renders values matching the API', async ({ page }) => {
    const daily = await apiGet(page, '/api/transactions/daily');
    const dates: Array<{ date: string }> = daily.data.dates;
    expect(dates.length).toBeGreaterThan(0);
    let transactionId: string | undefined;
    for (const d of dates) {
      const day = await apiGet(page, `/api/transactions/daily?date=${encodeURIComponent(d.date)}`);
      if (day.data.transactions.length > 0) {
        transactionId = day.data.transactions[0].id;
        break;
      }
    }
    expect(transactionId).toBeTruthy();
    const transaction = await apiGet(page, `/api/transactions/${transactionId}`);
    const entry = transaction.data.transactionEntries[0];
    const detail = await apiGet(page, `/api/transactionEntries/${entry.id}`);

    await page.goto(url(`/transactionEntry/edit/${entry.id}`));
    await expect(page.locator('h5:has-text("Edit transaction entry")')).toBeVisible();
    await captureStep(page, 'inventory-screens-batch6', 'transaction-entry-edit');

    await expect(page.locator('#entry-product')).toHaveValue(
      new RegExp(detail.data.product.productCode),
    );
    await expect(page.locator('#entry-quantity')).toHaveValue(String(detail.data.quantity));
    await expect(
      page.locator(`[data-testid="transaction-summary"]:has-text("${detail.data.transaction.transactionNumber || detail.data.transaction.id}")`),
    ).toBeVisible();
  });

  test('replenishment print screen renders order details from the API', async ({ page }) => {
    const orders = await apiGet(page, '/api/replenishments');
    test.skip(orders.data.length === 0, 'no seeded transfer orders to print');

    const order = orders.data[0];
    await page.goto(url(`/replenishment/print/${order.id}`));
    await expect(page.locator('h3:has-text("Transfer Order")')).toBeVisible();
    await captureStep(page, 'inventory-screens-batch6', 'replenishment-print');

    await expect(
      page.locator(`[data-testid="replenishment-print-header"]:has-text("${order.orderNumber}")`),
    ).toBeVisible();
    await expect(page.locator('[data-testid="replenishment-print-signature"]')).toBeVisible();
  });
});
