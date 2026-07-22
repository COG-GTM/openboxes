import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for shipmentWorkflow list/show/edit and stockMovement
 * show/addComment/addDocument (Phase 2, Batch 24).
 *
 * The legacy /shipmentWorkflow/(list|show|edit) and
 * /stockMovement/(show|addComment|addDocument) URLs now render the React SPA
 * backed by the shipmentWorkflow / stockMovement detail JSON APIs.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('batch 24 shipment workflow & stock movement react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/shipmentWorkflows'));
    test.skip(probe.status() !== 200, 'app build does not expose the Batch 24 endpoints (pinned released image)');
  });

  test('shipment workflow list matches the API row count', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/shipmentWorkflows?') && resp.status() === 200);
    await page.goto(url('/shipmentWorkflow/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Shipment Workflows').first()).toBeVisible();
    await captureStep(page, 'shipment-workflow-list', 'react-list');
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(body.totalCount, 10));
  });

  test('shipment workflow show and edit round-trip', async ({ page }) => {
    const listed = (await (await page.request.get(
      url('/api/shipmentWorkflows'),
    )).json()).data as Array<{ id: string; name: string }>;
    test.skip(listed.length === 0, 'no seeded shipment workflows');
    const workflow = listed[0];

    await page.goto(url(`/shipmentWorkflow/show/${workflow.id}`));
    await expect(page.getByTestId('shipment-workflow-name')).toHaveText(workflow.name);
    await captureStep(page, 'shipment-workflow', 'react-show');

    await page.goto(url(`/shipmentWorkflow/edit/${workflow.id}`));
    await expect(page.getByTestId('shipment-workflow-name-input')).toHaveValue(workflow.name);
    await captureStep(page, 'shipment-workflow', 'react-edit');

    const id = runId();
    const newName = `${workflow.name} ${id}`;
    await page.getByTestId('shipment-workflow-name-input').fill(newName);
    await page.getByTestId('shipment-workflow-save-button').click();
    await page.waitForURL('**/shipmentWorkflow/list**');

    const readBack = (await (await page.request.get(
      url(`/api/shipmentWorkflows/${workflow.id}`),
    )).json()).data;
    expect(readBack.name).toBe(newName);

    // Restore original name to keep the run re-runnable.
    await page.goto(url(`/shipmentWorkflow/edit/${workflow.id}`));
    await page.getByTestId('shipment-workflow-name-input').fill(workflow.name);
    await page.getByTestId('shipment-workflow-save-button').click();
    await page.waitForURL('**/shipmentWorkflow/list**');
  });

  test('stock movement show renders details and packing list', async ({ page }) => {
    const listed = (await (await page.request.get(
      url('/api/stockMovements?direction=OUTBOUND&origin=1&max=1'),
    )).json()).data as Array<{ id: string }>;
    test.skip(!listed || listed.length === 0, 'no seeded stock movements');
    const movementId = listed[0].id;

    const details = (await (await page.request.get(
      url(`/api/stockMovements/${movementId}/details`),
    )).json()).data;
    const packingList = (await (await page.request.get(
      url(`/api/stockMovements/${movementId}/packingList`),
    )).json()).data;

    await page.goto(url(`/stockMovement/show/${movementId}`));
    await expect(page.getByTestId('stock-movement-identifier')).toHaveText(details.identifier);
    await captureStep(page, 'stock-movement', 'react-show');

    await page.getByTestId('tab-packingList').click();
    await expect
      .poll(async () => page.getByTestId('packing-list-row').count())
      .toBe(packingList.shipmentItems.length);

    await page.getByTestId('tab-events').click();
    const events = (await (await page.request.get(
      url(`/api/stockMovements/${movementId}/events`),
    )).json()).data;
    if (events.length > 0) {
      await expect
        .poll(async () => page.getByTestId('event-row').count())
        .toBe(events.length);
    }
  });

  test('adds a comment via the react add comment screen', async ({ page }) => {
    const listed = (await (await page.request.get(
      url('/api/stockMovements?direction=OUTBOUND&origin=1&max=1'),
    )).json()).data as Array<{ id: string }>;
    test.skip(!listed || listed.length === 0, 'no seeded stock movements');
    const movementId = listed[0].id;

    const before = (await (await page.request.get(
      url(`/api/stockMovements/${movementId}/comments`),
    )).json()).data as Array<unknown>;

    await page.goto(url(`/stockMovement/addComment/${movementId}`));
    await expect(page.getByTestId('comment-text-input')).toBeVisible();
    await captureStep(page, 'stock-movement', 'react-add-comment');

    const id = runId();
    await page.getByTestId('comment-text-input').fill(`Playwright comment ${id}`);
    await page.getByTestId('comment-save-button').click();
    await page.waitForURL(`**/stockMovement/show/${movementId}**`);

    const after = (await (await page.request.get(
      url(`/api/stockMovements/${movementId}/comments`),
    )).json()).data as Array<{ comment: string }>;
    expect(after.length).toBe(before.length + 1);
    expect(after.some((c) => c.comment === `Playwright comment ${id}`)).toBe(true);
  });

  test('uploads a document via the react add document screen', async ({ page }) => {
    const listed = (await (await page.request.get(
      url('/api/stockMovements?direction=OUTBOUND&origin=1&max=1'),
    )).json()).data as Array<{ id: string }>;
    test.skip(!listed || listed.length === 0, 'no seeded stock movements');
    const movementId = listed[0].id;

    await page.goto(url(`/stockMovement/addDocument/${movementId}`));
    await expect(page.getByTestId('document-file-input')).toBeVisible();
    await captureStep(page, 'stock-movement', 'react-add-document');

    const id = runId();
    const name = `playwright-doc-${id}.txt`;
    await page.getByTestId('document-file-input').setInputFiles({
      name,
      mimeType: 'text/plain',
      buffer: Buffer.from(`playwright upload ${id}`),
    });
    await page.getByTestId('document-name-input').fill(name);
    await page.getByTestId('document-upload-button').click();
    await page.waitForURL(`**/stockMovement/show/${movementId}**`);

    const documents = (await (await page.request.get(
      url(`/api/stockMovements/${movementId}/documents`),
    )).json()).data as Array<{ name: string }>;
    expect(documents.some((doc) => doc.name === name)).toBe(true);
  });
});
