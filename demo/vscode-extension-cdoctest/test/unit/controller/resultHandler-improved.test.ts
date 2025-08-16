import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock MarkdownFileCoverage class
class MockMarkdownFileCoverage {
  coveredLines: any[];
  constructor(coveredLines: any[]) {
    this.coveredLines = coveredLines;
  }
}

// Mock dependencies before importing
jest.mock('../../../src/controller/controller', () => ({
  getConfigByController: jest.fn()
}));

jest.mock('../../../src/coverage', () => ({
  MarkdownFileCoverage: MockMarkdownFileCoverage
}));

jest.mock('path', () => ({
  isAbsolute: jest.fn((path: string) => path.startsWith('/')),
  join: jest.fn((...paths: string[]) => paths.join('/'))
}));

jest.mock('vscode', () => ({
  TestMessage: jest.fn((message: string) => ({ message })),
  Range: jest.fn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar }
  })),
  Uri: {
    file: jest.fn((path: string) => ({
      toString: () => `file://${path}`,
      path,
      fsPath: path
    }))
  }
}));

describe('ResultHandler - Improved', () => {
  let getTestRunHandler: any;
  let loadDetailedCoverageHandler: any;
  let getTestListHandler: any;
  let getConfigByController: any;
  let MarkdownFileCoverage: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked dependencies
    const controllerModule = await import('../../../src/controller/controller');
    getConfigByController = controllerModule.getConfigByController as jest.Mock;

    const coverageModule = await import('../../../src/coverage');
    MarkdownFileCoverage = coverageModule.MarkdownFileCoverage;

    // Import functions after mocking
    const resultHandlerModule = await import('../../../src/controller/resultHandler');
    getTestRunHandler = resultHandlerModule.getTestRunHandler;
    loadDetailedCoverageHandler = resultHandlerModule.loadDetailedCoverageHandler;
    getTestListHandler = resultHandlerModule.getTestListHandler;
  });

  describe("loadDetailedCoverageHandler", () => {
    test('should filter covered lines for MarkdownFileCoverage instance', async () => {
      const coveredLines = [
        { executed: 1, location: { line: 0 } },
        undefined,
        { executed: 0, location: { line: 2 } },
        null,
        { executed: 1, location: { line: 4 } }
      ];
      
      const coverage = new MarkdownFileCoverage(coveredLines);
      const mockTestRun = {};

      const result = await loadDetailedCoverageHandler(mockTestRun, coverage);

      expect(result).toEqual([
        { executed: 1, location: { line: 0 } },
        { executed: 0, location: { line: 2 } },
        { executed: 1, location: { line: 4 } }
      ]);
    });

    test('should return empty array for non-MarkdownFileCoverage', async () => {
      const mockTestRun = {};
      const otherCoverage = { some: 'object' };

      const result = await loadDetailedCoverageHandler(mockTestRun, otherCoverage);

      expect(result).toEqual([]);
    });

    test('should handle null coverage', async () => {
      const mockTestRun = {};
      
      const result = await loadDetailedCoverageHandler(mockTestRun, null);
      
      expect(result).toEqual([]);
    });

    test('should handle coverage with all undefined lines', async () => {
      const coveredLines = [undefined, undefined, undefined];
      const coverage = new MarkdownFileCoverage(coveredLines);
      const mockTestRun = {};

      const result = await loadDetailedCoverageHandler(mockTestRun, coverage);

      expect(result).toEqual([]);
    });
  });

  describe('getTestListHandler - edge cases', () => {
    let mockController: any;

    beforeEach(() => {
      mockController = {
        items: {
          get: jest.fn(),
          add: jest.fn(),
          replace: jest.fn()
        },
        createTestItem: jest.fn((id, label, uri) => ({
          id,
          label,
          uri,
          children: {
            add: jest.fn(),
            get: jest.fn()
          },
          canResolveChildren: false,
          range: undefined
        }))
      };
    });

    test('should handle test with multiple :: separators', () => {
      getConfigByController.mockReturnValue({ buildDirectory: '/build' });
      const handler = getTestListHandler(mockController);
      
      handler('Namespace::Class::TestCase,/src/test.cpp,10');

      expect(mockController.createTestItem).toHaveBeenCalledWith(
        'Namespace::Class',
        'Namespace::Class',
        expect.any(Object)
      );
      expect(mockController.createTestItem).toHaveBeenCalledWith(
        'Namespace::Class::TestCase',
        "TestCase",
        expect.any(Object)
      );
    });

    test('should reuse existing fixture item', () => {
      const existingFixture = {
        id: "TestSuite",
        children: {
          get: jest.fn().mockReturnValue(undefined),
          add: jest.fn()
        }
      };
      mockController.items.get.mockReturnValue(existingFixture);
      getConfigByController.mockReturnValue({ buildDirectory: '/build' });

      const handler = getTestListHandler(mockController);
      handler('TestSuite::TestCase,/src/test.cpp,10');

      // Should not create fixture again
      expect(mockController.createTestItem).toHaveBeenCalledTimes(1); // Only test case
      expect(mockController.createTestItem).toHaveBeenCalledWith(
        'TestSuite::TestCase',
        "TestCase",
        expect.any(Object)
      );
    });

    test('should update existing test item range', () => {
      const existingTest: any = {
        id: 'TestSuite::TestCase',
        range: undefined
      };
      const existingFixture = {
        id: "TestSuite",
        children: {
          get: jest.fn().mockReturnValue(existingTest),
          add: jest.fn()
        }
      };
      mockController.items.get.mockReturnValue(existingFixture);
      getConfigByController.mockReturnValue({ buildDirectory: '/build' });

      const handler = getTestListHandler(mockController);
      handler('TestSuite::TestCase,/src/test.cpp,25');

      // Should not create any items
      expect(mockController.createTestItem).not.toHaveBeenCalled();
      // Should update range
      expect(existingTest.range).toBeDefined();
      expect(existingTest.range.start.line).toBe(24); // Line 25 - 1
    });

    test('should handle malformed test info', () => {
      getConfigByController.mockReturnValue({ buildDirectory: '/build' });
      const handler = getTestListHandler(mockController);
      
      // Missing source line - this will throw an error in current implementation
      // but we can test that it doesn't crash the whole process
      expect(() => {
        handler('TestSuite::TestCase,/src/test.cpp');
      }).toThrow();
    });

    test('should handle empty fixture and test names', () => {
      getConfigByController.mockReturnValue({ buildDirectory: '/build' });
      const handler = getTestListHandler(mockController);
      
      handler('  ::  ,/src/test.cpp,10');

      expect(mockController.createTestItem).toHaveBeenCalledWith(
        '',
        '',
        expect.any(Object)
      );
    });

    test('should handle lines with only whitespace', () => {
      getConfigByController.mockReturnValue({ buildDirectory: '/build' });
      const handler = getTestListHandler(mockController);
      
      const result = `
        
TestSuite::TestCase,/src/test.cpp,10
        
      `;
      
      handler(result);

      // Should only create items for valid line
      expect(mockController.createTestItem).toHaveBeenCalledTimes(2); // Suite + test
    });
  });

  describe('getTestRunHandler - edge cases', () => {
    test('should handle regex with special characters', () => {
      const mockTestItem = { id: 'test' };
      const mockTestRun = {
        passed: jest.fn(),
        failed: jest.fn()
      };
      const mockConfig = {
        resultSuccessRgex: '[PASS]|\\[SUCCESS\\]'
      };
      const mockResolve = jest.fn();

      const handler = getTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      
      handler('Test [PASS]');
      
      expect(mockTestRun.passed).toHaveBeenCalled();
      expect(mockTestRun.failed).not.toHaveBeenCalled();
    });

    test('should handle multiline result', () => {
      const mockTestItem = { id: 'test' };
      const mockTestRun = {
        passed: jest.fn(),
        failed: jest.fn()
      };
      const mockConfig = {
        resultSuccessRgex: 'PASS'
      };
      const mockResolve = jest.fn();

      const handler = getTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      
      handler('Line 1\nTest PASS\nLine 3');
      
      expect(mockTestRun.passed).toHaveBeenCalled();
    });
  });
});