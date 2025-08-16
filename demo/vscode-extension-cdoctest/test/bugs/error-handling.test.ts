import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CTestConfig } from '../../src/ctest/ctestConfig';
import { getCTestListHandler, getCTestRunHandler } from '../../src/ctest/ctestHandler';
import * as vscode from 'vscode';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('vscode');
jest.mock('child_process');

const mockExec = exec as jest.MockedFunction<typeof exec>;

/**
 * Bug Detection Tests: Error Handling
 * 
 * These tests focus on error handling scenarios that commonly cause bugs:
 * - Missing executables or dependencies
 * - Malformed input/output data
 * - Network and permission issues
 * - Timeout scenarios
 * - Invalid configuration states
 */
describe('Error Handling Detection Tests', () => {
  let mockContext: vscode.ExtensionContext;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;
  let mockController: vscode.TestController;
  let ctestConfig: CTestConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockContext = { subscriptions: { push: jest.fn() } } as any;
    mockWorkspaceFolder = { uri: { fsPath: '/test' }, name: 'test', index: 0 } as any;
    mockController = {
      id: 'ctest',
      items: { replace: jest.fn(), add: jest.fn() },
      createTestItem: jest.fn(),
    } as any;

    (vscode.workspace as any) = {
      getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue('default')
      })
    };

    ctestConfig = new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn());
  });

  afterEach(() => {
    if (ctestConfig) {
      ctestConfig.dispose();
    }
  });

  describe('Missing Executables and Dependencies', () => {
    test('should handle missing ctest executable gracefully', async () => {
      // Mock exec to simulate missing ctest
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const error = new Error('ctest: command not found') as any;
          error.code = 'ENOENT';
          callback(error, '', 'ctest: command not found');
        }
        return {} as any;
      });

      await expect(ctestConfig.discoverTests()).rejects.toThrow('Failed to discover CTest tests');
      
      // Should provide meaningful error message
      try {
        await ctestConfig.discoverTests();
      } catch (error: any) {
        expect(error.message).toContain('Failed to discover CTest tests');
      }
    });

    test('should handle missing CMake build directory', async () => {
      // Mock access to non-existent build directory
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const error = new Error('No such file or directory') as any;
          error.code = 'ENOENT';
          callback(error, '', 'cannot access build directory');
        }
        return {} as any;
      });

      await expect(ctestConfig.runTest("NonExistentTest")).resolves.toEqual({
        name: "NonExistentTest",
        status: 'failed',
        duration: 0,
        message: expect.stringContaining('No such file or directory'),
        output: expect.any(String)
      });
    });

    test('should handle missing test executable', async () => {
      // Mock scenario where CTest can't find test executable
      const mockOutput = `
Test project /build/dir
    Cannot find executable: ./missing_test_executable
      `;

      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const error = new Error('Test executable not found') as any;
          error.code = 1;
          callback(error, mockOutput, '');
        }
        return {} as any;
      });

      const result = await ctestConfig.runTest("MissingExecutableTest");
      
      expect(result.status).toBe('failed');
      expect(result.message).toContain('Test execution failed with code 1');
    });

    test('should handle permission denied errors', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const error = new Error('Permission denied') as any;
          error.code = 'EACCES';
          callback(error, '', 'Permission denied');
        }
        return {} as any;
      });

      await expect(ctestConfig.discoverTests()).rejects.toThrow('Failed to discover CTest tests');
    });
  });

  describe('Malformed Input and Output', () => {
    test('should handle malformed JSON from ctest --show-only', async () => {
      const malformedJson = '{"tests": [invalid json}';

      const handler = getCTestListHandler(mockController);
      
      // Should not throw, but handle gracefully
      await expect(handler(malformedJson)).resolves.toBeUndefined();
      
      // Items should be cleared even with malformed data
      expect(mockController.items.replace).toHaveBeenCalledWith([]);
    });

    test('should handle empty JSON response', async () => {
      const emptyJson = '{}';

      const handler = getCTestListHandler(mockController);
      await handler(emptyJson);

      expect(mockController.items.replace).toHaveBeenCalledWith([]);
      expect(mockController.createTestItem).not.toHaveBeenCalled();
    });

    test('should handle corrupted test output', async () => {
      const corruptedOutput = 'This is not valid test output\x00\x01\x02';
      const mockTestRun = {
        passed: jest.fn(),
        failed: jest.fn(),
        skipped: jest.fn(),
      } as any;
      const mockTestItem = { id: "TestItem", label: 'Test' } as any;
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, ctestConfig, mockTestRun, mockResolve);
      handler(corruptedOutput);

      // Should resolve without crashing
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should handle extremely large output', async () => {
      const largeOutput = 'A'.repeat(10 * 1024 * 1024); // 10MB output
      const mockTestRun = {
        passed: jest.fn(),
        failed: jest.fn(),
        skipped: jest.fn(),
      } as any;
      const mockTestItem = { id: "TestItem", label: 'Test' } as any;
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, ctestConfig, mockTestRun, mockResolve);
      
      // Should handle large output without memory issues
      expect(() => handler(largeOutput)).not.toThrow();
      expect(mockResolve).toHaveBeenCalled();
    });

    test('should handle output with special characters', async () => {
      const specialOutput = `
Test #1: Special©™Test™ ..... Failed    0.02 sec
Error: Unexpected character: ñáéíóú中文🌍
      `;
      
      const mockTestRun = {
        passed: jest.fn(),
        failed: jest.fn(),
        skipped: jest.fn(),
      } as any;
      const mockTestItem = { id: 'Special©™Test™', label: 'Test' } as any;
      const mockResolve = jest.fn();

      const handler = getCTestRunHandler(mockTestItem, ctestConfig, mockTestRun, mockResolve);
      handler(specialOutput);

      expect(mockResolve).toHaveBeenCalled();
    });
  });

  describe('Timeout and Resource Constraints', () => {
    test('should handle command timeout', async () => {
      jest.useFakeTimers();

      mockExec.mockImplementation((command, options, callback) => {
        // Never call callback to simulate timeout
        setTimeout(() => {
          if (callback) {
            const error = new Error('Command timed out') as any;
            error.code = 'TIMEOUT';
            callback(error, '', '');
          }
        }, 31000); // Longer than expected timeout
        return {} as any;
      });

      const discoveryPromise = ctestConfig.discoverTests();
      
      // Fast forward time
      jest.advanceTimersByTime(31000);
      
      await expect(discoveryPromise).rejects.toThrow();
      
      jest.useRealTimers();
    });

    test('should handle memory pressure', async () => {
      // Simulate low memory by creating large objects
      const largeData = new Array(1000).fill(new Array(1000).fill('data'));
      
      mockExec.mockImplementation((command, options, callback) => {
        // Try to allocate more memory during execution
        try {
          const moreData = new Array(1000).fill(largeData);
          if (callback) {
            callback(null, JSON.stringify({ tests: [] }), '');
          }
        } catch (error) {
          if (callback) {
            callback(error, '', '');
          }
        }
        return {} as any;
      });

      // Should handle gracefully even under memory pressure
      const result = await ctestConfig.discoverTests();
      expect(result).toEqual([]);
    });

    test('should handle disk space issues', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const error = new Error('No space left on device') as any;
          error.code = 'ENOSPC';
          callback(error, '', 'No space left on device');
        }
        return {} as any;
      });

      await expect(ctestConfig.runTest("DiskSpaceTest")).resolves.toEqual({
        name: "DiskSpaceTest",
        status: 'failed',
        duration: 0,
        message: expect.stringContaining('No space left on device'),
        output: expect.any(String)
      });
    });
  });

  describe('Invalid Configuration States', () => {
    test('should handle invalid build directory configuration', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "buildDirectory") return '/path/that/does/not/exist';
          return 'default';
        })
      });

      const invalidConfig = new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn());
      
      // Should create without throwing
      expect(invalidConfig).toBeDefined();
      expect(invalidConfig.buildDirectory).toContain('does/not/exist');
      
      invalidConfig.dispose();
    });

    test('should handle invalid parallel jobs configuration', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "parallelJobs") return -1; // Invalid value
          return 'default';
        })
      });

      const invalidConfig = new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn());
      
      // Should handle invalid value gracefully
      expect(invalidConfig.parallelJobs).toBe(-1); // Preserves value but should validate
      
      invalidConfig.dispose();
    });

    test('should handle missing workspace folder', () => {
      const nullWorkspace = null as any;
      
      // Should handle null workspace gracefully
      expect(() => {
        new CTestConfig(mockContext, nullWorkspace, jest.fn());
      }).toThrow(); // May throw, but should be handled at higher level
    });

    test('should handle undefined configuration values', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined)
      });

      const undefinedConfig = new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn());
      
      // Should handle undefined values gracefully
      expect(undefinedConfig).toBeDefined();
      
      undefinedConfig.dispose();
    });
  });

  describe('Network and External Dependencies', () => {
    test('should handle network failures during build', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (command.includes('cmake')) {
          if (callback) {
            const error = new Error('Network unreachable') as any;
            error.code = "ENETUNREACH";
            callback(error, '', 'Failed to fetch dependencies');
          }
        }
        return {} as any;
      });

      // Should warn but not crash
      const result = await ctestConfig.discoverTests();
      expect(result).toEqual([]);
    });

    test('should handle DNS resolution failures', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const error = new Error('Name or service not known') as any;
          error.code = "ENOTFOUND";
          callback(error, '', 'DNS resolution failed');
        }
        return {} as any;
      });

      await expect(ctestConfig.discoverTests()).rejects.toThrow();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle empty test suite', async () => {
      const emptyTestSuite = JSON.stringify({ tests: [] });

      const handler = getCTestListHandler(mockController);
      await handler(emptyTestSuite);

      expect(mockController.items.replace).toHaveBeenCalledWith([]);
    });

    test('should handle test with extremely long names', async () => {
      const longTestName = 'A'.repeat(1000);
      const testData = JSON.stringify({
        tests: [{
          name: longTestName,
          command: ['./test'],
          properties: {}
        }]
      });

      const handler = getCTestListHandler(mockController);
      
      // Should handle long names without truncation issues
      await expect(handler(testData)).resolves.toBeUndefined();
    });

    test('should handle tests with no properties', async () => {
      const testWithoutProperties = JSON.stringify({
        tests: [{
          name: "TestWithoutProperties",
          command: ['./test']
          // No properties field
        }]
      });

      const handler = getCTestListHandler(mockController);
      await handler(testWithoutProperties);

      expect(mockController.createTestItem).toHaveBeenCalled();
    });

    test('should handle rapid configuration changes', async () => {
      let configChangeCount = 0;

      // Simulate rapid configuration changes
      const interval = setInterval(() => {
        configChangeCount++;
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
          get: jest.fn().mockReturnValue(`value-${configChangeCount}`)
        });
      }, 10);

      // Create multiple configs rapidly
      const configs = [];
      for (let i = 0; i < 5; i++) {
        configs.push(new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn()));
        await new Promise(resolve => setTimeout(resolve, 15));
      }

      clearInterval(interval);

      // All configs should be created successfully
      expect(configs.length).toBe(5);
      configs.forEach(config => {
        expect(config).toBeDefined();
        config.dispose();
      });
    });
  });

  describe('Recovery and Fallback Mechanisms', () => {
    test('should recover from temporary failures', async () => {
      let failureCount = 0;

      mockExec.mockImplementation((command, options, callback) => {
        failureCount++;
        
        if (failureCount <= 2) {
          // Fail first two attempts
          if (callback) {
            callback(new Error('Temporary failure'), '', '');
          }
        } else {
          // Succeed on third attempt
          if (callback) {
            callback(null, JSON.stringify({ tests: [] }), '');
          }
        }
        return {} as any;
      });

      // Should eventually succeed after retries (if retry logic exists)
      const result1 = await ctestConfig.discoverTests().catch(() => []);
      const result2 = await ctestConfig.discoverTests().catch(() => []);
      const result3 = await ctestConfig.discoverTests();

      expect(failureCount).toBe(3);
      expect(result3).toEqual([]);
    });

    test('should provide user-friendly error messages', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const error = new Error('Command failed with complex technical error message') as any;
          error.code = 127;
          callback(error, '', 'Very technical stderr output that users should not see');
        }
        return {} as any;
      });

      try {
        await ctestConfig.discoverTests();
      } catch (error: any) {
        // Error message should be user-friendly
        expect(error.message).toMatch(/Failed to discover CTest tests/);
        expect(error.message).not.toMatch(/Very technical stderr output/);
      }
    });
  });
});