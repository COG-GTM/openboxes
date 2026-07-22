import { test, expect, Page } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for the outbound return delivery note print, goods receipt
 * note print and the receive order workflow (Phase 2, Batch 20).
 *
 * The legacy /deliveryNote/printOutboundReturn, /goodsReceiptNote/print and
 * /receiveOrderWorkflow/receiveOrder URLs now render the React SPA backed by
 * the new shipment print and receive order JSON APIs.
 */

async function firstShipmentId(page: Page): Promise<string | null> {
  const shipments = (await (await page.request.get(url('/api/generic/shipment/?max=1'))).json())
    .data as Array<{ id: string }>;
  return shipments.length ? shipments[0].id : null;
}

// Prefers an order with a receivable (not completely fulfilled) line so the
// receive test can exercise the full save path; falls back to the first order.
async function firstOrderId(page: Page): Promise<string | null> {
  const orders = (await (await page.request.get(url('/api/generic/order/?max=10'))).json())
    .data as Array<{ id: string }>;
  if (!orders.length) return null;
  for (const order of orders) {
    const probe = await page.request.get(url(`/api/orders/${order.id}/receiveOrder`));
    if (probe.status() !== 200) break;
    const data = (await probe.json()).data;
    if (data.orderItems.some((item: any) => !item.isCompletelyFulfilled)) {
      return order.id;
    }
  }
  return orders[0].id;
}

