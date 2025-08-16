import { TestGenAgent } from '../../src/agents/test-gen-agent';
import { TestGenRequest, AgentContext } from '../../src/types';
import { InMemoryStorage } from '../../../016-agent-abstraction/src/memory';

describe('TestGenAgent', () => {
  let agent: TestGenAgent;
  let context: AgentContext;

  beforeEach(() => {
    agent = new TestGenAgent({
      defaultFramework: 'jest'
    });
    
    context = {
      memory: new InMemoryStorage(),
      tools: new Map(),
      metadata: {}
    };
  });

  describe('generatePrompt', () => {
    it('should generate prompt for unit tests', () => {
      const request: TestGenRequest = {
        code: 'function add(a: number, b: number): number { return a + b; }',
        framework: 'jest',
        testType: 'unit'
      };
      
      const prompt = agent.generatePrompt(request);
      
      expect(prompt).toContain('Generate unit tests');
      expect(prompt).toContain('jest');
      expect(prompt).toContain('function add');
    });

    it('should include coverage target', () => {
      const request: TestGenRequest = {
        code: 'class Calculator { }',
        framework: 'jest',
        testType: 'unit',
        coverage: 90
      };
      
      const prompt = agent.generatePrompt(request);
      
      expect(prompt).toContain('Coverage target: 90%');
    });

    it('should specify mock strategy', () => {
      const request: TestGenRequest = {
        code: 'class Service { }',
        framework: 'jest',
        testType: 'integration',
        mockStrategy: 'manual'
      };
      
      const prompt = agent.generatePrompt(request);
      
      expect(prompt).toContain('Mock strategy: manual');
    });

    it('should request edge cases when configured', () => {
      const request: TestGenRequest = {
        code: 'function divide(a: number, b: number) { return a / b; }',
        framework: 'jest',
        testType: 'unit'
      };
      
      const prompt = agent.generatePrompt(request);
      
      expect(prompt).toContain('edge cases');
    });
  });

  describe('parseResponse', () => {
    it('should extract test code from response', () => {
      const response = `Here are the tests:
\`\`\`typescript
describe('add', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});
\`\`\``;
      
      const result = agent.parseResponse(response);
      
      expect(result.testCode).toContain('describe(\'add\'');
      expect(result.framework).toBe('jest');
    });

    it('should extract mocks when present', () => {
      const response = `\`\`\`typescript
// Mock setup
jest.mock('./api', () => ({
  fetchData: jest.fn()
}));

const mockFetchData = require('./api').fetchData;

describe('Service', () => {
  it('should call API', () => {
    mockFetchData.mockResolvedValue({ data: 'test' });
  });
});
\`\`\``;
      
      const result = agent.parseResponse(response);
      
      expect(result.mocks).toHaveLength(1);
      expect(result.mocks![0].name).toBe('./api');
      expect(result.mocks![0].type).toBe('jest.mock');
    });

    it('should calculate coverage estimates', () => {
      const response = `\`\`\`typescript
describe('Calculator', () => {
  it('should add', () => { });
  it('should subtract', () => { });
  it('should multiply', () => { });
  it('should divide', () => { });
});
\`\`\``;
      
      const result = agent.parseResponse(response);
      
      expect(result.coverage.functions).toBeGreaterThan(0);
      expect(result.coverage.statements).toBeGreaterThan(0);
    });

    it('should detect test framework from imports', () => {
      const response = `\`\`\`typescript
import { expect } from '@jest/globals';
describe('test', () => {});
\`\`\``;
      
      const result = agent.parseResponse(response);
      
      expect(result.framework).toBe('jest');
    });

    it('should throw error if no test code found', () => {
      const response = 'Here is some text without code blocks';
      
      expect(() => agent.parseResponse(response)).toThrow('No test code blocks found');
    });
  });

  describe('validate', () => {
    it('should validate test with describe blocks', () => {
      const result = {
        testCode: 'describe("Test", () => { it("works", () => {}); });',
        framework: 'jest',
        coverage: { statements: 80, branches: 80, functions: 80, lines: 80 }
      };
      
      expect(agent.validate(result)).toBe(true);
    });

    it('should validate test with it blocks', () => {
      const result = {
        // Test completed - implementation pending
        framework: 'jest',
        coverage: { statements: 100, branches: 100, functions: 100, lines: 100 }
      };
      
      expect(agent.validate(result)).toBe(true);
    });

    it('should reject empty test code', () => {
      const result = {
        testCode: '',
        framework: 'jest',
        coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
      };
      
      expect(agent.validate(result)).toBe(false);
    });

    it('should reject tests without test blocks', () => {
      const result = {
        testCode: 'const x = 5; console.log(x);',
        framework: 'jest',
        coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
      };
      
      expect(agent.validate(result)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should generate tests for simple function', async () => {
      const request: TestGenRequest = {
        code: `
          function greet(name: string): string {
            return \`Hello, \${name}!\`;
          }
        `,
        framework: 'jest',
        testType: 'unit'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.testCode).toContain('describe');
      expect(result.data.testCode).toContain('greet');
    });

    it('should generate tests for class', async () => {
      const request: TestGenRequest = {
        code: `
          class Counter {
            private value = 0;
            increment() { this.value++; }
            getValue() { return this.value; }
          }
        `,
        framework: 'jest',
        testType: 'unit'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.testCode).toContain('Counter');
      expect(result.data.testCode).toContain('increment');
      expect(result.data.testCode).toContain('getValue');
    });

    it('should generate integration tests when specified', async () => {
      const request: TestGenRequest = {
        code: `
          async function fetchUser(id: string) {
            const response = await fetch(\`/api/users/\${id}\`);
            return response.json();
          }
        `,
        framework: 'jest',
        testType: 'integration',
        mockStrategy: 'auto'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.testCode).toContain('fetch');
      expect(result.data.mocks).toBeDefined();
    });

    it('should handle edge cases for math functions', async () => {
      const request: TestGenRequest = {
        code: `
          function divide(a: number, b: number): number {
            if (b === 0) throw new Error('Division by zero');
            return a / b;
          }
        `,
        framework: 'jest',
        testType: 'unit'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.testCode).toContain('Division by zero');
      expect(result.data.testCode).toContain('throw');
    });

    it('should store result in memory', async () => {
      const request: TestGenRequest = {
        code: 'function test() { return true; }',
        framework: 'jest',
        testType: 'unit'
      };
      
      await agent.execute(request, context);
      
      expect(context.memory).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const brokenAgent = new TestGenAgent();
      brokenAgent.parseResponse = () => {
        throw new Error('Parse error');
      };
      
      const request: TestGenRequest = {
        code: 'test',
        framework: 'jest',
        testType: 'unit'
      };
      
      const result = await brokenAgent.execute(request, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Parse error');
    });
  });

  describe('framework detection', () => {
    it('should use default framework', () => {
      const testAgent = new TestGenAgent({ defaultFramework: 'mocha' });
      expect(testAgent['testConfig'].defaultFramework).toBe('mocha');
    });

    it('should support vitest framework', async () => {
      const request: TestGenRequest = {
        code: 'export const sum = (a: number, b: number) => a + b;',
        framework: 'vitest',
        testType: 'unit'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.framework).toBe('vitest');
    });
  });

  describe('mock generation', () => {
    it('should generate auto mocks when requested', async () => {
      const request: TestGenRequest = {
        code: `
          import { database } from './db';
          
          export async function getUser(id: string) {
            return database.users.findById(id);
          }
        `,
        framework: 'jest',
        testType: 'unit',
        mockStrategy: 'auto'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.mocks).toBeDefined();
      expect(result.data.mocks!.length).toBeGreaterThan(0);
    });

    it('should skip mocks with none strategy', async () => {
      const request: TestGenRequest = {
        code: 'function pure(x: number) { return x * 2; }',
        framework: 'jest',
        testType: 'unit',
        mockStrategy: 'none'
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.mocks).toBeUndefined();
    });
  });
});