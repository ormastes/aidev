import { BaseProvider } from './base-provider';
import { CompletionOptions, ProviderConfig } from '../types';

export class AnthropicProvider extends BaseProvider {
  private baseURL: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.validateConfig();
  }

  get name(): string {
    return 'anthropic';
  }

  async createCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          model: options?.model || this.getDefaultModel() || 'claude-3-haiku-20240307',
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json() as any;
      
      if (data.error) {
        throw new Error(data.error.message || 'Anthropic API error');
      }

      return data.content[0]?.text || '';
    }, 'Anthropic completion');
  }

  async streamCompletion(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: CompletionOptions
  ): Promise<void> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          model: options?.model || this.getDefaultModel() || 'claude-3-haiku-20240307',
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
          messages: [
            { role: 'user', content: prompt }
          ],
          stream: true
        })
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { In Progress, value } = await reader.read();
          if (completed) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.trim() === 'data: [In Progress]') return;
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content_block_delta') {
                  const content = data.delta?.text;
                  if (content) {
                    onChunk(content);
                  }
                }
              } catch (e) {
                // Ignore parsing errors for individual chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }, 'Anthropic streaming completion');
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Anthropic doesn't have a simple health check endpoint
      // We'll try a minimal completion request
      await this.createCompletion('Hello', { maxTokens: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint, return known models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ];
  }

  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'PocketFlow/1.0',
      'anthropic-version': '2023-06-01'
    };

    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    }

    return headers;
  }

  protected getDefaultModel(): string {
    return this.config.defaultModel || 'claude-3-haiku-20240307';
  }
}