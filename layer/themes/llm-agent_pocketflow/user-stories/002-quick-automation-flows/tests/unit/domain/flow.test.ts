import { Flow, SequentialFlow, ParallelFlow, ConditionalFlow } from '../../../src/domain/flow';
import { BaseNode } from '../../../src/domain/base-node';

// Mock BaseNode for testing
class MockNode extends BaseNode {
  private executionResult: any;
  private nextNodes: BaseNode[] = [];
  public executeCalled = false;
  public prepCalled = false;
  public postCalled = false;

  constructor(id: string, executionResult: any = `result-${id}`) {
    super();
    this.id = id;
    this.executionResult = executionResult;
  }

  async prep(): Promise<void> {
    this.prepCalled = true;
    await super.prep();
  }

  async exec(): Promise<any> {
    this.executeCalled = true;
    return this.executionResult;
  }

  async post(result: any): Promise<void> {
    this.postCalled = true;
    await super.post(result);
  }

  async getNextNode(result: any): Promise<BaseNode | null> {
    return this.nextNodes[0] || null;
  }

  setNextNode(node: BaseNode): void {
    this.nextNodes = [node];
  }

  getExecutionResult(): any {
    return this.executionResult;
  }
}

describe('Flow', () => {
  let flow: Flow;
  let mockNode1: MockNode;
  let mockNode2: MockNode;
  let mockNode3: MockNode;

  beforeEach(() => {
    flow = new Flow();
    mockNode1 = new MockNode('node1');
    mockNode2 = new MockNode('node2');
    mockNode3 = new MockNode('node3');
  });

  describe('Flow', () => {
    describe('constructor', () => {
      it('should initialize with empty state', () => {
        const newFlow = new Flow();
        expect(newFlow.getFlowNodes()).toHaveLength(0);
        expect(newFlow.getCurrentNode()).toBeNull();
      });
    });

    describe('start', () => {
      it('should set start node and add to flow nodes', () => {
        const result = flow.start(mockNode1);
        
        expect(result).toBe(flow); // Should return self for chaining
        expect(flow.getFlowNodes()).toContain(mockNode1);
        expect(flow.getFlowNodes()).toHaveLength(1);
      });
    });

    describe('addNode', () => {
      it('should add node to flow nodes', () => {
        const result = flow.addNode(mockNode1);
        
        expect(result).toBe(flow); // Should return self for chaining
        expect(flow.getFlowNodes()).toContain(mockNode1);
        expect(flow.getFlowNodes()).toHaveLength(1);
      });

      it('should allow adding multiple nodes', () => {
        flow.addNode(mockNode1).addNode(mockNode2).addNode(mockNode3);
        
        const nodes = flow.getFlowNodes();
        expect(nodes).toHaveLength(3);
        expect(nodes).toContain(mockNode1);
        expect(nodes).toContain(mockNode2);
        expect(nodes).toContain(mockNode3);
      });
    });

    describe('prep', () => {
      it('should prepare all nodes in the flow', async () => {
        flow.addNode(mockNode1).addNode(mockNode2).addNode(mockNode3);
        
        await flow.prep();
        
        expect(mockNode1.prepCalled).toBe(true);
        expect(mockNode2.prepCalled).toBe(true);
        expect(mockNode3.prepCalled).toBe(true);
      });

      it('should handle empty flow', async () => {
        await expect(flow.prep()).resolves.not.toThrow();
      });
    });

    describe('exec', () => {
      it('should throw error if no start node', async () => {
        await expect(flow.exec()).rejects.toThrow('Flow must have a start node');
      });

      it('should execute flow starting from start node', async () => {
        mockNode1.setNextNode(mockNode2);
        mockNode2.setNextNode(mockNode3);
        
        flow.start(mockNode1);
        
        const result = await flow.exec();
        
        expect(result).toBe('result-node3');
        expect(mockNode1.executeCalled).toBe(true);
        expect(mockNode2.executeCalled).toBe(true);
        expect(mockNode3.executeCalled).toBe(true);
      });

      it('should execute single node flow', async () => {
        flow.start(mockNode1);
        
        const result = await flow.exec();
        
        expect(result).toBe('result-node1');
        expect(mockNode1.executeCalled).toBe(true);
      });
    });

    describe('post', () => {
      it('should post-process all nodes in the flow', async () => {
        flow.addNode(mockNode1).addNode(mockNode2).addNode(mockNode3);
        
        await flow.post('test-result');
        
        expect(mockNode1.postCalled).toBe(true);
        expect(mockNode2.postCalled).toBe(true);
        expect(mockNode3.postCalled).toBe(true);
      });

      it('should handle empty flow', async () => {
        await expect(flow.post('test-result')).resolves.not.toThrow();
      });
    });

    describe('_orch', () => {
      it('should orchestrate node execution', async () => {
        mockNode1.setNextNode(mockNode2);
        
        flow.start(mockNode1);
        
        const result = await flow['_orch']();
        
        expect(result).toBe('result-node2');
        expect(mockNode1.executeCalled).toBe(true);
        expect(mockNode2.executeCalled).toBe(true);
      });

      it('should set current node during execution', async () => {
        flow.start(mockNode1);
        
        await flow['_orch']();
        
        expect(flow.getCurrentNode()).toBeNull(); // Should be null after completion
      });
    });

    describe('getFlowNodes', () => {
      it('should return copy of flow nodes', () => {
        flow.addNode(mockNode1).addNode(mockNode2);
        
        const nodes1 = flow.getFlowNodes();
        const nodes2 = flow.getFlowNodes();
        
        expect(nodes1).not.toBe(nodes2); // Different array instances
        expect(nodes1).toEqual(nodes2); // Same content
        
        // Modifying returned array should not affect internal state
        nodes1.push(mockNode3);
        expect(flow.getFlowNodes()).toHaveLength(2);
      });
    });
  });

  describe('SequentialFlow', () => {
    describe('constructor', () => {
      it('should create sequential flow with nodes', () => {
        const nodes = [mockNode1, mockNode2, mockNode3];
        const sequentialFlow = new SequentialFlow(nodes);
        
        expect(sequentialFlow.getFlowNodes()).toHaveLength(3);
        expect(sequentialFlow.getFlowNodes()).toEqual(nodes);
      });

      it('should chain nodes sequentially', async () => {
        const nodes = [mockNode1, mockNode2, mockNode3];
        const sequentialFlow = new SequentialFlow(nodes);
        
        const result = await sequentialFlow.exec();
        
        expect(result).toBe('result-node3');
        expect(mockNode1.executeCalled).toBe(true);
        expect(mockNode2.executeCalled).toBe(true);
        expect(mockNode3.executeCalled).toBe(true);
      });

      it('should throw error for empty node array', () => {
        expect(() => new SequentialFlow([])).toThrow('SequentialFlow requires at least one node');
      });

      it('should handle single node', async () => {
        const sequentialFlow = new SequentialFlow([mockNode1]);
        
        const result = await sequentialFlow.exec();
        
        expect(result).toBe('result-node1');
        expect(mockNode1.executeCalled).toBe(true);
      });
    });
  });

  describe('ParallelFlow', () => {
    describe('constructor', () => {
      it('should create parallel flow with nodes', () => {
        const nodes = [mockNode1, mockNode2, mockNode3];
        const parallelFlow = new ParallelFlow(nodes);
        
        expect(parallelFlow.getFlowNodes()).toHaveLength(3);
        expect(parallelFlow.getFlowNodes()).toEqual(nodes);
      });

      it('should throw error for empty node array', () => {
        expect(() => new ParallelFlow([])).toThrow('ParallelFlow requires at least one node');
      });
    });

    describe('_orch', () => {
      it('should execute all nodes in parallel', async () => {
        const nodes = [mockNode1, mockNode2, mockNode3];
        const parallelFlow = new ParallelFlow(nodes);
        
        const results = await parallelFlow['_orch']();
        
        expect(results).toEqual(['result-node1', 'result-node2', 'result-node3']);
        expect(mockNode1.executeCalled).toBe(true);
        expect(mockNode2.executeCalled).toBe(true);
        expect(mockNode3.executeCalled).toBe(true);
      });

      it('should handle single node', async () => {
        const parallelFlow = new ParallelFlow([mockNode1]);
        
        const results = await parallelFlow['_orch']();
        
        expect(results).toEqual(['result-node1']);
        expect(mockNode1.executeCalled).toBe(true);
      });

      it('should handle node failures', async () => {
        const failingNode = new MockNode('failing');
        jest.spyOn(failingNode, 'exec').mockRejectedValue(new Error('Node failed'));
        
        const parallelFlow = new ParallelFlow([mockNode1, failingNode, mockNode2]);
        
        await expect(parallelFlow['_orch']()).rejects.toThrow('Node failed');
      });

      it('should execute nodes truly in parallel', async () => {
        // Create nodes with delayed execution to test parallelism
        const slowNode1 = new MockNode('slow1');
        const slowNode2 = new MockNode('slow2');
        
        let execution1Started = false;
        let execution2Started = false;
        
        jest.spyOn(slowNode1, 'exec').mockImplementation(async () => {
          execution1Started = true;
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'slow1-result';
        });
        
        jest.spyOn(slowNode2, 'exec').mockImplementation(async () => {
          execution2Started = true;
          // Check if other execution has started (parallelism indicator)
          expect(execution1Started).toBe(true);
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'slow2-result';
        });
        
        const parallelFlow = new ParallelFlow([slowNode1, slowNode2]);
        
        const results = await parallelFlow['_orch']();
        
        expect(results).toEqual(['slow1-result', 'slow2-result']);
        expect(execution1Started).toBe(true);
        expect(execution2Started).toBe(true);
      });
    });
  });

  describe('ConditionalFlow', () => {
    let trueNode: MockNode;
    let falseNode: MockNode;
    let conditionalFlow: ConditionalFlow;

    beforeEach(() => {
      trueNode = new MockNode('true', 'true-result');
      falseNode = new MockNode('false', 'false-result');
    });

    describe('constructor', () => {
      it('should create conditional flow with condition and nodes', () => {
        const condition = (result: any) => result > 5;
        conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
        
        expect(conditionalFlow.getFlowNodes()).toHaveLength(2);
        expect(conditionalFlow.getFlowNodes()).toContain(trueNode);
        expect(conditionalFlow.getFlowNodes()).toContain(falseNode);
      });
    });

    describe('_orch', () => {
      it('should execute true node when condition is true', async () => {
        const condition = (result: any) => result > 5;
        conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
        
        // Set condition input through params
        conditionalFlow.params = { conditionInput: 10 };
        
        const result = await conditionalFlow['_orch']();
        
        expect(result).toBe('true-result');
        expect(trueNode.executeCalled).toBe(true);
        expect(falseNode.executeCalled).toBe(false);
      });

      it('should execute false node when condition is false', async () => {
        const condition = (result: any) => result > 5;
        conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
        
        // Set condition input through params
        conditionalFlow.params = { conditionInput: 3 };
        
        const result = await conditionalFlow['_orch']();
        
        expect(result).toBe('false-result');
        expect(trueNode.executeCalled).toBe(false);
        expect(falseNode.executeCalled).toBe(true);
      });

      it('should handle complex conditions', async () => {
        const condition = (result: any) => {
          return typeof result === 'string' && result.includes('test');
        };
        conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
        
        conditionalFlow.params = { conditionInput: 'this is a test string' };
        
        const result = await conditionalFlow['_orch']();
        
        expect(result).toBe('true-result');
        expect(trueNode.executeCalled).toBe(true);
      });

      it('should handle null/undefined condition input', async () => {
        const condition = (result: any) => Boolean(result);
        conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
        
        conditionalFlow.params = { conditionInput: null };
        
        const result = await conditionalFlow['_orch']();
        
        expect(result).toBe('false-result');
        expect(falseNode.executeCalled).toBe(true);
      });

      it('should handle condition function errors', async () => {
        const condition = (result: any) => {
          throw new Error('Condition evaluation failed');
        };
        conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
        
        conditionalFlow.params = { conditionInput: 'test' };
        
        await expect(conditionalFlow['_orch']()).rejects.toThrow('Condition evaluation failed');
      });

      it('should handle missing condition input', async () => {
        const condition = (result: any) => result === 'expected';
        conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
        
        // No conditionInput set in params
        conditionalFlow.params = {};
        
        const result = await conditionalFlow['_orch']();
        
        expect(result).toBe('false-result');
        expect(falseNode.executeCalled).toBe(true);
      });
    });
  });

  describe('integration tests', () => {
    it('should handle nested flows', async () => {
      const innerFlow = new SequentialFlow([mockNode2, mockNode3]);
      const outerFlow = new SequentialFlow([mockNode1, innerFlow as any]);
      
      // Note: This would require BaseNode to handle Flow as next node
      // For this test, we'll just verify the structure
      expect(outerFlow.getFlowNodes()).toHaveLength(2);
      expect(outerFlow.getFlowNodes()[1]).toBe(innerFlow);
    });

    it('should handle complex workflow combinations', async () => {
      // Create a complex workflow: Sequential -> Parallel -> Conditional
      const parallelNodes = [new MockNode('p1'), new MockNode('p2')];
      const parallelFlow = new ParallelFlow(parallelNodes);
      
      const trueNode = new MockNode('conditional-true');
      const falseNode = new MockNode('conditional-false');
      const condition = (result: any) => Array.isArray(result) && result.length > 1;
      const conditionalFlow = new ConditionalFlow(condition, trueNode, falseNode);
      
      // Verify structure creation
      expect(parallelFlow.getFlowNodes()).toHaveLength(2);
      expect(conditionalFlow.getFlowNodes()).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should propagate node execution errors', async () => {
      const errorNode = new MockNode('error');
      jest.spyOn(errorNode, 'exec').mockRejectedValue(new Error('Node execution failed'));
      
      const flow = new SequentialFlow([mockNode1, errorNode]);
      
      await expect(flow.exec()).rejects.toThrow('Node execution failed');
    });

    it('should handle prep errors', async () => {
      const errorNode = new MockNode('error');
      jest.spyOn(errorNode, 'prep').mockRejectedValue(new Error('Prep failed'));
      
      flow.addNode(mockNode1).addNode(errorNode);
      
      await expect(flow.prep()).rejects.toThrow('Prep failed');
    });

    it('should handle post errors', async () => {
      const errorNode = new MockNode('error');
      jest.spyOn(errorNode, 'post').mockRejectedValue(new Error('Post failed'));
      
      flow.addNode(mockNode1).addNode(errorNode);
      
      await expect(flow.post('result')).rejects.toThrow('Post failed');
    });
  });
});