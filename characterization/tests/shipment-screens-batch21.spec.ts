import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, runId, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 21: migrated shipment screens (addComment, addDocument,
 * addToShipment, deleteShipment, editEvent) and returns/show.
 *
 * Exercises the React screens that replaced the legacy shipment GSPs,
 * asserting against the same REST endpoints the screens consume.
 */

// The pinned released image (characterization job) predates the Batch 21
// endpoints/screens; these tests run against source builds.
async function skipUnlessBatch21(page): Promise<void> {
  const res = await page.request.get(url('/api/shipments/eventOptions'));
  test.skip(res.status() === 404, 'Batch 21 endpoints not present in target build');
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
      name: `ZZ characterization batch21 ${runId()}`,
      shipmentTypeId: options.shipmentTypes[0].id,
      originId: LOCATIONS.mainWarehouse.id,
      destinationId: await locationId(page, LOCATIONS.bostonWarehouse.name),
      expectedShippingDate: '2026-08-01',
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id;
}

async function deleteShipment(page, shipmentId: string): Promise<void> {
  await page.request.delete(url(`/api/shipments/${shipmentId}`));
}

async function seededProduct(page): Promise<{ id: string; productCode: string }> {
  const res = await page.request.get(
    url(`/api/products?q=${encodeURIComponent(PRODUCTS.lamivudine.name)}`),
  );
  expect(res.status()).toBe(200);
  const products = (await res.json()).data;
  const product = products.find((p) => p.name === PRODUCTS.lamivudine.name) ?? products[0];
  expect(product, `Seeded product not found: ${PRODUCTS.lamivudine.name}`).toBeTruthy();
  return product;
}

test('shipment/addComment renders the React screen and saves a comment', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-add-comment-react';
  await login(page);
  await skipUnlessBatch21(page);
  const shipmentId = await createShipment(page);

  await page.goto(url(`/shipment/addComment/${shipmentId}`));
  await page.waitForSelector('[data-testid="comment-text-input"]');
  await captureStep(page, FLOW, 'add-comment');

  // sender defaults to the logged-in user, like the legacy GSP
  await expect(page.locator('[data-testid="comment-sender-input"]')).toBeVisible();
  await page.fill('[data-testid="comment-text-input"]', 'ZZ batch21 comment');
  await page.click('[data-testid="comment-save-button"]');
  await page.waitForURL(/shipment\/showDetails/);

  // the showDetails screen renders the saved comment on its Comments tab
  await page.click('[data-testid="shipment-show-tab-comments"]');
  await expect(page.locator('body')).toContainText('ZZ batch21 comment');
  await captureStep(page, FLOW, 'show-details-after-save');

  await deleteShipment(page, shipmentId);
});

test('shipment/addDocument renders the React screen and uploads a URL document', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-add-document-react';
  await login(page);
  await skipUnlessBatch21(page);
  const shipmentId = await createShipment(page);

  await page.goto(url(`/shipment/addDocument/${shipmentId}`));
  await page.waitForSelector('[data-testid="document-url-input"]');
  await captureStep(page, FLOW, 'add-document');

  await page.fill('[data-testid="document-url-input"]', 'https://example.com/zz-batch21-doc');
  await page.fill('[data-testid="document-name-input"]', 'ZZ batch21 document');
  await page.fill('[data-testid="document-number-input"]', 'ZZ-21');
  await page.click('[data-testid="document-upload-button"]');
  await page.waitForURL(/shipment\/showDetails/);

  const res = await page.request.get(url(`/api/shipments/${shipmentId}`));
  expect(res.status()).toBe(200);
  await captureStep(page, FLOW, 'show-details-after-upload');

  await deleteShipment(page, shipmentId);
});

test('shipment/deleteShipment renders the React confirmation and deletes', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-delete-react';
  await login(page);
  await skipUnlessBatch21(page);
  const shipmentId = await createShipment(page);

  await page.goto(url(`/shipment/deleteShipment/${shipmentId}`));
  await page.waitForSelector('[data-testid="delete-shipment-button"]');
  await captureStep(page, FLOW, 'delete-confirmation');

  await expect(page.locator('[data-testid="shipment-name"]'))
    .toContainText('ZZ characterization batch21');
  await page.click('[data-testid="delete-shipment-button"]');
  await page.waitForURL(/dashboard/);

  const res = await page.request.get(url(`/api/shipments/${shipmentId}`));
  expect(res.status()).toBe(404);
});

