import { BaseProvider } from './base-provider';
import { CompletionOptions, ProviderConfig } from '../types';

export class OpenAIProvider extends BaseProvider {
  private baseURL: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.validateConfig();
  }

  get name(): string {
    return 'openai';
  }

  async createCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        body: JSON.stringify({
          model: options?.model || this.getDefaultModel() || 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
          stop: options?.stop,
          stream: false
        })
      });

      const data = await response.json() as any;
      
      if (data.error) {
        throw new Error(data.error.message || 'OpenAI API error');
      }

      return data.choices[0]?.message?.content || '';
    }, 'OpenAI completion');
  }

  async streamCompletion(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: CompletionOptions
  ): Promise<void> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        body: JSON.stringify({
          model: options?.model || this.getDefaultModel() || 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
          stop: options?.stop,
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
                const content = data.choices[0]?.delta?.content;
                if (content) {
                  onChunk(content);
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
    }, 'OpenAI streaming completion');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseURL}/models`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/models`, {
        method: 'GET'
      });

      const data = await response.json() as any;
      return data.data?.map((model: any) => model.id) || [];
    }, 'OpenAI models fetch');
  }

  protected getDefaultModel(): string {
    return this.config.defaultModel || 'gpt-3.5-turbo';
  }
}