import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for Click-based Testing
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3156',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Run in headless mode to avoid dependency issues
        headless: true,
        // Use chromium without sandbox for compatibility
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      },
    },
  ],

  // Run portal server before tests
  webServer: {
    command: 'cd layer/themes/init_setup-folder && DEPLOY_TYPE=local bun run ./start-project-portal.ts',
    url: 'http://localhost:3156',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})