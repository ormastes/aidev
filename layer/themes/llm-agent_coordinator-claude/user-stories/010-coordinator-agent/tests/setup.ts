// Test setup for all test suites
import { jest } from '@jest/globals';

// Increase default timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(60000);
}

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'test-api-key';

// Clean up after each test
if (typeof afterEach !== "undefined") {
  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset modules if needed
    jest.resetModules();
  });
}

// Export for use in tests
export {};