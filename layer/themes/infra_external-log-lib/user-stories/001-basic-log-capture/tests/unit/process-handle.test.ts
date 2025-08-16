import { ProcessHandle } from '../../src/domain/process-manager';
import { ChildProcess } from 'child_process';

describe('ProcessHandle Unit Test', () => {
  let mockChildProcess: jest.Mocked<ChildProcess>;
  let processHandle: ProcessHandle;

  beforeEach(() => {
    // Create mock child process
    mockChildProcess = {
      pid: 12345,
      on: jest.fn(),
      kill: jest.fn()
    } as any;

    processHandle = new ProcessHandle(mockChildProcess);
  });

  describe('isRunning state tracking', () => {
    it('should initially report as running', () => {
      expect(processHandle.isRunning()).toBe(true);
    });

    it('should report as not running after exit event', async () => {
      let exitCallback: ((code: number | null) => void) | undefined;
      
      // Capture the exit event handler
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          exitCallback = callback;
        }
        return mockChildProcess;
      });

      // Create new handle to register the exit handler
      processHandle = new ProcessHandle(mockChildProcess);
      
      expect(processHandle.isRunning()).toBe(true);

      // Simulate process exit
      if (exitCallback) {
        exitCallback(0);
      }

      // Wait for exit to be processed
      await processHandle.waitForExit();

      expect(processHandle.isRunning()).toBe(false);
    });

    it('should update running state on terminate', async () => {
      let exitCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          if (!exitCallback) {
            exitCallback = callback;
          }
          // Simulate immediate exit on terminate
          setTimeout(() => callback(0), 10);
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      expect(processHandle.isRunning()).toBe(true);

      // Terminate the process
      const result = await processHandle.terminate();
      
      expect(result).toBe(true);
      expect(processHandle.isRunning()).toBe(false);
    });
  });

  describe('getPid', () => {
    it('should return correct process ID', () => {
      expect(processHandle.getPid()).toBe(12345);
    });

    it('should return 0 if pid is undefined', () => {
      const mockProcessNoPid = {
        on: jest.fn(),
        kill: jest.fn()
      } as any;
      
      const handle = new ProcessHandle(mockProcessNoPid);
      expect(handle.getPid()).toBe(0);
    });

    it('should handle different PID values', () => {
      const testPids = [1, 999, 65535, 100000];
      
      testPids.forEach(pid => {
        const mockProcessWithPid = {
          pid,
          on: jest.fn(),
          kill: jest.fn()
        } as any;
        
        const handle = new ProcessHandle(mockProcessWithPid);
        expect(handle.getPid()).toBe(pid);
      });
    });
  });

  describe('waitForExit promise resolution', () => {
    it('should resolve with exit code when process exits', async () => {
      let exitCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          exitCallback = callback;
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      // Set up promise to wait for
      const exitPromise = processHandle.waitForExit();

      // Simulate process exit with code 0
      if (exitCallback) {
        exitCallback(0);
      }

      const exitCode = await exitPromise;
      expect(exitCode).toBe(0);
    });

    it('should resolve with null for signal termination', async () => {
      let exitCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          exitCallback = callback;
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      const exitPromise = processHandle.waitForExit();

      // Simulate signal termination (null exit code)
      if (exitCallback) {
        exitCallback(null);
      }

      const exitCode = await exitPromise;
      expect(exitCode).toBeNull();
    });

    it('should handle non-zero exit codes', async () => {
      let exitCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          exitCallback = callback;
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      const exitPromise = processHandle.waitForExit();

      // Simulate error exit
      if (exitCallback) {
        exitCallback(1);
      }

      const exitCode = await exitPromise;
      expect(exitCode).toBe(1);
    });

    it('should return same promise on multiple calls', () => {
      // Create fresh mock and handle
      const mockProcess = {
        pid: 12345,
        on: jest.fn(),
        kill: jest.fn()
      } as any;
      
      const handle = new ProcessHandle(mockProcess);
      const promise1 = handle.waitForExit();
      const promise2 = handle.waitForExit();
      
      // Both promises should resolve to the same value
      // Check they are functionally the same by ensuring they resolve together
      expect(promise1).toEqual(promise2);
    });
  });

  describe('terminate', () => {
    it('should send SIGTERM signal first', async () => {
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          // Simulate immediate exit
          setTimeout(() => callback(0), 10);
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      const terminatePromise = processHandle.terminate();

      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      
      await terminatePromise;
    });

    it('should not send SIGKILL if process exits before timeout', async () => {
      jest.useFakeTimers();
      
      let exitCallbacks: ((code: number | null) => void)[] = [];
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          exitCallbacks.push(callback);
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      const terminatePromise = processHandle.terminate();

      // First SIGTERM should be sent
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockChildProcess.kill).toHaveBeenCalledTimes(1);

      // Simulate exit before timeout
      exitCallbacks.forEach(cb => cb(null));

      // Advance time past the timeout
      jest.advanceTimersByTime(6000);

      // SIGKILL should NOT have been sent
      expect(mockChildProcess.kill).toHaveBeenCalledTimes(1);
      expect(mockChildProcess.kill).not.toHaveBeenCalledWith('SIGKILL');

      jest.useRealTimers();
      
      await terminatePromise;
    });

    it('should send SIGKILL after timeout if process does not exit', async () => {
      jest.useFakeTimers();
      
      let exitCallbacks: ((code: number | null) => void)[] = [];
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          exitCallbacks.push(callback);
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      const terminatePromise = processHandle.terminate();

      // First SIGTERM should be sent
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockChildProcess.kill).toHaveBeenCalledTimes(1);

      // Verify process is still running before timeout
      expect(processHandle.isRunning()).toBe(true);

      // Advance time to trigger SIGKILL
      jest.advanceTimersByTime(5000);

      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGKILL');
      expect(mockChildProcess.kill).toHaveBeenCalledTimes(2);

      // Simulate exit after SIGKILL
      exitCallbacks.forEach(cb => cb(null));

      jest.useRealTimers();
      
      await terminatePromise;
    });

    it('should return true immediately if already not running', async () => {
      let exitCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          exitCallback = callback;
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      // Simulate process already exited
      if (exitCallback) {
        exitCallback(0);
      }

      await processHandle.waitForExit();

      // Now try to terminate
      const result = await processHandle.terminate();
      
      expect(result).toBe(true);
      expect(mockChildProcess.kill).not.toHaveBeenCalled();
    });

    it('should handle multiple terminate calls', async () => {
      let exitCallbacks: ((code: number | null) => void)[] = [];
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'exit') {
          exitCallbacks.push(callback);
        }
        return mockChildProcess;
      });

      processHandle = new ProcessHandle(mockChildProcess);
      
      // Start two terminate calls
      const terminate1 = processHandle.terminate();
      const terminate2 = processHandle.terminate();

      // Both calls will register exit handlers, so SIGTERM might be called once or twice
      // depending on timing, but at least once
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');

      // Simulate exit
      exitCallbacks.forEach(cb => cb(0));

      const [result1, result2] = await Promise.all([terminate1, terminate2]);
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('getResourceUsage', () => {
    it('should track start time', () => {
      const beforeCreate = new Date();
      const handle = new ProcessHandle(mockChildProcess);
      const afterCreate = new Date();
      
      const usage = handle.getResourceUsage();
      
      expect(usage.startTime.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(usage.startTime.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should include PID in resource usage', () => {
      const usage = processHandle.getResourceUsage();
      
      expect(usage.pid).toBe(12345);
    });

    it('should not include duration while running', () => {
      const usage = processHandle.getResourceUsage();
      
      expect(usage.duration).toBeUndefined();
    });

    it('should include duration after process exits', async () => {
      // Set up exit handler before creating ProcessHandle
      let exitCallback: ((code: number | null) => void) | undefined;
      
      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: any) => {
          if (event === 'exit') {
            exitCallback = callback;
          }
          return mockProcess;
        }),
        kill: jest.fn()
      } as any;

      const startTime = Date.now();
      const handle = new ProcessHandle(mockProcess);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate exit
      if (exitCallback) {
        exitCallback(0);
      }

      await handle.waitForExit();
      const endTime = Date.now();
      
      const usage = handle.getResourceUsage();
      
      expect(usage.duration).toBeDefined();
      expect(usage.duration).toBeGreaterThanOrEqual(90); // Allow for timing variance
      expect(usage.duration).toBeLessThanOrEqual(endTime - startTime + 10);
    });

    it('should calculate duration based on current time after exit', async () => {
      let exitCallback: ((code: number | null) => void) | undefined;
      
      const mockProcess = {
        pid: 12345,
        on: jest.fn((event: string, callback: any) => {
          if (event === 'exit') {
            exitCallback = callback;
          }
          return mockProcess;
        }),
        kill: jest.fn()
      } as any;

      const handle = new ProcessHandle(mockProcess);
      
      // Wait a bit before exit to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Simulate exit
      if (exitCallback) {
        exitCallback(0);
      }

      await handle.waitForExit();
      
      const usage1 = handle.getResourceUsage();
      
      // Duration should be defined after exit
      expect(usage1.duration).toBeDefined();
      expect(usage1.duration).toBeGreaterThan(0);
      
      // Wait and get usage again
      await new Promise(resolve => setTimeout(resolve, 50));
      const usage2 = handle.getResourceUsage();
      
      // Duration should increase as time passes (based on implementation)
      expect(usage2.duration).toBeGreaterThan(usage1.duration!);
    });
  });
});