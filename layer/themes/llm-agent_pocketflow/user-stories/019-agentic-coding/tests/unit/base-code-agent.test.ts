import { BaseCodeAgent } from '../../src/base-code-agent';
import { AgentContext, AgentResult } from '../../src/types';
import { InMemoryStorage } from '../../../016-agent-abstraction/src/memory';

// Concrete implementation for testing
class TestCodeAgent extends BaseCodeAgent {
  constructor() {
    super('test-agent', {
      model: 'test-model',
      temperature: 0.5
    });
  }

  generatePrompt(request: any): string {
    return `Test prompt for ${request.input}`;
  }

  parseResponse(response: string): any {
    if (response === 'error') {
      throw new Error('Parse error');
    }
    return { parsed: response };
  }

  validate(result: any): boolean {
    return result.parsed !== 'invalid';
  }
}

describe("BaseCodeAgent", () => {
  let agent: TestCodeAgent;
  let context: AgentContext;

  beforeEach(() => {
    agent = new TestCodeAgent();
    context = {
      memory: new InMemoryStorage(),
      tools: new Map(),
      metadata: {}
    };
  });

  describe("constructor", () => {
    it('should initialize with name and config', () => {
      expect(agent.name).toBe('test-agent');
      expect(agent.id).toContain('test-agent');
    });

    it('should generate unique ID', () => {
      const agent2 = new TestCodeAgent();
      expect(agent.id).not.toBe(agent2.id);
    });
  });

  describe('abstract methods', () => {
    it('should require implementation of generatePrompt', () => {
      const prompt = agent.generatePrompt({ input: 'test' });
      expect(prompt).toBe('Test prompt for test');
    });

    it('should require implementation of parseResponse', () => {
      const result = agent.parseResponse('test response');
      expect(result).toEqual({ parsed: 'test response' });
    });

    it('should require implementation of validate', () => {
      expect(agent.validate({ parsed: 'valid' })).toBe(true);
      expect(agent.validate({ parsed: 'invalid' })).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute full pipeline successfully', async () => {
      const result = await agent.execute({ input: 'test' }, context);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ parsed: expect.any(String) });
      expect(result.metadata).toMatchObject({
        agent: 'test-agent',
        model: 'test-model',
        timestamp: expect.any(Number)
      });
    });

    it('should handle parse errors', async () => {
      const errorAgent = new TestCodeAgent();
      errorAgent.parseResponse = () => {
        throw new Error('Parse failed');
      };

      const result = await errorAgent.execute({ input: 'test' }, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Parse failed');
    });

    it('should handle validation failures', async () => {
      const invalidAgent = new TestCodeAgent();
      invalidAgent.validate = () => false;

      const result = await invalidAgent.execute({ input: 'test' }, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Validation failed');
    });

    it('should store result in memory when available', async () => {
      const storageSpy = jest.spyOn(context.memory!, 'store');
      
      await agent.execute({ input: 'test' }, context);
      
      expect(storageSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-agent'),
        expect.objectContaining({
          input: { input: 'test' },
          result: expect.any(Object),
          timestamp: expect.any(Number)
        })
      );
    });

    it('should work without memory context', async () => {
      const result = await agent.execute({ input: 'test' }, {});
      
      expect(result.success).toBe(true);
    });
  });

  describe("simulateResponse", () => {
    it('should generate mock response based on prompt', () => {
      const mockAgent = new TestCodeAgent();
      const response = mockAgent["simulateResponse"]('Generate a function');
      
      expect(response).toContain("function");
    });

    it('should generate different responses for different prompts', () => {
      const mockAgent = new TestCodeAgent();
      const response1 = mockAgent["simulateResponse"]('Create a class');
      const response2 = mockAgent["simulateResponse"]('Create a function');
      
      expect(response1).not.toBe(response2);
    });
  });

  describe('callLLM', () => {
    it('should use mock implementation when no LLM client available', async () => {
      const mockAgent = new TestCodeAgent();
      const result = await mockAgent['callLLM']('test prompt');
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should respect model config', () => {
      const customAgent = new TestCodeAgent();
      customAgent["codeConfig"] = {
        model: 'custom-model',
        temperature: 0.9,
        maxTokens: 1000
      };
      
      expect(customAgent["codeConfig"].model).toBe('custom-model');
      expect(customAgent["codeConfig"].temperature).toBe(0.9);
    });
  });

  describe('error handling', () => {
    it('should catch and wrap unexpected errors', async () => {
      const brokenAgent = new TestCodeAgent();
      brokenAgent.generatePrompt = () => {
        throw new Error('Unexpected error');
      };

      const result = await brokenAgent.execute({ input: 'test' }, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Unexpected error');
      expect(result.metadata?.agent).toBe('test-agent');
    });

    it('should handle null/undefined inputs gracefully', async () => {
      const result = await agent.execute(null as any, context);
      
      expect(result.success).toBeDefined();
    });
  });

  describe('metadata tracking', () => {
    it('should include agent metadata in results', async () => {
      const result = await agent.execute({ input: 'test' }, context);
      
      expect(result.metadata).toEqual({
        agent: 'test-agent',
        model: 'test-model',
        timestamp: expect.any(Number)
      });
    });

    it('should track execution time', async () => {
      const before = Date.now();
      const result = await agent.execute({ input: 'test' }, context);
      const after = Date.now();
      
      expect(result.metadata?.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.metadata?.timestamp).toBeLessThanOrEqual(after);
    });
  });
});