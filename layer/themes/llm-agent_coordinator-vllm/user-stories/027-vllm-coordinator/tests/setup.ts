/**
 * Jest test setup
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.VLLM_API_KEY = 'test-api-key';
process.env.VLLM_SERVER_URL = 'http://localhost:8000';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Add custom matchers if needed
expect.extend({
  toBeValidResponse(received: any) {
    const pass = received && typeof received === 'object' && 'content' in received;
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid response`
        : `expected ${received} to be a valid response with content property`,
    };
  },
});

// Global test utilities
export const mockVLLMResponse = (content: string) => ({
  id: 'mock-id',
  object: 'chat.completion',
  created: Date.now(),
  model: 'deepseek-r1',
  choices: [{
    index: 0,
    message: {
      role: 'assistant',
      content,
    },
    finish_reason: 'stop',
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  },
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});