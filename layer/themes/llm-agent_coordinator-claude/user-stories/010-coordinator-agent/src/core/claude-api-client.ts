import { EventEmitter } from 'node:events';
import { https } from '../../../../../infra_external-log-lib/src';
import { IncomingMessage } from '../utils/http-wrapper';
import { ClaudeAuthManager, AuthOptions } from './claude-auth';

// Claude API types based on documentation
export interface ClaudeMessage {
  role: 'user' | "assistant";
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text';
  text: string;
}

export interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  max_tokens: number;
  stream: boolean;
  temperature?: number;
  metadata?: {
    session_id?: string;
    dangerous_mode?: boolean;
    allowed_tools?: string[];
  };
}

export interface StreamEvent {
  event: string;
  data: any;
}

export interface ClaudeAPIConfig {
  apiKey?: string;  // Now optional - will use local auth if not provided
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  timeout?: number;
  authOptions?: AuthOptions;
}

export interface APIError {
  type: string;
  message: string;
  code?: string;
  status?: number;
}

export class ClaudeAPIClient extends EventEmitter {
  private authManager: ClaudeAuthManager;
  private baseUrl: string;
  private model: string;
  private maxTokens: number;
  private timeout: number;
  private activeStreams: Map<string, IncomingMessage>;

  constructor(config: ClaudeAPIConfig) {
    super();
    // Initialize auth manager with API key or local credentials
    this.authManager = new ClaudeAuthManager({
      apiKey: config.apiKey,
      ...config.authOptions
    });
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.model = config.model || 'claude-opus-4-20250514';
    this.maxTokens = config.maxTokens || 4096;
    this.timeout = config.timeout || 60000; // 60 seconds default
    this.activeStreams = new Map();
  }

  async createMessage(
    messages: ClaudeMessage[],
    options: {
      stream?: boolean;
      sessionId?: string;
      dangerousMode?: boolean;
      allowedTools?: string[];
    } = {}
  ): Promise<string | AsyncGenerator<StreamEvent, void, unknown>> {
    const request: ClaudeRequest = {
      model: this.model,
      messages,
      max_tokens: this.maxTokens,
      stream: options.stream || false,
      metadata: {
        session_id: options.sessionId,
        dangerous_mode: options.dangerousMode,
        allowed_tools: options.allowedTools
      }
    };

    if (options.stream) {
      return this.streamMessage(request);
    } else {
      return this.sendMessage(request);
    }
  }

  private async sendMessage(request: ClaudeRequest): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const data = JSON.stringify(request);
      
