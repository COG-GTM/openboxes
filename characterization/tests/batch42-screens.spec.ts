import { test, expect, Page } from '@playwright/test';
import { url, runId } from '../fixtures/constants';
import { login } from '../fixtures/auth';
import { captureStep, resetStepCounter } from '../fixtures/screenshots';

/**
 * React screens for document list/edit/show and eventType create/edit
 * (Phase 2, Batch 42).
 *
 * The legacy /document/(list|edit|show) and /eventType/(create|edit) URLs now
 * render the React SPA, backed by the new /api/documents and /api/eventTypes
 * endpoints. Document creation (initial upload) stays on the legacy
 * /document/create GSP; the eventType list/show screens are React (Batch 43).
 */

async function reactTableRowCount(page: Page): Promise<number> {
  return page.locator('.rt-tbody .rt-tr:not(.-padRow)').count();
}

/** Seeds a document through the legacy multipart save action. */
async function seedDocument(page: Page, name: string): Promise<string> {
  const resp = await page.request.post(url('/document/save'), {
    multipart: {
      fileContents: {
        name,
        mimeType: 'text/plain',
        buffer: Buffer.from(`playwright batch42 contents for ${name}`),
      },
    },
  });
  expect(resp.status()).toBeLessThan(400);
  const found = await (await page.request.get(url(`/api/documents?q=${name}`))).json();
  expect(found.data).toHaveLength(1);
  return found.data[0].id;
}

test.describe('document react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/documents?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/documents (pinned released image)');
  });

  test('lists documents with data from the API and filters by name', async ({ page }) => {
    const name = `zzb42list${runId()}.txt`;
    const docId = await seedDocument(page, name);
    try {
      const apiResponse = page.waitForResponse((resp) =>
        resp.url().includes('/api/documents') && resp.status() === 200);
      await page.goto(url('/document/list'));
      const body = await (await apiResponse).json();
      await expect(page.getByText('List Documents').first()).toBeVisible();
      await captureStep(page, 'document', 'react-list');
      const visibleRows = Math.min(body.totalCount, 10);
      await expect.poll(async () => reactTableRowCount(page)).toBe(visibleRows);

      // Filter by name; only the seeded document matches.
      await page.getByPlaceholder('Search by name').fill(name);
      await page.getByRole('button', { name: 'Find' }).click();
      await expect.poll(async () => reactTableRowCount(page)).toBe(1);
      await expect(page.getByText(name).first()).toBeVisible();
      await captureStep(page, 'document', 'react-list-filtered');
    } finally {
      await page.request.delete(url(`/api/documents/${docId}`));
    }
  });

  test('edits document metadata and replaces the file', async ({ page }) => {
    const name = `zzb42edit${runId()}.txt`;
    const docId = await seedDocument(page, name);
    try {
      await page.goto(url(`/document/edit/${docId}`));
      await expect(page.getByText('Edit Document').first()).toBeVisible();
      await expect(page.getByLabel('Name')).toHaveValue(name);
      await captureStep(page, 'document', 'react-edit');

      // Replace the file contents through the File section.
      await page.setInputFiles('[data-testid="document-file-input"]', {
        name: `replaced-${name}`,
        mimeType: 'text/plain',
        buffer: Buffer.from('replaced by playwright batch42'),
      });
      await page.getByRole('button', { name: 'Upload' }).click();
      await expect(page.getByText(`replaced-${name}`).first()).toBeVisible();

      // Update metadata; redirects back to the list.
      await page.getByLabel('Document Number').fill(`B42-${runId()}`);
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForURL('**/document/list**');

      const updated = (await (await page.request.get(url(`/api/documents/${docId}`))).json()).data;
      expect(updated.filename).toBe(`replaced-${name}`);
      expect(updated.size).toBe(Buffer.from('replaced by playwright batch42').length);
      expect(updated.documentNumber).toContain('B42-');
    } finally {
      await page.request.delete(url(`/api/documents/${docId}`));
    }
  });

  test('shows a document and deletes it', async ({ page }) => {
    const name = `zzb42show${runId()}.txt`;
    const docId = await seedDocument(page, name);
    await page.goto(url(`/document/show/${docId}`));
    await expect(page.getByText('Show Document').first()).toBeVisible();
    const table = page.locator('[data-testid="document-show-table"]');
    await expect(table.getByText(name).first()).toBeVisible();
    await expect(table.getByText('text/plain').first()).toBeVisible();
    await captureStep(page, 'document', 'react-show');

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/document/list**');
    const check = await page.request.get(url(`/api/documents?q=${name}`));
    expect((await check.json()).totalCount).toBe(0);
  });
});

test.describe('event type react screens', () => {
  test.beforeEach(async ({ page }) => {
    resetStepCounter();
    await login(page);
    const probe = await page.request.get(url('/api/eventTypes?max=1'));
    test.skip(probe.status() !== 200, 'app build does not expose /api/eventTypes (pinned released image)');
  });

  test('creates, edits and deletes an event type', async ({ page }) => {
    const name = `ZZ B42 Event Type ${runId()}`;
    await page.goto(url('/eventType/create'));
    await expect(page.getByText('Create Event Type').first()).toBeVisible();
    await captureStep(page, 'event-type', 'react-create');

    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Description').fill('Playwright batch42 event type');
    await page.getByLabel('Sort Order').fill('999');
    // Event status (EventCode) is required; CUSTOM allows duplicates.
    await page.locator('.select-field-input, [class*="select"]').filter({ hasText: /Event Status|Select/ }).first().click();
    await page.locator('[class*="option"]', { hasText: /^CUSTOM$/ }).first().click();
    await page.getByRole('button', { name: 'Create' }).click();

    // Create navigates to the event type list (React as of Batch 43).
    await page.waitForURL('**/eventType/list**');

    const listing = await (await page.request.get(url('/api/eventTypes?max=100'))).json();
    const created = (listing.data as Array<{ id: string, name: string, eventCode: string }>)
      .find((et) => et.name === name);
    expect(created).toBeTruthy();
    expect(created!.eventCode).toBe('CUSTOM');

    // Edit the created record.
    await page.goto(url(`/eventType/edit/${created!.id}`));
    await expect(page.getByText('Edit Event Type').first()).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue(name);
    await captureStep(page, 'event-type', 'react-edit');
    await page.getByLabel('Description').fill('Renamed by playwright');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.waitForURL('**/eventType/list**');

    const updated = (await (await page.request.get(url(`/api/eventTypes/${created!.id}`))).json()).data;
    expect(updated.description).toBe('Renamed by playwright');

    // Delete through the edit screen.
    await page.goto(url(`/eventType/edit/${created!.id}`));
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('**/eventType/list**');
    // Ask for JSON errors (RequestUtil.isAjax) so not-found renders 404.
    const check = await page.request.get(url(`/api/eventTypes/${created!.id}`), {
      headers: { Accept: 'application/json' },
    });
    expect(check.status()).toBe(404);
  });
});
