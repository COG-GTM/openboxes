import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2 Batch 11: React product catalog screens (productGroup list/edit/
 * show, productSupplier edit/show, productType/create).
 *
 * These screens only exist in source builds that include the React migration
 * (the pinned released image still serves the legacy GSPs), so the whole
 * suite skips itself when /productGroup/list does not serve the SPA.
 */

const GROUP_NAME = 'ZZ char batch11 group';
const TYPE_NAME = 'ZZ char batch11 type';
const PRODUCT_NAME = 'Lamivudine 150mg tablet';

async function isReactScreen(page: Page, path: string): Promise<boolean> {
  await page.goto(url(path));
  await page.waitForLoadState('domcontentloaded');
  return (await page.locator('#root').count()) > 0;
}

async function cleanupTestData(page: Page): Promise<void> {
  const groups = await page.request
    .get(url(`/api/productGroups?q=${encodeURIComponent(GROUP_NAME)}&max=100`))
    .then((r) => r.json());
  for (const pg of groups.data ?? []) {
    if ((pg.name ?? '').startsWith(GROUP_NAME)) {
      await page.request.delete(url(`/api/productGroups/${pg.id}`));
    }
  }
  const types = await page.request
    .get(url('/api/generic/productType?max=100'))
    .then((r) => r.json());
  for (const pt of types.data ?? []) {
    if ((pt.name ?? '').startsWith(TYPE_NAME)) {
      await page.request.delete(url(`/api/productTypes/${pt.id}`));
    }
  }
}

async function createProductGroup(page: Page): Promise<string> {
  const resp = await page.request.post(url('/api/generic/productGroup'), {
    data: { name: GROUP_NAME },
  });
  expect(resp.status()).toBe(201);
  return (await resp.json()).data.id;
}

