import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, runId, today, url } from '../fixtures/constants';
import {
  advanceToSendStep,
  createOutboundWithLineItem,
  fetchStockMovement,
} from '../fixtures/outbound';
import { selectFirstOption } from '../fixtures/react-select';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow 5: Ship a shipment.
 *
 * Golden path: process an outbound stock movement all the way through the
 * wizard (create, add items, edit, pick, [pack]) and send the shipment.
 * Asserts the movement is DISPATCHED with a SHIPPED shipment and that the
 * quantity on hand at the origin depot actually decreased by the shipped
 * quantity.
 */
test('ships an outbound shipment and decreases quantity on hand at origin', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'ship-shipment';
  const QTY = 3;
  const description = `Characterization shipment ${runId()}`;

  await login(page);

  const stockMovementId = await createOutboundWithLineItem(page, {
    productName: PRODUCTS.lamivudine.name,
    qty: QTY,
    description,
  });

  // Baseline QOH at origin before the shipment leaves.
  const itemsRes = await page.request.get(
    url(`/api/stockMovements/${stockMovementId}/stockMovementItems`),
  );
  expect(itemsRes.status()).toBe(200);
  const items = (await itemsRes.json()).data;
  expect(items).toHaveLength(1);
  const productId: string = items[0].product.id;
  const qohBefore = await quantityOnHand(page, productId);

  await advanceToSendStep(page);

  // --- Send shipment --- (ship date is prefilled with "now" by the app)
  const shipmentType = page.locator('[data-testid="form-field"][aria-label="Shipment type"]');
  await selectFirstOption(page, shipmentType);
  await page.getByRole('textbox', { name: /Expected Delivery Date/i }).fill(today());
  await page.keyboard.press('Escape');
  await captureStep(page, FLOW, 'send-filled');
  await page.click('button:has-text("Send shipment")');
  await page.waitForURL(/stockMovement\/show/);
  await captureStep(page, FLOW, 'shipped');

  // --- Outcome assertions on real data ---
  const shipped = await fetchStockMovement(page, stockMovementId);
  expect(shipped.statusCode).toBe('DISPATCHED');
  expect(shipped.shipmentStatus).toBe('SHIPPED');
  expect(shipped.identifier).toMatch(/^[0-9A-Z]{6}$/);
  expect(shipped.origin.name).toBe(LOCATIONS.mainWarehouse.name);
  expect(shipped.destination.name).toBe(LOCATIONS.bostonWarehouse.name);

  // Stock actually left the origin depot: QOH decreased by the shipped qty.
  await expect
    .poll(async () => qohBefore - (await quantityOnHand(page, productId)), { timeout: 60_000 })
    .toBe(QTY);
});

async function quantityOnHand(page: import('@playwright/test').Page, productId: string): Promise<number> {
  const res = await page.request.get(
    url(`/api/products/availableItems?location.id=${LOCATIONS.mainWarehouse.id}&product.id=${productId}`),
  );
  expect(res.status()).toBe(200);
  const items = (await res.json()).data as Array<{ quantityOnHand: number }>;
  return items.reduce((sum, i) => sum + (i.quantityOnHand ?? 0), 0);
}
