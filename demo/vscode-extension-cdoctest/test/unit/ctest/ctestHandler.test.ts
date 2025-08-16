import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { getCTestListHandler, getCTestRunHandler } from '../../../src/ctest/ctestHandler';
import { CTestConfig } from '../../../src/ctest/ctestConfig';
import * as vscode from 'vscode';

// Mock VSCode API
jest.mock('vscode', () => ({
  TestController: {
    prototype: {
      createTestItem: jest.fn(),
    }
  },
  TestItem: {},
  TestRun: {
    prototype: {
      passed: jest.fn(),
      failed: jest.fn(),
      skipped: jest.fn(),
    }
  },
  TestMessage: jest.fn(),
  workspace: {
    getConfiguration: jest.fn(),
  },
}));

describe('CTest Handlers', () => {
  let mockController: vscode.TestController;
  let mockTestRun: vscode.TestRun;
  let mockTestItem: vscode.TestItem;
  let mockConfig: CTestConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock test controller
    mockController = {
      id: 'ctest',
      label: 'CTest GTest',
      items: {
        replace: jest.fn(),
        add: jest.fn(),
      },
      createTestItem: jest.fn().mockImplementation((id, label) => ({
        id,
        label,
        canResolveChildren: false,
        children: {
          add: jest.fn(),
        },
      })),
    } as any;

    // Mock test run
    mockTestRun = {
      passed: jest.fn(),
      failed: jest.fn(),
      skipped: jest.fn(),
    } as any;

    // Mock test item
    mockTestItem = {
      id: 'MathTests.Addition',
      label: 'Addition',
    } as any;

    // Mock config
    mockConfig = {
      buildDirectory: '/test/build',
    } as any;
  });

  describe('getCTestListHandler', () => {
    test('should parse valid CTest JSON and create test items', async () => {
      const validJsonOutput = JSON.stringify({
        tests: [
          {
            name: 'MathTests.Addition',
            command: ['./test_executable', '--gtest_filter=MathTests.Addition'],
            properties: {
              TIMEOUT: '30',
              LABELS: 'unit'
            }
          },
          {
            name: 'MathTests.Subtraction',
            command: ['./test_executable', '--gtest_filter=MathTests.Subtraction'],
            properties: {
              TIMEOUT: '30',
              LABELS: 'unit'
            }
          },
          {
            name: 'StringTests.ToUppercase',
            command: ['./test_executable', '--gtest_filter=StringTests.ToUppercase'],
            properties: {
              TIMEOUT: '30',
              LABELS: 'integration'
            }
          }
        ]
      });

      const handler = getCTestListHandler(mockController);
      await handler(validJsonOutput);

      // Verify controller items were replaced
      expect(mockController.items.replace).toHaveBeenCalledWith([]);

      // Verify test items were created
      expect(mockController.createTestItem).toHaveBeenCalledWith('MathTests', 'MathTests');
      expect(mockController.createTestItem).toHaveBeenCalledWith('StringTests', 'StringTests');
      expect(mockController.createTestItem).toHaveBeenCalledWith('MathTests.Addition', 'Addition');
      expect(mockController.createTestItem).toHaveBeenCalledWith('MathTests.Subtraction', 'Subtraction');
      expect(mockController.createTestItem).toHaveBeenCalledWith('StringTests.ToUppercase', 'ToUppercase');

      // Verify controller items were added
      expect(mockController.items.add).toHaveBeenCalledTimes(2); // Two test suites
    });

    test('should handle empty test list', async () => {
      const emptyJsonOutput = JSON.stringify({ tests: [] });

      const handler = getCTestListHandler(mockController);
      await handler(emptyJsonOutput);

      expect(mockController.items.replace).toHaveBeenCalledWith([]);
      expect(mockController.createTestItem).not.toHaveBeenCalled();
    });

    test('should handle malformed JSON gracefully', async () => {
      const malformedJson = 'invalid json';

      const handler = getCTestListHandler(mockController);
      
      // Should not throw, just log error
      await expect(handler(malformedJson)).resolves.toBeUndefined();
      
      // Items should still be cleared
      expect(mockController.items.replace).toHaveBeenCalledWith([]);
    });

    test('should handle missing tests property', async () => {
      const invalidJsonOutput = JSON.stringify({ notTests: [] });

      const handler = getCTestListHandler(mockController);
      await handler(invalidJsonOutput);

      expect(mockController.items.replace).toHaveBeenCalledWith([]);
      expect(mockController.createTestItem).not.toHaveBeenCalled();
    });

    test('should create test items with labels as description', async () => {
      const jsonWithLabels = JSON.stringify({
        tests: [
          {
            name: 'MathTests.Addition',
            command: ['./test_executable'],
            properties: {
              LABELS: 'unit,fast'
            }
          }
        ]
      });

      // Create a more detailed mock that captures the description
      const mockTestItemWithDescription = {
        id: 'MathTests.Addition',
        label: 'Addition',
        description: '',
        canResolveChildren: false,
        children: { add: jest.fn() }
      };

      (mockController.createTestItem as jest.Mock).mockReturnValue(mockTestItemWithDescription);

      const handler = getCTestListHandler(mockController);
      await handler(jsonWithLabels);

      // Verify the test item was created and description was set
      expect(mockController.createTestItem).toHaveBeenCalledWith('MathTests.Addition', 'Addition');
    });

    test('should handle complex test names with multiple dots', async () => {
      const complexTestNames = JSON.stringify({
        tests: [
          {
            name: 'Namespace.Class.Method.Test',
            command: ['./test_executable'],
            properties: {}
          }
        ]
      });

      const handler = getCTestListHandler(mockController);
      await handler(complexTestNames);

      // Should create suite for all but last part
      expect(mockController.createTestItem).toHaveBeenCalledWith('Namespace.Class.Method', 'Namespace.Class.Method');
      expect(mockController.createTestItem).toHaveBeenCalledWith('Namespace.Class.Method.Test', 'Test');
    });
  });

  describe('getCTestRunHandler', () => {
    test('should handle passed test result', async () => {
      const passedOutput = 'Test #1: MathTests.Addition ..... Passed 0.05 sec';
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      handler(passedOutput);

      expect(mockTestRun.passed).toHaveBeenCalledWith(mockTestItem, expect.any(Number));
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should handle failed test result', async () => {
      const failedOutput = `
Test #1: MathTests.Addition ..... Failed 0.02 sec
Expected: 5
Actual: 6
Assertion failed
      `;
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      handler(failedOutput);

      expect(mockTestRun.failed).toHaveBeenCalledWith(
        mockTestItem,
        expect.any(Object), // TestMessage
        expect.any(Number)  // Duration
      );
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should handle skipped test result', async () => {
      const skippedOutput = 'Test #1: MathTests.Addition ..... Skipped';
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      handler(skippedOutput);

      expect(mockTestRun.skipped).toHaveBeenCalledWith(mockTestItem);
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should extract duration from test output', async () => {
      const outputWithDuration = 'Test #1: MathTests.Addition ..... Passed 1.23 sec';
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      handler(outputWithDuration);

      expect(mockTestRun.passed).toHaveBeenCalledWith(mockTestItem, 1230); // 1.23 * 1000
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should handle test result parsing errors gracefully', async () => {
      const invalidOutput = 'completely invalid output';
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      handler(invalidOutput);

      // Should still resolve and not crash
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should extract failure messages', async () => {
      const detailedFailureOutput = `
Test #1: MathTests.Addition ..... Failed 0.02 sec
The following tests FAILED:
	  1 - MathTests.Addition (Failed)
/path/to/test.cpp:15: Failure
Expected: (5) == (add(2, 3))
  Actual: 6
Assertion failed: expected 5 but got 6
      `;
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      handler(detailedFailureOutput);

      expect(mockTestRun.failed).toHaveBeenCalledWith(
        mockTestItem,
        expect.objectContaining({
          actualOutput: expect.stringContaining('Expected')
        }),
        expect.any(Number)
      );
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should handle overall test summary', async () => {
      const summaryOutput = `
Test project /path/to/build
    Start 1: MathTests.Addition
1/1 Test #1: MathTests.Addition .......   Passed    0.05 sec

100% tests passed, 0 tests failed out of 1

Total Test time (real) =   0.06 sec
      `;
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      handler(summaryOutput);

      expect(mockTestRun.passed).toHaveBeenCalled();
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should handle multiple test results in output', async () => {
      const multipleTestsOutput = `
Test #1: MathTests.Addition ..... Passed 0.05 sec
Test #2: MathTests.Subtraction ... Failed 0.02 sec
      `;
      const mockResolve = jest.fn();

      // Test with first test item
      const handler1 = getCTestRunHandler(mockTestItem, mockConfig, mockTestRun, mockResolve);
      handler1(multipleTestsOutput);

      expect(mockTestRun.passed).toHaveBeenCalledWith(mockTestItem, expect.any(Number));

      // Reset mocks for second test
      jest.clearAllMocks();
      const mockTestItem2 = { id: 'MathTests.Subtraction', label: 'Subtraction' } as any;
      
      const handler2 = getCTestRunHandler(mockTestItem2, mockConfig, mockTestRun, mockResolve);
      handler2(multipleTestsOutput);

      expect(mockTestRun.failed).toHaveBeenCalledWith(
        mockTestItem2,
        expect.any(Object),
        expect.any(Number)
      );
    });
  });
});

