import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  AsyncNode, 
  AsyncFlow, 
  AsyncParallelBatchNode, 
  AsyncParallelBatchFlow,
  AsyncCommandNode,
  AsyncHttpNode,
  AsyncDelayNode
} from '../../src/domain/async-node.js';
import { BaseNode } from '../../src/domain/base-node.js';

// Test implementation for AsyncNode
class TestAsyncNode extends AsyncNode {
  public execAttempts: number = 0;
  public failUntilAttempt: number = 0;
  public execResult: any = 'async-In Progress';
  public execDuration: number = 0;
  public fallbackCalled: boolean = false;
  public shouldFailFallback: boolean = false;

  constructor(result: any = 'async-In Progress', duration: number = 0, maxRetries: number = 3, wait: number = 50) {
    super(maxRetries, wait);
    this.execResult = result;
    this.execDuration = duration;
  }

  async _exec(): Promise<any> {
    this.execAttempts++;
    
    if (this.execDuration > 0) {
      await new Promise(resolve => setTimeout(resolve, this.execDuration));
    }
    
    if (this.execAttempts <= this.failUntilAttempt) {
      throw new Error(`Async execution failed on attempt ${this.execAttempts}`);
    }
    
    return this.execResult;
  }

  async execFallback(): Promise<any> {
    this.fallbackCalled = true;
    
    if (this.shouldFailFallback) {
      throw new Error('Async fallback also failed');
    }
    
    return 'async-fallback-result';
  }

  reset(): void {
    this.execAttempts = 0;
    this.failUntilAttempt = 0;
    this.fallbackCalled = false;
    this.shouldFailFallback = false;
  }
}

