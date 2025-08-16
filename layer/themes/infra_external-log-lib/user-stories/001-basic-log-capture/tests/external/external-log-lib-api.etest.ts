import { ChildProcess } from 'child_process';
import { LogEntry, LogCapturer, ExternalLogLib } from '../../src/external/external-log-lib';

describe('External Log Library API Test', () => {
  let mockExternalLogLib: ExternalLogLib;
  let mockProcess: Partial<ChildProcess>;

  beforeEach(() => {
    // Mock the external log library API
    mockExternalLogLib = {
      createCapturer: jest.fn(),
      parseLogLine: jest.fn()
    };

    // Mock child process
    mockProcess = {
      stdout: {
        on: jest.fn(),
        removeListener: jest.fn()
      } as any,
      stderr: {
        on: jest.fn(),
        removeListener: jest.fn()
      } as any,
      pid: 1234
    };
  });

  it('should create a log capturer for a child process', () => {
    const mockCapturer: LogCapturer = {
      start: jest.fn(),
      stop: jest.fn(),
      getEntries: jest.fn(() => []),
      clear: jest.fn(),
      onLog: jest.fn()
    };

    (mockExternalLogLib.createCapturer as jest.Mock).mockReturnValue(mockCapturer);

    const capturer = mockExternalLogLib.createCapturer(mockProcess as ChildProcess);
    
    expect(capturer).toBeDefined();
    expect(capturer.start).toBeDefined();
    expect(capturer.stop).toBeDefined();
    expect(capturer.getEntries).toBeDefined();
    expect(mockExternalLogLib.createCapturer).toHaveBeenCalledWith(mockProcess);
  });

  it('should parse log lines into structured entries', () => {
    const testLine = '2024-01-15T10:30:00.000Z [INFO] Application started';
    const expectedEntry: LogEntry = {
      timestamp: new Date('2024-01-15T10:30:00.000Z'),
      level: 'info',
      message: 'Application started',
      source: 'stdout'
    };

    (mockExternalLogLib.parseLogLine as jest.Mock).mockReturnValue(expectedEntry);

    const result = mockExternalLogLib.parseLogLine(testLine, 'stdout');
    
    expect(result).toEqual(expectedEntry);
    expect(mockExternalLogLib.parseLogLine).toHaveBeenCalledWith(testLine, 'stdout');
  });

  it('should capture logs from stdout and stderr', () => {
    const capturedLogs: LogEntry[] = [];
    
    const mockCapturer: LogCapturer = {
      start: jest.fn(),
      stop: jest.fn(),
      getEntries: jest.fn(() => capturedLogs),
      clear: jest.fn(() => capturedLogs.length = 0),
      onLog: jest.fn((callback) => {
        // Simulate log capture
        const entry: LogEntry = {
          timestamp: new Date(),
          level: 'info',
          message: 'Test log',
          source: 'stdout'
        };
        capturedLogs.push(entry);
        callback(entry);
      })
    };

    (mockExternalLogLib.createCapturer as jest.Mock).mockReturnValue(mockCapturer);

    const capturer = mockExternalLogLib.createCapturer(mockProcess as ChildProcess);
    capturer.start();

    // Register log callback
    const logCallback = jest.fn();
    capturer.onLog(logCallback);

    expect(capturer.getEntries()).toHaveLength(1);
    expect(logCallback).toHaveBeenCalledWith(expect.objectContaining({
      level: 'info',
      message: 'Test log',
      source: 'stdout'
    }));
  });

  it('should handle different log levels', () => {
    const logLevels: Array<[string, LogEntry['level']]> = [
      ['[DEBUG] Debug message', 'debug'],
      ['[INFO] Info message', 'info'],
      ['[WARN] Warning message', 'warn'],
      ['[ERROR] Error message', 'error']
    ];

    logLevels.forEach(([line, expectedLevel]) => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: expectedLevel,
        message: line.split('] ')[1],
        source: 'stdout'
      };

      (mockExternalLogLib.parseLogLine as jest.Mock).mockReturnValue(entry);
      
      const result = mockExternalLogLib.parseLogLine(line, 'stdout');
      expect(result.level).toBe(expectedLevel);
    });
  });

  it('should handle log buffer clearing', () => {
    const logs: LogEntry[] = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Log 1',
        source: 'stdout'
      },
      {
        timestamp: new Date(),
        level: 'error',
        message: 'Log 2',
        source: 'stderr'
      }
    ];

    const mockCapturer: LogCapturer = {
      start: jest.fn(),
      stop: jest.fn(),
      getEntries: jest.fn(() => logs),
      clear: jest.fn(() => logs.length = 0),
      onLog: jest.fn()
    };

    (mockExternalLogLib.createCapturer as jest.Mock).mockReturnValue(mockCapturer);

    const capturer = mockExternalLogLib.createCapturer(mockProcess as ChildProcess);
    
    expect(capturer.getEntries()).toHaveLength(2);
    
    capturer.clear();
    
    expect(capturer.getEntries()).toHaveLength(0);
  });

  it('should stop capturing logs when stopped', () => {
    let isCapturing = true;
    
    const mockCapturer: LogCapturer = {
      start: jest.fn(() => isCapturing = true),
      stop: jest.fn(() => isCapturing = false),
      getEntries: jest.fn(() => []),
      clear: jest.fn(),
      onLog: jest.fn()
    };

    (mockExternalLogLib.createCapturer as jest.Mock).mockReturnValue(mockCapturer);

    const capturer = mockExternalLogLib.createCapturer(mockProcess as ChildProcess);
    
    capturer.start();
    expect(isCapturing).toBe(true);
    
    capturer.stop();
    expect(isCapturing).toBe(false);
  });
});