import OpenAI from 'openai';
import { LLMProvider, ChatMessage, ChatResponse, ChatSettings } from '../../types';

export class OpenAIService {
  private client: OpenAI | null;

  constructor(apiKey: string) {
    if (apiKey && apiKey !== '') {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    } else {
      this.client = null;
    }
  }

  async sendMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings
  ): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }
    try {
      const completion = await this.client.chat.completions.create({
        model: provider.config.model || 'gpt-4-turbo-preview',
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        temperature: settings.temperature || 0.7,
        max_tokens: settings.maxTokens || 4096,
        stream: false,
      });

      return {
        content: completion.choices[0].message.content || '',
        role: 'assistant',
        timestamp: new Date(),
        provider: provider.id,
        model: provider.config.model || 'gpt-4-turbo-preview',
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw new Error(
        error.message || 'Failed to send message to OpenAI'
      );
    }
  }

  async streamMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings,
    onChunk: (chunk: string) => void
  ): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }
    try {
      const stream = await this.client.chat.completions.create({
        model: provider.config.model || 'gpt-4-turbo-preview',
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        temperature: settings.temperature || 0.7,
        max_tokens: settings.maxTokens || 4096,
        stream: true,
      });

      let fullContent = '';
      let usage: any = {};

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
          onChunk(content);
        }
        
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          };
        }
      }

      return {
        content: fullContent,
        role: 'assistant',
        timestamp: new Date(),
        provider: provider.id,
        model: provider.config.model || 'gpt-4-turbo-preview',
        usage,
      };
    } catch (error: any) {
      console.error('OpenAI streaming error:', error);
      throw new Error(
        error.message || 'Failed to stream message from OpenAI'
      );
    }
  }

  async getModels(): Promise<string[]> {
    if (!this.client) {
      return ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'];
    }
    try {
      const models = await this.client.models.list();
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id);
    } catch (error) {
      console.error('Failed to fetch OpenAI models:', error);
      return ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'];
    }
  }
}

export const createOpenAIService = (apiKey: string) => new OpenAIService(apiKey);
