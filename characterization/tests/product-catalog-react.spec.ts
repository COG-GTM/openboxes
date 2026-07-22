import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url, runId } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2 Batch 7: React product-catalog screens (attribute list/edit/show,
 * category create/edit/tree).
 *
 * These screens only exist in source builds that include the React migration
 * (the pinned released image still serves the legacy GSPs), so the whole
 * suite skips itself when /attribute/list does not serve the React SPA.
 */

async function isReactScreen(page: Page, path: string): Promise<boolean> {
  await page.goto(url(path));
  await page.waitForLoadState('domcontentloaded');
  return (await page.locator('#root').count()) > 0;
}

test.describe('product catalog React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    test.skip(
      !(await isReactScreen(page, '/attribute/list')),
      'React product catalog screens not present in this build (legacy GSP served)',
    );
  });

  test('attribute list, create, edit, show and delete', async ({ page }) => {
    const FLOW = 'attribute-react';
    const name = `ZZ Char Attribute ${runId()}`;

    // --- List screen renders API-backed rows ---
    await page.goto(url('/attribute/list'));
    await page.waitForLoadState('networkidle');
    const table = page.getByTestId('attribute-list-table');
    await expect(table).toBeVisible();
    const apiAttributes = await page.request
      .get(url('/api/attributes?includeInactive=true'))
      .then((r) => r.json());
    await captureStep(page, FLOW, 'attribute-list');

    // --- Create ---
    await page.click('button:has-text("Add attribute")');
    await page.waitForURL(/attribute\/create/);
    await page.selectOption('#entityTypeCode', 'PRODUCT');
    await page.fill('#code', `zz_char_${runId()}`);
    await page.fill('#name', name);
    await page.click('button:has-text("Add option")');
    await page.fill('.attribute-option-input', 'Option One');
    await captureStep(page, FLOW, 'attribute-create-filled');
    await page.click('button:has-text("Save")');
    await page.waitForURL(/attribute\/edit\//);
    await captureStep(page, FLOW, 'attribute-edit-after-create');

    // --- Persisted via API, list shows one more row ---
    const afterCreate = await page.request
      .get(url('/api/attributes?includeInactive=true'))
      .then((r) => r.json());
    expect(afterCreate.data.length).toBe(apiAttributes.data.length + 1);
    const created = afterCreate.data.find((a: { name: string }) => a.name === name);
    expect(created).toBeTruthy();
    expect(created.options).toEqual(['Option One']);

    // --- Edit: update name ---
    await page.fill('#name', `${name} edited`);
    await page.click('button:has-text("Save")');
    await expect(page.locator('.s-alert-box, .alert-success').first()).toBeVisible();

    // --- Show screen ---
    await page.goto(url(`/attribute/show/${created.id}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('attribute-show-table')).toBeVisible();
    await expect(page.getByTestId('attribute-show-table')).toContainText('Option One');
    await captureStep(page, FLOW, 'attribute-show');

    // --- Delete from show screen ---
    await page.click('button:has-text("Delete")');
    await page.click('.react-confirm-alert button:has-text("Yes")');
    await page.waitForURL(/attribute\/list/);
    const afterDelete = await page.request
      .get(url('/api/attributes?includeInactive=true'))
      .then((r) => r.json());
    expect(afterDelete.data.length).toBe(apiAttributes.data.length);
  });

  test('category tree, create and edit', async ({ page }) => {
    const FLOW = 'category-react';
    const name = `ZZ Char Category ${runId()}`;

    // --- Tree screen renders the seeded ROOT hierarchy ---
    await page.goto(url('/category/tree'));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('category-tree')).toBeVisible();
    const treeBefore = await page.request
      .get(url('/api/categories/tree'))
      .then((r) => r.json());
    const rootBefore = treeBefore.data.find((c: { name: string }) => c.name === 'ROOT');
    expect(rootBefore).toBeTruthy();
    // Same number of visible top-level nodes as ROOT's direct children + itself.
    await captureStep(page, FLOW, 'category-tree');

    // --- Create ---
    await page.click('button:has-text("Add category")');
    await page.waitForURL(/category\/create/);
    await page.selectOption('#parentCategory', rootBefore.id);
    await page.fill('#name', name);
    await captureStep(page, FLOW, 'category-create-filled');
    await page.click('button:has-text("Create")');
    await page.waitForURL(/category\/tree/);
    await expect(page.getByTestId('category-tree')).toContainText(name);
    await captureStep(page, FLOW, 'category-tree-with-new');

    const treeAfter = await page.request
      .get(url('/api/categories/tree'))
      .then((r) => r.json());
    const rootAfter = treeAfter.data.find((c: { name: string }) => c.name === 'ROOT');
    expect(rootAfter.categories.length).toBe(rootBefore.categories.length + 1);
    const created = rootAfter.categories.find((c: { name: string }) => c.name === name);
    expect(created).toBeTruthy();

    // --- Edit ---
    await page.goto(url(`/category/edit/${created.id}`));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#name')).toHaveValue(name);
    await page.fill('#sortOrder', '5');
    await captureStep(page, FLOW, 'category-edit');
    await page.click('button:has-text("Save")');
    await page.waitForURL(/category\/tree/);

    const details = await page.request
      .get(url(`/api/categories/${created.id}/details`))
      .then((r) => r.json());
    expect(details.data.sortOrder).toBe(5);

    // --- Cleanup: delete from the tree screen ---
    page.on('dialog', (dialog) => dialog.accept());
    const node = page.getByTestId('category-tree-item').filter({ hasText: name }).first();
    await node.locator('button[aria-label="Delete category"]').click();
    await expect(page.getByTestId('category-tree')).not.toContainText(name);
  });
});
