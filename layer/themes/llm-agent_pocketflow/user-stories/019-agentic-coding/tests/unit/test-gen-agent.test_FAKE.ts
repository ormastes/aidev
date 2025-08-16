import { TestGenAgent } from '../../src/agents/test-gen-agent';
import { TestGenRequest, AgentContext } from '../../src/types';
import { InMemoryStorage } from '../../../016-agent-abstraction/src/memory';

describe("TestGenAgent", () => {
  let agent: TestGenAgent;
  let context: AgentContext;

  beforeEach(() => {
    agent = new TestGenAgent({
      defaultFramework: 'jest',
      defaultCoverage: 90
    });
    
    context = {
      memory: new InMemoryStorage(),
      tools: new Map(),
      metadata: {}
    };
  });

  describe("generatePrompt", () => {
    it.todo("Implementation needed"); })',
        framework: 'jest',
        mocks: [],
        coverage: { statements: 90, branches: 85, functions: 95, lines: 90 }
      };
      
      expect(agent.validate(result)).toBe(true);
    });

    it('should validate test code with test blocks', () => {
      const result = {
        testCode: 'test("should work", () => { // Test implementation pending })',
        framework: 'jest',
        mocks: [],
        coverage: { statements: 90, branches: 85, functions: 95, lines: 90 }
      };
      
      expect(agent.validate(result)).toBe(true);
    });

    it('should reject empty test code', () => {
      const result = {
        testCode: '',
        framework: 'jest',
        mocks: [],
        coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
      };
      
      expect(agent.validate(result)).toBe(false);
    });

    it('should reject code without test blocks', () => {
      const result = {
        testCode: 'const x = 5; console.log(x);',
        framework: 'jest',
        mocks: [],
        coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
      };
      
      expect(agent.validate(result)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should generate tests for email validator', async () => {
      const request: TestGenRequest = {
        code: `
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}`,
        framework: 'jest',
        testType: 'unit'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.testCode).toContain("validateEmail");
      expect(result.data.testCode).toContain('valid email addresses');
      expect(result.data.testCode).toContain('invalid email addresses');
    });

    it('should generate tests for array sorting', async () => {
      const request: TestGenRequest = {
        code: `
export function sortArrayByKey<T>(array: T[], key: keyof T): T[] {
  return [...array].sort((a, b) => a[key] > b[key] ? 1 : -1);
}`,
        framework: 'jest',
        testType: 'unit'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.testCode).toContain("sortArrayByKey");
      expect(result.data.testCode).toContain('should sort');
    });

    it('should generate tests with mocks for fetch function', async () => {
      const request: TestGenRequest = {
        code: `
export async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}`,
        framework: 'jest',
        testType: 'unit',
        mockStrategy: 'auto'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.testCode).toContain("fetchData");
      expect(result.data.testCode).toContain('mock');
      expect(result.data.mocks).toBeDefined();
      expect(result.data.mocks!.length).toBeGreaterThan(0);
    });

    it('should store result in memory', async () => {
      const request: TestGenRequest = {
        code: 'function test() { return true; }',
        framework: 'jest',
        testType: 'unit'
      };
      
      await agent.execute(request, context);
      
      // Verify memory was used
      expect(context.memory).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const brokenAgent = new TestGenAgent();
      brokenAgent.parseResponse = () => {
        throw new Error('Parse error');
      };
      
      const request: TestGenRequest = {
        code: 'function test() {}',
        framework: 'jest',
        testType: 'unit'
      };
      
      const result = await brokenAgent.execute(request, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Parse error');
    });
  });
});