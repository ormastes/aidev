/**
 * Claude API Client
 * Handles communication with Claude API
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';

export type ModelType = 
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307'
  | 'claude-2.1'
  | 'claude-2.0'
  | 'claude-instant-1.2';

export interface ClaudeConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: ModelType;
  maxRetries?: number;
  timeout?: number;
  organization?: string;
}

export interface ClaudeOptions {
  model?: ModelType;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
  system?: string;
  metadata?: Record<string, any>;
}

export interface RequestOptions extends ClaudeOptions {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | ContentBlock[];
  }>;
  tools?: ToolDefinition[];
}

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface StreamResponse {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop' | 'error';
  message?: Partial<ClaudeResponse>;
  index?: number;
  delta?: {
    type?: string;
    text?: string;
    stop_reason?: string;
    stop_sequence?: string;
  };
  content_block?: {
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    type: string;
    message: string;
  };
}

export class ClaudeClient extends EventEmitter {
  private config: ClaudeConfig;
  private baseUrl: string;
  private headers: Record<string, string>;
  private requestCount: number;
  private rateLimiter: RateLimiter;

  constructor(config: ClaudeConfig) {
    super();
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    };
    
    if (config.organization) {
      this.headers['anthropic-organization'] = config.organization;
    }
    
    this.requestCount = 0;
    this.rateLimiter = new RateLimiter();
  }

  async sendMessage(options: RequestOptions): Promise<ClaudeResponse> {
    await this.rateLimiter.wait();
    
    const requestId = ++this.requestCount;
    const model = options.model || this.config.defaultModel || 'claude-3-sonnet-20240229';
    
    const payload = {
      model,
      messages: options.messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      top_p: options.topP,
      top_k: options.topK,
      stop_sequences: options.stopSequences,
      system: options.system,
      tools: options.tools,
      metadata: {
        ...options.metadata,
        request_id: requestId,
      },
    };
    
    this.emit('request', { requestId, payload });
    
    try {
      const response = await this.makeRequest('/messages', payload, options.stream);
      
      if (options.stream) {
        return this.handleStreamResponse(response, requestId);
      } else {
        const data = await response.json();
        this.emit('response', { requestId, data });
        return data;
      }
    } catch (error) {
      this.emit('error', { requestId, error });
      throw error;
    }
  }

  private async makeRequest(
    endpoint: string,
    payload: any,
    stream?: boolean,
    retryCount: number = 0
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.headers,
        ...(stream ? { 'Accept': 'text/event-stream' } : {}),
      },
      body: JSON.stringify({
        ...payload,
        stream,
      }),
      signal: AbortSignal.timeout(this.config.timeout || 60000),
    });
    
    if (!response.ok) {
      const error = await this.handleError(response);
      
      // Retry logic for rate limits and server errors
      if (this.shouldRetry(response.status, retryCount)) {
        const delay = this.getRetryDelay(retryCount, response);
        await this.sleep(delay);
        return this.makeRequest(endpoint, payload, stream, retryCount + 1);
      }
      
      throw error;
    }
    
    // Update rate limiter based on headers
    this.rateLimiter.updateFromHeaders(response.headers);
    
    return response;
  }

  private async handleStreamResponse(response: Response, requestId: number): Promise<ClaudeResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResponse: Partial<ClaudeResponse> = {
      content: [],
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const event: StreamResponse = JSON.parse(data);
              this.emit('stream', { requestId, event });
              
              // Aggregate the stream response
              this.aggregateStreamEvent(finalResponse, event);
            } catch (error) {
              this.emit('streamError', { requestId, error, data });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return finalResponse as ClaudeResponse;
  }

  private aggregateStreamEvent(response: Partial<ClaudeResponse>, event: StreamResponse): void {
    switch (event.type) {
      case 'message_start':
        if (event.message) {
          Object.assign(response, event.message);
        }
        break;
        
      case 'content_block_start':
        if (event.content_block) {
          response.content?.push(event.content_block);
        }
        break;
        
      case 'content_block_delta':
        if (event.index !== undefined && event.delta?.text) {
          const block = response.content?.[event.index];
          if (block && block.type === 'text') {
            block.text = (block.text || '') + event.delta.text;
          }
        }
        break;
        
      case 'message_delta':
        if (event.delta?.stop_reason) {
          response.stop_reason = event.delta.stop_reason as any;
        }
        if (event.delta?.stop_sequence) {
          response.stop_sequence = event.delta.stop_sequence;
        }
        if (event.usage) {
          response.usage = {
            input_tokens: event.usage.input_tokens || response.usage?.input_tokens || 0,
            output_tokens: event.usage.output_tokens || response.usage?.output_tokens || 0,
          };
        }
        break;
    }
  }

  private async handleError(response: Response): Promise<Error> {
    let errorData: any;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const error = new ClaudeAPIError(
      errorData.error?.message || errorData.message || 'Unknown error',
      response.status,
      errorData.error?.type || 'unknown',
      errorData
    );
    
    return error;
  }

  private shouldRetry(status: number, retryCount: number): boolean {
    if (retryCount >= (this.config.maxRetries || 3)) {
      return false;
    }
    
    // Retry on rate limit, server errors, and gateway timeout
    return status === 429 || status >= 500 || status === 408;
  }

  private getRetryDelay(retryCount: number, response: Response): number {
    // Check for Retry-After header
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    
    // Exponential backoff with jitter
    const baseDelay = Math.pow(2, retryCount) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 60000); // Max 60 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async complete(prompt: string, options?: ClaudeOptions): Promise<string> {
    const response = await this.sendMessage({
      ...options,
      messages: [{ role: 'user', content: prompt }],
    });
    
    return response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');
  }

  async chat(messages: RequestOptions['messages'], options?: ClaudeOptions): Promise<ClaudeResponse> {
    return this.sendMessage({ ...options, messages });
  }

  async streamChat(
    messages: RequestOptions['messages'],
    options?: ClaudeOptions,
    onChunk?: (chunk: StreamResponse) => void
  ): Promise<ClaudeResponse> {
    if (onChunk) {
      this.on('stream', ({ event }) => onChunk(event));
    }
    
    return this.sendMessage({ ...options, messages, stream: true });
  }

  async countTokens(text: string, model?: ModelType): Promise<number> {
    // Simplified token counting - in production, use proper tokenizer
    // Claude uses a similar tokenizer to GPT models
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  validateApiKey(): boolean {
    return /^sk-ant-[a-zA-Z0-9-_]{40,}$/.test(this.config.apiKey);
  }

  updateConfig(config: Partial<ClaudeConfig>): void {
    Object.assign(this.config, config);
    
    if (config.apiKey) {
      this.headers['x-api-key'] = config.apiKey;
    }
    
    if (config.organization !== undefined) {
      if (config.organization) {
        this.headers['anthropic-organization'] = config.organization;
      } else {
        delete this.headers['anthropic-organization'];
      }
    }
    
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  getUsageStats(): {
    requestCount: number;
    rateLimitInfo: any;
  } {
    return {
      requestCount: this.requestCount,
      rateLimitInfo: this.rateLimiter.getInfo(),
    };
  }
}

class ClaudeAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string,
    public details: any
  ) {
    super(message);
    this.name = 'ClaudeAPIError';
  }
}

class RateLimiter {
  private requestsPerMinute: number = 50;
  private tokensPerMinute: number = 40000;
  private requestTimes: number[] = [];
  private tokenCounts: number[] = [];
  private retryAfter?: Date;

  async wait(): Promise<void> {
    // Wait if we have a retry-after time
    if (this.retryAfter && this.retryAfter > new Date()) {
      const delay = this.retryAfter.getTime() - Date.now();
      await this.sleep(delay);
      this.retryAfter = undefined;
    }
    
    // Clean old request times
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestTimes = this.requestTimes.filter(t => t > oneMinuteAgo);
    
    // Check rate limit
    if (this.requestTimes.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const delay = oldestRequest + 60000 - now;
      if (delay > 0) {
        await this.sleep(delay);
      }
    }
    
    this.requestTimes.push(now);
  }

  updateFromHeaders(headers: Headers): void {
    const remaining = headers.get('anthropic-ratelimit-requests-remaining');
    const reset = headers.get('anthropic-ratelimit-requests-reset');
    const retryAfter = headers.get('retry-after');
    
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        this.retryAfter = new Date(Date.now() + seconds * 1000);
      }
    }
    
    if (remaining && reset) {
      // Update rate limit info based on headers
      const remainingRequests = parseInt(remaining, 10);
      if (remainingRequests === 0) {
        this.retryAfter = new Date(reset);
      }
    }
  }

  getInfo(): any {
    return {
      requestsPerMinute: this.requestsPerMinute,
      tokensPerMinute: this.tokensPerMinute,
      recentRequests: this.requestTimes.length,
      retryAfter: this.retryAfter,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ClaudeClient;