// Global test setup for AI Development Platform
// This file is preloaded before running tests with Bun

import { beforeAll, afterAll } from 'bun:test';

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_RUNNER = 'bun';
process.env.PROJECT_ROOT = process.cwd();

// Global test setup
beforeAll(() => {
  // Set longer timeout for complex tests
  if (process.env.CI) {
    // Even longer timeout in CI environment
    process.env.TEST_TIMEOUT = '60000';
  }
  
  console.log('🧪 AI Development Platform Test Suite');
  console.log(`📁 Running tests from: ${process.cwd()}`);
  console.log(`🚀 Test runner: Bun ${Bun.version}`);
  console.log('');
});

// Global test teardown
afterAll(() => {
  // Clean up any test artifacts if needed
  console.log('\n✨ Test run completed');
});

// Export test utilities
export const testPaths = {
  root: process.cwd(),
  layer: `${process.cwd()}/layer`,
  themes: `${process.cwd()}/layer/themes`,
  scripts: `${process.cwd()}/scripts`,
  setup: `${process.cwd()}/setup`,
  temp: `${process.cwd()}/temp`,
  gen: `${process.cwd()}/gen`
};

// Test helper functions
export const isCI = () => Boolean(process.env.CI);
export const getTestTimeout = () => Number(process.env.TEST_TIMEOUT || 30000);

// Pattern matchers for different test types
export const testPatterns = {
  unit: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
  external: ['**/*.etest.ts'],
  system: ['**/*.stest.ts'],
  integration: ['**/*.itest.ts'],
  python: ['**/*_test.py', '**/test_*.py'],
  cucumber: ['**/features/**/*.feature']
};

// Export for use in tests
export default {
  testPaths,
  testPatterns,
  isCI,
  getTestTimeout
};