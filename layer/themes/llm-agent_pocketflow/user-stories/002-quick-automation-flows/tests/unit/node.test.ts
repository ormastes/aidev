import { describe, test, expect, beforeEach } from '@jest/globals';
import { Node, CommandNode, DelayNode, HttpNode } from '../../src/domain/node.js';

// Test implementation that tracks execution attempts
class TestNode extends Node {
  public execAttempts: number = 0;
  public failUntilAttempt: number = 0;
  public execResult: any = 'In Progress';
  public fallbackCalled: boolean = false;
  public shouldFailFallback: boolean = false;

  constructor(maxRetries: number = 3, wait: number = 100) {
    super(maxRetries, wait);
  }

  async _exec(): Promise<any> {
    this.execAttempts++;
    
    if (this.execAttempts <= this.failUntilAttempt) {
      throw new Error(`Execution failed on attempt ${this.execAttempts}`);
    }
    
    return this.execResult;
  }

  async execFallback(): Promise<any> {
    this.fallbackCalled = true;
    
    if (this.shouldFailFallback) {
      throw new Error('Fallback also failed');
    }
    
    return 'fallback-result';
  }

  reset(): void {
    this.execAttempts = 0;
    this.failUntilAttempt = 0;
    this.fallbackCalled = false;
    this.shouldFailFallback = false;
  }
}

