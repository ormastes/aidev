/**
 * vLLM Client Service
 * Handles communication with vLLM API using OpenAI-compatible interface
 */

import { http } from '../../../../../infra_external-log-lib/src';
import { https } from '../../../../../infra_external-log-lib/src';
import { URL } from 'url';
import chalk from 'chalk';

export interface VLLMClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface VLLMModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission?: any[];
  root?: string;
  parent?: string;
}

export interface VLLMChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface VLLMChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface VLLMHealthResponse {
  status: string;
  version?: string;
  model_loaded?: boolean;
}

export class VLLMClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private maxRetries: number;
  
  constructor(config: VLLMClientConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.VLLM_SERVER_URL || 'http://localhost:8000';
    this.apiKey = config.apiKey || process.env.VLLM_API_KEY;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries !== undefined ? config.maxRetries : 3;
  }
  
  /**
   * Check if vLLM server is running
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/health');
      const data = JSON.parse(response) as VLLMHealthResponse;
      return data.status === 'ok' || data.status === 'healthy';
    } catch {
      // Try OpenAI-compatible endpoint
      try {
        const models = await this.listModels();
        return models.length > 0;
      } catch {
        return false;
      }
    }
  }
  
  /**
   * List available models
   */
  async listModels(): Promise<VLLMModel[]> {
    try {
      const response = await this.request('GET', '/v1/models');
      const data = JSON.parse(response);
      return data.data || [];
    } catch (error) {
      console.error(chalk.red('Failed to list models:'), error);
      return [];
    }
  }
  
  /**
   * Check if a specific model is available
   */
  async hasModel(modelId: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some(m => m.id === modelId);
  }
  
  /**
   * Chat completion
   */
  async chat(request: VLLMChatRequest): Promise<VLLMChatResponse> {
    // Direct API call
    const response = await this.request('POST', '/v1/chat/completions', request);
    return JSON.parse(response);
  }
  
  /**
   * Chat streaming completion
   */
  async *chatStream(request: VLLMChatRequest): AsyncGenerator<VLLMChatResponse> {
    request.stream = true;
    
    // Direct streaming API call
    yield* this.streamRequest('POST', '/v1/chat/completions', request);
  }
  
  /**
   * Get server metrics
   */
  async getMetrics(): Promise<any> {
    try {
      const response = await this.request('GET', '/metrics');
      return JSON.parse(response);
    } catch {
      return null;
    }
  }
  
  /**
   * Make HTTP request with retries
   */
  private async request(method: string, path: string, body?: any): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.makeRequest(method, path, body);
      } catch (error: any) {
        lastError = error;
        if (attempt < this.maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Request failed');
  }
  
  /**
   * Make single HTTP request
   */
  private makeRequest(method: string, path: string, body?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        timeout: this.timeout,
      };
      
      const proto = url.protocol === 'https:' ? https : http;
      const req = proto.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }
  
  /**
   * Make streaming HTTP request
   */
  private async *streamRequest(method: string, path: string, body?: any): AsyncGenerator<any> {
    const url = new URL(path, this.baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
    };
    
    const proto = url.protocol === 'https:' ? https : http;
    
    const generator = await new Promise<AsyncGenerator<any>>((resolve, reject) => {
      const req = proto.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve((async function* () {
            let buffer = '';
            
            for await (const chunk of res) {
              buffer += chunk.toString();
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  try {
                    yield JSON.parse(data);
                  } catch (e) {
                    console.error('Failed to parse streaming response:', e);
                  }
                }
              }
            }
          })());
        } else {
          let errorData = '';
          res.on('data', chunk => errorData += chunk);
          res.on('end', () => {
            reject(new Error(`HTTP ${res.statusCode}: ${errorData}`));
          });
        }
      });
      
      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
    
    yield* generator;
  }
}

// Singleton instance for convenience
export const vllmClient = new VLLMClient();