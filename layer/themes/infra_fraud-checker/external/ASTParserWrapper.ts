import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { LogEntry } from '../../external-log-lib/user-stories/001-basic-log-capture/src/external/external-log-lib';

export interface ParseMetrics {
  filesAnalyzed: number;
  parseTime: number;
  errors: Error[];
}

export interface TestPattern {
  type: 'skip' | 'only' | 'empty' | 'no-assertion' | 'always-true';
  location: {
    file: string;
    line: number;
    column: number;
  };
  code: string;
}

/**
 * Wrapper for AST parsing operations with external log tracking
 */
export class ASTParserWrapper {
  private metrics: ParseMetrics = {
    filesAnalyzed: 0,
    parseTime: 0,
    errors: []
  };

  private logEntries: LogEntry[] = [];
  private logCallbacks: ((entry: LogEntry) => void)[] = [];

  async parseTestFile(code: string, filename: string): Promise<t.File> {
    const startTime = Date.now();
    
    try {
      this.log('info', `Parsing test file: ${filename}`);
      
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'asyncGenerators'
        ]
      });
      
      const parseTime = Date.now() - startTime;
      this.metrics.filesAnalyzed++;
      this.metrics.parseTime += parseTime;
      
      this.log('debug', `Successfully parsed ${filename} in ${parseTime}ms`);
      
      return ast;
    } catch (error) {
      this.metrics.errors.push(error as Error);
      this.log('error', `Failed to parse ${filename}: ${error.message}`);
      throw error;
    }
  }

  findTestPatterns(ast: t.File, filename: string): TestPattern[] {
    const patterns: TestPattern[] = [];
    
    try {
      this.log('info', `Analyzing test patterns in ${filename}`);
      
      traverse(ast, {
        CallExpression: (path) => {
          const node = path.node;
          
          // Check for test.skip, it.skip
          if (
            t.isMemberExpression(node.callee) &&
            t.isIdentifier(node.callee.object) &&
            ['test', 'it', 'describe'].includes(node.callee.object.name) &&
            t.isIdentifier(node.callee.property) &&
            node.callee.property.name === 'skip'
          ) {
            patterns.push({
              type: 'skip',
              location: {
                file: filename,
                line: node.loc?.start.line || 0,
                column: node.loc?.start.column || 0
              },
              code: `${node.callee.object.name}.skip`
            });
          }
          
          // Check for test.only, it.only
          if (
            t.isMemberExpression(node.callee) &&
            t.isIdentifier(node.callee.object) &&
            ['test', 'it', 'describe'].includes(node.callee.object.name) &&
            t.isIdentifier(node.callee.property) &&
            node.callee.property.name === 'only'
          ) {
            patterns.push({
              type: 'only',
              location: {
                file: filename,
                line: node.loc?.start.line || 0,
                column: node.loc?.start.column || 0
              },
              code: `${node.callee.object.name}.only`
            });
          }
          
          // Check for empty test bodies
          if (
            t.isIdentifier(node.callee) &&
            ['test', 'it'].includes(node.callee.name) &&
            node.arguments.length >= 2
          ) {
            const testFn = node.arguments[1];
            if (
              t.isArrowFunctionExpression(testFn) ||
              t.isFunctionExpression(testFn)
            ) {
              if (
                t.isBlockStatement(testFn.body) &&
                testFn.body.body.length === 0
              ) {
                patterns.push({
                  type: 'empty',
                  location: {
                    file: filename,
                    line: node.loc?.start.line || 0,
                    column: node.loc?.start.column || 0
                  },
                  code: 'Empty test body'
                });
              }
            }
          }
          
          // Check for expect(true).toBe(true)
          if (
            t.isIdentifier(node.callee) &&
            node.callee.name === 'expect' &&
            node.arguments.length === 1 &&
            t.isBooleanLiteral(node.arguments[0]) &&
            node.arguments[0].value === true
          ) {
            const parent = path.parent;
            if (
              t.isMemberExpression(parent) &&
              t.isCallExpression(path.parentPath?.parent) &&
              t.isIdentifier(parent.property) &&
              parent.property.name === 'toBe'
            ) {
              const toBeCall = path.parentPath?.parent as t.CallExpression;
              if (
                toBeCall.arguments.length === 1 &&
                t.isBooleanLiteral(toBeCall.arguments[0]) &&
                toBeCall.arguments[0].value === true
              ) {
                patterns.push({
                  type: 'always-true',
                  location: {
                    file: filename,
                    line: node.loc?.start.line || 0,
                    column: node.loc?.start.column || 0
                  },
                  code: 'expect(true).toBe(true)'
                });
              }
            }
          }
        }
      });
      
      this.log('debug', `Found ${patterns.length} suspicious patterns in ${filename}`);
      
      return patterns;
    } catch (error) {
      this.metrics.errors.push(error as Error);
      this.log('error', `Failed to analyze patterns in ${filename}: ${error.message}`);
      return patterns;
    }
  }

  hasAssertions(ast: t.File): boolean {
    let hasAssertion = false;
    
    traverse(ast, {
      CallExpression: (path) => {
        const node = path.node;
        if (
          t.isIdentifier(node.callee) &&
          ['expect', 'assert'].includes(node.callee.name)
        ) {
          hasAssertion = true;
          path.stop();
        }
      }
    });
    
    return hasAssertion;
  }

  getMetrics(): ParseMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      filesAnalyzed: 0,
      parseTime: 0,
      errors: []
    };
  }

  // External log integration
  private log(level: LogEntry['level'], message: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      source: 'stdout'
    };
    
    this.logEntries.push(entry);
    this.logCallbacks.forEach(cb => cb(entry));
  }

  onLog(callback: (entry: LogEntry) => void): void {
    this.logCallbacks.push(callback);
  }

  getLogEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  clearLogs(): void {
    this.logEntries = [];
  }
}