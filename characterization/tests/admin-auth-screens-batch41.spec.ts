import { test, expect } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 41: React migrations of admin/status, admin/showUpgrade,
 * batch/importData, document/create and the standalone auth/login and
 * auth/signup screens.
 */
// The pinned released image (characterization job) predates the Batch 41
// endpoints/screens; these tests run against source builds.
async function skipUnlessBatch41(page): Promise<void> {
  const res = await page.request.get(url('/api/admin/status'));
  test.skip(res.status() === 404, 'Batch 41 endpoints not present in target build');
}

test.describe('batch41 admin & auth screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await skipUnlessBatch41(page);
    await login(page);
  });

  test('admin/status renders app status, plugins and controllers', async ({ page }) => {
    await page.goto(url('/admin/status'));
    await expect(page.locator('#application-status li').first()).toBeVisible();
    await captureStep(page, 'batch41-admin-status', 'status');

    // Same data as the API (parity assertion: counts match the backend).
    const apiRes = await page.request.get(url('/api/admin/status'));
    expect(apiRes.status()).toBe(200);
    const { data } = await apiRes.json();
    expect(data.controllerCount).toBeGreaterThan(0);
    await expect(page.locator('#installed-plugins li')).toHaveCount(data.plugins.length);
    await expect(page.locator('#available-controllers li')).toHaveCount(data.controllers.length);
    await expect(page.locator('#application-status')).toContainText(`Controllers: ${data.controllerCount}`);
  });

  test('admin/showUpgrade renders the download/deploy form', async ({ page }) => {
    await page.goto(url('/admin/showUpgrade'));
    await expect(page.locator('#remoteWebArchiveUrl')).toBeVisible();
    await expect(page.locator('#downloadButton')).toBeVisible();
    // Deploy is disabled until a download has completed.
    await expect(page.locator('#deployButton')).toBeDisabled();
    await captureStep(page, 'batch41-admin-upgrade', 'upgrade');
  });

  test('batch/importData renders the import type table and download links', async ({ page }) => {
    await page.goto(url('/batch/importData'));
    await expect(page.locator('#importFile')).toBeVisible();
    // All 19 import types from the legacy _uploadFileForm.gsp.
    await expect(page.locator('[data-testid="import-type-table"] input[name="importType"]')).toHaveCount(19);
    await expect(page.locator('#importType-tag')).toBeVisible();
    await captureStep(page, 'batch41-import-data', 'import-data');

    // ?type=... preselects the import type (legacy megamenu links).
    await page.goto(url('/batch/importData?type=inventoryLevel'));
    await expect(page.locator('#importType-inventoryLevel')).toBeChecked();
  });

  test('document/create uploads a document', async ({ page }) => {
    await page.goto(url('/document/create'));
    await expect(page.locator('#fileContents')).toBeVisible();
    await captureStep(page, 'batch41-document-create', 'create-form');

    await page.setInputFiles('#fileContents', {
      name: 'zz-e2e-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('batch 41 characterization upload'),
    });
    await page.click('#createButton');
    await page.waitForURL(/\/document\/edit\//);
    const documentId = page.url().split('/').pop();
    await captureStep(page, 'batch41-document-create', 'created');

    // Clean up so the flow is re-runnable (delete only allows POST).
    await page.request.post(url(`/document/delete/${documentId}`));
  });

  test('auth/signup redirects to login when reCAPTCHA is not configured', async ({ page }) => {
    // Demo config has signup enabled but no reCAPTCHA secret; the legacy
    // behavior (redirect to login) is preserved.
    await page.goto(url('/auth/logout'));
    await page.goto(url('/auth/signup'));
    await page.waitForURL(/\/auth\/login/);
    await expect(page.locator('#username')).toBeVisible();
    await captureStep(page, 'batch41-signup', 'redirected-to-login');
  });
});
