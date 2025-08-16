/**
 * Jest setup specifically for integration tests
 */

// Import global setup
import './setup';

// Integration test specific configuration
beforeAll(() => {
  // Set up integration test environment
  process.env.NODE_ENV = 'test';
  process.env.TEST_TYPE = 'integration';
});

// Longer timeout for integration tests
jest.setTimeout(60000);

export {};