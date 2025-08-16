import { LLMProvider, CompletionOptions, ProviderConfig, RetryPolicy, ProviderError } from '../types';

export abstract class BaseProvider implements LLMProvider {
  protected config: ProviderConfig;
  protected retryPolicy: RetryPolicy;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.retryPolicy = config.retryPolicy || {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 10000,
      shouldRetry: (error: Error, attempt: number) => {
        // Retry on network errors and 5xx responses
        return attempt < 3 && (
          error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('5')
        );
      }
    };
  }

  abstract get name(): string;
  
  abstract createCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  
  abstract streamCompletion(prompt: string, onChunk: (chunk: string) => void, options?: CompletionOptions): Promise<void>;
  
  abstract isAvailable(): Promise<boolean>;
  
  abstract getModels(): Promise<string[]>;

  protected async retry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.retryPolicy.maxAttempts) {
          break;
        }
        
        if (this.retryPolicy.shouldRetry && !this.retryPolicy.shouldRetry(lastError, attempt)) {
          break;
        }
        
        // Calculate backoff delay
        const baseDelay = this.retryPolicy.backoffMs * Math.pow(
          this.retryPolicy.backoffMultiplier || 2,
          attempt - 1
        );
        
        const maxDelay = this.retryPolicy.maxBackoffMs || Number.MAX_SAFE_INTEGER;
        const delay = Math.min(baseDelay, maxDelay);
        
        // Add jitter
        const jitteredDelay = delay + Math.random() * 1000;
        
        await this.sleep(jitteredDelay);
      }
    }
    
    throw new ProviderError(
      `${context} failed after ${this.retryPolicy.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`,
      this.name,
      lastError
    );
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected validateConfig(): void {
    if (!this.config.apiKey && this.requiresApiKey()) {
      throw new ProviderError(
        `API key is required for provider ${this.name}`,
        this.name
      );
    }
  }

  protected requiresApiKey(): boolean {
    return true;
  }

  protected getDefaultModel(): string {
    return this.config.defaultModel || 'default';
  }

  protected getTimeout(): number {
    return this.config.timeout || 30000;
  }

  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'PocketFlow/1.0'
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  protected async makeRequest(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.getTimeout());

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.buildHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}