import { defineConfig, devices } from '@playwright/test';

/**
 * System Test Configuration for Embedded Web Applications
 * Follows project requirements for real browser automation
 */
export default defineConfig({
  // Test files
  testDir: './tests/system',
  testMatch: '**/*.stest.ts',
  
  // Global test settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'coverage/playwright-report' }],
    ['junit', { outputFile: 'coverage/junit-results.xml' }],
    ['json', { outputFile: 'coverage/test-results.json' }]
  ],
  
  // Global test configuration
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3457',
    
    // Browser context options
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Security and performance
    ignoreHTTPSErrors: false,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable console logs for debugging
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    port: 3457,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // Output directories
  outputDir: 'coverage/playwright-artifacts',
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/system/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/system/setup/global-teardown.ts'),
});
