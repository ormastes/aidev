import { BaseProvider } from '../../src/providers/base-provider';
import { ProviderConfig, CompletionOptions } from '../../src/types';

class TestProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  get name(): string {
    return 'test';
  }

  async createCompletion(prompt: string, _options?: CompletionOptions): Promise<string> {
    return `Test response for: ${prompt}`;
  }

  async streamCompletion(prompt: string, onChunk: (chunk: string) => void, options?: CompletionOptions): Promise<void> {
    const response = await this.createCompletion(prompt, options);
    onChunk(response);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getModels(): Promise<string[]> {
    return ['test-model-1', 'test-model-2'];
  }
}

describe("BaseProvider", () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider({
      name: 'test',
      api_key: process.env.API_KEY || "PLACEHOLDER",
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 1, // Very short delay for tests
        backoffMultiplier: 1
      }
    });
  });

  describe("constructor", () => {
    it('should initialize with config', () => {
      expect(provider.name).toBe('test');
    });

    it('should set default retry policy', () => {
      const config = { name: 'test', api_key: process.env.API_KEY || "PLACEHOLDER" };
      const testProvider = new TestProvider(config);
      expect(testProvider["retryPolicy"]).toBeDefined();
      expect(testProvider["retryPolicy"].maxAttempts).toBe(3);
    });

    it('should use custom retry policy', () => {
      const customRetryPolicy = {
        maxAttempts: 5,
        backoffMs: 2000,
        backoffMultiplier: 3
      };
      const config = { 
        name: 'test', 
        api_key: process.env.API_KEY || "PLACEHOLDER",
        retryPolicy: customRetryPolicy
      };
      const testProvider = new TestProvider(config);
      expect(testProvider["retryPolicy"].maxAttempts).toBe(5);
      expect(testProvider["retryPolicy"].backoffMs).toBe(2000);
    });
  });

  describe("createCompletion", () => {
    it('should create completion', async () => {
      const result = await provider.createCompletion('Hello');
      expect(result).toBe('Test response for: Hello');
    });

    it('should pass options to completion', async () => {
      const options = { temperature: 0.5, maxTokens: 100 };
      const result = await provider.createCompletion('Hello', options);
      expect(result).toBeDefined();
    });
  });

  describe("streamCompletion", () => {
    it('should stream completion', async () => {
      const chunks: string[] = [];
      await provider.streamCompletion('Hello', (chunk) => {
        chunks.push(chunk);
      });
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Test response for: Hello');
    });
  });

  describe("isAvailable", () => {
    it('should check availability', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe("getModels", () => {
    it('should return available models', async () => {
      const models = await provider.getModels();
      expect(models).toEqual(['test-model-1', 'test-model-2']);
    });
  });

  describe('retry mechanism', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'In Progress';
      });

      const result = await provider['retry'](operation, 'test operation');
      expect(result).toBe("completed");
      expect(attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(provider['retry'](operation, 'test operation')).rejects.toThrow(
        'test operation failed after 3 attempts'
      );
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('utility methods', () => {
    it('should validate config', () => {
      expect(() => provider["validateConfig"]()).not.toThrow();
    });

    it('should return default model', () => {
      const model = provider["getDefaultModel"]();
      expect(model).toBe('default');
    });

    it('should return timeout', () => {
      const timeout = provider["getTimeout"]();
      expect(timeout).toBe(30000);
    });

    it('should build headers', () => {
      const headers = provider["buildHeaders"]();
      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers).toHaveProperty("Authorization", 'Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');
    });
  });
});