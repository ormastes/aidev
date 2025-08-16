/**
 * Local LLM Connector for Chat Space
 * 
 * Provides integration with local LLM models (DeepSeek R1, Ollama, vLLM)
 * for AI-powered chat responses and assistance.
 * 
 * Mock-free implementation using real HTTP connections.
 */

import axios, { AxiosInstance } from '../utils/http-wrapper';
import { EventEmitter } from 'node:events';

export interface LocalLLMConfig {
  provider: 'ollama' | 'vllm' | 'auto';
  model: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  systemPrompt?: string;
  timeout?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: string;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

export class LocalLLMConnector extends EventEmitter {
  private config: LocalLLMConfig;
  private httpClient: AxiosInstance;
  private isAvailable: boolean = false;
  private activeProvider: 'ollama' | 'vllm' | null = null;
  private conversationHistory: LLMMessage[] = [];

  constructor(config: Partial<LocalLLMConfig> = {}) {
    super();
    
    this.config = {
      provider: config.provider || 'auto',
      model: config.model || 'deepseek-r1:latest',
      endpoint: config.endpoint,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      topP: config.topP ?? 0.95,
      topK: config.topK ?? 50,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
      timeout: config.timeout ?? 30000
    };

    this.httpClient = axios.create({
      timeout: this.config.timeout
    });
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful AI assistant in a developer chat room. You should:
- Help with programming questions and code reviews
- Assist with debugging and problem-solving
- Provide clear, concise explanations
- Use markdown for code formatting
- Be friendly and professional
- Collaborate effectively with human developers
- When asked to calculate, provide direct numeric answers`;
  }

  async initialize(): Promise<void> {
    if (this.config.provider === 'auto') {
      // Auto-detect available provider
      const ollamaAvailable = await this.checkOllamaAvailable();
      if (ollamaAvailable) {
        this.activeProvider = 'ollama';
        this.config.endpoint = 'http://localhost:11434';
      } else {
        const vllmAvailable = await this.checkVLLMAvailable();
        if (vllmAvailable) {
          this.activeProvider = 'vllm';
          this.config.endpoint = 'http://localhost:8000';
        }
      }
    } else {
      // Use specified provider
      this.activeProvider = this.config.provider;
      if (!this.config.endpoint) {
        this.config.endpoint = this.config.provider === 'ollama' 
          ? 'http://localhost:11434'
          : 'http://localhost:8000';
      }
    }

    if (!this.activeProvider) {
      throw new Error('No local LLM provider available. Please start Ollama or vLLM.');
    }

    this.isAvailable = true;
    
    // Initialize with system prompt
    if (this.config.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }

    this.emit("initialized", {
      provider: this.activeProvider,
      model: this.config.model,
      endpoint: this.config.endpoint
    });
  }

  private async checkOllamaAvailable(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('http://localhost:11434/api/tags');
      const models = response.data?.models || [];
      return models.length > 0;
    } catch {
      return false;
    }
  }

  private async checkVLLMAvailable(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('http://localhost:8000/v1/models');
      return response.data?.data?.length > 0;
    } catch {
      return false;
    }
  }

  async chat(message: string, options: Partial<LLMConfig> = {}): Promise<LLMResponse> {
    if (!this.isAvailable) {
      throw new Error('LLM connector not initialized. Call initialize() first.');
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    const response = this.activeProvider === 'ollama'
      ? await this.chatWithOllama(message, options)
      : await this.chatWithVLLM(message, options);

    // Add assistant response to history
    this.conversationHistory.push({
      role: "assistant",
      content: response.content
    });

    this.emit("response", response);
    return response;
  }

  private async chatWithOllama(message: string, options: Partial<LLMConfig>): Promise<LLMResponse> {
    const endpoint = `${this.config.endpoint}/api/generate`;
    
    const requestBody = {
      model: options.model || this.config.model,
      prompt: this.buildPrompt(message),
      stream: false,
      options: {
        temperature: options.temperature ?? this.config.temperature,
        top_p: options.topP ?? this.config.topP,
        top_k: options.topK ?? this.config.topK,
        num_predict: options.maxTokens ?? this.config.maxTokens
      }
    };

    try {
      const response = await this.httpClient.post(endpoint, requestBody);
      
      return {
        content: response.data.response.trim(),
        model: requestBody.model,
        provider: 'ollama',
        tokens: response.data.eval_count ? {
          prompt: response.data.prompt_eval_count || 0,
          completion: response.data.eval_count,
          total: (response.data.prompt_eval_count || 0) + response.data.eval_count
        } : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      this.emit('error', error);
      throw new Error(`Ollama request failed: ${error.message}`);
    }
  }

  private async chatWithVLLM(message: string, options: Partial<LLMConfig>): Promise<LLMResponse> {
    const endpoint = `${this.config.endpoint}/v1/completions`;
    
    const requestBody = {
      model: this.resolveVLLMModelName(options.model || this.config.model),
      prompt: this.buildPrompt(message),
      temperature: options.temperature ?? this.config.temperature,
      top_p: options.topP ?? this.config.topP,
      top_k: options.topK ?? this.config.topK,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      stop: ['<|end|>', '<|endoftext|>']
    };

    try {
      const response = await this.httpClient.post(endpoint, requestBody);
      
      return {
        content: response.data.choices[0].text.trim(),
        model: requestBody.model,
        provider: 'vllm',
        tokens: response.data.usage ? {
          prompt: response.data.usage.prompt_tokens,
          completion: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens
        } : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      this.emit('error', error);
      throw new Error(`vLLM request failed: ${error.message}`);
    }
  }

  private buildPrompt(message: string): string {
    // Build conversation context for better responses
    const contextMessages = this.conversationHistory.slice(-5); // Last 5 messages for context
    let prompt = '';
    
    for (const msg of contextMessages) {
      if (msg.role === 'system') {
        prompt += `System: ${msg.content}\\n\\n`;
      } else if (msg.role === 'user') {
        prompt += `User: ${msg.content}\\n`;
      } else if (msg.role === "assistant") {
        prompt += `Assistant: ${msg.content}\\n`;
      }
    }
    
    prompt += `User: ${message}\\nAssistant:`;
    return prompt;
  }

  private resolveVLLMModelName(ollamaStyleName: string): string {
    const mappings: Record<string, string> = {
      'deepseek-r1:latest': 'deepseek-ai/DeepSeek-R1-32B',
      'deepseek-r1:32b': 'deepseek-ai/DeepSeek-R1-32B',
      'deepseek-r1:8b': 'deepseek-ai/DeepSeek-R1-8B',
      'deepseek-r1:distill': 'deepseek-ai/DeepSeek-R1-Distill-32B'
    };
    
    return mappings[ollamaStyleName.toLowerCase()] || ollamaStyleName;
  }

  async streamChat(message: string, onChunk: (chunk: LLMStreamChunk) => void): Promise<void> {
    if (!this.isAvailable) {
      throw new Error('LLM connector not initialized. Call initialize() first.');
    }

    if (this.activeProvider === 'ollama') {
      await this.streamChatWithOllama(message, onChunk);
    } else {
      // vLLM streaming requires SSE support, fallback to regular chat
      const response = await this.chat(message);
      onChunk({ content: response.content, done: true });
    }
  }

  private async streamChatWithOllama(message: string, onChunk: (chunk: LLMStreamChunk) => void): Promise<void> {
    const endpoint = `${this.config.endpoint}/api/generate`;
    
    const requestBody = {
      model: this.config.model,
      prompt: this.buildPrompt(message),
      stream: true,
      options: {
        temperature: this.config.temperature,
        top_p: this.config.topP,
        top_k: this.config.topK,
        num_predict: this.config.maxTokens
      }
    };

    try {
      const response = await this.httpClient.post(endpoint, requestBody, {
        responseType: 'stream'
      });

      let fullContent = '';
      
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\\n').filter(Boolean);
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              fullContent += json.response;
              onChunk({
                content: json.response,
                done: json.done || false
              });
            }
          } catch {
            // Ignore parsing errors
          }
        }
      });

      return new Promise((resolve, reject) => {
        response.data.on('end', () => {
          // Add to conversation history
          this.conversationHistory.push({
            role: "assistant",
            content: fullContent
          });
          resolve();
        });
        response.data.on('error', reject);
      });
    } catch (error: any) {
      this.emit('error', error);
      throw new Error(`Ollama stream request failed: ${error.message}`);
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
    if (this.config.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }
  }

  getHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  isReady(): boolean {
    return this.isAvailable;
  }

  getActiveProvider(): string | null {
    return this.activeProvider;
  }

  getModelInfo(): { model: string; provider: string | null; endpoint: string | undefined } {
    return {
      model: this.config.model,
      provider: this.activeProvider,
      endpoint: this.config.endpoint
    };
  }

  async shutdown(): Promise<void> {
    this.isAvailable = false;
    this.activeProvider = null;
    this.clearHistory();
    this.removeAllListeners();
  }
}