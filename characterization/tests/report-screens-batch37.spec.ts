import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 37: migrated dataExport/index, report/showBinLocationReport,
 * report/showCycleCountReport and the three shipment print report React
 * screens.
 *
 * Asserts the React screens render the same data as the REST endpoints they
 * consume (/api/dataExports, /api/reports/binLocationReport,
 * /api/reports/cycleCountReport and /api/reports/shippingReport/{id}).
 */

// The pinned released image (characterization job) predates the Batch 37
// endpoints/screens; these tests run against source builds.
async function skipUnlessBatch37(page): Promise<void> {
  const res = await page.request.get(url('/api/dataExports'));
  test.skip(res.status() !== 200, 'Batch 37 endpoints not present in target build (pinned released image)');
}

async function seededShipmentId(page): Promise<string> {
  const res = await page.request.get(url('/api/generic/shipment'));
  expect(res.status()).toBe(200);
  const { data } = await res.json();
  test.skip(!data.length, 'No seeded shipments');
  return data[0].id;
}

test('dataExport/index renders the React data export list', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'data-export-react';
  await login(page);
  await skipUnlessBatch37(page);

  const res = await page.request.get(url('/api/dataExports'));
  const { data } = await res.json();

  await page.goto(url('/dataExport/index'));
  await page.waitForSelector('[data-testid="data-export-list"]');
  await captureStep(page, FLOW, 'list');

  const rows = page.locator('[data-testid="data-export-list"] tbody tr');
  await expect(rows).toHaveCount(Math.max(data.length, 1));
  if (data.length) {
    await expect(rows.first()).toContainText(data[0].name);
    await expect(rows.first().locator('a', { hasText: 'CSV' }))
      .toHaveAttribute('href', new RegExp(`/dataExport/render/${data[0].id}\\?format=csv$`));
  }
});

test('report/showBinLocationReport renders the React inventory details report', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'bin-location-report-react';
  await login(page);
  await skipUnlessBatch37(page);

  const res = await page.request.get(url('/api/reports/binLocationReport'));
  expect(res.status()).toBe(200);
  const { data } = await res.json();

  await page.goto(url('/report/showBinLocationReport'));
  await page.waitForSelector('[data-testid="bin-location-report-table"]');
  await expect(page.locator('[data-testid="bin-location-report-count"]'))
    .toContainText(`${data.length} `);
  await captureStep(page, FLOW, 'report');

  if (data.length) {
    // table paginates 100 rows per page (matching the legacy DataTable page size)
    const rows = page.locator('[data-testid="bin-location-report-table"] tbody tr');
    await expect(rows).toHaveCount(Math.min(data.length, 100));
    await expect(rows.first()).toContainText(data[0].productCode);
  }

  // status filter parity with the API
  const filteredRes = await page.request.get(url('/api/reports/binLocationReport?status=inStock'));
  const filtered = (await filteredRes.json()).data;
  await page.selectOption('#bin-location-report-status', 'inStock');
  await page.click('[data-testid="bin-location-report-filters"] button[type="submit"]');
  await expect(page.locator('[data-testid="bin-location-report-count"]'))
    .toContainText(`${filtered.length} `);
  await captureStep(page, FLOW, 'filtered');
});

test('report/showCycleCountReport renders the React cycle count report', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'cycle-count-report-react';
  await login(page);
  await skipUnlessBatch37(page);

  const res = await page.request.get(url('/api/reports/cycleCountReport'));
  expect(res.status()).toBe(200);
  const { data } = await res.json();

  await page.goto(url('/report/showCycleCountReport'));
  await page.waitForSelector('[data-testid="cycle-count-report-table"]');
  await expect(page.locator('[data-testid="cycle-count-report-count"]'))
    .toContainText(`${data.length} `);
  await captureStep(page, FLOW, 'report');

  if (data.length) {
    // table paginates 25 rows per page (matching the legacy DataTable page size)
    const rows = page.locator('[data-testid="cycle-count-report-table"] tbody tr');
    await expect(rows).toHaveCount(Math.min(data.length, 25));
    await expect(rows.first()).toContainText(data[0].productCode);
  }
});

test('shipment print reports render the React print screens', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-print-reports-react';
  await login(page);
  await skipUnlessBatch37(page);
  const shipmentId = await seededShipmentId(page);

  const res = await page.request.get(url(`/api/reports/shippingReport/${shipmentId}`));
  expect(res.status()).toBe(200);
  const { data } = await res.json();

  await page.goto(url(`/report/printShippingReport?shipment.id=${shipmentId}`));
  await page.waitForSelector('[data-testid="print-shipping-report"]');
  await captureStep(page, FLOW, 'shipping-report');
  const shippingRows = page.locator('[data-testid="shipping-report-items"] tbody tr');
  await expect(shippingRows).toHaveCount(Math.max(data.entries.length, 1));

  await page.goto(url(`/report/printPickListReport?shipment.id=${shipmentId}`));
  await page.waitForSelector('[data-testid="print-pick-list-report"]');
  await captureStep(page, FLOW, 'pick-list');
  if (data.entries.length) {
    await expect(page.locator('[data-testid="pick-list-items"] tbody tr').first())
      .toContainText(data.entries[0].productCode ?? '');
  }

  await page.goto(url(`/report/printPaginatedPackingListReport?shipment.id=${shipmentId}`));
  await page.waitForSelector('[data-testid="print-paginated-packing-list-report"]');
  await captureStep(page, FLOW, 'paginated-packing-list');
  if (data.entries.length) {
    await expect(page.locator('[data-testid="packing-list-items"] tbody tr').first())
      .toContainText(data.entries[0].productCode ?? '');
  }
});
