import { test, expect } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React admin console screens (Phase 2, Batch 40).
 *
 * The legacy /admin/(index|controllerActions|cache|plugins|sendMail|
 * showSettings) URLs now render the React SPA, backed by the /api/admin/*
 * endpoints (openapi/specs/admin-api.yaml).
 */

test.describe('admin react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/admin/plugins'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/admin/plugins (pinned released image)');
  });

  test('admin index lists all controllers', async ({ page }) => {
    const api = await page.request.get(url('/api/admin/controllers'));
    const controllers = (await api.json()).data;

    await page.goto(url('/admin/index'));
    await expect(page.locator('.title').getByText('Controllers')).toBeVisible();
    await captureStep(page, 'admin', 'react-index');
    await expect(page.getByTestId('admin-controllers').locator('li')).toHaveCount(controllers.length);
    await expect(
      page.getByTestId('admin-controllers').getByText('org.pih.warehouse.admin.AdminController'),
    ).toBeVisible();
  });

  test('controller actions screen renders the API rows', async ({ page }) => {
    const api = await page.request.get(url('/api/admin/controllerActions'));
    const actionNames = (await api.json()).data;

    await page.goto(url('/admin/controllerActions'));
    await expect(page.locator('.title').getByText('Controller Actions')).toBeVisible();
    await captureStep(page, 'admin', 'react-controller-actions');
    if (actionNames.length > 0) {
      await expect(page.getByTestId('admin-controller-actions').locator('li')).toHaveCount(actionNames.length);
    } else {
      await expect(page.getByText('No controller actions found')).toBeVisible();
    }
  });

  test('plugins screen lists installed plugins', async ({ page }) => {
    const api = await page.request.get(url('/api/admin/plugins'));
    const plugins = (await api.json()).data;
    expect(plugins.length).toBeGreaterThan(0);

    await page.goto(url('/admin/plugins'));
    await expect(page.locator('.title').getByText('Installed Plug-ins')).toBeVisible();
    await captureStep(page, 'admin', 'react-plugins');
    await expect(page.getByTestId('admin-plugins').locator('li')).toHaveCount(plugins.length);
    await expect(
      page.getByTestId('admin-plugins').getByText(`${plugins[0].name} - ${plugins[0].version}`),
    ).toBeVisible();
  });

  test('cache screen renders hibernate statistics and evicts', async ({ page }) => {
    const api = await page.request.get(url('/api/admin/cache'));
    const cache = (await api.json()).data;

    await page.goto(url('/admin/cache'));
    await expect(page.locator('.title').getByText('Cache')).toBeVisible();
    await captureStep(page, 'admin', 'react-cache');

    // Entity cache table lists every domain class.
    await expect(page.getByTestId('cache-entities').locator('tbody tr')).toHaveCount(cache.entities.length);

    // Evict-all button reports the legacy flash message as a notification.
    await page.getByRole('button', { name: 'Evict all' }).click();
    await expect(page.getByText('All query caches were invalidated')).toBeVisible();
  });

  test('send mail screen submits and reports a status message', async ({ page }) => {
    await page.goto(url('/admin/sendMail'));
    await expect(page.locator('.title').getByText('Email')).toBeVisible();
    await captureStep(page, 'admin', 'react-send-mail');

    // Defaults mirror the legacy form (session user email + Test email subject).
    await expect(page.locator('#send-mail-subject')).toHaveValue('Test email');

    await page.locator('#send-mail-to').fill('admin@example.com');
    await page.locator('#send-mail-message').fill('Characterization test email body');
    await page.getByRole('button', { name: 'Send Mail' }).click();
    await expect(page.getByText(/email with subject Test email/)).toBeVisible();
  });

  test('settings screen renders every legacy tab', async ({ page }) => {
    const api = await page.request.get(url('/api/admin/settings'));
    const settings = (await api.json()).data;

    await page.goto(url('/admin/showSettings'));
    await expect(page.locator('.title').getByText('Settings')).toBeVisible();
    await captureStep(page, 'admin', 'react-settings-general');

    // General tab pins environment/version values from the API.
    const general = page.getByTestId('settings-general');
    await expect(general.getByText(settings.environment)).toBeVisible();
    await expect(general.getByText(settings.defaultCharset).first()).toBeVisible();

    await page.getByRole('button', { name: 'Email settings' }).click();
    await expect(page.getByTestId('settings-email')).toBeVisible();

    await page.getByRole('button', { name: 'External application configuration' }).click();
    await expect(page.getByTestId('settings-external-config')).toBeVisible();

    await page.getByRole('button', { name: 'System properties' }).click();
    const sysProps = page.getByTestId('settings-system-properties');
    await expect(sysProps.getByText('java.version', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Printers' }).click();
    await expect(page.getByTestId('settings-printers')).toBeVisible();

    await page.getByRole('button', { name: 'Background jobs' }).click();
    await expect(page.getByTestId('settings-background-jobs')).toBeVisible();
    await expect(page.getByText(settings.quartz.schedulerName).first()).toBeVisible();
    await captureStep(page, 'admin', 'react-settings-background-jobs');

    await page.getByRole('button', { name: 'Caches' }).click();
    await expect(page.getByTestId('settings-caches')).toBeVisible();
  });

  test('trigger stock alerts reports the legacy flash message', async ({ page }) => {
    await page.goto(url('/admin/showSettings'));
    await page.getByRole('button', { name: 'Background jobs' }).click();
    await page.getByRole('button', { name: 'Trigger' }).click();
    await expect(page.getByText('Triggered send stock alerts job in background')).toBeVisible();
  });
});
