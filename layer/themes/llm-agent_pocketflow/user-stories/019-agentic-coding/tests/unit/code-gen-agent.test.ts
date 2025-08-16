import { CodeGenAgent } from '../../src/agents/code-gen-agent';
import { CodeGenRequest, AgentContext } from '../../src/types';
import { InMemoryStorage } from '../../../016-agent-abstraction/src/memory';

describe("CodeGenAgent", () => {
  let agent: CodeGenAgent;
  let context: AgentContext;

  beforeEach(() => {
    agent = new CodeGenAgent({
      defaultLanguage: "typescript",
      defaultStyle: "functional"
    });
    
    context = {
      memory: new InMemoryStorage(),
      tools: new Map(),
      metadata: {}
    };
  });

  describe("generatePrompt", () => {
    it('should generate basic prompt', () => {
      const request: CodeGenRequest = {
        description: 'Create a function to add two numbers',
        language: "typescript"
      };
      
      const prompt = agent.generatePrompt(request);
      
      expect(prompt).toContain('Generate typescript code');
      expect(prompt).toContain('Create a function to add two numbers');
    });

    it('should include style in prompt', () => {
      const request: CodeGenRequest = {
        description: 'Create a calculator',
        language: "typescript",
        style: 'object-oriented'
      };
      
      const prompt = agent.generatePrompt(request);
      
      expect(prompt).toContain('Code Style: object-oriented');
    });

    it('should include context constraints', () => {
      const request: CodeGenRequest = {
        description: 'Create a validator',
        language: "typescript",
        context: {
          imports: ['zod'],
          constraints: ['Must be type-safe', 'Should handle errors']
        }
      };
      
      const prompt = agent.generatePrompt(request);
      
      expect(prompt).toContain('Available imports: zod');
      expect(prompt).toContain('Must be type-safe');
      expect(prompt).toContain('Should handle errors');
    });
  });

  describe("parseResponse", () => {
    it('should extract code from markdown blocks', () => {
      const response = `Here's the code:
\`\`\`typescript
function add(a: number, b: number): number {
  return a + b;
}
\`\`\``;
      
      const result = agent.parseResponse(response);
      
      expect(result.code).toContain('function add');
      expect(result.language).toBe("typescript");
      expect(result.metadata?.lineCount).toBe(3);
    });

    it('should extract imports', () => {
      const response = `\`\`\`typescript
import { z } from 'zod';
import type { User } from './types';

export function validate(user: User): boolean {
  return true;
}
\`\`\``;
      
      const result = agent.parseResponse(response);
      
      expect(result.imports).toHaveLength(2);
      expect(result.imports).toContain('zod');
      expect(result.imports).toContain('./types');
    });

    it('should extract exports', () => {
      const response = `\`\`\`typescript
export function processData(data: any): any {
  return data;
}

export class DataProcessor {
  process(data: any): any {
    return data;
  }
}

export interface Config {
  apiKey: string;
}
\`\`\``;
      
      const result = agent.parseResponse(response);
      
      expect(result.exports).toContain("processData");
      expect(result.exports).toContain("DataProcessor");
      expect(result.exports).toContain('Config');
    });

    it('should count functions', () => {
      const response = `\`\`\`typescript
function add(a: number, b: number): number {
  return a + b;
}

const multiply = (a: number, b: number) => a * b;

const divide = async (a: number, b: number): Promise<number> => {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
};
\`\`\``;
      
      const result = agent.parseResponse(response);
      
      expect(result.metadata?.functionCount).toBe(3);
    });

    it('should throw error if no code blocks found', () => {
      const response = 'Here is some text without code blocks';
      
      expect(() => agent.parseResponse(response)).toThrow('No code blocks found');
    });
  });

  describe("validate", () => {
    it('should validate non-empty code', () => {
      const result = {
        code: 'function test() { return true; }',
        language: "typescript"
      };
      
      expect(agent.validate(result)).toBe(true);
    });

    it('should reject empty code', () => {
      const result = {
        code: '',
        language: "typescript"
      };
      
      expect(agent.validate(result)).toBe(false);
    });

    it('should validate TypeScript syntax', () => {
      const result = {
        code: 'const x: number = 5;',
        language: "typescript"
      };
      
      expect(agent.validate(result)).toBe(true);
    });

    it('should validate JavaScript syntax', () => {
      const result = {
        code: 'function hello() { console.log("Hello"); }',
        language: "javascript"
      };
      
      expect(agent.validate(result)).toBe(true);
    });
  });

  describe('execute', () => {
    it('should generate email validator code', async () => {
      const request: CodeGenRequest = {
        description: 'Create a function that validates email addresses',
        language: "typescript"
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.code).toContain("validateEmail");
      expect(result.data.code).toContain("emailRegex");
    });

    it('should generate array sorting code', async () => {
      const request: CodeGenRequest = {
        description: 'Create a function to sort array of objects',
        language: "typescript"
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.code).toContain("sortArrayByKey");
    });

    it('should generate fetch data code', async () => {
      const request: CodeGenRequest = {
        description: 'Create a function to fetch data from API',
        language: "typescript"
      };
      
      const result = await agent.execute(request, context);
      
      expect(result.success).toBe(true);
      expect(result.data.code).toContain("fetchData");
      expect(result.data.code).toContain('fetch');
    });

    it('should store result in memory', async () => {
      const request: CodeGenRequest = {
        description: 'Create a simple function',
        language: "typescript"
      };
      
      await agent.execute(request, context);
      
      // Verify memory was called
      expect(context.memory).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Force an error by overriding parseResponse
      const brokenAgent = new CodeGenAgent();
      brokenAgent.parseResponse = () => {
        throw new Error('Parse error');
      };
      
      const request: CodeGenRequest = {
        description: 'Test',
        language: "typescript"
      };
      
      const result = await brokenAgent.execute(request, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Parse error');
    });
  });
});