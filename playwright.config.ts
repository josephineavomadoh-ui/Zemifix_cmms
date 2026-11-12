import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright end-to-end test configuration.
 *
 * Tests live under src/tests/e2e/**\/*.spec.ts
 * Run: npm run test:e2e
 *
 * The dev server must be running (npm run dev) or webServer below starts it.
 * Set TEST_BASE_URL to override the default localhost:3000.
 */
export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: false, // Sequential to avoid port conflicts in CI
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: '.playwright-report' }], ['list']],

  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Uncomment to auto-start dev server for e2e runs:
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
