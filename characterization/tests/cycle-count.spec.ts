import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, url } from '../fixtures/constants';
import { findProductId } from '../fixtures/api';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow 4: Cycle count.
 *
 * Golden path: mark the demo product "to count" from the All Products tab,
 * start the count, record a counted quantity 3 lower than the QoH of the
 * largest lot, resolve the resulting discrepancy through the recount step
 * (root cause: Correction), and assert the inventory adjustment (-3 QoH) is
 * persisted plus the count is recorded against the product.
 */
test('cycle count with discrepancy adjusts quantity on hand', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'cycle-count';
  const DELTA = 3;
  const product = PRODUCTS.morphineTablet.name;

  await login(page);
  const productId = await findProductId(page.request, product);
  // Reset: cancel any cycle-count request left over from an interrupted run.
  await cancelPendingCycleCount(page, product);
  const lots = await availableItems(page, productId);
  expect(lots.length).toBeGreaterThan(0);
  const qohBefore = lots.reduce((sum, lot) => sum + lot.quantityOnHand, 0);
  // Count the largest lot short by DELTA; count every other lot exactly.
  const shortLot = [...lots].sort((a, b) => b.quantityOnHand - a.quantityOnHand)[0];
  expect(shortLot.quantityOnHand).toBeGreaterThan(DELTA);

  // --- Step 1: Mark as To Count (All products tab) ---
  await page.goto(url('/inventory/cycleCount?tab=ALL_PRODUCTS'));
  await searchFor(page, product);
  const allProductsRow = page.locator('[role="row"], tr').filter({ hasText: product }).first();
  await allProductsRow.waitFor();
  await allProductsRow.locator('input[type="checkbox"]').first().check();
  await captureStep(page, FLOW, 'all-products-selected');
  await page.click('button:has-text("Mark as To Count")');

  // --- Step 2: Start count (To count tab) ---
  await page.waitForURL(/tab=TO_COUNT/);
  await searchFor(page, product);
  const toCountRow = page.locator('[role="row"], tr').filter({ hasText: product }).first();
  await toCountRow.waitFor();
  await toCountRow.locator('input[type="checkbox"]').first().check();
  await captureStep(page, FLOW, 'to-count-selected');
  await page.click('button:has-text("Start count")');
  await page.waitForURL(/cycleCount\/count/);

  // --- Step 3: Record counted quantities ---
  await selectPerson(page, 'Counted by', 'Miss Administrator');
  for (const lot of lots) {
    const counted = lot === shortLot ? lot.quantityOnHand - DELTA : lot.quantityOnHand;
    await fillLotQuantity(page, lot, counted);
  }
  await captureStep(page, FLOW, 'count-filled');
  await page.click('button:has-text("Next")');
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'count-review');
  await page.click('button:has-text("Save")');

  // A discrepancy forces a recount: confirm and skip the assignment modal.
  await clickIfVisible(page, 'button:has-text("Resolve")');
  await clickIfVisible(page, 'button:has-text("Skip")');

  // --- Step 4: Resolve the discrepancy (recount) ---
  await page.waitForURL(/cycleCount\/resolve/);
  await selectPerson(page, 'Recounted by', 'Miss Administrator');
  for (const lot of lots) {
    const recounted = lot === shortLot ? lot.quantityOnHand - DELTA : lot.quantityOnHand;
    await fillLotQuantity(page, lot, recounted);
  }
  await selectRootCause(page, shortLot, 'Correction');
  await captureStep(page, FLOW, 'resolve-filled');
  await page.click('button:has-text("Next")');
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'resolve-review');
  await page.click('button:has-text("Save")');
  await page.waitForURL(/tab=/);
  await captureStep(page, FLOW, 'completed');

  // --- Outcome assertions on real data ---
  // Inventory was adjusted down by the counted discrepancy.
  await expect
    .poll(
      async () => {
        const after = await availableItems(page, productId);
        return after.reduce((sum, lot) => sum + lot.quantityOnHand, 0) - qohBefore;
      },
      { timeout: 60_000 },
    )
    .toBe(-DELTA);

  // The count is recorded against the product (dateLastCount set to today).
  const candidatesRes = await page.request.get(
    url(`/api/facilities/${LOCATIONS.mainWarehouse.id}/cycle-counts/candidates?searchTerm=${encodeURIComponent(product)}`),
  );
  expect(candidatesRes.status()).toBe(200);
  const candidates = (await candidatesRes.json()).data as Array<{
    product: { name: string };
    dateLastCount: string | null;
    status: string | null;
  }>;
  const candidate = candidates.find((c) => c.product.name === product);
  expect(candidate).toBeTruthy();
  expect(candidate!.dateLastCount).not.toBeNull();
  expect(new Date(candidate!.dateLastCount!).toDateString()).toBe(new Date().toDateString());
});

