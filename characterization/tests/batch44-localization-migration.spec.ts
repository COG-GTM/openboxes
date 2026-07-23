import { test, expect } from '@playwright/test';
import { url } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for localization/show and the migration admin dashboard
 * (Phase 2, Batch 44). The legacy /localization/show/:id and
 * /migration/(index|dataQuality|dataMigration|dimensionTables|factTables)
 * URLs now render the React SPA, backed by /api/localizations/{id}/details,
 * DELETE /api/localizations/{id} and the read-only /api/migration/*
 * endpoints. The legacy tabbed dashboard remains at /migration/legacy for the
 * unmigrated Materialized Views and Product Availability tabs.
 */

test.describe('batch 44 react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/migration/dataQuality'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/migration/* (pinned released image)');
  });

  test('migration index redirects to the data quality tab', async ({ page }) => {
    await page.goto(url('/migration/index'));
    await page.waitForURL('**/migration/dataQuality');
    await expect(page.getByTestId('migration-tabs')).toBeVisible();
  });

  test('data quality tab shows counts matching the API', async ({ page }) => {
    const counts = await (await page.request.get(url('/api/migration/dataQuality'))).json();
    await page.goto(url('/migration/dataQuality'));
    await expect(page.getByTestId('data-quality-table')).toBeVisible();
    await expect(page.getByTestId('receiptsWithoutTransaction-count'))
      .toHaveText(String(counts.data.receiptsWithoutTransactionCount));
    await expect(page.getByTestId('shipmentsWithoutTransactions-count'))
      .toHaveText(String(counts.data.shipmentsWithoutTransactionsCount));
    await expect(page.getByTestId('stockMovementsWithoutShipmentItems-count'))
      .toHaveText(String(counts.data.stockMovementsWithoutShipmentItemsCount));
    await captureStep(page, 'batch44', 'react-data-quality');

    // The List action loads the detail rows inline.
    await page.getByTestId('receiptsWithoutTransaction-list-button').click();
    await expect(page.getByTestId('data-quality-details')).toBeVisible();
  });

  test('data migration tab shows counts matching the API', async ({ page }) => {
    const body = await (await page.request.get(url('/api/migration/dataMigration'))).json();
    await page.goto(url('/migration/dataMigration'));
    await expect(page.getByTestId('data-migration-table')).toBeVisible();
    await expect(page.getByTestId('organization-count'))
      .toHaveText(String(body.data.organizationCount));
    await expect(page.getByTestId('product-supplier-count'))
      .toHaveText(String(body.data.productSupplierCount));
    await expect(page.getByTestId('inventory-transaction-count'))
      .toHaveText(String(body.data.inventoryTransactionCount));
    await captureStep(page, 'batch44', 'react-data-migration');
  });

  test('dimension tables tab shows counts matching the API', async ({ page }) => {
    const body = await (await page.request.get(url('/api/migration/dimensionTables'))).json();
    await page.goto(url('/migration/dimensionTables'));
    await expect(page.getByTestId('dimension-tables-table')).toBeVisible();
    for (const key of ['dateDimensionCount', 'locationDimensionCount',
      'lotDimensionCount', 'productDimensionCount']) {
      await expect(page.getByTestId(key)).toHaveText(String(body.data[key]));
    }
    await captureStep(page, 'batch44', 'react-dimension-tables');
  });

  test('fact tables tab shows counts matching the API', async ({ page }) => {
    const body = await (await page.request.get(url('/api/migration/factTables'))).json();
    await page.goto(url('/migration/factTables'));
    await expect(page.getByTestId('fact-tables-table')).toBeVisible();
    for (const key of ['transactionFactCount', 'consumptionFactCount', 'stockoutFactCount']) {
      await expect(page.getByTestId(key)).toHaveText(String(body.data[key]));
    }
    await captureStep(page, 'batch44', 'react-fact-tables');
  });

  test('legacy migration dashboard remains for unmigrated tabs', async ({ page }) => {
    await page.goto(url('/migration/legacy'));
    await expect(page.getByText('Materialized Views').first()).toBeVisible();
    await expect(page.getByText('Product Availability').first()).toBeVisible();
  });

  test('localization show renders record details and deletes', async ({ page }) => {
    // Create a record through the legacy save action, then view it in React.
    const code = `e2e.test.batch44.${Date.now()}.label`;
    const save = await page.request.post(url('/localization/save'), {
      form: { code, locale: 'en', text: 'E2E Test' },
      maxRedirects: 0,
    });
    expect(save.status()).toBe(302);
    const location = save.headers()['location'] ?? '';
    const localizationId = location.replace(/\/$/, '').split('/').pop();

    await page.goto(url(`/localization/show/${localizationId}`));
    await expect(page.getByText(`Localization: ${code}`)).toBeVisible();
    await expect(page.getByLabel('Code')).toHaveText(code);
    await expect(page.getByLabel('Locale')).toHaveText('en');
    await expect(page.getByLabel('Text')).toHaveText('E2E Test');
    await captureStep(page, 'batch44', 'react-localization-show');

    // Delete through the show screen.
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/localization/list**');
    const details = await page.request.get(
      url(`/api/localizations/${localizationId}/details`),
      { headers: { Accept: 'application/json' } });
    expect(details.status()).toBe(404);
  });
});
