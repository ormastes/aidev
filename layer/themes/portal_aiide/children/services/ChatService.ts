/**
 * Chat Service - Handles communication with AI providers
 */

import { ChatMessage, LLMProvider, ContextItem, ChatSettings } from '../types';
import { ClaudeService } from './providers/ClaudeService';
import { OllamaService } from './providers/OllamaService';
import { DeepSeekService } from './providers/DeepSeekService';
import { OpenAIService } from './providers/OpenAIService';

export interface ChatResponse {
  content: string;
  model?: string;
  tokens?: number;
  finishReason?: string;
}

export class ChatService {
  private claudeService: ClaudeService;
  private ollamaService: OllamaService;
  private deepSeekService: DeepSeekService;
  private openAIService: OpenAIService;

  constructor() {
    // Get API keys from environment variables (optional)
    const claudeKey = import.meta.env.VITE_CLAUDE_API_KEY || '';
    const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    const ollamaEndpoint = import.meta.env.VITE_OLLAMA_ENDPOINT || 'http://localhost:11434';
    
    this.claudeService = new ClaudeService(claudeKey);
    this.ollamaService = new OllamaService(ollamaEndpoint);
    this.deepSeekService = new DeepSeekService(deepseekKey);
    this.openAIService = new OpenAIService(openaiKey);
  }

  async sendMessage(
    provider: LLMProvider,
    message: ChatMessage,
    history: ChatMessage[],
    context: ContextItem[],
    settings: ChatSettings
  ): Promise<ChatResponse> {
    // Prepare messages with context
    const messages = this.prepareMessages(message, history, context, settings);

    switch (provider.type) {
      case 'claude':
        return this.claudeService.sendMessage(provider, messages, settings);
      
      case 'ollama':
        return this.ollamaService.sendMessage(provider, messages, settings);
      
      case 'deepseek':
        return this.deepSeekService.sendMessage(provider, messages, settings);
      
      case 'openai':
        return this.openAIService.sendMessage(provider, messages, settings);
      
      case 'custom':
        return this.sendCustomMessage(provider, messages, settings);
      
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  async streamMessage(
    provider: LLMProvider,
    message: ChatMessage,
    history: ChatMessage[],
    context: ContextItem[],
    settings: ChatSettings,
    onChunk: (chunk: string) => void
  ): Promise<ChatResponse> {
    const messages = this.prepareMessages(message, history, context, settings);

    switch (provider.type) {
      case 'claude':
        return this.claudeService.streamMessage(provider, messages, settings, onChunk);
      
      case 'ollama':
        return this.ollamaService.streamMessage(provider, messages, settings, onChunk);
      
      case 'deepseek':
        return this.deepSeekService.streamMessage(provider, messages, settings, onChunk);
      
      case 'openai':
        return this.openAIService.streamMessage(provider, messages, settings, onChunk);
      
      default:
        throw new Error(`Streaming not supported for provider: ${provider.type}`);
    }
  }

  private prepareMessages(
    message: ChatMessage,
    history: ChatMessage[],
    context: ContextItem[],
    settings: ChatSettings
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Add system prompt if provided
    if (settings.systemPrompt) {
      messages.push({
        id: 'system',
        role: 'system',
        content: settings.systemPrompt,
        timestamp: new Date()
      });
    }

    // Add context as system message
    if (context.length > 0) {
      const contextContent = this.formatContext(context);
      messages.push({
        id: 'context',
        role: 'system',
        content: `Context:\n${contextContent}`,
        timestamp: new Date()
      });
    }

    // Add history
    messages.push(...history);

    // Add current message
    messages.push(message);

    return messages;
  }

  private formatContext(context: ContextItem[]): string {
    return context
      .map(item => {
        switch (item.type) {
          case 'file':
            return `File: ${item.name}\n\`\`\`\n${item.content}\n\`\`\``;
          case 'code':
            return `Code:\n\`\`\`\n${item.content}\n\`\`\``;
          case 'url':
            return `URL: ${item.name}\n${item.content}`;
          case 'text':
            return `${item.name}:\n${item.content}`;
          default:
            return item.content;
        }
      })
      .join('\n\n');
  }

  private async sendCustomMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings
  ): Promise<ChatResponse> {
    if (!provider.endpoint) {
      throw new Error('Custom provider requires an endpoint');
    }

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(provider.apiKey && { 'Authorization': `Bearer ${provider.apiKey}` })
      },
      body: JSON.stringify({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        model: provider.defaultModel,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        top_p: settings.topP,
        stop: settings.stopSequences
      })
    });

    if (!response.ok) {
      throw new Error(`Custom provider error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.content || data.message || data.text || '',
      model: data.model,
      tokens: data.usage?.total_tokens
    };
  }

  async testConnection(provider: LLMProvider): Promise<boolean> {
    try {
      const testMessage: ChatMessage = {
        id: 'test',
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      const settings: ChatSettings = {
        temperature: 0.7,
        maxTokens: 10,
        topP: 1
      };

      await this.sendMessage(provider, testMessage, [], [], settings);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedChars = maxTokens * 4;
    if (text.length <= estimatedChars) {
      return text;
    }
    return text.substring(0, estimatedChars - 3) + '...';
  }
}