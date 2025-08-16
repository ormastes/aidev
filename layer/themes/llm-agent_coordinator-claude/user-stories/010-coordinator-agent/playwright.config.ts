import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/system',
  fullyParallel: false, // Run E2E tests sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3456',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'cli-tests',
      testMatch: '**/coordinator-e2e.test.ts',
      use: {
        // These tests don't need a browser
        headless: true
      }
    }
  ],

  // Run coordinator service before tests
  webServer: {
    command: 'npm run dev -- start --no-interactive',
    port: 3456,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },

  // Global timeout
  timeout: 60000,
  expect: {
    timeout: 10000
  }
});