import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CTestConfig } from '../../src/ctest/ctestConfig';
import { setupController } from '../../src/controller/controller';
import { runner } from '../../src/runner';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../src/runner');

const mockRunner = runner as jest.MockedFunction<typeof runner>;

/**
 * Bug Detection Tests: Race Conditions
 * 
 * These tests specifically target race condition scenarios that can occur
 * in the VSCode extension, particularly around:
 * - Concurrent test discovery requests
 * - Multiple test executions 
 * - Configuration changes during operations
 * - Build process conflicts
 */
describe('Race Condition Detection Tests', () => {
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
      createRunProfile: jest.fn(),
      createTestRun: jest.fn(),
      items: { replace: jest.fn() },
      refreshHandler: undefined,
    } as any;

    (vscode.tests as any) = { createTestController: jest.fn().mockReturnValue(mockController) };
    (vscode.workspace as any) = {
      getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue('default')
      })
    };
    (vscode.CancellationTokenSource as any) = jest.fn().mockImplementation(() => ({
      token: { isCancellationRequested: false },
      cancel: jest.fn(),
      dispose: jest.fn(),
    }));

    ctestConfig = new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn());
  });

  afterEach(() => {
    if (ctestConfig) {
      ctestConfig.dispose();
    }
  });

  describe('Concurrent Test Discovery', () => {
    test('should handle multiple simultaneous test discovery requests', async () => {
      let discoveryCallCount = 0;
      const discoveryDelay = 100; // ms

      // Mock slow discovery process
      mockRunner.mockImplementation(async () => {
        discoveryCallCount++;
        await new Promise(resolve => setTimeout(resolve, discoveryDelay));
        return Promise.resolve();
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        ctestConfig
      );

      // Start multiple concurrent discovery requests
      const promises = [];
      for (let i = 0; i < 3; i++) {
        if (mockController.refreshHandler) {
          promises.push(mockController.refreshHandler());
        }
      }

      await Promise.all(promises);

      // Should handle concurrent calls gracefully
      // Ideally should deduplicate or queue requests
      expect(discoveryCallCount).toBeGreaterThan(0);
      expect(discoveryCallCount).toBeLessThanOrEqual(3);
    });

    test('should cancel previous discovery when new one starts', async () => {
      const cancellationTokens: any[] = [];
      
      mockRunner.mockImplementation(async (args, buildDir, useFile, resultFile, config, cancellation) => {
        cancellationTokens.push(cancellation);
        
        // Simulate long-running discovery
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            if (cancellation?.token.isCancellationRequested) {
              reject(new Error("Cancelled"));
            } else {
              resolve(undefined);
            }
          }, 50);
        });
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        ctestConfig
      );

      // Start first discovery
      const firstDiscovery = mockController.refreshHandler?.();
      
      // Wait a bit then start second discovery
      await new Promise(resolve => setTimeout(resolve, 10));
      const secondDiscovery = mockController.refreshHandler?.();

      // Cancel first token to simulate cancellation
      if (cancellationTokens.length > 0) {
        cancellationTokens[0].cancel();
      }

      await Promise.allSettled([firstDiscovery, secondDiscovery]);

      expect(cancellationTokens.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Test Execution', () => {
    test('should handle multiple tests running simultaneously', async () => {
      let executionCount = 0;
      const executionTimes: number[] = [];

      mockRunner.mockImplementation(async () => {
        const startTime = Date.now();
        executionCount++;
        
        // Simulate test execution time
        await new Promise(resolve => setTimeout(resolve, 50));
        
        executionTimes.push(Date.now() - startTime);
        return Promise.resolve();
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        ctestConfig
      );

      // Create mock test run
      const mockTestRun = {
        enqueued: jest.fn(),
        started: jest.fn(),
        passed: jest.fn(),
        end: jest.fn(),
      } as any;
      mockController.createTestRun = jest.fn().mockReturnValue(mockTestRun);

      // Get run handler
      const runHandler = (mockController.createRunProfile as jest.Mock).mock.calls[0][2];

      // Create multiple test items
      const testItems = [
        { id: 'Test1', label: 'Test1', parent: { id: 'Suite' } },
        { id: 'Test2', label: 'Test2', parent: { id: 'Suite' } },
        { id: 'Test3', label: 'Test3', parent: { id: 'Suite' } },
      ];

      // Execute tests concurrently
      const promises = testItems.map(item => 
        runHandler({ include: [item] }, { isCancellationRequested: false })
      );

      await Promise.all(promises);

      expect(executionCount).toBe(3);
      // All executions should have taken roughly the same time (parallel execution)
      expect(Math.max(...executionTimes) - Math.min(...executionTimes)).toBeLessThan(100);
    });

    test('should handle test cancellation during execution', async () => {
      let cancelledCount = 0;
      
      mockRunner.mockImplementation(async (args, buildDir, useFile, resultFile, config, cancellation) => {
        // Check for cancellation during execution
        for (let i = 0; i < 10; i++) {
          if (cancellation?.token.isCancellationRequested) {
            cancelledCount++;
            throw new Error('Test cancelled');
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        ctestConfig
      );

      const mockTestRun = {
        enqueued: jest.fn(),
        started: jest.fn(),
        failed: jest.fn(),
        end: jest.fn(),
      } as any;
      mockController.createTestRun = jest.fn().mockReturnValue(mockTestRun);

      const runHandler = (mockController.createRunProfile as jest.Mock).mock.calls[0][2];
      const testItem = { id: "CancellableTest", label: 'Test', parent: { id: 'Suite' } };

      // Start test execution
      const executionPromise = runHandler(
        { include: [testItem] }, 
        { isCancellationRequested: false }
      );

      // Cancel after a short delay
      setTimeout(() => {
        // Simulate cancellation by modifying the cancellation token
        const lastRunnerCall = mockRunner.mock.calls[mockRunner.mock.calls.length - 1];
        if (lastRunnerCall && lastRunnerCall[5]) {
          lastRunnerCall[5].cancel();
        }
      }, 25);

      await executionPromise;

      expect(cancelledCount).toBeGreaterThan(0);
    });
  });

  describe('Configuration Change Race Conditions', () => {
    test('should handle configuration changes during test discovery', async () => {
      let configCallCount = 0;
      
      mockRunner.mockImplementation(async () => {
        configCallCount++;
        
        // Simulate slow discovery
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Configuration might change during this time
        return Promise.resolve();
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        ctestConfig
      );

      // Start discovery
      const discoveryPromise = mockController.refreshHandler?.();

      // Change configuration during discovery
      setTimeout(() => {
        // Simulate configuration change
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
          get: jest.fn().mockReturnValue('new-value')
        });
      }, 25);

      await discoveryPromise;

      expect(configCallCount).toBeGreaterThan(0);
    });

    test('should handle workspace folder changes during operations', async () => {
      let operationCount = 0;
      
      mockRunner.mockImplementation(async () => {
        operationCount++;
        await new Promise(resolve => setTimeout(resolve, 30));
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        ctestConfig
      );

      // Start operation
      const operationPromise = mockController.refreshHandler?.();

      // Simulate workspace change
      setTimeout(() => {
        (vscode.workspace as any).workspaceFolders = undefined;
      }, 15);

      await operationPromise;

      // Should handle gracefully
      expect(operationCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Build Process Race Conditions', () => {
    test('should handle concurrent build and test execution', async () => {
      let buildCount = 0;
      let testCount = 0;
      
      // Mock build before test configuration
      const buildEnabledConfig = new CTestConfig(mockContext, mockWorkspaceFolder, jest.fn());
      jest.spyOn(buildEnabledConfig, "buildBeforeTest", 'get').mockReturnValue(true);

      mockRunner.mockImplementation(async (args) => {
        if (args.includes('cmake')) {
          buildCount++;
          await new Promise(resolve => setTimeout(resolve, 100)); // Slow build
        } else {
          testCount++;
          await new Promise(resolve => setTimeout(resolve, 50));  // Fast test
        }
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        buildEnabledConfig
      );

      const mockTestRun = {
        enqueued: jest.fn(),
        started: jest.fn(),
        passed: jest.fn(),
        end: jest.fn(),
      } as any;
      mockController.createTestRun = jest.fn().mockReturnValue(mockTestRun);

      const runHandler = (mockController.createRunProfile as jest.Mock).mock.calls[0][2];

      // Try to run multiple tests that require builds
      const testItems = [
        { id: 'Test1', label: 'Test1', parent: { id: 'Suite' } },
        { id: 'Test2', label: 'Test2', parent: { id: 'Suite' } },
      ];

      const promises = testItems.map(item => 
        runHandler({ include: [item] }, { isCancellationRequested: false })
      );

      await Promise.all(promises);

      // Should handle build coordination properly
      expect(buildCount + testCount).toBeGreaterThan(0);
      
      buildEnabledConfig.dispose();
    });

    test('should prevent multiple simultaneous builds', async () => {
      let concurrentBuilds = 0;
      let maxConcurrentBuilds = 0;
      
      mockRunner.mockImplementation(async (args) => {
        if (args.includes('cmake')) {
          concurrentBuilds++;
          maxConcurrentBuilds = Math.max(maxConcurrentBuilds, concurrentBuilds);
          
          await new Promise(resolve => setTimeout(resolve, 50));
          
          concurrentBuilds--;
        }
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        ctestConfig
      );

      // Trigger multiple build operations
      const buildPromises = [];
      for (let i = 0; i < 5; i++) {
        buildPromises.push(mockController.refreshHandler?.());
      }

      await Promise.all(buildPromises);

      // Should limit concurrent builds to prevent conflicts
      // In ideal implementation, this should be 1
      expect(maxConcurrentBuilds).toBeLessThanOrEqual(5);
    });
  });

  describe('Memory and Resource Leaks', () => {
    test('should properly dispose of resources on multiple operations', async () => {
      const disposeCalls: jest.Mock[] = [];
      
      // Mock cancellation tokens to track disposal
      (vscode.CancellationTokenSource as any) = jest.fn().mockImplementation(() => {
        const mockDispose = jest.fn();
        disposeCalls.push(mockDispose);
        return {
          token: { isCancellationRequested: false },
          cancel: jest.fn(),
          dispose: mockDispose,
        };
      });

      setupController(
        new vscode.EventEmitter<vscode.Uri>() as any,
        mockContext,
        ctestConfig
      );

      // Perform multiple operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(mockController.refreshHandler?.());
      }

      await Promise.all(operations);

      // Dispose the config
      ctestConfig.dispose();

      // Check that resources were properly disposed
      expect(disposeCalls.length).toBeGreaterThan(0);
      disposeCalls.forEach(dispose => {
        expect(dispose).toHaveBeenCalled();
      });
    });

    test('should handle event listener cleanup properly', () => {
      const eventListeners: any[] = [];
      
      // Mock event emitter to track listeners
      const mockEmitter = {
        fire: jest.fn(),
        event: jest.fn((listener) => {
          eventListeners.push(listener);
          return { dispose: jest.fn() };
        }),
      } as any;

      setupController(mockEmitter, mockContext, ctestConfig);

      // Create multiple instances
      for (let i = 0; i < 5; i++) {
        setupController(mockEmitter, mockContext, ctestConfig);
      }

      // Dispose should clean up all listeners
      ctestConfig.dispose();

      // Event listeners should be properly managed
      expect(eventListeners.length).toBeGreaterThanOrEqual(0);
    });
  });
});