interface Lot {
  lotNumber: string;
  quantityOnHand: number;
  binLocation: { name: string } | null;
}

async function availableItems(page: Page, productId: string): Promise<Lot[]> {
  const res = await page.request.get(
    url(`/api/products/availableItems?location.id=${LOCATIONS.mainWarehouse.id}&product.id=${productId}`),
  );
  expect(res.status()).toBe(200);
  return (await res.json()).data as Lot[];
}

/** Uses the list search box to narrow the table down to the product under test. */
async function searchFor(page: Page, text: string): Promise<void> {
  const search = page.locator('input[placeholder*="Search"], input[type="search"]').first();
  await search.waitFor();
  await search.fill(text);
  // The search box only filters on submit (Enter): wait for the filtered
  // candidates/requests response before asserting on rows.
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('searchTerm=')),
    search.press('Enter'),
  ]);
  await page.waitForLoadState('networkidle');
}

/** Fills the counted-quantity input on the row for the given lot (and bin, if any). */
async function fillLotQuantity(page: Page, lot: Lot, quantity: number): Promise<void> {
  let row = page
    .locator('[role="row"], tr, div[class*="rt-tr"]')
    .filter({ hasText: lot.lotNumber });
  if (lot.binLocation?.name) {
    row = row.filter({ hasText: lot.binLocation.name });
  }
  row = row.first();
  await row.waitFor();
  await row.locator('input[type="number"], input[inputmode="numeric"]').first().fill(String(quantity));
}

/** Fills a "Counted by"/"Recounted by" react-select in the table header. */
async function selectPerson(page: Page, label: string, name: string): Promise<void> {
  const container = page.locator(`div:has(> span:has-text("${label}")), div:has-text("${label}")`).last();
  const input = container.locator('input[id^="react-select"]').first();
  await input.click({ force: true });
  await input.fill(name.split(' ')[1] ?? name);
  await page.locator(`.react-select__option:has-text("${name}")`).first().click();
}

/** Selects the root cause on the discrepant lot's row during the resolve step. */
async function selectRootCause(page: Page, lot: Lot, rootCause: string): Promise<void> {
  let row = page
    .locator('[role="row"], tr, div[class*="rt-tr"]')
    .filter({ hasText: lot.lotNumber });
  if (lot.binLocation?.name) {
    row = row.filter({ hasText: lot.binLocation.name });
  }
  row = row.first();
  await row.getByText('Select', { exact: true }).first().click();
  await page
    .locator(`.react-select__option:has-text("${rootCause}"), [role="option"]:has-text("${rootCause}")`)
    .first()
    .click();
}

/** Cancels a leftover (in-progress) cycle-count request so the run starts from a clean state. */
async function cancelPendingCycleCount(page: Page, productName: string): Promise<void> {
  const res = await page.request.get(
    url(`/api/facilities/${LOCATIONS.mainWarehouse.id}/cycle-counts/candidates?searchTerm=${encodeURIComponent(productName)}`),
  );
  expect(res.status()).toBe(200);
  const candidates = (await res.json()).data as Array<{
    product: { name: string };
    status: string | null;
    cycleCountRequest: { id: string } | null;
  }>;
  const candidate = candidates.find((c) => c.product.name === productName);
  const requestId = candidate?.cycleCountRequest?.id;
  // Only cancel counts that never finished; completed counts are history.
  if (candidate?.status && candidate.status !== 'COMPLETED' && requestId) {
    const del = await page.request.delete(
      url(`/api/facilities/${LOCATIONS.mainWarehouse.id}/cycle-counts/requests/batch?id=${requestId}`),
    );
    expect(del.ok()).toBeTruthy();
  }
}

async function clickIfVisible(page: Page, selector: string): Promise<void> {
  const button = page.locator(selector).first();
  try {
    await button.waitFor({ state: 'visible', timeout: 15_000 });
    await button.click();
  } catch {
    // No discrepancy modal appeared; nothing to do.
  }
}