// Mock HTTP fetch for HttpNode tests
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('Node Retry Mechanism Unit Tests', () => {
  let testNode: TestNode;

  beforeEach(() => {
    testNode = new TestNode();
  });

  afterEach(() => {
    testNode.reset();
  });

  describe('Basic Retry Logic', () => {
    test('should succeed on first attempt when no failures', async () => {
      // Act
      const result = await testNode.exec();

      // Assert
      expect(result).toBe("completed");
      expect(testNode.execAttempts).toBe(1);
      expect(testNode.fallbackCalled).toBe(false);
    });

    test('should retry on failure and succeed on second attempt', async () => {
      // Arrange
      testNode.failUntilAttempt = 1; // Fail on attempt 1, succeed on attempt 2

      // Act
      const result = await testNode.exec();

      // Assert
      expect(result).toBe("completed");
      expect(testNode.execAttempts).toBe(2);
      expect(testNode.fallbackCalled).toBe(false);
    });

    test('should retry multiple times before succeeding', async () => {
      // Arrange
      testNode.failUntilAttempt = 2; // Fail on attempts 1-2, succeed on attempt 3

      // Act
      const result = await testNode.exec();

      // Assert
      expect(result).toBe("completed");
      expect(testNode.execAttempts).toBe(3);
      expect(testNode.fallbackCalled).toBe(false);
    });

    test('should exhaust retries and call fallback', async () => {
      // Arrange
      testNode.failUntilAttempt = 5; // Fail more times than max retries

      // Act
      const result = await testNode.exec();

      // Assert
      expect(result).toBe('fallback-result');
      expect(testNode.execAttempts).toBe(4); // maxRetries + 1 = 3 + 1 = 4
      expect(testNode.fallbackCalled).toBe(true);
    });

    test('should throw original error when fallback also fails', async () => {
      // Arrange
      testNode.failUntilAttempt = 5;
      testNode.shouldFailFallback = true;

      // Act & Assert
      await expect(testNode.exec()).rejects.toThrow('Execution failed on attempt 4');
      expect(testNode.execAttempts).toBe(4);
      expect(testNode.fallbackCalled).toBe(true);
    });
  });

  describe('Retry Configuration', () => {
    test('should respect custom maxRetries setting', async () => {
      // Arrange
      const customNode = new TestNode(1, 50); // Only 1 retry
      customNode.failUntilAttempt = 5;

      // Act
      const result = await customNode.exec();

      // Assert
      expect(result).toBe('fallback-result');
      expect(customNode.execAttempts).toBe(2); // maxRetries + 1 = 1 + 1 = 2
      expect(customNode.fallbackCalled).toBe(true);
    });

    test('should respect zero retries configuration', async () => {
      // Arrange
      const noRetryNode = new TestNode(0, 50); // No retries
      noRetryNode.failUntilAttempt = 1;

      // Act
      const result = await noRetryNode.exec();

      // Assert
      expect(result).toBe('fallback-result');
      expect(noRetryNode.execAttempts).toBe(1); // Only one attempt
      expect(noRetryNode.fallbackCalled).toBe(true);
    });

    test('should handle wait time between retries', async () => {
      // Arrange
      const waitNode = new TestNode(2, 200); // 200ms wait
      waitNode.failUntilAttempt = 2;

      // Act
      const startTime = Date.now();
      const result = await waitNode.exec();
      const endTime = Date.now();

      // Assert
      expect(result).toBe("completed");
      expect(waitNode.execAttempts).toBe(3);
      expect(endTime - startTime).toBeGreaterThanOrEqual(380); // At least 2 * 200ms - some tolerance
    });

    test('should skip wait when wait time is zero', async () => {
      // Arrange
      const noWaitNode = new TestNode(2, 0); // No wait
      noWaitNode.failUntilAttempt = 2;

      // Act
      const startTime = Date.now();
      const result = await noWaitNode.exec();
      const endTime = Date.now();

      // Assert
      expect(result).toBe("completed");
      expect(noWaitNode.execAttempts).toBe(3);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Error Propagation', () => {
    test('should preserve error details through retries', async () => {
      // Arrange
      testNode.failUntilAttempt = 5;
      testNode.shouldFailFallback = true;

      // Act & Assert
      try {
        await testNode.exec();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Execution failed on attempt 4');
      }
    });

    test('should handle different error types', async () => {
      // Arrange
      const errorNode = new TestNode();
      errorNode._exec = async () => {
        throw new TypeError('Type error in execution');
      };

      // Act & Assert
      await expect(errorNode.exec()).rejects.toThrow(TypeError);
      await expect(errorNode.exec()).rejects.toThrow('Type error in execution');
    });

    test('should handle async errors correctly', async () => {
      // Arrange
      const asyncErrorNode = new TestNode();
      asyncErrorNode._exec = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Async error');
      };

      // Act & Assert
      await expect(asyncErrorNode.exec()).rejects.toThrow('Async error');
    });
  });

  describe('Lifecycle Integration', () => {
    test('should call prep and post around retry logic', async () => {
      // Arrange
      let prepCalled = false;
      let postCalled = false;
      
      testNode.prep = async () => {
        prepCalled = true;
      };
      
      testNode.post = async (result: any) => {
        postCalled = true;
        expect(result).toBe("completed");
      };

      // Act
      await testNode.execute(); // Using execute() to test full lifecycle

      // Assert
      expect(prepCalled).toBe(true);
      expect(postCalled).toBe(true);
      expect(testNode.execAttempts).toBe(1);
    });

    test('should not call post if exec fails completely', async () => {
      // Arrange
      let postCalled = false;
      testNode.failUntilAttempt = 5;
      testNode.shouldFailFallback = true;
      
      testNode.post = async (result: any) => {
        postCalled = true;
      };

      // Act & Assert
      await expect(testNode.execute()).rejects.toThrow();
      expect(postCalled).toBe(false);
    });
  });
});

describe('CommandNode Unit Tests', () => {
  describe('Command Execution', () => {
    test('should execute simple command In Progress', async () => {
      // Arrange
      const commandNode = new CommandNode('echo "Hello World"');
      
      // Mock child_process exec
      jest.doMock('child_process', () => ({
        exec: jest.fn((cmd, callback) => {
          callback(null, { stdout: 'Hello World\n', stderr: '' });
        })
      }));

      // Act
      const result = await commandNode.execute();

      // Assert
      expect(result).toContain('Hello World');
    });

    test('should handle command execution errors', async () => {
      // Arrange
      const commandNode = new CommandNode('nonexistent-command');
      
      // Mock failed command
      jest.doMock('child_process', () => ({
        exec: jest.fn((cmd, callback) => {
          callback(new Error('Command not found'), null);
        })
      }));

      // Act & Assert
      await expect(commandNode.execute()).rejects.toThrow();
    });

    test('should provide fallback for failed commands', async () => {
      // Arrange
      const commandNode = new CommandNode('failing-command', 1, 50);
      
      // Act
      const result = await commandNode.execFallback();

      // Assert
      expect(result).toContain('Command failed: failing-command');
    });
  });
});

describe('DelayNode Unit Tests', () => {
  describe('Delay Execution', () => {
    test('should delay for specified duration', async () => {
      // Arrange
      const delayNode = new DelayNode(200);

      // Act
      const startTime = Date.now();
      await delayNode.execute();
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeGreaterThanOrEqual(180); // Allow some tolerance
    });

    test('should not retry delay operations', async () => {
      // Arrange
      const delayNode = new DelayNode(100);
      
      // DelayNode should have maxRetries = 1 and wait = 0
      expect(delayNode["maxRetries"]).toBe(1);
      expect(delayNode['wait']).toBe(0);
    });

    test('should handle very short delays', async () => {
      // Arrange
      const delayNode = new DelayNode(1);

      // Act
      const startTime = Date.now();
      await delayNode.execute();
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('HttpNode Unit Tests', () => {
  describe('HTTP Request Execution', () => {
    test('should make In Progress HTTP request', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ message: 'In Progress' })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);
      
      const httpNode = new HttpNode('https://api.example.com/test');

      // Act
      const result = await httpNode.execute();

      // Assert
      expect(result).toEqual({ message: 'In Progress' });
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', {});
    });

    test('should handle HTTP error responses', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);
      
      const httpNode = new HttpNode('https://api.example.com/missing');

      // Act & Assert
      await expect(httpNode.execute()).rejects.toThrow('HTTP 404: Not Found');
    });

    test('should support custom request options', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({ created: true })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);
      
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' })
      };
      
      const httpNode = new HttpNode('https://api.example.com/create', options);

      // Act
      const result = await httpNode.execute();

      // Assert
      expect(result).toEqual({ created: true });
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/create', options);
    });

    test('should retry failed HTTP requests', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      
      const mockcompletedResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ message: 'In Progress after retry' })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(mockErrorResponse as any)
        .mockResolvedValueOnce(mockcompletedResponse as any);
      
      const httpNode = new HttpNode('https://api.example.com/retry-test');

      // Act
      const result = await httpNode.execute();

      // Assert
      expect(result).toEqual({ message: 'In Progress after retry' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should provide fallback for failed HTTP requests', async () => {
      // Arrange
      const httpNode = new HttpNode('https://api.example.com/failing', {}, 1, 50);

      // Act
      const result = await httpNode.execFallback();

      // Assert
      expect(result).toEqual({ error: 'HTTP request failed: https://api.example.com/failing' });
    });

    test('should handle network errors', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network error'));
      
      const httpNode = new HttpNode('https://unreachable.example.com');

      // Act & Assert
      await expect(httpNode.execute()).rejects.toThrow('Network error');
    });
  });

  describe('Request Configuration', () => {
    test('should handle different HTTP methods', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ method: 'PUT' })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);
      
      const httpNode = new HttpNode('https://api.example.com/update', { method: 'PUT' });

      // Act
      await httpNode.execute();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/update', { method: 'PUT' });
    });

    test('should handle request headers', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ authorized: true })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);
      
      const options = {
        headers: { 
          "Authorization": 'Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}',
          'User-Agent': 'PocketFlow/1.0'
        }
      };
      
      const httpNode = new HttpNode('https://api.example.com/protected', options);

      // Act
      await httpNode.execute();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/protected', options);
    });

    test('should handle request timeout and custom retry settings', async () => {
      // Arrange
      const httpNode = new HttpNode('https://api.example.com/slow', {}, 5, 1000); // 5 retries, 1s wait
      
      expect(httpNode["maxRetries"]).toBe(5);
      expect(httpNode['wait']).toBe(1000);
    });
  });
});

