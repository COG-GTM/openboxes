import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for organization (Phase 2, Batch 33).
 *
 * The legacy /organization/(list|create|edit|show) URLs now render the
 * React SPA, backed by /api/organizations/search and
 * /api/organizations/{id}/details.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('organization react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/organizations/search?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/organizations/search (pinned released image)');
  });

  test('lists organizations with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/organizations/search') && resp.status() === 200);
    await page.goto(url('/organization/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Organizations').first()).toBeVisible();
    await captureStep(page, 'organization', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('filters organizations by role type', async ({ page }) => {
    await page.goto(url('/organization/list'));
    await expect(page.getByText('List Organizations').first()).toBeVisible();

    const roleSelect = page.getByTestId('role-type-select');
    await roleSelect.locator('input').first().click({ force: true });
    await page.getByText('ROLE_SUPPLIER', { exact: true }).click();
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/organizations/search')
      && resp.url().includes('roleType=ROLE_SUPPLIER')
      && resp.status() === 200);
    await page.getByRole('button', { name: 'Find' }).click();
    const body = await (await apiResponse).json();
    await captureStep(page, 'organization', 'react-list-role-filtered');
    for (const row of body.data) {
      expect(row.roles).toContain('Supplier');
    }
    const check = await page.request.get(url('/api/organizations/search?roleType=ROLE_SUPPLIER&max=1'));
    expect(body.totalCount).toBe((await check.json()).totalCount);
  });

  test('creates, edits, shows and deletes an organization', async ({ page }) => {
    const name = `ZZORG${runId()}`;
    await page.goto(url('/organization/create'));
    await expect(page.getByText('Create Organization').first()).toBeVisible();
    await captureStep(page, 'organization', 'react-create');

    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByLabel('Description').fill('created by characterization');
    await page.getByRole('button', { name: 'Create' }).click();

    // Create routes into the edit screen (like the legacy save action).
    await page.waitForURL('**/organization/edit/**');
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name);
    await captureStep(page, 'organization', 'react-edit');

    const created = await page.request.get(url(`/api/organizations/search?q=${name}`));
    const org = (await created.json()).data[0];
    expect(org.name).toBe(name);
    expect(org.active).toBe(true);
    expect(org.code).toBeTruthy();

    // Edit updates the description.
    await page.getByLabel('Description').fill('renamed by characterization');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL('**/organization/list**');

    const details = await page.request.get(url(`/api/organizations/${org.id}/details`));
    expect((await details.json()).data.description).toBe('renamed by characterization');

    // The show screen renders the organization details.
    await page.goto(url(`/organization/show/${org.id}`));
    await expect(page.getByText(`Organization: ${name}`)).toBeVisible();
    await expect(page.getByLabel('Description')).toHaveText('renamed by characterization');
    await captureStep(page, 'organization', 'react-show');

    // Delete through the show screen.
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/organization/list**');
    const gone = await page.request.get(url(`/api/organizations/search?q=${name}`));
    expect((await gone.json()).data).toHaveLength(0);
  });
});
