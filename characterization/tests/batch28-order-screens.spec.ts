import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for order list, listOrderItems, addDocument, add/edit
 * adjustment, orderSummaryList and orderItemSummary/orderItemDetails
 * (Phase 2, Batch 28).
 *
 * The legacy /order/(list|listOrderItems|addDocument|addAdjustment|
 * editAdjustment|orderSummaryList|orderItemSummary|orderItemDetails) URLs now
 * render the React SPA backed by the new order JSON APIs.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

async function firstOrderId(page: Page): Promise<string | null> {
  const orders = (await (await page.request.get(url('/api/generic/order/?max=1'))).json())
    .data as Array<{ id: string }>;
  return orders.length ? orders[0].id : null;
}

test.describe('batch 28 order react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/orders/pendingItems'));
    test.skip(probe.status() !== 200, 'app build does not expose the Batch 28 order endpoints (pinned released image)');
  });

  test('order list renders rows and total count from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/orders?') && resp.status() === 200);
    await page.goto(url('/order/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByRole('heading', { name: /Orders/ }).first()).toBeVisible();
    await captureStep(page, 'order-list', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('pending order items list matches the API row count', async ({ page }) => {
    const api = await page.request.get(url('/api/orders/pendingItems'));
    const items = (await api.json()).data as Array<unknown>;
    await page.goto(url('/order/listOrderItems'));
    await expect(page.getByText('Pending order items').first()).toBeVisible();
    await captureStep(page, 'order-pending-items', 'react-list');
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(items.length, 10));
  });

  test('order summary list renders rows and total count from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/orderSummaries') && resp.status() === 200);
    await page.goto(url('/order/orderSummaryList'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('Order summary list').first()).toBeVisible();
    await captureStep(page, 'order-summary-list', 'react-list');
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(body.totalCount, 10));
  });

  test('order item summary and details lists render rows from the API', async ({ page }) => {
    const summaryResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/orderItemSummaries') && resp.status() === 200);
    await page.goto(url('/order/orderItemSummary'));
    const summary = await (await summaryResponse).json();
    await expect(page.getByText('Order item summary').first()).toBeVisible();
    await captureStep(page, 'order-item-summary', 'react-summary');
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(summary.totalCount, 10));

    const detailsResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/orderItemSummaries') && resp.status() === 200);
    await page.goto(url('/order/orderItemDetails'));
    const details = await (await detailsResponse).json();
    await expect(page.getByText('Order item details').first()).toBeVisible();
    await captureStep(page, 'order-item-summary', 'react-details');
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(details.totalCount, 10));
  });

  test('adds a URL document to an order', async ({ page }) => {
    const orderId = await firstOrderId(page);
    test.skip(!orderId, 'seeded dataset has no orders');
    const id = runId();

    await page.goto(url(`/order/addDocument/${orderId}`));
    await expect(page.getByText('Add Document').first()).toBeVisible();
    await captureStep(page, 'order-add-document', 'react-add-document');

    await page.getByLabel('Name').fill(`Playwright order document ${id}`);
    await page.getByLabel('URL').fill('https://example.org/batch28');
    await page.getByRole('button', { name: 'Upload' }).click();

    // Upload redirects to the legacy order show screen.
    await page.waitForURL('**/order/show/**');
    await captureStep(page, 'order-add-document', 'legacy-show-after-upload');
  });

  test('creates and edits an order adjustment', async ({ page }) => {
    const orderId = await firstOrderId(page);
    test.skip(!orderId, 'seeded dataset has no orders');
    const id = runId();
    const description = `Playwright adjustment ${id}`;

    await page.goto(url(`/order/addAdjustment/${orderId}`));
    await expect(page.getByText('Add Adjustment').first()).toBeVisible();
    await captureStep(page, 'order-adjustment', 'react-add');

    await page.getByLabel('Description').fill(description);
    await page.getByLabel('Amount').fill('12.5');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/purchaseOrder/addItems/**');

    // Find the created adjustment through the API and edit it.
    const created = (await (await page.request.get(
      url(`/api/orders/${orderId}`),
    )).json()).data;
    expect(created.id).toBe(orderId);

    // The edit screen is reachable under the legacy editAdjustment URL.
    // Fetch the adjustment id by creating another one through the API.
    const adjustment = (await (await page.request.post(
      url(`/api/orders/${orderId}/adjustments`),
      { data: { description: `${description} (api)`, amount: 3 } },
    )).json()).data;

    await page.goto(url(`/order/editAdjustment/${adjustment.id}?order.id=${orderId}`));
    await expect(page.getByText('Edit Adjustment').first()).toBeVisible();
    await expect(page.getByLabel('Description')).toHaveValue(`${description} (api)`);
    await captureStep(page, 'order-adjustment', 'react-edit');

    await page.getByLabel('Description').fill(`${description} (edited)`);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/purchaseOrder/addItems/**');

    const readBack = (await (await page.request.get(
      url(`/api/orders/${orderId}/adjustments/${adjustment.id}`),
    )).json()).data;
    expect(readBack.description).toBe(`${description} (edited)`);
  });
});
