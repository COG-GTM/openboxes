import { test, expect, Page } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for user list/show/edit/cropPhoto (Phase 2, Batch 46).
 * The legacy /user/(list|show|edit|cropPhoto) URLs render the React SPA.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('user react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/users/list?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/users/list (pinned released image)');
  });

  test('lists users with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/users/list') && resp.status() === 200);
    await page.goto(url('/user/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Users').first()).toBeVisible();
    await captureStep(page, 'user', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('filters the list by query and status', async ({ page }) => {
    await page.goto(url('/user/list'));
    await page.getByLabel('Search by name, username or email').fill('admin');
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByRole('link', { name: 'admin', exact: true })).toBeVisible();
    await captureStep(page, 'user', 'react-list-filtered');

    const inactive = await (await page.request.get(url('/api/users/list?status=false&max=100'))).json();
    await page.getByLabel('Search by name, username or email').fill('');
    await page.getByLabel('Status').selectOption('false');
    await page.getByRole('button', { name: 'Find' }).click();
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(inactive.totalCount, 10));
  });

  test('shows a user with details from the API', async ({ page }) => {
    const listed = await (await page.request.get(url('/api/users/list?q=admin&max=1'))).json();
    const user = listed.data[0];

    await page.goto(url(`/user/show/${user.id}`));
    const details = page.getByTestId('user-details');
    await expect(details.getByLabel('Username')).toHaveText(user.username);
    await expect(details.getByLabel('Email')).toHaveText(user.email ?? '');
    await captureStep(page, 'user', 'react-show');
  });

  test('edits a user through the details tab', async ({ page }) => {
    const listed = await (await page.request.get(url('/api/users/list?q=admin&max=1'))).json();
    const user = listed.data[0];

    await page.goto(url(`/user/edit/${user.id}`));
    await expect(page.getByRole('tab', { name: 'User Details' })).toBeVisible();
    const usernameInput = page.getByLabel('Username', { exact: true });
    await expect(usernameInput).toHaveValue(user.username);
    await captureStep(page, 'user', 'react-edit');

    await page.getByRole('tab', { name: 'Authorization' }).click();
    await expect(page.getByTestId('default-location-select')).toBeVisible();
    await captureStep(page, 'user', 'react-edit-authorization');

    await page.getByRole('tab', { name: 'User Details' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('User has been updated successfully')).toBeVisible();
  });

  test('renders the crop photo screen', async ({ page }) => {
    const listed = await (await page.request.get(url('/api/users/list?q=admin&max=1'))).json();
    const user = listed.data[0];

    await page.goto(url(`/user/cropPhoto/${user.id}`));
    await expect(page.getByTestId('user-thumbnail')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    await captureStep(page, 'user', 'react-crop-photo');
  });
});
