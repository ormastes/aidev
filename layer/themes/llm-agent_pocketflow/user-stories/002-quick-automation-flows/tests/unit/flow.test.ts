import { describe, test, expect, beforeEach } from '@jest/globals';
import { Flow, SequentialFlow, ParallelFlow, ConditionalFlow } from '../../src/domain/flow.js';
import { BaseNode } from '../../src/domain/base-node.js';

// Test node implementation for flow testing
class TestNode extends BaseNode {
  public execCalled: boolean = false;
  public execResult: any;
  public execDuration: number;
  public shouldThrow: boolean = false;
  public prepCalled: boolean = false;
  public postCalled: boolean = false;

  constructor(result: any = 'test-result', duration: number = 0) {
    super();
    this.execResult = result;
    this.execDuration = duration;
  }

  async prep(): Promise<void> {
    this.prepCalled = true;
  }

  async exec(): Promise<any> {
    this.execCalled = true;
    
    if (this.execDuration > 0) {
      await new Promise(resolve => setTimeout(resolve, this.execDuration));
    }
    
    if (this.shouldThrow) {
      throw new Error(`Node error: ${this.execResult}`);
    }
    
    return this.execResult;
  }

  async post(_result: any): Promise<void> {
    this.postCalled = true;
  }

  reset(): void {
    this.execCalled = false;
    this.prepCalled = false;
    this.postCalled = false;
    this.shouldThrow = false;
  }
}

