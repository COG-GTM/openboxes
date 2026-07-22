import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2 Batch 10: React product catalog screens (productAssociation/show,
 * productCatalog list/create/edit/show, productGroup/create).
 *
 * These screens only exist in source builds that include the React migration
 * (the pinned released image still serves the legacy GSPs), so the whole
 * suite skips itself when /productCatalog/list does not serve the SPA.
 */

// Product codes are randomly generated at demo-import time, so resolve
// products by their stable seeded NAMEs.
const PRODUCT_NAME = 'Lamivudine 150mg tablet';
const ASSOCIATED_PRODUCT_NAME = 'Lamivudine 150mg + zidovudine 300mg tablet';
const TEST_COMMENT = 'ZZ char batch10 association';
const CATALOG_NAME_PREFIX = 'ZZ char batch10 catalog';
const GROUP_NAME_PREFIX = 'ZZ char batch10 group';

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

async function cleanupTestData(page: Page): Promise<void> {
  const associations = await page.request
    .get(url('/api/productAssociations?max=100'))
    .then((r) => r.json());
  for (const pa of associations.data) {
    if ((pa.comments ?? '').startsWith(TEST_COMMENT)) {
      await page.request.delete(
        url(`/api/productAssociations/${pa.id}?mutualDelete=true`),
      );
    }
  }
  const catalogs = await page.request
    .get(url(`/api/productCatalogs?q=${encodeURIComponent(CATALOG_NAME_PREFIX)}&max=100`))
    .then((r) => r.json());
  for (const pc of catalogs.data) {
    await page.request.delete(url(`/api/productCatalogs/${pc.id}`));
  }
  const groups = await page.request
    .get(url('/api/productGroupOptions'))
    .then((r) => r.json());
  for (const group of groups.data) {
    if ((group.label ?? '').startsWith(GROUP_NAME_PREFIX)) {
      await page.request.post(url('/productGroup/delete'), {
        form: { id: group.id },
      });
    }
  }
}

