import { ProviderRegistry } from '../../src/providers/provider-registry';
import { LLMProvider, ProviderConfig } from '../../src/types';

// Mock provider for testing
class MockProvider implements LLMProvider {
  public name: string;
  private shouldFail: boolean;
  private latency: number;

  constructor(name: string, shouldFail = false, latency = 100) {
    this.name = name;
    this.shouldFail = shouldFail;
    this.latency = latency;
  }

  async createCompletion(prompt: string): Promise<string> {
    await this.sleep(this.latency);
    if (this.shouldFail) {
      throw new Error(`Provider ${this.name} failed`);
    }
    return `Response from ${this.name}: ${prompt}`;
  }

  async streamCompletion(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    await this.sleep(this.latency);
    if (this.shouldFail) {
      throw new Error(`Provider ${this.name} failed`);
    }
    onChunk(`Response from ${this.name}: ${prompt}`);
  }

  async isAvailable(): Promise<boolean> {
    await this.sleep(this.latency);
    return !this.shouldFail;
  }

  async getModels(): Promise<string[]> {
    return [`${this.name}-model-1`, `${this.name}-model-2`];
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  let mockProvider1: MockProvider;
  let mockProvider2: MockProvider;
  let mockProvider3: MockProvider;

  beforeEach(() => {
    registry = new ProviderRegistry({
      defaultProvider: 'provider1',
      fallbackProviders: ['provider2', 'provider3'],
      healthCheckInterval: 0, // Disable auto health checks
      loadBalancing: 'round-robin'
    });

    mockProvider1 = new MockProvider('provider1', false, 50);
    mockProvider2 = new MockProvider('provider2', false, 100);
    mockProvider3 = new MockProvider('provider3', false, 150);

    registry.registerProvider('provider1', mockProvider1);
    registry.registerProvider('provider2', mockProvider2);
    registry.registerProvider('provider3', mockProvider3);
  });

  describe('registerProvider', () => {
    it('should register provider', () => {
      const newProvider = new MockProvider('new-provider');
      registry.registerProvider('new-provider', newProvider);
      
      const provider = registry.getProvider('new-provider');
      expect(provider).toBe(newProvider);
    });
  });

  describe('createProvider', () => {
    it('should create OpenAI provider', () => {
      const config: ProviderConfig = {
        name: 'openai',
        apiKey: 'test-key'
      };
      const provider = registry.createProvider('openai', config);
      expect(provider.name).toBe('openai');
    });

    it('should create Anthropic provider', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        apiKey: 'test-key'
      };
      const provider = registry.createProvider('anthropic', config);
      expect(provider.name).toBe('anthropic');
    });

    it('should create Ollama provider', () => {
      const config: ProviderConfig = {
        name: 'ollama',
        baseURL: 'http://localhost:11434'
      };
      const provider = registry.createProvider('ollama', config);
      expect(provider.name).toBe('ollama');
    });

    it('should throw error for unknown provider', () => {
      const config: ProviderConfig = { name: 'unknown' };
      expect(() => registry.createProvider('unknown', config)).toThrow('Unknown provider: unknown');
    });
  });

  describe('getProvider', () => {
    it('should get registered provider', () => {
      const provider = registry.getProvider('provider1');
      expect(provider).toBe(mockProvider1);
    });

    it('should throw error for non-existent provider', () => {
      expect(() => registry.getProvider('non-existent')).toThrow('Provider not found: non-existent');
    });
  });

  describe('getHealthyProvider', () => {
    it('should return preferred provider if healthy', async () => {
      const provider = await registry.getHealthyProvider('provider2');
      expect(provider).toBe(mockProvider2);
    });

    it('should return default provider if no preference', async () => {
      const provider = await registry.getHealthyProvider();
      expect(provider).toBe(mockProvider1);
    });

    it('should fallback to any healthy provider', async () => {
      // Make default provider unhealthy
      mockProvider1.setFailure(true);
      await registry.checkHealth();
      
      const provider = await registry.getHealthyProvider();
      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider.name).not.toBe('provider1');
    });

    it('should throw error if no healthy providers', async () => {
      // Make all providers unhealthy
      mockProvider1.setFailure(true);
      mockProvider2.setFailure(true);
      mockProvider3.setFailure(true);
      await registry.checkHealth();
      
      await expect(registry.getHealthyProvider()).rejects.toThrow('No healthy providers available');
    });
  });

  describe('selectProvider', () => {
    it('should select provider using round-robin', async () => {
      const providers = [
        await registry.selectProvider(),
        await registry.selectProvider(),
        await registry.selectProvider(),
        await registry.selectProvider()
      ];

      // Should cycle through providers
      expect(providers[0].name).toBe('provider1');
      expect(providers[1].name).toBe('provider2');
      expect(providers[2].name).toBe('provider3');
      expect(providers[3].name).toBe('provider1');
    });

    it('should select provider using random', async () => {
      const randomRegistry = new ProviderRegistry({
        loadBalancing: 'random'
      });
      
      randomRegistry.registerProvider('provider1', mockProvider1);
      randomRegistry.registerProvider('provider2', mockProvider2);
      
      const provider = await randomRegistry.selectProvider();
      expect(['provider1', 'provider2']).toContain(provider.name);
    });

    it('should select provider using least-latency', async () => {
      const latencyRegistry = new ProviderRegistry({
        loadBalancing: 'least-latency'
      });
      
      latencyRegistry.registerProvider('provider1', mockProvider1); // 50ms
      latencyRegistry.registerProvider('provider2', mockProvider2); // 100ms
      latencyRegistry.registerProvider('provider3', mockProvider3); // 150ms
      
      // Simulate latency measurements
      latencyRegistry['providerLatency'].set('provider1', 50);
      latencyRegistry['providerLatency'].set('provider2', 100);
      latencyRegistry['providerLatency'].set('provider3', 150);
      
      const provider = await latencyRegistry.selectProvider();
      expect(provider.name).toBe('provider1');
    });
  });

  describe('createCompletionWithFallback', () => {
    it('should create completion with preferred provider', async () => {
      const result = await registry.createCompletionWithFallback('Hello', {
        preferredProvider: 'provider2'
      });
      expect(result).toBe('Response from provider2: Hello');
    });

    it('should fallback to other providers on failure', async () => {
      mockProvider1.setFailure(true);
      
      const result = await registry.createCompletionWithFallback('Hello', {
        preferredProvider: 'provider1'
      });
      expect(result).toContain('Response from provider');
      expect(result).not.toContain('provider1');
    });

    it('should throw error if all providers fail', async () => {
      mockProvider1.setFailure(true);
      mockProvider2.setFailure(true);
      mockProvider3.setFailure(true);
      
      await expect(registry.createCompletionWithFallback('Hello')).rejects.toThrow(
        'All providers failed'
      );
    });
  });

  describe('streamCompletionWithFallback', () => {
    it('should stream completion with preferred provider', async () => {
      const chunks: string[] = [];
      await registry.streamCompletionWithFallback('Hello', (chunk) => {
        chunks.push(chunk);
      }, { preferredProvider: 'provider2' });
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Response from provider2: Hello');
    });

    it('should fallback to other providers on failure', async () => {
      mockProvider1.setFailure(true);
      
      const chunks: string[] = [];
      await registry.streamCompletionWithFallback('Hello', (chunk) => {
        chunks.push(chunk);
      }, { preferredProvider: 'provider1' });
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).not.toContain('provider1');
    });
  });

  describe('checkHealth', () => {
    it('should check health of all providers', async () => {
      await registry.checkHealth();
      
      const status = registry.getProviderStatus();
      expect(status.provider1.healthy).toBe(true);
      expect(status.provider2.healthy).toBe(true);
      expect(status.provider3.healthy).toBe(true);
    });

    it('should mark unhealthy providers', async () => {
      mockProvider2.setFailure(true);
      await registry.checkHealth();
      
      const status = registry.getProviderStatus();
      expect(status.provider1.healthy).toBe(true);
      expect(status.provider2.healthy).toBe(false);
      expect(status.provider3.healthy).toBe(true);
    });

    it('should measure latency', async () => {
      await registry.checkHealth();
      
      const status = registry.getProviderStatus();
      expect(status.provider1.latency).toBeGreaterThan(0);
      expect(status.provider1.latency).toBeLessThan(status.provider2.latency);
      expect(status.provider2.latency).toBeLessThan(status.provider3.latency);
    });
  });

  describe('provider management', () => {
    it('should list providers', () => {
      const providers = registry.listProviders();
      expect(providers).toEqual(['provider1', 'provider2', 'provider3']);
    });

    it('should remove provider', () => {
      registry.removeProvider('provider2');
      const providers = registry.listProviders();
      expect(providers).toEqual(['provider1', 'provider3']);
    });

    it('should get provider status', () => {
      const status = registry.getProviderStatus();
      expect(status).toHaveProperty('provider1');
      expect(status).toHaveProperty('provider2');
      expect(status).toHaveProperty('provider3');
      
      expect(status.provider1.healthy).toBe(true);
      expect(status.provider1.latency).toBeGreaterThanOrEqual(0);
    });
  });
});