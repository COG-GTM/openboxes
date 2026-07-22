import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 38: migrated report screens (forecast, inventory-by-location,
 * inventory, on-order, paginated packing list, request detail) to React.
 *
 * Asserts the React screens render the same data as the REST endpoints they
 * consume (/api/reports/... plus the pre-existing /json report sources).
 */

// The pinned released image (characterization job) predates the Batch 38
// endpoints/screens; these tests run against source builds (characterization-java21).
async function skipUnlessBatch38(page: Page): Promise<void> {
  const res = await page.request.get(url('/api/reports/on-order-summary'));
  test.skip(res.status() !== 200, 'Batch 38 endpoints not present in target build (pinned released image)');
}

/** Picks an option from the legacy-styled react-select (utils/Select). */
async function pickOption(page: Page, selectId: string, optionText: string): Promise<void> {
  await page.click(`[data-testid="${selectId}"]`);
  await page
    .locator(`[data-testid="custom-select-dropdown-menu"] [role="listitem"]:has-text("${optionText}")`)
    .first()
    .click();
}

test('report/showOnOrderReport renders the React on-order report', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'on-order-report-react';
  await login(page);
  await skipUnlessBatch38(page);

  const summaryRes = await page.request.get(url('/api/reports/on-order-summary'));
  const summary = (await summaryRes.json()).data;

  await page.goto(url('/report/showOnOrderReport'));
  await page.click('[data-testid="run-summary-button"]');
  await page.waitForSelector('[data-testid="on-order-report-table"]');
  await captureStep(page, FLOW, 'summary');

  const rows = page.locator('[data-testid="on-order-report-table"] tbody tr');
  await expect(rows).toHaveCount(Math.max(summary.length, 1)); // empty table renders one placeholder row
  if (summary.length) {
    await expect(rows.first().locator('td').first()).toHaveText(summary[0].productCode ?? '');
  }

  const detailsRes = await page.request.get(url('/api/reports/on-order-details'));
  const details = (await detailsRes.json()).data;
  await page.click('[data-testid="run-details-button"]');
  await captureStep(page, FLOW, 'details');
  await expect(rows).toHaveCount(Math.max(details.length, 1));
});

test('report/showRequestDetailReport renders the React request detail report', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'request-detail-report-react';
  await login(page);
  await skipUnlessBatch38(page);

  const locationsRes = await page.request.get(url('/api/locations'));
  const mainId = (await locationsRes.json()).data
    .find((loc) => loc.name === LOCATIONS.mainWarehouse.name).id;
  const apiRes = await page.request.get(
    url(`/api/reports/request-details?originId=${mainId}&startDate=01/01/2000&endDate=01/01/2050`),
  );
  const apiRows = (await apiRes.json()).data;

  await page.goto(url('/report/showRequestDetailReport'));
  // The fulfilling location defaults to the current location once options load
  await expect(page.locator('[data-testid="origin-select"]')).toContainText(LOCATIONS.mainWarehouse.name);
  await page.fill('#start-date-input', '2000-01-01');
  await page.fill('#end-date-input', '2050-01-01');
  await page.click('[data-testid="run-report-button"]');
  await page.waitForSelector('[data-testid="request-detail-report-table"]');
  await captureStep(page, FLOW, 'results');

  const rows = page.locator('[data-testid="request-detail-report-table"] tbody tr');
  await expect(rows).toHaveCount(Math.max(apiRows.length, 1));
  const totalDemand = apiRows.reduce((sum, row) => sum + (row.quantityDemand || 0), 0);
  await expect(page.locator('[data-testid="total-demand"]')).toHaveText(String(totalDemand));
});

test('report/showInventoryReport renders the React inventory report', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'inventory-report-react';
  await login(page);
  await skipUnlessBatch38(page);

  const apiRes = await page.request.get(
    url(`/json/getQuantityOnHandByProductGroup?location.id=${LOCATIONS.mainWarehouse.id}&status%5B%5D=IN_STOCK,STOCK_OUT`),
  );
  const apiRows = (await apiRes.json()).aaData;

  await page.goto(url('/report/showInventoryReport'));
  await page.check('#status-IN_STOCK');
  await page.check('#status-STOCK_OUT');
  await page.click('[data-testid="refresh-button"]');
  await page.waitForSelector('[data-testid="inventory-report-table"]');
  await captureStep(page, FLOW, 'results');

  const rows = page.locator('[data-testid="inventory-report-table"] tbody tr');
  await expect(rows).toHaveCount(Math.max(apiRows.length, 1));
});

test('report/showInventoryByLocationReport renders the React inventory by location report', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'inventory-by-location-report-react';
  await login(page);
  await skipUnlessBatch38(page);

  const locationsRes = await page.request.get(url('/api/locations'));
  const mainId = (await locationsRes.json()).data
    .find((loc) => loc.name === LOCATIONS.mainWarehouse.name).id;
  const apiRes = await page.request.get(
    url(`/api/reports/inventory-by-location?locations=${mainId}`),
  );
  const apiRows = (await apiRes.json()).data;

  await page.goto(url('/report/showInventoryByLocationReport'));
  await pickOption(page, 'locations-select', LOCATIONS.mainWarehouse.name);
  await page.click('[data-testid="run-report-button"]');
  await page.waitForSelector('[data-testid="inventory-by-location-table"]');
  await captureStep(page, FLOW, 'results');

  await expect(page.locator('[data-testid="result-count"]')).toContainText(`${apiRows.length} results`);
  const rows = page.locator('[data-testid="inventory-by-location-table"] tbody tr');
  await expect(rows).toHaveCount(Math.max(apiRows.length, 1));
});

test('report/showPaginatedPackingListReport renders the React packing list report', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'packing-list-report-react';
  await login(page);
  await skipUnlessBatch38(page);

  const shipmentsRes = await page.request.get(url('/api/reports/packing-list-shipments'));
  const shipments = (await shipmentsRes.json()).data;
  test.skip(!shipments.length, 'No seeded shipments destined for the current location');

  const packingRes = await page.request.get(
    url(`/api/reports/packing-list?shipmentId=${shipments[0].id}`),
  );
  const packing = (await packingRes.json()).data;

  await page.goto(url('/report/showPaginatedPackingListReport'));
  await pickOption(page, 'shipment-select', shipments[0].label);
  await page.waitForSelector('[data-testid="packing-list-shipment-name"]');
  await captureStep(page, FLOW, 'results');

  await expect(page.locator('[data-testid="packing-list-shipment-name"]'))
    .toContainText(packing.shipment.shipmentNumber);
  const totalEntries = packing.containers
    .reduce((sum, container) => sum + container.entries.length, 0);
  await expect(page.locator('[data-testid="packing-list-table"] tbody tr')).toHaveCount(totalEntries);
});

test('report/showForecastReport renders the React forecast report form', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'forecast-report-react';
  await login(page);
  await skipUnlessBatch38(page);

  await page.goto(url('/report/showForecastReport'));
  await page.waitForSelector('[data-testid="download-button"]');
  await captureStep(page, FLOW, 'form');

  await expect(page.locator('#origin-input')).toHaveValue(LOCATIONS.mainWarehouse.name);
  await expect(page.locator('[data-testid="download-button"]')).toBeVisible();
});
