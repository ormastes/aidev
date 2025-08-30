import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CodeGenerationRequest {
  id: string;
  prompt: string;
  language: 'typescript' | 'javascript' | 'python' | 'rust' | 'go';
  context?: {
    framework?: string;
    testFramework?: string;
    dependencies?: string[];
    styleGuide?: string;
  };
  constraints: {
    maxLines?: number;
    includeTests?: boolean;
    includeDocumentation?: boolean;
    followPatterns?: string[];
  };
}

interface GeneratedCode {
  id: string;
  requestId: string;
  language: string;
  code: string;
  tests?: string;
  documentation?: string;
  explanation: string;
  confidence: number;
  metadata: {
    generatedAt: string;
    tokensUsed?: number;
    processingTime: number;
  };
}

interface CodeValidationResult {
  isValid: boolean;
  syntaxErrors: string[];
  lintingIssues: string[];
  testResults?: {
    passed: number;
    failed: number;
    coverage?: number;
  };
  qualityScore: number;
  suggestions: string[];
}

class AgenticCodingEngine {
  private requests: Map<string, CodeGenerationRequest> = new Map();
  private generated: Map<string, GeneratedCode> = new Map();
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // TypeScript function template
    this.templates.set('typescript-function', `
/**
 * {{description}}
 * {{params}}
 * @returns {{returnType}} {{returnDescription}}
 */
{{exportKeyword}}function {{functionName}}({{parameters}}): {{returnType}} {
  {{implementation}}
}
`);

    // TypeScript class template
    this.templates.set('typescript-class', `
/**
 * {{description}}
 */
{{exportKeyword}}class {{className}} {
  {{properties}}

  constructor({{constructorParams}}) {
    {{constructorImplementation}}
  }

  {{methods}}
}
`);

    // Test template
    this.templates.set('test-template', `
import { {{imports}} } from '{{modulePath}}';

describe('{{testSuite}}', () => {
  {{testCases}}
});
`);

