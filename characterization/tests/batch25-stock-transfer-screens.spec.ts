import { test, expect, Page } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for stockTransfer show and print (Phase 2, Batch 25).
 *
 * The legacy /stockTransfer/(show|print) URLs now render the React SPA backed
 * by the new /api/stockTransfers/{id}/(details|print) JSON endpoints.
 */

async function createStockTransfer(page: Page): Promise<string | null> {
  const candidates = (await (await page.request.get(
    url('/api/stockTransfers/candidates'),
  )).json()).data as Array<Record<string, unknown>>;
  if (!candidates?.length) {
    return null;
  }
  const item = candidates[0];
  const created = await page.request.post(url('/api/stockTransfers'), {
    data: {
      description: 'ZZ Playwright Batch 25 stock transfer',
      stockTransferItems: [{
        productAvailabilityId: item.productAvailabilityId,
        product: { id: item['product.id'] },
        inventoryItem: { id: item['inventoryItem.id'] },
        originBinLocation: { id: item['originBinLocation.id'] },
        destinationBinLocation: { id: item['destinationBinLocation.id'] },
        quantity: 1,
        quantityOnHand: item.quantityOnHand,
        quantityNotPicked: item.quantityNotPicked,
        splitItems: [],
      }],
    },
  });
  return (await created.json()).data.id as string;
}

test.describe('batch 25 stock transfer react screens', () => {
  let stockTransferId: string | null = null;

  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    stockTransferId = await createStockTransfer(page);
    test.skip(!stockTransferId, 'seeded dataset has no stock transfer candidates');
    const probe = await page.request.get(url(`/api/stockTransfers/${stockTransferId}/details`));
    test.skip(probe.status() !== 200, 'app build does not expose the Batch 25 endpoints (pinned released image)');
  });

  test.afterEach(async ({ page }) => {
    if (stockTransferId) {
      await page.request.delete(url(`/api/stockTransfers/${stockTransferId}`));
      stockTransferId = null;
    }
  });

  test('stock transfer show renders header and summary items from the API', async ({ page }) => {
    const details = (await (await page.request.get(
      url(`/api/stockTransfers/${stockTransferId}/details`),
    )).json()).data;

    await page.goto(url(`/stockTransfer/show/${stockTransferId}`));
    await expect(page.getByTestId('stock-transfer-show-header')).toBeVisible();
    await expect(page.getByTestId('stock-transfer-show-header')).toContainText(details.orderNumber);
    await expect(page.getByTestId('stock-transfer-show-order-number')).toHaveText(details.orderNumber);
    await captureStep(page, 'stock-transfer-show', 'react-show');

    const rows = page.locator('[data-testid="stock-transfer-show-items-table"] tbody tr');
    await expect(rows).toHaveCount(details.orderItems.length);

    if (details.canEdit) {
      await expect(page.getByTestId('stock-transfer-show-edit-button')).toBeVisible();
    }
    await expect(page.getByTestId('stock-transfer-show-print-button')).toBeVisible();
  });

  test('stock transfer show renders an error state for unknown ids', async ({ page }) => {
    await page.goto(url('/stockTransfer/show/doesnotexist0000'));
    await expect(page.getByTestId('stock-transfer-show-error')).toBeVisible();
  });

  test('stock transfer print renders the print view model from the API', async ({ page }) => {
    const printData = (await (await page.request.get(
      url(`/api/stockTransfers/${stockTransferId}/print`),
    )).json()).data;

    await page.goto(url(`/stockTransfer/print/${stockTransferId}`));
    await expect(page.getByTestId('stock-transfer-print-page')).toBeVisible();
    await expect(page.getByTestId('stock-transfer-print-order-number')).toHaveText(printData.orderNumber);
    await captureStep(page, 'stock-transfer-print', 'react-print');

    // Every parent item renders one row per split item (or a single row) in
    // EACH category group it matches (only General Goods is exclusive)
    type PrintItem = {
      splitItems: Array<unknown>,
      coldChain: boolean,
      controlledSubstance: boolean,
      hazardousMaterial: boolean,
    };
    const groupMemberships = (item: PrintItem) => {
      const flagged = [item.coldChain, item.controlledSubstance, item.hazardousMaterial]
        .filter(Boolean).length;
      return flagged || 1;
    };
    const expectedRows = (printData.orderItems as Array<PrintItem>)
      .reduce(
        (sum, item) => sum + groupMemberships(item) * Math.max(item.splitItems.length, 1),
        0,
      );
    const rows = page.locator('[data-testid="stock-transfer-print-items-table"] tbody tr');
    await expect(rows).toHaveCount(expectedRows);
  });
});
