import { BaseProvider } from './base-provider';
import { CompletionOptions, ProviderConfig } from '../types';

export class OllamaProvider extends BaseProvider {
  private baseURL: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'http://localhost:11434';
    // Ollama doesn't require an API key
  }

  get name(): string {
    return 'ollama';
  }

  async createCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({
          model: options?.model || this.getDefaultModel() || 'llama2',
          prompt: prompt,
          options: {
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 1000,
            stop: options?.stop
          },
          stream: false
        })
      });

      const data = await response.json() as any;
      
      if (data.error) {
        throw new Error(data.error || 'Ollama API error');
      }

      return data.response || '';
    }, 'Ollama completion');
  }

  async streamCompletion(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: CompletionOptions
  ): Promise<void> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({
          model: options?.model || this.getDefaultModel() || 'llama2',
          prompt: prompt,
          options: {
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 1000,
            stop: options?.stop
          },
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
            
            try {
              const data = JSON.parse(line);
              if (data.response) {
                onChunk(data.response);
              }
              if (data.success) {
                return;
              }
            } catch (e) {
              // Ignore parsing errors for individual chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }, 'Ollama streaming completion');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseURL}/api/tags`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/api/tags`, {
        method: 'GET'
      });

      const data = await response.json() as any;
      return data.models?.map((model: any) => model.name) || [];
    }, 'Ollama models fetch');
  }

  protected requiresApiKey(): boolean {
    return false;
  }

  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'PocketFlow/1.0'
    };
  }

  protected getDefaultModel(): string {
    return this.config.defaultModel || 'llama2';
  }

  async pullModel(modelName: string): Promise<void> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/api/pull`, {
        method: 'POST',
        body: JSON.stringify({
          name: modelName
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model ${modelName}`);
      }
    }, `Ollama pull model ${modelName}`);
  }

  async deleteModel(modelName: string): Promise<void> {
    return this.retry(async () => {
      const response = await this.makeRequest(`${this.baseURL}/api/delete`, {
        method: 'DELETE',
        body: JSON.stringify({
          name: modelName
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete model ${modelName}`);
      }
    }, `Ollama delete model ${modelName}`);
  }
}