    // Python function template
    this.templates.set('python-function', `
def {{functionName}}({{parameters}}) -> {{returnType}}:
    """
    {{description}}
    
    Args:
        {{args}}
    
    Returns:
        {{returnType}}: {{returnDescription}}
    """
    {{implementation}}
`);
  }

  async generateCode(request: CodeGenerationRequest): Promise<string> {
    const startTime = Date.now();
    
    // Store request
    this.requests.set(request.id, request);

    // Simulate AI code generation with intelligent analysis
    const generatedCode = await this.simulateCodeGeneration(request);
    
    const generated: GeneratedCode = {
      id: this.generateId(),
      requestId: request.id,
      language: request.language,
      code: generatedCode.code,
      tests: generatedCode.tests,
      documentation: generatedCode.documentation,
      explanation: generatedCode.explanation,
      confidence: generatedCode.confidence,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        tokensUsed: this.estimateTokens(request.prompt + generatedCode.code)
      }
    };

    this.generated.set(generated.id, generated);
    return generated.id;
  }

  private async simulateCodeGeneration(request: CodeGenerationRequest): Promise<{
    code: string;
    tests?: string;
    documentation?: string;
    explanation: string;
    confidence: number;
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    // Analyze prompt to determine what to generate
    const promptLower = request.prompt.toLowerCase();
    let code = '';
    let tests = '';
    let documentation = '';
    let explanation = '';
    let confidence = 0.85;

    if (promptLower.includes('function') || promptLower.includes('method')) {
      const result = this.generateFunction(request);
      code = result.code;
      tests = result.tests;
      explanation = result.explanation;
    } else if (promptLower.includes('class') || promptLower.includes('component')) {
      const result = this.generateClass(request);
      code = result.code;
      tests = result.tests;
      explanation = result.explanation;
    } else if (promptLower.includes('api') || promptLower.includes('endpoint')) {
      const result = this.generateAPI(request);
      code = result.code;
      tests = result.tests;
      explanation = result.explanation;
    } else {
      // Generic code generation
      const result = this.generateGeneric(request);
      code = result.code;
      explanation = result.explanation;
      confidence = 0.7; // Lower confidence for generic requests
    }

    if (request.constraints.includeDocumentation) {
      documentation = this.generateDocumentation(request, code);
    }

    return { code, tests, documentation, explanation, confidence };
  }

  private generateFunction(request: CodeGenerationRequest): {
    code: string;
    tests: string;
    explanation: string;
  } {
    const functionName = this.extractFunctionName(request.prompt);
    const parameters = this.extractParameters(request.prompt);
    const returnType = this.inferReturnType(request.prompt, request.language);
    
    let template = this.templates.get(`${request.language}-function`) || 
                  this.templates.get('typescript-function')!;

    const code = template
      .replace(/{{description}}/g, this.generateDescription(request.prompt))
      .replace(/{{params}}/g, parameters.map(p => `@param ${p.name} ${p.description}`).join('\n * '))
      .replace(/{{returnType}}/g, returnType)
      .replace(/{{returnDescription}}/g, this.generateReturnDescription(request.prompt))
      .replace(/{{exportKeyword}}/g, request.context?.framework?.includes('node') ? 'export ' : '')
      .replace(/{{functionName}}/g, functionName)
      .replace(/{{parameters}}/g, parameters.map(p => `${p.name}: ${p.type}`).join(', '))
      .replace(/{{implementation}}/g, this.generateFunctionImplementation(request, parameters, returnType));

    const tests = request.constraints.includeTests ? 
      this.generateFunctionTests(functionName, parameters, request) : '';

    const explanation = `Generated a ${request.language} function named '${functionName}' that ${this.generateDescription(request.prompt).toLowerCase()}. The function takes ${parameters.length} parameter(s) and returns ${returnType}.`;

    return { code, tests, explanation };
  }

  private generateClass(request: CodeGenerationRequest): {
    code: string;
    tests: string;
    explanation: string;
  } {
    const className = this.extractClassName(request.prompt);
    const properties = this.extractProperties(request.prompt);
    const methods = this.extractMethods(request.prompt);

    let template = this.templates.get(`${request.language}-class`) || 
                  this.templates.get('typescript-class')!;

    const code = template
      .replace(/{{description}}/g, this.generateDescription(request.prompt))
      .replace(/{{exportKeyword}}/g, request.context?.framework?.includes('node') ? 'export ' : '')
      .replace(/{{className}}/g, className)
      .replace(/{{properties}}/g, properties.map(p => `  private ${p.name}: ${p.type};`).join('\n'))
      .replace(/{{constructorParams}}/g, properties.map(p => `${p.name}: ${p.type}`).join(', '))
      .replace(/{{constructorImplementation}}/g, properties.map(p => `    this.${p.name} = ${p.name};`).join('\n'))
      .replace(/{{methods}}/g, methods.map(m => this.generateMethodCode(m, request.language)).join('\n\n'));

    const tests = request.constraints.includeTests ? 
      this.generateClassTests(className, methods, request) : '';

    const explanation = `Generated a ${request.language} class named '${className}' with ${properties.length} properties and ${methods.length} methods. The class encapsulates functionality for ${this.generateDescription(request.prompt).toLowerCase()}.`;

    return { code, tests, explanation };
  }

  private generateAPI(request: CodeGenerationRequest): {
    code: string;
    tests: string;
    explanation: string;
  } {
    const endpoints = this.extractEndpoints(request.prompt);
    const framework = request.context?.framework || 'express';
    
    let code = '';
    
    if (request.language === 'typescript' || request.language === 'javascript') {
      if (framework === 'express') {
        code = this.generateExpressAPI(endpoints, request);
      } else if (framework === 'fastify') {
        code = this.generateFastifyAPI(endpoints, request);
      }
    } else if (request.language === 'python') {
      code = this.generatePythonAPI(endpoints, request);
    }

    const tests = request.constraints.includeTests ? 
      this.generateAPITests(endpoints, request) : '';

    const explanation = `Generated a ${framework} API with ${endpoints.length} endpoint(s) in ${request.language}. The API provides REST endpoints for ${this.generateDescription(request.prompt).toLowerCase()}.`;

    return { code, tests, explanation };
  }

  private generateGeneric(request: CodeGenerationRequest): {
    code: string;
    explanation: string;
  } {
    // Fallback for generic requests
    const code = `// Generated code for: ${request.prompt}
// Language: ${request.language}
// TODO: Implement the requested functionality

${this.generateBasicStructure(request)}`;

    const explanation = `Generated basic code structure for the request. This is a generic implementation that should be customized based on specific requirements.`;

    return { code, explanation };
  }

  private generateBasicStructure(request: CodeGenerationRequest): string {
    switch (request.language) {
      case 'typescript':
        return `export function main(): void {
  console.log('Implementation needed');
}`;
      case 'python':
        return `def main():
    """Main function"""
    print("Implementation needed")`;
      case 'rust':
        return `fn main() {
    println!("Implementation needed");
}`;
      default:
        return `function main() {
  console.log('Implementation needed');
}`;
    }
  }

  async validateCode(codeId: string): Promise<CodeValidationResult> {
    const generated = this.generated.get(codeId);
    if (!generated) {
      throw new Error(`Generated code ${codeId} not found`);
    }

    // Simulate validation process
    await new Promise(resolve => setTimeout(resolve, 200));

    const result: CodeValidationResult = {
      isValid: true,
      syntaxErrors: [],
      lintingIssues: [],
      qualityScore: 0,
      suggestions: []
    };

    // Basic syntax validation simulation
    if (generated.code.includes('TODO')) {
      result.lintingIssues.push('Code contains TODO comments');
      result.suggestions.push('Complete the TODO items');
    }

    if (generated.code.length < 50) {
      result.suggestions.push('Code seems too short, consider adding more implementation details');
    }

    if (!generated.code.includes('/**') && generated.language === 'typescript') {
      result.lintingIssues.push('Missing JSDoc documentation');
    }

    // Calculate quality score
    let score = 100;
    score -= result.syntaxErrors.length * 20;
    score -= result.lintingIssues.length * 5;
    
    if (generated.tests) score += 10;
    if (generated.documentation) score += 5;
    if (generated.confidence > 0.9) score += 5;

    result.qualityScore = Math.max(0, Math.min(100, score));

    // Run tests if they exist
    if (generated.tests) {
      result.testResults = await this.simulateTestExecution(generated.tests);
    }

    return result;
  }

  private async simulateTestExecution(tests: string): Promise<{
    passed: number;
    failed: number;
    coverage?: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const testCount = (tests.match(/test\(|it\(/g) || []).length;
    const passed = Math.floor(testCount * (0.8 + Math.random() * 0.2));
    const failed = testCount - passed;
    const coverage = Math.floor(70 + Math.random() * 25);

    return { passed, failed, coverage };
  }

  getGenerated(id: string): GeneratedCode | null {
    return this.generated.get(id) || null;
  }

  getAllGenerated(): GeneratedCode[] {
    return Array.from(this.generated.values());
  }

  async refineCode(codeId: string, feedback: string): Promise<string> {
    const original = this.generated.get(codeId);
    if (!original) throw new Error(`Code ${codeId} not found`);

    const request = this.requests.get(original.requestId);
    if (!request) throw new Error(`Original request not found`);

    // Create refinement request
    const refinementRequest: CodeGenerationRequest = {
      ...request,
      id: this.generateId(),
      prompt: `${request.prompt}\n\nRefinement feedback: ${feedback}`
    };

    return await this.generateCode(refinementRequest);
  }

  async exportCode(codeId: string, format: 'file' | 'project'): Promise<{
    files: Array<{ path: string; content: string }>;
  }> {
    const generated = this.generated.get(codeId);
    if (!generated) throw new Error(`Code ${codeId} not found`);

    const files: Array<{ path: string; content: string }> = [];

    // Main code file
    const extension = this.getFileExtension(generated.language);
    files.push({
      path: `src/main${extension}`,
      content: generated.code
    });

    // Test file if exists
    if (generated.tests) {
      files.push({
        path: `tests/main.test${extension}`,
        content: generated.tests
      });
    }

    // Documentation if exists
    if (generated.documentation) {
      files.push({
        path: 'README.md',
        content: generated.documentation
      });
    }

    // Package configuration
    if (format === 'project') {
      files.push(...this.generateProjectFiles(generated));
    }

    return { files };
  }

  // Helper methods for code generation
  private extractFunctionName(prompt: string): string {
    const match = prompt.match(/function\s+(\w+)/i) || 
                 prompt.match(/create\s+(\w+)/i) ||
                 prompt.match(/implement\s+(\w+)/i);
    return match ? match[1] : 'generatedFunction';
  }

  private extractClassName(prompt: string): string {
    const match = prompt.match(/class\s+(\w+)/i) || 
                 prompt.match(/component\s+(\w+)/i);
    return match ? match[1] : 'GeneratedClass';
  }

  private extractParameters(prompt: string): Array<{ name: string; type: string; description: string }> {
    // Simplified parameter extraction
    if (prompt.includes('with parameters') || prompt.includes('takes')) {
      return [
        { name: 'input', type: 'string', description: 'Input parameter' },
        { name: 'options', type: 'any', description: 'Configuration options' }
      ];
    }
    return [];
  }

  private extractProperties(prompt: string): Array<{ name: string; type: string }> {
    // Simplified property extraction
    return [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'createdAt', type: 'Date' }
    ];
  }

  private extractMethods(prompt: string): Array<{ name: string; returnType: string }> {
    return [
      { name: 'initialize', returnType: 'void' },
      { name: 'process', returnType: 'Promise<void>' },
      { name: 'cleanup', returnType: 'void' }
    ];
  }

  private extractEndpoints(prompt: string): Array<{ method: string; path: string; description: string }> {
    return [
      { method: 'GET', path: '/api/items', description: 'Get all items' },
      { method: 'POST', path: '/api/items', description: 'Create new item' },
      { method: 'GET', path: '/api/items/:id', description: 'Get specific item' }
    ];
  }

  private generateDescription(prompt: string): string {
    return `Generated based on prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`;
  }

  private generateReturnDescription(prompt: string): string {
    return 'The result of the operation';
  }

  private inferReturnType(prompt: string, language: string): string {
    if (prompt.includes('async') || prompt.includes('promise')) return 'Promise<any>';
    if (prompt.includes('string')) return 'string';
    if (prompt.includes('number')) return 'number';
    if (prompt.includes('boolean')) return 'boolean';
    return language === 'typescript' ? 'any' : 'void';
  }

  private generateFunctionImplementation(
    request: CodeGenerationRequest, 
    parameters: Array<{ name: string; type: string }>,
    returnType: string
  ): string {
    const hasReturn = returnType !== 'void';
    const impl = parameters.length > 0 ? 
      `// Process ${parameters.map(p => p.name).join(', ')}\n  ` : '';
    
    return impl + (hasReturn ? 'return null; // TODO: Implement' : '// TODO: Implement');
  }

  private generateFunctionTests(
    functionName: string, 
    parameters: Array<{ name: string; type: string }>,
    request: CodeGenerationRequest
  ): string {
    return `describe('${functionName}', () => {
  test('should work correctly', () => {
    // TODO: Implement test
    expect(true).toBe(true);
  });

  test('should handle edge cases', () => {
    // TODO: Implement edge case tests
    expect(true).toBe(true);
  });
});`;
  }

  private generateClassTests(
    className: string,
    methods: Array<{ name: string; returnType: string }>,
    request: CodeGenerationRequest
  ): string {
    return `describe('${className}', () => {
  let instance: ${className};

  beforeEach(() => {
    instance = new ${className}();
  });

  ${methods.map(method => `
  test('${method.name} should work correctly', () => {
    // TODO: Test ${method.name}
    expect(instance.${method.name}).toBeDefined();
  });`).join('')}
});`;
  }

  private generateAPITests(
    endpoints: Array<{ method: string; path: string; description: string }>,
    request: CodeGenerationRequest
  ): string {
    return `describe('API Endpoints', () => {
${endpoints.map(endpoint => `
  test('${endpoint.method} ${endpoint.path}', async () => {
    // TODO: Test ${endpoint.description}
    expect(true).toBe(true);
  });`).join('')}
});`;
  }

  private generateExpressAPI(
    endpoints: Array<{ method: string; path: string; description: string }>,
    request: CodeGenerationRequest
  ): string {
    return `import express from 'express';

const app = express();
app.use(express.json());

${endpoints.map(endpoint => `
// ${endpoint.description}
app.${endpoint.method.toLowerCase()}('${endpoint.path}', (req, res) => {
  // TODO: Implement ${endpoint.description.toLowerCase()}
  res.json({ message: 'Not implemented' });
});`).join('')}

export default app;`;
  }

  private generateFastifyAPI(
    endpoints: Array<{ method: string; path: string; description: string }>,
    request: CodeGenerationRequest
  ): string {
    return `import fastify from 'fastify';

const server = fastify({ logger: true });

${endpoints.map(endpoint => `
// ${endpoint.description}
server.${endpoint.method.toLowerCase()}('${endpoint.path}', async (request, reply) => {
  // TODO: Implement ${endpoint.description.toLowerCase()}
  return { message: 'Not implemented' };
});`).join('')}

export default server;`;
  }

  private generatePythonAPI(
    endpoints: Array<{ method: string; path: string; description: string }>,
    request: CodeGenerationRequest
  ): string {
    return `from fastapi import FastAPI

app = FastAPI()

${endpoints.map(endpoint => `
@app.${endpoint.method.toLowerCase()}("${endpoint.path}")
async def ${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}():
    """${endpoint.description}"""
    # TODO: Implement ${endpoint.description.toLowerCase()}
    return {"message": "Not implemented"}`).join('')}`;
  }

  private generateMethodCode(method: { name: string; returnType: string }, language: string): string {
    const returnStmt = method.returnType === 'void' ? '' : '\n    return null; // TODO: Implement';
    return `  ${method.name}(): ${method.returnType} {
    // TODO: Implement ${method.name}${returnStmt}
  }`;
  }

  private generateDocumentation(request: CodeGenerationRequest, code: string): string {
    return `# Generated Code Documentation

## Overview
${this.generateDescription(request.prompt)}

## Language
${request.language}

## Usage
\`\`\`${request.language}
${code.substring(0, 200)}...
\`\`\`

## Requirements
${request.context?.dependencies?.map(dep => `- ${dep}`).join('\n') || 'No specific requirements'}

Generated on ${new Date().toISOString()}
`;
  }

  private getFileExtension(language: string): string {
    switch (language) {
      case 'typescript': return '.ts';
      case 'javascript': return '.js';
      case 'python': return '.py';
      case 'rust': return '.rs';
      case 'go': return '.go';
      default: return '.txt';
    }
  }

  private generateProjectFiles(generated: GeneratedCode): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    if (generated.language === 'typescript' || generated.language === 'javascript') {
      files.push({
        path: 'package.json',
        content: JSON.stringify({
          name: 'generated-project',
          version: '1.0.0',
          description: 'Generated by Agentic Coding Engine',
          main: 'src/main.js',
          scripts: {
            test: 'jest',
            build: 'tsc'
          },
          devDependencies: {
            typescript: '^4.0.0',
            jest: '^27.0.0',
            '@types/jest': '^27.0.0'
          }
        }, null, 2)
      });

      if (generated.language === 'typescript') {
        files.push({
          path: 'tsconfig.json',
          content: JSON.stringify({
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              outDir: './dist',
              strict: true,
              esModuleInterop: true
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
          }, null, 2)
        });
      }
    }

    return files;
  }

  private estimateTokens(text: string): number {
    // Rough token estimation (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }

  private generateId(): string {
    return `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

test.describe('Agentic Coding Engine System Tests', () => {
  let tempDir: string;
  let codingEngine: AgenticCodingEngine;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `agentic-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    codingEngine = new AgenticCodingEngine();
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should generate TypeScript functions with tests', async () => {
    const request: CodeGenerationRequest = {
      id: 'test-request-1',
      prompt: 'Create a function calculateSum that takes two numbers and returns their sum',
      language: 'typescript',
      context: {
        testFramework: 'jest'
      },
      constraints: {
        includeTests: true,
        includeDocumentation: true,
        maxLines: 50
      }
    };

    const codeId = await codingEngine.generateCode(request);
    const generated = codingEngine.getGenerated(codeId);

    expect(generated).toBeDefined();
    expect(generated!.code).toContain('calculateSum');
    expect(generated!.code).toContain('function');
    expect(generated!.code).toContain('/**');
    expect(generated!.tests).toContain('describe');
    expect(generated!.tests).toContain('test');
    expect(generated!.documentation).toContain('# Generated Code Documentation');
    expect(generated!.confidence).toBeGreaterThan(0.5);
    expect(generated!.metadata.processingTime).toBeGreaterThan(0);
  });

  test('should generate classes with methods and properties', async () => {
    const request: CodeGenerationRequest = {
      id: 'test-request-2',
      prompt: 'Create a class UserManager that manages user accounts',
      language: 'typescript',
      constraints: {
        includeTests: true,
        followPatterns: ['SOLID principles']
      }
    };

    const codeId = await codingEngine.generateCode(request);
    const generated = codingEngine.getGenerated(codeId);

    expect(generated!.code).toContain('class UserManager');
    expect(generated!.code).toContain('constructor');
    expect(generated!.code).toContain('private');
    expect(generated!.tests).toContain('UserManager');
    expect(generated!.tests).toContain('beforeEach');
    expect(generated!.explanation).toContain('UserManager');
  });

  test('should generate REST API endpoints', async () => {
    const request: CodeGenerationRequest = {
      id: 'test-request-3',
      prompt: 'Create a REST API for managing blog posts with CRUD operations',
      language: 'typescript',
      context: {
        framework: 'express'
      },
      constraints: {
        includeTests: true
      }
    };

    const codeId = await codingEngine.generateCode(request);
    const generated = codingEngine.getGenerated(codeId);

    expect(generated!.code).toContain('express');
    expect(generated!.code).toContain('app.get');
    expect(generated!.code).toContain('app.post');
    expect(generated!.code).toContain('/api/');
    expect(generated!.tests).toContain('API Endpoints');
  });

  test('should validate generated code quality', async () => {
    const request: CodeGenerationRequest = {
      id: 'test-request-4',
      prompt: 'Create a utility function for data validation',
      language: 'typescript',
      constraints: {
        includeTests: true,
        includeDocumentation: true
      }
    };

    const codeId = await codingEngine.generateCode(request);
    const validation = await codingEngine.validateCode(codeId);

    expect(validation.isValid).toBe(true);
    expect(validation.qualityScore).toBeGreaterThan(70);
    expect(validation.testResults).toBeDefined();
    expect(validation.testResults!.passed).toBeGreaterThanOrEqual(0);
    expect(validation.suggestions).toBeInstanceOf(Array);
  });

  test('should handle multiple programming languages', async () => {
    const languages: Array<CodeGenerationRequest['language']> = ['typescript', 'javascript', 'python', 'rust'];
    const generatedCodes: GeneratedCode[] = [];

    for (const language of languages) {
      const request: CodeGenerationRequest = {
        id: `multi-lang-${language}`,
        prompt: 'Create a hello world function',
        language,
        constraints: {}
      };

      const codeId = await codingEngine.generateCode(request);
      const generated = codingEngine.getGenerated(codeId);
      generatedCodes.push(generated!);
    }

    expect(generatedCodes).toHaveLength(4);
    
    // Verify each language generated appropriate code
    expect(generatedCodes[0].code).toContain('function'); // TypeScript
    expect(generatedCodes[1].code).toContain('function'); // JavaScript
    expect(generatedCodes[2].code).toContain('def'); // Python
    expect(generatedCodes[3].code).toContain('fn'); // Rust

    generatedCodes.forEach(generated => {
      expect(generated.explanation).toContain(generated.language);
    });
  });

  test('should support code refinement based on feedback', async () => {
    const initialRequest: CodeGenerationRequest = {
      id: 'refinement-test',
      prompt: 'Create a simple calculator function',
      language: 'typescript',
      constraints: { includeTests: true }
    };

    const initialCodeId = await codingEngine.generateCode(initialRequest);
    const initialCode = codingEngine.getGenerated(initialCodeId);

    // Request refinement
    const refinedCodeId = await codingEngine.refineCode(
      initialCodeId, 
      'Add support for division and handle division by zero'
    );
    
    const refinedCode = codingEngine.getGenerated(refinedCodeId);

    expect(refinedCode).toBeDefined();
    expect(refinedCode!.id).not.toBe(initialCode!.id);
    expect(refinedCode!.explanation).toContain('refinement');
  });

  test('should export code as files and projects', async () => {
    const request: CodeGenerationRequest = {
      id: 'export-test',
      prompt: 'Create a TypeScript class with methods',
      language: 'typescript',
      constraints: {
        includeTests: true,
        includeDocumentation: true
      }
    };

    const codeId = await codingEngine.generateCode(request);

    // Export as individual files
    const fileExport = await codingEngine.exportCode(codeId, 'file');
    expect(fileExport.files).toHaveLength(3); // main, test, docs
    expect(fileExport.files.find(f => f.path.includes('src/main.ts'))).toBeDefined();
    expect(fileExport.files.find(f => f.path.includes('tests/'))).toBeDefined();
    expect(fileExport.files.find(f => f.path.includes('README.md'))).toBeDefined();

    // Export as complete project
    const projectExport = await codingEngine.exportCode(codeId, 'project');
    expect(projectExport.files.length).toBeGreaterThan(3);
    expect(projectExport.files.find(f => f.path === 'package.json')).toBeDefined();
    expect(projectExport.files.find(f => f.path === 'tsconfig.json')).toBeDefined();

    // Save files to disk
    for (const file of projectExport.files) {
      const filePath = path.join(tempDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
    }

    // Verify files were created
    const packageJsonExists = await fs.access(path.join(tempDir, 'package.json'))
      .then(() => true).catch(() => false);
    expect(packageJsonExists).toBe(true);

    const mainTsExists = await fs.access(path.join(tempDir, 'src/main.ts'))
      .then(() => true).catch(() => false);
    expect(mainTsExists).toBe(true);
  });

  test('should handle concurrent code generation requests', async () => {
    const requests: CodeGenerationRequest[] = Array.from({ length: 5 }, (_, i) => ({
      id: `concurrent-${i}`,
      prompt: `Create a function number${i} that returns ${i}`,
      language: 'typescript',
      constraints: { includeTests: true }
    }));

    // Generate all codes concurrently
    const codePromises = requests.map(request => codingEngine.generateCode(request));
    const codeIds = await Promise.all(codePromises);

    expect(codeIds).toHaveLength(5);
    expect(new Set(codeIds).size).toBe(5); // All unique

    // Verify all generated codes
    const generatedCodes = codeIds.map(id => codingEngine.getGenerated(id));
    generatedCodes.forEach((generated, index) => {
      expect(generated).toBeDefined();
      expect(generated!.code).toContain(`number${index}`);
      expect(generated!.metadata.processingTime).toBeGreaterThan(0);
    });

    // Verify they can all be validated concurrently
    const validationPromises = codeIds.map(id => codingEngine.validateCode(id));
    const validations = await Promise.all(validationPromises);

    validations.forEach(validation => {
      expect(validation.isValid).toBe(true);
      expect(validation.qualityScore).toBeGreaterThan(0);
    });
  });

  test('should handle complex prompts with multiple requirements', async () => {
    const complexPrompt = `
Create a TypeScript class called TaskManager that:
1. Manages a list of tasks with CRUD operations
2. Supports task filtering by status and priority
3. Has async methods for data persistence
4. Includes proper error handling
5. Implements event emitter for task changes
6. Has comprehensive JSDoc documentation
`;

    const request: CodeGenerationRequest = {
      id: 'complex-request',
      prompt: complexPrompt,
      language: 'typescript',
      context: {
        framework: 'node',
        dependencies: ['events']
      },
      constraints: {
        includeTests: true,
        includeDocumentation: true,
        maxLines: 200,
        followPatterns: ['SOLID', 'Observer Pattern']
      }
    };

    const codeId = await codingEngine.generateCode(request);
    const generated = codingEngine.getGenerated(codeId);

    expect(generated!.code).toContain('class TaskManager');
    expect(generated!.code).toContain('async');
    expect(generated!.code).toContain('/**');
    expect(generated!.tests).toContain('TaskManager');
    expect(generated!.documentation).toBeDefined();
    expect(generated!.explanation).toContain('CRUD operations');

    // Validate the complex code
    const validation = await codingEngine.validateCode(codeId);
    expect(validation.qualityScore).toBeGreaterThan(75); // Higher quality expected for detailed requirements
  });

  test('should track usage statistics and metadata', async () => {
    const requests = Array.from({ length: 10 }, (_, i) => ({
      id: `stats-${i}`,
      prompt: `Create function ${i}`,
      language: 'typescript' as const,
      constraints: { includeTests: Math.random() > 0.5 }
    }));

    // Generate multiple codes
    const codeIds = await Promise.all(
      requests.map(request => codingEngine.generateCode(request))
    );

    const allGenerated = codingEngine.getAllGenerated();
    expect(allGenerated.length).toBeGreaterThanOrEqual(10);

    // Verify metadata tracking
    allGenerated.slice(-10).forEach(generated => {
      expect(generated.metadata.generatedAt).toBeDefined();
      expect(generated.metadata.processingTime).toBeGreaterThan(0);
      expect(generated.metadata.tokensUsed).toBeGreaterThan(0);
      expect(new Date(generated.metadata.generatedAt)).toBeInstanceOf(Date);
    });

    // Calculate statistics
    const totalProcessingTime = allGenerated.slice(-10)
      .reduce((sum, g) => sum + g.metadata.processingTime, 0);
    const avgProcessingTime = totalProcessingTime / 10;
    
    expect(avgProcessingTime).toBeGreaterThan(0);
    expect(avgProcessingTime).toBeLessThan(2000); // Should be reasonable

    const totalTokens = allGenerated.slice(-10)
      .reduce((sum, g) => sum + (g.metadata.tokensUsed || 0), 0);
    expect(totalTokens).toBeGreaterThan(0);

    console.log(`Average processing time: ${avgProcessingTime.toFixed(2)}ms`);
    console.log(`Total tokens used: ${totalTokens}`);
  });
});