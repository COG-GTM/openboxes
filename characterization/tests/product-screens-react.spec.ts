import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2 Batch 8: React product screens (edit, addDocument, batchEdit,
 * batchEditProperties, importAsCsv, productMergeLogs).
 *
 * These screens only exist in source builds that include the React migration
 * (the pinned released image still serves the legacy GSPs), so the whole
 * suite skips itself when /product/productMergeLogs does not serve the SPA.
 */

// Product codes are randomly generated at demo-import time, so resolve the
// product by its stable seeded NAME.
const PRODUCT_NAME = 'Lamivudine 150mg tablet';

async function isReactScreen(page: Page, path: string): Promise<boolean> {
  await page.goto(url(path));
  await page.waitForLoadState('domcontentloaded');
  return (await page.locator('#root').count()) > 0;
}

async function productId(page: Page): Promise<string> {
  const body = await page.request
    .get(url(`/api/products/search?name=${encodeURIComponent(PRODUCT_NAME)}`))
    .then((r) => r.json());
  const product = body.data.find(
    (p: { name: string }) => p.name === PRODUCT_NAME,
  );
  expect(product).toBeTruthy();
  return product.id;
}

test.describe('product React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    test.skip(
      !(await isReactScreen(page, '/product/productMergeLogs')),
      'React product screens not present in this build (legacy GSP served)',
    );
  });

  test('product edit form loads, saves and matches API data', async ({ page }) => {
    const FLOW = 'product-edit-react';
    const pid = await productId(page);

    await page.goto(url(`/product/edit/${pid}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-form')).toBeVisible();

    const details = await page.request
      .get(url(`/api/products/${pid}/details`))
      .then((r) => r.json());
    await expect(page.locator('#name')).toHaveValue(details.data.name);
    await expect(page.locator('#productCode')).toHaveValue(details.data.productCode);
    await captureStep(page, FLOW, 'product-edit');

    // No-op save round trip persists and returns to the form.
    await page.click('button:has-text("Save")');
    await expect(page.locator('.s-alert-box, .alert-success').first()).toBeVisible();
  });

  test('add document screen uploads and edit screen lists it', async ({ page }) => {
    const FLOW = 'product-add-document-react';
    const pid = await productId(page);

    await page.goto(url(`/product/addDocument/${pid}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('add-document-form')).toBeVisible();
    await captureStep(page, FLOW, 'add-document');

    const before = await page.request
      .get(url(`/api/products/${pid}/details`))
      .then((r) => r.json());

    await page.fill('#name', 'ZZ Char Document');
    await page.setInputFiles('#fileContents', {
      name: 'char-doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('characterization upload'),
    });
    await captureStep(page, FLOW, 'add-document-filled');
    await page.click('button:has-text("Upload")');
    await page.waitForURL(/inventoryItem\/showStockCard/);

    const after = await page.request
      .get(url(`/api/products/${pid}/details`))
      .then((r) => r.json());
    expect(after.data.documents.length).toBe(before.data.documents.length + 1);
    const uploaded = after.data.documents.find(
      (d: { name: string }) => d.name === 'ZZ Char Document',
    );
    expect(uploaded).toBeTruthy();

    // Cleanup via the API used by the edit screen's documents tab.
    const del = await page.request.delete(
      url(`/api/products/${pid}/documents/${uploaded.id}`),
    );
    expect(del.status()).toBe(204);
  });

  test('batch edit filters by category and shows editable rows', async ({ page }) => {
    const FLOW = 'product-batch-edit-react';

    await page.goto(url('/product/batchEdit'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('batch-edit-filters')).toBeVisible();
    await captureStep(page, FLOW, 'batch-edit-filters');

    const categories = await page.request
      .get(url('/api/categoryOptions'))
      .then((r) => r.json());
    const categoryId = categories.data[0].id;
    await page.selectOption('#categoryId', categoryId);
    await page.check('#includeCategoryChildren');
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');

    const api = await page.request
      .get(url(`/api/products/batchEdit?categoryId=${categoryId}&includeCategoryChildren=on&max=10`))
      .then((r) => r.json());
    await expect(page.getByTestId('batch-edit-results-count'))
      .toContainText(`${api.totalCount}`);
    const rows = page.getByTestId('batch-edit-table').locator('tbody tr');
    await expect(rows).toHaveCount(Math.min(api.totalCount, 10));
    await captureStep(page, FLOW, 'batch-edit-results');
  });

  test('batch edit properties shows the filtered result count', async ({ page }) => {
    const FLOW = 'product-batch-edit-properties-react';

    const categories = await page.request
      .get(url('/api/categoryOptions'))
      .then((r) => r.json());
    const categoryId = categories.data[0].id;

    await page.goto(url(`/product/batchEditProperties?categoryId=${categoryId}&includeCategoryChildren=on`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('batch-edit-properties-title')).toBeVisible();

    const api = await page.request
      .get(url(`/api/products/batchEdit?categoryId=${categoryId}&includeCategoryChildren=on`))
      .then((r) => r.json());
    await expect(page.getByTestId('batch-edit-properties-count'))
      .toContainText(`${api.totalCount}`);
    await captureStep(page, FLOW, 'batch-edit-properties');
  });

  test('import as CSV validates a file and shows the verify step', async ({ page }) => {
    const FLOW = 'product-import-csv-react';

    await page.goto(url('/product/importAsCsv'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('import-upload-form')).toBeVisible();
    await captureStep(page, FLOW, 'import-step1');

    const header = 'Id,Active,ProductCode,ProductType,Name,ProductFamily,Category,GLAccount,'
      + 'Description,UnitOfMeasure,Tags,UnitCost,LotAndExpiryControl,ColdChain,'
      + 'ControlledSubstance,HazardousMaterial,Reconditioned,Manufacturer,'
      + 'BrandName,ManufacturerCode,ManufacturerName,Vendor,VendorCode,'
      + 'VendorName,UPC,NDC,Created,Updated';
    const row = ',true,,Default,ZZ Char Import Product,,,,'
      + ',each,,,false,false,false,false,false,,,,,,,,,,,';
    await page.setInputFiles('[data-testid="import-file-input"]', {
      name: 'products.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`${header}\n${row}`),
    });
    await page.click('button:has-text("Upload")');
    await expect(page.getByTestId('import-verify-step')).toBeVisible();
    await expect(page.getByTestId('import-results-count')).toContainText('1');
    await expect(page.getByTestId('import-verify-table'))
      .toContainText('ZZ Char Import Product');
    await captureStep(page, FLOW, 'import-step2-verify');
    // Import itself is not exercised: products cannot be deleted through the
    // API, so a real import would permanently grow the seeded dataset.
  });

  test('merge logs screen matches the API row count', async ({ page }) => {
    const FLOW = 'product-merge-logs-react';

    await page.goto(url('/product/productMergeLogs'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('merge-logs-table')).toBeVisible();

    const api = await page.request
      .get(url('/api/products/mergeLogs?max=10&offset=0'))
      .then((r) => r.json());
    await expect(page.getByTestId('merge-logs-count'))
      .toContainText(`${api.totalCount}`);
    const rows = page.getByTestId('merge-logs-table').locator('tbody tr');
    await expect(rows).toHaveCount(api.data.length);
    await captureStep(page, FLOW, 'merge-logs');

    // Filtering by a non-existent code yields no rows.
    await page.fill('[data-testid="primary-product-code-input"]', 'ZZNOSUCHCODE');
    await page.click('button:has-text("Search")');
    await expect(rows).toHaveCount(0);
    await captureStep(page, FLOW, 'merge-logs-filtered');
  });
});