test.describe('product catalog batch 10 React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    test.skip(
      !(await isReactScreen(page, '/productCatalog/list')),
      'React batch 10 screens not present in this build (legacy GSP served)',
    );
  });

  test('association show displays the association details', async ({ page }) => {
    const FLOW = 'product-association-show-react';
    await cleanupTestData(page);

    const pid = await productIdByName(page, PRODUCT_NAME);
    const apid = await productIdByName(page, ASSOCIATED_PRODUCT_NAME);
    const created = await page.request
      .post(url('/api/productAssociations'), {
        data: {
          code: 'SUBSTITUTE',
          product: { id: pid },
          associatedProduct: { id: apid },
          quantity: 2,
          comments: TEST_COMMENT,
          hasMutualAssociation: false,
        },
      })
      .then((r) => r.json());
    const paId = created.data.id;

    try {
      await page.goto(url(`/productAssociation/show/${paId}`));
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('product-association-show-table')).toBeVisible();

      const api = await page.request
        .get(url(`/api/productAssociations/${paId}`))
        .then((r) => r.json());
      const table = page.getByTestId('product-association-show-table');
      await expect(table).toContainText(api.data.id);
      await expect(table).toContainText(api.data.code);
      await expect(table).toContainText(api.data.product.name);
      await expect(table).toContainText(api.data.associatedProduct.name);
      await expect(table).toContainText(TEST_COMMENT);
      await captureStep(page, FLOW, 'association-show');
    } finally {
      await page.request.delete(
        url(`/api/productAssociations/${paId}?mutualDelete=true`),
      );
    }
  });

  test('catalog list matches API rows and searches', async ({ page }) => {
    const FLOW = 'product-catalog-list-react';

    await page.goto(url('/productCatalog/list'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-catalog-table')).toBeVisible();

    const api = await page.request
      .get(url('/api/productCatalogs?max=10&offset=0&sort=name&order=asc'))
      .then((r) => r.json());
    await expect(page.getByTestId('product-catalog-count'))
      .toContainText(`${api.totalCount}`);
    const rows = page.getByTestId('product-catalog-table').locator('tbody tr');
    await expect(rows).toHaveCount(api.data.length);
    await captureStep(page, FLOW, 'catalog-list');
  });

  test('catalog create, show, edit items and delete round trip', async ({ page }) => {
    const FLOW = 'product-catalog-form-react';
    await cleanupTestData(page);
    const catalogName = `${CATALOG_NAME_PREFIX} ${Date.now()}`;

    await page.goto(url('/productCatalog/create'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-catalog-form')).toBeVisible();
    await captureStep(page, FLOW, 'catalog-create-empty');

    await page.fill('[data-testid="catalog-code-input"]', catalogName.replace(/ /g, '-'));
    await page.fill('[data-testid="catalog-name-input"]', catalogName);
    await page.fill('[data-testid="catalog-description-input"]', 'char test');
    await captureStep(page, FLOW, 'catalog-create-filled');
    await page.click('button:has-text("Create")');
    await page.waitForURL(/productCatalog\/list/);

    const created = (await page.request
      .get(url(`/api/productCatalogs?q=${encodeURIComponent(catalogName)}&max=10`))
      .then((r) => r.json())).data[0];
    expect(created).toBeTruthy();
    expect(created.name).toBe(catalogName);

    // Show screen matches the API data.
    await page.goto(url(`/productCatalog/show/${created.id}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-catalog-show-table')).toBeVisible();
    await expect(page.getByTestId('product-catalog-show-table'))
      .toContainText(catalogName);
    await captureStep(page, FLOW, 'catalog-show');

    // Edit screen: add a product to the catalog, then remove it.
    await page.goto(url(`/productCatalog/edit/${created.id}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('catalog-name-input')).toHaveValue(catalogName);
    await captureStep(page, FLOW, 'catalog-edit');

    await page
      .getByTestId('catalog-add-product-select')
      .locator('input[type="text"]')
      .fill(PRODUCT_NAME);
    await page
      .locator('.react-select__option', { hasText: PRODUCT_NAME })
      .first()
      .click();
    await page.click('button:has-text("Add")');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-catalog-items-table'))
      .toContainText(PRODUCT_NAME);
    await captureStep(page, FLOW, 'catalog-edit-item-added');

    const withItem = await page.request
      .get(url(`/api/productCatalogs/${created.id}`))
      .then((r) => r.json());
    expect(withItem.data.itemCount).toBe(1);
    expect(withItem.data.productCatalogItems[0].product.id)
      .toBe(await productIdByName(page, PRODUCT_NAME));

    await page
      .getByTestId('product-catalog-items-table')
      .locator('tbody tr')
      .first()
      .locator('button:has-text("Delete")')
      .click();
    await page.waitForLoadState('networkidle');
    const withoutItem = await page.request
      .get(url(`/api/productCatalogs/${created.id}`))
      .then((r) => r.json());
    expect(withoutItem.data.itemCount).toBe(0);

    // Delete the catalog through the edit screen.
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByTestId('product-catalog-form')
      .locator('button:has-text("Delete")')
      .click();
    await page.waitForURL(/productCatalog\/list/);
    const deleted = await page.request.get(
      url(`/api/productCatalogs/${created.id}`),
    );
    expect(deleted.status()).toBe(404);
  });

  test('product group create round trip', async ({ page }) => {
    const FLOW = 'product-group-create-react';
    await cleanupTestData(page);
    const groupName = `${GROUP_NAME_PREFIX} ${Date.now()}`;

    await page.goto(url('/productGroup/create'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-group-form')).toBeVisible();
    await captureStep(page, FLOW, 'group-create-empty');

    await page.fill('[data-testid="product-group-name-input"]', groupName);
    await page.fill('[data-testid="product-group-description-input"]', 'char test');
    await captureStep(page, FLOW, 'group-create-filled');
    await page.click('button:has-text("Create")');
    // The create screen continues to the (still legacy) edit screen.
    await page.waitForURL(/productGroup\/edit/);

    const groups = await page.request
      .get(url('/api/productGroupOptions'))
      .then((r) => r.json());
    const created = groups.data.find(
      (g: { label?: string }) => g.label === groupName,
    );
    expect(created).toBeTruthy();
    await page.request.post(url('/productGroup/delete'), {
      form: { id: created.id },
    });
  });
});
