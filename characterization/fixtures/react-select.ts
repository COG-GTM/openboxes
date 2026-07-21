import { Locator, Page } from '@playwright/test';

/**
 * Helpers for the react-select comboboxes used throughout the React wizards
 * (stock movement create/send, partial receiving, ...).
 */

/** Fills the react-select rendered inside a `[data-testid="form-field"]` with the given aria-label. */
export async function selectByFormField(
  page: Page,
  fieldLabel: string,
  query: string,
  optionText: string = query,
): Promise<void> {
  const field = page.locator(`[data-testid="form-field"][aria-label="${fieldLabel}"]`).first();
  await selectInside(page, field, query, optionText);
}

/** Fills the first react-select found inside `root` (e.g. a line-item table row). */
export async function selectInside(
  page: Page,
  root: Locator,
  query: string,
  optionText: string = query,
): Promise<void> {
  const input = root.locator('input[id^="react-select"]').first();
  await input.click({ force: true });
  await input.fill(query);
  await page.locator(`.react-select__option:has-text("${optionText}")`).first().click();
}

/** Opens the first react-select inside `root` and picks the first available option. */
export async function selectFirstOption(page: Page, root: Locator): Promise<void> {
  const input = root.locator('input[id^="react-select"]').first();
  await input.click({ force: true });
  await page.locator('.react-select__option').first().click();
}
