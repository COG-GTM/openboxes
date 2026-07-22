import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { LOCATIONS, PRODUCTS, SUPERUSER, runId, today, url } from '../fixtures/constants';
import { createShippedPurchaseOrder, ensureUserActive, newApiSession } from '../fixtures/api';
import { selectByFormField } from '../fixtures/react-select';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow 5: Create and process an invoice.
 *
 * Invoicing requires ROLE_INVOICE (the superuser demo user), and an invoice
 * item candidate only exists for order-based shipment items that have been
 * shipped and not yet invoiced. Setup (purchase order -> placed -> shipped via
 * combined shipment) is done through the same HTTP endpoints the legacy UI
 * uses; the invoice create / add items / submit flow itself is driven through
 * the React UI and asserted against the API and the invoice list.
 */
test('creates an invoice from a shipped purchase order and submits it', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'invoice';
  const QTY = 10;
  const UNIT_PRICE = 1.5;
  const id = runId();
  const vendorInvoiceNumber = `CHAR-VIN-${id}`;

  // --- Setup: invoice-enabled user + a shipped PO to invoice against ---
  await ensureUserActive(SUPERUSER.username, SUPERUSER.password);
  const api = await newApiSession(SUPERUSER.username, SUPERUSER.password);
  const order = await createShippedPurchaseOrder(api, {
    description: `Characterization PO ${id}`,
    productName: PRODUCTS.lamivudine.name,
    quantity: QTY,
    unitPrice: UNIT_PRICE,
  });
  await api.dispose();

  await login(page, { username: SUPERUSER.username, password: SUPERUSER.password });

  // --- Step 1: Create invoice ---
  await page.goto(url('/invoice/create'));
  await page.waitForSelector('#vendorInvoiceNumber');
  await selectByFormField(page, 'Vendor', 'Supplier Organization');
  await page.fill('#vendorInvoiceNumber', vendorInvoiceNumber);
  await page.locator('#dateInvoiced, input[name="dateInvoiced"]').first().fill(today());
  await page.keyboard.press('Escape');
  await selectByFormField(page, 'Currency', 'US Dollar');
  await captureStep(page, FLOW, 'create-filled');
  await page.click('button:has-text("Next")');
  await page.waitForURL(/invoice\/create\/[a-zA-Z0-9]+/);
  const invoiceId = page.url().match(/invoice\/create\/([a-zA-Z0-9]+)/)![1];

  // Persisted outcome: invoice record with generated invoice number, PENDING.
  const created = (await (await page.request.get(url(`/api/invoices/${invoiceId}`))).json()).data;
  expect(created.invoiceNumber).toMatch(/^[0-9A-Z]+$/);
  expect(created.vendorInvoiceNumber).toBe(vendorInvoiceNumber);
  expect(created.vendorName).toContain('Supplier Organization');
  expect(created.status).toBe('PENDING');
  expect(created.dateSubmitted).toBeNull();

  // --- Step 2: Add invoice line from the shipped PO's candidates ---
  await page.click('button:has-text("Add lines")');
  const modal = page.locator('.modal-content, .ReactModal__Content').first();
  await modal.waitFor();
  const candidateRow = modal
    .locator('div[class*="rt-tr"], tr, div[role="row"]')
    .filter({ hasText: order.orderNumber })
    .first();
  await candidateRow.waitFor();
  await candidateRow.locator('input[type="checkbox"]').first().check();
  await captureStep(page, FLOW, 'candidate-selected');
  await modal.locator('button:has-text("Add invoice items"), button:has-text("Save")').first().click();
  await modal.waitFor({ state: 'hidden' });
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(order.orderNumber).first()).toBeVisible();
  await captureStep(page, FLOW, 'items-added');
  await page.click('button:has-text("Save")');
  await page.waitForLoadState('networkidle');

  // Persisted outcome: invoice item tied to the PO, and totals updated.
  const items = (await (await page.request.get(url(`/api/invoices/${invoiceId}/items?max=10&offset=0`))).json()).data;
  expect(items.length).toBe(1);
  expect(items[0].orderNumber).toBe(order.orderNumber);
  expect(items[0].productName).toBe(PRODUCTS.lamivudine.name);
  expect(items[0].quantity).toBe(QTY);
  expect(items[0].unitPrice).toBe(UNIT_PRICE);

  // The invoice list view only includes invoices that have at least one item.
  const list = (await (await page.request.get(url('/api/invoices?max=100&offset=0'))).json()).data;
  const listed = list.find((i: { id: string }) => i.id === invoiceId);
  expect(listed).toBeTruthy();
  expect(listed.status).toBe('PENDING');
  expect(Number(listed.itemCount)).toBe(1);

  // --- Step 3: Submit the invoice ---
  await page.click('button:has-text("Next")');
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'confirm');
  await page.click('button:has-text("Submit for Approval")');
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'submitted');

  // Persisted outcome: submission recorded (status derives from dateSubmitted).
  await expect
    .poll(async () => {
      const invoice = (await (await page.request.get(url(`/api/invoices/${invoiceId}`))).json()).data;
      return invoice.status;
    })
    .toBe('SUBMITTED');
  const submitted = (await (await page.request.get(url(`/api/invoices/${invoiceId}`))).json()).data;
  expect(submitted.dateSubmitted).not.toBeNull();
  expect(submitted.totalValue).toBe(QTY * UNIT_PRICE);
});
