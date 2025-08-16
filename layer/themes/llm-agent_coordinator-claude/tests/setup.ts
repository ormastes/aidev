/**
 * Jest setup file for coordinator-claude-agent tests
 */

// Global test timeout
jest.setTimeout(30000);

// Mock external API calls
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  post: jest.fn(),
  get: jest.fn()
}));

// Mock environment variables
process.env.CLAUDE_API_KEY = 'test-api-key';
process.env.ANTHROPIC_API_URL = 'https://api.anthropic.com';
process.env.NODE_ENV = 'test';

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
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

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});