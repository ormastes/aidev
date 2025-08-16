/**
 * Ollama Client Service
 * Handles communication with Ollama API and server management
 */

import { http } from '../../../../../../../../infra_external-log-lib/src';
import { https } from '../../../../../../../../infra_external-log-lib/src';
import { URL } from 'url';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { os } from '../../../../../../../../infra_external-log-lib/src';
import chalk from 'chalk';

const execAsync = promisify(exec);

export interface OllamaClientConfig {
  baseUrl?: string;
  timeout?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
    seed?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  "success": boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
  eval_count?: number;
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  "success": boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
  eval_count?: number;
}

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  "completed"?: number;
}

export interface OllamaGPUInfo {
  available: boolean;
  type?: 'cuda' | 'rocm' | 'metal' | 'cpu';
  name?: string;
  memory?: number;
  compute_capability?: string;
}

export class OllamaClient {
  private baseUrl: string;
  private timeout: number;
  
  constructor(config: OllamaClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.timeout = config.timeout || 30000;
  }
  
  /**
   * Check if Ollama server is running
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/');
      return response.includes('Ollama is running');
    } catch {
      return false;
    }
  }
  
  /**
   * Check GPU availability and info
   */
  async checkGPU(): Promise<OllamaGPUInfo> {
    try {
      // First check via Ollama API if available
      const models = await this.listModels();
      
      // Check system for GPU
      const platform = os.platform();
      
      if (platform === 'linux') {
        // Check for NVIDIA GPU
        try {
          const { stdout: nvidia } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
          if (nvidia) {
            const [name, memory] = nvidia.trim().split(',').map(s => s.trim());
            return {
              available: true,
              type: 'cuda',
              name,
              memory: parseInt(memory)
            };
          }
        } catch {}
        
        // Check for AMD GPU
        try {
          const { stdout: amd } = await execAsync('rocm-smi --showproductname');
          if (amd) {
            return {
              available: true,
              type: 'rocm',
              name: 'AMD GPU'
            };
          }
        } catch {}
      } else if (platform === 'darwin') {
        // macOS with Metal
        try {
          const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep Chipset');
          if (stdout && (stdout.includes('Apple') || stdout.includes('M1') || stdout.includes('M2') || stdout.includes('M3'))) {
            return {
              available: true,
              type: 'metal',
              name: 'Apple Silicon GPU'
            };
          }
        } catch {}
      } else if (platform === 'win32') {
        // Windows GPU detection
        try {
          const { stdout } = await execAsync('wmic path win32_videocontroller get name');
          if (stdout && (stdout.includes('NVIDIA') || stdout.includes('AMD'))) {
            return {
              available: true,
              type: stdout.includes('NVIDIA') ? 'cuda' : 'rocm',
              name: 'GPU detected'
            };
          }
        } catch {}
      }
      
      return { available: false, type: 'cpu' };
    } catch {
      return { available: false, type: 'cpu' };
    }
  }
  
  /**
   * Auto-install Ollama if not present
   */
  async autoInstall(): Promise<boolean> {
    console.log(chalk.blue('🔍 Checking Ollama installation...'));
    
    // Check if Ollama is already installed
    try {
      await execAsync('ollama --version');
      console.log(chalk.green('🔄 Ollama is already installed'));
      return true;
    } catch {
      console.log(chalk.yellow('⚠️  Ollama not found. Installing...'));
    }
    
    const platform = os.platform();
    
    try {
      if (platform === 'darwin' || platform === 'linux') {
        // macOS and Linux installation
        console.log(chalk.blue('📥 Downloading and installing Ollama...'));
        const { stdout, stderr } = await execAsync('curl -fsSL https://ollama.com/install.sh | sh');
        
        if (stderr && !stderr.includes('Warning')) {
          throw new Error(stderr);
        }
        
        console.log(chalk.green('🔄 Ollama installed successfully'));
        
        // Start Ollama service
        await this.startOllamaService();
        
        return true;
      } else if (platform === 'win32') {
        console.log(chalk.yellow(`
⚠️  Automatic installation not available for Windows.
Please install Ollama manually:
1. Visit https://ollama.com/download
2. Download and run the Windows installer
3. Start Ollama from the system tray
        `));
        return false;
      } else {
        console.log(chalk.red(`❌ Unsupported platform: ${platform}`));
        return false;
      }
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to install Ollama:'), error.message);
      console.log(chalk.yellow(`
Please install Ollama manually:
1. Visit https://ollama.com/download
2. Follow the installation instructions for your platform
      `));
      return false;
    }
  }
  
