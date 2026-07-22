import { test, expect, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Phase 2 Batch 13: React product catalog screens (tag/show,
 * unitOfMeasureConversion list/create/edit).
 *
 * These screens only exist in source builds that include the React migration
 * (the pinned released image still serves the legacy GSPs), so the whole
 * suite skips itself when /unitOfMeasureConversion/list does not serve the
 * SPA.
 */

const TAG_NAME = 'ZZ char batch13 tag';

async function isReactScreen(page: Page, path: string): Promise<boolean> {
  await page.goto(url(path));
  await page.waitForLoadState('domcontentloaded');
  return (await page.locator('#root').count()) > 0;
}

async function cleanupTestData(page: Page): Promise<void> {
  const tags = await page.request
    .get(url('/api/generic/tag?max=100'))
    .then((r) => r.json());
  for (const tag of tags.data ?? []) {
    if ((tag.tag ?? '').startsWith(TAG_NAME)) {
      await page.request.delete(url(`/api/tags/${tag.id}`));
    }
  }
}

async function createTag(page: Page): Promise<string> {
  const resp = await page.request.post(url('/api/generic/tag'), {
    data: { tag: TAG_NAME },
  });
  expect(resp.status()).toBe(201);
  return (await resp.json()).data.id;
}

async function getUoms(page: Page): Promise<Array<{ id: string; name: string }>> {
  const uoms = await page.request
    .get(url('/api/generic/unitOfMeasure?max=100'))
    .then((r) => r.json());
  expect(uoms.data.length).toBeGreaterThanOrEqual(2);
  return uoms.data;
}

test.describe('product catalog batch 13 React screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    test.skip(
      !(await isReactScreen(page, '/unitOfMeasureConversion/list')),
      'React batch 13 screens not present in this build (legacy GSP served)',
    );
    await cleanupTestData(page);
  });

  test('tag show displays tag details and products', async ({ page }) => {
    const FLOW = 'tag-show-react';
    const tagId = await createTag(page);

    await page.goto(url(`/tag/show/${tagId}`));
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('tag-details')).toContainText(TAG_NAME);
    await expect(page.getByTestId('tag-details')).toContainText(tagId);
    await captureStep(page, FLOW, 'show');

    const api = await page.request
      .get(url(`/api/tags/${tagId}`))
      .then((r) => r.json());
    expect(api.data.tag).toBe(TAG_NAME);
    const shownProducts = await page
      .getByTestId('tag-products')
      .locator('li')
      .count();
    expect(shownProducts).toBe(api.data.products.length);
  });

  test('tag show delete removes the tag', async ({ page }) => {
    const FLOW = 'tag-delete-react';
    const tagId = await createTag(page);

    await page.goto(url(`/tag/show/${tagId}`));
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Delete")');
    await captureStep(page, FLOW, 'confirm');
    await page.click('.react-confirm-alert button:has-text("Yes")');
    await page.waitForURL('**/tag/list**');

    // Without Accept: application/json the app-wide error path renders an
    // HTML 500 page instead of a JSON 404.
    const api = await page.request.get(url(`/api/tags/${tagId}`), {
      headers: { Accept: 'application/json' },
    });
    expect(api.status()).toBe(404);
  });

  test('uom conversion list matches API rows', async ({ page }) => {
    const FLOW = 'uom-conversion-list-react';

    await page.goto(url('/unitOfMeasureConversion/list'));
    await page.waitForLoadState('networkidle');
    const api = await page.request
      .get(url('/api/unitOfMeasureConversions?max=10&offset=0&sort=dateCreated&order=asc'))
      .then((r) => r.json());
    // Padding rows are rendered without links, so count linked id cells.
    const rows = page.locator('.rt-tbody .rt-td a');
    await expect(rows).toHaveCount(Math.min(api.data.length, 10));
    await captureStep(page, FLOW, 'list');
  });

  test('uom conversion create, edit and delete', async ({ page }) => {
    const FLOW = 'uom-conversion-crud-react';
    const uoms = await getUoms(page);

    await page.goto(url('/unitOfMeasureConversion/create'));
    await page.waitForLoadState('networkidle');
    await captureStep(page, FLOW, 'create-form');

    // SelectField (v2) does not associate its label with the react-select
    // input, so locate the wrapper by its label text instead of getByLabel.
    const fromField = page
      .locator('.select-wrapper-container', { hasText: 'From Unit of Measure' })
      .first();
    await fromField.locator('input').first().click({ force: true });
    await page.getByText(uoms[0].name, { exact: true }).first().click();
    const toField = page
      .locator('.select-wrapper-container', { hasText: 'To Unit of Measure' })
      .first();
    await toField.locator('input').first().click({ force: true });
    await page.getByText(uoms[1].name, { exact: true }).first().click();
    await page.getByLabel('Conversion Rate').fill('7.25');
    await page.click('button:has-text("Create")');
    await page.waitForURL('**/unitOfMeasureConversion/edit/**');
    await captureStep(page, FLOW, 'created');

    const conversionId = page.url().split('/edit/')[1].split('?')[0];
    const created = await page.request
      .get(url(`/api/unitOfMeasureConversions/${conversionId}`))
      .then((r) => r.json());
    expect(Number(created.data.conversionRate)).toBe(7.25);
    expect(created.data.active).toBe(true);

    // Update the conversion rate.
    await page.getByLabel('Conversion Rate').fill('8.5');
    await page.click('button:has-text("Update")');
    await page.waitForURL('**/unitOfMeasureConversion/list**');
    await captureStep(page, FLOW, 'updated');

    const updated = await page.request
      .get(url(`/api/unitOfMeasureConversions/${conversionId}`))
      .then((r) => r.json());
    expect(Number(updated.data.conversionRate)).toBe(8.5);

    // Delete it from the edit screen.
    await page.goto(url(`/unitOfMeasureConversion/edit/${conversionId}`));
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Delete")');
    await page.click('.react-confirm-alert button:has-text("Yes")');
    await page.waitForURL('**/unitOfMeasureConversion/list**');
    await captureStep(page, FLOW, 'deleted');

    // Without Accept: application/json the app-wide error path renders an
    // HTML 500 page instead of a JSON 404.
    const gone = await page.request.get(
      url(`/api/unitOfMeasureConversions/${conversionId}`),
      { headers: { Accept: 'application/json' } },
    );
    expect(gone.status()).toBe(404);
  });
});
