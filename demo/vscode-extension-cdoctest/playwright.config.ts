import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    ['list']
  ],
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  timeout: 120000,
  globalTimeout: 30 * 60 * 1000, // 30 minutes

  projects: [
    {
      name: 'vscode-extension',
      use: {
        ...devices['Desktop Electron'],
      },
      testMatch: [
        'system-test-mockless.test.ts',
        'ctest-gui-automation.test.ts',
        'basic-activation.test.ts',
        'extension.activation.test.ts',
        'configuration.test.ts',
        'cmake-integration.test.ts',
        'cpp-executable-tests.test.ts',
        'python-tests.test.ts',
        'test.discovery.test.ts',
        'test.execution.test.ts',
        'extension-lifecycle-complete.test.ts',
        'markdown-parser-complete.test.ts',
        'python-integration-complete.test.ts',
        'test-execution-engine-complete.test.ts',
        'configuration-coverage-complete.test.ts',
        'ctest-integration-complete.test.ts',
        'test-tree-complete.test.ts',
        'coverage-statusbar-complete.test.ts',
        'coverage-watcher-complete.test.ts'
      ]
    },
  ],

  outputDir: 'gen/test-results/',
});