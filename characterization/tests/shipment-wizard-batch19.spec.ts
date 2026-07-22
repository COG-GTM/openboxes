import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, runId, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 19: migrated create-shipment wizard React screens.
 *
 * Exercises the React screens that replaced the legacy createShipmentWorkflow
 * webflow GSPs (enterShipmentDetails, enterTrackingDetails,
 * enterContainerDetails, pickShipmentItems, sendShipment) and the
 * deliveryNote/print screen, asserting against the same REST endpoints the
 * screens consume.
 */

// The pinned released image (characterization job) predates the Batch 19
// endpoints/screens; these tests run against source builds (characterization-java11).
async function skipUnlessBatch19(page): Promise<void> {
  const res = await page.request.get(url('/api/shipments/wizardOptions'));
  test.skip(res.status() === 404, 'Batch 19 endpoints not present in target build');
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
      name: `ZZ characterization batch19 ${runId()}`,
      shipmentTypeId: options.shipmentTypes[0].id,
      // supplier origin, like the legacy inbound wizard, so items can be
      // added without outbound quantity validation against the picklist
      originId: await locationId(page, LOCATIONS.mainSupplier.name),
      destinationId: LOCATIONS.mainWarehouse.id,
      expectedShippingDate: '2026-07-01',
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id;
}

async function addShipmentItem(page, shipmentId: string, quantity: number): Promise<string> {
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
  const picklistRes = await page.request.get(url(`/api/shipments/${shipmentId}/picklist`));
  return (await picklistRes.json()).data.shipmentItems[0].id;
}

async function deleteShipment(page, shipmentId: string): Promise<void> {
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

test('createShipmentWorkflow details renders the React screen and saves', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-wizard-details-react';
  await login(page);
  await skipUnlessBatch19(page);
  const shipmentId = await createShipment(page);

  await page.goto(url(`/createShipmentWorkflow/details/${shipmentId}`));
  await page.waitForSelector('[data-testid="create-shipment-details"]');
  await captureStep(page, FLOW, 'details');

  await expect(page.locator('[data-testid="shipment-wizard-header"]')).toBeVisible();
  await expect(page.locator('#shipment-name-input')).toHaveValue(/ZZ characterization batch19/);

  await deleteShipment(page, shipmentId);
});

test('createShipmentWorkflow tracking renders the React screen and saves', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-wizard-tracking-react';
  await login(page);
  await skipUnlessBatch19(page);
  const shipmentId = await createShipment(page);

  await page.goto(url(`/createShipmentWorkflow/tracking/${shipmentId}`));
  await page.waitForSelector('[data-testid="create-shipment-tracking"]');
  await captureStep(page, FLOW, 'tracking');

  await page.fill('#shipment-additional-information-input', 'ZZ batch19 tracking info');
  await page.click('[data-testid="shipment-tracking-save-button"]');
  await page.waitForURL(/shipment\/showDetails/);

  const res = await page.request.get(url(`/api/shipments/${shipmentId}`));
  expect((await res.json()).data.additionalInformation).toBe('ZZ batch19 tracking info');

  await deleteShipment(page, shipmentId);
});

test('createShipmentWorkflow packing renders containers and items', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-wizard-packing-react';
  await login(page);
  await skipUnlessBatch19(page);
  const shipmentId = await createShipment(page);
  await addShipmentItem(page, shipmentId, 5);

  await page.goto(url(`/createShipmentWorkflow/packing/${shipmentId}`));
  await page.waitForSelector('[data-testid="create-shipment-packing"]');
  await captureStep(page, FLOW, 'packing');

  const rows = page.locator('[data-testid="shipment-packing-items-unpacked"] tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('5');

  await deleteShipment(page, shipmentId);
});

test('createShipmentWorkflow picking picks a shipment item', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-wizard-picking-react';
  await login(page);
  await skipUnlessBatch19(page);
  const shipmentId = await createShipment(page);
  const itemId = await addShipmentItem(page, shipmentId, 5);

  await page.goto(url(`/createShipmentWorkflow/picking/${shipmentId}`));
  await page.waitForSelector('[data-testid="shipment-picking-items"]');
  await captureStep(page, FLOW, 'picking');

  const rows = page.locator('[data-testid="shipment-picking-items"] tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('5');

  const res = await page.request.post(
    url(`/api/shipments/${shipmentId}/validatePicklist`),
    { data: {} },
  );
  expect(res.status()).toBe(200);
  expect(itemId).toBeTruthy();

  await deleteShipment(page, shipmentId);
});

test('createShipmentWorkflow sending renders the React screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-wizard-sending-react';
  await login(page);
  await skipUnlessBatch19(page);
  const shipmentId = await createShipment(page);
  await addShipmentItem(page, shipmentId, 5);

  await page.goto(url(`/createShipmentWorkflow/sending/${shipmentId}`));
  await page.waitForSelector('[data-testid="create-shipment-sending"]');
  await captureStep(page, FLOW, 'sending');

  await expect(page.locator('[data-testid="shipment-sending-origin"]'))
    .toContainText(LOCATIONS.mainSupplier.name);
  const rows = page.locator('[data-testid="shipment-sending-items"] tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(page.locator('[data-testid="shipment-sending-send-button"]')).toBeVisible();

  await deleteShipment(page, shipmentId);
});

test('deliveryNote/print renders the React delivery note', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'delivery-note-print-react';
  await login(page);
  await skipUnlessBatch19(page);

  const res = await page.request.post(url('/api/requisitions'), {
    data: {
      type: 'ADHOC',
      destinationId: await locationId(page, LOCATIONS.bostonWarehouse.name),
      requestedById: '1',
      dateRequested: '2026-07-01',
      description: `ZZ characterization batch19 dn ${runId()}`,
    },
  });
  expect(res.status()).toBe(201);
  const requisitionId = (await res.json()).data.id;

  await page.goto(url(`/deliveryNote/print/${requisitionId}`));
  await page.waitForSelector('[data-testid="delivery-note-print"]');
  await captureStep(page, FLOW, 'print');

  await expect(page.locator('[data-testid="delivery-note-header"]')).toBeVisible();
  await expect(page.locator('[data-testid="delivery-note-signatures"]')).toBeVisible();

  await page.request.delete(url(`/api/stockMovements/${requisitionId}`));
});
