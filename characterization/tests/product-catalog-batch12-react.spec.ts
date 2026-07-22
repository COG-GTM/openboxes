import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2 Batch 12: React product catalog screens (productType list/edit/
 * show, tag list/create/edit).
 *
 * These screens only exist in source builds that include the React migration
 * (the pinned released image still serves the legacy GSPs), so the whole
 * suite skips itself when /productType/list does not serve the SPA.
 */

const TYPE_NAME = 'ZZ char batch12 type';
const TAG_NAME = 'zz-char-batch12-tag';
const PRODUCT_NAME = 'Lamivudine 150mg tablet';

async function isReactScreen(page: Page, path: string): Promise<boolean> {
  await page.goto(url(path));
  await page.waitForLoadState('domcontentloaded');
  return (await page.locator('#root').count()) > 0;
}

async function cleanupTestData(page: Page): Promise<void> {
  const types = await page.request
    .get(url('/api/productTypes?max=100'))
    .then((r) => r.json());
  for (const pt of types.data ?? []) {
    if ((pt.name ?? '').startsWith(TYPE_NAME)) {
      await page.request.delete(url(`/api/productTypes/${pt.id}`));
    }
  }
  const tags = await page.request
    .get(url(`/api/tags?q=${encodeURIComponent(TAG_NAME)}&max=100`))
    .then((r) => r.json());
  for (const tag of tags.data ?? []) {
    if ((tag.tag ?? '').startsWith(TAG_NAME)) {
      await page.request.delete(url(`/api/tags/${tag.id}`));
    }
  }
}

async function createProductType(page: Page): Promise<string> {
  const resp = await page.request.post(url('/api/productTypes'), {
    data: { name: TYPE_NAME, code: 'ZZB12' },
  });
  expect(resp.status()).toBe(201);
  return (await resp.json()).data.id;
}

async function createTag(page: Page): Promise<string> {
  const resp = await page.request.post(url('/api/tags'), {
    data: { tag: TAG_NAME },
  });
  expect(resp.status()).toBe(201);
  return (await resp.json()).data.id;
}

