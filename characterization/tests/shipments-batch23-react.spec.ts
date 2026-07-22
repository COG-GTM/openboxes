import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2 Batch 23: React shipmentItem screens (list/show/edit/pick/split)
 * and shipmentWorkflow/create.
 *
 * These screens only exist in source builds that include the React migration
 * (the pinned released image still serves the legacy GSPs), so the whole
 * suite skips itself when /shipmentItem/list does not serve the SPA.
 */

const WORKFLOW_NAME = 'ZZ char batch23 workflow';

async function isReactScreen(page: Page, path: string): Promise<boolean> {
  await page.goto(url(path));
  await page.waitForLoadState('domcontentloaded');
  return (await page.locator('#root').count()) > 0;
}

async function getShipmentItems(page: Page): Promise<any[]> {
  const items = await page.request
    .get(url('/api/shipmentItems?max=10&offset=0&sort=id&order=asc'))
    .then((r) => r.json());
  return items.data ?? [];
}

test.describe('shipments batch 23 React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    test.skip(
      !(await isReactScreen(page, '/shipmentItem/list')),
      'React batch 23 screens not present in this build (legacy GSP served)',
    );
  });

  test('shipment item list shows same rows as API', async ({ page }) => {
    const FLOW = 'shipment-item-list-react';
    await page.goto(url('/shipmentItem/list'));
    await page.waitForLoadState('networkidle');
    await captureStep(page, FLOW, 'list');

    const api = await page.request
      .get(url('/api/shipmentItems?max=10&offset=0&sort=id&order=asc'))
      .then((r) => r.json());
    const rows = page.locator('.rt-tbody .rt-td a');
    await expect(rows).toHaveCount(Math.min(api.data.length, 10));
    if (api.data.length) {
      await expect(rows.first()).toContainText(api.data[0].id);
    }
  });

  test('shipment item show displays item details', async ({ page }) => {
    const items = await getShipmentItems(page);
    test.skip(!items.length, 'no shipment items seeded');
    const FLOW = 'shipment-item-show-react';
    const item = items[0];

    await page.goto(url(`/shipmentItem/show/${item.id}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('shipment-item-details')).toContainText(item.id);
    if (item.quantity != null) {
      await expect(page.getByTestId('shipment-item-details')).toContainText(`${item.quantity}`);
    }
    await captureStep(page, FLOW, 'show');
  });

  test('shipment item edit loads values and updates lot number', async ({ page }) => {
    const items = await getShipmentItems(page);
    test.skip(!items.length, 'no shipment items seeded');
    const FLOW = 'shipment-item-edit-react';
    const item = items[0];

    await page.goto(url(`/shipmentItem/edit/${item.id}`));
    await page.waitForLoadState('networkidle');
    await captureStep(page, FLOW, 'edit');

    const api = await page.request
      .get(url(`/api/shipmentItems/${item.id}`))
      .then((r) => r.json());
    const quantityInput = page.locator('input[type="number"]').first();
    await expect(quantityInput).toHaveValue(`${api.data.quantity}`);

    // Round-trip an update through the API the screen uses.
    const updated = await page.request
      .put(url(`/api/shipmentItems/${item.id}`), {
        data: { lotNumber: api.data.lotNumber },
      })
      .then((r) => r.json());
    expect(updated.data.quantity).toBe(api.data.quantity);
  });

  test('shipment item pick screen shows bin locations and quantities', async ({ page }) => {
    const items = await getShipmentItems(page);
    test.skip(!items.length, 'no shipment items seeded');
    const FLOW = 'shipment-item-pick-react';
    const item = items[0];

    await page.goto(url(`/shipmentItem/pick/${item.id}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('pick-title')).toBeVisible();
    await captureStep(page, FLOW, 'pick');

    const api = await page.request
      .get(url(`/api/shipmentItems/${item.id}/pick`))
      .then((r) => r.json());
    await expect(page.getByTestId('pick-quantity-summary'))
      .toContainText(`${api.data.shipmentItem.quantity}`);
    const rows = page.getByTestId('pick-bin-locations').locator('tbody tr');
    await expect(rows).toHaveCount(Math.max(api.data.binLocations.length, 1));
  });

  test('shipment item split screen shows original item and validates quantity', async ({ page }) => {
    const items = await getShipmentItems(page);
    test.skip(!items.length, 'no shipment items seeded');
    const FLOW = 'shipment-item-split-react';
    const item = items[0];

    await page.goto(url(`/shipmentItem/split/${item.id}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('split-title')).toBeVisible();
    await expect(page.getByTestId('split-original-item')).toContainText(`${item.quantity}`);
    await captureStep(page, FLOW, 'split');

    // Invalid split quantity is rejected by the API without mutating data.
    const invalid = await page.request.post(url(`/api/shipmentItems/${item.id}/split`), {
      data: { inventoryItemId: 'doesnotexist0000', splitQuantity: 0 },
    });
    expect(invalid.status()).toBe(400);
    const after = await page.request
      .get(url(`/api/shipmentItems/${item.id}`))
      .then((r) => r.json());
    expect(after.data.quantity).toBe(item.quantity);
  });

  test('shipment workflow create renders form and validates', async ({ page }) => {
    const FLOW = 'shipment-workflow-create-react';
    await page.goto(url('/shipmentWorkflow/create'));
    await page.waitForLoadState('networkidle');
    await captureStep(page, FLOW, 'create-form');

    // Submitting the empty form surfaces required-field errors client-side.
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('This field is required').first()).toBeVisible();
    await captureStep(page, FLOW, 'create-validation');

    // The API enforces the same validations.
    const invalid = await page.request.post(url('/api/shipmentWorkflows'), {
      data: { name: null },
    });
    expect(invalid.status()).toBe(400);

    // Create through the API when a shipment type is free (one workflow per
    // shipment type), then clean up through the legacy delete action.
    const shipmentTypes = await page.request
      .get(url('/api/generic/shipmentType?max=100'))
      .then((r) => r.json());
    const workflows = await page.request
      .get(url('/api/shipmentWorkflows?max=100'))
      .then((r) => r.json());
    const used = new Set(
      (workflows.data ?? []).map((wf: any) => wf.shipmentType?.id).filter(Boolean),
    );
    const free = (shipmentTypes.data ?? []).filter((st: any) => !used.has(st.id));
    if (free.length) {
      const created = await page.request.post(url('/api/shipmentWorkflows'), {
        data: { name: WORKFLOW_NAME, shipmentType: { id: free[0].id } },
      });
      expect(created.status()).toBe(201);
      const workflow = (await created.json()).data;
      expect(workflow.name).toBe(WORKFLOW_NAME);
      await page.request.post(url(`/shipmentWorkflow/delete/${workflow.id}`), {
        maxRedirects: 0,
      });
    }
  });
});
