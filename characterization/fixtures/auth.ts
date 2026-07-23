import { Page, expect } from '@playwright/test';
import { ADMIN, LOCATIONS, url } from './constants';

/**
 * Logs in through the React login screen and selects the working location
 * (depot) when the app asks for one.
 */
export async function login(
  page: Page,
  {
    username = ADMIN.username as string,
    password = ADMIN.password as string,
    location = LOCATIONS.mainWarehouse.name as string,
  } = {},
): Promise<void> {
  await page.goto(url('/auth/login'));
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('#loginButton, button[type="submit"], form button');
  await page.waitForURL(/chooseLocation|dashboard/);
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('chooseLocation')) {
    await page.click(`a:has-text("${location}")`);
    await page.waitForLoadState('networkidle');
  }
  await expect(page.locator(`button:has-text("${location}")`).first()).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.goto(url('/auth/logout'));
  await page.waitForLoadState('domcontentloaded');
}
