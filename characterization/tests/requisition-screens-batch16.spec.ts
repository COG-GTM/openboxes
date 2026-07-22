import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, runId, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 16: migrated classic requisition flow React screens.
 *
 * Exercises the React screens that replaced the legacy GSPs for
 * requisition/show, requisition/review, requisition/process,
 * requisition/transfer, requisition/printDraft and requisitionItem/change,
 * asserting against the same REST endpoints the screens consume.
 */

// The pinned released image (characterization job) predates the Batch 16
// endpoints/screens; these tests run against source builds (characterization-java11).
async function skipUnlessBatch16(page): Promise<void> {
  const res = await page.request.get(url('/api/requisitions/documentTypes'));
  test.skip(res.status() === 404, 'Batch 16 endpoints not present in target build');
}

const QTY = 5;

async function locationId(page, name: string): Promise<string> {
  const res = await page.request.get(url('/api/locations'));
  expect(res.status()).toBe(200);
  const match = (await res.json()).data.find((loc) => loc.name === name);
  expect(match, `Location not found in seeded data: ${name}`).toBeTruthy();
  return match.id;
}

async function createRequisitionWithItem(page): Promise<{ requisitionId: string; itemId: string }> {
  const res = await page.request.post(url('/api/requisitions'), {
    data: {
      type: 'ADHOC',
      destinationId: await locationId(page, LOCATIONS.bostonWarehouse.name),
      requestedById: '1',
      dateRequested: '2026-07-01',
      description: `ZZ characterization batch16 ${runId()}`,
    },
  });
  expect(res.status()).toBe(201);
  const requisitionId = (await res.json()).data.id;

  const productsRes = await page.request.get(
    url(`/api/products?q=${encodeURIComponent(PRODUCTS.lamivudine.name)}`),
  );
  expect(productsRes.status()).toBe(200);
  const product = (await productsRes.json()).data[0];
  expect(product, `Seeded product not found: ${PRODUCTS.lamivudine.name}`).toBeTruthy();

  const itemsRes = await page.request.post(url(`/api/stockMovements/${requisitionId}/updateItems`), {
    data: {
      id: requisitionId,
      lineItems: [
        { product: { id: product.id }, quantityRequested: String(QTY), sortOrder: 100 },
      ],
    },
  });
  expect(itemsRes.status()).toBe(200);
  const itemId = (await itemsRes.json()).data.lineItems[0].id;
  return { requisitionId, itemId };
}

async function deleteRequisition(page, requisitionId: string): Promise<void> {
  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
}

test('requisition/show renders the React screen with requisition items', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-show-react';
  await login(page);
  await skipUnlessBatch16(page);
  const { requisitionId } = await createRequisitionWithItem(page);

  await page.goto(url(`/requisition/show/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-show-items"]');
  await captureStep(page, FLOW, 'show');

  const rows = page.locator('[data-testid="requisition-show-items"] tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(String(QTY));

  await deleteRequisition(page, requisitionId);
});

test('requisition/review renders the React screen and moves status to VERIFYING', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-review-react';
  await login(page);
  await skipUnlessBatch16(page);
  const { requisitionId } = await createRequisitionWithItem(page);

  await page.goto(url(`/requisition/review/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-review-items"]');
  await captureStep(page, FLOW, 'review');

  const rows = page.locator('[data-testid="requisition-review-items"] tbody tr');
  await expect(rows).toHaveCount(1);

  const res = await page.request.get(url(`/api/requisitions/${requisitionId}`));
  expect((await res.json()).data.status).toBe('VERIFYING');

  await deleteRequisition(page, requisitionId);
});

test('requisitionItem/change renders the React screen and changes quantity', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-item-change-react';
  await login(page);
  await skipUnlessBatch16(page);
  const { requisitionId, itemId } = await createRequisitionWithItem(page);

  await page.goto(url(`/requisitionItem/change/${itemId}`));
  await page.waitForSelector('[data-testid="requisition-item-change-summary"]');
  await captureStep(page, FLOW, 'change-form');

  await expect(page.locator('[data-testid="requisition-item-quantity-requested"]'))
    .toHaveText(String(QTY));

  await page.fill('[data-testid="requisition-item-quantity"]', '3');
  await page.selectOption('[data-testid="requisition-item-reason-code"]', 'Stock out');
  await page.click('[data-testid="requisition-item-save-button"]');
  await page.waitForURL(/requisition\/review/);
  await captureStep(page, FLOW, 'after-change');

  const res = await page.request.get(url(`/api/requisitionItems/${itemId}`));
  const data = (await res.json()).data;
  expect(data.isChanged).toBe(true);
  expect(data.cancelReasonCode).toBe('Stock out');

  await deleteRequisition(page, requisitionId);
});

test('requisition/process renders the React picking screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-process-react';
  await login(page);
  await skipUnlessBatch16(page);
  const { requisitionId } = await createRequisitionWithItem(page);

  await page.goto(url(`/requisition/process/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-process-items"]');
  await captureStep(page, FLOW, 'process');

  await expect(page.locator('[data-testid="requisition-process-items"]'))
    .toContainText(`Requested: ${QTY}`);

  await deleteRequisition(page, requisitionId);
});

test('requisition/transfer renders the React transfer screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-transfer-react';
  await login(page);
  await skipUnlessBatch16(page);
  const { requisitionId } = await createRequisitionWithItem(page);

  await page.goto(url(`/requisition/transfer/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-transfer-items"]');
  await captureStep(page, FLOW, 'transfer');

  await expect(page.locator('[data-testid="requisition-transfer-finish-button"]')).toBeVisible();

  await deleteRequisition(page, requisitionId);
});

test('requisition/printDraft renders the React print draft', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-print-draft-react';
  await login(page);
  await skipUnlessBatch16(page);
  const { requisitionId } = await createRequisitionWithItem(page);

  await page.goto(url(`/requisition/printDraft/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-print-draft-items"]');
  await captureStep(page, FLOW, 'print-draft');

  const rows = page.locator('[data-testid="requisition-print-draft-items"] tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(String(QTY));

  await deleteRequisition(page, requisitionId);
});
