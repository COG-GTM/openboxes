import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, runId, url } from '../fixtures/constants';
import { receiveInboundShipment } from '../fixtures/inbound';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow 6: Putaway.
 *
 * Golden path: receive a fresh inbound shipment (stock lands in the shipment
 * receiving bin), then put the received lot away into a real bin location
 * through the putaway wizard. Asserts the putaway order completes and the
 * stock physically moved: the lot's quantity is now in the target bin and
 * the receiving bin no longer holds it.
 */
const TARGET_BIN = 'RM1-RACK1-SHELF1';

test('puts away received stock from the receiving bin into a bin location', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'putaway';
  const QTY = 10;
  const lotNumber = `CHAR-PUTAWAY-${runId()}`;

  await login(page);

  // Precondition: fresh stock in the receiving bin.
  const stockMovementId = await receiveInboundShipment(page, {
    productName: PRODUCTS.lamivudine.name,
    lotNumber,
    qty: QTY,
    description: `Characterization putaway inbound ${lotNumber}`,
  });
  const smRes = await page.request.get(url(`/api/stockMovements/${stockMovementId}`));
  expect(smRes.status()).toBe(200);
  const sm = (await smRes.json()).data;
  const identifier: string = sm.identifier;
  const productId: string = (await (await page.request.get(
    url(`/api/stockMovements/${stockMovementId}/stockMovementItems`),
  )).json()).data[0].product.id;

  // The received lot becomes a putaway candidate sitting in the receiving
  // bin (product availability is recalculated asynchronously, so poll).
  await expect
    .poll(async () => {
      const res = await page.request.get(url(`/api/putaways?location.id=${LOCATIONS.mainWarehouse.id}`));
      expect(res.status()).toBe(200);
      const candidate = (await res.json()).data
        .find((c: Record<string, unknown>) => c['inventoryItem.lotNumber'] === lotNumber);
      return candidate ? `${candidate.putawayStatus}:${candidate.quantity}` : null;
    }, { timeout: 60_000 })
    .toBe(`READY:${QTY}`);

  // --- Step 1: select the received stock movement's items ---
  await page.goto(url('/putAway/create'));
  const groupRow = page.locator('.rt-tr').filter({ hasText: identifier }).first();
  await groupRow.waitFor();
  await groupRow.locator('input[name="aggregationCheckbox"]').click();
  await captureStep(page, FLOW, 'candidates-selected');
  await page.locator('[data-testid="start-putaway"]').first().click();

  // --- Step 2: assign a putaway bin ---
  const binSelect = page.locator('[data-testid="select-bin"]').first();
  await binSelect.waitFor();
  await binSelect.click();
  await page.locator('.react-select__option')
    .filter({ hasText: new RegExp(`^${TARGET_BIN}$`) })
    .first()
    .click();
  await captureStep(page, FLOW, 'bin-assigned');
  await page.locator('[data-testid="next-button"]').first().click();

  // --- Step 3: check page -> complete ---
  const completeButton = page.locator('[data-testid="complete-putaway-button"]').first();
  await completeButton.waitFor();
  await expect(page.locator('.rt-tr').filter({ hasText: TARGET_BIN }).first()).toBeVisible();
  await captureStep(page, FLOW, 'check-page');
  await completeButton.click();
  // Completing the putaway lands on the legacy order (putaway order) page.
  await page.waitForURL(/order\/show/);
  await expect(page.locator('body')).toContainText('Completed');
  await captureStep(page, FLOW, 'completed');

  // --- Outcome assertions on real data ---
  // The lot's stock now sits in the target bin (and left the receiving bin).
  await expect
    .poll(async () => {
      const items = await availableItems(page, productId);
      const lotItems = items.filter((i) => i.lotNumber === lotNumber);
      return lotItems.map((i) => `${i.binLocation?.name ?? 'DEFAULT'}:${i.quantityOnHand}`).sort().join(',');
    }, { timeout: 60_000 })
    .toBe(`${TARGET_BIN}:${QTY}`);

  // The lot is no longer a READY putaway candidate from the receiving bin.
  const afterRes = await page.request.get(url(`/api/putaways?location.id=${LOCATIONS.mainWarehouse.id}`));
  const still = (await afterRes.json()).data
    .filter((c: Record<string, unknown>) => c['inventoryItem.lotNumber'] === lotNumber
      && c['putawayStatus'] === 'READY');
  expect(still).toHaveLength(0);
});

async function availableItems(page: import('@playwright/test').Page, productId: string) {
  const res = await page.request.get(
    url(`/api/products/availableItems?location.id=${LOCATIONS.mainWarehouse.id}&product.id=${productId}`),
  );
  expect(res.status()).toBe(200);
  return (await res.json()).data as Array<{
    lotNumber: string;
    quantityOnHand: number;
    binLocation?: { name: string };
  }>;
}
