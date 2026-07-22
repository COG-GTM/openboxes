import { test, Page } from '@playwright/test';
import { login } from '../fixtures/auth';
import { url } from '../fixtures/constants';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

// One-off "before" evidence capture for Batch 9 against the pinned legacy
// image. Not part of the regular suite: only runs when the legacy GSPs are
// still served (i.e. the React batch 9 screens are NOT present).

async function isLegacy(page: Page, path: string): Promise<boolean> {
  await page.goto(url(path));
  await page.waitForLoadState('domcontentloaded');
  return (await page.locator('#root').count()) === 0;
}

test('capture legacy batch 9 screenshots', async ({ page }) => {
  resetStepCounter();
  await login(page);
  test.skip(
    !(await isLegacy(page, '/productAssociation/list')),
    'React build detected; legacy capture skipped',
  );
  const FLOW = 'legacy-batch9';

  await page.goto(url('/product/search?q=Lamivudine'));
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'product-search');

  const body = await page.request
    .get(url('/api/products/search?name=Lamivudine%20150mg%20tablet'))
    .then((r) => r.json());
  const pid = body.data.find(
    (p: { name: string }) => p.name === 'Lamivudine 150mg tablet',
  ).id;
  await page.goto(url(`/product/show/${pid}`));
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'product-show');

  await page.goto(url('/product/upnDatabase'));
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'product-upn-database');

  await page.goto(url('/productAssociation/list'));
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'association-list');

  await page.goto(url('/productAssociation/create'));
  await page.waitForLoadState('networkidle');
  await captureStep(page, FLOW, 'association-create');
});
