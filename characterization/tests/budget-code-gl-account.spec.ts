import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for budgetCode and glAccount (Phase 2, Batch 26).
 *
 * The legacy /budgetCode/(list|create|edit) and /glAccount/(list|create|edit)
 * URLs now render the React SPA. These flows exercise list rendering against
 * the JSON APIs and the full create -> edit -> delete round trip per module.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('budget code react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/budgetCodes?max=1'));
    test.skip(probe.status() === 404, 'app build does not expose /api/budgetCodes (pinned released image)');
  });

  test('lists budget codes with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/budgetCodes') && resp.status() === 200);
    await page.goto(url('/budgetCode/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Budget Codes').first()).toBeVisible();
    await captureStep(page, 'budget-code', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('creates, edits and deletes a budget code', async ({ page }) => {
    const code = `ZZBC${runId()}`;
    await page.goto(url('/budgetCode/create'));
    await expect(page.getByText('Create Budget Code').first()).toBeVisible();
    await captureStep(page, 'budget-code', 'react-create');

    await page.getByLabel('Code').fill(code);
    await page.getByLabel('Name').fill('Playwright Budget Code');
    await page.getByLabel('Description').fill('created by characterization');
    await page.getByRole('button', { name: 'Create' }).click();

    // Create redirects to the edit screen for the new record.
    await page.waitForURL('**/budgetCode/edit/**');
    await expect(page.getByLabel('Code')).toHaveValue(code);
    await captureStep(page, 'budget-code', 'react-edit');

    await page.getByLabel('Name').fill('Playwright Budget Code (renamed)');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL('**/budgetCode/list**');

    // The updated row is findable through the list search.
    await page.getByPlaceholder('Search by code').fill(code);
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByText('Playwright Budget Code (renamed)')).toBeVisible();
    await captureStep(page, 'budget-code', 'react-list-filtered');

    // Delete through the edit screen.
    await page.getByRole('link', { name: code }).click();
    await page.waitForURL('**/budgetCode/edit/**');
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/budgetCode/list**');

    const check = await page.request.get(url(`/api/budgetCodes?q=${code}`));
    expect((await check.json()).data).toHaveLength(0);
  });
});

test.describe('gl account react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/glAccounts?max=1'));
    test.skip(probe.status() === 404, 'app build does not expose /api/glAccounts (pinned released image)');
  });

  test('lists gl accounts with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/glAccounts') && resp.status() === 200);
    await page.goto(url('/glAccount/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List GL Accounts').first()).toBeVisible();
    await captureStep(page, 'gl-account', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('creates, edits and deletes a gl account', async ({ page }) => {
    // GL account type is required, so the round trip needs at least one type seeded.
    const typeOptions = await (await page.request.get(url('/api/glAccountTypeOptions'))).json();
    test.skip(!typeOptions.data.length, 'seeded dataset has no GL account types');

    const code = `ZZGL${runId()}`;
    await page.goto(url('/glAccount/create'));
    await expect(page.getByText('Create GL Account').first()).toBeVisible();
    await captureStep(page, 'gl-account', 'react-create');

    await page.getByLabel('Code').fill(code);
    await page.getByLabel('Name').fill('Playwright GL Account');
    await page.getByLabel('Description').fill('created by characterization');

    // GL account type is required; pick the first available option.
    await page.locator('.select-field-input, [class*="select"]').filter({ hasText: /GL Account Type|Select/ }).first().click();
    await page.locator('[class*="option"]').first().click();

    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/glAccount/edit/**');
    await expect(page.getByLabel('Code')).toHaveValue(code);
    await captureStep(page, 'gl-account', 'react-edit');

    await page.getByLabel('Name').fill('Playwright GL Account (renamed)');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL('**/glAccount/list**');
    await captureStep(page, 'gl-account', 'react-list-after-update');

    // Delete through the API-backed edit screen.
    const list = await (await page.request.get(url('/api/glAccounts'))).json();
    const created = list.data.find((gl: { code: string }) => gl.code === code);
    expect(created).toBeTruthy();
    await page.goto(url(`/glAccount/edit/${created.id}`));
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/glAccount/list**');

    const check = await (await page.request.get(url('/api/glAccounts'))).json();
    expect(check.data.some((gl: { code: string }) => gl.code === code)).toBe(false);
  });
});
