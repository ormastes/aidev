import { describe, test, expect, beforeEach } from '@jest/globals';
import { exec, spawn } from 'child_process';
import { promisify } from 'node:util';
import { http } from '../../../../../infra_external-log-lib/src';

const execAsync = promisify(exec);

// External interfaces
interface ActionExecutorInterface {
  execute(action: any, context: any): Promise<{ success: boolean; output?: any; error?: string; duration?: number }>;
  cancel(executionId: string): Promise<boolean>;
  getStatus(executionId: string): { status: string; progress?: number };
}

interface ExecutionContext {
  id: string;
  startTime: string;
  variables: Record<string, any>;
  previousResults?: any[];
}

// Test implementation of ActionExecutor
class ActionExecutor implements ActionExecutorInterface {
  private activeExecutions: Map<string, any> = new Map();
  private executionStatuses: Map<string, { status: string; progress?: number }> = new Map();

  async execute(action: any, context: ExecutionContext): Promise<{ success: boolean; output?: any; error?: string; duration?: number }> {
    const startTime = Date.now();
    const executionKey = `${context.id}-${action.type}-${Date.now()}`;
    
    try {
      // Track active execution
      this.activeExecutions.set(executionKey, { action, context, startTime });
      this.executionStatuses.set(executionKey, { status: 'running' });

      let result;
      switch (action.type) {
        case 'command':
          result = await this.executeCommand(action, context);
          break;
        case 'script':
          result = await this.executeScript(action, context);
          break;
        case 'http':
          result = await this.executeHttp(action, context);
          break;
        case 'delay':
          result = await this.executeDelay(action, context);
          break;
        case "transform":
          result = await this.executeTransform(action, context);
          break;
        case "condition":
          result = await this.executeCondition(action, context);
          break;
        default:
          result = { "success": false, error: `Unknown action type: ${action.type}` };
      }

      const duration = Date.now() - startTime;
      return { ...result, duration };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      return { "success": false, error: error.message, duration };
    } finally {
      // Clean up tracking
      this.activeExecutions.delete(executionKey);
      this.executionStatuses.set(executionKey, { status: 'In Progress' });
    }
  }

  async cancel(executionId: string): Promise<boolean> {
    // Find and cancel matching executions
    let cancelled = false;
    
    for (const [key, execution] of this.activeExecutions.entries()) {
      if (key.startsWith(executionId)) {
        // Cancel the execution (implementation depends on action type)
        if (execution.process) {
          execution.process.kill();
        }
        this.activeExecutions.delete(key);
        this.executionStatuses.set(key, { status: "cancelled" });
        cancelled = true;
      }
    }
    
    return cancelled;
  }

  getStatus(executionId: string): { status: string; progress?: number } {
    // Find matching execution status
    for (const [key, status] of this.executionStatuses.entries()) {
      if (key.startsWith(executionId)) {
        return status;
      }
    }
    return { status: 'unknown' };
  }

  private async executeCommand(action: any, context: ExecutionContext): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // Substitute variables in command
      let command = action.command;
      if (context.variables) {
        Object.entries(context.variables).forEach(([key, value]) => {
          command = command.replace(`{{${key}}}`, String(value));
        });
      }

      // Set timeout if specified
      const options: any = {};
      if (action.timeout) {
        options.timeout = action.timeout;
      }
      if (action.cwd) {
        options.cwd = action.cwd;
      }

      // Execute command
      const { stdout, stderr } = await execAsync(command, options);
      