test('shipment/addEvent and editEvent render the React screen and save', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-edit-event-react';
  await login(page);
  await skipUnlessBatch21(page);
  const shipmentId = await createShipment(page);

  // add a new event through the React screen
  await page.goto(url(`/shipment/addEvent/${shipmentId}`));
  await page.waitForSelector('[data-testid="event-date-input"]');
  await captureStep(page, FLOW, 'add-event');

  await page.fill('[data-testid="event-date-input"]', '2026-08-02T10:30');
  await page.click('[data-testid="event-save-button"]');
  await page.waitForURL(/shipment\/showDetails/);

  const optionsRes = await page.request.get(url('/api/shipments/eventOptions'));
  const eventTypeId = (await optionsRes.json()).data.eventTypes[0].id;
  const createRes = await page.request.post(url(`/api/shipments/${shipmentId}/events`), {
    data: { eventTypeId, eventDate: '2026-08-03 08:00' },
  });
  expect(createRes.status()).toBe(201);
  const eventId = (await createRes.json()).data.id;

  // edit the existing event: the event type is read-only, like the legacy GSP
  await page.goto(url(`/shipment/editEvent/${eventId}?shipmentId=${shipmentId}`));
  await page.waitForSelector('[data-testid="event-type-display"]');
  await captureStep(page, FLOW, 'edit-event');

  await expect(page.locator('[data-testid="event-date-input"]')).toHaveValue('2026-08-03T08:00');
  await page.fill('[data-testid="event-date-input"]', '2026-08-04T09:15');
  await page.click('[data-testid="event-save-button"]');
  await page.waitForURL(/shipment\/showDetails/);

  const eventRes = await page.request.get(url(`/api/shipments/${shipmentId}/events/${eventId}`));
  expect((await eventRes.json()).data.eventDate).toBe('2026-08-04 09:15');

  await deleteShipment(page, shipmentId);
});

test('shipment/addToShipment renders candidate items and adds them', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'shipment-add-to-shipment-react';
  await login(page);
  await skipUnlessBatch21(page);
  const shipmentId = await createShipment(page);
  const product = await seededProduct(page);

  const candidatesRes = await page.request.get(
    url(`/api/shipments/addToShipmentCandidates?product.id=${product.id}`),
  );
  expect(candidatesRes.status()).toBe(200);
  const candidates = (await candidatesRes.json()).data;
  expect(candidates.items.length).toBeGreaterThan(0);

  await page.goto(url(`/shipment/addToShipment?product.id=${product.id}`));
  await page.waitForSelector('[data-testid="add-to-shipment-items"]');
  await captureStep(page, FLOW, 'add-to-shipment');

  // same rows the API reports for the selected product
  const rows = page.locator('[data-testid="add-to-shipment-item-row"]');
  await expect(rows).toHaveCount(candidates.items.length);
  await expect(rows.first().locator('[data-testid="item-product"]'))
    .toContainText(PRODUCTS.lamivudine.name);

  await deleteShipment(page, shipmentId);
});

test('returns/show renders the React stock movement show screen', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'returns-show-react';
  await login(page);
  await skipUnlessBatch21(page);

  // find an order-based (return) stock movement in the seeded data; the
  // legacy /returns/show GSP was only rendered for order-based movements
  const listRes = await page.request.get(
    url(`/api/stockMovements?direction=OUTBOUND&origin=${LOCATIONS.mainWarehouse.id}&max=50`),
  );
  expect(listRes.status()).toBe(200);
  const movements = (await listRes.json()).data;
  let orderBased = null;
  for (const movement of movements) {
    const res = await page.request.get(url(`/api/stockMovements/${movement.id}/returnsShow`));
    if (res.status() !== 200) continue;
    const details = (await res.json()).data;
    if (details.order) {
      orderBased = details;
      break;
    }
  }
  test.skip(!orderBased, 'No order-based (return) stock movement in seeded data');

  await page.goto(url(`/stockMovement/show/${orderBased.id}`));
  await page.waitForSelector('[data-testid="returns-show-details"]');
  await captureStep(page, FLOW, 'returns-show');

  await expect(page.locator('[data-testid="details-identifier"]'))
    .toContainText(orderBased.identifier);
  await expect(page.locator('[data-testid="details-origin"]'))
    .toContainText(orderBased.origin.name);
  const rows = page.locator('[data-testid="packing-list-row"]');
  await expect(rows).toHaveCount(orderBased.packingList.length);
});
