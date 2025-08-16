/**
 * Jest setup file for monitoring dashboard tests
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.env
process.env.NODE_ENV = 'test';

// Mock timers for predictable testing
beforeEach(() => {
  jest.clearAllTimers();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});