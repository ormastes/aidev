/**
 * Playwright Configuration for Profile Management E2E Tests
 * 
 * Specialized configuration for testing profile management workflows
 * with real browser interactions and comprehensive user scenarios.
 */

import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  testDir: path.join(__dirname),
  testMatch: '**/*profile*e2e*.systest.ts',
  
  // Test execution settings
  fullyParallel: false, // Sequential for profile tests to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  
  // Reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report-profile' }],
    ['json', { outputFile: 'test-results-profile.json' }],
    ['junit', { outputFile: 'junit-profile.xml' }]
  ],
  
  // Global test settings
  use: {
    baseURL: 'http://localhost:3156',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts optimized for profile operations
    actionTimeout: 15000, // Profile operations may take longer
    navigationTimeout: 30000,
    
    // Locale settings for testing internationalization
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Additional context for profile testing
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },

  // Browser configurations for cross-platform testing
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Enable features needed for profile testing
        permissions: ['notifications', 'camera', 'microphone', 'clipboard-write'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security', // For file upload testing
            '--allow-file-access-from-files'
          ]
        }
      },
    },
    
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        // Mobile-specific settings for profile management
        isMobile: true,
        hasTouch: true
      },
    },
    
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        isMobile: true,
        hasTouch: true
      },
    },
    
    {
      name: 'tablet-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true
      },
    }
  ],

  // Test server setup
  webServer: {
    command: 'cd /home/ormastes/dev/pub/aidev/layer/themes/init_setup-folder && DEPLOY_TYPE=local bun run ./start-project-portal.ts',
    url: 'http://localhost:3156',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/aidev_test',
      JWT_SECRET: 'test-jwt-secret-for-profile-testing',
      UPLOAD_DIR: path.join(__dirname, 'test-uploads'),
      ENABLE_2FA: 'true',
      ENABLE_OAUTH: 'true'
    }
  },
  
  // Global setup and teardown
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'global-teardown.ts'),
  
  // Expect settings
  expect: {
    timeout: 10000,
    toMatchSnapshot: {
      // Threshold for visual regression testing
      threshold: 0.2
    }
  },
  
  // Output directories
  outputDir: 'test-results-profile',
  
  // Metadata
  metadata: {
    testType: 'profile-management-e2e',
    coverage: 'comprehensive',
    approach: 'mock-free-test-oriented-development'
  }
});