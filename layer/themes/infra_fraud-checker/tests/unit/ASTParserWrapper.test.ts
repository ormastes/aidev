import { ASTParserWrapper, ParseMetrics, TestPattern } from '../../external/ASTParserWrapper';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

// Mock Babel modules
jest.mock('@babel/parser');
jest.mock('@babel/traverse');

describe("ASTParserWrapper", () => {
  let astWrapper: ASTParserWrapper;
  let mockParser: jest.Mocked<typeof parser>;
  let mockTraverse: jest.MockedFunction<typeof traverse>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParser = parser as jest.Mocked<typeof parser>;
    mockTraverse = traverse as jest.MockedFunction<typeof traverse>;
    
    astWrapper = new ASTParserWrapper();
  });

  describe("parseTestFile", () => {
    it('should parse TypeScript file successfully', async () => {
      const code = 'const test = () => {};';
      const filename = 'test.ts';
      const mockAst = { type: 'File', body: [] } as t.File;

      mockParser.parse.mockReturnValue(mockAst);

      const result = await astWrapper.parseTestFile(code, filename);

      expect(result).toBe(mockAst);
      expect(mockParser.parse).toHaveBeenCalledWith(code, {
        sourceType: 'module',
        plugins: [
          "typescript",
          'jsx',
          'decorators-legacy',
          "classProperties",
          "asyncGenerators"
        ]
      });

      const metrics = astWrapper.getMetrics();
      expect(metrics.filesAnalyzed).toBe(1);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.errors).toHaveLength(0);
    });

    it('should handle parse errors', async () => {
      const code = 'invalid syntax {{{';
      const filename = 'invalid.ts';
      const error = new Error('Unexpected token');

      mockParser.parse.mockImplementation(() => {
        throw error;
      });

      await expect(astWrapper.parseTestFile(code, filename)).rejects.toThrow('Unexpected token');

      const metrics = astWrapper.getMetrics();
      expect(metrics.filesAnalyzed).toBe(0);
      expect(metrics.errors).toHaveLength(1);
      expect(metrics.errors[0]).toBe(error);
    });

    it('should log parsing operations', async () => {
      const logCallback = jest.fn();
      astWrapper.onLog(logCallback);

      const code = 'const x = 1;';
      const filename = 'test.ts';
      const mockAst = { type: 'File' } as t.File;

      mockParser.parse.mockReturnValue(mockAst);

      await astWrapper.parseTestFile(code, filename);

      expect(logCallback).toHaveBeenCalledTimes(2);
      expect(logCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        level: 'info',
        message: 'Parsing test file: test.ts'
      }));
      expect(logCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
        level: 'debug',
        message: expect.stringContaining('Successfully parsed test.ts in')
      }));
    });

    it('should log parse errors', async () => {
      const logCallback = jest.fn();
      astWrapper.onLog(logCallback);

      const error = new Error('Parse error');
      mockParser.parse.mockImplementation(() => {
        throw error;
      });

      await expect(astWrapper.parseTestFile('invalid', 'test.ts')).rejects.toThrow();

      expect(logCallback).toHaveBeenCalledWith(expect.objectContaining({
        level: 'error',
        message: 'Failed to parse test.ts: Parse error'
      }));
    });
  });

  describe("findTestPatterns", () => {
    let mockAst: t.File;

    beforeEach(() => {
      mockAst = { type: 'File', body: [] } as t.File;
    });

    it('should detect it.skip patterns', () => {
      const filename = 'test.ts';
      
      // Mock traverse to call visitor with skip pattern
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: {
                type: "MemberExpression",
                object: { type: "Identifier", name: 'it' },
                property: { type: "Identifier", name: 'skip' }
              },
              loc: { start: { line: 10, column: 5 } }
            } as t.CallExpression
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const patterns = astWrapper.findTestPatterns(mockAst, filename);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual({
        type: 'skip',
        location: { file: filename, line: 10, column: 5 },
        code: 'it.skip'
      });
    });

    it('should detect test.only patterns', () => {
      const filename = 'test.ts';
      
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: {
                type: "MemberExpression",
                object: { type: "Identifier", name: 'test' },
                property: { type: "Identifier", name: 'only' }
              },
              loc: { start: { line: 15, column: 8 } }
            } as t.CallExpression
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const patterns = astWrapper.findTestPatterns(mockAst, filename);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual({
        type: 'only',
        location: { file: filename, line: 15, column: 8 },
        code: 'test.only'
      });
    });

    it('should detect describe.skip patterns', () => {
      const filename = 'test.ts';
      
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: {
                type: "MemberExpression",
                object: { type: "Identifier", name: "describe" },
                property: { type: "Identifier", name: 'skip' }
              },
              loc: { start: { line: 5, column: 2 } }
            } as t.CallExpression
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const patterns = astWrapper.findTestPatterns(mockAst, filename);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual({
        type: 'skip',
        location: { file: filename, line: 5, column: 2 },
        code: 'describe.skip'
      });
    });

    it('should detect empty test bodies', () => {
      const filename = 'test.ts';
      
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: { type: "Identifier", name: 'it' },
              arguments: [
                { type: "StringLiteral", value: 'test name' },
                {
                  type: "ArrowFunctionExpression",
                  body: {
                    type: "BlockStatement",
                    body: [] // Empty body
                  }
                }
              ],
              loc: { start: { line: 20, column: 2 } }
            } as t.CallExpression
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const patterns = astWrapper.findTestPatterns(mockAst, filename);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual({
        type: 'empty',
        location: { file: filename, line: 20, column: 2 },
        code: 'Empty test body'
      });
    });

    // Test completed - implementation pending
      const filename = 'test.ts';
      
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          // First call to visitor - expect(true)
          const expectPath = {
            node: {
              type: "CallExpression",
              callee: { type: "Identifier", name: 'expect' },
              arguments: [{ type: "BooleanLiteral", value: true }],
              loc: { start: { line: 25, column: 4 } }
            } as t.CallExpression,
            parent: {
              type: "MemberExpression",
              property: { type: "Identifier", name: 'toBe' }
            } as t.MemberExpression,
            parentPath: {
              parent: {
                type: "CallExpression",
                arguments: [{ type: "BooleanLiteral", value: true }]
              } as t.CallExpression
            }
          } as any;
          
          visitors.CallExpression(expectPath);
        }
      });

      const patterns = astWrapper.findTestPatterns(mockAst, filename);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual({
        type: 'always-true',
        location: { file: filename, line: 25, column: 4 },
        // Test implementation pending
      });
    });

    it('should handle missing location information', () => {
      const filename = 'test.ts';
      
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: {
                type: "MemberExpression",
                object: { type: "Identifier", name: 'it' },
                property: { type: "Identifier", name: 'skip' }
              },
              loc: null // No location info
            } as t.CallExpression
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const patterns = astWrapper.findTestPatterns(mockAst, filename);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].location).toEqual({
        file: filename,
        line: 0,
        column: 0
      });
    });

    it('should handle traverse errors gracefully', () => {
      const filename = 'test.ts';
      const error = new Error('Traverse error');
      
      mockTraverse.mockImplementation(() => {
        throw error;
      });

      const patterns = astWrapper.findTestPatterns(mockAst, filename);

      expect(patterns).toHaveLength(0);
      
      const metrics = astWrapper.getMetrics();
      expect(metrics.errors).toHaveLength(1);
      expect(metrics.errors[0]).toBe(error);
    });

    it('should log pattern analysis', () => {
      const logCallback = jest.fn();
      astWrapper.onLog(logCallback);
      
      const filename = 'test.ts';
      mockTraverse.mockImplementation(() => {}); // No patterns found

      astWrapper.findTestPatterns(mockAst, filename);

      expect(logCallback).toHaveBeenCalledTimes(2);
      expect(logCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        level: 'info',
        message: 'Analyzing test patterns in test.ts'
      }));
      expect(logCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
        level: 'debug',
        message: 'Found 0 suspicious patterns in test.ts'
      }));
    });
  });

  describe("hasAssertions", () => {
    let mockAst: t.File;

    beforeEach(() => {
      mockAst = { type: 'File', body: [] } as t.File;
    });

    it('should detect expect calls', () => {
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: { type: "Identifier", name: 'expect' }
            } as t.CallExpression,
            stop: jest.fn()
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const result = astWrapper.hasAssertions(mockAst);

      expect(result).toBe(true);
    });

    it('should detect assert calls', () => {
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: { type: "Identifier", name: 'assert' }
            } as t.CallExpression,
            stop: jest.fn()
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const result = astWrapper.hasAssertions(mockAst);

      expect(result).toBe(true);
    });

    it('should return false when no assertions found', () => {
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: { type: "Identifier", name: 'console' }
            } as t.CallExpression
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const result = astWrapper.hasAssertions(mockAst);

      expect(result).toBe(false);
    });

    it('should stop traversal once assertion is found', () => {
      const stopMock = jest.fn();
      
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: { type: "Identifier", name: 'expect' }
            } as t.CallExpression,
            stop: stopMock
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      astWrapper.hasAssertions(mockAst);

      expect(stopMock).toHaveBeenCalled();
    });
  });

  describe('metrics management', () => {
    it('should track multiple parse operations', async () => {
      const mockAst = { type: 'File' } as t.File;
      mockParser.parse.mockReturnValue(mockAst);

      await astWrapper.parseTestFile('code1', 'file1.ts');
      await astWrapper.parseTestFile('code2', 'file2.ts');

      const metrics = astWrapper.getMetrics();

      expect(metrics.filesAnalyzed).toBe(2);
      expect(metrics.parseTime).toBeGreaterThan(0);
      expect(metrics.errors).toHaveLength(0);
    });

    it('should reset metrics correctly', async () => {
      const mockAst = { type: 'File' } as t.File;
      mockParser.parse.mockReturnValue(mockAst);

      await astWrapper.parseTestFile('code', 'file.ts');

      let metrics = astWrapper.getMetrics();
      expect(metrics.filesAnalyzed).toBe(1);

      astWrapper.resetMetrics();

      metrics = astWrapper.getMetrics();
      expect(metrics.filesAnalyzed).toBe(0);
      expect(metrics.parseTime).toBe(0);
      expect(metrics.errors).toHaveLength(0);
    });

    it('should return a copy of metrics', () => {
      const metrics1 = astWrapper.getMetrics();
      const metrics2 = astWrapper.getMetrics();

      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2);

      metrics1.filesAnalyzed = 999;
      expect(astWrapper.getMetrics().filesAnalyzed).toBe(0);
    });
  });

  describe('logging functionality', () => {
    it('should support multiple log callbacks', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      astWrapper.onLog(callback1);
      astWrapper.onLog(callback2);

      const mockAst = { type: 'File' } as t.File;
      mockParser.parse.mockReturnValue(mockAst);

      await astWrapper.parseTestFile('code', 'file.ts');

      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('should store log entries internally', async () => {
      const mockAst = { type: 'File' } as t.File;
      mockParser.parse.mockReturnValue(mockAst);

      await astWrapper.parseTestFile('code', 'file.ts');

      const logs = astWrapper.getLogEntries();
      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        level: 'info',
        message: 'Parsing test file: file.ts',
        source: 'stdout'
      });
    });

    it('should clear logs correctly', async () => {
      const mockAst = { type: 'File' } as t.File;
      mockParser.parse.mockReturnValue(mockAst);

      await astWrapper.parseTestFile('code', 'file.ts');

      expect(astWrapper.getLogEntries()).toHaveLength(2);

      astWrapper.clearLogs();

      expect(astWrapper.getLogEntries()).toHaveLength(0);
    });

    it('should create proper log entry format', async () => {
      const logCallback = jest.fn();
      astWrapper.onLog(logCallback);

      const mockAst = { type: 'File' } as t.File;
      mockParser.parse.mockReturnValue(mockAst);

      await astWrapper.parseTestFile('code', 'file.ts');

      const logEntry = logCallback.mock.calls[0][0];
      expect(logEntry).toMatchObject({
        timestamp: expect.any(Date),
        level: 'info',
        message: expect.any(String),
        source: 'stdout'
      });
    });
  });

  describe('complex pattern detection scenarios', () => {
    it('should detect multiple patterns in single traversal', () => {
      const filename = 'complex.test.ts';
      
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          // Simulate multiple patterns
          const patterns = [
            {
              callee: {
                type: "MemberExpression",
                object: { type: "Identifier", name: 'it' },
                property: { type: "Identifier", name: 'skip' }
              },
              loc: { start: { line: 1, column: 0 } }
            },
            {
              callee: {
                type: "MemberExpression",
                object: { type: "Identifier", name: 'test' },
                property: { type: "Identifier", name: 'only' }
              },
              loc: { start: { line: 2, column: 0 } }
            }
          ];
          
          patterns.forEach(pattern => {
            const mockPath = {
              node: { type: "CallExpression", ...pattern } as t.CallExpression
            } as any;
            visitors.CallExpression(mockPath);
          });
        }
      });

      const result = astWrapper.findTestPatterns(mockAst, filename);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('skip');
      expect(result[1].type).toBe('only');
    });

    it('should handle function expressions in tests', () => {
      const filename = 'function.test.ts';
      
      mockTraverse.mockImplementation((ast, visitors) => {
        if (visitors.CallExpression) {
          const mockPath = {
            node: {
              type: "CallExpression",
              callee: { type: "Identifier", name: 'it' },
              arguments: [
                { type: "StringLiteral", value: 'test' },
                {
                  type: "FunctionExpression",
                  body: {
                    type: "BlockStatement",
                    body: []
                  }
                }
              ],
              loc: { start: { line: 10, column: 0 } }
            } as t.CallExpression
          } as any;
          visitors.CallExpression(mockPath);
        }
      });

      const result = astWrapper.findTestPatterns(mockAst, filename);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('empty');
    });
  });
});