  /**
   * Start Ollama service
   */
  async startOllamaService(): Promise<void> {
    console.log(chalk.blue('🚀 Starting Ollama service...'));
    
    const isRunning = await this.checkHealth();
    if (isRunning) {
      console.log(chalk.green('🔄 Ollama service is already running'));
      return;
    }
    
    // Try to start Ollama
    const platform = os.platform();
    
    if (platform === 'darwin') {
      // macOS - Ollama runs as a background service
      spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
      }).unref();
    } else if (platform === 'linux') {
      // Linux - try systemd first, then direct command
      try {
        await execAsync('systemctl --user start ollama');
      } catch {
        spawn('ollama', ['serve'], {
          detached: true,
          stdio: 'ignore'
        }).unref();
      }
    }
    
    // Wait for service to start
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await this.checkHealth()) {
        console.log(chalk.green('🔄 Ollama service started successfully'));
        return;
      }
      attempts++;
    }
    
    throw new Error('Failed to start Ollama service');
  }
  
  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    const response = await this.request('GET', '/api/tags');
    const data = JSON.parse(response);
    return data.models || [];
  }
  
  /**
   * Pull a model with progress
   */
  async pullModel(model: string): Promise<AsyncGenerator<OllamaPullProgress>> {
    const fullModelName = this.ensureModelTag(model);
    console.log(chalk.blue(`📥 Pulling model: ${fullModelName}`));
    
    return this.streamRequest('POST', '/api/pull', { name: fullModelName });
  }
  
  /**
   * Ensure model has a tag (default to latest)
   */
  private ensureModelTag(model: string): string {
    // Special handling for DeepSeek R1
    if (model.toLowerCase().includes('deepseek') && model.toLowerCase().includes('r1')) {
      if (!model.includes(':')) {
        // Default to 32B model
        return 'deepseek-r1:32b';
      }
    }
    
    // For other models, default to latest
    if (!model.includes(':')) {
      return `${model}:latest`;
    }
    
    return model;
  }
  
  /**
   * Generate completion
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    request.model = this.ensureModelTag(request.model);
    const response = await this.request('POST', '/api/generate', request);
    return JSON.parse(response);
  }
  
  /**
   * Generate streaming completion
   */
  async *generateStream(request: OllamaGenerateRequest): AsyncGenerator<OllamaGenerateResponse> {
    request.model = this.ensureModelTag(request.model);
    request.stream = true;
    yield* this.streamRequest('POST', '/api/generate', request);
  }
  
  /**
   * Chat completion
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    request.model = this.ensureModelTag(request.model);
    const response = await this.request('POST', '/api/chat', request);
    return JSON.parse(response);
  }
  
  /**
   * Chat streaming completion
   */
  async *chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse> {
    request.model = this.ensureModelTag(request.model);
    request.stream = true;
    yield* this.streamRequest('POST', '/api/chat', request);
  }
  
  /**
   * Check if model exists locally
   */
  async hasModel(model: string): Promise<boolean> {
    const fullModelName = this.ensureModelTag(model);
    const models = await this.listModels();
    return models.some(m => m.name === fullModelName);
  }
  
  /**
   * Auto-download model if not present
   */
  async ensureModel(model: string): Promise<void> {
    const fullModelName = this.ensureModelTag(model);
    
    if (await this.hasModel(fullModelName)) {
      console.log(chalk.green(`🔄 Model ${fullModelName} is available`));
      return;
    }
    
    console.log(chalk.yellow(`⚠️  Model ${fullModelName} not found. Downloading...`));
    console.log(chalk.gray('This may take a while depending on model size and internet speed.'));
    
    const startTime = Date.now();
    let lastProgress = '';
    
    try {
      for await (const progress of this.pullModel(fullModelName)) {
        if (progress.status !== lastProgress) {
          process.stdout.write(`\r${progress.status}`);
          lastProgress = progress.status;
        }
        
        if (progress.success && progress.total) {
          const percent = Math.round((progress.success / progress.total) * 100);
          process.stdout.write(`\r📥 Downloading: ${percent}% (${this.formatSize(progress.success)}/${this.formatSize(progress.total)})`);
        }
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(chalk.green(`\n🔄 Model ${fullModelName} downloaded successfully in ${duration}s`));
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Failed to download model:`), error.message);
      throw error;
    }
  }
  
  /**
   * Format bytes to human readable
   */
  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Make HTTP request
   */
  private request(method: string, path: string, body?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.timeout
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
      },
      timeout: 0 // No timeout for streaming
    };
    
    const proto = url.protocol === 'https:' ? https : http;
    
    yield* new Promise<AsyncGenerator<any>>((resolve, reject) => {
      const req = proto.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve((async function* () {
            let buffer = '';
            
            for await (const chunk of res) {
              buffer += chunk.toString();
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.trim()) {
                  try {
                    yield JSON.parse(line);
                  } catch (e) {
                    console.error('Failed to parse:', line);
                  }
                }
              }
            }
            
            if (buffer.trim()) {
              try {
                yield JSON.parse(buffer);
              } catch (e) {
                console.error('Failed to parse final buffer:', buffer);
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
  }
}

// Singleton instance for convenience
export const ollamaClient = new OllamaClient();