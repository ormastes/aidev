import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock vscode
jest.mock('vscode', () => ({
  TestItem: {},
  Range: jest.fn((start: any, end: any) => ({ start, end })),
  Position: jest.fn((line: number, char: number) => ({ line, character: char }))
}));

describe('TestTree', () => {
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

  describe('TestFile', () => {
    test('should create empty test file', () => {
      const file = new TestFile();
      
      expect(file).toBeDefined();
      expect(file.didResolve).toBe(false);
    });

    test('should update from contents', async () => {
      const file = new TestFile();
      const content = '# Test\n1 + 1 = 2';
      const mockItem = { uri: { fsPath: '/test.md' } };
      
      await file.updateFromContents(mockItem, content);
      
      expect(file.didResolve).toBe(true);
    });

    test('should update from disk', async () => {
      const file = new TestFile();
      const mockItem = { uri: { fsPath: '/test.md' } };
      
      // Mock vscode.workspace.fs.readFile
      const vscode = require('vscode');
      vscode.workspace = {
        fs: {
          readFile: jest.fn().mockResolvedValue(Buffer.from('1 + 1 = 2'))
        }
      };
      
      await file.updateFromDisk(mockItem);
      
      expect(file.didResolve).toBe(true);
    });
  });

  describe('TestHeading', () => {
    test('should create test heading', () => {
      const heading = new TestHeading('Test Suite', 1);
      
      expect(heading.name).toBe('Test Suite');
      expect(heading.level).toBe(1);
    });
  });

  describe('TestCase', () => {
    test('should create test case', () => {
      const testCase = new TestCase('test1', 1, '+', 1, 2);
      
      expect(testCase.id).toBe('test1');
      expect(testCase.getLabel()).toBe('1 + 1 = 2');
    });

    test('should generate label for different operators', () => {
      const add = new TestCase('t1', 2, '+', 3, 5);
      const sub = new TestCase('t2', 5, '-', 2, 3);
      const mul = new TestCase('t3', 3, '*', 4, 12);
      const div = new TestCase('t4', 10, '/', 2, 5);
      
      expect(add.getLabel()).toBe('2 + 3 = 5');
      expect(sub.getLabel()).toBe('5 - 2 = 3');
      expect(mul.getLabel()).toBe('3 * 4 = 12');
      expect(div.getLabel()).toBe('10 / 2 = 5');
    });
  });

  describe('testData WeakMap', () => {
    test('should store and retrieve test data', () => {
      const mockItem = { id: 'test' };
      const file = new TestFile();
      
      testData.set(mockItem, file);
      
      expect(testData.get(mockItem)).toBe(file);
    });

    test('should return undefined for missing item', () => {
      const mockItem = { id: 'missing' };
      
      expect(testData.get(mockItem)).toBeUndefined();
    });
  });
});