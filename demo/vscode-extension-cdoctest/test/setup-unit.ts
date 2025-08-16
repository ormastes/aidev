/**
 * Jest setup specifically for unit tests
 */

// Import global setup
import './setup';

// Unit test specific configuration
beforeAll(() => {
  // Set up unit test environment
  process.env.NODE_ENV = 'test';
  process.env.TEST_TYPE = 'unit';
});

// Mock heavy dependencies for unit tests
jest.mock('vscode-cmake-tools', () => ({
  getCMakeToolsApi: jest.fn(),
  Version: { v2: '2' },
}));

jest.mock('fast-glob', () => jest.fn());

export {};