test.describe('product catalog batch 12 React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    test.skip(
      !(await isReactScreen(page, '/productType/list')),
      'React batch 12 screens not present in this build (legacy GSP served)',
    );
    await cleanupTestData(page);
  });

  test('product type list matches API rows', async ({ page }) => {
    const FLOW = 'product-type-list-react';
    await createProductType(page);

    await page.goto(url('/productType/list'));
    await page.waitForLoadState('networkidle');
    const api = await page.request
      .get(url('/api/productTypes?max=10&offset=0&sort=name&order=asc'))
      .then((r) => r.json());
    // Padding rows are rendered without links, so count linked id cells.
    const rows = page.locator('.rt-tbody .rt-tr:has(a)');
    await expect(rows).toHaveCount(Math.min(api.data.length, 10));
    await expect(page.locator('.rt-tbody')).toContainText(TYPE_NAME);
    await captureStep(page, FLOW, 'list');
  });

  test('product type edit updates the editable fields', async ({ page }) => {
    const FLOW = 'product-type-edit-react';
    const typeId = await createProductType(page);

    await page.goto(url(`/productType/edit/${typeId}`));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name="name"]')).toHaveValue(TYPE_NAME);
    await captureStep(page, FLOW, 'edit-form');

    await page.fill('input[name="name"]', `${TYPE_NAME} renamed`);
    await page.fill('input[name="sequenceNumber"]', '5');
    await page.click('button:has-text("Update")');
    // A successful update redirects back to the list route.
    await page.waitForURL('**/productType/list**');

    const api = await page.request
      .get(url(`/api/productTypes/${typeId}`))
      .then((r) => r.json());
    expect(api.data.name).toBe(`${TYPE_NAME} renamed`);
    expect(api.data.sequenceNumber).toBe(5);
    // Read-only parity fields are untouched.
    expect(api.data.productTypeCode).toBe('GOOD');
    await captureStep(page, FLOW, 'updated');
  });

  test('product type show displays details matching the API', async ({ page }) => {
    const FLOW = 'product-type-show-react';
    const typeId = await createProductType(page);

    await page.goto(url(`/productType/show/${typeId}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-type-details')).toBeVisible();
    await expect(page.getByTestId('product-type-details'))
      .toContainText(TYPE_NAME);
    await expect(page.getByTestId('product-type-details'))
      .toContainText(typeId);
    await expect(page.getByTestId('product-type-details'))
      .toContainText('GOOD');
    await captureStep(page, FLOW, 'show');
  });

  test('tag list matches API rows and filters by tag', async ({ page }) => {
    const FLOW = 'tag-list-react';
    await createTag(page);

    await page.goto(url('/tag/list'));
    await page.waitForLoadState('networkidle');
    const api = await page.request
      .get(url('/api/tags?max=10&offset=0&sort=tag&order=asc'))
      .then((r) => r.json());
    const rows = page.locator('.rt-tbody .rt-tr:has(a)');
    await expect(rows).toHaveCount(Math.min(api.data.length, 10));
    await captureStep(page, FLOW, 'list');

    await page.fill('input[aria-label="Search by tag"]', TAG_NAME);
    await page.click('button:has-text("Find")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.rt-tbody')).toContainText(TAG_NAME);
    await captureStep(page, FLOW, 'list-filtered');
  });

  test('tag create makes a tag and redirects to edit', async ({ page }) => {
    const FLOW = 'tag-create-react';

    await page.goto(url('/tag/create'));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name="tag"]')).toBeVisible();
    await captureStep(page, FLOW, 'create-form');

    await page.fill('input[name="tag"]', TAG_NAME);
    await page.click('button:has-text("Create")');
    // The legacy save action redirects to edit; so does the React screen.
    await page.waitForURL('**/tag/edit/**');
    await captureStep(page, FLOW, 'created-redirected-to-edit');

    const tags = await page.request
      .get(url(`/api/tags?q=${encodeURIComponent(TAG_NAME)}&max=100`))
      .then((r) => r.json());
    const created = (tags.data ?? []).find(
      (t: { tag: string }) => t.tag === TAG_NAME,
    );
    expect(created).toBeTruthy();
    expect(created.isActive).toBe(true);
  });

  test('tag edit updates details and manages products', async ({ page }) => {
    const FLOW = 'tag-edit-react';
    const tagId = await createTag(page);

    const products = await page.request
      .get(url('/api/generic/product?max=1'))
      .then((r) => r.json());
    test.skip(!(products.data ?? []).length, 'no seeded products');
    const product = products.data[0];

    await page.goto(url(`/tag/edit/${tagId}`));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name="tag"]')).toHaveValue(TAG_NAME);
    await captureStep(page, FLOW, 'edit-form');

    // Add a product by code.
    await page.getByTestId('tag-add-products').locator('input')
      .fill(product.productCode);
    await page.click('button:has-text("Add to products")');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('tag-products'))
      .toContainText(product.productCode);
    await captureStep(page, FLOW, 'product-added');

    const withProduct = await page.request
      .get(url(`/api/tags/${tagId}`))
      .then((r) => r.json());
    expect(withProduct.data.products.length).toBe(1);
    expect(withProduct.data.products[0].productCode)
      .toBe(product.productCode);

    // Remove it again.
    await page.getByTestId('tag-products')
      .locator('button:has-text("Delete")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('tag-products'))
      .not.toContainText(product.productCode);

    // Update tag name and active flag.
    await page.fill('input[name="tag"]', `${TAG_NAME}-renamed`);
    await page.locator('input[name="isActive"]').click();
    await page.click('button:has-text("Update")');
    // A successful update redirects back to the list route.
    await page.waitForURL('**/tag/list**');
    const updated = await page.request
      .get(url(`/api/tags/${tagId}`))
      .then((r) => r.json());
    expect(updated.data.tag).toBe(`${TAG_NAME}-renamed`);
    expect(updated.data.isActive).toBe(false);
    await captureStep(page, FLOW, 'updated');
  });
});
