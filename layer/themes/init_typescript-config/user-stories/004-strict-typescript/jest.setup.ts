// Jest setup file for TypeScript strict mode testing
// Add any global test setup here

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add custom matchers here
    }
  }
}

// Set longer timeout for integration tests
if (process.env.TEST_TYPE === "integration") {
  jest.setTimeout(30000);
}

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep warn and error for important messages
  warn: console.warn,
  error: console.error,
};

export {};