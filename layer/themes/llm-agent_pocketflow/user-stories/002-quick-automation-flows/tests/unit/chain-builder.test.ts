import { describe, test, expect, beforeEach } from '@jest/globals';
import { ChainBuilder, flow, chain, when } from '../../src/domain/operators.js';
import { BaseNode } from '../../src/domain/base-node.js';

// Test node implementation for chain testing
class TestNode extends BaseNode {
  public execCalled: boolean = false;
  public execResult: any;
  public execDuration: number = 0;
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

  async post(result: any): Promise<void> {
    this.postCalled = true;
  }

  reset(): void {
    this.execCalled = false;
    this.prepCalled = false;
    this.postCalled = false;
    this.shouldThrow = false;
  }
}

describe('ChainBuilder Fluent API Unit Tests', () => {
  let startNode: TestNode;
  let node2: TestNode;
  let node3: TestNode;

  beforeEach(() => {
    startNode = new TestNode('start-result');
    node2 = new TestNode('second-result');
    node3 = new TestNode('third-result');
  });

  afterEach(() => {
    startNode.reset();
    node2.reset();
    node3.reset();
  });

  describe('Basic Chain Building', () => {
    test('should create simple chain with then()', () => {
      // Act
      const builder = new ChainBuilder(startNode);
      const result = builder.then(node2);

      // Assert
      expect(result).toBeInstanceOf(ChainBuilder);
      expect(result).toBe(builder); // Should return same instance for chaining
      expect(startNode["nextNodes"]).toContain(node2);
    });

    test('should create multi-node chain', () => {
      // Act
      const builder = new ChainBuilder(startNode)
        .then(node2)
        .then(node3);

      // Assert
      expect(startNode["nextNodes"]).toContain(node2);
      expect(node2["nextNodes"]).toContain(node3);
    });

    test('should build and return root node', () => {
      // Act
      const builtNode = new ChainBuilder(startNode)
        .then(node2)
        .then(node3)
        .build();

      // Assert
      expect(builtNode).toBe(startNode);
      expect(startNode["nextNodes"]).toContain(node2);
      expect(node2["nextNodes"]).toContain(node3);
    });

    test('should execute chain directly with run()', async () => {
      // Act
      const result = await new ChainBuilder(startNode)
        .then(node2)
        .then(node3)
        .run();

      // Assert
      expect(result).toBe('third-result');
      expect(startNode.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(true);
    });
  });

  describe('Conditional Chaining', () => {
    test('should add conditional transitions with when()', () => {
      // Arrange
      const conditionalNode = new TestNode('conditional-result');
      const condition = (result: any) => result === 'start-result';

      // Act
      const builder = new ChainBuilder(startNode)
        .when(condition, conditionalNode);

      // Assert
      expect(startNode["conditions"]).toHaveLength(1);
      expect(startNode["conditions"][0].condition).toBe(condition);
      expect(startNode["conditions"][0].node).toBe(conditionalNode);
    });

    test('should support mixed then() and when() operations', () => {
      // Arrange
      const conditionalNode = new TestNode('conditional-result');
      const condition = (result: any) => result === 'start-result';

      // Act
      const builder = new ChainBuilder(startNode)
        .then(node2)
        .when(condition, conditionalNode)
        .then(node3);

      // Assert
      expect(startNode["nextNodes"]).toContain(node2);
      expect(node2["conditions"]).toHaveLength(1);
      expect(node2["nextNodes"]).toContain(node3);
    });

    test('should execute conditional path when condition matches', async () => {
      // Arrange
      const conditionalNode = new TestNode('conditional-executed');
      const condition = (result: any) => result === 'start-result';

      // Act
      const result = await new ChainBuilder(startNode)
        .when(condition, conditionalNode)
        .run();

      // Assert
      expect(result).toBe('conditional-executed');
      expect(startNode.execCalled).toBe(true);
      expect(conditionalNode.execCalled).toBe(true);
    });

    test('should execute next node when condition does not match', async () => {
      // Arrange
      const conditionalNode = new TestNode('conditional-executed');
      const condition = (result: any) => result === 'other-result';

      // Act
      const result = await new ChainBuilder(startNode)
        .when(condition, conditionalNode)
        .then(node2)
        .run();

      // Assert
      expect(result).toBe('second-result');
      expect(startNode.execCalled).toBe(true);
      expect(conditionalNode.execCalled).toBe(false);
      expect(node2.execCalled).toBe(true);
    });
  });

  describe('Flow Helper Function', () => {
    test('should create ChainBuilder with flow() helper', () => {
      // Act
      const builder = flow(startNode);

      // Assert
      expect(builder).toBeInstanceOf(ChainBuilder);
      expect(builder["rootNode"]).toBe(startNode);
      expect(builder["currentNode"]).toBe(startNode);
    });

    test('should support fluent chaining with flow() helper', async () => {
      // Act
      const result = await flow(startNode)
        .then(node2)
        .then(node3)
        .run();

      // Assert
      expect(result).toBe('third-result');
      expect(startNode.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(true);
    });
  });

  describe('BaseNode Extension (.then() method)', () => {
    test('should add then() method to BaseNode prototype', () => {
      // Assert
      expect(startNode.then).toBeDefined();
      expect(typeof startNode.then).toBe("function");
    });

    test('should create ChainBuilder when calling then() on BaseNode', () => {
      // Act
      const builder = startNode.then(node2);

      // Assert
      expect(builder).toBeInstanceOf(ChainBuilder);
      expect(startNode["nextNodes"]).toContain(node2);
    });

    test('should support method chaining on BaseNode.then()', async () => {
      // Act
      const result = await startNode
        .then(node2)
        .then(node3)
        .run();

      // Assert
      expect(result).toBe('third-result');
      expect(startNode.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(true);
    });

    test('should maintain node relationships when using BaseNode.then()', () => {
      // Act
      startNode.then(node2).then(node3);

      // Assert
      expect(startNode["nextNodes"]).toContain(node2);
      expect(node2["nextNodes"]).toContain(node3);
    });
  });

  describe('Utility Functions', () => {
    test('should chain nodes with chain() utility', () => {
      // Act
      const result = chain(startNode, node2);

      // Assert
      expect(result).toBe(startNode);
      expect(startNode["nextNodes"]).toContain(node2);
    });

    test('should add conditional with when() utility', () => {
      // Arrange
      const condition = (result: any) => result === 'test';

      // Act
      const result = when(startNode, condition, node2);

      // Assert
      expect(result).toBe(startNode);
      expect(startNode["conditions"]).toHaveLength(1);
      expect(startNode["conditions"][0].condition).toBe(condition);
      expect(startNode["conditions"][0].node).toBe(node2);
    });

    test('should support chaining utility functions', () => {
      // Arrange
      const condition = (result: any) => result === 'start-result';

      // Act
      const result = when(chain(startNode, node2), condition, node3);

      // Assert
      expect(startNode["nextNodes"]).toContain(node2);
      expect(node2["conditions"]).toHaveLength(1);
      expect(node2["conditions"][0].node).toBe(node3);
    });
  });

  describe('Complex Chain Patterns', () => {
    test('should support branching chains', async () => {
      // Arrange
      const branchA = new TestNode('branch-a');
      const branchB = new TestNode('branch-b');
      const merge = new TestNode('merge-result');
      
      const conditionA = (result: any) => result === 'start-result';
      const conditionB = (result: any) => result === 'other';

      // Act
      const builtChain = flow(startNode)
        .when(conditionA, branchA)
        .when(conditionB, branchB)
        .build();

      branchA.next(merge);
      branchB.next(merge);

      const result = await builtChain.run();

      // Assert
      expect(result).toBe('branch-a'); // Condition A matches
      expect(startNode.execCalled).toBe(true);
      expect(branchA.execCalled).toBe(true);
      expect(branchB.execCalled).toBe(false);
    });

    test('should support parallel-like chains with conditions', async () => {
      // Arrange
      const fastPath = new TestNode('fast', 25);
      const slowPath = new TestNode('slow', 100);
      
      startNode.execResult = 'choose-fast';
      const condition = (result: any) => result === 'choose-fast';

      // Act
      const result = await flow(startNode)
        .when(condition, fastPath)
        .then(slowPath) // Fallback if condition not met
        .run();

      // Assert
      expect(result).toBe('fast');
      expect(fastPath.execCalled).toBe(true);
      expect(slowPath.execCalled).toBe(false);
    });

    test('should support nested chain builders', async () => {
      // Arrange
      const subChainStart = new TestNode('sub-start');
      const subChainEnd = new TestNode('sub-end');
      
      // Build sub-chain
      const subChain = flow(subChainStart)
        .then(subChainEnd)
        .build();

      // Act
      const result = await flow(startNode)
        .then(subChain)
        .run();

      // Assert
      expect(result).toBe('sub-end');
      expect(startNode.execCalled).toBe(true);
      expect(subChainStart.execCalled).toBe(true);
      expect(subChainEnd.execCalled).toBe(true);
    });

    test('should support diamond pattern chains', async () => {
      // Arrange
      const splitNode = new TestNode('split');
      const pathA = new TestNode('path-a');
      const pathB = new TestNode('path-b');
      const joinNode = new TestNode('join');
      
      const condition = (result: any) => result === 'split';

      // Act - Create diamond pattern
      const diamond = flow(startNode)
        .then(splitNode)
        .when(condition, pathA)
        .build();
      
      pathA.next(joinNode);
      splitNode.next(joinNode); // Fallback path

      const result = await diamond.run();

      // Assert
      expect(result).toBe('join');
      expect(startNode.execCalled).toBe(true);
      expect(splitNode.execCalled).toBe(true);
      expect(pathA.execCalled).toBe(true);
      expect(joinNode.execCalled).toBe(true);
    });
  });

  describe('Error Handling in Chains', () => {
    test('should propagate errors through chain', async () => {
      // Arrange
      node2.shouldThrow = true;

      // Act & Assert
      await expect(
        flow(startNode)
          .then(node2)
          .then(node3)
          .run()
      ).rejects.toThrow('Node error: second-result');

      expect(startNode.execCalled).toBe(true);
      expect(node2.execCalled).toBe(true);
      expect(node3.execCalled).toBe(false);
    });

    test('should handle errors in conditional paths', async () => {
      // Arrange
      const errorNode = new TestNode('error');
      errorNode.shouldThrow = true;
      const condition = (result: any) => result === 'start-result';

      // Act & Assert
      await expect(
        flow(startNode)
          .when(condition, errorNode)
          .run()
      ).rejects.toThrow('Node error: error');

      expect(startNode.execCalled).toBe(true);
      expect(errorNode.execCalled).toBe(true);
    });

    test('should handle errors during chain building', () => {
      // Arrange
      const nullNode = null as any;

      // Act & Assert
      expect(() => {
        flow(startNode).then(nullNode);
      }).not.toThrow(); // ChainBuilder should handle gracefully
    });
  });

  describe('Performance and Memory', () => {
    test('should handle large chains efficiently', async () => {
      // Arrange
      const nodes = Array.from({ length: 100 }, (_, i) => 
        new TestNode(`node-${i}`, 1)
      );

      // Act
      let builder = flow(nodes[0]);
      for (let i = 1; i < nodes.length; i++) {
        builder = builder.then(nodes[i]);
      }

      const startTime = Date.now();
      const result = await builder.run();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('node-99');
      expect(endTime - startTime).toBeLessThan(500); // Should be reasonably fast
      nodes.forEach((node, index) => {
        expect(node.execCalled).toBe(true);
      });
    });

    test('should maintain correct references in complex chains', () => {
      // Arrange
      const builder = new ChainBuilder(startNode);

      // Act
      const step1 = builder.then(node2);
      const step2 = step1.when((r) => r === 'test', node3);
      const final = step2.build();

      // Assert
      expect(final).toBe(startNode);
      expect(builder.build()).toBe(startNode);
      expect(step1.build()).toBe(startNode);
      expect(step2.build()).toBe(startNode);
    });

    test('should not create memory leaks with circular references', () => {
      // Arrange & Act
      const builder = flow(startNode)
        .then(node2)
        .then(node3);

      // Create potential circular reference
      const builtChain = builder.build();
      let circularCount = 0;
      
      startNode.exec = async () => {
        circularCount++;
        return circularCount < 3 ? "continue" : 'stop';
      };
      
      startNode.when(result => result === "continue", startNode);
      node3.when(result => result === 'stop', node3);

      // Should not cause infinite loops or memory issues
      expect(() => builder.build()).not.toThrow();
    });
  });

  describe('Integration with BaseNode Features', () => {
    test('should work with BaseNode parameters', async () => {
      // Arrange
      startNode.setParams({ config: 'test-config' });

      // Act
      const result = await flow(startNode)
        .then(node2.setParams({ inherited: true }))
        .run();

      // Assert
      expect(result).toBe('second-result');
      expect(startNode['params'].config).toBe('test-config');
      expect(node2['params'].inherited).toBe(true);
    });

    test('should work with BaseNode lifecycle methods', async () => {
      // Act
      await flow(startNode)
        .then(node2)
        .then(node3)
        .run();

      // Assert
      expect(startNode.prepCalled).toBe(true);
      expect(startNode.postCalled).toBe(true);
      expect(node2.prepCalled).toBe(true);
      expect(node2.postCalled).toBe(true);
      expect(node3.prepCalled).toBe(true);
      expect(node3.postCalled).toBe(true);
    });

    test('should maintain BaseNode timing and async behavior', async () => {
      // Arrange
      startNode.execDuration = 50;
      node2.execDuration = 75;
      node3.execDuration = 25;

      // Act
      const startTime = Date.now();
      const result = await flow(startNode)
        .then(node2)
        .then(node3)
        .run();
      const endTime = Date.now();

      // Assert
      expect(result).toBe('third-result');
      expect(endTime - startTime).toBeGreaterThanOrEqual(140); // Sequential timing
    });
  });

  describe('API Consistency', () => {
    test('should provide consistent return types', () => {
      // Arrange & Act
      const builder1 = new ChainBuilder(startNode);
      const builder2 = builder1.then(node2);
      const builder3 = builder2.when(() => true, node3);
      const node = builder3.build();

      // Assert
      expect(builder1).toBeInstanceOf(ChainBuilder);
      expect(builder2).toBeInstanceOf(ChainBuilder);
      expect(builder3).toBeInstanceOf(ChainBuilder);
      expect(node).toBeInstanceOf(BaseNode);
      expect(node).toBe(startNode);
    });

    test('should support method chaining consistently', () => {
      // Act & Assert - Should not throw and should support any order
      expect(() => {
        flow(startNode)
          .then(node2)
          .when(() => true, node3)
          .then(new TestNode('final'))
          .when(() => false, new TestNode('never'))
          .build();
      }).not.toThrow();
    });

    test('should maintain immutable-like behavior', () => {
      // Arrange
      const originalBuilder = flow(startNode);
      
      // Act
      const extendedBuilder = originalBuilder.then(node2);
      const conditionalBuilder = extendedBuilder.when(() => true, node3);

      // Assert - All builders should reference the same root
      expect(originalBuilder.build()).toBe(startNode);
      expect(extendedBuilder.build()).toBe(startNode);
      expect(conditionalBuilder.build()).toBe(startNode);
      
      // But they should have accumulated the changes
      expect(startNode["nextNodes"]).toContain(node2);
      expect(node2["conditions"]).toHaveLength(1);
    });
  });
});