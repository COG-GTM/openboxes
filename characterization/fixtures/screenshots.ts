import { Page } from '@playwright/test';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots', 'output');

let counter = 0;

/**
 * Captures a full-page screenshot at a key step of a flow.
 * Output goes to screenshots/output/<flow>/NN-<step>.png (gitignored);
 * reviewed baselines live in screenshots/baseline/.
 */
export async function captureStep(page: Page, flow: string, step: string): Promise<string> {
  counter += 1;
  const file = path.join(OUTPUT_DIR, flow, `${String(counter).padStart(2, '0')}-${step}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export function resetStepCounter(): void {
  counter = 0;
}
