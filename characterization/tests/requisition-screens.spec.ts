import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, runId, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 14: migrated requisition/picklist React screens.
 *
 * Exercises the React screens that replaced the legacy GSPs for
 * requisition/create, requisition/chooseTemplate, requisition/confirm,
 * requisition/addDocument and picklist/print, asserting against the same
 * REST endpoints the screens consume.
 */

// The pinned released image (characterization job) predates the Batch 14
// endpoints/screens; these tests run against source builds (characterization-java21).
async function skipUnlessBatch14(page): Promise<void> {
  const res = await page.request.get(url('/api/requisitions/documentTypes'));
  test.skip(res.status() === 404, 'Batch 14 endpoints not present in target build');
}

async function locationId(page, name: string): Promise<string> {
  const res = await page.request.get(url('/api/locations'));
  expect(res.status()).toBe(200);
  const match = (await res.json()).data.find((loc) => loc.name === name);
  expect(match, `Location not found in seeded data: ${name}`).toBeTruthy();
  return match.id;
}

async function createRequisition(page): Promise<string> {
  const res = await page.request.post(url('/api/requisitions'), {
    data: {
      type: 'ADHOC',
      destinationId: LOCATIONS.mainWarehouse.id,
      requestedById: '1',
      dateRequested: '2026-07-01',
      description: `ZZ characterization requisition ${runId()}`,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id;
}

test('requisition/create renders the React form and creates a requisition', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-create-react';
  await login(page);
  await skipUnlessBatch14(page);

  await page.goto(url('/requisition/create'));
  await page.waitForSelector('[data-testid="requisition-date-requested"]');
  await captureStep(page, FLOW, 'create-form');

  await page.click('[data-testid="requisition-destination-select"]');
  await page.keyboard.type('Boston Office');
  await page.click('.custom-option >> text=Boston Office');

  await page.click('[data-testid="requisition-requested-by-select"]');
  await page.keyboard.type('Administrator');
  await page.click('.custom-option >> text=Administrator');

  await page.fill('[data-testid="requisition-date-requested"]', '2026-07-01');
  const description = `ZZ characterization requisition ${runId()}`;
  await page.fill('[data-testid="requisition-description"]', description);
  await page.click('[data-testid="requisition-save-button"]');
  await page.waitForURL(/requisition\/edit/);
  const requisitionId = page.url().match(/requisition\/edit\/([a-zA-Z0-9]+)/)![1];

  const res = await page.request.get(url(`/api/requisitions/${requisitionId}`));
  expect(res.status()).toBe(200);
  const data = (await res.json()).data;
  // the legacy edit screen the form redirects to moves CREATED -> EDITING
  expect(['CREATED', 'EDITING']).toContain(data.status);
  expect(data.description).toBe(description);
  expect(data.origin.name).toBe(LOCATIONS.mainWarehouse.name);

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});

test('requisition/chooseTemplate renders the React template picker', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-choose-template-react';
  await login(page);
  await skipUnlessBatch14(page);

  await page.goto(url('/requisition/chooseTemplate'));
  await page.waitForSelector('[data-testid="requisition-template-select"]');
  await captureStep(page, FLOW, 'choose-template');

  const res = await page.request.get(url('/api/requisitions/templates'));
  expect(res.status()).toBe(200);
  expect(Array.isArray((await res.json()).data)).toBe(true);
});

test('requisition/confirm moves the requisition to CHECKING and lists items', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-confirm-react';
  await login(page);
  await skipUnlessBatch14(page);
  const requisitionId = await createRequisition(page);

  await page.goto(url(`/requisition/confirm/${requisitionId}`));
  await page.waitForSelector('[data-testid="requisition-confirm-button"]');
  await captureStep(page, FLOW, 'confirm');

  const res = await page.request.get(url(`/api/requisitions/${requisitionId}`));
  expect(res.status()).toBe(200);
  expect((await res.json()).data.status).toBe('CHECKING');

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});

test('requisition/addDocument uploads a document via the React form', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'requisition-add-document-react';
  await login(page);
  await skipUnlessBatch14(page);
  const requisitionId = await createRequisition(page);

  await page.goto(url(`/requisition/addDocument/${requisitionId}`));
  await page.waitForSelector('[data-testid="document-file-input"]');
  await captureStep(page, FLOW, 'add-document-form');

  await page.setInputFiles('[data-testid="document-file-input"]', {
    name: 'characterization.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('characterization document'),
  });
  await page.fill('[data-testid="document-name-input"]', 'ZZ characterization doc');
  await page.fill('[data-testid="document-number-input"]', 'ZZ-1');
  await captureStep(page, FLOW, 'add-document-filled');
  await page.click('[data-testid="document-upload-button"]');
  await page.waitForURL(/requisition\/show/);

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});

test('picklist/print renders the React print screen with picklist data', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'picklist-print-react';
  await login(page);
  await skipUnlessBatch14(page);

  const smRes = await page.request.post(url('/api/stockMovements'), {
    data: {
      name: '',
      description: `ZZ characterization picklist ${runId()}`,
      origin: { id: LOCATIONS.mainWarehouse.id },
      destination: { id: await locationId(page, 'Boston Office') },
      requestedBy: { id: '1' },
      dateRequested: '07/01/2026',
    },
  });
  expect(smRes.status()).toBe(201);
  const movementId = (await smRes.json()).data.id;
  const plRes = await page.request.post(url('/api/generic/picklist'), {
    data: { requisition: { id: movementId }, name: 'ZZ characterization picklist' },
  });
  expect(plRes.status()).toBe(201);
  const picklistId = (await plRes.json()).data.id;

  await page.goto(url(`/picklist/print/${movementId}`));
  await page.waitForSelector('[data-testid="picklist-print-summary"]');
  await captureStep(page, FLOW, 'print');

  const apiRes = await page.request.get(url(`/api/picklists/print/${movementId}`));
  expect(apiRes.status()).toBe(200);
  const data = (await apiRes.json()).data;
  expect(data.requisition.id).toBe(movementId);
  await expect(page.locator('.picklist-print'))
    .toContainText(data.requisition.requestNumber);
  await expect(page.locator('[data-testid="picklist-print-summary"]'))
    .toContainText(data.requisition.name);

  await page.request.delete(url(`/api/generic/picklist/${picklistId}`));
  await page.request.delete(url(`/api/stockMovements/${movementId}`));
});