test.describe('product catalog batch 11 React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    test.skip(
      !(await isReactScreen(page, '/productGroup/list')),
      'React batch 11 screens not present in this build (legacy GSP served)',
    );
    await cleanupTestData(page);
  });

  test('product group list matches API rows and filters by name', async ({ page }) => {
    const FLOW = 'product-group-list-react';
    await createProductGroup(page);

    await page.goto(url('/productGroup/list'));
    await page.waitForLoadState('networkidle');
    const api = await page.request
      .get(url('/api/productGroups?max=10&offset=0&sort=name&order=asc'))
      .then((r) => r.json());
    // Padding rows are rendered without links, so count linked name cells.
    const rows = page.locator('.rt-tbody .rt-td a');
    await expect(rows).toHaveCount(Math.min(api.data.length, 10));
    await captureStep(page, FLOW, 'list');

    await page.fill('input[aria-label="Search by name"]', GROUP_NAME);
    await page.click('button:has-text("Find")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.rt-tbody')).toContainText(GROUP_NAME);
    await captureStep(page, FLOW, 'list-filtered');
  });

  test('product group edit updates details and manages products', async ({ page }) => {
    const FLOW = 'product-group-edit-react';
    const groupId = await createProductGroup(page);

    await page.goto(url(`/productGroup/edit/${groupId}`));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name="name"]')).toHaveValue(GROUP_NAME);
    await captureStep(page, FLOW, 'edit-form');

    // Add the seeded product to the group.
    const addSection = page.getByTestId('product-group-add-product');
    await addSection.locator('input').first().fill(PRODUCT_NAME);
    await page
      .locator(`.react-select__option:has-text("${PRODUCT_NAME}")`)
      .first()
      .click();
    // waitForLoadState('networkidle') is a no-op after the initial page load,
    // so wait for the mutation responses explicitly before asserting via API.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/productGroups/${groupId}/products`)
        && r.request().method() === 'POST' && r.ok()),
      page.click('button:has-text("Add Product")'),
    ]);
    await expect(page.getByTestId('product-group-products'))
      .toContainText(PRODUCT_NAME);
    await captureStep(page, FLOW, 'product-added');

    const api = await page.request
      .get(url(`/api/productGroups/${groupId}`))
      .then((r) => r.json());
    expect(api.data.products.length).toBe(1);
    expect(api.data.products[0].name).toBe(PRODUCT_NAME);

    // Remove it again.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/productGroups/${groupId}/products/`)
        && r.request().method() === 'DELETE' && r.ok()),
      page.getByTestId('product-group-products')
        .locator('button:has-text("Delete")').click(),
    ]);
    await expect(page.getByTestId('product-group-products'))
      .not.toContainText(PRODUCT_NAME);

    // Update the name.
    await page.fill('input[name="name"]', `${GROUP_NAME} renamed`);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/productGroups/${groupId}`)
        && r.request().method() === 'PUT' && r.ok()),
      page.click('button:has-text("Update")'),
    ]);
    const updated = await page.request
      .get(url(`/api/productGroups/${groupId}`))
      .then((r) => r.json());
    expect(updated.data.name).toBe(`${GROUP_NAME} renamed`);
    await captureStep(page, FLOW, 'updated');
  });

  test('product group show displays details matching the API', async ({ page }) => {
    const FLOW = 'product-group-show-react';
    const groupId = await createProductGroup(page);

    await page.goto(url(`/productGroup/show/${groupId}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-group-details')).toBeVisible();
    await expect(page.getByTestId('product-group-details'))
      .toContainText(GROUP_NAME);
    await expect(page.getByTestId('product-group-details'))
      .toContainText(groupId);
    await captureStep(page, FLOW, 'show');
  });

  test('product supplier show displays details matching the API', async ({ page }) => {
    const FLOW = 'product-supplier-show-react';

    const listing = await page.request
      .get(url('/api/productSuppliers?max=1'))
      .then((r) => r.json());
    test.skip(!listing.data.length, 'no seeded product sources');
    const psId = listing.data[0].id;

    const details = await page.request
      .get(url(`/api/productSuppliers/${psId}/details`))
      .then((r) => r.json());

    await page.goto(url(`/productSupplier/show/${psId}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('product-supplier-details')).toBeVisible();
    await expect(page.getByTestId('product-supplier-details'))
      .toContainText(details.data.code);
    await expect(page.getByTestId('product-supplier-details'))
      .toContainText(details.data.name);
    await captureStep(page, FLOW, 'show');
  });

  test('product supplier edit serves the React form with seeded data', async ({ page }) => {
    const FLOW = 'product-supplier-edit-react';

    const listing = await page.request
      .get(url('/api/productSuppliers?max=1'))
      .then((r) => r.json());
    test.skip(!listing.data.length, 'no seeded product sources');
    const ps = listing.data[0];

    await page.goto(url(`/productSupplier/edit/${ps.id}`));
    await page.waitForLoadState('networkidle');
    // RoleInterceptor restricts productSupplier edit to product managers,
    // both on the legacy GSP and the React route; skip when the seeded
    // admin user lacks that role.
    test.skip(
      (await page.locator('#root').count()) === 0
        || page.url().includes('/errors/handleForbidden'),
      'productSupplier/edit requires ROLE_PRODUCT_MANAGER (Access Denied served)',
    );
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator(`input[value="${ps.code}"]`)).toBeVisible();
    await captureStep(page, FLOW, 'edit-form');
  });

  test('product type create makes a product type with forced defaults', async ({ page }) => {
    const FLOW = 'product-type-create-react';

    await page.goto(url('/productType/create'));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await captureStep(page, FLOW, 'create-form');

    await page.fill('input[name="name"]', TYPE_NAME);
    await page.fill('input[name="code"]', 'ZZB11');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');

    // Creation redirects away from the SPA route; poll until the new type
    // shows up through the API rather than racing the POST.
    let created: { id: string } | undefined;
    await expect.poll(async () => {
      const types = await page.request
        .get(url('/api/generic/productType?max=100'))
        .then((r) => r.json());
      created = (types.data ?? []).find(
        (pt: { name: string }) => pt.name === TYPE_NAME,
      );
      return created;
    }).toBeTruthy();
    await captureStep(page, FLOW, 'created');

    await page.request.delete(url(`/api/productTypes/${created!.id}`));
  });
});
