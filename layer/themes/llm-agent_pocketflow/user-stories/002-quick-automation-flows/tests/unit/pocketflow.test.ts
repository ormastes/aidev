import { describe, test, expect, beforeEach } from '@jest/globals';
import PocketFlow, { 
  CommandNode, 
  DelayNode, 
  HttpNode,
  AsyncCommandNode,
  AsyncHttpNode,
  AsyncDelayNode,
  SequentialFlow,
  ParallelFlow,
  ConditionalFlow,
  BaseNode,
  chain,
  when,
  flow
} from '../../src/index.js';

// Mock fetch for HTTP node tests
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('PocketFlow Factory Methods Unit Tests', () => {
  describe('Node Creation Factory Methods', () => {
    test('should create CommandNode with createNode', () => {
      // Act
      const node = PocketFlow.createNode('command', 'echo "test"');

      // Assert
      expect(node).toBeInstanceOf(CommandNode);
      expect(node['command']).toBe('echo "test"');
    });

    test('should create DelayNode with createNode', () => {
      // Act
      const node = PocketFlow.createNode('delay', 1000);

      // Assert
      expect(node).toBeInstanceOf(DelayNode);
      expect(node['duration']).toBe(1000);
    });

    test('should create HttpNode with createNode', () => {
      // Act
      const node = PocketFlow.createNode('http', 'https://api.example.com');

      // Assert
      expect(node).toBeInstanceOf(HttpNode);
      expect(node['url']).toBe('https://api.example.com');
    });

    test('should create HttpNode with options', () => {
      // Arrange
      const options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

      // Act
      const node = PocketFlow.createNode('http', 'https://api.example.com/post', options);

      // Assert
      expect(node).toBeInstanceOf(HttpNode);
      expect(node['url']).toBe('https://api.example.com/post');
      expect(node['options']).toEqual(options);
    });

    test('should throw error for unknown node type', () => {
      // Act & Assert
      expect(() => {
        PocketFlow.createNode('unknown' as any, 'param');
      }).toThrow('Unknown node type: unknown');
    });

    test('should handle createNode overloads correctly', () => {
      // Act
      const commandNode = PocketFlow.createNode('command', 'ls -la');
      const delayNode = PocketFlow.createNode('delay', 500);
      const httpNode = PocketFlow.createNode('http', 'https://test.com');

      // Assert
      expect(commandNode).toBeInstanceOf(CommandNode);
      expect(delayNode).toBeInstanceOf(DelayNode);
      expect(httpNode).toBeInstanceOf(HttpNode);
    });
  });

  describe('Async Node Creation Factory Methods', () => {
    test('should create AsyncCommandNode with createAsyncNode', () => {
      // Act
      const node = PocketFlow.createAsyncNode('command', 'echo "async test"');

      // Assert
      expect(node).toBeInstanceOf(AsyncCommandNode);
      expect(node['command']).toBe('echo "async test"');
    });

    test('should create AsyncDelayNode with createAsyncNode', () => {
      // Act
      const node = PocketFlow.createAsyncNode('delay', 2000);

      // Assert
      expect(node).toBeInstanceOf(AsyncDelayNode);
      expect(node['duration']).toBe(2000);
    });

    test('should create AsyncHttpNode with createAsyncNode', () => {
      // Act
      const node = PocketFlow.createAsyncNode('http', 'https://async-api.example.com');

      // Assert
      expect(node).toBeInstanceOf(AsyncHttpNode);
      expect(node['url']).toBe('https://async-api.example.com');
    });

    test('should create AsyncHttpNode with options', () => {
      // Arrange
      const options = { method: 'PUT', body: JSON.stringify({ data: 'test' }) };

      // Act
      const node = PocketFlow.createAsyncNode('http', 'https://async-api.example.com/put', options);

      // Assert
      expect(node).toBeInstanceOf(AsyncHttpNode);
      expect(node['url']).toBe('https://async-api.example.com/put');
      expect(node['options']).toEqual(options);
    });

    test('should throw error for unknown async node type', () => {
      // Act & Assert
      expect(() => {
        PocketFlow.createAsyncNode('invalid' as any, 'param');
      }).toThrow('Unknown async node type: invalid');
    });

    test('should handle createAsyncNode overloads correctly', () => {
      // Act
      const asyncCommandNode = PocketFlow.createAsyncNode('command', 'pwd');
      const asyncDelayNode = PocketFlow.createAsyncNode('delay', 750);
      const asyncHttpNode = PocketFlow.createAsyncNode('http', 'https://async.test.com');

      // Assert
      expect(asyncCommandNode).toBeInstanceOf(AsyncCommandNode);
      expect(asyncDelayNode).toBeInstanceOf(AsyncDelayNode);
      expect(asyncHttpNode).toBeInstanceOf(AsyncHttpNode);
    });
  });

  describe('Flow Creation Factory Methods', () => {
    test('should create SequentialFlow with createFlow', () => {
      // Arrange
      const node1 = PocketFlow.createNode('command', 'echo "1"');
      const node2 = PocketFlow.createNode('command', 'echo "2"');
      const nodes = [node1, node2];

      // Act
      const flow = PocketFlow.createFlow('sequential', nodes);

      // Assert
      expect(flow).toBeInstanceOf(SequentialFlow);
      expect(flow.getFlowNodes()).toHaveLength(2);
      expect(flow.getFlowNodes()).toContain(node1);
      expect(flow.getFlowNodes()).toContain(node2);
    });

    test('should create ParallelFlow with createFlow', () => {
      // Arrange
      const node1 = PocketFlow.createNode('delay', 100);
      const node2 = PocketFlow.createNode('delay', 200);
      const node3 = PocketFlow.createNode('delay', 150);
      const nodes = [node1, node2, node3];

      // Act
      const flow = PocketFlow.createFlow('parallel', nodes);

      // Assert
      expect(flow).toBeInstanceOf(ParallelFlow);
      expect(flow.getFlowNodes()).toHaveLength(3);
      expect(flow['parallelNodes']).toContain(node1);
      expect(flow['parallelNodes']).toContain(node2);
      expect(flow['parallelNodes']).toContain(node3);
    });

    test('should create ConditionalFlow with createFlow', () => {
      // Arrange
      const condition = (result: any) => result === 'In Progress';
      const trueNode = PocketFlow.createNode('command', 'echo "In Progress path"');
      const falseNode = PocketFlow.createNode('command', 'echo "failure path"');

      // Act
      const flow = PocketFlow.createFlow('conditional', condition, trueNode, falseNode);

      // Assert
      expect(flow).toBeInstanceOf(ConditionalFlow);
      expect(flow['condition']).toBe(condition);
      expect(flow['trueNode']).toBe(trueNode);
      expect(flow['falseNode']).toBe(falseNode);
    });

    test('should throw error for unknown flow type', () => {
      // Arrange
      const node = PocketFlow.createNode('command', 'echo "test"');

      // Act & Assert
      expect(() => {
        PocketFlow.createFlow('unknown' as any, [node]);
      }).toThrow('Unknown flow type: unknown');
    });

    test('should handle createFlow overloads correctly', () => {
      // Arrange
      const nodes = [
        PocketFlow.createNode('command', 'echo "test"'),
        PocketFlow.createNode('delay', 100)
      ];
      const condition = (r: any) => true;
      const trueNode = PocketFlow.createNode('command', 'true');
      const falseNode = PocketFlow.createNode('command', 'false');

      // Act
      const sequentialFlow = PocketFlow.createFlow('sequential', nodes);
      const parallelFlow = PocketFlow.createFlow('parallel', nodes);
      const conditionalFlow = PocketFlow.createFlow('conditional', condition, trueNode, falseNode);

      // Assert
      expect(sequentialFlow).toBeInstanceOf(SequentialFlow);
      expect(parallelFlow).toBeInstanceOf(ParallelFlow);
      expect(conditionalFlow).toBeInstanceOf(ConditionalFlow);
    });
  });

  describe('Execution Factory Method', () => {
    test('should run node with static run method', async () => {
      // Arrange
      const node = PocketFlow.createNode('delay', 50);

      // Act
      const startTime = Date.now();
      await PocketFlow.run(node);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeGreaterThanOrEqual(40);
    });

    test('should run flow with static run method', async () => {
      // Arrange
      const nodes = [
        PocketFlow.createNode('delay', 25),
        PocketFlow.createNode('delay', 25)
      ];
      const flow = PocketFlow.createFlow('sequential', nodes);

      // Act
      const startTime = Date.now();
      await PocketFlow.run(flow);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Sequential timing
    });

    test('should return node execution result', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'factory test' })
      } as any);

      const httpNode = PocketFlow.createNode('http', 'https://api.example.com/test');

      // Act
      const result = await PocketFlow.run(httpNode);

      // Assert
      expect(result).toEqual({ message: 'factory test' });
    });

    test('should handle execution errors', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      const httpNode = PocketFlow.createNode('http', 'https://api.example.com/missing');

      // Act & Assert
      await expect(PocketFlow.run(httpNode)).rejects.toThrow('HTTP 404: Not Found');
    });
  });

  describe('Utility Method Exports', () => {
    test('should export chain utility as static method', () => {
      // Arrange
      const node1 = PocketFlow.createNode('command', 'echo "1"');
      const node2 = PocketFlow.createNode('command', 'echo "2"');

      // Act
      const result = PocketFlow.chain(node1, node2);

      // Assert
      expect(result).toBe(node1);
      expect(node1['nextNodes']).toContain(node2);
    });

    test('should export when utility as static method', () => {
      // Arrange
      const node1 = PocketFlow.createNode('command', 'echo "test"');
      const node2 = PocketFlow.createNode('command', 'echo "conditional"');
      const condition = (result: any) => result.includes('test');

      // Act
      const result = PocketFlow.when(node1, condition, node2);

      // Assert
      expect(result).toBe(node1);
      expect(node1['conditions']).toHaveLength(1);
      expect(node1['conditions'][0].condition).toBe(condition);
      expect(node1['conditions'][0].node).toBe(node2);
    });

    test('should export flow utility as static method', () => {
      // Arrange
      const startNode = PocketFlow.createNode('command', 'echo "start"');

      // Act
      const builder = PocketFlow.flow(startNode);

      // Assert
      expect(builder.constructor.name).toBe('ChainBuilder');
      expect(builder['rootNode']).toBe(startNode);
    });
  });

  describe('Integration Workflows', () => {
    test('should create In Progress workflow using factory methods', async () => {
      // Arrange
      const setupNode = PocketFlow.createNode('delay', 25);
      const httpNode = PocketFlow.createNode('http', 'https://api.example.com/data');
      const cleanupNode = PocketFlow.createNode('delay', 25);

      // Mock HTTP response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ workflow: 'In Progress' })
      } as any);

      // Act
      const workflow = PocketFlow.createFlow('sequential', [setupNode, httpNode, cleanupNode]);
      const result = await PocketFlow.run(workflow);

      // Assert
      expect(result).toEqual({ workflow: 'In Progress' });
    });

    test('should create conditional workflow using factory methods', async () => {
      // Arrange
      const condition = (result: any) => result === undefined; // DelayNode returns undefined
      const completedNode = PocketFlow.createNode('delay', 10);
      const failureNode = PocketFlow.createNode('delay', 20);

      const setupNode = PocketFlow.createNode('delay', 15);
      const conditionalFlow = PocketFlow.createFlow('conditional', condition, completedNode, failureNode);

      // Act
      const workflow = PocketFlow.flow(setupNode)
        .then(conditionalFlow)
        .build();

      const startTime = Date.now();
      await PocketFlow.run(workflow);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(50); // Should take In Progress path (shorter)
    });

    test('should create parallel workflow using factory methods', async () => {
      // Arrange
      const parallelNodes = [
        PocketFlow.createNode('delay', 50),
        PocketFlow.createNode('delay', 75),
        PocketFlow.createNode('delay', 25)
      ];

      const parallelFlow = PocketFlow.createFlow('parallel', parallelNodes);

      // Act
      const startTime = Date.now();
      const results = await PocketFlow.run(parallelFlow);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(150); // Parallel execution
      expect(endTime - startTime).toBeGreaterThanOrEqual(65); // Longest delay
    });

    test('should create async workflow using factory methods', async () => {
      // Arrange
      const asyncNodes = [
        PocketFlow.createAsyncNode('delay', 30),
        PocketFlow.createAsyncNode('delay', 40)
      ];

      // Act
      const startTime = Date.now();
      const results = await Promise.all(
        asyncNodes.map(node => PocketFlow.run(node))
      );
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(2);
      expect(endTime - startTime).toBeLessThan(80); // Concurrent execution
      expect(endTime - startTime).toBeGreaterThanOrEqual(35); // Longest delay
    });

    test('should combine sync and async nodes in workflow', async () => {
      // Arrange
      const syncNode = PocketFlow.createNode('delay', 30);
      const asyncNode = PocketFlow.createAsyncNode('delay', 30);

      // Act
      const syncResult = PocketFlow.run(syncNode);
      const asyncResult = PocketFlow.run(asyncNode);

      const startTime = Date.now();
      await Promise.all([syncResult, asyncResult]);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(60); // Concurrent execution
      expect(endTime - startTime).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Factory Method Error Handling', () => {
    test('should handle invalid parameters gracefully', () => {
      // Act & Assert
      expect(() => PocketFlow.createNode('command')).toThrow(); // Missing required parameter
      expect(() => PocketFlow.createNode('delay', 'invalid')).not.toThrow(); // Will be handled by DelayNode
      expect(() => PocketFlow.createFlow('sequential', null as any)).toThrow(); // SequentialFlow will validate
    });

    test('should provide meaningful error messages', () => {
      // Act & Assert
      expect(() => {
        PocketFlow.createNode('nonexistent' as any, 'param');
      }).toThrow('Unknown node type: nonexistent');

      expect(() => {
        PocketFlow.createAsyncNode('invalid' as any, 'param');
      }).toThrow('Unknown async node type: invalid');

      expect(() => {
        PocketFlow.createFlow('badflow' as any, []);
      }).toThrow('Unknown flow type: badflow');
    });

    test('should handle runtime errors during execution', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network connection failed')
      );

      const httpNode = PocketFlow.createNode('http', 'https://unreachable.example.com');

      // Act & Assert
      await expect(PocketFlow.run(httpNode)).rejects.toThrow('Network connection failed');
    });
  });

  describe('TypeScript Type Safety', () => {
    test('should maintain type safety in factory methods', () => {
      // These should compile without TypeScript errors
      const commandNode: CommandNode = PocketFlow.createNode('command', 'echo "test"');
      const delayNode: DelayNode = PocketFlow.createNode('delay', 1000);
      const httpNode: HttpNode = PocketFlow.createNode('http', 'https://example.com');

      const asyncCommandNode: AsyncCommandNode = PocketFlow.createAsyncNode('command', 'pwd');
      const asyncDelayNode: AsyncDelayNode = PocketFlow.createAsyncNode('delay', 500);
      const asyncHttpNode: AsyncHttpNode = PocketFlow.createAsyncNode('http', 'https://async.example.com');

      // Assert types are correct
      expect(commandNode).toBeInstanceOf(CommandNode);
      expect(delayNode).toBeInstanceOf(DelayNode);
      expect(httpNode).toBeInstanceOf(HttpNode);
      expect(asyncCommandNode).toBeInstanceOf(AsyncCommandNode);
      expect(asyncDelayNode).toBeInstanceOf(AsyncDelayNode);
      expect(asyncHttpNode).toBeInstanceOf(AsyncHttpNode);
    });

    test('should support generic BaseNode operations', async () => {
      // Arrange
      const nodes: BaseNode[] = [
        PocketFlow.createNode('command', 'echo "generic"'),
        PocketFlow.createNode('delay', 10),
        PocketFlow.createAsyncNode('delay', 10)
      ];

      // Act
      const results = await Promise.all(
        nodes.map(node => PocketFlow.run(node))
      );

      // Assert
      expect(results).toHaveLength(3);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should create many nodes efficiently', () => {
      // Act
      const startTime = Date.now();
      const nodes = Array.from({ length: 1000 }, (_, i) => 
        PocketFlow.createNode('delay', i % 3 === 0 ? 1 : 0)
      );
      const endTime = Date.now();

      // Assert
      expect(nodes).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      nodes.forEach(node => {
        expect(node).toBeInstanceOf(DelayNode);
      });
    });

    test('should handle memory efficiently with large workflows', async () => {
      // Arrange
      const nodes = Array.from({ length: 50 }, () => 
        PocketFlow.createNode('delay', 1)
      );

      const parallelFlow = PocketFlow.createFlow('parallel', nodes);

      // Act
      const startTime = Date.now();
      const result = await PocketFlow.run(parallelFlow);
      const endTime = Date.now();

      // Assert
      expect(result).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(100); // Parallel execution should be fast
    });
  });

  describe('API Compatibility', () => {
    test('should maintain consistency with Python original patterns', async () => {
      // Python equivalent: node1 >> node2 >> node3
      // TypeScript equivalent using factory methods:
      
      const node1 = PocketFlow.createNode('delay', 10);
      const node2 = PocketFlow.createNode('delay', 10);
      const node3 = PocketFlow.createNode('delay', 10);

      // Method 1: Using flow builder
      const workflow1 = PocketFlow.flow(node1).then(node2).then(node3).build();

      // Method 2: Using sequential flow
      const workflow2 = PocketFlow.createFlow('sequential', [node1, node2, node3]);

      // Method 3: Using chain utility
      PocketFlow.chain(PocketFlow.chain(node1, node2), node3);

      // Act
      const results = await Promise.all([
        PocketFlow.run(workflow1),
        PocketFlow.run(workflow2),
        PocketFlow.run(node1) // Chained version
      ]);

      // Assert - All methods should work
      expect(results).toHaveLength(3);
    });

    test('should support original Python workflow patterns', async () => {
      // Arrange - Simulate Python patterns
      const setupNode = PocketFlow.createNode('delay', 5);
      const processNode = PocketFlow.createNode('delay', 5);
      const cleanupNode = PocketFlow.createNode('delay', 5);

      // Python: setup_node >> process_node >> cleanup_node
      const linearWorkflow = PocketFlow.createFlow('sequential', [setupNode, processNode, cleanupNode]);

      // Python: parallel processing
      const parallelWorkflow = PocketFlow.createFlow('parallel', [setupNode, processNode, cleanupNode]);

      // Python: conditional processing
      const condition = () => true;
      const conditionalWorkflow = PocketFlow.createFlow('conditional', condition, processNode, cleanupNode);

      // Act
      const results = await Promise.all([
        PocketFlow.run(linearWorkflow),
        PocketFlow.run(parallelWorkflow),
        PocketFlow.run(conditionalWorkflow)
      ]);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[1]).toHaveLength(3); // Parallel flow returns array
    });
  });
});