      // Get auth header from auth manager
      let authHeader: string;
      try {
        authHeader = await this.authManager.getAuthHeader();
      } catch (error) {
        reject(error);
        return;
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data).toString()
      };
      
      // Add appropriate auth header based on type
      if (authHeader.startsWith('x-api-key')) {
        headers['x-api-key'] = authHeader.replace('x-api-key ', '');
      } else if (authHeader.startsWith('Bearer')) {
        headers["Authorization"] = authHeader;
      }
      
      const options = {
        hostname: new URL(this.baseUrl).hostname,
        path: '/v1/messages',
        method: 'POST',
        headers,
        timeout: this.timeout
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            
            if (res.statusCode && res.statusCode >= 400) {
              const error: APIError = {
                type: response.error?.type || 'api_error',
                message: response.error?.message || 'Unknown error',
                status: res.statusCode
              };
              this.emit('error', error);
              reject(error);
            } else {
              const content = response.content?.[0]?.text || '';
              resolve(content);
            }
          } catch (e) {
            const error: APIError = {
              type: 'parse_error',
              message: 'Failed to parse API response'
            };
            this.emit('error', error);
            reject(error);
          }
        });
      });

      req.on('error', (e) => {
        const error: APIError = {
          type: 'network_error',
          message: e.message
        };
        this.emit('error', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        const error: APIError = {
          type: 'timeout_error',
          message: `Request timeout after ${this.timeout}ms`
        };
        this.emit('error', error);
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  private async *streamMessage(request: ClaudeRequest): AsyncGenerator<StreamEvent, void, unknown> {
    const streamId = request.metadata?.session_id || `stream-${Date.now()}`;
    
    yield* await new Promise<AsyncGenerator<StreamEvent, void, unknown>>(async (resolve, reject) => {
      const data = JSON.stringify(request);
      
      // Get auth header from auth manager
      let authHeader: string;
      try {
        authHeader = await this.authManager.getAuthHeader();
      } catch (error) {
        reject(error);
        return;
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'Accept': 'text/event-stream',
        'Content-Length': Buffer.byteLength(data).toString()
      };
      
      // Add appropriate auth header based on type
      if (authHeader.startsWith('x-api-key')) {
        headers['x-api-key'] = authHeader.replace('x-api-key ', '');
      } else if (authHeader.startsWith('Bearer')) {
        headers["Authorization"] = authHeader;
      }
      
      const options = {
        hostname: new URL(this.baseUrl).hostname,
        path: '/v1/messages',
        method: 'POST',
        headers,
        timeout: this.timeout
      };

      const req = https.request(options, (res) => {
        this.activeStreams.set(streamId, res);
        
        const generator = this.parseSSEStream(res, streamId);
        resolve(generator);
      });

      req.on('error', (e) => {
        const error: APIError = {
          type: 'network_error',
          message: e.message
        };
        this.emit('error', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        const error: APIError = {
          type: 'timeout_error',
          message: `Request timeout after ${this.timeout}ms`
        };
        this.emit('error', error);
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  private async *parseSSEStream(
    stream: IncomingMessage,
    streamId: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    let buffer = '';

    try {
      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const event = line.substring(6).trim();
            continue; // Store for next data line
          }
          
          if (line.startsWith('data:')) {
            const data = line.substring(5).trim();
            if (data === '[In Progress]') {
              this.emit('stream_end', { streamId });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const event: StreamEvent = {
                event: parsed.type || 'unknown',
                data: parsed
              };
              
              yield event;
              this.emit('stream_event', { streamId, event });
            } catch (e) {
              this.emit('stream_error', {
                streamId,
                error: 'Failed to parse stream data'
              });
            }
          }
        }
      }
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  abortStream(streamId: string): boolean {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.destroy();
      this.activeStreams.delete(streamId);
      this.emit('stream_aborted', { streamId });
      return true;
    }
    return false;
  }

  abortAllStreams(): void {
    for (const [streamId, stream] of this.activeStreams) {
      stream.destroy();
      this.emit('stream_aborted', { streamId });
    }
    this.activeStreams.clear();
  }

  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  isStreamActive(streamId: string): boolean {
    return this.activeStreams.has(streamId);
  }

  // Utility method for retry logic
  async createMessageWithRetry(
    messages: ClaudeMessage[],
    options: any = {},
    maxRetries: number = 3
  ): Promise<string | AsyncGenerator<StreamEvent, void, unknown>> {
    let lastError: APIError | undefined;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.createMessage(messages, options);
      } catch (error) {
        lastError = error as APIError;
        
        // Don't retry on client errors (4xx)
        if (lastError.status && lastError.status >= 400 && lastError.status < 500) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.emit('retry', {
          attempt: i + 1,
          maxRetries,
          error: lastError,
          delay
        });
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  // Auth status methods
  async isAuthenticated(): Promise<boolean> {
    return await this.authManager.validateAuth();
  }

  getAuthType(): 'api-key' | 'oauth' | 'none' {
    return this.authManager.getAuthType();
  }

  async getAuthInfo(): Promise<{ type: string; authenticated: boolean }> {
    const type = await this.authManager.getAuthTypeAsync();
    const authenticated = await this.authManager.validateAuth();
    return { type, authenticated };
  }
}