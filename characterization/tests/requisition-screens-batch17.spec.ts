import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { PRODUCTS, runId, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 17: migrated requisition template (stock list) and canceled
 * requisition item React screens.
 *
 * Exercises the React screens that replaced the legacy GSPs for
 * requisitionItem/list and requisitionTemplate/{create,edit,editHeader,
 * batch,sendMail}, asserting against the same REST endpoints the screens
 * consume.
 */

// The pinned released image (characterization job) predates the Batch 17
// endpoints/screens; these tests run against source builds (characterization-java11).
async function skipUnlessBatch17(page): Promise<void> {
  const res = await page.request.get(url('/api/requisitionItems'));
  test.skip(res.status() !== 200, 'Batch 17 endpoints not present in target build');
}

async function locationId(page, name: string): Promise<string> {
  const res = await page.request.get(url('/api/locations'));
  expect(res.status()).toBe(200);
  const match = (await res.json()).data.find((l) => l.name === name);
  expect(match, `Location not found in seeded data: ${name}`).toBeTruthy();
  return match.id;
}

// Demo product codes are randomized per seed, so resolve by the stable name.
async function seededProduct(page): Promise<{ id: string, productCode: string, name: string }> {
  const name = PRODUCTS.lamivudine.name;
  const res = await page.request.get(
    url(`/api/products/search?name=${encodeURIComponent(name)}`),
  );
  expect(res.status()).toBe(200);
  const match = (await res.json()).data.find((p) => p.name === name);
  expect(match, `Product not found in seeded data: ${name}`).toBeTruthy();
  return { id: match.id, productCode: match.productCode, name: match.name };
}

async function createTemplate(page, name: string): Promise<string> {
  const res = await page.request.post(url('/api/requisitionTemplates'), {
    data: {
      type: 'STOCK',
      name,
      originId: '1',
      destinationId: await locationId(page, 'Boston Office'),
      requestedById: '1',
      replenishmentTypeCode: 'PUSH',
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id;
}

test('requisitionItem/list renders the React canceled items list', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-item-list-react';
  await login(page);
  await skipUnlessBatch17(page);

  await page.goto(url('/requisitionItem/list'));
  await page.waitForSelector('[data-testid="requisition-item-list-table"]');
  await captureStep(page, FLOW, 'list');

  const res = await page.request.get(url('/api/requisitionItems'));
  expect(res.status()).toBe(200);
  const body = await res.json();
  await expect(page.locator('[data-testid="requisition-item-total-count"]'))
    .toContainText(String(body.totalCount));
});

test('requisitionTemplate/create creates a stock list via the React form', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'stocklist-template-create-react';
  await login(page);
  await skipUnlessBatch17(page);

  await page.goto(url('/requisitionTemplate/create'));
  await page.waitForSelector('[data-testid="stocklist-template-name-input"]');
  await captureStep(page, FLOW, 'create-form');

  const name = `ZZ characterization template ${runId()}`;
  await page.fill('[data-testid="stocklist-template-name-input"]', name);

  await page.click('[data-testid="stocklist-template-destination-select"]');
  await page.keyboard.type('Boston Office');
  await page.click('.custom-option >> text=Boston Office');

  await page.click('[data-testid="stocklist-template-requested-by-select"]');
  await page.keyboard.type('Administrator');
  await page.click('.custom-option >> text=Administrator');

  await captureStep(page, FLOW, 'create-filled');
  await page.click('[data-testid="stocklist-template-save-button"]');
  await page.waitForURL(/requisitionTemplate\/edit\//);
  const templateId = page.url().match(/requisitionTemplate\/edit\/([a-zA-Z0-9]+)/)![1];

  const res = await page.request.get(url(`/api/requisitionTemplates/${templateId}`));
  expect(res.status()).toBe(200);
  const data = (await res.json()).data;
  expect(data.name).toBe(name);
  expect(data.isTemplate).toBe(true);

  await page.request.delete(url(`/api/stocklists/${templateId}`));
});

test('requisitionTemplate/edit adds items via the React screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'stocklist-template-edit-react';
  await login(page);
  await skipUnlessBatch17(page);
  const templateId = await createTemplate(page, `ZZ characterization template ${runId()}`);
  const product = await seededProduct(page);

  const addRes = await page.request.post(url(`/api/requisitionTemplates/${templateId}/items`), {
    data: { productId: product.id, quantity: 4 },
  });
  expect(addRes.status()).toBe(200);

  await page.goto(url(`/requisitionTemplate/edit/${templateId}`));
  await page.waitForSelector('[data-testid="stocklist-template-items-table"]');
  await captureStep(page, FLOW, 'edit-items');

  await expect(page.locator('[data-testid="stocklist-template-items-table"]'))
    .toContainText(product.productCode);
  await expect(page.locator('[data-testid="stocklist-template-item-quantity-0"]')).toHaveValue('4');

  await page.request.delete(url(`/api/stocklists/${templateId}`));
});

test('requisitionTemplate/editHeader updates the header via the React form', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'stocklist-template-edit-header-react';
  await login(page);
  await skipUnlessBatch17(page);
  const templateId = await createTemplate(page, `ZZ characterization template ${runId()}`);

  await page.goto(url(`/requisitionTemplate/editHeader/${templateId}`));
  await page.waitForSelector('[data-testid="stocklist-template-name-input"]');
  await captureStep(page, FLOW, 'edit-header');

  const name = `ZZ template renamed ${runId()}`;
  await page.fill('[data-testid="stocklist-template-name-input"]', name);
  await page.click('[data-testid="stocklist-template-save-button"]');
  await page.waitForURL(/requisitionTemplate\/edit\//);

  const res = await page.request.get(url(`/api/requisitionTemplates/${templateId}`));
  expect((await res.json()).data.name).toBe(name);

  await page.request.delete(url(`/api/stocklists/${templateId}`));
});

test('requisitionTemplate/batch imports items via the React screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'stocklist-template-batch-react';
  await login(page);
  await skipUnlessBatch17(page);
  const templateId = await createTemplate(page, `ZZ characterization template ${runId()}`);
  const product = await seededProduct(page);

  await page.goto(url(`/requisitionTemplate/batch/${templateId}`));
  await page.waitForSelector('[data-testid="stocklist-template-import-text"]');
  await captureStep(page, FLOW, 'batch-form');

  await page.fill(
    '[data-testid="stocklist-template-import-text"]',
    `${product.productCode},${product.name},6,EA`,
  );
  await page.click('[data-testid="stocklist-template-parse-button"]');
  await page.waitForSelector('[data-testid="stocklist-template-import-preview-table"]');
  await captureStep(page, FLOW, 'batch-preview');
  await expect(page.locator('[data-testid="stocklist-template-import-preview-table"]'))
    .toContainText(product.productCode);

  await page.click('[data-testid="stocklist-template-import-button"]');

  await expect
    .poll(async () => {
      const res = await page.request.get(url(`/api/requisitionTemplates/${templateId}`));
      return (await res.json()).data.requisitionItems.length;
    })
    .toBe(1);
  const res = await page.request.get(url(`/api/requisitionTemplates/${templateId}`));
  expect((await res.json()).data.requisitionItems[0].quantity).toBe(6);

  await page.request.delete(url(`/api/stocklists/${templateId}`));
});

test('requisitionTemplate/sendMail renders the React email form', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'stocklist-template-send-mail-react';
  await login(page);
  await skipUnlessBatch17(page);
  const templateId = await createTemplate(page, `ZZ characterization template ${runId()}`);

  await page.goto(url(`/requisitionTemplate/sendMail/${templateId}`));
  await page.waitForSelector('[data-testid="stocklist-template-subject"]');
  await captureStep(page, FLOW, 'send-mail-form');

  await expect(page.locator('[data-testid="stocklist-template-subject"]'))
    .toHaveValue('STOCK LIST UPDATE');
  await expect(page.locator('[data-testid="stocklist-template-send-button"]')).toBeEnabled();

  await page.request.delete(url(`/api/stocklists/${templateId}`));
});