test.describe('batch 20 shipments & receiving react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
  });

  test('outbound return delivery note print renders the shipment from the API', async ({ page }) => {
    const shipmentId = await firstShipmentId(page);
    test.skip(!shipmentId, 'seeded dataset has no shipments');

    const probe = await page.request.get(url(`/api/shipments/${shipmentId}/outboundReturnPrint`));
    test.skip(probe.status() === 404, 'app build does not expose the Batch 20 endpoints (pinned released image)');
    expect(probe.status(), 'outboundReturnPrint endpoint should return 200 for a real shipment').toBe(200);
    const printData = (await probe.json()).data;

    await page.goto(url(`/deliveryNote/printOutboundReturn/${shipmentId}`));
    await expect(page.getByTestId('outbound-return-print-page')).toBeVisible();
    await expect(page.getByTestId('outbound-return-print-shipment-number'))
      .toContainText(printData.shipmentNumber);
    if (printData.origin?.name) {
      await expect(page.getByTestId('outbound-return-print-origin')).toHaveText(printData.origin.name);
    }
    if (printData.destination?.name) {
      await expect(page.getByTestId('outbound-return-print-destination')).toHaveText(printData.destination.name);
    }
    // One row per shipment item, plus one row per receipt item when the
    // received product/lot/expiry differs from the shipped item (the legacy
    // table's strikethrough behavior).
    const expectedRows = printData.shipmentItems.reduce((sum: number, item: any) => {
      const changed = item.receiptItems.some((ri: any) => ri.productId !== item.productId
        || (ri.lotNumber ?? '') !== (item.lotNumber ?? '')
        || (ri.expirationDate ?? null) !== (item.expirationDate ?? null));
      return sum + 1 + (changed ? item.receiptItems.length : 0);
    }, 0);
    await expect(page.locator('[data-testid="outbound-return-print-items-table"] tbody tr'))
      .toHaveCount(expectedRows);
    await captureStep(page, 'outbound-return-print', 'react');
  });

  test('goods receipt note print renders the shipment receipts from the API', async ({ page }) => {
    const shipmentId = await firstShipmentId(page);
    test.skip(!shipmentId, 'seeded dataset has no shipments');

    const probe = await page.request.get(url(`/api/shipments/${shipmentId}/goodsReceiptNotePrint`));
    test.skip(probe.status() === 404, 'app build does not expose the Batch 20 endpoints (pinned released image)');
    expect(probe.status(), 'goodsReceiptNotePrint endpoint should return 200 for a real shipment').toBe(200);
    const printData = (await probe.json()).data;

    await page.goto(url(`/goodsReceiptNote/print/${shipmentId}`));
    await expect(page.getByTestId('grn-print-page')).toBeVisible();
    await expect(page.getByTestId('grn-print-shipment-number'))
      .toContainText(printData.shipmentNumber);
    if (printData.status) {
      await expect(page.getByTestId('grn-print-status')).toHaveText(printData.status);
    }
    // One row per receipt item, plus a struck-through original row for each
    // shipment item that was split during receiving.
    const expectedRows = printData.shipmentItems.reduce(
      (sum: number, item: any) => sum + item.receiptItems.length + (item.hasSplit ? 1 : 0),
      0,
    );
    await expect(page.locator('[data-testid="grn-print-items-table"] tbody tr'))
      .toHaveCount(expectedRows);
    await captureStep(page, 'grn-print', 'react');
  });

  test('receive order workflow walks shipment details, items and confirmation', async ({ page }) => {
    const orderId = await firstOrderId(page);
    test.skip(!orderId, 'seeded dataset has no orders');

    const probe = await page.request.get(url(`/api/orders/${orderId}/receiveOrder`));
    test.skip(probe.status() === 404, 'app build does not expose the Batch 20 endpoints (pinned released image)');
    expect(probe.status(), 'receiveOrder endpoint should return 200 for a real order').toBe(200);
    const orderData = (await probe.json()).data;

    await page.goto(url(`/receiveOrderWorkflow/receiveOrder/${orderId}`));
    await expect(page.getByTestId('receive-order-page')).toBeVisible();
    await expect(page.getByTestId('receive-order-summary-order-number'))
      .toContainText(orderData.orderNumber);
    await expect(page.getByTestId('receive-order-shipment-details')).toBeVisible();
    await captureStep(page, 'receive-order', 'react-shipment-details');

    // Next without required fields surfaces the legacy validation errors
    await page.getByTestId('receive-order-next-button').click();
    await expect(page.getByTestId('receive-order-errors')).toBeVisible();
    await captureStep(page, 'receive-order', 'react-validation-errors');

    // Fill in the shipment details
    await page.getByTestId('receive-order-shipment-type').locator('input').first().focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // The v2 DateField renders a div-based custom input, so open the
    // datepicker and pick today from the calendar instead of filling text
    const day = new Date().getDate();
    const pickToday = async (testId: string) => {
      await page.getByTestId(testId).locator('.date-field-input').click();
      await page
        .locator(`.react-datepicker__month [aria-label="day-${day}"]:not(.react-datepicker__day--outside-month)`)
        .first()
        .click();
    };
    await pickToday('receive-order-shipped-on');
    await pickToday('receive-order-delivered-on');
    await page.getByTestId('receive-order-recipient').locator('input').first().fill('admin');
    await page.waitForTimeout(1500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.getByTestId('receive-order-next-button').click();
    await expect(page.getByTestId('receive-order-process-items')).toBeVisible();
    await captureStep(page, 'receive-order', 'react-process-items');

    // Same order item rows as the API returns
    if (orderData.orderItems.length) {
      await expect(page.locator('[data-testid="receive-order-item-row"]'))
        .toHaveCount(orderData.orderItems.length);
    }

    // Receive one unit of the first receivable item so Finish exercises the
    // full save path (shipment + receipt creation and redirect to the order)
    const receivable = orderData.orderItems.some((item: any) => !item.isCompletelyFulfilled);
    if (receivable) {
      const quantityInput = page
        .getByTestId('receive-order-quantity-input')
        .locator('input')
        .first();
      await quantityInput.fill('1');
      await page
        .getByTestId('receive-order-lot-input')
        .locator('input')
        .first()
        .fill(`E2E-LOT-${Date.now()}`);
    }

    await page.getByTestId('receive-order-next-button').click();
    await expect(page.getByTestId('receive-order-confirm')).toBeVisible();
    await captureStep(page, 'receive-order', 'react-confirm');

    if (receivable) {
      await expect(page.locator('[data-testid="receive-order-confirm-item-row"]')).toHaveCount(1);
      await page.getByTestId('receive-order-finish-button').click();
      // Successful receive redirects to the legacy order show page
      await page.waitForURL(`**/order/show/${orderId}**`, { timeout: 30000 });
      await captureStep(page, 'receive-order', 'legacy-order-show-after-receive');

      // The received unit must be linked back to the order (order_shipment
      // join), which is what drives the fulfilled quantity on the order
      const after = (await (await page.request.get(url(`/api/orders/${orderId}/receiveOrder`))).json()).data;
      const fulfilled = (data: any) => data.orderItems
        .reduce((sum: number, item: any) => sum + item.quantityFulfilled, 0);
      expect(fulfilled(after), 'receiving 1 unit should increase the order fulfilled quantity by 1')
        .toBe(fulfilled(orderData) + 1);
    }
  });
});