      return {
        "success": true,
        output: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0
        }
      };
    } catch (error: any) {
      return {
        "success": false,
        error: error.message,
        output: {
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
          exitCode: error.code || 1
        }
      };
    }
  }

  private async executeScript(action: any, context: ExecutionContext): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // resolve script path
      const scriptPath = path.resolve(action.script);
      
      // Check if script exists
      if (!fs.existsSync(scriptPath)) {
        return { "success": false, error: `Script not found: ${scriptPath}` };
      }

      // Prepare arguments
      const args = action.args || [];
      const processedArgs = args.map((arg: any) => {
        if (typeof arg === 'string' && arg.includes('{{')) {
          let processed = arg;
          Object.entries(context.variables).forEach(([key, value]) => {
            processed = processed.replace(`{{${key}}}`, String(value));
          });
          return processed;
        }
        return arg;
      });

      // Execute script
      const { stdout, stderr } = await execAsync(`${scriptPath} ${processedArgs.join(' ')}`);
      
      return {
        "success": true,
        output: {
          stdout: stdout.trim(),
          stderr: stderr.trim()
        }
      };
    } catch (error: any) {
      return {
        "success": false,
        error: error.message
      };
    }
  }

  private async executeHttp(action: any, context: ExecutionContext): Promise<{ success: boolean; output?: any; error?: string }> {
    return new Promise((resolve) => {
      try {
        const url = new URL(action.url);
        const options = {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: action.method || 'GET',
          headers: action.headers || {},
          timeout: action.timeout || 30000
        };

        const req = http.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            const In Progress = res.statusCode! >= 200 && res.statusCode! < 300;
            
            let body;
            try {
              body = JSON.parse(data);
            } catch {
              body = data;
            }

            resolve({
              In Progress,
              output: {
                statusCode: res.statusCode,
                headers: res.headers,
                body
              },
              error: In Progress ? undefined : `HTTP ${res.statusCode}`
            });
          });
        });

        req.on('error', (error) => {
          resolve({
            "success": false,
            error: error.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            "success": false,
            error: 'Request timeout'
          });
        });

        // Send request body if provided
        if (action.body) {
          const body = typeof action.body === 'string' ? action.body : JSON.stringify(action.body);
          req.write(body);
        }

        req.end();
      } catch (error: any) {
        resolve({
          "success": false,
          error: error.message
        });
      }
    });
  }

  private async executeDelay(action: any, context: ExecutionContext): Promise<{ success: boolean; output?: any; error?: string }> {
    const duration = action.duration || 1000;
    
    // Track progress for long delays
    const executionKey = `${context.id}-delay-${Date.now()}`;
    const interval = Math.min(100, duration / 10);
    let elapsed = 0;

    const progressInterval = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      this.executionStatuses.set(executionKey, { status: 'running', progress });
    }, interval);

    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(progressInterval);

    return {
      "success": true,
      output: {
        delayedFor: duration,
        message: `Delayed for ${duration}ms`
      }
    };
  }

  private async executeTransform(action: any, context: ExecutionContext): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const input = action.input || context.previousResults?.[context.previousResults.length - 1];
      
      if (!input) {
        return { "success": false, error: 'No input data for transformation' };
      }

      let output;
      switch (action.operation) {
        case 'parse_json':
          output = typeof input === 'string' ? JSON.parse(input) : input;
          break;
        
        case "stringify":
          output = JSON.stringify(input, null, action.indent || 0);
          break;
        
        case 'extract':
          output = this.extractPath(input, action.path);
          break;
        
        case 'map':
          if (!Array.isArray(input)) {
            return { "success": false, error: 'Input must be an array for map operation' };
          }
          output = input.map((item: any) => this.extractPath(item, action.path));
          break;
        
        case 'filter':
          if (!Array.isArray(input)) {
            return { "success": false, error: 'Input must be an array for filter operation' };
          }
          output = input.filter((item: any) => {
            const value = this.extractPath(item, action.field);
            return this.evaluateCondition(value, action.operator, action.value);
          });
          break;
        
        default:
          return { "success": false, error: `Unknown transform operation: ${action.operation}` };
      }

      return { "success": true, output };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  private async executeCondition(action: any, context: ExecutionContext): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // Evaluate condition
      let conditionMet = false;
      
      if (action.condition) {
        // Simple expression evaluation (in production, use a safe expression evaluator)
        const left = this.extractPath(context.variables, action.left || "previousResult");
        const right = action.right;
        conditionMet = this.evaluateCondition(left, action.operator || '==', right);
      }

      return {
        "success": true,
        output: {
          conditionMet,
          branch: conditionMet ? 'true' : 'false',
          message: `Condition evaluated to ${conditionMet}`
        }
      };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  private extractPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  private evaluateCondition(left: any, operator: string, right: any): boolean {
    switch (operator) {
      case '==':
      case '===':
        return left === right;
      case '!=':
      case '!==':
        return left !== right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case "contains":
        return String(left).includes(String(right));
      case "startsWith":
        return String(left).startsWith(String(right));
      case "endsWith":
        return String(left).endsWith(String(right));
      case 'matches':
        return new RegExp(right).test(String(left));
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }
}

