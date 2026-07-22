import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for order show, order print, orderAdjustmentType
 * list/create/edit and paymentTerm create (Phase 2, Batch 29).
 *
 * The legacy /order/(show|print), /orderAdjustmentType/(list|create|edit) and
 * /paymentTerm/create URLs now render the React SPA backed by the new
 * order/orderAdjustmentType/paymentTerm JSON APIs.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

async function firstOrderId(page: Page): Promise<string | null> {
  const orders = (await (await page.request.get(url('/api/generic/order/?max=1'))).json())
    .data as Array<{ id: string }>;
  return orders.length ? orders[0].id : null;
}

test.describe('batch 29 order & finance react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/orderAdjustmentTypes'));
    test.skip(probe.status() !== 200, 'app build does not expose the Batch 29 endpoints (pinned released image)');
  });

  test('order show renders header and item tabs from the API', async ({ page }) => {
    const orderId = await firstOrderId(page);
    test.skip(!orderId, 'seeded dataset has no orders');

    const details = (await (await page.request.get(
      url(`/api/orders/${orderId}/details`),
    )).json()).data;
    const items = (await (await page.request.get(
      url(`/api/orders/${orderId}/items`),
    )).json()).data;

    await page.goto(url(`/order/show/${orderId}`));
    await expect(page.getByTestId('order-show-header')).toBeVisible();
    await expect(page.getByTestId('order-show-header')).toContainText(details.orderNumber);
    await captureStep(page, 'order-show', 'react-summary');

    // Legacy summary shows canceled items on purchase orders, only active ones otherwise
    const orderItems = items.orderItems as Array<{ canceled: boolean }>;
    const summaryItems = items.isPurchaseOrder
      ? orderItems
      : orderItems.filter((item) => !item.canceled);
    const summaryRows = page.locator('[data-testid="order-show-summary-table"] tbody tr');
    if (summaryItems.length) {
      await expect(summaryRows).toHaveCount(summaryItems.length);
    }

    await page.getByTestId('order-show-tab-adjustments').click();
    await expect(page.getByTestId('order-show-adjustments-table')).toBeVisible();
    await captureStep(page, 'order-show', 'react-adjustments');

    await page.getByTestId('order-show-tab-shipments').click();
    await expect(page.getByTestId('order-show-shipments-table')).toBeVisible();

    await page.getByTestId('order-show-tab-documents').click();
    await expect(page.getByTestId('order-show-documents-table')).toBeVisible();
  });

  test('order print renders the print view model from the API', async ({ page }) => {
    const orderId = await firstOrderId(page);
    test.skip(!orderId, 'seeded dataset has no orders');

    const printData = (await (await page.request.get(
      url(`/api/orders/${orderId}/print`),
    )).json()).data;

    await page.goto(url(`/order/print/${orderId}`));
    await expect(page.getByTestId('order-print-page')).toBeVisible();
    await expect(page.getByTestId('order-print-order-number')).toHaveText(printData.orderNumber);
    await captureStep(page, 'order-print', 'react-print');

    const rows = page.locator('[data-testid="order-print-items-table"] tbody tr');
    if ((printData.orderItems as Array<unknown>).length) {
      await expect(rows).toHaveCount((printData.orderItems as Array<unknown>).length);
    }
  });

  test('order adjustment type list matches the API row count', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/orderAdjustmentTypes?') && resp.status() === 200);
    await page.goto(url('/orderAdjustmentType/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Order Adjustment Types').first()).toBeVisible();
    await captureStep(page, 'order-adjustment-type-list', 'react-list');
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(body.totalCount, 10));
  });

  test('creates and edits an order adjustment type', async ({ page }) => {
    const id = runId();
    const name = `Playwright adjustment type ${id}`;

    await page.goto(url('/orderAdjustmentType/create'));
    await expect(page.getByText('Create Order Adjustment Type').first()).toBeVisible();
    await captureStep(page, 'order-adjustment-type', 'react-create');

    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Description').fill('Created by Playwright');
    // SelectField (v2) does not associate its label with the react-select
    // input, so locate the wrapper by its label text instead of getByLabel.
    const codeField = page
      .locator('.select-wrapper-container', { hasText: 'Code' })
      .first();
    await codeField.locator('input').first().click({ force: true });
    await page.getByText('MISCELLANEOUS_CHARGE', { exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/orderAdjustmentType/list**');

    const listed = (await (await page.request.get(
      url(`/api/orderAdjustmentTypes?q=${encodeURIComponent(name)}`),
    )).json()).data as Array<{ id: string; name: string }>;
    expect(listed.length).toBe(1);
    const createdId = listed[0].id;

    await page.goto(url(`/orderAdjustmentType/edit/${createdId}`));
    await expect(page.getByText('Edit Order Adjustment Type').first()).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue(name);
    await captureStep(page, 'order-adjustment-type', 'react-edit');

    await page.getByLabel('Name').fill(`${name} (edited)`);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/orderAdjustmentType/list**');

    const readBack = (await (await page.request.get(
      url(`/api/orderAdjustmentTypes/${createdId}`),
    )).json()).data;
    expect(readBack.name).toBe(`${name} (edited)`);
  });

  test('creates a payment term', async ({ page }) => {
    const id = runId();
    const name = `Playwright payment term ${id}`;

    await page.goto(url('/paymentTerm/create'));
    await expect(page.getByText('Create Payment Term').first()).toBeVisible();
    await captureStep(page, 'payment-term', 'react-create');

    await page.getByLabel('Code').fill(`PW-${id}`);
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Days To Payment').fill('45');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/paymentTerm/list**');

    const options = (await (await page.request.get(
      url('/api/paymentTermOptions'),
    )).json()).data as Array<{ label: string }>;
    expect(options.some((option) => option.label?.includes(name))).toBe(true);
  });
});
