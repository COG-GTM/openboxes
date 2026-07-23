import { test, expect } from '@playwright/test';
import { ADMIN, LOCATIONS, url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Flow 1: Login / logout.
 *
 * Characterizes the auth flow (React login screen as of Batch 41): form
 * login, mandatory location choice, an authenticated session (user menu +
 * API access), logout, and rejection of bad credentials.
 */
test.describe('login', () => {
  test.beforeEach(() => resetStepCounter());

  test('logs in as admin, establishes a session, and logs out', async ({ page }) => {
    await page.goto(url('/auth/login'));
    await captureStep(page, 'login', 'login-page');
    await expect(page.locator('#username')).toBeVisible();

    await page.fill('#username', ADMIN.username);
    await page.fill('#password', ADMIN.password);
    await page.click('button[type="submit"], form button');
    await page.waitForURL(/chooseLocation|dashboard/);

    // First navigation after login forces a location choice.
    expect(page.url()).toContain('/dashboard/chooseLocation');
    await captureStep(page, 'login', 'choose-location');
    await page.click(`a:has-text("${LOCATIONS.mainWarehouse.name}")`);
    await page.waitForLoadState('networkidle');

    // Dashboard with the chosen location in the navbar.
    await expect(page.locator(`button:has-text("${LOCATIONS.mainWarehouse.name}")`).first()).toBeVisible();
    await captureStep(page, 'login', 'dashboard');

    // Real outcome: the session is authenticated against the JSON API too.
    const apiRes = await page.request.get(url('/api/stockMovements/shipmentStatusCodes'));
    expect(apiRes.status()).toBe(200);

    await page.goto(url('/auth/logout'));
    await page.waitForLoadState('domcontentloaded');
    await captureStep(page, 'login', 'logged-out');

    // Session is gone: a protected page bounces back to the login form.
    await page.goto(url('/dashboard/index'));
    await expect(page.locator('#username')).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto(url('/auth/login'));
    await page.fill('#username', ADMIN.username);
    await page.fill('#password', 'definitely-wrong-password');
    await page.click('button[type="submit"], form button');
    await page.waitForLoadState('domcontentloaded');

    // Still on the login screen (GSP re-render or React inline error), no
    // session established.
    expect(page.url()).toMatch(/\/auth\/(login|handleLogin)/);
    await expect(page.locator('#username')).toBeVisible();

    // A protected page still redirects to login.
    await page.goto(url('/dashboard/index'));
    await expect(page.locator('#username')).toBeVisible();
    await captureStep(page, 'login', 'invalid-credentials');
  });
});
