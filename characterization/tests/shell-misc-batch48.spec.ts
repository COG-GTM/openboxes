import { test, expect } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for core shell & misc pages (Phase 2, Batch 48):
 * errors/notFound (-> /errors/handleNotFound), mobile/error and
 * mobile/chooseLocation now render the React SPA; /index redirects to the
 * dashboard.
 */

test.describe('batch 48 shell & misc react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/errors/details'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/errors/details (pinned released image)');
  });

  test('unknown page redirects to the React not-found screen', async ({ page }) => {
    await page.goto(url('/no/such/page/batch48'));
    await expect(page).toHaveURL(/\/errors\/handleNotFound/);
    await expect(page.getByText('Page Not Found').first()).toBeVisible();
    await expect(page.getByTestId('not-found-message'))
      .toContainText('Sorry, that resource could not be found.');
    await captureStep(page, 'errors', 'react-not-found');
  });

  test('record-not-found 404 shows the resource-with-id message', async ({ page }) => {
    // ObjectNotFoundException is mapped to handleNotFound; the record id must
    // survive the redirect so the id-specific message renders.
    await page.goto(url('/document/exportZebraTemplate/bogus-id-batch48'));
    await expect(page).toHaveURL(/\/errors\/handleNotFound/);
    await expect(page.getByTestId('not-found-summary')).toContainText('bogus-id-batch48');
  });

  test('mobile error screen renders captured error details', async ({ page }) => {
    // Stash 404 details by visiting an unknown page, then confirm the
    // shared error-details screen renders them at /mobile/error.
    await page.goto(url('/no/such/page/batch48'));
    await page.goto(url('/mobile/error'));
    await expect(page.getByText('Error Details').first()).toBeVisible();
    await expect(page.getByTestId('error-details')).toContainText('URI:');
    await expect(page.getByTestId('error-details')).toContainText('/no/such/page/batch48');
    await captureStep(page, 'mobile', 'react-error');
  });

  test('mobile choose location lists login locations and switches location', async ({ page }) => {
    const locationsResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/locations') && resp.status() === 200);
    await page.goto(url('/mobile/chooseLocation'));
    const body = await (await locationsResponse).json();
    await expect(page.getByText('Choose Location').first()).toBeVisible();
    await captureStep(page, 'mobile', 'react-choose-location');

    const container = page.getByTestId('mobile-choose-location');
    for (const location of body.data) {
      await expect(container.getByRole('button', { name: location.name }).first()).toBeVisible();
    }

    const boston = body.data.find((l: { name: string }) => l.name === 'Boston Warehouse');
    await container.getByRole('button', { name: boston.name }).first().click();
    // dashboard/chooseLocation stores the location in the session and redirects
    await page.waitForURL((u) => !u.pathname.includes('/mobile/chooseLocation'));
    await expect(page.locator('button:has-text("Boston Warehouse")').first()).toBeVisible();
    await captureStep(page, 'mobile', 'react-choose-location-chosen');
  });

  test('mobile choose location renders before any location is selected', async ({ browser }) => {
    // Fresh mobile login: no session location yet, so the React screen must
    // boot (getAppContext/getMenuConfig) without a current location.
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    const page = await context.newPage();
    await page.goto(url('/auth/login'));
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password');
    await page.click('#loginButton, button[type="submit"], form button');
    await page.waitForURL(/mobile\/chooseLocation/);
    await expect(page.getByText('Choose Location').first()).toBeVisible();
    await expect(page.getByTestId('mobile-choose-location')
      .getByRole('button', { name: 'Boston Warehouse' })).toBeVisible();
    await context.close();
  });

  test('/index redirects to the dashboard', async ({ page }) => {
    // "/index" now redirects to dashboard/index, whose canonical URL is the
    // context root (the "/" mapping) — same target as the legacy index.gsp
    // response.sendRedirect("dashboard/index").
    const response = await page.request.get(url('/index'), { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    await page.goto(url('/index'));
    await expect(page).not.toHaveURL(/\/index/);
    await expect(page.getByRole('menuitem', { name: 'Dashboard' })).toBeVisible();
  });
});
