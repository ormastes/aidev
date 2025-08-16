import { workflow } from '../../src/builder';
import { nodes } from '../../src/nodes';
import { createValidator } from '../../src/guards';
import { z } from 'zod';

describe("WorkflowBuilder", () => {
  describe('Type-safe node connections', () => {
    it('should build a simple workflow', async () => {
      const numberValidator = createValidator(z.number());
      const stringValidator = createValidator(z.string());
      
      const flow = workflow()
        .addNode('input', nodes.input('input', numberValidator))
        .addNode('double', nodes.transform('double', (n: number) => n * 2))
        .addNode("toString", nodes.transform("toString", (n: number) => String(n), {
          input: numberValidator,
          output: stringValidator
        }))
        .addNode('output', nodes.output('output', stringValidator))
        .connect('input', 'double')
        .connect('double', "toString")
        .connect("toString", 'output')
        .build();
      
      const result = await flow.execute(42);
      
      expect(result.success).toBe(true);
      expect(result.outputs.get('output')).toBe('84');
    });

    it('should validate workflow structure', () => {
      const flow = workflow()
        .addNode('input', nodes.input('input'))
        .addNode('orphan', nodes.transform('orphan', (x) => x))
        .addNode('output', nodes.output('output'));
      
      const validation = flow.validate();
      
      expect(validation.success).toBe(false);
      expect(validation.errors).toContain("Node 'orphan' is disconnected");
    });

    it('should detect cycles', () => {
      const flow = workflow()
        .addNode('a', nodes.transform('a', (x) => x))
        .addNode('b', nodes.transform('b', (x) => x))
        .addNode('c', nodes.transform('c', (x) => x))
        .connect('a', 'b')
        .connect('b', 'c')
        .connect('c', 'a');
      
      const validation = flow.validate();
      
      expect(validation.success).toBe(false);
      expect(validation.errors).toContain('Workflow contains cycles');
    });

    it('should validate missing nodes', () => {
      const flow = workflow()
        .addNode('input', nodes.input('input'));
      
      // Use any to bypass type checking for testing invalid connections
      (flow as any).connect('input', 'missing');
      (flow as any).connect('missing', 'output');
      
      const validation = flow.validate();
      
      expect(validation.success).toBe(false);
      expect(validation.errors).toContain("Node 'missing' not found");
      expect(validation.errors).toContain("Node 'output' not found");
    });
  });

  describe('Type inference', () => {
    it('should infer types through the workflow', async () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }
      
      interface UserDTO {
        userId: number;
        displayName: string;
      }
      
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email()
      });
      
      const flow = workflow()
        .addNode('input', nodes.input<User>('input', createValidator(userSchema)))
        .addNode("transform", nodes.transform<User, UserDTO>("transform", (user) => ({
          userId: user.id,
          displayName: user.name
        })))
        .addNode('output', nodes.output<UserDTO>('output'))
        .connect('input', "transform")
        .connect("transform", 'output')
        .build();
      
      const result = await flow.execute({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      });
      
      expect(result.success).toBe(true);
      expect(result.outputs.get('output')).toEqual({
        userId: 1,
        displayName: 'John Doe'
      });
    });
  });

  describe('Transform functions', () => {
    it('should apply transform functions between nodes', async () => {
      const flow = workflow()
        .addNode('input', nodes.input<number[]>('input'))
        .addNode('sum', nodes.reduce('sum', 
          (acc: number, curr: number) => acc + curr, 
          0
        ))
        .addNode('format', nodes.transform('format', 
          (sum: number) => `Total: ${sum}`
        ))
        .addNode('output', nodes.output<string>('output'))
        .connect('input', 'sum')
        .connect('sum', 'format', (sum) => sum) // Identity transform
        .connect('format', 'output')
        .build();
      
      const result = await flow.execute([1, 2, 3, 4, 5]);
      
      expect(result.success).toBe(true);
      expect(result.outputs.get('output')).toBe('Total: 15');
    });
  });

  describe('Error handling', () => {
    it('should handle validation errors', async () => {
      const numberValidator = createValidator(z.number());
      
      const flow = workflow()
        .addNode('input', nodes.input('input', numberValidator))
        .addNode('output', nodes.output('output'))
        .connect('input', 'output')
        .build();
      
      const result = await flow.execute('not a number' as any);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should throw on invalid workflow build', () => {
      const flow = workflow()
        .addNode('a', nodes.transform('a', (x) => x))
        .connect('a', 'a'); // Self-cycle
      
      expect(() => flow.build()).toThrow('Workflow validation failed');
    });
  });
});