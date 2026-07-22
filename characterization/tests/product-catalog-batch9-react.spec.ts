import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2 Batch 9: React product catalog screens (product/search,
 * product/show, product/upnDatabase, productAssociation list/create/edit).
 *
 * These screens only exist in source builds that include the React migration
 * (the pinned released image still serves the legacy GSPs), so the whole
 * suite skips itself when /productAssociation/list does not serve the SPA.
 */

// Product codes are randomly generated at demo-import time, so resolve
// products by their stable seeded NAMEs.
const PRODUCT_NAME = 'Lamivudine 150mg tablet';
const ASSOCIATED_PRODUCT_NAME = 'Lamivudine 150mg + zidovudine 300mg tablet';
const TEST_COMMENT = 'ZZ char batch9 association';

async function isReactScreen(page: Page, path: string): Promise<boolean> {
  await page.goto(url(path));
  await page.waitForLoadState('domcontentloaded');
  return (await page.locator('#root').count()) > 0;
}

async function productIdByName(page: Page, name: string): Promise<string> {
  const body = await page.request
    .get(url(`/api/products/search?name=${encodeURIComponent(name)}`))
    .then((r) => r.json());
  const product = body.data.find((p: { name: string }) => p.name === name);
  expect(product).toBeTruthy();
  return product.id;
}

async function cleanupTestAssociations(page: Page): Promise<void> {
  const body = await page.request
    .get(url('/api/productAssociations?max=100'))
    .then((r) => r.json());
  for (const pa of body.data) {
    if ((pa.comments ?? '').startsWith(TEST_COMMENT)) {
      await page.request.delete(
        url(`/api/productAssociations/${pa.id}?mutualDelete=true`),
      );
    }
  }
}

test.describe('product catalog batch 9 React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    test.skip(
      !(await isReactScreen(page, '/productAssociation/list')),
      'React batch 9 screens not present in this build (legacy GSP served)',
    );
  });

  test('product search finds seeded product and matches API results', async ({ page }) => {
    const FLOW = 'product-search-react';

    await page.goto(url('/product/search'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-search-form')).toBeVisible();
    await captureStep(page, FLOW, 'search-empty');

    await page.fill('[data-testid="product-search-input"]', 'Lamivudine');
    await page.click('button:has-text("Find")');
    await page.waitForLoadState('networkidle');

    const api = await page.request
      .get(url('/api/products/productSearch?q=Lamivudine'))
      .then((r) => r.json());
    await expect(page.getByTestId('product-search-count'))
      .toContainText(`${api.totalCount}`);
    const rows = page.getByTestId('product-search-table').locator('tbody tr');
    await expect(rows).toHaveCount(api.data.length);
    await expect(page.getByTestId('product-search-table'))
      .toContainText(PRODUCT_NAME);
    await captureStep(page, FLOW, 'search-results');
  });

  test('product show displays the seeded product details', async ({ page }) => {
    const FLOW = 'product-show-react';
    const pid = await productIdByName(page, PRODUCT_NAME);

    await page.goto(url(`/product/show/${pid}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-show-table')).toBeVisible();

    const details = await page.request
      .get(url(`/api/products/${pid}/details`))
      .then((r) => r.json());
    await expect(page.getByTestId('product-show-title'))
      .toContainText(details.data.name);
    await expect(page.getByTestId('product-show-productCode'))
      .toContainText(details.data.productCode);
    await captureStep(page, FLOW, 'product-show');
  });

  test('UPN database screen matches the API row count', async ({ page }) => {
    const FLOW = 'product-upn-database-react';

    await page.goto(url('/product/upnDatabase'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('upn-database-table')).toBeVisible();

    const api = await page.request
      .get(url('/api/products/upnDatabase'))
      .then((r) => r.json());
    await expect(page.getByTestId('upn-database-count'))
      .toContainText(`${api.totalCount}`);
    const rows = page.getByTestId('upn-database-table').locator('tbody tr');
    await expect(rows).toHaveCount(api.data.length);
    await captureStep(page, FLOW, 'upn-database');
  });

  test('association list matches API rows and filters by type', async ({ page }) => {
    const FLOW = 'product-association-list-react';

    await page.goto(url('/productAssociation/list'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-association-table')).toBeVisible();

    const api = await page.request
      .get(url('/api/productAssociations?max=10&offset=0'))
      .then((r) => r.json());
    await expect(page.getByTestId('product-association-count'))
      .toContainText(`${api.totalCount}`);
    const rows = page.getByTestId('product-association-table').locator('tbody tr');
    await expect(rows).toHaveCount(api.data.length);
    await captureStep(page, FLOW, 'association-list');

    await page.selectOption('[data-testid="association-type-select"]', 'SUBSTITUTE');
    await page.click('button:has-text("Search")');
    await page.waitForLoadState('networkidle');
    const filtered = await page.request
      .get(url('/api/productAssociations?code=SUBSTITUTE&max=10&offset=0'))
      .then((r) => r.json());
    await expect(page.getByTestId('product-association-count'))
      .toContainText(`${filtered.totalCount}`);
    await captureStep(page, FLOW, 'association-list-filtered');
  });

  test('association create, edit and delete round trip', async ({ page }) => {
    const FLOW = 'product-association-form-react';
    await cleanupTestAssociations(page);

    await page.goto(url('/productAssociation/create'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-association-form')).toBeVisible();
    await captureStep(page, FLOW, 'association-create-empty');

    await page.selectOption('[data-testid="association-code-select"]', 'SUBSTITUTE');
    await page
      .getByTestId('association-product-select')
      .locator('input[type="text"]')
      .fill(PRODUCT_NAME);
    await page
      .locator('.react-select__option', { hasText: PRODUCT_NAME })
      .first()
      .click();
    await page
      .getByTestId('association-associated-product-select')
      .locator('input[type="text"]')
      .fill(ASSOCIATED_PRODUCT_NAME);
    await page
      .locator('.react-select__option', { hasText: ASSOCIATED_PRODUCT_NAME })
      .first()
      .click();
    await page.fill('[data-testid="association-quantity-input"]', '2');
    await page.fill('[data-testid="association-comments-input"]', TEST_COMMENT);
    await captureStep(page, FLOW, 'association-create-filled');
    await page.click('button:has-text("Create")');
    await page.waitForURL(/productAssociation\/list/);

    const created = (await page.request
      .get(url('/api/productAssociations?max=100'))
      .then((r) => r.json())).data.find(
      (pa: { comments?: string }) => (pa.comments ?? '') === TEST_COMMENT,
    );
    expect(created).toBeTruthy();
    expect(created.code).toBe('SUBSTITUTE');

    await page.goto(url(`/productAssociation/edit/${created.id}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('association-quantity-input')).toHaveValue('2');
    await captureStep(page, FLOW, 'association-edit');

    await page.fill('[data-testid="association-quantity-input"]', '4');
    await page.click('button:has-text("Update")');
    await page.waitForURL(/productAssociation\/list/);

    const updated = await page.request
      .get(url(`/api/productAssociations/${created.id}`))
      .then((r) => r.json());
    expect(Number(updated.data.quantity)).toBe(4);

    // Delete through the edit screen.
    await page.goto(url(`/productAssociation/edit/${created.id}`));
    await page.waitForLoadState('networkidle');
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Delete")');
    await page.waitForURL(/productAssociation\/list/);
    const deleted = await page.request.get(
      url(`/api/productAssociations/${created.id}`),
    );
    expect(deleted.status()).toBe(404);
  });
});
