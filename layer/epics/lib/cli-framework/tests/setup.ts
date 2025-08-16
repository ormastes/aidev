/**
 * Jest setup file for cli-framework tests
 */

// Global test timeout
jest.setTimeout(30000);

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
process.exit = jest.fn() as never;

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks for each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore original process.exit
  process.exit = originalExit;
  
  // Restore console
  Object.assign(console, originalConsole);
});

// Global error handler for unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error // Keep errors visible
  };
}

// Mock external dependencies
jest.mock('chalk', () => ({
  bold: (text: string) => text,
  red: (text: string) => text,
  green: (text: string) => text,
  yellow: (text: string) => text,
  blue: (text: string) => text,
  gray: (text: string) => text
}));

jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: ''
  }));
});