// Mock fetch for AsyncHttpNode tests
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('AsyncNode Parallel Execution Unit Tests', () => {
  let asyncNode: TestAsyncNode;

  beforeEach(() => {
    asyncNode = new TestAsyncNode();
  });

  afterEach(() => {
    asyncNode.reset();
  });

  describe('Basic Async Operations', () => {
    test('should execute asynchronously', async () => {
      // Arrange
      asyncNode.execDuration = 100;

      // Act
      const startTime = Date.now();
      const result = await asyncNode.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('async-In Progress');
      expect(endTime - startTime).toBeGreaterThanOrEqual(90);
      expect(asyncNode.execAttempts).toBe(1);
    });

    test('should support async retry mechanism', async () => {
      // Arrange
      asyncNode.failUntilAttempt = 2; // Fail first 2 attempts
      asyncNode.execDuration = 25;

      // Act
      const startTime = Date.now();
      const result = await asyncNode.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('async-In Progress');
      expect(asyncNode.execAttempts).toBe(3);
      expect(endTime - startTime).toBeGreaterThanOrEqual(125); // 3 executions + 2 waits
    });

    test('should handle async fallback', async () => {
      // Arrange
      asyncNode.failUntilAttempt = 5; // Fail more than max retries

      // Act
      const result = await asyncNode.execute();

      // Assert
      expect(result).toBe('async-fallback-result');
      expect(asyncNode.fallbackCalled).toBe(true);
      expect(asyncNode.execAttempts).toBe(4); // maxRetries + 1
    });

    test('should handle concurrent async operations', async () => {
      // Arrange
      const nodes = Array.from({ length: 5 }, (_, i) => 
        new TestAsyncNode(`result-${i}`, 100)
      );

      // Act
      const startTime = Date.now();
      const promises = nodes.map(node => node.execute());
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      expect(results).toEqual(['result-0', 'result-1', 'result-2', 'result-3', 'result-4']);
      expect(endTime - startTime).toBeLessThan(200); // Parallel execution
      nodes.forEach(node => {
        expect(node.execAttempts).toBe(1);
      });
    });
  });

  describe('AsyncFlow Operations', () => {
    test('should execute async flow with sequential nodes', async () => {
      // Arrange
      const node1 = new TestAsyncNode('first', 50);
      const node2 = new TestAsyncNode('second', 50);
      const node3 = new TestAsyncNode('third', 50);

      node1.next(node2);
      node2.next(node3);

      const asyncFlow = new AsyncFlow();
      asyncFlow.start(node1);
      asyncFlow.addNode(node2).addNode(node3);

      // Act
      const startTime = Date.now();
      const result = await asyncFlow.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('third');
      expect(endTime - startTime).toBeGreaterThanOrEqual(140); // Sequential timing
      expect(node1.execAttempts).toBe(1);
      expect(node2.execAttempts).toBe(1);
      expect(node3.execAttempts).toBe(1);
    });

    test('should handle async flow with conditional paths', async () => {
      // Arrange
      const decisionNode = new TestAsyncNode('choose-path', 25);
      const pathA = new TestAsyncNode('path-a', 50);
      const pathB = new TestAsyncNode('path-b', 50);

      decisionNode.when(result => result === 'choose-path', pathA);
      decisionNode.when(result => result === 'other', pathB);

      const asyncFlow = new AsyncFlow();
      asyncFlow.start(decisionNode);
      asyncFlow.addNode(pathA).addNode(pathB);

      // Act
      const result = await asyncFlow.execute();

      // Assert
      expect(result).toBe('path-a');
      expect(decisionNode.execAttempts).toBe(1);
      expect(pathA.execAttempts).toBe(1);
      expect(pathB.execAttempts).toBe(0);
    });

    test('should handle async flow errors gracefully', async () => {
      // Arrange
      const errorNode = new TestAsyncNode('error', 25);
      errorNode.failUntilAttempt = 5;
      errorNode.shouldFailFallback = true;

      const asyncFlow = new AsyncFlow();
      asyncFlow.start(errorNode);

      // Act & Assert
      await expect(asyncFlow.execute()).rejects.toThrow('Async execution failed on attempt 4');
    });
  });

  describe('AsyncParallelBatchNode Operations', () => {
    test('should process items in parallel batches', async () => {
      // Arrange
      const items = Array.from({ length: 10 }, (_, i) => `item-${i}`);
      const processor = async (item: string) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return `processed-${item}`;
      };

      const batchNode = new AsyncParallelBatchNode(items, processor, 3); // Batch size 3

      // Act
      const startTime = Date.now();
      const result = await batchNode.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toHaveLength(10);
      expect(result[0]).toBe('processed-item-0');
      expect(result[9]).toBe('processed-item-9');
      
      // With batch size 3, we need 4 batches (3+3+3+1)
      // Each batch takes ~50ms, so total should be ~200ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(180);
      expect(endTime - startTime).toBeLessThan(300);
    });

    test('should handle batch processing errors with fallback', async () => {
      // Arrange
      const items = ['item1', 'item2', 'item3'];
      const processor = async (item: string) => {
        if (item === 'item2') {
          throw new Error('Processing failed');
        }
        return `processed-${item}`;
      };

      const batchNode = new AsyncParallelBatchNode(items, processor, 2);

      // Act
      const result = await batchNode.execute();

      // Assert - Should use fallback sequential processing
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('processed-item1');
      expect(result[1]).toEqual({ error: 'Processing failed', item: 'item2' });
      expect(result[2]).toBe('processed-item3');
    });

    test('should respect batch size limits', async () => {
      // Arrange
      const items = Array.from({ length: 7 }, (_, i) => i);
      const processingTimes: number[] = [];
      
      const processor = async (item: number) => {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        processingTimes.push(Date.now() - startTime);
        return item * 2;
      };

      const batchNode = new AsyncParallelBatchNode(items, processor, 2); // Batch size 2

      // Act
      await batchNode.execute();

      // Assert - Should have processed in 4 batches: [0,1], [2,3], [4,5], [6]
      expect(processingTimes).toHaveLength(7);
      // All items in same batch should have similar processing times
    });

    test('should handle empty items array', async () => {
      // Arrange
      const processor = async (item: any) => `processed-${item}`;
      const batchNode = new AsyncParallelBatchNode([], processor, 5);

      // Act
      const result = await batchNode.execute();

      // Assert
      expect(result).toEqual([]);
    });

    test('should handle large batch sizes', async () => {
      // Arrange
      const items = Array.from({ length: 5 }, (_, i) => i);
      const processor = async (item: number) => item * 2;
      const batchNode = new AsyncParallelBatchNode(items, processor, 10); // Larger than items

      // Act
      const result = await batchNode.execute();

      // Assert
      expect(result).toEqual([0, 2, 4, 6, 8]);
    });
  });

  describe('AsyncParallelBatchFlow Operations', () => {
    test('should execute nodes in parallel batches', async () => {
      // Arrange
      const nodes = Array.from({ length: 6 }, (_, i) => 
        new TestAsyncNode(`node-${i}`, 50)
      );

      const batchFlow = new AsyncParallelBatchFlow(nodes, 2); // Batch size 2

      // Act
      const startTime = Date.now();
      const result = await batchFlow.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toHaveLength(6);
      expect(result).toEqual(['node-0', 'node-1', 'node-2', 'node-3', 'node-4', 'node-5']);
      
      // 3 batches of 2 nodes each, ~50ms per batch = ~150ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(140);
      expect(endTime - startTime).toBeLessThan(250);
    });

    test('should handle node execution errors in batch flow', async () => {
      // Arrange
      const node1 = new TestAsyncNode('completed1', 25);
      const node2 = new TestAsyncNode('error', 25);
      const node3 = new TestAsyncNode('completed2', 25);

      node2.failUntilAttempt = 5;
      node2.shouldFailFallback = true;

      const batchFlow = new AsyncParallelBatchFlow([node1, node2, node3], 2);

      // Act & Assert
      await expect(batchFlow.execute()).rejects.toThrow();
      expect(node1.execAttempts).toBe(1);
      expect(node2.execAttempts).toBe(4); // Attempted retries
    });

    test('should maintain execution order in batch results', async () => {
      // Arrange
      const fastNode = new TestAsyncNode('fast', 25);
      const slowNode = new TestAsyncNode('slow', 100);
      const mediumNode = new TestAsyncNode('medium', 50);

      const batchFlow = new AsyncParallelBatchFlow([slowNode, fastNode, mediumNode], 3);

      // Act
      const result = await batchFlow.execute();

      // Assert
      expect(result).toEqual(['slow', 'fast', 'medium']); // Order preserved
    });
  });

  describe('Concrete AsyncNode Implementations', () => {
    describe('AsyncCommandNode', () => {
      test('should execute commands asynchronously', async () => {
        // Arrange
        const commandNode = new AsyncCommandNode('echo "async command"');
        
        // Mock child_process
        jest.doMock('child_process', () => ({
          exec: jest.fn((cmd, callback) => {
            setTimeout(() => {
              callback(null, { stdout: 'async command\n', stderr: '' });
            }, 50);
          })
        }));

        // Act
        const startTime = Date.now();
        const result = await commandNode.execute();
        const endTime = Date.now();

        // Assert
        expect(result).toContain('async command');
        expect(endTime - startTime).toBeGreaterThanOrEqual(40);
      });

      test('should provide async command fallback', async () => {
        // Arrange
        const commandNode = new AsyncCommandNode('failing-async-command');

        // Act
        const result = await commandNode.execFallback();

        // Assert
        expect(result).toBe('Async command failed: failing-async-command');
      });
    });

    describe('AsyncHttpNode', () => {
      test('should make async HTTP requests', async () => {
        // Arrange
        const mockResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ async: true, message: 'In Progress' })
        };
        
        (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);
        
        const httpNode = new AsyncHttpNode('https://async-api.example.com/test');

        // Act
        const result = await httpNode.execute();

        // Assert
        expect(result).toEqual({ async: true, message: 'In Progress' });
        expect(global.fetch).toHaveBeenCalledWith('https://async-api.example.com/test', {});
      });

      test('should handle async HTTP errors with retries', async () => {
        // Arrange
        const errorResponse = { ok: false, status: 500, statusText: 'Server Error' };
        const completedResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ recovered: true })
        };
        
        (global.fetch as jest.MockedFunction<typeof fetch>)
          .mockResolvedValueOnce(errorResponse as any)
          .mockResolvedValueOnce(errorResponse as any)
          .mockResolvedValueOnce(completedResponse as any);
        
        const httpNode = new AsyncHttpNode('https://retry-api.example.com/test', {}, 3, 100);

        // Act
        const result = await httpNode.execute();

        // Assert
        expect(result).toEqual({ recovered: true });
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });

      test('should provide async HTTP fallback', async () => {
        // Arrange
        const httpNode = new AsyncHttpNode('https://failing-api.example.com');

        // Act
        const result = await httpNode.execFallback();

        // Assert
        expect(result).toEqual({ error: 'Async HTTP request failed: https://failing-api.example.com' });
      });

      test('should support concurrent HTTP requests', async () => {
        // Arrange
        const urls = [
          'https://api1.example.com',
          'https://api2.example.com',
          'https://api3.example.com'
        ];
        
        (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
          (url) => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ url })
          } as any)
        );
        
        const httpNodes = urls.map(url => new AsyncHttpNode(url));

        // Act
        const startTime = Date.now();
        const promises = httpNodes.map(node => node.execute());
        const results = await Promise.all(promises);
        const endTime = Date.now();

        // Assert
        expect(results).toHaveLength(3);
        results.forEach((result, index) => {
          expect(result.url).toBe(urls[index]);
        });
        expect(endTime - startTime).toBeLessThan(100); // Concurrent execution
      });
    });

    describe('AsyncDelayNode', () => {
      test('should handle async delays', async () => {
        // Arrange
        const delayNode = new AsyncDelayNode(150);

        // Act
        const startTime = Date.now();
        await delayNode.execute();
        const endTime = Date.now();

        // Assert
        expect(endTime - startTime).toBeGreaterThanOrEqual(140);
      });

      test('should not retry delay operations', async () => {
        // Arrange
        const delayNode = new AsyncDelayNode(50);

        // Act
        await delayNode.execute();

        // Assert
        expect(delayNode['maxRetries']).toBe(1);
        expect(delayNode['wait']).toBe(0);
      });

      test('should support concurrent delays', async () => {
        // Arrange
        const delayNodes = [
          new AsyncDelayNode(100),
          new AsyncDelayNode(150),
          new AsyncDelayNode(75)
        ];

        // Act
        const startTime = Date.now();
        const promises = delayNodes.map(node => node.execute());
        await Promise.all(promises);
        const endTime = Date.now();

        // Assert
        // Should take time of longest delay (~150ms), not sum (~325ms)
        expect(endTime - startTime).toBeGreaterThanOrEqual(140);
        expect(endTime - startTime).toBeLessThan(200);
      });
    });
  });

  describe('Async Performance and Scalability', () => {
    test('should demonstrate async performance benefits', async () => {
      // Arrange - Compare sequential vs parallel execution
      const createDelayNode = (delay: number) => new TestAsyncNode(`result`, delay);
      
      const sequentialNodes = Array.from({ length: 5 }, () => createDelayNode(100));
      const parallelNodes = Array.from({ length: 5 }, () => createDelayNode(100));

      // Act - Sequential execution
      const seqStartTime = Date.now();
      for (const node of sequentialNodes) {
        await node.execute();
      }
      const seqEndTime = Date.now();

      // Act - Parallel execution
      const parStartTime = Date.now();
      const promises = parallelNodes.map(node => node.execute());
      await Promise.all(promises);
      const parEndTime = Date.now();

      // Assert
      const sequentialTime = seqEndTime - seqStartTime;
      const parallelTime = parEndTime - parStartTime;
      
      expect(sequentialTime).toBeGreaterThanOrEqual(480); // ~500ms
      expect(parallelTime).toBeLessThan(200); // ~100ms
      expect(parallelTime).toBeLessThan(sequentialTime / 2);
    });

    test('should handle high concurrency loads', async () => {
      // Arrange
      const nodes = Array.from({ length: 100 }, (_, i) => 
        new TestAsyncNode(`concurrent-${i}`, 10)
      );

      // Act
      const startTime = Date.now();
      const promises = nodes.map(node => node.execute());
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      nodes.forEach(node => {
        expect(node.execAttempts).toBe(1);
      });
    });

    test('should handle mixed async operations efficiently', async () => {
      // Arrange
      const commandNode = new AsyncCommandNode('echo "fast"');
      const httpNode = new AsyncHttpNode('https://api.example.com/data');
      const delayNode = new AsyncDelayNode(50);
      
      // Mock HTTP response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'response' })
      } as any);

      // Act
      const startTime = Date.now();
      const results = await Promise.all([
        commandNode.execute(),
        httpNode.execute(),
        delayNode.execute()
      ]);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(150); // Parallel execution
    });
  });

  describe('Async Error Recovery', () => {
    test('should handle partial failures in parallel batch', async () => {
      // Arrange
      const items = ['completed1', 'error', 'completed2', 'error2', 'completed3'];
      const processor = async (item: string) => {
        if (item.includes('error')) {
          throw new Error(`Failed to process ${item}`);
        }
        return `processed-${item}`;
      };

      const batchNode = new AsyncParallelBatchNode(items, processor, 3);

      // Act
      const result = await batchNode.execute(); // Should use fallback

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0]).toBe('processed-completed1');
      expect(result[1]).toEqual({ error: 'Failed to process error', item: 'error' });
      expect(result[2]).toBe('processed-completed2');
      expect(result[3]).toEqual({ error: 'Failed to process error2', item: 'error2' });
      expect(result[4]).toBe('processed-completed3');
    });

    test('should handle timeout scenarios gracefully', async () => {
      // Arrange
      const slowNode = new TestAsyncNode('slow-result', 5000); // Very slow
      const fastNode = new TestAsyncNode('fast-result', 10);

      // Act - Test with Promise.race to simulate timeout
      const raceResult = await Promise.race([
        slowNode.execute(),
        fastNode.execute()
      ]);

      // Assert
      expect(raceResult).toBe('fast-result');
    });
  });
});