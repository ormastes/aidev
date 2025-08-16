/**
 * Ollama Service - Local Ollama model integration
 */

import { LLMProvider, ChatMessage, ChatSettings } from '../../types';
import { ChatResponse } from '../ChatService';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

interface OllamaStreamResponse {
  model: string;
  created_at: string;
  message?: OllamaMessage;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

export class OllamaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VITE_OLLAMA_ENDPOINT || 'http://localhost:11434';
  }

  async sendMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings
  ): Promise<ChatResponse> {
    const endpoint = provider.endpoint || this.baseUrl;
    
    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.defaultModel || 'llama2',
          messages: this.convertMessages(messages),
          stream: false,
          options: {
            temperature: settings.temperature || 0.7,
            top_p: settings.topP || 1,
            num_predict: settings.maxTokens || 2048,
            stop: settings.stopSequences
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();

      return {
        content: data.message.content,
        model: data.model,
        tokens: data.eval_count,
        finishReason: data.done ? 'stop' : 'length'
      };
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Ollama API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async streamMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings,
    onChunk: (chunk: string) => void
  ): Promise<ChatResponse> {
    const endpoint = provider.endpoint || this.baseUrl;
    
    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.defaultModel || 'llama2',
          messages: this.convertMessages(messages),
          stream: true,
          options: {
            temperature: settings.temperature || 0.7,
            top_p: settings.topP || 1,
            num_predict: settings.maxTokens || 2048,
            stop: settings.stopSequences
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let model = '';
      let tokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data: OllamaStreamResponse = JSON.parse(line);
            
            if (data.message?.content) {
              fullContent += data.message.content;
              onChunk(data.message.content);
            }

            if (data.model) {
              model = data.model;
            }

            if (data.eval_count) {
              tokens = data.eval_count;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }

      return {
        content: fullContent,
        model,
        tokens,
        finishReason: 'stop'
      };
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw new Error(`Ollama streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listModels(endpoint?: string): Promise<string[]> {
    const baseUrl = endpoint || this.baseUrl;
    
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async pullModel(modelName: string, endpoint?: string): Promise<void> {
    const baseUrl = endpoint || this.baseUrl;
    
    try {
      const response = await fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to pull Ollama model:', error);
      throw error;
    }
  }

  private convertMessages(messages: ChatMessage[]): OllamaMessage[] {
    return messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));
  }
}