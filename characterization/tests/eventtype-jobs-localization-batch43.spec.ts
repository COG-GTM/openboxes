import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for eventType list/show, jobs show and localization
 * list/create/edit (Phase 2, Batch 43). The legacy /eventType/(list|show),
 * /jobs/show and /localization/(list|create|edit) URLs render the React SPA.
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

test.describe('event type react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/eventTypes?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/eventTypes (pinned released image)');
  });

  test('lists event types with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/eventTypes') && resp.status() === 200);
    await page.goto(url('/eventType/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Event Types').first()).toBeVisible();
    await captureStep(page, 'event-type', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('filters the list and shows an event type', async ({ page }) => {
    const listed = await (await page.request.get(url('/api/eventTypes?max=1&sort=name'))).json();
    const eventType = listed.data[0];

    await page.goto(url('/eventType/list'));
    await page.getByPlaceholder('Search by name').fill(eventType.name);
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByRole('link', { name: eventType.name })).toBeVisible();
    await captureStep(page, 'event-type', 'react-list-filtered');

    await page.goto(url(`/eventType/show/${eventType.id}`));
    await expect(page.getByText(`Event Type: ${eventType.name}`)).toBeVisible();
    const details = page.getByTestId('event-type-details');
    await expect(details.getByLabel('Name')).toHaveText(eventType.name);
    await expect(details.getByLabel('Event Status')).toHaveText(eventType.eventCode ?? '');
    await captureStep(page, 'event-type', 'react-show');
  });
});

test.describe('localization react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/localizationOverrides?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/localizationOverrides (pinned released image)');
  });

  test('lists localizations with data from the API', async ({ page }) => {
    const apiResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/localizationOverrides') && resp.status() === 200);
    await page.goto(url('/localization/list'));
    const body = await (await apiResponse).json();
    await expect(page.getByText('List Localizations').first()).toBeVisible();
    await captureStep(page, 'localization', 'react-list');
    const visibleRows = Math.min(body.totalCount, 10);
    await expect
      .poll(async () => reactTableRowCount(page))
      .toBe(visibleRows);
  });

  test('creates, edits and deletes a localization', async ({ page }) => {
    const code = `zz.playwright.${runId()}`;
    await page.goto(url('/localization/create'));
    await expect(page.getByText('Create Localization').first()).toBeVisible();
    await captureStep(page, 'localization', 'react-create');

    await page.getByLabel('Code').fill(code);
    await page.getByLabel('Text', { exact: true }).fill('created by characterization');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/localization/list**');

    // The new row is findable through the list search.
    await page.getByPlaceholder('Search by code or text').fill(code);
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByRole('link', { name: code })).toBeVisible();
    await captureStep(page, 'localization', 'react-list-filtered');

    // Edit the text.
    await page.getByRole('link', { name: code }).click();
    await page.waitForURL('**/localization/edit/**');
    await expect(page.getByLabel('Code')).toHaveValue(code);
    await page.getByLabel('Text', { exact: true }).fill('edited by characterization');
    await captureStep(page, 'localization', 'react-edit');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL('**/localization/list**');

    const check = await page.request.get(url(`/api/localizationOverrides?q=${code}&locale=en`));
    const row = (await check.json()).data[0];
    expect(row.text).toBe('edited by characterization');

    // Delete through the list row action.
    await page.getByPlaceholder('Search by code or text').fill(code);
    await page.getByRole('button', { name: 'Find' }).click();
    await page.locator('.rt-tr', { hasText: code }).getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect
      .poll(async () => {
        const gone = await page.request.get(url(`/api/localizationOverrides?q=${code}&locale=en`));
        return (await gone.json()).data.length;
      })
      .toBe(0);
  });
});

test.describe('jobs react screen', () => {
  const jobName = 'org.pih.warehouse.jobs.DataCleaningJob';

  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url(`/api/jobs/details?name=${jobName}`));
    test.skip(probe.status() !== 200, 'app build does not expose /api/jobs/details (pinned released image)');
  });

  test('shows a job with its details and triggers', async ({ page }) => {
    const details = await (await page.request.get(url(`/api/jobs/details?name=${jobName}`))).json();
    await page.goto(url(`/jobs/show/${jobName}`));
    await expect(page.getByText(`Job: ${details.data.key}`)).toBeVisible();
    const table = page.getByTestId('job-details');
    await expect(table.getByLabel('Name')).toHaveText(jobName);
    // Grails wraps job classes in GrailsJobFactory$StatefulGrailsJob
    await expect(table.getByLabel('Job Class')).toHaveText(details.data.jobClass);
    await captureStep(page, 'jobs', 'react-show');
    const rows = page.getByTestId('job-triggers').locator('tbody tr');
    await expect(rows).toHaveCount(Math.max(details.data.triggers.length, 1));
  });

  test('adds and deletes a trigger', async ({ page }) => {
    const cron = '0 59 23 31 12 ? 2099';
    await page.goto(url(`/jobs/show/${jobName}`));
    await expect(page.getByLabel('Cron expression')).toBeVisible();
    await page.getByLabel('Cron expression').fill(cron);
    await page.getByRole('button', { name: 'Add trigger' }).click();
    const row = page.getByTestId('job-triggers').locator('tbody tr', { hasText: cron });
    await expect(row).toBeVisible();
    await captureStep(page, 'jobs', 'react-show-with-trigger');

    await row.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(row).toHaveCount(0);
    const check = await (await page.request.get(url(`/api/jobs/details?name=${jobName}`))).json();
    expect(check.data.triggers.every((t: { cronExpression?: string }) => t.cronExpression !== cron)).toBe(true);
  });
});
