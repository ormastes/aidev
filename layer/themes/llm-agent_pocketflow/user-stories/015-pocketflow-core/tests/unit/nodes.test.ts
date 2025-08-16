import {
  InputNode,
  TransformNode,
  FilterNode,
  MapNode,
  ReduceNode,
  OutputNode,
  DelayNode,
  ConditionalNode
} from '../../src/nodes';
import { Context } from '../../src/types';

describe('Node Implementations', () => {
  let context: Context;

  beforeEach(() => {
    context = {
      variables: new Map(),
      errors: [],
      metadata: new Map()
    };
  });

  describe("InputNode", () => {
    it('should pass through input data', async () => {
      const node = new InputNode('input1');
      const result = await node.execute({ data: 'test', context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should handle complex input data', async () => {
      const node = new InputNode('input1');
      const complexData = { foo: 'bar', nested: { value: 42 } };
      const result = await node.execute({ data: complexData, context });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(complexData);
    });
  });

  describe("TransformNode", () => {
    it('should transform data correctly', async () => {
      const node = new TransformNode("transform1", (x: number) => x * 2);
      const result = await node.execute({ data: 5, context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it('should handle transform errors', async () => {
      const node = new TransformNode("transform1", () => {
        throw new Error('Transform failed');
      });
      const result = await node.execute({ data: 5, context });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Transform failed');
    });

    it('should work with object transformations', async () => {
      const node = new TransformNode("transform1", (obj: any) => ({
        ...obj,
        transformed: true
      }));
      const result = await node.execute({ data: { value: 1 }, context });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 1, transformed: true });
    });
  });

  describe("FilterNode", () => {
    it('should pass data when predicate is true', async () => {
      const node = new FilterNode('filter1', (x: number) => x > 5);
      const result = await node.execute({ data: 10, context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it('should return null when predicate is false', async () => {
      const node = new FilterNode('filter1', (x: number) => x > 5);
      const result = await node.execute({ data: 3, context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle predicate errors', async () => {
      const node = new FilterNode('filter1', () => {
        throw new Error('Filter error');
      });
      const result = await node.execute({ data: 5, context });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Filter error');
    });
  });

  describe('MapNode', () => {
    it('should map array elements', async () => {
      const node = new MapNode('map1', (x: number) => x * 2);
      const result = await node.execute({ data: [1, 2, 3], context });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([2, 4, 6]);
    });

    it('should handle non-array input', async () => {
      const node = new MapNode('map1', (x: number) => x * 2);
      const result = await node.execute({ data: 'not array', context });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('MapNode requires array input');
    });

    it('should handle empty arrays', async () => {
      const node = new MapNode('map1', (x: number) => x * 2);
      const result = await node.execute({ data: [], context });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("ReduceNode", () => {
    it('should reduce array to single value', async () => {
      const node = new ReduceNode('reduce1', (acc: number, x: number) => acc + x, 0);
      const result = await node.execute({ data: [1, 2, 3, 4], context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it('should handle non-array input', async () => {
      const node = new ReduceNode('reduce1', (acc: number, x: number) => acc + x);
      const result = await node.execute({ data: 'not array', context });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('ReduceNode requires array input');
    });

    it('should work without initial value', async () => {
      const node = new ReduceNode('reduce1', (acc: number, x: number) => acc + x);
      const result = await node.execute({ data: [1, 2, 3], context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(6);
    });

    it('should handle complex reduction', async () => {
      const node = new ReduceNode(
        'reduce1',
        (acc: any, item: any) => ({ ...acc, [item.key]: item.value }),
        {}
      );
      const result = await node.execute({
        data: [
          { key: 'a', value: 1 },
          { key: 'b', value: 2 }
        ],
        context
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ a: 1, b: 2 });
    });
  });

  describe("OutputNode", () => {
    it('should store data in context and pass through', async () => {
      const node = new OutputNode('output1');
      const result = await node.execute({ data: 'output data', context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('output data');
      expect(context.variables.get('output')).toBe('output data');
    });
  });

  describe("DelayNode", () => {
    it('should delay execution', async () => {
      const node = new DelayNode('delay1', 50);
      const start = Date.now();
      
      const result = await node.execute({ data: 'test', context });
      const elapsed = Date.now() - start;
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it('should pass through data unchanged', async () => {
      const node = new DelayNode('delay1', 10);
      const complexData = { nested: { value: 42 } };
      
      const result = await node.execute({ data: complexData, context });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(complexData);
    });
  });

  describe("ConditionalNode", () => {
    it('should return true value when condition is true', async () => {
      const node = new ConditionalNode(
        'cond1',
        (x: number) => x > 5,
        'greater',
        'lesser'
      );
      const result = await node.execute({ data: 10, context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('greater');
    });

    it('should return false value when condition is false', async () => {
      const node = new ConditionalNode(
        'cond1',
        (x: number) => x > 5,
        'greater',
        'lesser'
      );
      const result = await node.execute({ data: 3, context });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('lesser');
    });

    it('should handle condition errors', async () => {
      const node = new ConditionalNode(
        'cond1',
        () => { throw new Error('Condition error'); },
        'true',
        'false'
      );
      const result = await node.execute({ data: 5, context });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Condition error');
    });

    it('should work with complex return values', async () => {
      const node = new ConditionalNode(
        'cond1',
        (obj: any) => obj.type === 'A',
        { result: 'Type A' },
        { result: 'Not Type A' }
      );
      
      const result1 = await node.execute({ data: { type: 'A' }, context });
      expect(result1.data).toEqual({ result: 'Type A' });
      
      const result2 = await node.execute({ data: { type: 'B' }, context });
      expect(result2.data).toEqual({ result: 'Not Type A' });
    });
  });
});