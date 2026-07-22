import { Page, expect } from '@playwright/test';
import { LOCATIONS, today, url } from './constants';
import { selectByFormField, selectInside, selectFirstOption } from './react-select';

/**
 * Creates, sends and fully receives an inbound stock movement of `qty` units
 * of `productName` (lot-controlled) from the demo supplier into the current
 * depot (Main Warehouse). Returns the stock movement id.
 *
 * This is the shared precondition for flows that need freshly received stock
 * sitting in the receiving bin (e.g. putaway).
 */
export async function receiveInboundShipment(
  page: Page,
  { productName, lotNumber, qty, description }: {
    productName: string;
    lotNumber: string;
    qty: number;
    description: string;
  },
): Promise<string> {
  // Create
  await page.goto(url('/stockMovement/createInbound?direction=INBOUND'));
  await page.waitForSelector('#description');
  await page.fill('#description', description);
  await selectByFormField(page, 'Origin', LOCATIONS.mainSupplier.name);
  await selectByFormField(page, 'Requested By', 'admin', 'admin');
  await page.locator('input[name="dateRequested"], #dateRequested').first().fill(today());
  await page.keyboard.press('Escape');
  await page.click('button:has-text("Next")');
  await page.waitForURL(/createInbound\/[a-zA-Z0-9]+/);
  const stockMovementId = page.url().match(/createInbound\/([a-zA-Z0-9]+)/)![1];

  // Add items
  const row = page
    .locator('tr, div[class*="rt-tr"], div[role="row"]')
    .filter({ has: page.locator('input[name="values.lineItems.0.quantityRequested"]') })
    .last();
  await selectInside(page, row, productName);
  await page.fill('input[name="values.lineItems.0.lotNumber"]', lotNumber);
  await page.locator('input[name="values.lineItems.0.expirationDate"]').fill('12/31/2030');
  await page.keyboard.press('Escape');
  await page.fill('input[name="values.lineItems.0.quantityRequested"]', String(qty));
  await page.click('button:has-text("Next")');
  await page.waitForURL(/step=SEND_SHIPMENT/);

  // Send shipment
  await page.locator('input[name="shipDate"]').fill(today());
  await page.keyboard.press('Escape');
  const shipmentType = page.locator('[data-testid="form-field"][aria-label="Shipment type"]');
  await selectFirstOption(page, shipmentType);
  await page.locator('input[name="expectedDeliveryDate"]').fill(today());
  await page.keyboard.press('Escape');
  await page.click('button:has-text("Send shipment")');
  await page.waitForURL(/stockMovement\/show/);

  // Receive (partial receiving screen)
  await page.click('a:has-text("Receive")');
  await page.waitForSelector('button:has-text("Autofill quantities")');
  await page.click('button:has-text("Autofill quantities")');
  const qtyReceiving = page.locator('input[id^="containers"][id$="quantityReceiving"]').first();
  await expect(qtyReceiving).toHaveValue(String(qty));
  await page.click('button:has-text("Next")');
  await page.waitForSelector('button:has-text("Receive shipment")');
  await page.click('button:has-text("Receive shipment")');
  await page.waitForURL(/stockMovement\/show/);

  return stockMovementId;
}
