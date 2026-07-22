import { test, expect, Page } from '@playwright/test';
import { url, runId, today, SUPERUSER } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { ensureUserActive } from '../fixtures/api';
import { selectByFormField } from '../fixtures/react-select';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for glAccountType, invoice show/addDocument and order
 * addComment (Phase 2, Batch 27).
 *
 * The legacy /glAccountType/(list|create|edit), /invoice/show,
 * /invoice/addDocument and /order/addComment URLs now render the React SPA.
 * These flows exercise list rendering against the JSON APIs, the
 * glAccountType create -> edit -> delete round trip, and the invoice
 * document add/remove and order comment golden paths.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('gl account type react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/glAccountTypes?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/glAccountTypes (pinned released image)');
  });

  test('lists gl account types with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/glAccountTypes') && resp.status() === 200);
    await page.goto(url('/glAccountType/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List GL Account Types').first()).toBeVisible();
    await captureStep(page, 'gl-account-type', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('creates, edits and deletes a gl account type', async ({ page }) => {
    const code = `ZZGT${runId()}`;
    await page.goto(url('/glAccountType/create'));
    await expect(page.getByText('Create GL Account Type').first()).toBeVisible();
    await captureStep(page, 'gl-account-type', 'react-create');

    await page.getByLabel('Code').fill(code);
    await page.getByLabel('Name').fill('Playwright GL Account Type');
    // GL account type code is required; pick the ASSET option.
    await page.locator('.select-field-input, [class*="select"]').filter({ hasText: /GL Account Type Code|Select/ }).first().click();
    await page.locator('[class*="option"]', { hasText: 'ASSET' }).first().click();
    await page.getByRole('button', { name: 'Create' }).click();

    // Create redirects to the edit screen for the new record.
    await page.waitForURL('**/glAccountType/edit/**');
    await expect(page.getByLabel('Code')).toHaveValue(code);
    await captureStep(page, 'gl-account-type', 'react-edit');

    await page.getByLabel('Name').fill('Playwright GL Account Type (renamed)');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL('**/glAccountType/list**');

    // Delete through the edit screen.
    await page.getByRole('link', { name: code }).click();
    await page.waitForURL('**/glAccountType/edit/**');
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/glAccountType/list**');

    const check = await page.request.get(url('/api/glAccountTypes?max=100'));
    const codes = ((await check.json()).data as Array<{ code: string }>).map((g) => g.code);
    expect(codes).not.toContain(code);
  });
});

test.describe('invoice show and add document react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await ensureUserActive(SUPERUSER.username, SUPERUSER.password);
    await login(page, { username: SUPERUSER.username, password: SUPERUSER.password });
    const probe = await page.request.get(url('/api/invoices/documentTypes'));
    test.skip(probe.status() !== 200, 'app build does not expose the Batch 27 invoice endpoints (pinned released image)');
  });

  test('shows an invoice and adds/removes a URL document', async ({ page }) => {
    const id = runId();
    const vendorInvoiceNumber = `ZZ-B27-${id}`;

    // Setup: create a bare invoice through the existing React create wizard.
    await page.goto(url('/invoice/create'));
    await page.waitForSelector('#vendorInvoiceNumber');
    await selectByFormField(page, 'Vendor', 'Supplier Organization');
    await page.fill('#vendorInvoiceNumber', vendorInvoiceNumber);
    await page.locator('#dateInvoiced, input[name="dateInvoiced"]').first().fill(today());
    await page.keyboard.press('Escape');
    await selectByFormField(page, 'Currency', 'US Dollar');
    await page.click('button:has-text("Next")');
    await page.waitForURL(/invoice\/create\/[a-zA-Z0-9]+/);
    const invoiceId = page.url().match(/invoice\/create\/([a-zA-Z0-9]+)/)![1];

    // The invoice show screen renders the same data the details API returns.
    const details = (await (await page.request.get(
      url(`/api/invoices/${invoiceId}/details`),
    )).json()).data;
    await page.goto(url(`/invoice/show/${invoiceId}`));
    await expect(page.getByText(details.invoiceNumber).first()).toBeVisible();
    await expect(page.getByText(vendorInvoiceNumber).first()).toBeVisible();
    await captureStep(page, 'invoice-show', 'react-show');

    // Add a URL document.
    await page.getByRole('link', { name: 'Add Document' }).click();
    await page.waitForURL('**/invoice/addDocument/**');
    await captureStep(page, 'invoice-show', 'react-add-document');
    await page.getByLabel('Name').fill(`Playwright document ${id}`);
    await page.getByLabel('URL').fill('https://example.org/batch27');
    await page.getByRole('button', { name: 'Upload' }).click();

    // Save redirects back to the show screen; the document is listed under
    // the Documents tab.
    await page.waitForURL('**/invoice/show/**');
    await page.getByRole('tab', { name: /Documents/ }).click();
    await expect(page.getByText(`Playwright document ${id}`)).toBeVisible();
    await captureStep(page, 'invoice-show', 'react-show-with-document');

    const withDocument = (await (await page.request.get(
      url(`/api/invoices/${invoiceId}/details`),
    )).json()).data;
    expect(withDocument.documents).toHaveLength(1);
    expect(withDocument.documents[0].fileUri).toBe('https://example.org/batch27');

    // Remove it again through the documents tab.
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect
      .poll(async () => {
        const res = await page.request.get(url(`/api/invoices/${invoiceId}/details`));
        return (await res.json()).data.documents.length;
      })
      .toBe(0);
  });
});

test.describe('order add comment react screen', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
  });

  test('adds a comment to an order', async ({ page }) => {
    const orders = (await (await page.request.get(url('/api/generic/order/?max=1'))).json())
      .data as Array<{ id: string }>;
    test.skip(orders.length === 0, 'seeded dataset has no orders (invoice flow creates one)');
    const orderId = orders[0].id;
    const probe = await page.request.get(url(`/api/orders/${orderId}`));
    test.skip(probe.status() !== 200, 'app build does not expose /api/orders/{id} (pinned released image)');

    const comment = `Playwright comment ${runId()}`;
    await page.goto(url(`/order/addComment/${orderId}`));
    await expect(page.getByText('Add Comment').first()).toBeVisible();
    await captureStep(page, 'order-add-comment', 'react-add-comment');

    await page.getByLabel('Comment').fill(comment);
    await page.getByRole('button', { name: 'Save' }).click();

    // Save redirects to the legacy order show screen, which lists comments
    // under the Comments tab.
    await page.waitForURL('**/order/show/**');
    await page.getByRole('link', { name: /Comments/ }).click();
    await expect(page.getByText(comment)).toBeVisible();
    await captureStep(page, 'order-add-comment', 'legacy-show-with-comment');
  });
});
