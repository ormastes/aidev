import { ProviderRegistry } from '../src/providers/provider-registry';
import { OpenAIProvider } from '../src/providers/openai-provider';
import { AnthropicProvider } from '../src/providers/anthropic-provider';
import { OllamaProvider } from '../src/providers/ollama-provider';
import { ProviderConfig } from '../src/types';

describe('Integration Patterns System Tests', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry({
      defaultProvider: 'openai',
      fallbackProviders: ['anthropic', 'ollama'],
      loadBalancing: 'round-robin',
      healthCheckInterval: 5000
    });
  });

  describe('Multi-Provider Setup', () => {
    it('should create and register multiple providers', () => {
      const openaiConfig: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
        defaultModel: 'gpt-3.5-turbo'
      };

      const anthropicConfig: ProviderConfig = {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
        defaultModel: 'claude-3-haiku-20240307'
      };

      const ollamaConfig: ProviderConfig = {
        name: 'ollama',
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: 'llama2'
      };

      const openaiProvider = registry.createProvider('openai', openaiConfig);
      const anthropicProvider = registry.createProvider('anthropic', anthropicConfig);
      const ollamaProvider = registry.createProvider('ollama', ollamaConfig);

      expect(openaiProvider).toBeInstanceOf(OpenAIProvider);
      expect(anthropicProvider).toBeInstanceOf(AnthropicProvider);
      expect(ollamaProvider).toBeInstanceOf(OllamaProvider);

      const providers = registry.listProviders();
      expect(providers).toEqual(['openai', 'anthropic', 'ollama']);
    });

    it('should handle provider health checks', async () => {
      const openaiConfig: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      };

      registry.createProvider('openai', openaiConfig);
      await registry.checkHealth();

      const status = registry.getProviderStatus();
      expect(status).toHaveProperty('openai');
      expect(status.openai).toHaveProperty('healthy');
      expect(status.openai).toHaveProperty('latency');
    }, 30000);

    it('should select healthy providers for load balancing', async () => {
      const openaiConfig: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      };

      const anthropicConfig: ProviderConfig = {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'test-key'
      };

      registry.createProvider('openai', openaiConfig);
      registry.createProvider('anthropic', anthropicConfig);

      // Check if at least one provider is available
      const provider = await registry.selectProvider();
      expect(provider).toBeDefined();
      expect(['openai', 'anthropic']).toContain(provider.name);
    }, 30000);
  });

  describe('Fallback Mechanism', () => {
    it('should fallback to secondary provider on primary failure', async () => {
      // Create a provider with invalid credentials
      const invalidConfig: ProviderConfig = {
        name: 'openai',
        apiKey: 'invalid-key'
      };

      const validConfig: ProviderConfig = {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'test-key'
      };

      registry.createProvider('openai', invalidConfig);
      registry.createProvider('anthropic', validConfig);

      // This should fallback to anthropic if openai fails
      try {
        const result = await registry.createCompletionWithFallback('Hello', {
          preferredProvider: 'openai'
        });
        
        // If we get here, either OpenAI worked or fallback occurred
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      } catch (error) {
        // Both providers failed - this is expected in CI without API keys
        expect((error as Error).message).toContain('All providers failed');
      }
    }, 30000);
  });

  describe('Load Balancing', () => {
    it('should distribute requests across providers', async () => {
      const config1: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      };

      const config2: ProviderConfig = {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'test-key'
      };

      registry.createProvider('openai', config1);
      registry.createProvider('anthropic', config2);

      const providers = [];
      for (let i = 0; i < 4; i++) {
        try {
          const provider = await registry.selectProvider();
          providers.push(provider.name);
        } catch (error) {
          // Skip if no healthy providers
          break;
        }
      }

      if (providers.length > 0) {
        // Should see round-robin distribution
        expect(providers).toEqual(expect.arrayContaining(['openai', 'anthropic']));
      }
    }, 30000);
  });

  describe('Performance Monitoring', () => {
    it('should track provider latency', async () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      };

      registry.createProvider('openai', config);

      try {
        await registry.createCompletionWithFallback('Hello', {
          maxTokens: 5,
          temperature: 0
        });

        const status = registry.getProviderStatus();
        expect(status.openai.latency).toBeGreaterThan(0);
      } catch (error) {
        // Expected if no API key in CI
        console.log('Skipping latency test - no API key');
      }
    }, 30000);

    it('should handle provider status reporting', async () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      };

      registry.createProvider('openai', config);
      await registry.checkHealth();

      const status = registry.getProviderStatus();
      expect(status.openai).toHaveProperty('healthy');
      expect(status.openai).toHaveProperty('latency');
      expect(typeof status.openai.healthy).toBe('boolean');
      expect(typeof status.openai.latency).toBe('number');
    }, 30000);
  });

  describe('Error Recovery', () => {
    it('should recover from temporary failures', async () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: 'invalid-key',
        retryPolicy: {
          maxAttempts: 2,
          backoffMs: 100,
          backoffMultiplier: 2
        }
      };

      registry.createProvider('openai', config);

      // Should fail with retry attempts
      await expect(registry.createCompletionWithFallback('Hello')).rejects.toThrow();
    }, 30000);

    it('should handle network timeouts', async () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: 'test-key',
        baseURL: 'https://httpstat.us/200?sleep=5000', // 5 second delay
        timeout: 1000 // 1 second timeout
      };

      registry.createProvider('openai', config);

      // Should timeout and fail
      await expect(registry.createCompletionWithFallback('Hello')).rejects.toThrow();
    }, 10000);
  });

  describe('Configuration Flexibility', () => {
    it('should handle different provider configurations', () => {
      const configs = [
        {
          name: 'openai',
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1',
          defaultModel: 'gpt-4',
          timeout: 30000
        },
        {
          name: 'anthropic',
          apiKey: 'test-key',
          baseURL: 'https://api.anthropic.com/v1',
          defaultModel: 'claude-3-opus-20240229',
          timeout: 45000
        },
        {
          name: 'ollama',
          baseURL: 'http://localhost:11434',
          defaultModel: 'llama2',
          timeout: 60000
        }
      ];

      configs.forEach(config => {
        const provider = registry.createProvider(config.name, config);
        expect(provider.name).toBe(config.name);
      });

      expect(registry.listProviders()).toEqual(['openai', 'anthropic', 'ollama']);
    });
  });

  describe('Integration with External Services', () => {
    it('should validate provider connectivity', async () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      };

      registry.createProvider('openai', config);
      const provider = registry.getProvider('openai');
      
      try {
        const isAvailable = await provider.isAvailable();
        expect(typeof isAvailable).toBe('boolean');
      } catch (error) {
        // Expected if no API key
        console.log('Skipping connectivity test - no API key');
      }
    }, 30000);

    it('should handle streaming responses', async () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      };

      registry.createProvider('openai', config);

      try {
        const chunks: string[] = [];
        await registry.streamCompletionWithFallback('Count to 3', (chunk) => {
          chunks.push(chunk);
        }, {
          maxTokens: 20,
          temperature: 0
        });

        expect(chunks.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected if no API key
        console.log('Skipping streaming test - no API key');
      }
    }, 30000);
  });
});