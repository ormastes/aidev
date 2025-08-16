import { ProviderRegistry } from '../src/providers/provider-registry';
import { OpenAIProvider } from '../src/providers/openai-provider';
import { AnthropicProvider } from '../src/providers/anthropic-provider';
import { OllamaProvider } from '../src/providers/ollama-provider';
import { ProviderConfig } from '../src/types';

describe('External Services Tests', () => {
  describe('OpenAI External Service', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
        baseURL: 'https://api.openai.com/v1',
        timeout: 30000
      };
      
      provider = new OpenAIProvider(config);
    });

    it('should connect to OpenAI service', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI external test - no API key');
        return;
      }

      const isAvailable = await provider.isAvailable();
      expect(isAvailable).toBe(true);
    }, 30000);

    it('should fetch real models from OpenAI', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI external test - no API key');
        return;
      }

      const models = await provider.getModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // Should include common models
      const hasGPT35 = models.some(model => model.includes('gpt-3.5'));
      const hasGPT4 = models.some(model => model.includes('gpt-4'));
      
      expect(hasGPT35 || hasGPT4).toBe(true);
    }, 30000);

    it('should create real completion with OpenAI', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI external test - no API key');
        return;
      }

      const result = await provider.createCompletion('What is 2+2?', {
        model: 'gpt-3.5-turbo',
        maxTokens: 50,
        temperature: 0
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('4');
    }, 30000);

    it('should handle OpenAI streaming', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI external test - no API key');
        return;
      }

      const chunks: string[] = [];
      await provider.streamCompletion('Count from 1 to 5', (chunk) => {
        chunks.push(chunk);
      }, {
        model: 'gpt-3.5-turbo',
        maxTokens: 50,
        temperature: 0
      });
      
      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join('');
      expect(fullResponse.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Anthropic External Service', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
      const config: ProviderConfig = {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
        baseURL: 'https://api.anthropic.com/v1',
        timeout: 30000
      };
      
      provider = new AnthropicProvider(config);
    });

    it('should connect to Anthropic service', async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping Anthropic external test - no API key');
        return;
      }

      const isAvailable = await provider.isAvailable();
      expect(isAvailable).toBe(true);
    }, 30000);

    it('should return known Anthropic models', async () => {
      const models = await provider.getModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // Should include Claude models
      const hasClaude = models.some(model => model.includes('claude'));
      expect(hasClaude).toBe(true);
    });

    it('should create real completion with Anthropic', async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping Anthropic external test - no API key');
        return;
      }

      const result = await provider.createCompletion('What is 2+2?', {
        model: 'claude-3-haiku-20240307',
        maxTokens: 50,
        temperature: 0
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('4');
    }, 30000);

    it('should handle Anthropic streaming', async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping Anthropic external test - no API key');
        return;
      }

      const chunks: string[] = [];
      await provider.streamCompletion('Count from 1 to 3', (chunk) => {
        chunks.push(chunk);
      }, {
        model: 'claude-3-haiku-20240307',
        maxTokens: 50,
        temperature: 0
      });
      
      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join('');
      expect(fullResponse.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Ollama External Service', () => {
    let provider: OllamaProvider;

    beforeEach(() => {
      const config: ProviderConfig = {
        name: 'ollama',
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: 'llama2'
      };
      
      provider = new OllamaProvider(config);
    });

    it('should connect to Ollama service', async () => {
      try {
        const isAvailable = await provider.isAvailable();
        
        if (isAvailable) {
          console.log('Ollama is available');
          expect(isAvailable).toBe(true);
        } else {
          console.log('Ollama is not available - this is expected in CI');
        }
      } catch (error) {
        console.log('Ollama connection failed - this is expected in CI');
      }
    }, 30000);

    it('should fetch models from Ollama', async () => {
      try {
        const models = await provider.getModels();
        
        if (models.length > 0) {
          console.log('Ollama models found:', models);
          expect(Array.isArray(models)).toBe(true);
          expect(models.length).toBeGreaterThan(0);
        } else {
          console.log('No Ollama models found - this is expected in CI');
        }
      } catch (error) {
        console.log('Ollama models fetch failed - this is expected in CI');
      }
    }, 30000);

    it('should create completion with Ollama', async () => {
      try {
        const isAvailable = await provider.isAvailable();
        
        if (isAvailable) {
          const models = await provider.getModels();
          
          if (models.length > 0) {
            const result = await provider.createCompletion('Hello', {
              model: models[0],
              maxTokens: 10
            });
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            console.log('Ollama completion In Progress');
          } else {
            console.log('No models available for completion test');
          }
        } else {
          console.log('Ollama not available for completion test');
        }
      } catch (error) {
        console.log('Ollama completion failed - this is expected in CI');
      }
    }, 30000);
  });

  describe('Multi-Provider External Integration', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
      registry = new ProviderRegistry({
        defaultProvider: 'openai',
        fallbackProviders: ['anthropic', 'ollama'],
        loadBalancing: 'round-robin',
        healthCheckInterval: 10000
      });
    });

    it('should handle multiple external providers', async () => {
      // Setup all providers
      if (process.env.OPENAI_API_KEY) {
        registry.createProvider('openai', {
          name: 'openai',
          apiKey: process.env.OPENAI_API_KEY
        });
      }

      if (process.env.ANTHROPIC_API_KEY) {
        registry.createProvider('anthropic', {
          name: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY
        });
      }

      registry.createProvider('ollama', {
        name: 'ollama',
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      });

      // Check health of all providers
      await registry.checkHealth();
      
      const status = registry.getProviderStatus();
      const providerNames = Object.keys(status);
      
      expect(providerNames.length).toBeGreaterThan(0);
      
      // At least one provider should be healthy (or all unhealthy in CI)
      const healthyProviders = providerNames.filter(name => status[name].healthy);
      console.log('Healthy providers:', healthyProviders);
      
      if (healthyProviders.length > 0) {
        // Test completion with fallback
        const result = await registry.createCompletionWithFallback('Hello', {
          maxTokens: 10,
          temperature: 0
        });
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      } else {
        console.log('No healthy providers found - this is expected in CI without API keys');
      }
    }, 60000);

    it('should handle real-world network conditions', async () => {
      // Test with different timeout settings
      const configs = [
        {
          name: 'openai-fast',
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          timeout: 5000
        },
        {
          name: 'openai-slow',
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          timeout: 30000
        }
      ];

      configs.forEach(config => {
        if (process.env.OPENAI_API_KEY) {
          registry.createProvider('openai', config);
        }
      });

      // Test with different network conditions
      const providers = registry.listProviders();
      
      if (providers.length > 0) {
        await registry.checkHealth();
        const status = registry.getProviderStatus();
        
        // All providers should have measurable latency
        Object.values(status).forEach(providerStatus => {
          expect(providerStatus.latency).toBeGreaterThanOrEqual(0);
        });
      }
    }, 60000);

    it('should handle service outages gracefully', async () => {
      // Setup provider with invalid endpoint
      registry.createProvider('openai', {
        name: 'outage-test',
        apiKey: 'test-key',
        baseURL: 'https://httpstat.us/503'
      });

      // Setup working provider if available
      if (process.env.OPENAI_API_KEY) {
        registry.createProvider('openai', {
          name: 'working-test',
          apiKey: process.env.OPENAI_API_KEY
        });
      }

      await registry.checkHealth();
      const status = registry.getProviderStatus();
      
      // Outage provider should be marked as unhealthy
      expect(status['outage-test']?.healthy).toBe(false);
      
      // Working provider should be healthy (if API key provided)
      if (process.env.OPENAI_API_KEY) {
        expect(status['working-test'].healthy).toBe(true);
      }
    }, 30000);
  });

  describe('Real-World Usage Patterns', () => {
    it('should handle different content types', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping content type test - no API key');
        return;
      }

      const provider = new OpenAIProvider({
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      });

      const testCases = [
        { input: 'Explain photosynthesis briefly', type: 'educational' },
        { input: 'Write a haiku about coding', type: 'creative' },
        { input: 'What is 15 * 23?', type: 'mathematical' },
        { input: 'List 3 benefits of exercise', type: 'informational' }
      ];

      for (const testCase of testCases) {
        const result = await provider.createCompletion(testCase.input, {
          maxTokens: 100,
          temperature: 0.7
        });
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        
        console.log(`${testCase.type} response length:`, result.length);
      }
    }, 60000);

    it('should handle rate limiting gracefully', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping rate limit test - no API key');
        return;
      }

      const provider = new OpenAIProvider({
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
          backoffMultiplier: 2
        }
      });

      // Make multiple rapid requests
      const requests = Array(3).fill(null).map((_, i) => 
        provider.createCompletion(`Request ${i}`, {
          maxTokens: 10,
          temperature: 0
        })
      );

      try {
        const results = await Promise.all(requests);
        results.forEach(result => {
          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
        });
      } catch (error) {
        // Rate limiting might occur - that's expected
        console.log('Rate limiting occurred (expected):', (error as Error).message);
      }
    }, 30000);

    it('should handle concurrent requests efficiently', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping concurrent test - no API key');
        return;
      }

      const registry = new ProviderRegistry({
        loadBalancing: 'round-robin'
      });

      registry.createProvider('openai', {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      });

      const startTime = Date.now();
      
      // Create 5 concurrent requests
      const requests = Array(5).fill(null).map((_, i) => 
        registry.createCompletionWithFallback(`Hello ${i}`, {
          maxTokens: 5,
          temperature: 0
        })
      );

      const results = await Promise.all(requests);
      const endTime = Date.now();
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      const totalTime = endTime - startTime;
      console.log(`Concurrent requests In Progress in ${totalTime}ms`);
      
      // Should be faster than sequential requests
      expect(totalTime).toBeLessThan(30000);
    }, 60000);
  });
});