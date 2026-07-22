import { test, expect, Page } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for party and partyRole create/edit (Phase 2, Batch 34).
 *
 * The legacy /party/(list|create|edit|show) and /partyRole/(create|edit)
 * URLs now render the React SPA, backed by /api/parties/search,
 * /api/parties/{id}/details, /api/partyRoles/{id}/details and the
 * partyOptions/roleTypeOptions select endpoints. partyRole list/show remain
 * legacy GSPs (Batch 35).
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('party react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/parties/search?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/parties/search (pinned released image)');
  });

  test('lists parties with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/parties/search') && resp.status() === 200);
    await page.goto(url('/party/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Parties').first()).toBeVisible();
    await captureStep(page, 'party', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('creates, edits, shows and deletes a party', async ({ page }) => {
    await page.goto(url('/party/create'));
    await expect(page.getByText('Create Party').first()).toBeVisible();
    await captureStep(page, 'party', 'react-create');

    const before = await page.request.get(url('/api/parties/search?max=1'));
    const beforeCount = (await before.json()).totalCount;

    await page.getByText('Select', { exact: true }).first().click({ force: true });
    await page.getByText('Organization', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/party/list**');

    const after = await page.request.get(url('/api/parties/search?max=1&sort=dateCreated&order=desc'));
    const afterBody = await after.json();
    expect(afterBody.totalCount).toBe(beforeCount + 1);
    const partyId = afterBody.data[0].id;
    expect(afterBody.data[0].partyType).toBe('Organization');

    // The show screen renders the party details.
    await page.goto(url(`/party/show/${partyId}`));
    await expect(page.getByText(`Party: ${partyId}`)).toBeVisible();
    await expect(page.getByLabel('Party Type')).toHaveText('Organization');
    await captureStep(page, 'party', 'react-show');

    // The edit screen loads the current party type.
    await page.goto(url(`/party/edit/${partyId}`));
    await expect(page.getByText('Edit Party').first()).toBeVisible();
    await expect(page.getByText('Organization', { exact: true }).first()).toBeVisible();
    await captureStep(page, 'party', 'react-edit');

    // Create a role for the party through the React partyRole form.
    await page.goto(url(`/partyRole/create?partyId=${partyId}`));
    await expect(page.getByText('Create Party Role').first()).toBeVisible();
    await captureStep(page, 'party', 'react-party-role-create');
    await page.getByText('Select', { exact: true }).first().click({ force: true });
    await page.getByText('ROLE_SUPPLIER', { exact: true }).click();
    await page.getByRole('button', { name: 'Create' }).click();
    // Saving navigates to the owning party's React show screen so the toast survives.
    await page.waitForURL(`**/party/show/${partyId}`);

    const details = await page.request.get(url(`/api/parties/${partyId}/details`));
    const roles = (await details.json()).data.roles;
    expect(roles.map((role: { roleType: string }) => role.roleType)).toContain('ROLE_SUPPLIER');
    const roleId = roles[0].id;

    // Edit the role through the React partyRole edit screen.
    await page.goto(url(`/partyRole/edit/${roleId}`));
    await expect(page.getByText('Edit Party Role').first()).toBeVisible();
    await expect(page.getByText('ROLE_SUPPLIER', { exact: true }).first()).toBeVisible();
    await captureStep(page, 'party', 'react-party-role-edit');
    await page.getByLabel('Start Date').fill('2026-01-01T00:00');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL(`**/party/show/${partyId}`);

    const roleDetails = await page.request.get(url(`/api/partyRoles/${roleId}/details`));
    expect((await roleDetails.json()).data.startDate).toBeTruthy();

    // Delete the party (role cascades) through the show screen.
    await page.goto(url(`/party/show/${partyId}`));
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/party/list**');
    const gone = await page.request.get(url(`/api/parties/search?q=${partyId}`));
    expect((await gone.json()).data).toHaveLength(0);
  });
});