describe('Flow Orchestration Unit Tests', () => {
  let flow: Flow;

  beforeEach(() => {
    flow = new Flow();
  });

  describe('Basic Flow Operations', () => {
    test('should create empty flow', () => {
      // Assert
      expect(flow.getCurrentNode()).toBeNull();
      expect(flow.getFlowNodes()).toHaveLength(0);
    });

    test('should set start node', () => {
      // Arrange
      const startNode = new TestNode('start');

      // Act
      flow.start(startNode);

      // Assert
      expect(flow.getFlowNodes()).toContain(startNode);
      expect(flow["startNode"]).toBe(startNode);
    });

    test('should add nodes to flow', () => {
      // Arrange
      const node1 = new TestNode('node1');
      const node2 = new TestNode('node2');

      // Act
      flow.addNode(node1).addNode(node2);

      // Assert
      expect(flow.getFlowNodes()).toHaveLength(2);
      expect(flow.getFlowNodes()).toContain(node1);
      expect(flow.getFlowNodes()).toContain(node2);
    });

    test('should require start node for execution', async () => {
      // Act & Assert
      await expect(flow.execute()).rejects.toThrow('Flow must have a start node');
    });
  });

  describe('Flow Execution', () => {
    test('should execute single node flow', async () => {
      // Arrange
      const node = new TestNode('single-result');
      flow.start(node);

      // Act
      const result = await flow.execute();

      // Assert
      expect(result).toBe('single-result');
      expect(node.execCalled).toBe(true);
    });

    test('should execute linear chain of nodes', async () => {
      // Arrange
      const node1 = new TestNode('result1');
      const node2 = new TestNode('result2');
      const node3 = new TestNode('result3');

      node1.next(node2);
      node2.next(node3);
      
      flow.start(node1);
      flow.addNode(node2).addNode(node3);

      // Act
      const result = await flow.execute();

      // Assert
      expect(result).toBe('result3'); // Last node's result
      expect(node1.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(true);
    });

    test('should execute conditional flow paths', async () => {
      // Arrange
      const startNode = new TestNode('condition-check');
      const trueNode = new TestNode('true-path');
      const falseNode = new TestNode('false-path');

      startNode.when(result => result === 'condition-check', trueNode);
      startNode.when(result => result === 'other', falseNode);

      flow.start(startNode);
      flow.addNode(trueNode).addNode(falseNode);

      // Act
      const result = await flow.execute();

      // Assert
      expect(result).toBe('true-path');
      expect(startNode.execCalled).toBe(true);
      expect(trueNode.execCalled).toBe(true);
      expect(falseNode.execCalled).toBe(false);
    });

    test('should handle flow execution errors', async () => {
      // Arrange
      const errorNode = new TestNode('error-result');
      errorNode.shouldThrow = true;
      flow.start(errorNode);

      // Act & Assert
      await expect(flow.execute()).rejects.toThrow('Node error: error-result');
      expect(errorNode.execCalled).toBe(true);
    });

    test('should track current node during execution', async () => {
      // Arrange
      const node1 = new TestNode('result1');
      const node2 = new TestNode('result2');
      
      node1.next(node2);
      flow.start(node1);
      flow.addNode(node2);

      // Act
      await flow.execute();

      // Assert - After execution, current node should be null (flow completed)
      expect(flow.getCurrentNode()).toBeNull();
    });
  });

  describe('Flow Lifecycle', () => {
    test('should call prep on all nodes before execution', async () => {
      // Arrange
      const node1 = new TestNode('result1');
      const node2 = new TestNode('result2');
      
      flow.start(node1);
      flow.addNode(node2);

      // Act
      await flow.execute();

      // Assert
      expect(node1.prepCalled).toBe(true);
      expect(node2.prepCalled).toBe(true);
    });

    test('should call post on all nodes after execution', async () => {
      // Arrange
      const node1 = new TestNode('result1');
      const node2 = new TestNode('result2');
      
      flow.start(node1);
      flow.addNode(node2);

      // Act
      await flow.execute();

      // Assert
      expect(node1.postCalled).toBe(true);
      expect(node2.postCalled).toBe(true);
    });

    test('should handle prep errors gracefully', async () => {
      // Arrange
      const node = new TestNode('result');
      node.prep = async () => {
        throw new Error('Prep failed');
      };
      flow.start(node);

      // Act & Assert
      await expect(flow.execute()).rejects.toThrow('Prep failed');
    });

    test('should handle post errors gracefully', async () => {
      // Arrange
      const node = new TestNode('result');
      node.post = async (_result: any) => {
        throw new Error('Post failed');
      };
      flow.start(node);

      // Act & Assert
      await expect(flow.execute()).rejects.toThrow('Post failed');
    });
  });

  describe('Flow with BaseNode Integration', () => {
    test('should support flow as next node', async () => {
      // Arrange
      const node1 = new TestNode('result1');
      const subFlowNode = new TestNode('sub-result');
      const subFlow = new Flow();
      
      subFlow.start(subFlowNode);
      node1.next(subFlow);
      
      flow.start(node1);
      flow.addNode(subFlow);

      // Act
      const result = await flow.execute();

      // Assert
      expect(result).toBe('sub-result');
      expect(node1.execCalled).toBe(true);
      expect(subFlowNode.execCalled).toBe(true);
    });

    test('should support nested flows', async () => {
      // Arrange
      const outerNode = new TestNode('outer');
      const innerNode1 = new TestNode('inner1');
      const innerNode2 = new TestNode('inner2');
      
      innerNode1.next(innerNode2);
      
      const innerFlow = new Flow();
      innerFlow.start(innerNode1);
      innerFlow.addNode(innerNode2);
      
      outerNode.next(innerFlow);
      
      flow.start(outerNode);
      flow.addNode(innerFlow);

      // Act
      const result = await flow.execute();

      // Assert
      expect(result).toBe('inner2');
      expect(outerNode.execCalled).toBe(true);
      expect(innerNode1.execCalled).toBe(true);
      expect(innerNode2.execCalled).toBe(true);
    });
  });
});

describe('SequentialFlow Unit Tests', () => {
  describe('Sequential Execution', () => {
    test('should execute nodes in sequence', async () => {
      // Arrange
      const node1 = new TestNode('first', 50);
      const node2 = new TestNode('second', 50);
      const node3 = new TestNode('third', 50);
      
      const seqFlow = new SequentialFlow([node1, node2, node3]);

      // Act
      const startTime = Date.now();
      const result = await seqFlow.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('third');
      expect(endTime - startTime).toBeGreaterThanOrEqual(140); // Sequential execution takes time
      expect(node1.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(true);
    });

    test('should require at least one node', () => {
      // Act & Assert
      expect(() => new SequentialFlow([])).toThrow('SequentialFlow requires at least one node');
    });

    test('should stop on first error by default', async () => {
      // Arrange
      const node1 = new TestNode('first');
      const node2 = new TestNode('error');
      const node3 = new TestNode('third');
      
      node2.shouldThrow = true;
      
      const seqFlow = new SequentialFlow([node1, node2, node3]);

      // Act & Assert
      await expect(seqFlow.execute()).rejects.toThrow('Node error: error');
      expect(node1.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(false); // Should not reach third node
    });

    test('should chain nodes correctly', () => {
      // Arrange
      const node1 = new TestNode('first');
      const node2 = new TestNode('second');
      const node3 = new TestNode('third');
      
      const seqFlow = new SequentialFlow([node1, node2, node3]);

      // Assert
      expect(seqFlow.getFlowNodes()).toHaveLength(3);
      expect(node1["nextNodes"]).toContain(node2);
      expect(node2["nextNodes"]).toContain(node3);
    });
  });

  describe('Sequential Flow Edge Cases', () => {
    test('should handle single node sequential flow', async () => {
      // Arrange
      const singleNode = new TestNode('only');
      const seqFlow = new SequentialFlow([singleNode]);

      // Act
      const result = await seqFlow.execute();

      // Assert
      expect(result).toBe('only');
      expect(singleNode.execCalled).toBe(true);
    });

    test('should handle large sequential chains', async () => {
      // Arrange
      const nodes = Array.from({ length: 100 }, (_, i) => new TestNode(`node-${i}`));
      const seqFlow = new SequentialFlow(nodes);

      // Act
      const result = await seqFlow.execute();

      // Assert
      expect(result).toBe('node-99');
      nodes.forEach(node => {
        expect(node.execCalled).toBe(true);
      });
    });
  });
});

describe('ParallelFlow Unit Tests', () => {
  describe('Parallel Execution', () => {
    test('should execute nodes in parallel', async () => {
      // Arrange
      const node1 = new TestNode('first', 100);
      const node2 = new TestNode('second', 100);
      const node3 = new TestNode('third', 100);
      
      const parallelFlow = new ParallelFlow([node1, node2, node3]);

      // Act
      const startTime = Date.now();
      const result = await parallelFlow.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toEqual(['first', 'second', 'third']);
      expect(endTime - startTime).toBeLessThan(200); // Parallel execution should be faster
      expect(node1.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(true);
    });

    test('should require at least one node', () => {
      // Act & Assert
      expect(() => new ParallelFlow([])).toThrow('ParallelFlow requires at least one node');
    });

    test('should fail fast if any node fails', async () => {
      // Arrange
      const node1 = new TestNode('success', 100);
      const node2 = new TestNode('error', 50);
      const node3 = new TestNode('success', 200);
      
      node2.shouldThrow = true;
      
      const parallelFlow = new ParallelFlow([node1, node2, node3]);

      // Act & Assert
      await expect(parallelFlow.execute()).rejects.toThrow('Node error: error');
    });

    test('should handle mixed execution times', async () => {
      // Arrange
      const fastNode = new TestNode('fast', 25);
      const mediumNode = new TestNode('medium', 75);
      const slowNode = new TestNode('slow', 150);
      
      const parallelFlow = new ParallelFlow([slowNode, fastNode, mediumNode]);

      // Act
      const result = await parallelFlow.execute();

      // Assert
      expect(result).toEqual(['slow', 'fast', 'medium']); // Order matches input order
    });

    test('should handle empty results', async () => {
      // Arrange
      const node1 = new TestNode(null);
      const node2 = new TestNode(undefined);
      const node3 = new TestNode('');
      
      const parallelFlow = new ParallelFlow([node1, node2, node3]);

      // Act
      const result = await parallelFlow.execute();

      // Assert
      expect(result).toEqual([null, undefined, '']);
    });
  });

  describe('Parallel Flow Performance', () => {
    test('should demonstrate parallel speedup', async () => {
      // Arrange
      const nodes = Array.from({ length: 5 }, (_, i) => new TestNode(`result-${i}`, 100));
      const parallelFlow = new ParallelFlow(nodes);

      // Act
      const startTime = Date.now();
      const result = await parallelFlow.execute();
      const endTime = Date.now();

      // Assert
      expect(result).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(300); // Much faster than 500ms sequential
    });

    test('should handle high concurrency', async () => {
      // Arrange
      const nodes = Array.from({ length: 50 }, (_, i) => new TestNode(`concurrent-${i}`, 10));
      const parallelFlow = new ParallelFlow(nodes);

      // Act
      const result = await parallelFlow.execute();

      // Assert
      expect(result).toHaveLength(50);
      nodes.forEach(node => {
        expect(node.execCalled).toBe(true);
      });
    });
  });
});

describe('ConditionalFlow Unit Tests', () => {
  describe('Conditional Execution', () => {
    test('should execute true branch when condition is met', async () => {
      // Arrange
      const trueNode = new TestNode('true-executed');
      const falseNode = new TestNode('false-executed');
      
      const condition = (input: any) => input === 'execute-true';
      const conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
      
      conditionalFlow.setParams({ conditionInput: 'execute-true' });

      // Act
      const result = await conditionalFlow.execute();

      // Assert
      expect(result).toBe('true-executed');
      expect(trueNode.execCalled).toBe(true);
      expect(falseNode.execCalled).toBe(false);
    });

    test('should execute false branch when condition is not met', async () => {
      // Arrange
      const trueNode = new TestNode('true-executed');
      const falseNode = new TestNode('false-executed');
      
      const condition = (input: any) => input === 'execute-true';
      const conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
      
      conditionalFlow.setParams({ conditionInput: 'execute-false' });

      // Act
      const result = await conditionalFlow.execute();

      // Assert
      expect(result).toBe('false-executed');
      expect(trueNode.execCalled).toBe(false);
      expect(falseNode.execCalled).toBe(true);
    });

    test('should handle complex conditions', async () => {
      // Arrange
      const successNode = new TestNode('success-path');
      const failureNode = new TestNode('failure-path');
      
      const complexCondition = (input: any) => {
        return input && input.status === 'success' && input.code === 200;
      };
      
      const conditionalFlow = new ConditionalFlow(complexCondition, successNode, failureNode);
      
      conditionalFlow.setParams({ 
        conditionInput: { status: 'success', code: 200, data: 'test' }
      });

      // Act
      const result = await conditionalFlow.execute();

      // Assert
      expect(result).toBe('success-path');
      expect(successNode.execCalled).toBe(true);
      expect(failureNode.execCalled).toBe(false);
    });

    test('should handle null/undefined condition input', async () => {
      // Arrange
      const trueNode = new TestNode('true-executed');
      const falseNode = new TestNode('false-executed');
      
      const condition = (input: any) => !!input;
      const conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
      
      conditionalFlow.setParams({ conditionInput: null });

      // Act
      const result = await conditionalFlow.execute();

      // Assert
      expect(result).toBe('false-executed');
      expect(falseNode.execCalled).toBe(true);
    });

    test('should handle condition evaluation errors', async () => {
      // Arrange
      const trueNode = new TestNode('true-executed');
      const falseNode = new TestNode('false-executed');
      
      const faultyCondition = (_input: any) => {
        throw new Error('Condition evaluation failed');
      };
      
      const conditionalFlow = new ConditionalFlow(faultyCondition, trueNode, falseNode);
      
      conditionalFlow.setParams({ conditionInput: 'test' });

      // Act & Assert
      await expect(conditionalFlow.execute()).rejects.toThrow('Condition evaluation failed');
    });
  });

  describe('Conditional Flow Composition', () => {
    test('should support nested conditional flows', async () => {
      // Arrange
      const innerTrueNode = new TestNode('inner-true');
      const innerFalseNode = new TestNode('inner-false');
      const outerFalseNode = new TestNode('outer-false');
      
      const innerCondition = (input: any) => input.level === 'inner';
      const outerCondition = (input: any) => input.type === 'nested';
      
      const innerFlow = new ConditionalFlow(innerCondition, innerTrueNode, innerFalseNode);
      const outerFlow = new ConditionalFlow(outerCondition, innerFlow, outerFalseNode);
      
      innerFlow.setParams({ conditionInput: { level: 'inner', type: 'nested' } });
      outerFlow.setParams({ conditionInput: { type: 'nested' } });

      // Act
      const result = await outerFlow.execute();

      // Assert
      expect(result).toBe('inner-true');
      expect(innerTrueNode.execCalled).toBe(true);
      expect(innerFalseNode.execCalled).toBe(false);
      expect(outerFalseNode.execCalled).toBe(false);
    });

    test('should support conditional flow in sequential chain', async () => {
      // Arrange
      const setupNode = new TestNode('setup');
      const trueNode = new TestNode('conditional-true');
      const falseNode = new TestNode('conditional-false');
      const cleanupNode = new TestNode('cleanup');
      
      const condition = (input: any) => input === 'proceed';
      const conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
      conditionalFlow.setParams({ conditionInput: 'proceed' });
      
      const seqFlow = new SequentialFlow([setupNode, conditionalFlow, cleanupNode]);

      // Act
      const result = await seqFlow.execute();

      // Assert
      expect(result).toBe('cleanup');
      expect(setupNode.execCalled).toBe(true);
      expect(trueNode.execCalled).toBe(true);
      expect(falseNode.execCalled).toBe(false);
      expect(cleanupNode.execCalled).toBe(true);
    });
  });
});

describe('Flow Error Handling and Edge Cases', () => {
  test('should handle flows with no nodes gracefully', async () => {
    // Arrange
    const emptyFlow = new Flow();
    
    // Act & Assert
    await expect(emptyFlow.execute()).rejects.toThrow('Flow must have a start node');
  });

  test('should handle circular flow references', async () => {
    // Arrange
    const flow1 = new Flow();
    const flow2 = new Flow();
    const node1 = new TestNode('node1');
    const node2 = new TestNode('node2');
    
    flow1.start(node1);
    flow2.start(node2);
    
    // Create potential circular reference with termination
    let executionCount = 0;
    node1.exec = async () => {
      executionCount++;
      return executionCount < 2 ? "continue" : 'stop';
    };
    
    node1.when(result => result === "continue", flow1); // Self-reference
    node1.when(result => result === 'stop', node2);

    // Act
    const result = await flow1.execute();

    // Assert
    expect(result).toBe('node2');
    expect(executionCount).toBe(2);
  });

  test('should maintain flow state during complex execution', async () => {
    // Arrange
    const flow = new Flow();
    const node1 = new TestNode('first');
    const node2 = new TestNode('second');
    const node3 = new TestNode('third');
    
    node1.next(node2);
    node2.next(node3);
    
    flow.start(node1);
    flow.addNode(node2).addNode(node3);

    // Act
    const result = await flow.execute();

    // Assert
    expect(result).toBe('third');
    expect(flow.getFlowNodes()).toHaveLength(3);
    expect(flow.getCurrentNode()).toBeNull(); // Flow completed
  });
});