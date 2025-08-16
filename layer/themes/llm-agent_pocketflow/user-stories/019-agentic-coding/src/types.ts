/**
 * Type definitions for agentic coding features
 */

import { Agent, Memory, Tool } from '../../016-agent-abstraction/src/types';
import { TypedNode } from '../../018-type-safety/src/types';

/**
 * Code generation request
 */
export interface CodeGenRequest {
  description: string;
  language: "typescript" | "javascript" | 'python';
  style?: "functional" | 'object-oriented' | "procedural";
  context?: {
    imports?: string[];
    existingTypes?: Record<string, any>;
    constraints?: string[];
  };
}

/**
 * Generated code result
 */
export interface GeneratedCode {
  code: string;
  language: string;
  imports?: string[];
  exports?: string[];
  dependencies?: string[];
  metadata?: {
    complexity?: number;
    lineCount?: number;
    functionCount?: number;
  };
}

/**
 * Code analysis request
 */
export interface CodeAnalysisRequest {
  code: string;
  language: string;
  analysisType: 'quality' | "patterns" | "security" | "performance";
}

/**
 * Code analysis result
 */
export interface CodeAnalysisResult {
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  metrics: CodeMetrics;
  patterns: string[];
}

/**
 * Code issue found during analysis
 */
export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  severity: "critical" | 'major' | 'minor' | 'trivial';
  rule?: string;
}

/**
 * Code improvement suggestion
 */
export interface CodeSuggestion {
  type: "refactor" | "optimize" | "simplify" | 'extract';
  description: string;
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * Code quality metrics
 */
export interface CodeMetrics {
  complexity: number;
  maintainability: number;
  testability: number;
  readability: number;
  coverage?: number;
}

/**
 * Test generation request
 */
export interface TestGenRequest {
  code: string;
  framework: 'jest' | 'mocha' | 'vitest';
  testType: 'unit' | "integration";
  coverage?: number;
  mockStrategy?: 'auto' | 'manual' | 'none';
}

/**
 * Generated test result
 */
export interface GeneratedTest {
  testCode: string;
  framework: string;
  mocks?: GeneratedMock[];
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

/**
 * Generated mock definition
 */
export interface GeneratedMock {
  name: string;
  type: string;
  implementation: string;
}

/**
 * Documentation generation request
 */
export interface DocGenRequest {
  code: string;
  format: 'jsdoc' | "markdown" | 'html';
  includeExamples?: boolean;
  includeTypes?: boolean;
}

/**
 * Generated documentation
 */
export interface GeneratedDoc {
  content: string;
  format: string;
  sections: DocSection[];
}

/**
 * Documentation section
 */
export interface DocSection {
  title: string;
  content: string;
  type: "overview" | 'api' | "examples" | 'types';
}

/**
 * Refactoring request
 */
export interface RefactorRequest {
  code: string;
  refactorType: 'extract-function' | 'extract-variable' | 'rename' | 'inline' | "simplify";
  target?: {
    line?: number;
    name?: string;
    newName?: string;
  };
}

/**
 * Refactoring result
 */
export interface RefactorResult {
  code: string;
  changes: RefactorChange[];
  impact: 'safe' | 'risky' | "breaking";
}

/**
 * Individual refactoring change
 */
export interface RefactorChange {
  type: string;
  description: string;
  before: string;
  after: string;
  line: number;
}

/**
 * Agent execution context
 */
export interface AgentContext {
  memory?: Memory;
  tools?: Map<string, Tool>;
  metadata?: Record<string, any>;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  success: boolean;
  data?: any;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Base interface for code agents
 */
export interface CodeAgent extends Agent {
  generatePrompt(request: any): string;
  parseResponse(response: string): any;
  validate(result: any): boolean;
  execute(input: any, context: AgentContext): Promise<AgentResult>;
}

/**
 * Agentic coding node that integrates with PocketFlow
 */
export interface AgenticNode<TInput, TOutput> extends TypedNode<TInput, TOutput> {
  agent: CodeAgent;
  preProcess?: (input: TInput) => Promise<any>;
  postProcess?: (output: any) => Promise<TOutput>;
}