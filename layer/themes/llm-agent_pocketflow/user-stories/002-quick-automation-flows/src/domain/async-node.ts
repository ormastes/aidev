import { BaseNode } from './base-node.js';
import { Node } from './node.js';
import { Flow, SequentialFlow, ParallelFlow } from './flow.js';

export abstract class AsyncNode extends BaseNode {
  protected maxRetries: number;
  protected wait: number;

  constructor(maxRetries: number = 3, wait: number = 1000) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
  }

  async prep(): Promise<void> {
    // Default async implementation
  }

  abstract _exec(): Promise<any>;

  async execFallback(): Promise<any> {
    throw new Error('All async retry attempts failed');
  }

  async post(result: any): Promise<void> {
    // Default async implementation
  }

  async exec(): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this._exec();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          try {
            return await this.execFallback();
          } catch (fallbackError) {
            throw lastError;
          }
        }
        
        if (this.wait > 0) {
          await new Promise(resolve => setTimeout(resolve, this.wait));
        }
      }
    }
    
    throw lastError;
  }
}

export class AsyncFlow extends Flow {
  constructor() {
    super();
  }

  async _orch(): Promise<any> {
    if (!this.startNode) {
      throw new Error('AsyncFlow must have a start node');
    }

    let currentNode: BaseNode | null = this.startNode;
    let result: any = null;

    while (currentNode) {
      result = await currentNode.execute();
      currentNode = await currentNode.getNextNode(result);
    }

    return result;
  }
}

export class AsyncParallelBatchNode extends AsyncNode {
  private batchSize: number;
  private items: any[];
  private processor: (item: any) => Promise<any>;

  constructor(
    items: any[],
    processor: (item: any) => Promise<any>,
    batchSize: number = 5,
    maxRetries: number = 3,
    wait: number = 1000
  ) {
    super(maxRetries, wait);
    this.items = items;
    this.processor = processor;
    this.batchSize = batchSize;
  }

  async _exec(): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < this.items.length; i += this.batchSize) {
      const batch = this.items.slice(i, i + this.batchSize);
      const batchPromises = batch.map(item => this.processor(item));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  async execFallback(): Promise<any[]> {
    // Sequential processing as fallback
    const results: any[] = [];
    
    for (const item of this.items) {
      try {
        const result = await this.processor(item);
        results.push(result);
      } catch (error) {
        results.push({ error: error.message, item });
      }
    }
    
    return results;
  }
}

export class AsyncParallelBatchFlow extends AsyncFlow {
  private batchNodes: BaseNode[];
  private batchSize: number;

  constructor(nodes: BaseNode[], batchSize: number = 3) {
    super();
    this.batchNodes = nodes;
    this.batchSize = batchSize;
    
    nodes.forEach(node => this.addNode(node));
  }

  async _orch(): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < this.batchNodes.length; i += this.batchSize) {
      const batch = this.batchNodes.slice(i, i + this.batchSize);
      const batchPromises = batch.map(node => node.execute());
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Concrete async node implementations
export class AsyncCommandNode extends AsyncNode {
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
    return `Async command failed: ${this.command}`;
  }
}

export class AsyncHttpNode extends AsyncNode {
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
    return { error: `Async HTTP request failed: ${this.url}` };
  }
}

export class AsyncDelayNode extends AsyncNode {
  private duration: number;

  constructor(duration: number) {
    super(1, 0); // No retries needed for delay
    this.duration = duration;
  }

  async _exec(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.duration));
  }
}