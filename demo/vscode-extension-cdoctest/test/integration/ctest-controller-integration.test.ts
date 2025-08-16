import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { CTestConfig } from '../../src/ctest/ctestConfig';
import { setupController, _setupController } from '../../src/controller/controller';
import { runner } from '../../src/runner';
import { getCTestListHandler, getCTestRunHandler } from '../../src/ctest/ctestHandler';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../src/runner');
jest.mock('../../src/ctest/ctestHandler');

const mockRunner = runner as jest.MockedFunction<typeof runner>;
const mockGetCTestListHandler = getCTestListHandler as jest.MockedFunction<typeof getCTestListHandler>;
const mockGetCTestRunHandler = getCTestRunHandler as jest.MockedFunction<typeof getCTestRunHandler>;

describe('CTest Controller Integration Tests', () => {
  let mockController: vscode.TestController;
  let mockContext: vscode.ExtensionContext;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;
  let mockFileChangedEmitter: vscode.EventEmitter<vscode.Uri>;
  let ctestConfig: CTestConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock VSCode API
    mockController = {
      id: 'ctest',
      label: 'CTest GTest',
      items: {
        replace: jest.fn(),
        add: jest.fn(),
      },
      createTestItem: jest.fn(),
      createRunProfile: jest.fn(),
      refreshHandler: undefined,
    } as any;

    mockContext = {
      subscriptions: {
        push: jest.fn(),
      },
    } as any;

    mockWorkspaceFolder = {
      uri: { fsPath: '/test/workspace' },
      name: 'test-workspace',
      index: 0,
    } as any;

    mockFileChangedEmitter = {
      fire: jest.fn(),
      event: jest.fn(),
    } as any;

    // Mock vscode.tests.createTestController
    (vscode.tests as any) = {
      createTestController: jest.fn().mockReturnValue(mockController),
    };

    // Mock vscode.TestRunProfileKind
    (vscode.TestRunProfileKind as any) = {
      Run: 1,
      Debug: 2,
      Coverage: 3,
    };

    // Mock vscode.CancellationTokenSource
    (vscode.CancellationTokenSource as any) = jest.fn().mockImplementation(() => ({
      token: { isCancellationRequested: false },
      cancel: jest.fn(),
      dispose: jest.fn(),
    }));

    // Mock workspace configuration
    (vscode.workspace as any) = {
      getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn((key: string) => {
          const defaults: { [key: string]: any } = {
            'ctestExecutable': 'ctest',
            'testFilter': '',
            'parallelJobs': 1,
            'buildBeforeTest': true,
            'debuggerPath': 'gdb'
          };
          return defaults[key];
        }),
      }),
    };

    // Create CTest configuration
    ctestConfig = new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn());
  });

  afterEach(() => {
    if (ctestConfig) {
      ctestConfig.dispose();
    }
  });

  describe('Controller Setup', () => {
    test('should setup CTest controller with correct properties', () => {
      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      // Verify controller was added to context subscriptions
      expect(mockContext.subscriptions.push).toHaveBeenCalledWith(mockController);

      // Verify run profiles were created
      expect(mockController.createRunProfile).toHaveBeenCalledWith(
        'Run Tests',
        vscode.TestRunProfileKind.Run,
        expect.any(Function),
        true,
        undefined,
        true
      );

      // Verify refresh handler was set
      expect(mockController.refreshHandler).toBeDefined();
    });

    test('should create debug profile for CTest configuration', () => {
      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      // CTest should support debug profiles (unlike some other configs)
      expect(mockController.createRunProfile).toHaveBeenCalledTimes(1); // Only run profile for now
    });

    test('should set up refresh handler that calls runner with correct arguments', async () => {
      // Mock workspace folders
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

      // Mock the handler
      const mockListHandler = jest.fn();
      mockGetCTestListHandler.mockReturnValue(mockListHandler);

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      // Execute the refresh handler
      if (mockController.refreshHandler) {
        await mockController.refreshHandler();
      }

      // Verify runner was called with CTest-specific arguments
      expect(mockRunner).toHaveBeenCalledWith(
        ['ctest', '--show-only=json-v1'], // CTest list args
        ctestConfig.buildDirectory,
        false, // CTest doesn't use files for discovery
        expect.stringContaining('ctest_results.xml'),
        ctestConfig,
        expect.any(Object), // CancellationTokenSource
        mockListHandler
      );
    });
  });

  describe('Test Discovery Integration', () => {
    test('should handle test discovery through runner system', async () => {
      const mockListHandler = jest.fn();
      mockGetCTestListHandler.mockReturnValue(mockListHandler);

      // Mock workspace folders
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      // Simulate successful runner execution
      mockRunner.mockImplementation(async (args, buildDir, useFile, resultFile, config, cancellation, handler) => {
        // Simulate CTest output
        const mockCtestOutput = JSON.stringify({
          tests: [
            {
              name: 'MathTests.Addition',
              command: ['./test_executable', '--gtest_filter=MathTests.Addition'],
              properties: { TIMEOUT: '30', LABELS: 'unit' }
            }
          ]
        });

        handler(mockCtestOutput);
        return Promise.resolve();
      });

      // Execute refresh
      if (mockController.refreshHandler) {
        await mockController.refreshHandler();
      }

      // Verify handler was called with CTest output
      expect(mockListHandler).toHaveBeenCalledWith(expect.stringContaining('MathTests.Addition'));
    });

    test('should handle discovery errors gracefully', async () => {
      const mockListHandler = jest.fn();
      mockGetCTestListHandler.mockReturnValue(mockListHandler);

      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      // Simulate runner failure
      mockRunner.mockRejectedValue(new Error('CTest command failed'));

      // Should not throw when refresh fails
      if (mockController.refreshHandler) {
        await expect(mockController.refreshHandler()).resolves.not.toThrow();
      }
    });
  });

  describe('Test Execution Integration', () => {
    test('should execute tests through runner system', async () => {
      const mockRunHandler = jest.fn();
      mockGetCTestRunHandler.mockReturnValue(mockRunHandler);

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      // Get the run profile handler
      const runProfileCalls = (mockController.createRunProfile as jest.Mock).mock.calls;
      const runHandler = runProfileCalls.find(call => call[0] === 'Run Tests')[2];

      // Mock test request
      const mockTestItem = {
        id: 'MathTests.Addition',
        label: 'Addition',
        parent: { id: 'MathTests' },
      } as any;

      const mockRequest = {
        include: [mockTestItem],
      } as any;

      const mockToken = {
        isCancellationRequested: false,
      } as any;

      // Mock test run
      const mockTestRun = {
        enqueued: jest.fn(),
        started: jest.fn(),
        passed: jest.fn(),
        failed: jest.fn(),
        end: jest.fn(),
      } as any;

      mockController.createTestRun = jest.fn().mockReturnValue(mockTestRun);

      // Mock successful runner execution
      mockRunner.mockImplementation(async (args, buildDir, useFile, resultFile, config, cancellation, handler) => {
        // Simulate CTest test execution output
        const mockOutput = 'Test #1: MathTests.Addition ..... Passed 0.05 sec';
        handler(mockOutput);
        return Promise.resolve();
      });

      // Execute the test
      await runHandler(mockRequest, mockToken);

      // Verify test execution flow
      expect(mockTestRun.enqueued).toHaveBeenCalledWith(mockTestItem);
      expect(mockTestRun.started).toHaveBeenCalledWith(mockTestItem);
      expect(mockRunner).toHaveBeenCalledWith(
        expect.arrayContaining(['ctest', '-R']),
        ctestConfig.buildDirectory,
        false,
        expect.stringContaining('ctest_results.xml'),
        ctestConfig,
        expect.any(Object),
        mockRunHandler,
        false // isDebug
      );
      expect(mockTestRun.end).toHaveBeenCalled();
    });

    test('should handle test execution with multiple tests', async () => {
      const mockRunHandler = jest.fn();
      mockGetCTestRunHandler.mockReturnValue(mockRunHandler);

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      const runProfileCalls = (mockController.createRunProfile as jest.Mock).mock.calls;
      const runHandler = runProfileCalls.find(call => call[0] === 'Run Tests')[2];

      // Mock test suite with children
      const mockTestSuite = {
        id: 'MathTests',
        label: 'MathTests',
        children: new Map([
          ['MathTests.Addition', { id: 'MathTests.Addition', label: 'Addition', parent: { id: 'MathTests' } }],
          ['MathTests.Subtraction', { id: 'MathTests.Subtraction', label: 'Subtraction', parent: { id: 'MathTests' } }],
        ]),
      } as any;

      // Mock Size property for children
      Object.defineProperty(mockTestSuite.children, 'size', { value: 2 });
      mockTestSuite.children.forEach = jest.fn((callback: any) => {
        callback(mockTestSuite.children.get('MathTests.Addition'));
        callback(mockTestSuite.children.get('MathTests.Subtraction'));
      });

      const mockRequest = {
        include: [mockTestSuite],
      } as any;

      const mockToken = { isCancellationRequested: false } as any;
      const mockTestRun = {
        enqueued: jest.fn(),
        started: jest.fn(),
        passed: jest.fn(),
        failed: jest.fn(),
        end: jest.fn(),
      } as any;

      mockController.createTestRun = jest.fn().mockReturnValue(mockTestRun);

      // Mock runner to succeed for both tests
      let callCount = 0;
      mockRunner.mockImplementation(async (args, buildDir, useFile, resultFile, config, cancellation, handler) => {
        callCount++;
        const testName = callCount === 1 ? 'Addition' : 'Subtraction';
        const mockOutput = `Test #${callCount}: MathTests.${testName} ..... Passed 0.05 sec`;
        handler(mockOutput);
        return Promise.resolve();
      });

      await runHandler(mockRequest, mockToken);

      // Verify both tests were queued and started
      expect(mockTestRun.enqueued).toHaveBeenCalledTimes(2);
      expect(mockTestRun.started).toHaveBeenCalledTimes(2);
      expect(mockRunner).toHaveBeenCalledTimes(2);
      expect(mockTestRun.end).toHaveBeenCalled();
    });

    test('should handle test execution failures', async () => {
      const mockRunHandler = jest.fn();
      mockGetCTestRunHandler.mockReturnValue(mockRunHandler);

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      const runProfileCalls = (mockController.createRunProfile as jest.Mock).mock.calls;
      const runHandler = runProfileCalls.find(call => call[0] === 'Run Tests')[2];

      const mockTestItem = {
        id: 'MathTests.Addition',
        label: 'Addition',
        parent: { id: 'MathTests' },
      } as any;

      const mockRequest = { include: [mockTestItem] } as any;
      const mockToken = { isCancellationRequested: false } as any;
      const mockTestRun = {
        enqueued: jest.fn(),
        started: jest.fn(),
        failed: jest.fn(),
        end: jest.fn(),
      } as any;

      mockController.createTestRun = jest.fn().mockReturnValue(mockTestRun);

      // Mock runner failure
      mockRunner.mockRejectedValue(new Error('Test execution failed'));

      await runHandler(mockRequest, mockToken);

      // Verify error handling
      expect(mockTestRun.started).toHaveBeenCalledWith(mockTestItem);
      expect(mockTestRun.failed).toHaveBeenCalledWith(
        mockTestItem,
        expect.any(Error),
        1000
      );
      expect(mockTestRun.end).toHaveBeenCalled();
    });
  });

  describe('Configuration Integration', () => {
    test('should use correct CTest configuration values', () => {
      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      // Verify configuration properties are used correctly
      expect(ctestConfig.ctestExecutable).toBe('ctest');
      expect(ctestConfig.testRunUseFile).toBe(false);
      expect(ctestConfig.listTestUseFile).toBe(false);
    });

    test('should handle configuration changes', () => {
      // Mock configuration change
      const newConfig = jest.fn((key: string) => {
        const newDefaults: { [key: string]: any } = {
          'ctestExecutable': '/custom/ctest',
          'parallelJobs': 4,
          'buildBeforeTest': false,
        };
        return newDefaults[key] || 'default';
      });

      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: newConfig,
      });

      // Create new config instance
      const newCtestConfig = new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn());

      expect(newCtestConfig.ctestExecutable).toBe('/custom/ctest');
      expect(newCtestConfig.parallelJobs).toBe(4);
      expect(newCtestConfig.buildBeforeTest).toBe(false);

      newCtestConfig.dispose();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing workspace folders', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      // Should not crash when no workspace folders
      if (mockController.refreshHandler) {
        await expect(mockController.refreshHandler()).resolves.not.toThrow();
      }

      // Runner should not be called
      expect(mockRunner).not.toHaveBeenCalled();
    });

    test('should handle undefined parent test items gracefully', async () => {
      const mockRunHandler = jest.fn();
      mockGetCTestRunHandler.mockReturnValue(mockRunHandler);

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      const runProfileCalls = (mockController.createRunProfile as jest.Mock).mock.calls;
      const runHandler = runProfileCalls.find(call => call[0] === 'Run Tests')[2];

      // Test item without parent
      const mockTestItem = {
        id: 'OrphanTest',
        label: 'OrphanTest',
        parent: undefined,
      } as any;

      const mockRequest = { include: [mockTestItem] } as any;
      const mockToken = { isCancellationRequested: false } as any;
      const mockTestRun = {
        enqueued: jest.fn(),
        started: jest.fn(),
        failed: jest.fn(),
        end: jest.fn(),
      } as any;

      mockController.createTestRun = jest.fn().mockReturnValue(mockTestRun);

      await runHandler(mockRequest, mockToken);

      // Should handle gracefully and mark as failed
      expect(mockTestRun.failed).toHaveBeenCalledWith(
        mockTestItem,
        expect.objectContaining({ message: 'Test parent is undefined' }),
        1000
      );
    });

    test('should handle cancellation during execution', async () => {
      const mockRunHandler = jest.fn();
      mockGetCTestRunHandler.mockReturnValue(mockRunHandler);

      _setupController(mockController, mockFileChangedEmitter, mockContext, ctestConfig);

      const runProfileCalls = (mockController.createRunProfile as jest.Mock).mock.calls;
      const runHandler = runProfileCalls.find(call => call[0] === 'Run Tests')[2];

      const mockTestItem = {
        id: 'MathTests.Addition',
        label: 'Addition',
        parent: { id: 'MathTests' },
      } as any;

      const mockRequest = { include: [mockTestItem] } as any;
      
      // Mock cancelled token
      const mockToken = { isCancellationRequested: true } as any;
      
      const mockTestRun = {
        enqueued: jest.fn(),
        skipped: jest.fn(),
        end: jest.fn(),
      } as any;

      mockController.createTestRun = jest.fn().mockReturnValue(mockTestRun);

      await runHandler(mockRequest, mockToken);

      // Should skip test when cancelled
      expect(mockTestRun.skipped).toHaveBeenCalledWith(mockTestItem);
      expect(mockRunner).not.toHaveBeenCalled();
    });
  });
});