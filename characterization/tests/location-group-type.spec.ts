import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for locationGroup and locationType (Phase 2, Batch 32).
 *
 * The legacy /locationGroup/(list|create|edit|show) and
 * /locationType/(create|edit) URLs now render the React SPA. The
 * locationType list/show screens remain GSPs until Batch 33, so the
 * locationType flow round-trips between the GSP list and the React form.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('location group react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/locationGroups/search?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/locationGroups/search (pinned released image)');
  });

  test('lists location groups with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/locationGroups/search') && resp.status() === 200);
    await page.goto(url('/locationGroup/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Location Groups').first()).toBeVisible();
    await captureStep(page, 'location-group', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('creates, edits, shows and deletes a location group', async ({ page }) => {
    const name = `ZZLG${runId()}`;
    await page.goto(url('/locationGroup/create'));
    await expect(page.getByText('Create Location Group').first()).toBeVisible();
    await captureStep(page, 'location-group', 'react-create');

    await page.getByLabel('Name').fill(name);
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/locationGroup/list**');

    // The new row is findable through the list search.
    await page.getByPlaceholder('Search by name').fill(name);
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByRole('link', { name })).toBeVisible();
    await captureStep(page, 'location-group', 'react-list-filtered');

    // Edit adds address fields.
    await page.getByRole('link', { name }).click();
    await page.waitForURL('**/locationGroup/edit/**');
    await expect(page.getByLabel('Name')).toHaveValue(name);
    await page.getByLabel('Street address', { exact: true }).fill('1 Playwright St');
    await page.getByLabel('City').fill('Playwright City');
    await page.getByLabel('Description').fill('created by characterization');
    await captureStep(page, 'location-group', 'react-edit');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL('**/locationGroup/list**');

    // The show screen renders the group and its (empty) locations list.
    const check = await page.request.get(url(`/api/locationGroups/search?q=${name}`));
    const row = (await check.json()).data[0];
    expect(row.description).toBe('created by characterization');
    await page.goto(url(`/locationGroup/show/${row.id}`));
    await expect(page.getByText(`Location Group: ${name}`)).toBeVisible();
    await captureStep(page, 'location-group', 'react-show');

    // Delete through the show screen.
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/locationGroup/list**');
    const gone = await page.request.get(url(`/api/locationGroups/search?q=${name}`));
    expect((await gone.json()).data).toHaveLength(0);
  });
});

test.describe('location type react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/locationTypes?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/locationTypes (pinned released image)');
  });

  test('creates, edits and deletes a location type', async ({ page }) => {
    const name = `ZZLT${runId()}`;
    await page.goto(url('/locationType/create'));
    await expect(page.getByText('Create Location Type').first()).toBeVisible();
    await captureStep(page, 'location-type', 'react-create');

    // SelectField (v2) does not associate its label with the react-select
    // input, so locate the wrapper by its label text instead of getByLabel.
    const codeField = page
      .locator('.select-wrapper-container', { hasText: 'Location Type Code' })
      .first();
    await codeField.locator('input').first().click({ force: true });
    await page.getByText('INTERNAL', { exact: true }).click();
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByLabel('Description').fill('created by characterization');
    await page.getByLabel('Sort Order').fill('999');
    await page.getByRole('button', { name: 'Save' }).click();

    // Save returns to the legacy GSP list, which shows the new type.
    await page.waitForURL('**/locationType/list**');
    await expect(page.getByRole('link', { name }).first()).toBeVisible();
    await captureStep(page, 'location-type', 'legacy-list-after-create');

    // The legacy list links into the React edit screen.
    const created = await page.request.get(url(`/api/locationTypes?q=${name}`));
    const lt = (await created.json()).data[0];
    expect(lt.locationTypeCode).toBe('INTERNAL');
    await page.goto(url(`/locationType/edit/${lt.id}`));
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name);
    await captureStep(page, 'location-type', 'react-edit');
    await page.getByLabel('Description').fill('renamed by characterization');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/locationType/list**');

    const updated = await page.request.get(url(`/api/locationTypes?q=${name}`));
    expect((await updated.json()).data[0].description).toBe('renamed by characterization');

    // Delete through the React edit screen.
    await page.goto(url(`/locationType/edit/${lt.id}`));
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/locationType/list**');
    const gone = await page.request.get(url(`/api/locationTypes?q=${name}`));
    expect((await gone.json()).data).toHaveLength(0);
  });
});
