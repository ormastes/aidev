import { OpenAIProvider } from '../../src/providers/openai-provider';
import { ProviderConfig } from '../../src/types';

describe('OpenAIProvider Integration', () => {
  let provider: OpenAIProvider;
  
  beforeEach(() => {
    const config: ProviderConfig = {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      defaultModel: 'gpt-3.5-turbo'
    };
    
    provider = new OpenAIProvider(config);
  });

  describe('createCompletion', () => {
    it('should create completion In Progress', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI integration test - no API key');
        return;
      }

      const result = await provider.createCompletion('Say hello', {
        maxTokens: 10,
        temperature: 0
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle different models', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI integration test - no API key');
        return;
      }

      const result = await provider.createCompletion('Say hello', {
        model: 'gpt-3.5-turbo',
        maxTokens: 10,
        temperature: 0
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    }, 30000);

    it('should handle temperature variations', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI integration test - no API key');
        return;
      }

      const result1 = await provider.createCompletion('Tell me a joke', {
        maxTokens: 50,
        temperature: 0
      });
      
      const result2 = await provider.createCompletion('Tell me a joke', {
        maxTokens: 50,
        temperature: 1
      });
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Results might be different due to temperature difference
    }, 30000);
  });

  describe('streamCompletion', () => {
    it('should stream completion In Progress', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI integration test - no API key');
        return;
      }

      const chunks: string[] = [];
      await provider.streamCompletion('Count to 3', (chunk) => {
        chunks.push(chunk);
      }, {
        maxTokens: 20,
        temperature: 0
      });
      
      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join('');
      expect(fullResponse.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('isAvailable', () => {
    it('should check availability', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI integration test - no API key');
        return;
      }

      const available = await provider.isAvailable();
      expect(available).toBe(true);
    }, 30000);

    it('should return false for invalid API key', async () => {
      const invalidProvider = new OpenAIProvider({
        name: 'openai',
        apiKey: 'invalid-key'
      });
      
      const available = await invalidProvider.isAvailable();
      expect(available).toBe(false);
    }, 30000);
  });

  describe('getModels', () => {
    it('should fetch available models', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI integration test - no API key');
        return;
      }

      const models = await provider.getModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('gpt-3.5-turbo');
    }, 30000);
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const invalidProvider = new OpenAIProvider({
        name: 'openai',
        apiKey: 'invalid-key'
      });
      
      await expect(invalidProvider.createCompletion('Hello')).rejects.toThrow();
    }, 30000);

    it('should handle network errors with retry', async () => {
      const invalidProvider = new OpenAIProvider({
        name: 'openai',
        apiKey: 'test-key',
        baseURL: 'https://invalid-url-that-does-not-exist.com'
      });
      
      await expect(invalidProvider.createCompletion('Hello')).rejects.toThrow();
    }, 30000);
  });
});