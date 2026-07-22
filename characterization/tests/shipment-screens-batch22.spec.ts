import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, runId, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 22: migrated classic shipping screens.
 *
 * Exercises the React screens that replaced the legacy shipment GSPs
 * (shipment/list, shipment/showDetails, shipment/showPackingList,
 * shipment/receiveShipment, shipment/sendShipment, shipmentItem/create),
 * asserting against the same REST endpoints the screens consume.
 */

// The pinned released image (characterization job) predates the Batch 22
// endpoints/screens; these tests run against source builds.
async function skipUnlessBatch22(page): Promise<void> {
  const res = await page.request.get(url('/api/shipments/listOptions'));
  test.skip(res.status() === 404, 'Batch 22 endpoints not present in target build');
}

async function locationId(page, name: string): Promise<string> {
  const res = await page.request.get(url('/api/locations'));
  expect(res.status()).toBe(200);
  const match = (await res.json()).data.find((loc) => loc.name === name);
  expect(match, `Location not found in seeded data: ${name}`).toBeTruthy();
  return match.id;
}

async function createShipment(page): Promise<string> {
  const optionsRes = await page.request.get(url('/api/shipments/wizardOptions'));
  expect(optionsRes.status()).toBe(200);
  const options = (await optionsRes.json()).data;
  const res = await page.request.post(url('/api/shipments'), {
    data: {
      name: `ZZ characterization batch22 ${runId()}`,
      shipmentTypeId: options.shipmentTypes[0].id,
      originId: await locationId(page, LOCATIONS.mainSupplier.name),
      destinationId: LOCATIONS.mainWarehouse.id,
      expectedShippingDate: '2026-07-01',
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id;
}

async function addShipmentItem(page, shipmentId: string, quantity: number): Promise<void> {
  const productsRes = await page.request.get(
    url(`/api/products?q=${encodeURIComponent(PRODUCTS.lamivudine.name)}`),
  );
  expect(productsRes.status()).toBe(200);
  const product = (await productsRes.json()).data[0];
  expect(product, `Seeded product not found: ${PRODUCTS.lamivudine.name}`).toBeTruthy();

  const searchRes = await page.request.post(url('/api/generic/inventoryItem/search'), {
    data: {
      searchAttributes: [
        { property: 'product.id', operator: 'eq', value: product.id },
      ],
    },
  });
  expect(searchRes.status()).toBe(200);
  const inventoryItem = (await searchRes.json()).data[0];
  expect(inventoryItem, 'Seeded inventory item not found').toBeTruthy();

  const res = await page.request.post(url(`/api/shipments/${shipmentId}/items`), {
    data: { inventoryItemId: inventoryItem.id, quantity },
  });
  expect(res.status()).toBe(201);
}

async function deleteShipment(page, shipmentId: string): Promise<void> {
  await page.request.delete(url(`/api/shipments/${shipmentId}/receipt`));
  const packingRes = await page.request.get(url(`/api/shipments/${shipmentId}/packing`));
  if (packingRes.status() !== 200) return;
  const packing = (await packingRes.json()).data;
  for (const item of packing.unpackedItems) {
    await page.request.delete(url(`/api/shipments/${shipmentId}/items/${item.id}`));
  }
  for (const container of packing.containers) {
    await page.request.delete(
      url(`/api/shipments/${shipmentId}/containers/${container.id}?deleteItems=true`),
    );
  }
  await page.request.delete(url(`/api/generic/shipment/${shipmentId}`));
}

test('shipment/list renders the React list with the seeded incoming shipments', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-list-react';
  await login(page);
  await skipUnlessBatch22(page);
  const shipmentId = await createShipment(page);

  await page.goto(url('/shipment/list?type=incoming'));
  await page.waitForSelector('[data-testid="shipment-list"]');
  await captureStep(page, FLOW, 'list');

  await expect(page.locator('[data-testid="shipment-list-filters"]')).toBeVisible();

  // Row parity against the API the screen consumes.
  const res = await page.request.get(url('/api/shipments?type=incoming'));
  expect(res.status()).toBe(200);
  const shipments = (await res.json()).data.shipments;
  await expect(page.locator('[data-testid="shipment-list-row"]')).toHaveCount(shipments.length);
  expect(shipments.map((s) => s.id)).toContain(shipmentId);

  await deleteShipment(page, shipmentId);
});

test('shipment/showDetails renders the React screen with contents and comments', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-show-details-react';
  await login(page);
  await skipUnlessBatch22(page);
  const shipmentId = await createShipment(page);
  await addShipmentItem(page, shipmentId, 4);

  await page.goto(url(`/shipment/showDetails/${shipmentId}`));
  await page.waitForSelector('[data-testid="shipment-show-details"]');
  await captureStep(page, FLOW, 'show-details');

  await expect(page.locator('[data-testid="shipment-show-shipment-number"]')).toBeVisible();
  const rows = page.locator('[data-testid="shipment-show-contents-row"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('4');

  await deleteShipment(page, shipmentId);
});

test('shipment/showPackingList renders the React packing list', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-packing-list-react';
  await login(page);
  await skipUnlessBatch22(page);
  const shipmentId = await createShipment(page);
  await addShipmentItem(page, shipmentId, 4);

  await page.goto(url(`/shipment/showPackingList/${shipmentId}`));
  await page.waitForSelector('[data-testid="shipment-packing-list"]');
  await captureStep(page, FLOW, 'packing-list');

  const rows = page.locator('[data-testid="shipment-packing-list-row"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('4');

  await deleteShipment(page, shipmentId);
});

test('shipment/receiveShipment renders the React receipt items', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'receive-shipment-react';
  await login(page);
  await skipUnlessBatch22(page);
  const shipmentId = await createShipment(page);
  await addShipmentItem(page, shipmentId, 4);

  await page.goto(url(`/shipment/receiveShipment/${shipmentId}`));
  await page.waitForSelector('[data-testid="receive-shipment"]');
  await captureStep(page, FLOW, 'receive');

  const rows = page.locator('[data-testid="receive-shipment-item-row"]');
  await expect(rows).toHaveCount(1);
  await expect(page.locator('[data-testid="receive-shipment-receive-button"]')).toBeVisible();

  await deleteShipment(page, shipmentId);
});

test('shipment/sendShipment renders the React send screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'send-shipment-react';
  await login(page);
  await skipUnlessBatch22(page);
  const shipmentId = await createShipment(page);
  await addShipmentItem(page, shipmentId, 4);

  await page.goto(url(`/shipment/sendShipment/${shipmentId}`));
  await page.waitForSelector('[data-testid="send-shipment"]');
  await captureStep(page, FLOW, 'send');

  await expect(page.locator('[data-testid="send-shipment-origin"]'))
    .toContainText(LOCATIONS.mainSupplier.name);
  const rows = page.locator('[data-testid="send-shipment-items"] tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(page.locator('[data-testid="send-shipment-send-button"]')).toBeVisible();

  await deleteShipment(page, shipmentId);
});

test('shipmentItem/create renders the React admin create screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-item-create-react';
  await login(page);
  await skipUnlessBatch22(page);

  await page.goto(url('/shipmentItem/create'));
  await page.waitForSelector('[data-testid="shipment-item-create"]');
  await captureStep(page, FLOW, 'create');

  await expect(page.locator('[data-testid="shipment-item-shipment-select"]')).toBeVisible();
  await expect(page.locator('[data-testid="shipment-item-product-select"]')).toBeVisible();
  await expect(page.locator('[data-testid="shipment-item-create-button"]')).toBeVisible();
});
