import { test, expect, Page } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for person list/create/edit/show and supplier list/show
 * (Phase 2, Batch 36).
 *
 * The legacy /person/(list|create|edit|show) and /supplier/(list|show) URLs
 * now render the React SPA, backed by /api/persons/search,
 * /api/persons/{id}/details, /api/suppliers/search,
 * /api/suppliers/{id}/details and /api/suppliers/{id}/priceHistory.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('person react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/persons/search?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/persons/search (pinned released image)');
  });

  test('lists people with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/persons/search') && resp.status() === 200);
    await page.goto(url('/person/list'));
    const body = await (await apiResponse).json();
    await expect(page.locator('.list-page-header').getByText('List People')).toBeVisible();
    await captureStep(page, 'person', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('filters the person list', async ({ page }) => {
    await page.goto(url('/person/list'));
    await expect(page.locator('.list-page-header').getByText('List People')).toBeVisible();
    const filtered = await page.request.get(url('/api/persons/search?q=Smith&max=10'));
    const filteredBody = await filtered.json();
    await page.getByPlaceholder('Search by name or email').fill('Smith');
    await page.getByRole('button', { name: 'Find' }).click();
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(filteredBody.totalCount, 10));
  });

  test('creates, shows, edits and deletes a person', async ({ page }) => {
    await page.goto(url('/person/create'));
    await expect(page.getByText('Add Person').first()).toBeVisible();
    await captureStep(page, 'person', 'react-create');

    const before = await page.request.get(url('/api/persons/search?max=1'));
    const beforeCount = (await before.json()).totalCount;

    await page.getByLabel('First Name').fill('ZZ Characterization');
    await page.getByLabel('Last Name').fill('Person');
    await page.getByLabel('Email').fill('zz.characterization@example.com');
    await page.getByLabel('Phone Number').fill('555-0137');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/person/list**');

    const after = await page.request.get(url('/api/persons/search?q=zz.characterization@example.com'));
    const afterBody = await after.json();
    expect(afterBody.data).toHaveLength(1);
    const personId = afterBody.data[0].id;
    expect(afterBody.data[0].firstName).toBe('ZZ Characterization');
    expect(afterBody.data[0].type).toBe('Person');

    const total = await page.request.get(url('/api/persons/search?max=1'));
    expect((await total.json()).totalCount).toBe(beforeCount + 1);

    // The show screen renders the person details.
    await page.goto(url(`/person/show/${personId}`));
    await expect(page.getByText('Person: ZZ Characterization Person')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveText('zz.characterization@example.com');
    await expect(page.getByLabel('Type')).toHaveText('Person');
    await captureStep(page, 'person', 'react-show');

    // The edit screen loads the current values and updates them.
    await page.goto(url(`/person/edit/${personId}`));
    await expect(page.getByText('Edit Person').first()).toBeVisible();
    await expect(page.getByLabel('First Name')).toHaveValue('ZZ Characterization');
    await captureStep(page, 'person', 'react-edit');
    await page.getByLabel('Phone Number').fill('555-0138');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL('**/person/list**');

    const details = await page.request.get(url(`/api/persons/${personId}/details`));
    expect((await details.json()).data.phoneNumber).toBe('555-0138');

    // Delete the person through the show screen.
    await page.goto(url(`/person/show/${personId}`));
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/person/list**');
    const gone = await page.request.get(url('/api/persons/search?q=zz.characterization@example.com'));
    expect((await gone.json()).data).toHaveLength(0);
  });
});

test.describe('supplier react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/suppliers/search?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/suppliers/search (pinned released image)');
  });

  test('lists suppliers with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/suppliers/search') && resp.status() === 200);
    await page.goto(url('/supplier/list'));
    const body = await (await apiResponse).json();
    await expect(page.locator('.list-page-header').getByText('List Suppliers')).toBeVisible();
    await captureStep(page, 'supplier', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('shows a supplier with locations, price history and documents', async ({ page }) => {
    const search = await page.request.get(url('/api/suppliers/search?max=1'));
    const supplierRow = (await search.json()).data[0];
    const organizationId = supplierRow.organization.id;

    const details = await page.request.get(url(`/api/suppliers/${organizationId}/details`));
    const detailsBody = (await details.json()).data;
    const priceHistory = await page.request.get(url(`/api/suppliers/${organizationId}/priceHistory`));
    const priceHistoryRows = (await priceHistory.json()).data;

    await page.goto(url(`/supplier/show/${organizationId}`));
    await expect(page.getByText(detailsBody.displayName).first()).toBeVisible();
    await captureStep(page, 'supplier', 'react-show');

    // Every location is listed and linked.
    const locations = page.getByTestId('supplier-locations').locator('a');
    await expect(locations).toHaveCount(detailsBody.locations.length);

    // The price history table renders the API rows (first page).
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(Math.min(priceHistoryRows.length, 10));
  });
});
