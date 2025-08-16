/**
 * Jest setup file for cross-theme integration tests
 * Configures test environment and global test utilities
 */

// Extend test timeout for integration tests
jest.setTimeout(30000);

// Global test helpers
global.waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
  console.error('Promise:', promise);
});

// Clean up function for tests
global.cleanupAfterTest = async () => {
  // Clean up any lingering resources
  if (global.gc) {
    global.gc();
  }
};

// Type declarations
declare global {
  var waitForCondition: (
    condition: () => boolean | Promise<boolean>,
    timeout?: number,
    interval?: number
  ) => Promise<void>;
  
  var cleanupAfterTest: () => Promise<void>;
}

export {};