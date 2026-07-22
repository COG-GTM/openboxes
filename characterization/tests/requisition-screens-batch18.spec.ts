import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 18: migrated requisitionTemplate/show and stocklist/show React screens.
 *
 * Asserts the React screens render the same data as the REST endpoints they
 * consume (/api/stocklists/{id}/details and /api/inventoryLevels).
 */

// The pinned released image (characterization job) predates the Batch 18
// endpoint/screens; these tests run against source builds (characterization-java21).
async function seededStocklistId(page): Promise<string> {
  const res = await page.request.get(url('/api/stocklists'));
  expect(res.status()).toBe(200);
  const match = (await res.json()).data.find(
    (sl) => sl.name === 'Boston Monthly Replenishment',
  );
  expect(match, 'Seeded stock list not found: Boston Monthly Replenishment').toBeTruthy();
  return match.id;
}

async function skipUnlessBatch18(page): Promise<void> {
  const id = await seededStocklistId(page);
  const res = await page.request.get(url(`/api/stocklists/${id}/details`));
  test.skip(res.status() !== 200, 'Batch 18 endpoints not present in target build (pinned released image)');
}

async function locationId(page, name: string): Promise<string> {
  const res = await page.request.get(url('/api/locations'));
  expect(res.status()).toBe(200);
  const match = (await res.json()).data.find((loc) => loc.name === name);
  expect(match, `Location not found in seeded data: ${name}`).toBeTruthy();
  return match.id;
}

test('requisitionTemplate/show renders the React template details screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-template-show-react';
  await login(page);
  await skipUnlessBatch18(page);
  const stocklistId = await seededStocklistId(page);

  const detailsRes = await page.request.get(url(`/api/stocklists/${stocklistId}/details`));
  expect(detailsRes.status()).toBe(200);
  const details = (await detailsRes.json()).data;

  await page.goto(url(`/requisitionTemplate/show/${stocklistId}`));
  await page.waitForSelector('[data-testid="template-items"]');
  await captureStep(page, FLOW, 'show');

  await expect(page.locator('[data-testid="template-name"]')).toContainText(details.name);
  await expect(page.locator('[data-testid="published-tag"]'))
    .toHaveText(details.isPublished ? 'Published' : 'Draft');

  const detailsTable = page.locator('[data-testid="template-details"]');
  await expect(detailsTable.locator('td[aria-label="Name"]')).toHaveText(details.name);
  await expect(detailsTable.locator('td[aria-label="Origin"]')).toHaveText(details.origin?.name ?? '');
  await expect(detailsTable.locator('td[aria-label="Destination"]')).toHaveText(details.destination?.name ?? '');

  const rows = page.locator('[data-testid="template-items"] tbody tr');
  await expect(rows).toHaveCount(details.requisitionItems.length);
  const firstItem = details.requisitionItems[0];
  await expect(rows.first().locator('td').first()).toHaveText(firstItem.product.productCode);
});

test('stocklist/show renders the React location inventory levels screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'stocklist-show-react';
  await login(page);
  await skipUnlessBatch18(page);
  const mainId = await locationId(page, LOCATIONS.mainWarehouse.name);

  const levelsRes = await page.request.get(
    url(`/api/inventoryLevels?locationId=${mainId}&max=100`),
  );
  expect(levelsRes.status()).toBe(200);
  const { totalCount } = await levelsRes.json();

  await page.goto(url(`/stocklist/show/${mainId}`));
  await page.waitForSelector('[data-testid="stocklist-inventory-levels"]');
  await captureStep(page, FLOW, 'show');

  await expect(page.locator('[data-testid="stocklist-location"] td[aria-label="Name"]'))
    .toHaveText(LOCATIONS.mainWarehouse.name);
  await expect(page.locator('[data-testid="stocklist-item-count"]'))
    .toContainText(`${totalCount} `);
  if (totalCount > 0 && totalCount <= 100) {
    await expect(page.locator('[data-testid="stocklist-inventory-levels"] tbody tr'))
      .toHaveCount(totalCount);
  }
});
