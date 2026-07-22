import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for paymentTerm list/edit and preferenceType
 * list/create/edit (Phase 2, Batch 30).
 *
 * The legacy /paymentTerm/(list|edit) and /preferenceType/(list|create|edit)
 * URLs now render the React SPA backed by the paymentTerm/preferenceType
 * JSON APIs.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('batch 30 finance react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/preferenceTypes'));
    test.skip(probe.status() !== 200, 'app build does not expose the Batch 30 endpoints (pinned released image)');
  });

  test('payment term list matches the API row count', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/paymentTerms?') && resp.status() === 200);
    await page.goto(url('/paymentTerm/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Payment Terms').first()).toBeVisible();
    await captureStep(page, 'payment-term-list', 'react-list');
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(body.totalCount, 10));
  });

  test('creates and edits a payment term', async ({ page }) => {
    const id = runId();
    const name = `Playwright payment term ${id}`;

    await page.goto(url('/paymentTerm/create'));
    await expect(page.getByText('Create Payment Term').first()).toBeVisible();

    await page.getByLabel('Code').fill(`PW-${id}`);
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Days To Payment').fill('45');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/paymentTerm/list**');

    const listed = (await (await page.request.get(
      url(`/api/paymentTerms?q=${encodeURIComponent(name)}`),
    )).json()).data as Array<{ id: string; name: string }>;
    expect(listed.length).toBe(1);
    const createdId = listed[0].id;

    await page.goto(url(`/paymentTerm/edit/${createdId}`));
    await expect(page.getByText('Edit Payment Term').first()).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue(name);
    await captureStep(page, 'payment-term', 'react-edit');

    await page.getByLabel('Name').fill(`${name} (edited)`);
    await page.getByLabel('Days To Payment').fill('60');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/paymentTerm/list**');

    const readBack = (await (await page.request.get(
      url(`/api/paymentTerms/${createdId}`),
    )).json()).data;
    expect(readBack.name).toBe(`${name} (edited)`);
    expect(readBack.daysToPayment).toBe(60);
  });

  test('preference type list matches the API row count', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/preferenceTypes?') && resp.status() === 200);
    await page.goto(url('/preferenceType/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Preference Types').first()).toBeVisible();
    await captureStep(page, 'preference-type-list', 'react-list');
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(body.totalCount, 10));
  });

  test('creates and edits a preference type', async ({ page }) => {
    const id = runId();
    const name = `Playwright preference type ${id}`;

    await page.goto(url('/preferenceType/create'));
    await expect(page.getByText('Create Preference Type').first()).toBeVisible();
    await captureStep(page, 'preference-type', 'react-create');

    await page.getByLabel('Name').fill(name);
    // SelectField (v2) does not associate its label with the react-select
    // input, so locate the wrapper by its label text instead of getByLabel.
    const validationCodeField = page
      .locator('.select-wrapper-container', { hasText: 'Validation Code' })
      .first();
    await validationCodeField.locator('input').first().click({ force: true });
    await page.getByText('WARN', { exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/preferenceType/list**');

    const listed = (await (await page.request.get(
      url(`/api/preferenceTypes?q=${encodeURIComponent(name)}`),
    )).json()).data as Array<{ id: string; name: string }>;
    expect(listed.length).toBe(1);
    const createdId = listed[0].id;

    await page.goto(url(`/preferenceType/edit/${createdId}`));
    await expect(page.getByText('Edit Preference Type').first()).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue(name);
    await captureStep(page, 'preference-type', 'react-edit');

    await page.getByLabel('Name').fill(`${name} (edited)`);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/preferenceType/list**');

    const readBack = (await (await page.request.get(
      url(`/api/preferenceTypes/${createdId}`),
    )).json()).data;
    expect(readBack.name).toBe(`${name} (edited)`);
    expect(readBack.validationCode).toBe('WARN');
  });
});
