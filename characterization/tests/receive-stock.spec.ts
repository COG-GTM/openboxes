import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, today, runId, url } from '../fixtures/constants';
import { selectByFormField, selectInside, selectFirstOption } from '../fixtures/react-select';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow 2: Receive stock (inbound receiving).
 *
 * Golden path: create an inbound stock movement from the demo supplier to
 * Main Warehouse, add a lot-controlled line item, send the shipment, then
 * receive it through the partial-receiving screen. Asserts on the stock
 * movement lifecycle (CREATED -> DISPATCHED -> RECEIVED) and on the actual
 * quantity-on-hand increase for the received lot.
 */
test('receives an inbound shipment and increases quantity on hand', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'receive-stock';
  const QTY = 25;
  const lotNumber = `CHAR-LOT-${runId()}`;
  const description = `Characterization inbound ${lotNumber}`;

  await login(page);

  // --- Step 1: Create ---
  await page.goto(url('/stockMovement/createInbound?direction=INBOUND'));
  await page.waitForSelector('#description');
  await page.fill('#description', description);
  await selectByFormField(page, 'Origin', LOCATIONS.mainSupplier.name);
  await selectByFormField(page, 'Requested By', 'admin', 'admin');
  await page.locator('input[name="dateRequested"], #dateRequested').first().fill(today());
  await page.keyboard.press('Escape');
  await captureStep(page, FLOW, 'create-filled');
  await page.click('button:has-text("Next")');
  await page.waitForURL(/createInbound\/[a-zA-Z0-9]+/);
  const stockMovementId = page.url().match(/createInbound\/([a-zA-Z0-9]+)/)![1];

  // --- Step 2: Add items ---
  const row = page
    .locator('tr, div[class*="rt-tr"], div[role="row"]')
    .filter({ has: page.locator('input[name="values.lineItems.0.quantityRequested"]') })
    .last();
  await selectInside(page, row, PRODUCTS.lamivudine.name);
  await page.fill('input[name="values.lineItems.0.lotNumber"]', lotNumber);
  await page.locator('input[name="values.lineItems.0.expirationDate"]').fill('12/31/2030');
  await page.keyboard.press('Escape');
  await page.fill('input[name="values.lineItems.0.quantityRequested"]', String(QTY));
  await captureStep(page, FLOW, 'add-items-filled');
  await page.click('button:has-text("Next")');
  await page.waitForURL(/step=SEND_SHIPMENT/);

  // Baseline QOH for the product before the shipment is received.
  const itemsRes = await page.request.get(url(`/api/stockMovements/${stockMovementId}/stockMovementItems`));
  expect(itemsRes.status()).toBe(200);
  const items = (await itemsRes.json()).data;
  expect(items).toHaveLength(1);
  expect(items[0].product.name).toBe(PRODUCTS.lamivudine.name);
  expect(items[0].quantityRequested).toBe(QTY);
  const productId: string = items[0].product.id;
  const qohBefore = await quantityOnHand(page, productId);

  // --- Step 3: Send shipment ---
  await page.locator('input[name="shipDate"]').fill(today());
  await page.keyboard.press('Escape');
  const shipmentType = page.locator('[data-testid="form-field"][aria-label="Shipment type"]');
  await selectFirstOption(page, shipmentType);
  await page.locator('input[name="expectedDeliveryDate"]').fill(today());
  await page.keyboard.press('Escape');
  await captureStep(page, FLOW, 'send-filled');
  await page.click('button:has-text("Send shipment")');
  await page.waitForURL(/stockMovement\/show/);
  await captureStep(page, FLOW, 'shipped');

  const shipped = await stockMovement(page, stockMovementId);
  expect(shipped.statusCode).toBe('DISPATCHED');
  expect(shipped.identifier).toMatch(/^[0-9A-Z]{6}$/);

  // --- Step 4: Receive (partial receiving screen) ---
  await page.click('a:has-text("Receive")');
  await page.waitForSelector('button:has-text("Autofill quantities")');
  await page.click('button:has-text("Autofill quantities")');
  const qtyReceiving = page.locator('input[id^="containers"][id$="quantityReceiving"]').first();
  await expect(qtyReceiving).toHaveValue(String(QTY));
  await captureStep(page, FLOW, 'receiving-autofilled');
  await page.click('button:has-text("Next")');
  await page.waitForSelector('button:has-text("Receive shipment")');
  await captureStep(page, FLOW, 'receiving-check');
  await page.click('button:has-text("Receive shipment")');
  await page.waitForURL(/stockMovement\/show/);
  await captureStep(page, FLOW, 'received');

  // --- Outcome assertions on real data ---
  const received = await stockMovement(page, stockMovementId);
  expect(received.displayStatus?.name).toBe('RECEIVED');

  // Product availability is recalculated asynchronously after the receipt
  // transaction, so poll until the new quantities are visible.
  await expect
    .poll(async () => (await quantityOnHand(page, productId)) - qohBefore, { timeout: 60_000 })
    .toBe(QTY);

  // The received lot exists as its own inventory item with the full quantity.
  await expect
    .poll(async () => lotQuantity(page, productId, lotNumber), { timeout: 60_000 })
    .toBe(QTY);
});

async function stockMovement(page: import('@playwright/test').Page, id: string) {
  const res = await page.request.get(url(`/api/stockMovements/${id}`));
  expect(res.status()).toBe(200);
  return (await res.json()).data;
}

async function availableItems(page: import('@playwright/test').Page, productId: string) {
  const res = await page.request.get(
    url(`/api/products/availableItems?location.id=${LOCATIONS.mainWarehouse.id}&product.id=${productId}`),
  );
  expect(res.status()).toBe(200);
  return (await res.json()).data as Array<{ lotNumber: string; quantityOnHand: number }>;
}

async function quantityOnHand(page: import('@playwright/test').Page, productId: string): Promise<number> {
  const items = await availableItems(page, productId);
  return items.reduce((sum, i) => sum + (i.quantityOnHand ?? 0), 0);
}

async function lotQuantity(page: import('@playwright/test').Page, productId: string, lotNumber: string): Promise<number> {
  const items = await availableItems(page, productId);
  return items.filter((i) => i.lotNumber === lotNumber).reduce((sum, i) => sum + (i.quantityOnHand ?? 0), 0);
}
