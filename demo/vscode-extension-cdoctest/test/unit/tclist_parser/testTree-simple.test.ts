import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock vscode
jest.mock('vscode', () => ({
  TestItem: {},
  Range: jest.fn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar }
  })),
  Position: jest.fn((line: number, char: number) => ({ line, character: char })),
  workspace: {
    fs: {
      readFile: jest.fn()
    }
  },
  Uri: {
    parse: jest.fn((uri: string) => ({ toString: () => uri }))
  }
}));

describe('TestTree - Simple', () => {
  let TestFile: any;
  let TestHeading: any;
  let TestCase: any;
  let testData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after mocking
    const testTreeModule = await import('../../../src/tclist_parser/testTree');
    TestFile = testTreeModule.TestFile;
    TestHeading = testTreeModule.TestHeading;
    TestCase = testTreeModule.TestCase;
    testData = testTreeModule.testData;
  });

  describe("TestFile", () => {
    test('should create empty test file', () => {
      const file = new TestFile();
      
      expect(file).toBeDefined();
      expect(file.didResolve).toBe(false);
    });

    test('should update from contents', async () => {
      const file = new TestFile();
      const content = '# Test Suite\n\n1 + 1 = 2\n2 + 3 = 5\n';
      const mockItem = { 
        uri: { fsPath: '/test.md' },
        children: {
          replace: jest.fn()
        }
      };
      
      await file.updateFromContents(mockItem, content);
      
      expect(file.didResolve).toBe(true);
      expect(mockItem.children.replace).toHaveBeenCalled();
    });

    test('should handle empty content', async () => {
      const file = new TestFile();
      const content = '';
      const mockItem = { 
        uri: { fsPath: '/test.md' },
        children: {
          replace: jest.fn()
        }
      };
      
      await file.updateFromContents(mockItem, content);
      
      expect(file.didResolve).toBe(true);
      expect(mockItem.children.replace).toHaveBeenCalledWith([]);
    });

    test('should update from disk', async () => {
      const file = new TestFile();
      const mockItem = { 
        uri: { 
          fsPath: '/test.md',
          toString: () => 'file:///test.md'
        },
        children: {
          replace: jest.fn()
        }
      };
      
      const vscode = require('vscode');
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('1 + 1 = 2'));
      
      await file.updateFromDisk(mockItem);
      
      expect(vscode.workspace.fs.readFile).toHaveBeenCalledWith(mockItem.uri);
      expect(file.didResolve).toBe(true);
    });

    test('should handle read error', async () => {
      const file = new TestFile();
      const mockItem = { 
        uri: { 
          fsPath: '/test.md',
          toString: () => 'file:///test.md'
        },
        children: {
          replace: jest.fn()
        }
      };
      
      const vscode = require('vscode');
      (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(new Error('Read failed'));
      
      await expect(file.updateFromDisk(mockItem)).rejects.toThrow('Read failed');
    });
  });

  describe("TestHeading", () => {
    test('should create test heading with name and level', () => {
      const heading = new TestHeading('Test Suite', 2);
      
      expect(heading.name).toBe('Test Suite');
      expect(heading.level).toBe(2);
    });

    test('should create heading with default values', () => {
      const heading = new TestHeading('Suite');
      
      expect(heading.name).toBe('Suite');
      expect(heading.level).toBe(1);
    });
  });

  describe("TestCase", () => {
    test('should create test case with all parameters', () => {
      const testCase = new TestCase('test1', 1, '+', 2, 3);
      
      expect(testCase.id).toBe('test1');
      expect(testCase.a).toBe(1);
      expect(testCase.operator).toBe('+');
      expect(testCase.b).toBe(2);
      expect(testCase.expected).toBe(3);
    });

    test('should generate correct label for addition', () => {
      const testCase = new TestCase('test1', 5, '+', 7, 12);
      expect(testCase.getLabel()).toBe('5 + 7 = 12');
    });

    test('should generate correct label for subtraction', () => {
      const testCase = new TestCase('test2', 10, '-', 3, 7);
      expect(testCase.getLabel()).toBe('10 - 3 = 7');
    });

    test('should generate correct label for multiplication', () => {
      const testCase = new TestCase('test3', 4, '*', 6, 24);
      expect(testCase.getLabel()).toBe('4 * 6 = 24');
    });

    test('should generate correct label for division', () => {
      const testCase = new TestCase('test4', 20, '/', 4, 5);
      expect(testCase.getLabel()).toBe('20 / 4 = 5');
    });

    test('should generate correct label for unknown operator', () => {
      const testCase = new TestCase('test5', 2, '%', 3, 2);
      expect(testCase.getLabel()).toBe('2 % 3 = 2');
    });
  });

  describe('testData WeakMap', () => {
    test('should store and retrieve test data', () => {
      const mockItem = { id: 'test-item' };
      const file = new TestFile();
      
      testData.set(mockItem, file);
      
      expect(testData.get(mockItem)).toBe(file);
      expect(testData.has(mockItem)).toBe(true);
    });

    test('should return undefined for missing item', () => {
      const mockItem = { id: 'missing' };
      
      expect(testData.get(mockItem)).toBeUndefined();
      expect(testData.has(mockItem)).toBe(false);
    });

    test('should delete test data', () => {
      const mockItem = { id: 'test-item' };
      const file = new TestFile();
      
      testData.set(mockItem, file);
      expect(testData.has(mockItem)).toBe(true);
      
      testData.delete(mockItem);
      expect(testData.has(mockItem)).toBe(false);
    });
  });
});