import { spawn, ChildProcess } from 'child_process';
import { LogCaptureSession } from '../../src/application/aidev-platform';
import { externalLogLib, LogEntry } from '../../src/external/external-log-lib';
import { ProcessManager, ProcessHandle } from '../../src/domain/process-manager';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock external log lib
jest.mock('../../src/external/external-log-lib', () => ({
  externalLogLib: {
    createCapturer: jest.fn()
  }
}));

// Mock ProcessManager
jest.mock('../../src/domain/process-manager');

describe('LogCaptureSession Comprehensive Unit Test', () => {
  let mockChildProcess: jest.Mocked<ChildProcess>;
  let mockCapturer: any;
  let mockProcessManager: jest.Mocked<ProcessManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock child process
    mockChildProcess = {
      pid: 12345,
      on: jest.fn(),
      stdout: null,
      stderr: null,
      kill: jest.fn()
    } as any;

    (spawn as jest.Mock).mockReturnValue(mockChildProcess);

    // Mock capturer
    mockCapturer = {
      onLog: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };

    (externalLogLib.createCapturer as jest.Mock).mockReturnValue(mockCapturer);

    // Mock ProcessManager
    mockProcessManager = new ProcessManager() as jest.Mocked<ProcessManager>;
  });

  describe('process spawning', () => {
    it('should spawn process with correct command and args', () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("test")'],
        captureOutput: true
      };

      new LogCaptureSession(config, mockProcessManager);

      expect(spawn).toHaveBeenCalledWith('node', ['-e', 'console.log("test")']);
      expect(spawn).toHaveBeenCalledTimes(1);
    });

    it('should create process without ProcessManager', () => {
      const config = {
        command: 'ls',
        args: ['-la'],
        captureOutput: false
      };

      new LogCaptureSession(config);

      expect(spawn).toHaveBeenCalledWith('ls', ['-la']);
    });

    it('should handle process with ProcessManager', () => {
      const config = {
        command: 'echo',
        args: ['hello'],
        captureOutput: true
      };

      const session = new LogCaptureSession(config, mockProcessManager);
      
      // Should have process handle placeholder
      expect(session.getProcessHandle()).toBeUndefined();
      
      // Can set process handle later
      const mockHandle = {
        pid: 123,
        isRunning: jest.fn().mockReturnValue(true),
        getPid: jest.fn().mockReturnValue(123),
        waitForExit: jest.fn(),
        terminate: jest.fn(),
        getResourceUsage: jest.fn()
      } as unknown as ProcessHandle;
      session.setProcessHandle(mockHandle);
      expect(session.getProcessHandle()).toBe(mockHandle);
    });
  });

  describe('capturer integration', () => {
    it('should create capturer with spawned process', () => {
      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      new LogCaptureSession(config);

      expect(externalLogLib.createCapturer).toHaveBeenCalledWith(mockChildProcess);
      expect(externalLogLib.createCapturer).toHaveBeenCalledTimes(1);
    });

    it('should register log callback with capturer', () => {
      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      new LogCaptureSession(config);

      expect(mockCapturer.onLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should start capturer when captureOutput is true', () => {
      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      new LogCaptureSession(config);

      expect(mockCapturer.start).toHaveBeenCalledTimes(1);
    });

    it('should not start capturer when captureOutput is false', () => {
      const config = {
        command: 'test',
        args: [],
        captureOutput: false
      };

      new LogCaptureSession(config);

      expect(mockCapturer.start).not.toHaveBeenCalled();
    });

    it('should stop capturer on process close', async () => {
      let closeCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'close') {
          closeCallback = callback;
        }
        return mockChildProcess;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      new LogCaptureSession(config);

      // Simulate process close
      if (closeCallback) {
        closeCallback(0);
      }

      expect(mockCapturer.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('log storage', () => {
    it('should store logs from capturer', () => {
      let logCallback: ((entry: LogEntry) => void) | undefined;
      
      mockCapturer.onLog.mockImplementation((callback: (entry: LogEntry) => void) => {
        logCallback = callback;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);

      // Simulate log entries
      const log1: LogEntry = {
        timestamp: new Date(),
        level: 'info',
        message: 'Log 1',
        source: 'stdout'
      };

      const log2: LogEntry = {
        timestamp: new Date(),
        level: 'error',
        message: 'Log 2',
        source: 'stderr'
      };

      if (logCallback) {
        logCallback(log1);
        logCallback(log2);
      }

      const logs = session.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0]).toEqual(log1);
      expect(logs[1]).toEqual(log2);
    });

    it('should maintain log order', () => {
      let logCallback: ((entry: LogEntry) => void) | undefined;
      
      mockCapturer.onLog.mockImplementation((callback: (entry: LogEntry) => void) => {
        logCallback = callback;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);

      // Add multiple logs
      const logs: LogEntry[] = [];
      for (let i = 0; i < 10; i++) {
        const log: LogEntry = {
          timestamp: new Date(),
          level: 'info',
          message: `Log ${i}`,
          source: 'stdout'
        };
        logs.push(log);
        if (logCallback) {
          logCallback(log);
        }
      }

      const storedLogs = session.getLogs();
      expect(storedLogs).toHaveLength(10);
      storedLogs.forEach((log, index) => {
        expect(log.message).toBe(`Log ${index}`);
      });
    });
  });

  describe('completion promise', () => {
    it('should resolve completion promise on process close', async () => {
      let closeCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'close') {
          closeCallback = callback;
        }
        return mockChildProcess;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);
      const completionPromise = session.waitForCompletion();

      // Process still running
      expect(closeCallback).toBeDefined();

      // Simulate process close with exit code 0
      if (closeCallback) {
        closeCallback(0);
      }

      const result = await completionPromise;
      expect(result).toEqual({ exitCode: 0 });
    });

    it('should handle non-zero exit codes', async () => {
      let closeCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'close') {
          closeCallback = callback;
        }
        return mockChildProcess;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);
      const completionPromise = session.waitForCompletion();

      // Simulate error exit
      if (closeCallback) {
        closeCallback(1);
      }

      const result = await completionPromise;
      expect(result).toEqual({ exitCode: 1 });
    });

    it('should handle null exit code (signal termination)', async () => {
      let closeCallback: ((code: number | null) => void) | undefined;
      
      mockChildProcess.on.mockImplementation((event: string, callback: any) => {
        if (event === 'close') {
          closeCallback = callback;
        }
        return mockChildProcess;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);
      const completionPromise = session.waitForCompletion();

      // Simulate signal termination
      if (closeCallback) {
        closeCallback(null);
      }

      const result = await completionPromise;
      expect(result).toEqual({ exitCode: null });
    });

    it('should return same promise on multiple calls', () => {
      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);
      
      const promise1 = session.waitForCompletion();
      const promise2 = session.waitForCompletion();
      
      // Both should be the same promise instance
      expect(promise1).toEqual(promise2);
    });
  });

  describe('callback management', () => {
    it('should notify callbacks on new log entries', () => {
      let logCallback: ((entry: LogEntry) => void) | undefined;
      
      mockCapturer.onLog.mockImplementation((callback: (entry: LogEntry) => void) => {
        logCallback = callback;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);

      // Register callbacks
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      session.onLogEntry(callback1);
      session.onLogEntry(callback2);

      // Simulate log entry
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: 'info',
        message: 'Test log',
        source: 'stdout'
      };

      if (logCallback) {
        logCallback(logEntry);
      }

      // Both callbacks should be called
      expect(callback1).toHaveBeenCalledWith(logEntry);
      expect(callback2).toHaveBeenCalledWith(logEntry);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple callbacks independently', () => {
      let logCallback: ((entry: LogEntry) => void) | undefined;
      
      mockCapturer.onLog.mockImplementation((callback: (entry: LogEntry) => void) => {
        logCallback = callback;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);

      const callbacks: jest.Mock[] = [];
      for (let i = 0; i < 5; i++) {
        const cb = jest.fn();
        callbacks.push(cb);
        session.onLogEntry(cb);
      }

      // Send multiple log entries
      for (let i = 0; i < 3; i++) {
        const logEntry: LogEntry = {
          timestamp: new Date(),
          level: 'info',
          message: `Log ${i}`,
          source: 'stdout'
        };

        if (logCallback) {
          logCallback(logEntry);
        }
      }

      // Each callback should be called 3 times
      callbacks.forEach(cb => {
        expect(cb).toHaveBeenCalledTimes(3);
      });
    });

    it('should call all registered callbacks', () => {
      let logCallback: ((entry: LogEntry) => void) | undefined;
      
      mockCapturer.onLog.mockImplementation((callback: (entry: LogEntry) => void) => {
        logCallback = callback;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);

      // Register multiple callbacks
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      session.onLogEntry(callback1);
      session.onLogEntry(callback2);
      session.onLogEntry(callback3);

      // Simulate log entry
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: 'info',
        message: 'Test log',
        source: 'stdout'
      };

      if (logCallback) {
        logCallback(logEntry);
      }

      // All callbacks should be called
      expect(callback1).toHaveBeenCalledWith(logEntry);
      expect(callback2).toHaveBeenCalledWith(logEntry);
      expect(callback3).toHaveBeenCalledWith(logEntry);
    });
  });

  describe('formatted output', () => {
    it('should format empty logs as empty string', () => {
      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);
      
      expect(session.getFormattedLogs()).toBe('');
    });

    it('should format single log correctly', () => {
      let logCallback: ((entry: LogEntry) => void) | undefined;
      
      mockCapturer.onLog.mockImplementation((callback: (entry: LogEntry) => void) => {
        logCallback = callback;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);

      const logEntry: LogEntry = {
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        level: 'info',
        message: 'Single log entry',
        source: 'stdout'
      };

      if (logCallback) {
        logCallback(logEntry);
      }

      const formatted = session.getFormattedLogs();
      expect(formatted).toBe('2024-01-01T10:00:00.000Z [INFO] Single log entry');
    });

    it('should format multiple logs with newlines', () => {
      let logCallback: ((entry: LogEntry) => void) | undefined;
      
      mockCapturer.onLog.mockImplementation((callback: (entry: LogEntry) => void) => {
        logCallback = callback;
      });

      const config = {
        command: 'test',
        args: [],
        captureOutput: true
      };

      const session = new LogCaptureSession(config);

      const logs: LogEntry[] = [
        {
          timestamp: new Date('2024-01-01T10:00:00.000Z'),
          level: 'info',
          message: 'First',
          source: 'stdout'
        },
        {
          timestamp: new Date('2024-01-01T10:00:01.000Z'),
          level: 'error',
          message: 'Second',
          source: 'stderr'
        },
        {
          timestamp: new Date('2024-01-01T10:00:02.000Z'),
          level: 'debug',
          message: 'Third',
          source: 'stdout'
        }
      ];

      logs.forEach(log => {
        if (logCallback) {
          logCallback(log);
        }
      });

      const formatted = session.getFormattedLogs();
      const lines = formatted.split('\n');
      
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('2024-01-01T10:00:00.000Z [INFO] First');
      expect(lines[1]).toBe('2024-01-01T10:00:01.000Z [ERROR] Second');
      expect(lines[2]).toBe('2024-01-01T10:00:02.000Z [DEBUG] Third');
    });
  });
});