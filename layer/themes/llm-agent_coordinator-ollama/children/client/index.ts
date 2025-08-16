/**
 * Ollama Client
 * Core client for interacting with Ollama API
 */

import { EventEmitter } from 'node:events';
import { http } from '../../../infra_external-log-lib/src';
import { https } from '../../../infra_external-log-lib/src';

export interface OllamaConfig {
  host?: string;
  port?: number;
  protocol?: 'http' | 'https';
  timeout?: number;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: ModelDetails;
}

export interface ModelDetails {
  format: string;
  family: string;
  families?: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface ModelInfo {
  modelfile: string;
  parameters: string;
  template: string;
  details: ModelDetails;
}

export interface GenerateOptions {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  images?: string[];
  options?: {
    seed?: number;
    temperature?: number;
    top_k?: number;
    top_p?: number;
    num_predict?: number;
    num_ctx?: number;
    stop?: string[];
    tfs_z?: number;
    typical_p?: number;
    repeat_penalty?: number;
    repeat_last_n?: number;
    penalize_newline?: boolean;
    presence_penalty?: number;
    frequency_penalty?: number;
    mirostat?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export class OllamaClient extends EventEmitter {
  private config: Required<OllamaConfig>;
  private baseUrl: string;
  private activeRequests: Map<string, http.ClientRequest>;

  constructor(config: OllamaConfig = {}) {
    super();
    this.config = {
      host: config.host || "localhost",
      port: config.port || 11434,
      protocol: config.protocol || 'http',
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000
    };
    
    this.baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
    this.activeRequests = new Map();
  }

  async generate(options: GenerateOptions): Promise<OllamaResponse> {
    const endpoint = '/api/generate';
    
    if (options.stream) {
      return this.streamRequest(endpoint, options);
    }
    
    return this.request('POST', endpoint, options);
  }

  async chat(options: {
    model: string;
    messages: Array<{ role: string; content: string; images?: string[] }>;
    stream?: boolean;
    format?: 'json';
    options?: GenerateOptions['options'];
  }): Promise<OllamaResponse> {
    const endpoint = '/api/chat';
    
    if (options.stream) {
      return this.streamRequest(endpoint, options);
    }
    
    return this.request('POST', endpoint, options);
  }

  async embeddings(options: {
    model: string;
    prompt: string;
  }): Promise<{
    embedding: number[];
  }> {
    const endpoint = '/api/embeddings';
    return this.request('POST', endpoint, options);
  }

  async list(): Promise<{ models: OllamaModel[] }> {
    const endpoint = '/api/tags';
    return this.request('GET', endpoint);
  }

  async show(model: string): Promise<ModelInfo> {
    const endpoint = '/api/show';
    return this.request('POST', endpoint, { name: model });
  }

  async pull(model: string, onProgress?: (progress: PullProgress) => void): Promise<void> {
    const endpoint = '/api/pull';
    const requestId = `pull_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        }
      };

      const protocol = this.config.protocol === 'https' ? https : http;
      const req = protocol.request(`${this.baseUrl}${endpoint}`, options, (res) => {
        let buffer = '';
        
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const progress = JSON.parse(line);
                if (onProgress) {
                  onProgress(progress);
                }
                this.emit('pull:progress', progress);
                
                if (progress.status === 'success') {
                  this.activeRequests.delete(requestId);
                  resolve();
                }
              } catch (error) {
                // Ignore parse errors
              }
            }
          }
        });

        res.on('end', () => {
          this.activeRequests.delete(requestId);
          resolve();
        });

        res.on('error', (error) => {
          this.activeRequests.delete(requestId);
          reject(error);
        });
      });

      req.on('error', (error) => {
        this.activeRequests.delete(requestId);
        reject(error);
      });

      req.write(JSON.stringify({ name: model, stream: true }));
      req.end();
      
      this.activeRequests.set(requestId, req);
    });
  }

  async push(model: string, onProgress?: (progress: any) => void): Promise<void> {
    const endpoint = '/api/push';
    const requestId = `push_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        }
      };

      const protocol = this.config.protocol === 'https' ? https : http;
      const req = protocol.request(`${this.baseUrl}${endpoint}`, options, (res) => {
        let buffer = '';
        
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const progress = JSON.parse(line);
                if (onProgress) {
                  onProgress(progress);
                }
                this.emit('push:progress', progress);
                
                if (progress.status === 'success') {
                  this.activeRequests.delete(requestId);
                  resolve();
                }
              } catch (error) {
                // Ignore parse errors
              }
            }
          }
        });

        res.on('end', () => {
          this.activeRequests.delete(requestId);
          resolve();
        });

        res.on('error', (error) => {
          this.activeRequests.delete(requestId);
          reject(error);
        });
      });

      req.on('error', (error) => {
        this.activeRequests.delete(requestId);
        reject(error);
      });

      req.write(JSON.stringify({ name: model, stream: true }));
      req.end();
      
      this.activeRequests.set(requestId, req);
    });
  }

  async copy(source: string, destination: string): Promise<void> {
    const endpoint = '/api/copy';
    await this.request('POST', endpoint, { source, destination });
  }

  async delete(model: string): Promise<void> {
    const endpoint = '/api/delete';
    await this.request('DELETE', endpoint, { name: model });
  }

  async create(options: {
    name: string;
    modelfile?: string;
    path?: string;
    stream?: boolean;
  }): Promise<void> {
    const endpoint = '/api/create';
    
    if (options.stream) {
      return this.streamRequest(endpoint, options);
    }
    
    return this.request('POST', endpoint, options);
  }

  private async request(method: string, endpoint: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        timeout: this.config.timeout
      };

      const protocol = this.config.protocol === 'https' ? https : http;
      const req = protocol.request(`${this.baseUrl}${endpoint}`, options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk.toString();
        });

        res.on('end', () => {
          try {
            const result = body ? JSON.parse(body) : {};
            
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(result.error || `HTTP ${res.statusCode}`));
            } else {
              resolve(result);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  private async streamRequest(endpoint: string, data: any): Promise<any> {
    const requestId = `stream_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        }
      };

      const protocol = this.config.protocol === 'https' ? https : http;
      const req = protocol.request(`${this.baseUrl}${endpoint}`, options, (res) => {
        let buffer = '';
        let finalResponse: any = {};
        
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const response = JSON.parse(line);
                this.emit('stream:chunk', response);
                
                if (response.done) {
                  finalResponse = response;
                  this.activeRequests.delete(requestId);
                }
              } catch (error) {
                // Ignore parse errors
              }
            }
          }
        });

        res.on('end', () => {
          this.activeRequests.delete(requestId);
          resolve(finalResponse);
        });

        res.on('error', (error) => {
          this.activeRequests.delete(requestId);
          reject(error);
        });
      });

      req.on('error', (error) => {
        this.activeRequests.delete(requestId);
        reject(error);
      });

      req.write(JSON.stringify({ ...data, stream: true }));
      req.end();
      
      this.activeRequests.set(requestId, req);
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.list();
      return true;
    } catch {
      return false;
    }
  }

  async waitForReady(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.isAvailable()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Ollama service not available');
  }

  cancelRequest(requestId?: string): void {
    if (requestId) {
      const req = this.activeRequests.get(requestId);
      if (req) {
        req.destroy();
        this.activeRequests.delete(requestId);
      }
    } else {
      // Cancel all active requests
      for (const [id, req] of this.activeRequests) {
        req.destroy();
        this.activeRequests.delete(id);
      }
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getConfig(): Required<OllamaConfig> {
    return { ...this.config };
  }
}

export default OllamaClient;