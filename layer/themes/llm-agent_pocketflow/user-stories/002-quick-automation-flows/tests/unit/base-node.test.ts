import { describe, test, expect, beforeEach } from '@jest/globals';
import { BaseNode } from '../../src/domain/base-node.js';

// Concrete implementation for testing
class TestNode extends BaseNode {
  public prepCalled: boolean = false;
  public execCalled: boolean = false;
  public postCalled: boolean = false;
  public execResult: any = 'test-result';
  public shouldThrowInPrep: boolean = false;
  public shouldThrowInExec: boolean = false;
  public shouldThrowInPost: boolean = false;

  async prep(): Promise<void> {
    this.prepCalled = true;
    if (this.shouldThrowInPrep) {
      throw new Error('Prep error');
    }
  }

  async exec(): Promise<any> {
    this.execCalled = true;
    if (this.shouldThrowInExec) {
      throw new Error('Exec error');
    }
    return this.execResult;
  }

  async post(result: any): Promise<void> {
    this.postCalled = true;
    if (this.shouldThrowInPost) {
      throw new Error('Post error');
    }
  }

  // Helper methods for testing
  reset(): void {
    this.prepCalled = false;
    this.execCalled = false;
    this.postCalled = false;
    this.shouldThrowInPrep = false;
    this.shouldThrowInExec = false;
    this.shouldThrowInPost = false;
  }
}

class DelayTestNode extends BaseNode {
  constructor(private delay: number, private result: any = 'delayed-result') {
    super();
  }

  async prep(): Promise<void> {
    // No preparation needed
  }

  async exec(): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return this.result;
  }

  async post(result: any): Promise<void> {
    // No post-processing needed
  }
}

