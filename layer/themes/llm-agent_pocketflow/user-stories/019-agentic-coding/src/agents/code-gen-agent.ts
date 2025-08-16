/**
 * Code generation agent implementation
 */

import { BaseCodeAgent } from '../base-code-agent';
import { CodeGenRequest, GeneratedCode } from '../types';

/**
 * Agent that generates code from natural language descriptions
 */
export class CodeGenAgent extends BaseCodeAgent {
  constructor(config?: {
    defaultLanguage?: string;
    defaultStyle?: string;
    maxRetries?: number;
  }) {
    super(
      'CodeGenAgent',
      'Generates code from natural language descriptions',
      config
    );
  }

  generatePrompt(request: CodeGenRequest): string {
    const { description, language, style, context } = request;
    
    let prompt = `Generate ${language} code for the following requirement:\n\n`;
    prompt += `Description: ${description}\n\n`;
    
    if (style) {
      prompt += `Code Style: ${style}\n`;
    }
    
    if (context?.imports) {
      prompt += `Available imports: ${context.imports.join(', ')}\n`;
    }
    
    if (context?.constraints) {
      prompt += `Constraints:\n${context.constraints.map(c => `- ${c}`).join('\n')}\n`;
    }
    
    prompt += '\nGenerate clean, well-documented code that follows best practices.';
    prompt += '\nInclude necessary imports and type definitions.';
    
    return prompt;
  }

  parseResponse(response: string): GeneratedCode {
    const codeBlocks = this.extractCodeBlocks(response);
    
    if (codeBlocks.length === 0) {
      throw new Error('No code blocks found in response');
    }
    
    const code = this.cleanCode(codeBlocks[0]!);
    const imports = this.extractImports(code);
    const exports = this.extractExports(code);
    
    return {
      code,
      language: 'typescript', // Default for now
      imports,
      exports,
      metadata: {
        lineCount: code.split('\n').length,
        functionCount: this.countFunctions(code)
      }
    };
  }

  validate(result: GeneratedCode): boolean {
    if (!result.code || result.code.trim().length === 0) {
      return false;
    }
    
    return this.validateSyntax(result.code, result.language);
  }

  protected async simulateAIResponse(_prompt: string, input: CodeGenRequest): Promise<string> {
    // Simulate different responses based on the request
    const { description, language } = input;
    
    if (description.toLowerCase().includes('email')) {
      return this.generateEmailValidatorResponse(language);
    } else if (description.toLowerCase().includes('sort')) {
      return this.generateArraySortResponse(language);
    } else if (description.toLowerCase().includes('fetch')) {
      return this.generateFetchDataResponse(language);
    }
    
    // Default response
    return `\`\`\`${language}
// Generated function based on: ${description}
export function generatedFunction(input: any): any {
  // Implementation goes here
  return input;
}
\`\`\``;
  }

  private generateEmailValidatorResponse(language: string): string {
    if (language === 'typescript') {
      return `Here's a TypeScript function to validate email addresses:

\`\`\`typescript
/**
 * Validates an email address using a regular expression
 * @param email - The email address to validate
 * @returns true if the email is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Type-safe version with branded types
export type ValidEmail = string & { __brand: 'ValidEmail' };

export function isValidEmail(email: string): email is ValidEmail {
  return validateEmail(email);
}

// Usage example
export function createUser(email: ValidEmail, name: string) {
  // Can safely use email here knowing it's valid
  return { email, name };
}
\`\`\``;
    }
    
    return `\`\`\`javascript
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}
\`\`\``;
  }

  private generateArraySortResponse(language: string): string {
    if (language === 'typescript') {
      return `\`\`\`typescript
/**
 * Sorts an array of objects by a specified key
 * @param array - The array to sort
 * @param key - The key to sort by
 * @param order - Sort order ('asc' or 'desc')
 */
export function sortArrayByKey<T>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}
\`\`\``;
    }
    
    return `\`\`\`javascript
function sortArray(array, key, order = 'asc') {
  return [...array].sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    }
    return a[key] < b[key] ? 1 : -1;
  });
}
\`\`\``;
  }

  private generateFetchDataResponse(language: string): string {
    if (language === 'typescript') {
      return `\`\`\`typescript
interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * Fetches data from an API endpoint with error handling
 * @param url - The API endpoint URL
 * @param options - Fetch options
 */
export async function fetchData<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = 5000 } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
\`\`\``;
    }
    
    return `\`\`\`javascript
async function fetchData(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}
\`\`\``;
  }

  private extractImports(code: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:type\s+)?(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]!);
    }
    
    return imports;
  }

  private extractExports(code: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:function|class|const|interface|type)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[1]!);
    }
    
    return exports;
  }

  private countFunctions(code: string): number {
    const functionRegex = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>)/g;
    const matches = code.match(functionRegex);
    return matches ? matches.length : 0;
  }
}