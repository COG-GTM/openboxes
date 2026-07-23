import { test, expect } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React admin & users screens (Phase 2, Batch 45).
 *
 * The legacy /migration/materializedViews, /migration/productAvailability,
 * /quartz/list, /role/show, /user/create and /user/changePhoto URLs now
 * render the React SPA, backed by the /api/migration/*, /api/jobs/*,
 * /api/roles/* and /api/users/* endpoints.
 */

test.describe('batch 45 react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/migration/materializedViews'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/migration/materializedViews (pinned released image)');
  });

  test('materialized views screen shows the table counts', async ({ page }) => {
    const api = await page.request.get(url('/api/migration/materializedViews'));
    const counts = (await api.json()).data;

    await page.goto(url('/migration/materializedViews'));
    await expect(page.locator('.title').getByText('Materialized Views')).toBeVisible();
    await captureStep(page, 'batch45', 'react-materialized-views');
    await expect(page.getByTestId('product-demand-count'))
      .toHaveText(String(counts.productDemandCount));
    await expect(page.getByTestId('product-availability-count'))
      .toHaveText(String(counts.productAvailabilityCount));
  });

  test('migration product availability screen lists depots', async ({ page }) => {
    const api = await page.request.get(url('/api/migration/productAvailability'));
    const rows = (await api.json()).data;
    expect(rows.length).toBeGreaterThan(0);

    await page.goto(url('/migration/productAvailability'));
    await expect(page.locator('.title').getByText('Product Availability')).toBeVisible();
    await captureStep(page, 'batch45', 'react-migration-product-availability');
    await expect(page.getByTestId('product-availability').locator('tbody tr')).toHaveCount(rows.length);
    for (const row of rows) {
      await expect(page.getByTestId(`product-availability-count-${row.locationId}`))
        .toHaveText(row.productAvailabilityCount === null ? '' : String(row.productAvailabilityCount));
    }
  });

  test('quartz list screen lists all jobs', async ({ page }) => {
    const api = await page.request.get(url('/api/jobs/list'));
    const { jobs } = (await api.json()).data;
    expect(jobs.length).toBeGreaterThan(0);

    await page.goto(url('/quartz/list'));
    await expect(page.locator('.title').getByText('Quartz Jobs')).toBeVisible();
    await captureStep(page, 'batch45', 'react-quartz-list');
    await expect(page.getByTestId('quartz-jobs').locator('tbody tr')).toHaveCount(jobs.length);
    await expect(
      page.getByTestId('quartz-jobs').getByText('org.pih.warehouse.jobs.DataCleaningJob'),
    ).toBeVisible();
  });

  test('role show screen shows the seeded Admin role', async ({ page }) => {
    const api = await page.request.get(url('/api/roles/1'));
    test.skip(api.status() !== 200, 'Admin role not seeded with id 1');
    const role = (await api.json()).data;

    await page.goto(url('/role/show/1'));
    await expect(page.locator('.title').getByText('Show Role')).toBeVisible();
    await captureStep(page, 'batch45', 'react-role-show');
    await expect(page.getByTestId('role-details').getByLabel('Name')).toHaveText(role.name);
    await expect(page.getByTestId('role-details').getByLabel('Role Type')).toHaveText(role.roleType);
  });

  test('user create screen renders the form fields', async ({ page }) => {
    await page.goto(url('/user/create'));
    await expect(page.locator('.title').getByText('Create User')).toBeVisible();
    await captureStep(page, 'batch45', 'react-user-create');
    const form = page.locator('form');
    for (const label of ['Username', 'First Name', 'Last Name', 'Password', 'Email', 'Locale']) {
      await expect(form.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('user change photo screen shows the user summary and upload controls', async ({ page }) => {
    const api = await page.request.get(url('/api/users/1/details'));
    test.skip(api.status() !== 200, 'admin user not seeded with id 1');
    const user = (await api.json()).data;

    await page.goto(url('/user/changePhoto/1'));
    await expect(page.locator('.title').getByText('Change photo')).toBeVisible();
    await captureStep(page, 'batch45', 'react-user-change-photo');
    await expect(page.locator('.title')).toContainText(`${user.firstName} ${user.lastName}`);
    await expect(page.getByLabel('active-status'))
      .toHaveText(user.active ? 'Active' : 'Inactive');
    await expect(page.locator('input[type="file"]')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible();
  });
});
