import { LLMProvider, ProviderConfig, ProviderError, CompletionOptions } from '../types';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { OllamaProvider } from './ollama-provider';

export interface ProviderRegistryConfig {
  defaultProvider?: string;
  fallbackProviders?: string[];
  healthCheckInterval?: number;
  loadBalancing?: 'round-robin' | 'random' | 'least-latency';
}

export class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();
  private providerHealth = new Map<string, boolean>();
  private providerLatency = new Map<string, number>();
  private config: ProviderRegistryConfig;
  private currentProviderIndex = 0;

  constructor(config: ProviderRegistryConfig = {}) {
    this.config = {
      defaultProvider: config.defaultProvider,
      fallbackProviders: config.fallbackProviders || [],
      healthCheckInterval: config.healthCheckInterval || 60000,
      loadBalancing: config.loadBalancing || 'round-robin'
    };

    // Start health check interval
    if (this.config.healthCheckInterval && this.config.healthCheckInterval > 0) {
      setInterval(() => this.checkHealth(), this.config.healthCheckInterval);
    }
  }

  registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
    this.providerHealth.set(name, true);
    this.providerLatency.set(name, 0);
  }

  createProvider(name: string, config: ProviderConfig): LLMProvider {
    let provider: LLMProvider;

    switch (name.toLowerCase()) {
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      case "anthropic":
        provider = new AnthropicProvider(config);
        break;
      case 'ollama':
        provider = new OllamaProvider(config);
        break;
      default:
        throw new ProviderError(`Unknown provider: ${name}`, name);
    }

    this.registerProvider(name, provider);
    return provider;
  }

  getProvider(name: string): LLMProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderError(`Provider not found: ${name}`, name);
    }
    return provider;
  }

  async getHealthyProvider(preferredProvider?: string): Promise<LLMProvider> {
    // Try preferred provider first
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      if (provider && this.providerHealth.get(preferredProvider)) {
        return provider;
      }
    }

    // Try default provider
    if (this.config.defaultProvider) {
      const provider = this.providers.get(this.config.defaultProvider);
      if (provider && this.providerHealth.get(this.config.defaultProvider)) {
        return provider;
      }
    }

    // Find any healthy provider
    for (const [name, provider] of this.providers) {
      if (this.providerHealth.get(name)) {
        return provider;
      }
    }

    throw new ProviderError('No healthy providers available', "registry");
  }

  async selectProvider(): Promise<LLMProvider> {
    const healthyProviders = Array.from(this.providers.entries())
      .filter(([name]) => this.providerHealth.get(name))
      .map(([name, provider]) => ({ name, provider }));

    if (healthyProviders.length === 0) {
      throw new ProviderError('No healthy providers available', "registry");
    }

    switch (this.config.loadBalancing) {
      case 'round-robin':
        const provider = healthyProviders[this.currentProviderIndex % healthyProviders.length];
        this.currentProviderIndex++;
        return provider.provider;

      case 'random':
        const randomIndex = Math.floor(Math.random() * healthyProviders.length);
        return healthyProviders[randomIndex].provider;

      case 'least-latency':
        const sortedByLatency = healthyProviders.sort((a, b) => 
          (this.providerLatency.get(a.name) || 0) - (this.providerLatency.get(b.name) || 0)
        );
        return sortedByLatency[0].provider;

      default:
        return healthyProviders[0].provider;
    }
  }

  async createCompletionWithFallback(
    prompt: string,
    options?: CompletionOptions & { preferredProvider?: string }
  ): Promise<string> {
    const providers = await this.getProvidersWithFallback(options?.preferredProvider);
    
    let lastError: Error | undefined;
    for (const provider of providers) {
      try {
        const start = Date.now();
        const result = await provider.createCompletion(prompt, options);
        
        // Update latency metrics
        const latency = Date.now() - start;
        this.providerLatency.set(provider.name, latency);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        this.providerHealth.set(provider.name, false);
      }
    }

    throw new ProviderError(
      `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
      "registry",
      lastError
    );
  }

  async streamCompletionWithFallback(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: CompletionOptions & { preferredProvider?: string }
  ): Promise<void> {
    const providers = await this.getProvidersWithFallback(options?.preferredProvider);
    
    let lastError: Error | undefined;
    for (const provider of providers) {
      try {
        const start = Date.now();
        
        if (provider.streamCompletion) {
          await provider.streamCompletion(prompt, onChunk, options);
          
          // Update latency metrics
          const latency = Date.now() - start;
          this.providerLatency.set(provider.name, latency);
          
          return;
        } else {
          // Fallback to non-streaming for providers that don't support it
          const result = await provider.createCompletion(prompt, options);
          onChunk(result);
          
          const latency = Date.now() - start;
          this.providerLatency.set(provider.name, latency);
          
          return;
        }
      } catch (error) {
        lastError = error as Error;
        this.providerHealth.set(provider.name, false);
      }
    }

    throw new ProviderError(
      `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
      "registry",
      lastError
    );
  }

  private async getProvidersWithFallback(preferredProvider?: string): Promise<LLMProvider[]> {
    const providers: LLMProvider[] = [];

    // Add preferred provider first
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      if (provider) {
        providers.push(provider);
      }
    }

    // Add fallback providers
    for (const fallbackName of this.config.fallbackProviders || []) {
      const provider = this.providers.get(fallbackName);
      if (provider && !providers.includes(provider)) {
        providers.push(provider);
      }
    }

    // Add any remaining healthy providers
    for (const [name, provider] of this.providers) {
      if (this.providerHealth.get(name) && !providers.includes(provider)) {
        providers.push(provider);
      }
    }

    return providers;
  }

  async checkHealth(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        const start = Date.now();
        const isHealthy = await provider.isAvailable();
        const latency = Date.now() - start;
        
        this.providerHealth.set(name, isHealthy);
        if (isHealthy) {
          this.providerLatency.set(name, latency);
        }
      } catch (error) {
        this.providerHealth.set(name, false);
      }
    }
  }

  getProviderStatus(): Record<string, { healthy: boolean; latency: number }> {
    const status: Record<string, { healthy: boolean; latency: number }> = {};
    
    for (const [name] of this.providers) {
      status[name] = {
        healthy: this.providerHealth.get(name) || false,
        latency: this.providerLatency.get(name) || 0
      };
    }
    
    return status;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  removeProvider(name: string): void {
    this.providers.delete(name);
    this.providerHealth.delete(name);
    this.providerLatency.delete(name);
  }
}