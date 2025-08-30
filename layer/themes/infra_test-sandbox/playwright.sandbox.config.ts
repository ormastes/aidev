import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 300000, // 5 minutes for sandbox tests
  fullyParallel: false, // Sequential for resource management
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2, // Limited workers for sandbox
  reporter: [
    ['html', { outputFolder: 'gen/test-sandbox/reports' }],
    ['json', { outputFile: 'gen/test-sandbox/results.json' }],
    ['list']
  ],
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'docker-sandbox',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          // Additional browser isolation
          permissions: [],
          geolocation: undefined
        }
      },
      testMatch: '**/*docker*.test.ts'
    },
    {
      name: 'qemu-sandbox',
      use: { 
        ...devices['Desktop Firefox']
      },
      testMatch: '**/*qemu*.test.ts'
    },
    {
      name: 'dangerous-ops',
      use: { 
        ...devices['Desktop Safari']
      },
      testMatch: '**/dangerous-*.test.ts'
    }
  ],

  globalSetup: path.join(__dirname, 'src', 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'src', 'global-teardown.ts')
});