// Jest setup for system tests

// Increase timeout for system tests
jest.setTimeout(30000);

// Ensure clean test environment
beforeAll(() => {
  // Set up any global test configuration
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
});

// Clean up after all tests
afterAll(() => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Fail the test
  throw reason;
});