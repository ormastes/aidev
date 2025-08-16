/**
 * Tool Manager
 * Manages tools and function calling for Claude
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface Tool extends ToolDefinition {
  id: string;
  executor: ToolExecutor;
  metadata?: {
    category?: string;
    version?: string;
    author?: string;
    rateLimit?: number;
    timeout?: number;
  };
}

export type ToolExecutor = (input: any) => Promise<ToolResult>;

export interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: {
    duration?: number;
    retries?: number;
  };
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  enum?: any[];
}

export interface ToolRegistry {
  tools: Map<string, Tool>;
  categories: Map<string, string[]>;
}

export class ToolManager extends EventEmitter {
  private tools: Map<string, Tool>;
  private categories: Map<string, Set<string>>;
  private executions: Map<string, ToolExecution[]>;
  private rateLimiters: Map<string, RateLimiter>;

  constructor() {
    super();
    this.tools = new Map();
    this.categories = new Map();
    this.executions = new Map();
    this.rateLimiters = new Map();
    
    this.registerBuiltinTools();
  }

  registerTool(config: Omit<Tool, 'id'>): Tool {
    const tool: Tool = {
      ...config,
      id: this.generateToolId(config.name),
    };

    this.tools.set(tool.name, tool);
    
    // Add to category
    if (tool.metadata?.category) {
      if (!this.categories.has(tool.metadata.category)) {
        this.categories.set(tool.metadata.category, new Set());
      }
      this.categories.get(tool.metadata.category)!.add(tool.name);
    }

    // Setup rate limiter if needed
    if (tool.metadata?.rateLimit) {
      this.rateLimiters.set(
        tool.name,
        new RateLimiter(tool.metadata.rateLimit)
      );
    }

    this.emit('toolRegistered', tool);
    return tool;
  }

  unregisterTool(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) return false;

    this.tools.delete(name);
    
    // Remove from category
    if (tool.metadata?.category) {
      const category = this.categories.get(tool.metadata.category);
      if (category) {
        category.delete(name);
        if (category.size === 0) {
          this.categories.delete(tool.metadata.category);
        }
      }
    }

    // Clean up rate limiter
    this.rateLimiters.delete(name);

    this.emit('toolUnregistered', tool);
    return true;
  }

  async executeTool(name: string, input: any): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${name} not found`,
      };
    }

    // Check rate limit
    const rateLimiter = this.rateLimiters.get(name);
    if (rateLimiter && !rateLimiter.tryAcquire()) {
      return {
        success: false,
        error: `Rate limit exceeded for tool ${name}`,
      };
    }

    // Validate input
    const validation = this.validateInput(tool, input);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid input: ${validation.error}`,
      };
    }

    // Record execution
    const execution: ToolExecution = {
      toolName: name,
      input,
      startTime: new Date(),
    };

    if (!this.executions.has(name)) {
      this.executions.set(name, []);
    }
    this.executions.get(name)!.push(execution);

    this.emit('toolExecutionStarted', { tool, input });

    try {
      // Apply timeout if configured
      const timeout = tool.metadata?.timeout || 30000;
      const result = await this.executeWithTimeout(
        tool.executor(input),
        timeout
      );

      execution.endTime = new Date();
      execution.result = result;
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.emit('toolExecutionCompleted', { tool, input, result });
      return result;
    } catch (error: any) {
      execution.endTime = new Date();
      execution.error = error.message;
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      const result: ToolResult = {
        success: false,
        error: error.message,
      };

      this.emit('toolExecutionFailed', { tool, input, error });
      return result;
    }
  }

  private validateInput(tool: Tool, input: any): { valid: boolean; error?: string } {
    const schema = tool.input_schema;
    
    if (schema.type !== 'object') {
      return { valid: false, error: 'Schema type must be object' };
    }

    // Check required properties
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in input)) {
          return { valid: false, error: `Missing required property: ${required}` };
        }
      }
    }

    // Validate property types
    for (const [key, value] of Object.entries(input)) {
      if (!(key in schema.properties)) {
        continue; // Allow additional properties
      }

      const propSchema = schema.properties[key];
      if (!this.validatePropertyType(value, propSchema)) {
        return { 
          valid: false, 
          error: `Invalid type for property ${key}` 
        };
      }
    }

    return { valid: true };
  }

  private validatePropertyType(value: any, schema: any): boolean {
    if (schema.type === 'string') return typeof value === 'string';
    if (schema.type === 'number') return typeof value === 'number';
    if (schema.type === 'boolean') return typeof value === 'boolean';
    if (schema.type === 'object') return typeof value === 'object' && value !== null;
    if (schema.type === 'array') return Array.isArray(value);
    
    // Check enum values
    if (schema.enum && !schema.enum.includes(value)) {
      return false;
    }

    return true;
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  }

  private registerBuiltinTools(): void {
    // Calculator tool
    this.registerTool({
      name: 'calculator',
      description: 'Perform mathematical calculations',
      input_schema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate',
          },
        },
        required: ['expression'],
      },
      executor: async (input) => {
        try {
          // Simple eval - in production use math expression parser
          const result = eval(input.expression);
          return { success: true, output: result };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
      metadata: {
        category: 'math',
        version: '1.0.0',
      },
    });

    // Web search tool (mock)
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results',
          },
        },
        required: ['query'],
      },
      executor: async (input) => {
        // Mock implementation
        return {
          success: true,
          output: [
            {
              title: `Result for ${input.query}`,
              url: 'https://example.com',
              snippet: 'This is a mock search result',
            },
          ],
        };
      },
      metadata: {
        category: 'web',
        version: '1.0.0',
        rateLimit: 10, // 10 per minute
      },
    });

    // File reader tool
    this.registerTool({
      name: 'read_file',
      description: 'Read contents of a file',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path',
          },
        },
        required: ['path'],
      },
      executor: async (input) => {
        try {
          const fs = require('fs').promises;
          const content = await fs.readFile(input.path, 'utf8');
          return { success: true, output: content };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
      metadata: {
        category: 'file',
        version: '1.0.0',
      },
    });
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): Tool[] {
    const toolNames = this.categories.get(category);
    if (!toolNames) return [];
    
    return Array.from(toolNames)
      .map(name => this.tools.get(name))
      .filter(tool => tool !== undefined) as Tool[];
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.getTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  getExecutionHistory(toolName?: string): ToolExecution[] {
    if (toolName) {
      return this.executions.get(toolName) || [];
    }

    const allExecutions: ToolExecution[] = [];
    for (const executions of this.executions.values()) {
      allExecutions.push(...executions);
    }
    
    return allExecutions.sort((a, b) => 
      b.startTime.getTime() - a.startTime.getTime()
    );
  }

  getStats(): {
    totalTools: number;
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    toolUsage: Map<string, number>;
  } {
    let totalExecutions = 0;
    let successfulExecutions = 0;
    let totalDuration = 0;
    const toolUsage = new Map<string, number>();

    for (const [toolName, executions] of this.executions) {
      toolUsage.set(toolName, executions.length);
      totalExecutions += executions.length;
      
      for (const execution of executions) {
        if (execution.result?.success) {
          successfulExecutions++;
        }
        if (execution.duration) {
          totalDuration += execution.duration;
        }
      }
    }

    return {
      totalTools: this.tools.size,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      averageDuration: totalExecutions > 0 ? totalDuration / totalExecutions : 0,
      toolUsage,
    };
  }

  clearHistory(): void {
    this.executions.clear();
    this.emit('historyCleared');
  }

  private generateToolId(name: string): string {
    return `tool_${name}_${Date.now()}`;
  }
}

interface ToolExecution {
  toolName: string;
  input: any;
  result?: ToolResult;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

class RateLimiter {
  private maxPerMinute: number;
  private tokens: number;
  private lastRefill: number;

  constructor(maxPerMinute: number) {
    this.maxPerMinute = maxPerMinute;
    this.tokens = maxPerMinute;
    this.lastRefill = Date.now();
  }

  tryAcquire(): boolean {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refillAmount = (elapsed / 60000) * this.maxPerMinute;
    
    this.tokens = Math.min(this.maxPerMinute, this.tokens + refillAmount);
    this.lastRefill = now;
  }
}

export default ToolManager;