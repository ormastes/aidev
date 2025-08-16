// Jest setup file for fraud-checker tests

// Extend Jest matchers
import 'jest-extended';

// Global test configuration
beforeAll(() => {
  // Configure test timeouts
  jest.setTimeout(30000);
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset any global state
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clean up any test artifacts
  jest.restoreAllMocks();
});

// Mock external log library for consistent testing
jest.mock('../../external-log-lib/user-stories/001-basic-log-capture/src/external/external-log-lib', () => ({
  ExternalLogLib: jest.fn(),
  LogEntry: jest.fn()
}));

// Global test utilities
global.createMockLogEntry = (level = 'info', message = 'test message') => ({
  timestamp: new Date(),
  level,
  message,
  source: 'stdout'
});

global.createMockFraudViolation = (overrides = {}) => ({
  type: 'test-manipulation',
  severity: 'medium',
  message: 'Test violation',
  location: 'test.ts:1:1',
  ...overrides
});

global.createMockTestFile = (overrides = {}) => ({
  path: '/test/file.test.ts',
  content: 'test("example", () => expect(1).toBe(1));',
  ...overrides
});

// Console utilities for testing
const originalConsole = { ...console };
global.mockConsole = () => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
};

global.restoreConsole = () => {
  Object.assign(console, originalConsole);
};

// Performance testing utilities
global.measurePerformance = async (fn) => {
  const start = Date.now();
  const result = await fn();
  const end = Date.now();
  return {
    result,
    duration: end - start
  };
};

// File system test utilities
global.createTempContent = (type = 'clean') => {
  const templates = {
    clean: `
      describe('Clean test suite', () => {
        test('should work correctly', () => {
          expect(1 + 1).toBe(2);
        });
      });
    `,
    skip: `
      describe('Test with skip', () => {
        test.skip('skipped test', () => {
          expect(1).toBe(1);
        });
      });
    `,
    only: `
      describe('Test with only', () => {
        test.only('isolated test', () => {
          expect(1).toBe(1);
        });
      });
    `,
    empty: `
      describe('Empty test', () => {
        test('empty test', () => {
          // No assertions
        });
      });
    `,
    alwaysTrue: `
      describe('Always true test', () => {
        test('fake assertion', () => {
          expect(true).toBe(true);
        });
      });
    `,
    complex: `
      describe('Complex test suite', () => {
        beforeEach(() => {
          // Setup
        });
        
        test('complex test 1', async () => {
          const data = await Promise.resolve({ value: 42 });
          expect(data.value).toBe(42);
        });
        
        test('complex test 2', () => {
          const items = [1, 2, 3, 4, 5];
          const doubled = items.map(x => x * 2);
          expect(doubled).toEqual([2, 4, 6, 8, 10]);
        });
      });
    `
  };
  
  return templates[type] || templates.clean;
};

// Error simulation utilities
global.simulateError = (type = 'generic') => {
  const errors = {
    fileNotFound: new Error('ENOENT: no such file or directory'),
    permissionDenied: new Error('EACCES: permission denied'),
    parseError: new Error('SyntaxError: Unexpected token'),
    generic: new Error('Something went wrong')
  };
  
  return errors[type] || errors.generic;
};

// Async utilities
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.eventually = async (assertion, timeout = 5000, interval = 100) => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await assertion();
      return;
    } catch (error) {
      await waitFor(interval);
    }
  }
  
  // Final attempt
  await assertion();
};

// Type definitions for global utilities
declare global {
  var createMockLogEntry: (level?: string, message?: string) => any;
  var createMockFraudViolation: (overrides?: any) => any;
  var createMockTestFile: (overrides?: any) => any;
  var mockConsole: () => void;
  var restoreConsole: () => void;
  var measurePerformance: (fn: () => Promise<any>) => Promise<{ result: any; duration: number }>;
  var createTempContent: (type?: string) => string;
  var simulateError: (type?: string) => Error;
  var waitFor: (ms: number) => Promise<void>;
  var eventually: (assertion: () => Promise<void>, timeout?: number, interval?: number) => Promise<void>;
}