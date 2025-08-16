import { BaseNode } from './base-node';

export abstract class Node extends BaseNode {
  protected maxRetries: number;
  protected wait: number;

  constructor(maxRetries: number = 3, wait: number = 1000) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
  }

  async prep(): Promise<void> {
    // Default implementation - can be overridden
  }

  abstract _exec(): Promise<any> | any;

  async execFallback(): Promise<any> {
    throw new Error('All retry attempts failed');
  }

  async post(_result: any): Promise<void> {
    // Default implementation - can be overridden
  }

  async exec(): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this._exec();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          // Final attempt failed, try fallback
          try {
            return await this.execFallback();
          } catch (fallbackError) {
            throw lastError; // Throw original error if fallback also fails
          }
        }
        
        // Wait before retry
        if (this.wait > 0) {
          await new Promise(resolve => setTimeout(resolve, this.wait));
        }
      }
    }
    
    throw lastError;
  }
}

export class CommandNode extends Node {
  private command: string;

  constructor(command: string, maxRetries: number = 3, wait: number = 1000) {
    super(maxRetries, wait);
    this.command = command;
  }

  async _exec(): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const result = await execAsync(this.command);
    return result.stdout;
  }

  async execFallback(): Promise<string> {
    return `Command failed: ${this.command}`;
  }
}

export class DelayNode extends Node {
  private duration: number;

  constructor(duration: number) {
    super(1, 0); // No retries needed for delay
    this.duration = duration;
  }

  async _exec(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.duration));
  }
}

export class HttpNode extends Node {
  private url: string;
  private options: RequestInit;

  constructor(url: string, options: RequestInit = {}, maxRetries: number = 3, wait: number = 1000) {
    super(maxRetries, wait);
    this.url = url;
    this.options = options;
  }

  async _exec(): Promise<any> {
    const response = await fetch(this.url, this.options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async execFallback(): Promise<any> {
    return { error: `HTTP request failed: ${this.url}` };
  }
}