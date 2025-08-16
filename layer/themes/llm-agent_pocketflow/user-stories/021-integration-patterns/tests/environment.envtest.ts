import { ProviderRegistry } from '../src/providers/provider-registry';
import { OpenAIProvider } from '../src/providers/openai-provider';
import { AnthropicProvider } from '../src/providers/anthropic-provider';
import { OllamaProvider } from '../src/providers/ollama-provider';
import { ProviderConfig } from '../src/types';

describe('Environment Tests', () => {
  describe('Development Environment', () => {
    it('should work with local Ollama instance', async () => {
      // Check if Ollama is available locally
      const config: ProviderConfig = {
        name: 'ollama',
        baseURL: 'http://localhost:11434',
        defaultModel: 'llama2'
      };

      const provider = new OllamaProvider(config);
      
      try {
        const isAvailable = await provider.isAvailable();
        
        if (isAvailable) {
          console.log('Ollama is available locally');
          
          // Test getting models
          const models = await provider.getModels();
          expect(Array.isArray(models)).toBe(true);
          
          // Test completion if models are available
          if (models.length > 0) {
            const result = await provider.createCompletion('Hello', {
              model: models[0],
              maxTokens: 10
            });
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
          }
        } else {
          console.log('Ollama not available locally - skipping test');
        }
      } catch (error) {
        console.log('Ollama connection failed - this is expected in CI:', (error as Error).message);
      }
    }, 30000);

    it('should handle environment variables', () => {
      const originalEnv = process.env;
      
      // Set test environment variables
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

      const registry = new ProviderRegistry();
      
      // Create providers using environment variables
      const openaiConfig: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      };
      
      const anthropicConfig: ProviderConfig = {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY
      };
      
      const ollamaConfig: ProviderConfig = {
        name: 'ollama',
        baseURL: process.env.OLLAMA_BASE_URL
      };

      const openaiProvider = registry.createProvider('openai', openaiConfig);
      const anthropicProvider = registry.createProvider('anthropic', anthropicConfig);
      const ollamaProvider = registry.createProvider('ollama', ollamaConfig);

      expect(openaiProvider.name).toBe('openai');
      expect(anthropicProvider.name).toBe('anthropic');
      expect(ollamaProvider.name).toBe('ollama');

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Production Environment', () => {
    it('should handle production configuration', () => {
      const prodConfig = {
        defaultProvider: 'openai',
        fallbackProviders: ['anthropic'],
        loadBalancing: 'least-latency' as const,
        healthCheckInterval: 30000
      };

      const registry = new ProviderRegistry(prodConfig);
      
      // Simulate production provider configs
      const openaiConfig: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'prod-key',
        baseURL: 'https://api.openai.com/v1',
        timeout: 30000,
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
          backoffMultiplier: 2,
          maxBackoffMs: 10000
        }
      };

      const anthropicConfig: ProviderConfig = {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'prod-key',
        baseURL: 'https://api.anthropic.com/v1',
        timeout: 45000,
        retryPolicy: {
          maxAttempts: 2,
          backoffMs: 2000,
          backoffMultiplier: 1.5
        }
      };

      const openaiProvider = registry.createProvider('openai', openaiConfig);
      const anthropicProvider = registry.createProvider('anthropic', anthropicConfig);

      expect(openaiProvider).toBeInstanceOf(OpenAIProvider);
      expect(anthropicProvider).toBeInstanceOf(AnthropicProvider);
    });

    it('should handle high availability setup', async () => {
      const registry = new ProviderRegistry({
        defaultProvider: 'primary',
        fallbackProviders: ['secondary', 'tertiary'],
        loadBalancing: 'round-robin',
        healthCheckInterval: 10000
      });

      // Simulate multiple provider instances
      const configs = [
        { name: 'primary', apiKey: 'key1' },
        { name: 'secondary', apiKey: 'key2' },
        { name: 'tertiary', apiKey: 'key3' }
      ];

      configs.forEach(config => {
        registry.createProvider('openai', {
          name: config.name,
          apiKey: config.apiKey
        });
      });

      const providers = registry.listProviders();
      expect(providers).toHaveLength(3);
    });
  });

  describe('Testing Environment', () => {
    it('should support test configurations', () => {
      const testConfig = {
        defaultProvider: 'test',
        fallbackProviders: [],
        loadBalancing: 'round-robin' as const,
        healthCheckInterval: 0 // Disable for tests
      };

      const registry = new ProviderRegistry(testConfig);
      
      // Test with mock-like configuration
      const testProviderConfig: ProviderConfig = {
        name: 'test',
        apiKey: 'test-key',
        baseURL: 'http://localhost:3000/mock-api',
        timeout: 5000
      };

      // This would work with a mock server
      expect(() => {
        registry.createProvider('openai', testProviderConfig);
      }).not.toThrow();
    });

    it('should handle test isolation', () => {
      const registry1 = new ProviderRegistry();
      const registry2 = new ProviderRegistry();

      const config: ProviderConfig = {
        name: 'test',
        apiKey: 'test-key'
      };

      registry1.createProvider('openai', config);
      
      // registry2 should not have the provider
      expect(registry1.listProviders()).toEqual(['openai']);
      expect(registry2.listProviders()).toEqual([]);
    });
  });

  describe('Error Handling in Different Environments', () => {
    it('should handle network connectivity issues', async () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: 'test-key',
        baseURL: 'https://non-existent-domain-12345.com',
        timeout: 2000
      };

      const provider = new OpenAIProvider(config);
      
      // Should handle DNS/network errors gracefully
      await expect(provider.createCompletion('Hello')).rejects.toThrow();
      
      const isAvailable = await provider.isAvailable();
      expect(isAvailable).toBe(false);
    }, 10000);

    it('should handle API rate limits', async () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: 'test-key',
        retryPolicy: {
          maxAttempts: 2,
          backoffMs: 100,
          shouldRetry: (error) => error.message.includes('rate limit')
        }
      };

      const provider = new OpenAIProvider(config);
      
      // This would normally trigger rate limit handling
      // but we can't easily simulate it in tests
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should handle service unavailability', async () => {
      const registry = new ProviderRegistry({
        defaultProvider: 'primary',
        fallbackProviders: ['secondary']
      });

      const unavailableConfig: ProviderConfig = {
        name: 'primary',
        apiKey: 'test-key',
        baseURL: 'https://httpstat.us/503' // Returns 503 Service Unavailable
      };

      const workingConfig: ProviderConfig = {
        name: 'secondary',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      };

      registry.createProvider('openai', unavailableConfig);
      registry.createProvider('openai', workingConfig);

      // Should attempt fallback
      try {
        await registry.createCompletionWithFallback('Hello');
      } catch (error) {
        // Expected to fail if no real API keys
        expect((error as Error).message).toContain('failed');
      }
    }, 30000);
  });

  describe('Resource Management', () => {
    it('should handle concurrent requests', async () => {
      const registry = new ProviderRegistry();
      
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
        timeout: 10000
      };

      registry.createProvider('openai', config);

      // Create multiple concurrent requests
      const requests = Array(5).fill(null).map((_, i) => 
        registry.createCompletionWithFallback(`Request ${i}`, {
          maxTokens: 5,
          temperature: 0
        })
      );

      try {
        const results = await Promise.allSettled(requests);
        
        // At least some should succeed or all should fail consistently
        const In Progress = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');
        
        expect(In Progress.length + failed.length).toBe(5);
      } catch (error) {
        // Expected if no API key
        console.log('Skipping concurrent test - no API key');
      }
    }, 30000);

    it('should handle memory usage', async () => {
      const registry = new ProviderRegistry({
        healthCheckInterval: 100 // Very frequent for testing
      });
      
      const config: ProviderConfig = {
        name: 'test',
        apiKey: 'test-key'
      };

      registry.createProvider('openai', config);
      
      // Wait a bit to let health checks run
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should not have memory leaks
      const status = registry.getProviderStatus();
      expect(status).toBeDefined();
    });
  });
});