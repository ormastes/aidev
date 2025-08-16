/**
 * Global Jest setup for all test environments
 */

// Increase timeout for all tests
jest.setTimeout(30000);

// Mock console methods to reduce noise during testing
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console for each test
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
});

afterEach(() => {
  // Restore console after each test
  Object.assign(console, originalConsole);
  
  // Clean up any remaining timers
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Mock VSCode APIs globally
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
    workspaceFolders: [],
    onDidChangeWorkspaceFolders: jest.fn(),
  },
  window: {
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
  },
  tests: {
    createTestController: jest.fn(),
  },
  TestRunProfileKind: {
    Run: 1,
    Debug: 2,
    Coverage: 3,
  },
  TestMessage: jest.fn(),
  CancellationTokenSource: jest.fn(),
  EventEmitter: jest.fn(),
  Uri: jest.fn(),
}));

// Mock child_process globally
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

// Mock fs globally
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

export {};