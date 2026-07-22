import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, runId, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 15: migrated requisition React screens.
 *
 * Exercises the React screens that replaced the legacy GSPs for
 * requisition/list, requisition/createNonStock, requisition/createStock,
 * requisition/edit, requisition/editHeader and requisition/pick, asserting
 * against the same REST endpoints the screens consume.
 */

// The pinned released image (characterization job) predates the Batch 15
// endpoints/screens; these tests run against source builds (characterization-java21).
async function skipUnlessBatch15(page): Promise<void> {
  const res = await page.request.get(url('/api/requisitions'));
  test.skip(res.status() !== 200, 'Batch 15 endpoints not present in target build');
}

async function createRequisition(page): Promise<string> {
  const res = await page.request.post(url('/api/requisitions'), {
    data: {
      type: 'ADHOC',
      destinationId: LOCATIONS.mainWarehouse.id,
      requestedById: '1',
      dateRequested: '2026-07-01',
      description: `ZZ characterization requisition b15 ${runId()}`,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id;
}

// Demo product codes are randomized per seed, so resolve by the stable name.
async function seededProduct(page): Promise<{ id: string, productCode: string }> {
  const name = PRODUCTS.lamivudine.name;
  const res = await page.request.get(
    url(`/api/products/search?name=${encodeURIComponent(name)}`),
  );
  expect(res.status()).toBe(200);
  const match = (await res.json()).data.find((p) => p.name === name);
  expect(match, `Product not found in seeded data: ${name}`).toBeTruthy();
  return { id: match.id, productCode: match.productCode };
}

test('requisition/list renders the React list with API-matched rows', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-list-react';
  await login(page);
  await skipUnlessBatch15(page);
  const requisitionId = await createRequisition(page);

  await page.goto(url('/requisition/list'));
  await page.waitForSelector('[data-testid="requisition-list-table"]');
  await captureStep(page, FLOW, 'list');

  const res = await page.request.get(url('/api/requisitions?max=1000'));
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.statistics.ALL).toBeGreaterThan(0);
  const row = body.data.find((r) => r.id === requisitionId);
  expect(row).toBeTruthy();
  await expect(page.locator('[data-testid="requisition-list-table"]'))
    .toContainText(row.requestNumber);

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});

test('requisition/createNonStock creates a requisition via the React form', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-create-non-stock-react';
  await login(page);
  await skipUnlessBatch15(page);

  await page.goto(url('/requisition/createNonStock'));
  await page.waitForSelector('[data-testid="requisition-date-requested"]');
  await captureStep(page, FLOW, 'create-non-stock-form');

  await page.click('[data-testid="requisition-destination-select"]');
  await page.keyboard.type('Boston Office');
  await page.click('.custom-option >> text=Boston Office');

  await page.click('[data-testid="requisition-requested-by-select"]');
  await page.keyboard.type('Administrator');
  await page.click('.custom-option >> text=Administrator');

  await page.fill('[data-testid="requisition-date-requested"]', '2026-07-01');
  const description = `ZZ characterization non-stock ${runId()}`;
  await page.fill('[data-testid="requisition-description"]', description);
  await captureStep(page, FLOW, 'create-non-stock-filled');
  await page.click('[data-testid="requisition-save-button"]');
  await page.waitForURL(/requisition\/edit/);
  const requisitionId = page.url().match(/requisition\/edit\/([a-zA-Z0-9]+)/)![1];

  const res = await page.request.get(url(`/api/requisitions/${requisitionId}`));
  expect(res.status()).toBe(200);
  const data = (await res.json()).data;
  expect(data.type).toBe('NON_STOCK');
  expect(data.description).toBe(description);

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});

test('requisition/createStock renders the React stock requisition form', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-create-stock-react';
  await login(page);
  await skipUnlessBatch15(page);

  await page.goto(url('/requisition/createStock'));
  await page.waitForSelector('[data-testid="requisition-date-requested"]');
  await captureStep(page, FLOW, 'create-stock-form');
  await expect(page.locator('[data-testid="requisition-destination-select"]')).toBeVisible();
});

test('requisition/edit adds requisition items via the React screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-edit-react';
  await login(page);
  await skipUnlessBatch15(page);
  const requisitionId = await createRequisition(page);

  await page.goto(url(`/requisition/edit/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-items-table"]');
  await captureStep(page, FLOW, 'edit');

  // navigating to the edit screen moves CREATED -> EDITING
  const statusRes = await page.request.get(url(`/api/requisitions/${requisitionId}`));
  expect((await statusRes.json()).data.status).toBe('EDITING');

  const product = await seededProduct(page);
  const itemsRes = await page.request.post(url(`/api/requisitions/${requisitionId}/items`), {
    data: { requisitionItems: [{ productId: product.id, quantity: 4 }] },
  });
  expect(itemsRes.status()).toBe(200);

  await page.reload();
  await page.waitForSelector('[data-testid="requisition-items-table"]');
  await captureStep(page, FLOW, 'edit-with-item');
  await expect(page.locator('[data-testid="requisition-item-quantity-0"]')).toHaveValue('4');

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});

test('requisition/editHeader updates header fields via the React form', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-edit-header-react';
  await login(page);
  await skipUnlessBatch15(page);
  const requisitionId = await createRequisition(page);

  await page.goto(url(`/requisition/editHeader/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-name"]');
  await captureStep(page, FLOW, 'edit-header');

  const name = `ZZ header name ${runId()}`;
  await page.fill('[data-testid="requisition-name"]', name);
  await page.click('[data-testid="requisition-save-header-button"]');
  await page.waitForURL(/requisition\/edit\//);

  const res = await page.request.get(url(`/api/requisitions/${requisitionId}`));
  expect((await res.json()).data.name).toBe(name);

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});

test('requisition/pick moves the requisition to PICKING and shows pick table', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-pick-react';
  await login(page);
  await skipUnlessBatch15(page);
  const requisitionId = await createRequisition(page);

  const product = await seededProduct(page);
  const itemsRes = await page.request.post(url(`/api/requisitions/${requisitionId}/items`), {
    data: { requisitionItems: [{ productId: product.id, quantity: 2 }] },
  });
  expect(itemsRes.status()).toBe(200);
  const headerRes = await page.request.post(url(`/api/requisitions/${requisitionId}/header`), {
    data: { verifiedById: '1' },
  });
  expect(headerRes.status()).toBe(200);

  await page.goto(url(`/requisition/pick/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-pick-table"]');
  await captureStep(page, FLOW, 'pick');

  const res = await page.request.get(url(`/api/requisitions/${requisitionId}`));
  expect((await res.json()).data.status).toBe('PICKING');
  await expect(page.locator('[data-testid="requisition-pick-table"]')).toContainText(product.productCode);

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});
