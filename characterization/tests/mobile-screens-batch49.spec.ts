import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * Batch 49: migrated the mobile screens (mobile/index, mobile/login,
 * mobile/menu, mobile/outboundList, mobile/productDetails, mobile/productList)
 * to React.
 *
 * Asserts the React screens render the same data as the REST endpoints they
 * consume (/api/mobile/dashboard, /api/mobile/productSummaries,
 * /api/mobile/productSummaries/{id} and /api/mobile/outboundItems).
 */

// The pinned released image (characterization job) predates the Batch 49
// endpoints/screens; these tests run against source builds.
async function skipUnlessBatch49(page): Promise<void> {
  const res = await page.request.get(url('/api/mobile/dashboard'));
  test.skip(res.status() !== 200, 'Batch 49 endpoints not present in target build (pinned released image)');
}

test('mobile/index renders the React mobile dashboard', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'mobile-dashboard-react';
  await login(page);
  await skipUnlessBatch49(page);

  const res = await page.request.get(url('/api/mobile/dashboard'));
  const { data } = await res.json();

  await page.goto(url('/mobile/index'));
  await page.waitForSelector('[data-testid="mobile-dashboard"]');
  await captureStep(page, FLOW, 'dashboard');

  const cards = page.locator('[data-testid="mobile-dashboard"] .card');
  await expect(cards).toHaveCount(data.length);
  for (const indicator of data) {
    const card = cards.filter({ hasText: indicator.name });
    await expect(card).toContainText(String(indicator.count));
  }
});

test('mobile/productList renders the React mobile product list', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'mobile-product-list-react';
  await login(page);
  await skipUnlessBatch49(page);

  const res = await page.request.get(url('/api/mobile/productSummaries?max=10&offset=0'));
  const { data, totalCount } = await res.json();

  await page.goto(url('/mobile/productList'));
  await page.waitForSelector('[data-testid="mobile-product-list"]');
  await captureStep(page, FLOW, 'list');

  const rows = page.locator('[data-testid="mobile-product-list"] tbody tr');
  await expect(rows).toHaveCount(Math.min(totalCount, 10));
  if (data.length) {
    await expect(rows.first()).toContainText(data[0].product.productCode);
    await expect(rows.first()).toContainText(data[0].product.name);
  }
});

test('mobile/productDetails renders the React mobile product details', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'mobile-product-details-react';
  await login(page);
  await skipUnlessBatch49(page);

  const res = await page.request.get(url('/api/mobile/productSummaries?max=1&offset=0'));
  const { data } = await res.json();
  test.skip(!data.length, 'No seeded product summaries');
  const { product, quantityOnHand } = data[0];

  await page.goto(url(`/mobile/productDetails/${product.id}`));
  await page.waitForSelector('[data-testid="mobile-product-details"] .card');
  await captureStep(page, FLOW, 'details');

  const details = page.locator('[data-testid="mobile-product-details"]');
  await expect(details).toContainText(product.productCode);
  await expect(details).toContainText(product.name);
  await expect(details.locator('.list-group'))
    .toContainText(Math.round(quantityOnHand).toLocaleString('en-US'));
  await expect(details.locator('.list-group'))
    .toContainText(quantityOnHand > 0 ? 'In Stock' : 'Out of Stock');
});

test('mobile/outboundList renders the React mobile outbound list', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'mobile-outbound-list-react';
  await login(page);
  await skipUnlessBatch49(page);

  const res = await page.request.get(url('/api/mobile/outboundItems?max=10&offset=0'));
  const { data } = await res.json();

  await page.goto(url('/mobile/outboundList'));
  await page.waitForSelector('[data-testid="mobile-outbound-list"]');
  await captureStep(page, FLOW, 'list');

  const rows = page.locator('[data-testid="mobile-outbound-list"] tbody tr');
  await expect(rows).toHaveCount(data.length);
  if (data.length) {
    await expect(rows.first()).toContainText(data[0].identifier);
  }
});

test('mobile/login renders the React mobile login screen and authenticates', async ({ page }) => {
  resetStepCounter();
  const FLOW = 'mobile-login-react';
  // Probe for Batch 49 with an authenticated request first.
  await login(page);
  await skipUnlessBatch49(page);
  await page.context().clearCookies();

  await page.goto(url('/mobile/login'));
  await page.waitForSelector('[data-testid="mobile-login"]');
  await captureStep(page, FLOW, 'login-form');

  await page.fill('#username', 'admin');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**');
  await captureStep(page, FLOW, 'after-login');
});
