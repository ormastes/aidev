import { PocketFlow } from '../../src/core';
import { InputNode, TransformNode, OutputNode } from '../../src/nodes';
import { Node } from '../../src/types';

describe('PocketFlow Core', () => {
  let flow: PocketFlow;

  beforeEach(() => {
    flow = new PocketFlow();
  });

  describe('Node Management', () => {
    it('should add nodes correctly', () => {
      const node = new InputNode('input1');
      flow.addNode(node);
      
      expect(flow.nodes.has('input1')).toBe(true);
      expect(flow.nodes.get('input1')).toBe(node);
    });

    it('should initialize edge map when adding node', () => {
      const node = new InputNode('input1');
      flow.addNode(node);
      
      expect(flow.edges.has('input1')).toBe(true);
      expect(flow.edges.get('input1')).toEqual([]);
    });
  });

  describe('Edge Management', () => {
    it('should add edges correctly', () => {
      flow.addNode(new InputNode('a'));
      flow.addNode(new OutputNode('b'));
      
      flow.addEdge({ from: 'a', to: 'b' });
      
      const edges = flow.edges.get('a');
      expect(edges).toHaveLength(1);
      expect(edges![0]).toEqual({ from: 'a', to: 'b' });
    });

    it('should support multiple edges from same node', () => {
      flow.addNode(new InputNode('a'));
      flow.addNode(new OutputNode('b'));
      flow.addNode(new OutputNode('c'));
      
      flow.addEdge({ from: 'a', to: 'b' });
      flow.addEdge({ from: 'a', to: 'c' });
      
      const edges = flow.edges.get('a');
      expect(edges).toHaveLength(2);
    });

    it('should support edge transformations', () => {
      flow.addNode(new InputNode('a'));
      flow.addNode(new OutputNode('b'));
      
      const transform = (data: any) => data * 2;
      flow.addEdge({ from: 'a', to: 'b', transform });
      
      const edges = flow.edges.get('a');
      expect(edges![0].transform).toBe(transform);
    });
  });

  describe('Execution', () => {
    it('should execute single node', async () => {
      const node = new InputNode('input');
      flow.addNode(node);
      
      const result = await flow.execute({ value: 42 });
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.outputs.get('input')).toEqual({ value: 42 });
    });

    it('should execute linear flow', async () => {
      flow.addNode(new InputNode('input'));
      flow.addNode(new TransformNode('double', (x: any) => ({ value: x.value * 2 })));
      flow.addNode(new OutputNode('output'));
      
      flow.addEdge({ from: 'input', to: 'double' });
      flow.addEdge({ from: 'double', to: 'output' });
      
      const result = await flow.execute({ value: 10 });
      
      expect(result.success).toBe(true);
      expect(result.outputs.get('output')).toEqual({ value: 20 });
    });

    it('should execute parallel branches', async () => {
      flow.addNode(new InputNode('input'));
      flow.addNode(new TransformNode('double', (x: any) => x * 2));
      flow.addNode(new TransformNode('triple', (x: any) => x * 3));
      flow.addNode(new OutputNode('output1'));
      flow.addNode(new OutputNode('output2'));
      
      flow.addEdge({ from: 'input', to: 'double' });
      flow.addEdge({ from: 'input', to: 'triple' });
      flow.addEdge({ from: 'double', to: 'output1' });
      flow.addEdge({ from: 'triple', to: 'output2' });
      
      const result = await flow.execute(5);
      
      expect(result.success).toBe(true);
      expect(result.outputs.get('output1')).toBe(10);
      expect(result.outputs.get('output2')).toBe(15);
    });

    it('should handle node errors gracefully', async () => {
      const errorNode: Node = {
        id: 'error',
        type: 'error',
        execute: async () => {
          throw new Error('Test error');
        }
      };
      
      flow.addNode(new InputNode('input'));
      flow.addNode(errorNode);
      flow.addNode(new OutputNode('output'));
      
      flow.addEdge({ from: 'input', to: 'error' });
      flow.addEdge({ from: 'error', to: 'output' });
      
      const result = await flow.execute('test');
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Test error');
    });

    it('should apply edge transformations', async () => {
      flow.addNode(new InputNode('input'));
      flow.addNode(new OutputNode('output'));
      
      flow.addEdge({ 
        from: 'input', 
        to: 'output',
        transform: (data: any) => data.toUpperCase()
      });
      
      const result = await flow.execute('hello');
      
      expect(result.success).toBe(true);
      expect(result.outputs.get('output')).toBe('HELLO');
    });

    it('should handle conditional edges', async () => {
      flow.addNode(new InputNode('input'));
      flow.addNode(new OutputNode('positive'));
      flow.addNode(new OutputNode('negative'));
      
      flow.addEdge({ 
        from: 'input', 
        to: 'positive',
        condition: (data: number) => data > 0
      });
      
      flow.addEdge({ 
        from: 'input', 
        to: 'negative',
        condition: (data: number) => data <= 0
      });
      
      const result1 = await flow.execute(5);
      expect(result1.outputs.has('positive')).toBe(true);
      expect(result1.outputs.has('negative')).toBe(false);
      
      const result2 = await flow.execute(-5);
      expect(result2.outputs.has('positive')).toBe(false);
      expect(result2.outputs.has('negative')).toBe(true);
    });

    it('should track execution time', async () => {
      flow.addNode(new InputNode('input'));
      
      const result = await flow.execute();
      
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(1000);
    });

    it('should handle missing nodes', async () => {
      flow.addNode(new InputNode('input'));
      flow.addEdge({ from: 'input', to: 'missing' });
      
      const result = await flow.execute();
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Node missing not found');
    });

    it('should detect and execute entry nodes correctly', async () => {
      // Create a flow with multiple entry points
      flow.addNode(new InputNode('entry1'));
      flow.addNode(new InputNode('entry2'));
      flow.addNode(new TransformNode('merge', (data: any[]) => data.join(',')));
      
      flow.addEdge({ from: 'entry1', to: 'merge' });
      flow.addEdge({ from: 'entry2', to: 'merge' });
      
      const result = await flow.execute();
      
      expect(result.success).toBe(true);
      expect(result.outputs.has('entry1')).toBe(true);
      expect(result.outputs.has('entry2')).toBe(true);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle diamond-shaped workflow', async () => {
      flow.addNode(new InputNode('start'));
      flow.addNode(new TransformNode('left', (x: number) => x + 1));
      flow.addNode(new TransformNode('right', (x: number) => x * 2));
      flow.addNode(new TransformNode('join', (data: number[]) => data.reduce((a, b) => a + b, 0)));
      
      flow.addEdge({ from: 'start', to: 'left' });
      flow.addEdge({ from: 'start', to: 'right' });
      flow.addEdge({ from: 'left', to: 'join' });
      flow.addEdge({ from: 'right', to: 'join' });
      
      const result = await flow.execute(10);
      
      expect(result.success).toBe(true);
      // left: 10 + 1 = 11, right: 10 * 2 = 20, join: 11 + 20 = 31
      expect(result.outputs.get('join')).toBe(31);
    });

    it('should handle cyclic dependencies by not executing', async () => {
      flow.addNode(new InputNode('a'));
      flow.addNode(new TransformNode('b', x => x));
      flow.addNode(new TransformNode('c', x => x));
      
      flow.addEdge({ from: 'a', to: 'b' });
      flow.addEdge({ from: 'b', to: 'c' });
      flow.addEdge({ from: 'c', to: 'b' }); // Creates cycle
      
      const result = await flow.execute('test');
      
      // The execution should In Progress but 'c' won't execute due to cycle
      expect(result.outputs.has('a')).toBe(true);
      expect(result.outputs.has('b')).toBe(true);
    });
  });
});