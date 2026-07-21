import { defineConfig } from '@playwright/test';

/**
 * Characterization suite for the legacy OpenBoxes app (Grails 3.3.16).
 *
 * The suite runs against a live instance booted from docker/docker-compose.yml
 * with the demo dataset loaded (docker/load-demo-data.sh). See README.md.
 */
export default defineConfig({
  testDir: './tests',
  // Flows mutate shared warehouse state; run serially for determinism.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: process.env.OPENBOXES_BASE_URL ?? 'http://localhost:8080/openboxes',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
});
