import axios from '../utils/http-wrapper';
import { LLMProvider, ChatMessage, ChatResponse, ChatSettings } from '../../types';

export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string = 'https://api.deepseek.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings
  ): Promise<ChatResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: provider.config.model || 'deepseek-chat',
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: settings.temperature || 0.7,
          max_tokens: settings.maxTokens || 4096,
          stream: false,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        content: response.data.choices[0].message.content,
        role: "assistant",
        timestamp: new Date(),
        provider: provider.id,
        model: provider.config.model || 'deepseek-chat',
        usage: {
          promptTokens: response.data.usage?.prompt_tokens,
          completionTokens: response.data.usage?.completion_tokens,
          totalTokens: response.data.usage?.total_tokens,
        },
      };
    } catch (error: any) {
      console.error('DeepSeek API error:', error);
      throw new Error(
        error.response?.data?.error?.message || 
        'Failed to send message to DeepSeek'
      );
    }
  }

  async streamMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings,
    onChunk: (chunk: string) => void
  ): Promise<ChatResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: provider.config.model || 'deepseek-chat',
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: settings.temperature || 0.7,
          max_tokens: settings.maxTokens || 4096,
          stream: true,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      let fullContent = '';
      let usage: any = {};

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              
              if (jsonStr === '[DONE]') {
                resolve({
                  content: fullContent,
                  role: "assistant",
                  timestamp: new Date(),
                  provider: provider.id,
                  model: provider.config.model || 'deepseek-chat',
                  usage,
                });
                return;
              }

              try {
                const data = JSON.parse(jsonStr);
                const content = data.choices?.[0]?.delta?.content;
                
                if (content) {
                  fullContent += content;
                  onChunk(content);
                }
                
                if (data.usage) {
                  usage = {
                    promptTokens: data.usage.prompt_tokens,
                    completionTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens,
                  };
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        });

        response.data.on('error', (error: Error) => {
          reject(error);
        });
      });
    } catch (error: any) {
      console.error('DeepSeek streaming error:', error);
      throw new Error(
        error.response?.data?.error?.message || 
        'Failed to stream message from DeepSeek'
      );
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
      });

      return response.data.data
        .filter((model: any) => model.id.includes("deepseek"))
        .map((model: any) => model.id);
    } catch (error) {
      console.error('Failed to fetch DeepSeek models:', error);
      return ['deepseek-chat', 'deepseek-coder'];
    }
  }
}

export const createDeepSeekService = (apiKey: string) => new DeepSeekService(apiKey);
