import { nodes } from '../../src/nodes';
import { createValidator } from '../../src/guards';
import { z } from 'zod';

describe('Typed Nodes', () => {
  describe('TypedInputNode', () => {
    it('should pass through input data', async () => {
      const node = nodes.input<string>('input');
      const result = await node.execute({ data: 'hello', context: {} });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should validate input data', async () => {
      const validator = createValidator(z.string().email());
      const node = nodes.input('input', validator);
      
      const validResult = await node.execute({ 
        data: 'test@example.com', 
        context: {} 
      });
      
      expect(validResult.success).toBe(true);
      expect(validResult.data).toBe('test@example.com');
      
      const invalidResult = await node.execute({ 
        data: 'invalid-email', 
        context: {} 
      });
      
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBeDefined();
    });
  });

  describe('TypedTransformNode', () => {
    it('should transform input data', async () => {
      const node = nodes.transform(
        'double',
        (n: number) => n * 2
      );
      
      const result = await node.execute({ data: 5, context: {} });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it('should handle async transformations', async () => {
      const node = nodes.transform(
        'async-transform',
        async (s: string) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return s.toUpperCase();
        }
      );
      
      const result = await node.execute({ data: 'hello', context: {} });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('HELLO');
    });

    it('should validate input and output', async () => {
      const node = nodes.transform(
        'parse-int',
        (s: string) => parseInt(s, 10),
        {
          input: createValidator(z.string().regex(/^\d+$/)),
          output: createValidator(z.number().positive())
        }
      );
      
      const validResult = await node.execute({ data: '42', context: {} });
      expect(validResult.success).toBe(true);
      expect(validResult.data).toBe(42);
      
      const invalidInput = await node.execute({ data: 'abc', context: {} });
      expect(invalidInput.success).toBe(false);
    });
  });

  describe('TypedFilterNode', () => {
    it('should filter array elements', async () => {
      const node = nodes.filter(
        'even-numbers',
        (n: number) => n % 2 === 0
      );
      
      const result = await node.execute({ 
        data: [1, 2, 3, 4, 5, 6], 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([2, 4, 6]);
    });

    it('should handle async predicates', async () => {
      const node = nodes.filter(
        'async-filter',
        async (s: string) => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return s.length > 3;
        }
      );
      
      const result = await node.execute({ 
        data: ['a', 'test', 'hi', 'hello'], 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['test', 'hello']);
    });

    it('should validate array items', async () => {
      const validator = createValidator(z.number());
      const node = nodes.filter(
        'positive',
        (n: number) => n > 0,
        validator
      );
      
      const result = await node.execute({ 
        data: [-1, 0, 1, 2, 3], 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('TypedMapNode', () => {
    it('should map array elements', async () => {
      const node = nodes.map(
        'double',
        (n: number) => n * 2
      );
      
      const result = await node.execute({ 
        data: [1, 2, 3], 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([2, 4, 6]);
    });

    it('should handle different input/output types', async () => {
      interface User {
        id: number;
        name: string;
      }
      
      const node = nodes.map<User, string>(
        'get-names',
        (user) => user.name
      );
      
      const result = await node.execute({ 
        data: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ], 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Alice', 'Bob']);
    });

    it('should provide index and array to mapper', async () => {
      const node = nodes.map(
        'with-index',
        (item: string, index: number, array: string[]) => 
          `${index + 1}/${array.length}: ${item}`
      );
      
      const result = await node.execute({ 
        data: ['a', 'b', 'c'], 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['1/3: a', '2/3: b', '3/3: c']);
    });
  });

  describe('TypedReduceNode', () => {
    it('should reduce array to single value', async () => {
      const node = nodes.reduce(
        'sum',
        (acc: number, curr: number) => acc + curr,
        0
      );
      
      const result = await node.execute({ 
        data: [1, 2, 3, 4, 5], 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(15);
    });

    it('should handle complex accumulator types', async () => {
      interface Stats {
        sum: number;
        count: number;
        min: number;
        max: number;
      }
      
      const node = nodes.reduce<number, Stats>(
        'stats',
        (acc, curr) => ({
          sum: acc.sum + curr,
          count: acc.count + 1,
          min: Math.min(acc.min, curr),
          max: Math.max(acc.max, curr)
        }),
        { sum: 0, count: 0, min: Infinity, max: -Infinity }
      );
      
      const result = await node.execute({ 
        data: [5, 2, 8, 1, 9], 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        sum: 25,
        count: 5,
        min: 1,
        max: 9
      });
    });
  });

  describe('TypedConditionalNode', () => {
    it('should evaluate conditions and set branch', async () => {
      const node = nodes.conditional(
        'check',
        (n: number) => n > 0,
        'positive',
        'non-positive'
      );
      
      const positiveResult = await node.execute({ 
        data: 5, 
        context: {} 
      });
      
      expect(positiveResult.success).toBe(true);
      expect(positiveResult.data).toBe(5);
      expect(positiveResult.context.branch).toBe('positive');
      
      const negativeResult = await node.execute({ 
        data: -3, 
        context: {} 
      });
      
      expect(negativeResult.success).toBe(true);
      expect(negativeResult.data).toBe(-3);
      expect(negativeResult.context.branch).toBe('non-positive');
    });

    it('should handle async conditions', async () => {
      const node = nodes.conditional(
        'async-check',
        async (s: string) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return s.length > 5;
        },
        'long',
        'short'
      );
      
      const result = await node.execute({ 
        data: 'hello world', 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.context.branch).toBe('long');
    });
  });

  describe('ValidationNode', () => {
    it('should pass valid data through', async () => {
      const validator = createValidator(z.string().min(3));
      const node = nodes.validation('validate', validator);
      
      const result = await node.execute({ 
        data: 'hello', 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should handle invalid data with fallback', async () => {
      const validator = createValidator(z.number().positive());
      const node = nodes.validation(
        'validate',
        validator,
        async (errors) => {
          console.log('Validation failed:', errors);
          return 1; // Default value
        }
      );
      
      const result = await node.execute({ 
        data: -5, 
        context: {} 
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
    });

    it('should fail without fallback', async () => {
      const validator = createValidator(z.string().email());
      const node = nodes.validation('validate', validator);
      
      const result = await node.execute({ 
        data: 'not-an-email', 
        context: {} 
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should catch errors in transformations', async () => {
      const node = nodes.transform(
        'error-transform',
        (n: number) => {
          if (n === 0) throw new Error('Division by zero');
          return 10 / n;
        }
      );
      
      const result = await node.execute({ data: 0, context: {} });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Division by zero');
    });

    it('should catch errors in async operations', async () => {
      const node = nodes.map(
        'async-error',
        async (n: number) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          if (n < 0) throw new Error('Negative number');
          return Math.sqrt(n);
        }
      );
      
      const result = await node.execute({ 
        data: [4, -1, 9], 
        context: {} 
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Negative number');
    });
  });
});