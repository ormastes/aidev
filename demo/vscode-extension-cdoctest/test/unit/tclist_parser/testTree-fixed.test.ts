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

describe('TestTree - Fixed', () => {
  let TestFile: any;
  let TestHeading: any;
  let TestCase: any;
  let testData: any;
  let vscode: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after mocking
    vscode = await import('vscode');
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

    test('should handle empty content in updateFromContents', async () => {
      const file = new TestFile();
      const mockItem = { 
        uri: { fsPath: '/test.md' },
        children: {
          replace: jest.fn()
        }
      };
      
      await file.updateFromContents(mockItem, '');
      
      expect(file.didResolve).toBe(true);
      expect(mockItem.children.replace).toHaveBeenCalledWith([]);
    });

    test('should handle content with test cases', async () => {
      const file = new TestFile();
      const mockItem = { 
        uri: { fsPath: '/test.md' },
        children: {
          replace: jest.fn()
        }
      };
      
      await file.updateFromContents(mockItem, '1 + 1 = 2\n2 + 3 = 5');
      
      expect(file.didResolve).toBe(true);
      expect(mockItem.children.replace).toHaveBeenCalled();
      
      // Check that children were created
      const replaceCall = mockItem.children.replace.mock.calls[0];
      expect(replaceCall[0]).toHaveLength(2); // Two test cases
    });
  });

  describe("TestHeading", () => {
    test('should create test heading with name and level', () => {
      const heading = new TestHeading('Test Suite', 2);
      
      expect(heading.name).toBe('Test Suite');
      expect(heading.level).toBe(2);
    });

    test('should create heading with default level', () => {
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

    test('should generate correct labels for different operators', () => {
      expect(new TestCase('t1', 5, '+', 7, 12).getLabel()).toBe('5 + 7 = 12');
      expect(new TestCase('t2', 10, '-', 3, 7).getLabel()).toBe('10 - 3 = 7');
      expect(new TestCase('t3', 4, '*', 6, 24).getLabel()).toBe('4 * 6 = 24');
      expect(new TestCase('t4', 20, '/', 4, 5).getLabel()).toBe('20 / 4 = 5');
      expect(new TestCase('t5', 7, '%', 3, 1).getLabel()).toBe('7 % 3 = 1');
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
      const mockItem = { id: 'delete-test' };
      const file = new TestFile();
      
      testData.set(mockItem, file);
      expect(testData.has(mockItem)).toBe(true);
      
      testData.delete(mockItem);
      expect(testData.has(mockItem)).toBe(false);
    });
  });
});