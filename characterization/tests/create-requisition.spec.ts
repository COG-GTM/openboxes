import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, today, runId, url } from '../fixtures/constants';
import { selectByFormField, selectInside } from '../fixtures/react-select';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow 3: Create requisition.
 *
 * Golden path: create an outbound stock movement (which is backed by a
 * Requisition record in the legacy domain model) from Main Warehouse to the
 * demo Boston Warehouse depot and add a line item. Asserts the requisition
 * is persisted with an identifier, CREATED status, and the requested line.
 */
test('creates a requisition (outbound stock movement) with a line item', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'create-requisition';
  const QTY = 5;
  const description = `Characterization requisition ${runId()}`;

  await login(page);

  // --- Step 1: Create ---
  await page.goto(url('/stockMovement/createOutbound?direction=OUTBOUND'));
  await page.waitForSelector('#description');
  await page.fill('#description', description);
  await selectByFormField(page, 'Destination', LOCATIONS.bostonWarehouse.name);
  await selectByFormField(page, 'Requested By', 'admin', 'admin');
  await page.locator('#dateRequested, input[name="dateRequested"]').first().fill(today());
  await page.keyboard.press('Escape');
  await selectByFormField(page, 'Request type', 'Stock', 'Stock');
  await captureStep(page, FLOW, 'create-filled');
  await page.click('button:has-text("Next")');
  await page.waitForURL(/createOutbound\/[a-zA-Z0-9]+/);
  const stockMovementId = page.url().match(/createOutbound\/([a-zA-Z0-9]+)/)![1];

  // --- Step 2: Add items ---
  await page.locator('input[id^="lineItems"][id$="quantityRequested"]').first().waitFor();
  const row = page
    .locator('tr, div[class*="rt-tr"], div[role="row"]')
    .filter({ has: page.locator('input[id^="lineItems"][id$="quantityRequested"]') })
    .last();
  await selectInside(page, row, PRODUCTS.lamivudine.name);
  await row.locator('input[id^="lineItems"][id$="quantityRequested"]').fill(String(QTY));
  await captureStep(page, FLOW, 'add-items-filled');
  await page.click('button:has-text("Save")');
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'saved');

  // --- Outcome assertions on real data ---
  const res = await page.request.get(url(`/api/stockMovements/${stockMovementId}`));
  expect(res.status()).toBe(200);
  const sm = (await res.json()).data;
  expect(sm.statusCode).toBe('CREATED');
  expect(sm.identifier).toMatch(/^[0-9A-Z]{6}$/);
  expect(sm.description).toBe(description);
  expect(sm.origin.name).toBe(LOCATIONS.mainWarehouse.name);
  expect(sm.destination.name).toBe(LOCATIONS.bostonWarehouse.name);

  const itemsRes = await page.request.get(url(`/api/stockMovements/${stockMovementId}/stockMovementItems`));
  expect(itemsRes.status()).toBe(200);
  const items = (await itemsRes.json()).data;
  expect(items).toHaveLength(1);
  expect(items[0].product.name).toBe(PRODUCTS.lamivudine.name);
  expect(items[0].quantityRequested).toBe(QTY);

  // The requisition shows up in the outbound list UI with its identifier.
  await page.goto(url('/stockMovement/list?direction=OUTBOUND'));
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`text=${sm.identifier}`).first()).toBeVisible();
  await captureStep(page, FLOW, 'outbound-list');
});
