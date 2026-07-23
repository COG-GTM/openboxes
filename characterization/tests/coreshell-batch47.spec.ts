import { test, expect } from '@playwright/test';
import { ADMIN, LOCATIONS, url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for the core shell (Phase 2, Batch 47):
 * dashboard/chooseLocation, dashboard/megamenu (React menu parity), the
 * general error screen (/errors/showError) and the accessDenied /
 * dataAccess / methodNotAllowed error screens.
 */

test.describe('choose location react screen', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
  });

  test('lists login locations from the API and selects one', async ({ page }) => {
    await page.goto(url('/auth/login'));
    await page.fill('#username', ADMIN.username);
    await page.fill('#password', ADMIN.password);
    await page.click('#loginButton, button[type="submit"], form button');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/dashboard/chooseLocation');
    const probe = await page.request.get(url('/api/loginLocations'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/loginLocations (pinned released image)');
    const body = await probe.json();

    await expect(page.getByText('Choose Location').first()).toBeVisible();
    await captureStep(page, 'choose-location', 'react-choose-location');

    // Same organization tabs as the API returns (plus a saved-locations tab)
    const organizations = Object.keys(body.data.loginLocations);
    const savedTab = body.data.savedLocations.length > 0 ? 1 : 0;
    const tabs = page.getByTestId('location-organization-list').getByRole('tab');
    await expect(tabs).toHaveCount(organizations.length + savedTab);

    // The first organization panel lists exactly its locations
    await tabs.nth(savedTab).click();
    const firstOrgLocations = body.data.loginLocations[organizations[0]];
    const visiblePanel = page.locator('.react-tabs__tab-panel--selected');
    await expect(visiblePanel.locator('a.location-chooser__location-button'))
      .toHaveCount(firstOrgLocations.length);

    // Selecting a location goes through the legacy URL and lands on the dashboard
    await page.click(`a:has-text("${LOCATIONS.mainWarehouse.name}")`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`button:has-text("${LOCATIONS.mainWarehouse.name}")`).first()).toBeVisible();
    await captureStep(page, 'choose-location', 'after-selection');
  });
});

test.describe('megamenu react parity', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
  });

  test('renders the menu sections from the menu config API', async ({ page }) => {
    const menuConfig = await (await page.request.get(url('/api/getMenuConfig'))).json();
    const sections = menuConfig.data.menuConfig
      .filter((section: { id: string }) => section.id !== 'configuration');

    await page.goto(url('/dashboard'));
    const menu = page.locator('.menu-wrapper');
    await expect(menu).toBeVisible();
    for (const section of sections) {
      await expect(menu.locator('a.nav-link', { hasText: section.label }).first()).toBeVisible();
    }
    await captureStep(page, 'megamenu', 'react-megamenu');
  });
});

test.describe('error react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/errors/lastError'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/errors/lastError (pinned released image)');
  });

  test('access denied screen', async ({ page }) => {
    await page.goto(url('/errors/handleForbidden'));
    await expect(page.getByText('Access Denied').first()).toBeVisible();
    await expect(page.getByText('you are not authorized to access')).toBeVisible();
    await captureStep(page, 'errors', 'react-access-denied');
  });

  test('data access error screen', async ({ page }) => {
    await page.goto(url('/errors/handleInvalidDataAccess'));
    await expect(page.getByText('Data Access Error').first()).toBeVisible();
    await expect(page.getByText('unspeakable to the database')).toBeVisible();
    await captureStep(page, 'errors', 'react-data-access');
  });

  test('method not allowed screen', async ({ page }) => {
    await page.goto(url('/errors/handleMethodNotAllowed'));
    await expect(page.getByText('Method Not Allowed').first()).toBeVisible();
    await captureStep(page, 'errors', 'react-method-not-allowed');
  });

  test('general error screen with report-a-bug dialog', async ({ page }) => {
    await page.goto(url('/errors/showError'));
    await expect(page.getByText('An error has occurred').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ignore Error' })).toBeVisible();
    await captureStep(page, 'errors', 'react-general-error');

    await page.getByRole('button', { name: 'Report as Bug' }).click();
    await expect(page.getByText('Report a Bug').first()).toBeVisible();
    await captureStep(page, 'errors', 'react-report-bug-dialog');
  });
});
