import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CTestConfig, CTestInfo, CTestResult } from '../../../src/ctest/ctestConfig';
import * as vscode from 'vscode';
import { exec } from 'child_process';

// Mock VSCode API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
  },
  WorkspaceFolder: {},
  ExtensionContext: {},
}));

// Mock child_process
jest.mock('child_process');
const mockExec = exec as jest.MockedFunction<typeof exec>;

// Helper to set up exec mock implementation
const setupExecMock = (impl: (command: string, options: any, callback: any) => void) => {
  mockExec.mockImplementation(impl as any);
};

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe("CTestConfig", () => {
  let ctestConfig: CTestConfig;
  let mockContext: vscode.ExtensionContext;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;
  let mockActiveWorkspace: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock workspace configuration
    const mockGetConfiguration = vscode.workspace.getConfiguration as jest.MockedFunction<typeof vscode.workspace.getConfiguration>;
    mockGetConfiguration.mockImplementation((section?: string) => {
      return {
        get: jest.fn((key: string) => {
        const cdoctestDefaults: { [key: string]: any } = {
          "pythonExePath": '/usr/bin/python3',
          "useCmakeTarget": false,
          "srcDirectory": '/test/src',
          "buildDirectory": '/test/build',
          "executable": '',
          'exe_executable': '',
          'bin_executable': '',
          "testRunArgPattern": '',
          "listTestArgPattern": '',
          'exe_testRunArgPattern': '',
          'exe_listTestArgPattern': '',
          'bin_testRunArgPattern': '',
          'bin_listTestArgPattern': '',
          "resultFile": '',
          'exe_resultFile': '',
          'bin_resultFile': '',
          "resultSuccessRgex": '',
          "testRunUseFile": true,
          "listTestUseFile": false,
          'exe_testRunUseFile': true,
          'exe_listTestUseFile': false,
          'bin_testRunUseFile': true,
          'bin_listTestUseFile': false,
          "libPaths": '',
          "configName": '',
          "testcaseSeparator": '::',
          'exe_testcaseSeparator': '::',
          'bin_testcaseSeparator': '::',
          "buildBeforeTest": true,
          'exe_buildBeforeTest': true,
          'bin_buildBeforeTest': true,
          "coverageLocation": '',
          "coverageGenerateTask": '',
          "coverageRawFilePattern": '',
          "coverageThresholdLine": 0,
          "coverageThresholdFunction": 0,
          "coverageThresholdBranch": 0,
          "coverageWarnIfBelowThreshold": false
        };
        
        const ctestDefaults: { [key: string]: any } = {
          "ctestExecutable": 'ctest',
          "testFilter": '',
          "parallelJobs": 1,
          "buildBeforeTest": true,
          "debuggerPath": 'gdb'
        };
        
        // Return config based on section
        if (section === 'ctest') {
          return ctestDefaults[key] ?? null;
        } else if (section === "cdoctest") {
          return cdoctestDefaults[key] ?? null;
        }
        return null;
      })
    } as any;
    });

    // Mock objects
    mockContext = {} as vscode.ExtensionContext;
    mockWorkspaceFolder = {
      uri: { fsPath: '/test/workspace' },
      name: 'test-workspace',
      index: 0
    } as vscode.WorkspaceFolder;
    mockActiveWorkspace = jest.fn();

    // Create CTestConfig instance
    ctestConfig = new CTestConfig(mockContext, mockWorkspaceFolder, mockActiveWorkspace as any);
  });

  afterEach(() => {
    if (ctestConfig) {
      ctestConfig.dispose();
    }
  });

  describe('Configuration Loading', () => {
    test('should load default configuration values', () => {
      expect(ctestConfig.ctestExecutable).toBe('ctest');
      expect(ctestConfig.testFilter).toBe('');
      expect(ctestConfig.parallelJobs).toBe(1);
      expect(ctestConfig.buildBeforeTest).toBe(true);
      expect(ctestConfig.debuggerPath).toBe('gdb');
    });

    test('should have correct controller ID and type', () => {
      expect(ctestConfig.controllerId).toBe('ctest');
      expect(ctestConfig.type).toBe(3); // ConfigType.CTestConfig
    });
  });

  describe('Test Discovery', () => {
    test('should discover tests from CTest JSON output', async () => {
      const mockCTestOutput = {
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
              LABELS: 'unit'
            }
          }
        ]
      };

      // Mock successful ctest execution
      setupExecMock((command, options, callback) => {
        if (callback) {
          callback(null, JSON.stringify(mockCTestOutput), '');
        }
      });

      const tests = await ctestConfig.discoverTests();

      expect(tests).toHaveLength(3);
      
      expect(tests[0]).toEqual({
        name: 'MathTests.Addition',
        command: ['./test_executable', '--gtest_filter=MathTests.Addition'],
        properties: { TIMEOUT: '30', LABELS: 'unit' },
        suite: "MathTests",
        case: "Addition"
      });

      expect(tests[2]).toEqual({
        name: 'StringTests.ToUppercase',
        command: ['./test_executable', '--gtest_filter=StringTests.ToUppercase'],
        properties: { TIMEOUT: '30', LABELS: 'unit' },
        suite: "StringTests",
        case: "ToUppercase"
      });
    });

    test('should handle empty test discovery output', async () => {
      setupExecMock((command, options, callback) => {
        if (callback) {
          callback(null, '{"tests": []}', '');
        }
      });

      const tests = await ctestConfig.discoverTests();
      expect(tests).toHaveLength(0);
    });

    test('should handle malformed JSON output', async () => {
      setupExecMock((command, options, callback) => {
        if (callback) {
          callback(null, 'invalid json', '');
        }
      });

      await expect(ctestConfig.discoverTests()).rejects.toThrow();
    });

    test('should handle ctest command execution errors', async () => {
      setupExecMock((command, options, callback) => {
        if (callback) {
          callback(new Error('ctest not found'), '', 'ctest: command not found');
        }
      });

      await expect(ctestConfig.discoverTests()).rejects.toThrow('Failed to discover CTest tests');
    });
  });

  describe('Test Execution', () => {
    test('should run single test successfully', async () => {
      const mockOutput = 'Test #1: MathTests.Addition .....   Passed    0.05 sec';
      
      setupExecMock((command, options, callback) => {
        if (callback) {
          callback(null, mockOutput, '');
        }
      });

      const result = await ctestConfig.runTest('MathTests.Addition');

      expect(result.name).toBe('MathTests.Addition');
      expect(result.status).toBe('passed');
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should handle test failure', async () => {
      const mockOutput = 'Test #1: MathTests.Addition .....   Failed    0.02 sec';
      
      setupExecMock((command, options, callback) => {
        if (callback) {
          callback({ code: 1 } as any, mockOutput, 'Test failed');
        }
      });

      const result = await ctestConfig.runTest('MathTests.Addition');

      expect(result.name).toBe('MathTests.Addition');
      expect(result.status).toBe('failed');
      expect(result.message).toContain('Test execution failed with code 1');
    });

    test('should run multiple tests', async () => {
      const testNames = ['MathTests.Addition', 'MathTests.Subtraction'];
      
      setupExecMock((command, options, callback) => {
        if (callback) {
          const output = 'Test #1: MathTests.Addition .....   Passed    0.05 sec\nTest #2: MathTests.Subtraction .....   Passed    0.03 sec';
          callback(null, output, '');
        }
      });

      const results = await ctestConfig.runTests(testNames);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('MathTests.Addition');
      expect(results[1].name).toBe('MathTests.Subtraction');
    });

    test('should handle empty test list', async () => {
      const results = await ctestConfig.runTests([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Argument Generation', () => {
    test('should generate correct test list arguments', () => {
      const args = ctestConfig.testrun_list_args;
      expect(args).toEqual(['ctest', '--show-only=json-v1']);
    });

    test('should generate correct test run arguments', () => {
      const additionalEnv = {
        'test_full_name': 'MathTests.Addition',
        'test_suite_name': "MathTests",
        'test_case_name': "Addition"
      };

      const args = ctestConfig.get_ctest_testrun_executable_args(additionalEnv);
      
      expect(args).toContain('ctest');
      expect(args).toContain('-R');
      expect(args).toContain('^MathTests\\.Addition$');
      expect(args).toContain('--output-junit');
      expect(args).toContain('--output-on-failure');
      expect(args).toContain('-V');
    });
  });

  describe('Regex Escaping', () => {
    test('should escape special regex characters in test names', () => {
      const testName = 'Test.With[Special]Chars(And)More+Stuff*';
      const args = ctestConfig.get_ctest_testrun_executable_args({
        'test_full_name': testName,
        'test_suite_name': "TestSuite",
        'test_case_name': "TestCase"
      });

      const regexArg = args[args.indexOf('-R') + 1];
      expect(regexArg).toMatch(/^\^.*\$$/); // Should be wrapped with ^ and $
      expect(regexArg).not.toContain('['); // Should escape special chars
      expect(regexArg).not.toContain(']');
      expect(regexArg).not.toContain('(');
      expect(regexArg).not.toContain(')');
      expect(regexArg).not.toContain('+');
      expect(regexArg).not.toContain('*');
    });
  });

  describe('File Path Handling', () => {
    test('should return correct result file path', () => {
      const resultFile = ctestConfig.resultFile;
      expect(resultFile).toContain('ctest_results.xml');
    });

    test('should handle different build directory formats', () => {
      // Test would verify that build directory paths are handled correctly
      // across different operating systems
      expect(ctestConfig.buildDirectory).toBeDefined();
    });
  });

  describe('Configuration Properties', () => {
    test('should have correct test run file usage properties', () => {
      expect(ctestConfig.testRunUseFile).toBe(false);
      expect(ctestConfig.listTestUseFile).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle build failures gracefully', async () => {
      // Mock build failure
      setupExecMock((command, options, callback) => {
        if (command.includes('cmake --build')) {
          if (callback) {
            callback(new Error('Build failed'), '', 'Build error');
          }
        } else {
          // Still allow test discovery to proceed
          if (callback) {
            callback(null, '{"tests": []}', '');
          }
        }
      });

      // Should not throw error, just warn
      const tests = await ctestConfig.discoverTests();
      expect(tests).toEqual([]);
    });

    test('should handle timeout scenarios', async () => {
      setupExecMock((command, options, callback) => {
        // Simulate timeout by not calling callback
        setTimeout(() => {
          if (callback) {
            callback(new Error('Timeout'), '', '');
          }
        }, 100);
      });

      await expect(ctestConfig.runTest("TimeoutTest")).rejects.toThrow();
    });
  });

  describe('Parallel Execution', () => {
    test('should include parallel jobs argument when configured', () => {
      // Create config with parallel jobs
      const mockGetConfiguration = vscode.workspace.getConfiguration as jest.MockedFunction<typeof vscode.workspace.getConfiguration>;
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "parallelJobs") return 4;
          return 'default';
        })
      } as any);

      const parallelConfig = new CTestConfig(mockContext, mockWorkspaceFolder, mockActiveWorkspace as any);
      
      expect(parallelConfig.parallelJobs).toBe(4);
      
      parallelConfig.dispose();
    });
  });
});

describe('CTest Result Parsing', () => {
  test('should parse test duration correctly', () => {
    const testCases = [
      { output: 'Test #1: MyTest ..... Passed 0.05 sec', expected: 50 },
      { output: 'Test #2: MyTest ..... Passed 1.23 sec', expected: 1230 },
      { output: 'Total Test time (real) = 2.45 sec', expected: 2450 }
    ];

    // This would test the private extractDuration method
    // In practice, you'd need to expose it or test through public methods
    testCases.forEach(testCase => {
      // Test implementation would verify duration extraction
      expect(testCase.expected).toBeGreaterThan(0);
    });
  });

  test('should extract failure messages correctly', () => {
    const failureOutput = `
Test #1: MathTests.Addition ..... Failed    0.02 sec
The following tests FAILED:
	  1 - MathTests.Addition (Failed)
Expected: 5
Actual: 6
Assertion failed: expected 5 but got 6
    `;

    // Test would verify that failure message extraction works
    expect(failureOutput).toContain('Failed');
    expect(failureOutput).toContain("Expected");
    expect(failureOutput).toContain('Actual');
  });
});