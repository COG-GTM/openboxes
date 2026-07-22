import { test, expect, Page } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for partyType list/show/create/edit and partyRole list/show
 * (Phase 2, Batch 35). The legacy /partyType/* and /partyRole/(list|show)
 * URLs now render the React SPA, backed by /api/partyTypes CRUD, the
 * GET /api/partyRoles list and the partyTypeCodeOptions select endpoint.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('partyType react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/partyTypes?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/partyTypes (pinned released image)');
  });

  test('lists party types with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/partyTypes') && resp.status() === 200);
    await page.goto(url('/partyType/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Party Types').first()).toBeVisible();
    await captureStep(page, 'partyType', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
    await expect(page.getByText('Organization', { exact: true }).first()).toBeVisible();
  });

  test('creates, shows, edits and deletes a party type', async ({ page }) => {
    await page.goto(url('/partyType/create'));
    await expect(page.getByText('Create Party Type').first()).toBeVisible();
    await captureStep(page, 'partyType', 'react-create');

    const before = await page.request.get(url('/api/partyTypes?max=1'));
    const beforeCount = (await before.json()).totalCount;

    await page.getByLabel('Code', { exact: true }).fill('E2E_TEST');
    await page.getByLabel('Name', { exact: true }).fill('E2E Test Type');
    await page.getByLabel('Description', { exact: true }).fill('created by playwright');
    await page.getByText('Select', { exact: true }).first().click({ force: true });
    await page.getByText('PERSON', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/partyType/list**');

    const after = await page.request.get(url('/api/partyTypes?max=10&sort=dateCreated&order=desc'));
    const afterBody = await after.json();
    expect(afterBody.totalCount).toBe(beforeCount + 1);
    const partyTypeId = afterBody.data[0].id;
    expect(afterBody.data[0].code).toBe('E2E_TEST');
    expect(afterBody.data[0].partyTypeCode).toBe('PERSON');

    // The show screen renders the party type details.
    await page.goto(url(`/partyType/show/${partyTypeId}`));
    await expect(page.getByText('Party Type: E2E Test Type')).toBeVisible();
    await expect(page.getByLabel('Party Type Code')).toHaveText('PERSON');
    await captureStep(page, 'partyType', 'react-show');

    // The edit screen loads the current values and updates them.
    await page.goto(url(`/partyType/edit/${partyTypeId}`));
    await expect(page.getByText('Edit Party Type').first()).toBeVisible();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('E2E Test Type');
    await captureStep(page, 'partyType', 'react-edit');
    await page.getByLabel('Name', { exact: true }).fill('E2E Test Type Renamed');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL('**/partyType/list**');

    const updated = await page.request.get(url(`/api/partyTypes/${partyTypeId}`));
    expect((await updated.json()).data.name).toBe('E2E Test Type Renamed');

    // Delete through the show screen.
    await page.goto(url(`/partyType/show/${partyTypeId}`));
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/partyType/list**');
    // Not-found responses are only 404 for JSON/AJAX requests
    const gone = await page.request.get(url(`/api/partyTypes/${partyTypeId}`), {
      headers: { Accept: 'application/json' },
    });
    expect(gone.status()).toBe(404);
  });
});

test.describe('partyRole react list/show screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/partyTypes?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose the Batch 35 endpoints (pinned released image)');
  });

  test('lists party roles and shows one', async ({ page }) => {
    // Seed a party + role so the list is never empty.
    const partyTypes = await page.request.get(url('/api/partyTypeOptions'));
    const orgTypeId = (await partyTypes.json()).data
      .find((option: { label: string }) => option.label === 'Organization').id;
    const partyResp = await page.request.post(url('/api/parties'), {
      data: { partyType: orgTypeId },
    });
    const partyId = (await partyResp.json()).data.id;
    const roleResp = await page.request.post(url('/api/partyRoles'), {
      data: { party: partyId, roleType: 'ROLE_SUPPLIER' },
    });
    const roleId = (await roleResp.json()).data.id;

    try {
      const apiResponse = page.waitForResponse((resp) =>
        resp.url().includes('/api/partyRoles') && resp.status() === 200);
      await page.goto(url('/partyRole/list'));
      const body = await (await apiResponse).json();
      await expect(page.getByText('List Party Roles').first()).toBeVisible();
      await captureStep(page, 'partyRole', 'react-list');
      const visibleRows = Math.min(body.totalCount, 10);
      await expect
        .poll(async () => reactTableRowCount(page))
        .toBe(visibleRows);

      await page.goto(url(`/partyRole/show/${roleId}`));
      await expect(page.getByText('Party Role: ROLE_SUPPLIER')).toBeVisible();
      await expect(page.getByLabel('Party', { exact: true })).toHaveText(partyId);
      await expect(page.getByLabel('Role Type')).toHaveText('ROLE_SUPPLIER');
      await captureStep(page, 'partyRole', 'react-show');

      // Delete through the show screen.
      await page.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('button', { name: 'Yes' }).click();
      await page.waitForURL('**/partyRole/list**');
      // Not-found responses are only 404 for JSON/AJAX requests
      const gone = await page.request.get(url(`/api/partyRoles/${roleId}/details`), {
        headers: { Accept: 'application/json' },
      });
      expect(gone.status()).toBe(404);
    } finally {
      await page.request.delete(url(`/api/parties/${partyId}`));
    }
  });
});