describe('BaseNode Unit Tests', () => {
  let testNode: TestNode;

  beforeEach(() => {
    testNode = new TestNode();
  });

  afterEach(() => {
    testNode.reset();
  });

  describe('Lifecycle Methods', () => {
    test('should execute lifecycle methods in correct order', async () => {
      // Act
      const result = await testNode.execute();

      // Assert
      expect(testNode.prepCalled).toBe(true);
      expect(testNode.execCalled).toBe(true);
      expect(testNode.postCalled).toBe(true);
      expect(result).toBe('test-result');
    });

    test('should handle prep phase errors', async () => {
      // Arrange
      testNode.shouldThrowInPrep = true;

      // Act & Assert
      await expect(testNode.execute()).rejects.toThrow('Prep error');
      expect(testNode.prepCalled).toBe(true);
      expect(testNode.execCalled).toBe(false);
      expect(testNode.postCalled).toBe(false);
    });

    test('should handle exec phase errors', async () => {
      // Arrange
      testNode.shouldThrowInExec = true;

      // Act & Assert
      await expect(testNode.execute()).rejects.toThrow('Exec error');
      expect(testNode.prepCalled).toBe(true);
      expect(testNode.execCalled).toBe(true);
      expect(testNode.postCalled).toBe(false);
    });

    test('should handle post phase errors', async () => {
      // Arrange
      testNode.shouldThrowInPost = true;

      // Act & Assert
      await expect(testNode.execute()).rejects.toThrow('Post error');
      expect(testNode.prepCalled).toBe(true);
      expect(testNode.execCalled).toBe(true);
      expect(testNode.postCalled).toBe(true);
    });

    test('should pass exec result to post method', async () => {
      // Arrange
      let postResult: any;
      testNode.post = async (result: any) => {
        postResult = result;
        testNode.postCalled = true;
      };

      // Act
      await testNode.execute();

      // Assert
      expect(postResult).toBe('test-result');
    });
  });

  describe('Parameter Management', () => {
    test('should set and store parameters', () => {
      // Arrange
      const params = { key1: 'value1', key2: 42, key3: { nested: 'object' } };

      // Act
      const result = testNode.setParams(params);

      // Assert
      expect(result).toBe(testNode); // Should return self for chaining
      expect(testNode['params']).toEqual(params);
    });

    test('should merge parameters when called multiple times', () => {
      // Arrange
      const params1 = { key1: 'value1', key2: "original" };
      const params2 = { key2: 'updated', key3: 'new' };

      // Act
      testNode.setParams(params1);
      testNode.setParams(params2);

      // Assert
      expect(testNode['params']).toEqual({
        key1: 'value1',
        key2: 'updated',
        key3: 'new'
      });
    });

    test('should support method chaining with setParams', () => {
      // Arrange
      const node2 = new TestNode();

      // Act
      const result = testNode.setParams({ key: 'value' }).next(node2);

      // Assert
      expect(result).toBe(testNode);
      expect(testNode["nextNodes"]).toContain(node2);
    });
  });

  describe('Node Chaining', () => {
    test('should add next nodes', () => {
      // Arrange
      const node2 = new TestNode();
      const node3 = new TestNode();

      // Act
      const result = testNode.next(node2, node3);

      // Assert
      expect(result).toBe(testNode); // Should return self for chaining
      expect(testNode["nextNodes"]).toContain(node2);
      expect(testNode["nextNodes"]).toContain(node3);
      expect(testNode["nextNodes"]).toHaveLength(2);
    });

    test('should chain nodes using chain method', () => {
      // Arrange
      const node2 = new TestNode();

      // Act
      const result = testNode.chain(node2);

      // Assert
      expect(result).toBe(testNode);
      expect(testNode["nextNodes"]).toContain(node2);
    });

    test('should accumulate next nodes across multiple calls', () => {
      // Arrange
      const node2 = new TestNode();
      const node3 = new TestNode();
      const node4 = new TestNode();

      // Act
      testNode.next(node2);
      testNode.next(node3, node4);

      // Assert
      expect(testNode["nextNodes"]).toHaveLength(3);
      expect(testNode["nextNodes"]).toContain(node2);
      expect(testNode["nextNodes"]).toContain(node3);
      expect(testNode["nextNodes"]).toContain(node4);
    });
  });

  describe('Conditional Transitions', () => {
    test('should add conditional transitions', () => {
      // Arrange
      const node2 = new TestNode();
      const condition = (result: any) => result === 'In Progress';

      // Act
      const result = testNode.when(condition, node2);

      // Assert
      expect(result).toBe(testNode);
      expect(testNode["conditions"]).toHaveLength(1);
      expect(testNode["conditions"][0].condition).toBe(condition);
      expect(testNode["conditions"][0].node).toBe(node2);
    });

    test('should support multiple conditional transitions', () => {
      // Arrange
      const node2 = new TestNode();
      const node3 = new TestNode();
      const condition1 = (result: any) => result === 'In Progress';
      const condition2 = (result: any) => result === 'failure';

      // Act
      testNode.when(condition1, node2).when(condition2, node3);

      // Assert
      expect(testNode["conditions"]).toHaveLength(2);
      expect(testNode["conditions"][0].node).toBe(node2);
      expect(testNode["conditions"][1].node).toBe(node3);
    });

    test('should return first matching condition node', async () => {
      // Arrange
      const node2 = new TestNode();
      const node3 = new TestNode();
      const condition1 = (result: any) => result.includes('In Progress');
      const condition2 = (result: any) => result.includes('test');

      testNode.when(condition1, node2).when(condition2, node3);
      testNode.execResult = 'test-In Progress';

      // Act
      const result = await testNode.execute();
      const nextNode = await testNode.getNextNode(result);

      // Assert
      expect(nextNode).toBe(node2); // First matching condition wins
    });

    test('should return null when no conditions match and no next nodes', async () => {
      // Arrange
      const node2 = new TestNode();
      const condition = (result: any) => result === 'other';

      testNode.when(condition, node2);
      testNode.execResult = 'test-result';

      // Act
      const result = await testNode.execute();
      const nextNode = await testNode.getNextNode(result);

      // Assert
      expect(nextNode).toBeNull();
    });

    test('should fall back to first next node when no conditions match', async () => {
      // Arrange
      const node2 = new TestNode();
      const node3 = new TestNode();
      const condition = (result: any) => result === 'other';

      testNode.when(condition, node2).next(node3);
      testNode.execResult = 'test-result';

      // Act
      const result = await testNode.execute();
      const nextNode = await testNode.getNextNode(result);

      // Assert
      expect(nextNode).toBe(node3); // Falls back to next node
    });
  });

  describe('Flow Execution', () => {
    test('should execute single node flow', async () => {
      // Act
      const result = await testNode.run();

      // Assert
      expect(result).toBe('test-result');
      expect(testNode.prepCalled).toBe(true);
      expect(testNode.execCalled).toBe(true);
      expect(testNode.postCalled).toBe(true);
    });

    test('should execute chained nodes in sequence', async () => {
      // Arrange
      const node2 = new TestNode();
      node2.execResult = 'second-result';
      
      const node3 = new TestNode();
      node3.execResult = 'third-result';

      testNode.next(node2);
      node2.next(node3);

      // Act
      const result = await testNode.run();

      // Assert
      expect(result).toBe('third-result'); // Last node's result
      expect(testNode.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(true);
    });

    test('should execute conditional path based on result', async () => {
      // Arrange
      const completedNode = new TestNode();
      completedNode.execResult = 'In Progress-path';
      
      const failureNode = new TestNode();
      failureNode.execResult = 'failure-path';

      testNode.execResult = 'In Progress';
      testNode.when(result => result === 'In Progress', completedNode);
      testNode.when(result => result === 'failure', failureNode);

      // Act
      const result = await testNode.run();

      // Assert
      expect(result).toBe('In Progress-path');
      expect(testNode.execCalled).toBe(true);
      expect(completedNode.execCalled).toBe(true);
      expect(failureNode.execCalled).toBe(false);
    });

    test('should handle execution errors in flow', async () => {
      // Arrange
      const node2 = new TestNode();
      node2.shouldThrowInExec = true;

      testNode.next(node2);

      // Act & Assert
      await expect(testNode.run()).rejects.toThrow('Exec error');
      expect(testNode.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
    });
  });

  describe('Asynchronous Execution', () => {
    test('should handle asynchronous node execution', async () => {
      // Arrange
      const delayNode = new DelayTestNode(100, 'delayed-result');

      // Act
      const startTime = Date.now();
      const result = await delayNode.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('delayed-result');
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    test('should execute async chain correctly', async () => {
      // Arrange
      const node1 = new DelayTestNode(50, 'first');
      const node2 = new DelayTestNode(50, 'second');
      const node3 = new DelayTestNode(50, 'third');

      node1.next(node2);
      node2.next(node3);

      // Act
      const startTime = Date.now();
      const result = await node1.run();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('third');
      expect(endTime - startTime).toBeGreaterThanOrEqual(140); // At least 150ms total
    });

    test('should handle concurrent condition evaluation', async () => {
      // Arrange
      const fastNode = new DelayTestNode(25, 'fast');
      const slowNode = new DelayTestNode(100, 'slow');
      
      testNode.execResult = 'choose-fast';
      testNode.when(result => result === 'choose-fast', fastNode);
      testNode.when(result => result === 'choose-slow', slowNode);

      // Act
      const startTime = Date.now();
      const result = await testNode.run();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('fast');
      expect(endTime - startTime).toBeLessThan(75); // Should be fast path
    });
  });

  describe('Complex Flow Patterns', () => {
    test('should support diamond flow pattern', async () => {
      // Arrange
      const node2 = new TestNode();
      const node3 = new TestNode();
      const node4 = new TestNode();
      
      node2.execResult = 'path-2';
      node3.execResult = 'path-3';
      node4.execResult = 'final';

      // Diamond: testNode -> (node2, node3) -> node4
      testNode.execResult = 'branch';
      testNode.when(result => result === 'branch', node2);
      testNode.when(result => result === 'other', node3);
      
      node2.next(node4);
      node3.next(node4);

      // Act
      const result = await testNode.run();

      // Assert
      expect(result).toBe('final');
      expect(testNode.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(false); // Condition not met
      expect(node4.execCalled).toBe(true);
    });

    test('should support loop-like patterns with termination', async () => {
      // Arrange
      let counter = 0;
      const loopNode = new TestNode();
      const exitNode = new TestNode();
      
      loopNode.exec = async () => {
        counter++;
        return counter < 3 ? "continue" : 'exit';
      };
      
      exitNode.execResult = 'In Progress';

      // Loop: loopNode -> (loopNode | exitNode)
      loopNode.when(result => result === "continue", loopNode);
      loopNode.when(result => result === 'exit', exitNode);

      // Act
      const result = await loopNode.run();

      // Assert
      expect(result).toBe("completed");
      expect(counter).toBe(3);
      expect(exitNode.execCalled).toBe(true);
    });

    test('should handle deeply nested chains', async () => {
      // Arrange
      const nodes: TestNode[] = [];
      for (let i = 0; i < 10; i++) {
        const node = new TestNode();
        node.execResult = `result-${i}`;
        nodes.push(node);
        
        if (i > 0) {
          nodes[i - 1].next(node);
        }
      }

      // Act
      const result = await nodes[0].run();

      // Assert
      expect(result).toBe('result-9');
      nodes.forEach(node => {
        expect(node.execCalled).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null/undefined results gracefully', async () => {
      // Arrange
      const node2 = new TestNode();
      testNode.execResult = null;
      testNode.next(node2);

      // Act
      const result = await testNode.run();

      // Assert
      expect(result).toBe('test-result'); // node2's result
      expect(node2.execCalled).toBe(true);
    });

    test('should handle empty condition arrays', async () => {
      // Arrange
      const node2 = new TestNode();
      testNode.next(node2);

      // Act
      const nextNode = await testNode.getNextNode('any-result');

      // Assert
      expect(nextNode).toBe(node2); // Falls back to next nodes
    });

    test('should handle circular references without infinite loops', async () => {
      // Arrange - Create potential circular reference but with exit condition
      const node2 = new TestNode();
      let executionCount = 0;
      
      testNode.exec = async () => {
        executionCount++;
        return executionCount < 2 ? "continue" : 'stop';
      };
      
      node2.execResult = 'final';
      
      testNode.when(result => result === "continue", testNode); // Self-reference
      testNode.when(result => result === 'stop', node2);

      // Act
      const result = await testNode.run();

      // Assert
      expect(result).toBe('final');
      expect(executionCount).toBe(2);
      expect(node2.execCalled).toBe(true);
    });

    test('should maintain execution context across chain', async () => {
      // Arrange
      const node2 = new TestNode();
      const node3 = new TestNode();
      
      testNode.setParams({ context: 'test-context' });
      testNode.next(node2);
      node2.next(node3);

      // Act
      await testNode.run();

      // Assert
      expect(testNode['params'].context).toBe('test-context');
      // Note: Params don't automatically propagate - this is by design
      // Each node maintains its own parameters
    });
  });
});