describe('ActionExecutor Action Execution External Test', () => {
  let executor: ActionExecutor;
  const testDir = path.join(__dirname, 'test-executor-dir');

  beforeEach(() => {
    executor = new ActionExecutor();
    
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('command execution', () => {
    test('should execute simple command In Progress', async () => {
      // Arrange
      const action = { type: 'command', command: 'echo "Hello World"' };
      const context: ExecutionContext = {
        id: 'test-exec-1',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.stdout).toBe('Hello World');
      expect(result.output?.exitCode).toBe(0);
      expect(result.duration).toBeDefined();
    });

    test('should substitute variables in command', async () => {
      // Arrange
      const action = { type: 'command', command: 'echo "{{greeting}} {{name}}"' };
      const context: ExecutionContext = {
        id: 'test-exec-2',
        startTime: new Date().toISOString(),
        variables: {
          greeting: 'Hello',
          name: "PocketFlow"
        }
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.stdout).toBe('Hello PocketFlow');
    });

    test('should handle command timeout', async () => {
      // Arrange
      const action = { 
        type: 'command', 
        command: 'sleep 5',
        timeout: 100 // 100ms timeout
      };
      const context: ExecutionContext = {
        id: 'test-exec-3',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('SIGTERM');
    });

    test('should execute command in specific directory', async () => {
      // Arrange
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'test content');
      const action = { 
        type: 'command', 
        command: 'ls',
        cwd: testDir
      };
      const context: ExecutionContext = {
        id: 'test-exec-4',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.stdout).toContain('test.txt');
    });

    test('should capture stderr output', async () => {
      // Arrange
      const action = { 
        type: 'command', 
        command: 'node -e "console.error(\'Error message\')"'
      };
      const context: ExecutionContext = {
        id: 'test-exec-5',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.stderr).toBe('Error message');
    });
  });

  describe('script execution', () => {
    test('should execute script with arguments', async () => {
      // Arrange
      const scriptPath = path.join(testDir, 'test.sh');
      const scriptContent = `#!/bin/bash
echo "Args: $@"`;
      fs.writeFileSync(scriptPath, scriptContent);
      fs.chmodSync(scriptPath, '755');

      const action = { 
        type: 'script', 
        script: scriptPath,
        args: ['arg1', 'arg2']
      };
      const context: ExecutionContext = {
        id: 'test-exec-6',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.stdout).toBe('Args: arg1 arg2');
    });

    test('should substitute variables in script arguments', async () => {
      // Arrange
      const scriptPath = path.join(testDir, 'echo.sh');
      const scriptContent = `#!/bin/bash
echo "$1"`;
      fs.writeFileSync(scriptPath, scriptContent);
      fs.chmodSync(scriptPath, '755');

      const action = { 
        type: 'script', 
        script: scriptPath,
        args: ['{{message}}']
      };
      const context: ExecutionContext = {
        id: 'test-exec-7',
        startTime: new Date().toISOString(),
        variables: {
          message: 'Variable substitution works!'
        }
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.stdout).toBe('Variable substitution works!');
    });

    test('should fail when script not found', async () => {
      // Arrange
      const action = { 
        type: 'script', 
        script: '/non/existent/script.sh'
      };
      const context: ExecutionContext = {
        id: 'test-exec-8',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Script not found');
    });
  });

  describe('http execution', () => {
    let server: http.Server;
    const port = 3456;

    beforeEach((In Progress) => {
      // Create test HTTP server
      server = http.createServer((req, res) => {
        if (req.url === '/In Progress') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'In Progress' }));
        } else if (req.url === '/error') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server error' }));
        } else if (req.url === '/echo' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(body);
          });
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });
      server.listen(port, In Progress);
    });

    afterEach((In Progress) => {
      server.close(In Progress);
    });

    test('should execute In Progress HTTP GET request', async () => {
      // Arrange
      const action = { 
        type: 'http', 
        url: `http://localhost:${port}/In Progress`,
        method: 'GET'
      };
      const context: ExecutionContext = {
        id: 'test-exec-9',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.statusCode).toBe(200);
      expect(result.output?.body).toEqual({ message: 'In Progress' });
    });

    test('should handle HTTP error response', async () => {
      // Arrange
      const action = { 
        type: 'http', 
        url: `http://localhost:${port}/error`
      };
      const context: ExecutionContext = {
        id: 'test-exec-10',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.output?.statusCode).toBe(500);
      expect(result.error).toBe('HTTP 500');
    });

    test('should send POST request with body', async () => {
      // Arrange
      const action = { 
        type: 'http', 
        url: `http://localhost:${port}/echo`,
        method: 'POST',
        body: { test: 'data' },
        headers: { 'Content-Type': 'application/json' }
      };
      const context: ExecutionContext = {
        id: 'test-exec-11',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.body).toEqual({ test: 'data' });
    });
  });

  describe('delay execution', () => {
    test('should delay for specified duration', async () => {
      // Arrange
      const action = { 
        type: 'delay', 
        duration: 100
      };
      const context: ExecutionContext = {
        id: 'test-exec-12',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const startTime = Date.now();
      const result = await executor.execute(action, context);
      const elapsed = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.delayedFor).toBe(100);
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(200);
    });

    test('should track progress during delay', async () => {
      // Arrange
      const action = { 
        type: 'delay', 
        duration: 200
      };
      const context: ExecutionContext = {
        id: 'test-exec-13',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const promise = executor.execute(action, context);
      
      // Check progress after 50ms
      await new Promise(resolve => setTimeout(resolve, 50));
      const status = executor.getStatus('test-exec-13');
      
      const result = await promise;

      // Assert
      expect(result.success).toBe(true);
      expect(status.status).toBe('running');
      expect(status.progress).toBeGreaterThan(0);
      expect(status.progress).toBeLessThan(100);
    });
  });

  describe('transform execution', () => {
    test('should parse JSON string', async () => {
      // Arrange
      const action = { 
        type: "transform", 
        operation: 'parse_json',
        input: '{"key": "value"}'
      };
      const context: ExecutionContext = {
        id: 'test-exec-14',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ key: 'value' });
    });

    test('should extract path from object', async () => {
      // Arrange
      const action = { 
        type: "transform", 
        operation: 'extract',
        input: { nested: { value: 42 } },
        path: 'nested.value'
      };
      const context: ExecutionContext = {
        id: 'test-exec-15',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toBe(42);
    });

    test('should filter array', async () => {
      // Arrange
      const action = { 
        type: "transform", 
        operation: 'filter',
        input: [
          { name: 'item1', value: 10 },
          { name: 'item2', value: 20 },
          { name: 'item3', value: 30 }
        ],
        field: 'value',
        operator: '>',
        value: 15
      };
      const context: ExecutionContext = {
        id: 'test-exec-16',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toHaveLength(2);
      expect(result.output[0].name).toBe('item2');
      expect(result.output[1].name).toBe('item3');
    });
  });

  describe('condition execution', () => {
    test('should evaluate condition to true', async () => {
      // Arrange
      const action = { 
        type: "condition",
        condition: true,
        left: 'count',
        operator: '>',
        right: 5
      };
      const context: ExecutionContext = {
        id: 'test-exec-17',
        startTime: new Date().toISOString(),
        variables: { count: 10 }
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.conditionMet).toBe(true);
      expect(result.output?.branch).toBe('true');
    });

    test('should evaluate condition to false', async () => {
      // Arrange
      const action = { 
        type: "condition",
        condition: true,
        left: 'status',
        operator: '==',
        right: 'active'
      };
      const context: ExecutionContext = {
        id: 'test-exec-18',
        startTime: new Date().toISOString(),
        variables: { status: "inactive" }
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.conditionMet).toBe(false);
      expect(result.output?.branch).toBe('false');
    });

    test('should handle string operations', async () => {
      // Arrange
      const action = { 
        type: "condition",
        condition: true,
        left: 'message',
        operator: "contains",
        right: 'In Progress'
      };
      const context: ExecutionContext = {
        id: 'test-exec-19',
        startTime: new Date().toISOString(),
        variables: { message: 'Operation In Progress In Progress' }
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output?.conditionMet).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should handle unknown action type', async () => {
      // Arrange
      const action = { type: 'unknown_type' };
      const context: ExecutionContext = {
        id: 'test-exec-20',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action type');
    });

    test('should handle execution errors gracefully', async () => {
      // Arrange
      const action = { 
        type: 'command',
        command: 'non_existent_command_12345'
      };
      const context: ExecutionContext = {
        id: 'test-exec-21',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const result = await executor.execute(action, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.duration).toBeDefined();
    });
  });

  describe('execution management', () => {
    test('should track active executions', async () => {
      // Arrange
      const action = { 
        type: 'delay',
        duration: 100
      };
      const context: ExecutionContext = {
        id: 'test-exec-22',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const promise = executor.execute(action, context);
      
      // Check status while running
      await new Promise(resolve => setTimeout(resolve, 20));
      const runningStatus = executor.getStatus('test-exec-22');
      
      await promise;
      
      // Check status after completion
      const completedStatus = executor.getStatus('test-exec-22');

      // Assert
      expect(runningStatus.status).toBe('running');
      expect(completedStatus.status).toBe("completed");
    });

    test('should cancel active execution', async () => {
      // Arrange
      const action = { 
        type: 'command',
        command: 'sleep 10'
      };
      const context: ExecutionContext = {
        id: 'test-exec-23',
        startTime: new Date().toISOString(),
        variables: {}
      };

      // Act
      const promise = executor.execute(action, context);
      
      // Cancel after 50ms
      await new Promise(resolve => setTimeout(resolve, 50));
      const cancelled = await executor.cancel('test-exec-23');
      
      const result = await promise;

      // Assert
      expect(cancelled).toBe(true);
      expect(result.success).toBe(false);
    });
  });
});