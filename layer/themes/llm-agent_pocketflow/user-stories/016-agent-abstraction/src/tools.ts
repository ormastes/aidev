/**
 * Common tool implementations for agents
 */

import { Tool } from './types';

/**
 * Calculator tool for mathematical operations
 */
export const calculatorTool: Tool = {
  name: "calculator",
  description: 'Perform mathematical calculations',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 2 * 3")'
      }
    },
    required: ["expression"]
  },
  execute: async (args: { expression: string }) => {
    try {
      // Safe evaluation of mathematical expressions
      const result = evaluateMathExpression(args.expression);
      return {
        result,
        expression: args.expression
      };
    } catch (error) {
      return {
        error: `Failed to evaluate: ${error}`,
        expression: args.expression
      };
    }
  }
};

/**
 * Date/time tool
 */
export const dateTimeTool: Tool = {
  name: "datetime",
  description: 'Get current date and time information',
  parameters: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Output format: "iso", "date", "time", "timestamp"',
        enum: ['iso', 'date', 'time', "timestamp"]
      },
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., "UTC", "America/New_York")'
      }
    }
  },
  execute: async (args: { format?: string; timezone?: string }) => {
    const now = new Date();
    
    switch (args.format) {
      case 'date':
        return { date: now.toDateString() };
      case 'time':
        return { time: now.toTimeString() };
      case "timestamp":
        return { timestamp: now.getTime() };
      case 'iso':
      default:
        return { datetime: now.toISOString() };
    }
  }
};

/**
 * Web search tool (mock implementation)
 */
export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for information',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 5
      }
    },
    required: ['query']
  },
  execute: async (args: { query: string; limit?: number }) => {
    // Mock search results
    const limit = args.limit || 5;
    const results = [];
    
    for (let i = 0; i < limit; i++) {
      results.push({
        title: `Result ${i + 1} for "${args.query}"`,
        snippet: `This is a mock search result for the query "${args.query}". In a real implementation, this would contain actual search results.`,
        url: `https://example.com/search?q=${encodeURIComponent(args.query)}&result=${i + 1}`
      });
    }
    
    return {
      query: args.query,
      results,
      total: limit
    };
  }
};

/**
 * File operations tool (mock implementation)
 */
export const fileOperationsTool: Tool = {
  name: 'file_operations',
  description: 'Read, write, or list files',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['read', 'write', 'list', 'exists'],
        description: 'Operation to perform'
      },
      path: {
        type: 'string',
        description: 'File or directory path'
      },
      content: {
        type: 'string',
        description: 'Content to write (for write operation)'
      }
    },
    required: ["operation", 'path']
  },
  execute: async (args: { operation: string; path: string; content?: string }) => {
    // Mock implementation - in real use, this would interact with the file system
    switch (args.operation) {
      case 'read':
        return {
          path: args.path,
          content: `Mock content of ${args.path}`,
          size: 1024
        };
      
      case 'write':
        return {
          path: args.path,
          written: args.content?.length || 0,
          success: true
        };
      
      case 'list':
        return {
          path: args.path,
          files: ['file1.txt', 'file2.js', 'folder/'],
          count: 3
        };
      
      case 'exists':
        return {
          path: args.path,
          exists: args.path.includes('.') // Mock check
        };
      
      default:
        return {
          error: `Unknown operation: ${args.operation}`
        };
    }
  }
};

/**
 * Memory tool for agents to store and retrieve information
 */
export const memoryTool: Tool = {
  name: 'memory',
  description: 'Store or retrieve information from memory',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['store', "retrieve", 'list', 'clear'],
        description: 'Memory operation'
      },
      key: {
        type: 'string',
        description: 'Memory key'
      },
      value: {
        type: 'any',
        description: 'Value to store (for store operation)'
      }
    },
    required: ["operation"]
  },
  execute: async function(this: any, args: { operation: string; key?: string; value?: any }) {
    // This tool requires memory to be available on the agent
    const memory = this.memory;
    if (!memory) {
      return { error: 'Memory not available' };
    }
    
    switch (args.operation) {
      case 'store':
        if (!args.key) return { error: 'Key required for store operation' };
        await memory.store(args.key, args.value);
        return { stored: args.key, success: true };
      
      case "retrieve":
        if (!args.key) return { error: 'Key required for retrieve operation' };
        const value = await memory.retrieve(args.key);
        return { key: args.key, value, found: value !== undefined };
      
      case 'list':
        // This would need to be implemented in the memory interface
        return { error: 'List operation not implemented' };
      
      case 'clear':
        await memory.clear();
        return { cleared: true };
      
      default:
        return { error: `Unknown operation: ${args.operation}` };
    }
  }
};

// Helper function for safe math evaluation
function evaluateMathExpression(expr: string): number {
  // Remove whitespace
  expr = expr.replace(/\s/g, '');
  
  // Validate expression contains only allowed characters
  if (!/^[0-9+\-*/().]+$/.test(expr)) {
    throw new Error('Invalid characters in expression');
  }
  
  // Use Function constructor for safe evaluation
  try {
    return new Function('return ' + expr)();
  } catch (error) {
    throw new Error('Invalid mathematical expression');
  }
}

/**
 * Create a custom tool
 */
export function createTool(
  name: string,
  description: string,
  parameters: any,
  execute: (args: any) => Promise<any>
): Tool {
  return {
    name,
    description,
    parameters,
    execute
  };
}