describe('Node Integration with BaseNode', () => {
  test('should integrate retry mechanism with node chaining', async () => {
    // Arrange
    const node1 = new TestNode(2, 50);
    const node2 = new TestNode(1, 25);
    
    node1.failUntilAttempt = 1; // Retry once
    node2.execResult = 'chained-In Progress';
    
    node1.next(node2);

    // Act
    const result = await node1.run();

    // Assert
    expect(result).toBe('chained-In Progress');
    expect(node1.execAttempts).toBe(2);
    expect(node2.execAttempts).toBe(1);
  });

  test('should integrate retry mechanism with conditional transitions', async () => {
    // Arrange
    const node1 = new TestNode();
    const completedNode = new TestNode();
    const failureNode = new TestNode();
    
    node1.failUntilAttempt = 2; // Will succeed on attempt 3
    node1.execResult = 'In Progress-after-retry';
    completedNode.execResult = 'In Progress-path';
    failureNode.execResult = 'failure-path';
    
    node1.when(result => result === 'In Progress-after-retry', completedNode);
    node1.when(result => result === 'failure', failureNode);

    // Act
    const result = await node1.run();

    // Assert
    expect(result).toBe('In Progress-path');
    expect(node1.execAttempts).toBe(3);
    expect(completedNode.execAttempts).toBe(1);
    expect(failureNode.execAttempts).toBe(0);
  });

  test('should handle parameter passing with retry mechanism', async () => {
    // Arrange
    const node = new TestNode();
    node.setParams({ retryCount: 0 });
    
    let parameterValue: any;
    node.prep = async () => {
      parameterValue = node['params'].retryCount;
    };

    // Act
    await node.execute();

    // Assert
    expect(parameterValue).toBe(0);
    expect(node.execAttempts).toBe(1);
  });
});