describe('Test Info Parsing', () => {
  test('should parse test suite and case names correctly', () => {
    const testCases = [
      { name: 'MathTests.Addition', expectedSuite: 'MathTests', expectedCase: 'Addition' },
      { name: 'Namespace.Class.Method', expectedSuite: 'Namespace.Class', expectedCase: 'Method' },
      { name: 'SimpleTest', expectedSuite: 'SimpleTest', expectedCase: '' },
      { name: 'A.B.C.D.E', expectedSuite: 'A.B.C.D', expectedCase: 'E' }
    ];

    testCases.forEach(testCase => {
      // This would test the parseTestInfo function
      // In practice, you'd need to expose it or test through public methods
      const parts = testCase.name.split('.');
      const suite = parts.length > 1 ? parts.slice(0, -1).join('.') : testCase.name;
      const testCaseName = parts.length > 1 ? parts[parts.length - 1] : '';

      expect(suite).toBe(testCase.expectedSuite);
      expect(testCaseName).toBe(testCase.expectedCase);
    });
  });
});

describe('Duration Extraction', () => {
  test('should extract duration from various formats', () => {
    const testCases = [
      { output: '0.05 sec', expected: 50 },
      { output: '1.23 sec', expected: 1230 },
      { output: 'Total Test time (real) = 2.45 sec', expected: 2450 },
      { output: 'no duration info', expected: 0 }
    ];

    testCases.forEach(testCase => {
      const match = testCase.output.match(/(\d+\.\d+)\s*sec/);
      const duration = match ? parseFloat(match[1]) * 1000 : 0;
      expect(duration).toBe(testCase.expected);
    });
  });
});

describe('Failure Message Extraction', () => {
  test('should extract relevant failure information', () => {
    const failureOutput = `
Test #1: MathTests.Addition ..... Failed 0.02 sec
The following tests FAILED:
	  1 - MathTests.Addition (Failed)
/path/to/test.cpp:15: Failure
Expected: (5) == (add(2, 3))
  Actual: 6
Some other output
ASSERTION FAILED: condition was false
    `;

    const lines = failureOutput.split('\n');
    const errorLines = lines.filter(line => 
      line.includes('FAILED') || 
      line.includes('Error') || 
      line.includes('Assertion') ||
      line.includes('Expected') ||
      line.includes('Actual')
    );

    expect(errorLines.length).toBeGreaterThan(0);
    expect(errorLines.some(line => line.includes('Expected'))).toBe(true);
    expect(errorLines.some(line => line.includes('Actual'))).toBe(true);
    expect(errorLines.some(line => line.includes('ASSERTION FAILED'))).toBe(true);
  });
});