/**
 * Test setup for VLLM Coordinator Agent Theme
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.VLLM_HOST = 'http://localhost:8000';
process.env.COORDINATOR_PORT = '0'; // Use random port for tests

// Mock external services
jest.mock('axios');
jest.mock('socket.io');
jest.mock('socket.io-client');

// Mock VLLM API responses
const mockVLLMResponses = {
  models: {
    data: [
      { id: 'meta-llama/Llama-2-7b-hf', object: 'model' },
      { id: 'mistralai/Mistral-7B-v0.1', object: 'model' }
    ]
  },
  completion: {
    id: 'cmpl-123',
    object: 'text_completion',
    created: 1234567890,
    model: 'meta-llama/Llama-2-7b-hf',
    choices: [{
      text: 'This is a test completion',
      index: 0,
      logprobs: null,
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    }
  },
  chat: {
    id: 'chat-123',
    object: 'chat.completion',
    created: 1234567890,
    model: 'meta-llama/Llama-2-7b-hf',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a chat response'
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 15,
      completion_tokens: 25,
      total_tokens: 40
    }
  }
};

// Global test utilities
(global as any).testUtils = {
  mockVLLMResponses,
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  mockSocket: () => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true
  })
};

export {};

// Cleanup after tests
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});