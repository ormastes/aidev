/**
 * Jest setup specifically for bug detection tests
 */

// Import global setup
import './setup';

// Bug detection test specific configuration
beforeAll(() => {
  // Set up bug detection test environment
  process.env.NODE_ENV = 'test';
  process.env.TEST_TYPE = 'bug-detection';
});

// Medium timeout for bug detection tests
jest.setTimeout(45000);

// Enable fake timers for race condition testing
beforeEach(() => {
  // Note: Tests can override this if needed
  // jest.useFakeTimers();
});

afterEach(() => {
  // Clean up timers
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }
});

export {};