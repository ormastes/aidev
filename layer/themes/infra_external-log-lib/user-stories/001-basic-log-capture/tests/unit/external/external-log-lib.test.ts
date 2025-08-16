import { 
  ExternalLogLibImpl, 
  LogEntry, 
  LogCapturer, 
  externalLogLib 
} from '../../../src/external/external-log-lib';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'node:events';

// Mock ChildProcess for testing
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  
  constructor() {
    super();
  }
}

describe("ExternalLogLib", () => {
  let logLib: ExternalLogLibImpl;
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    logLib = new ExternalLogLibImpl();
    mockProcess = new MockChildProcess();
  });

  afterEach(() => {
    mockProcess.removeAllListeners();
    mockProcess.stdout.removeAllListeners();
    mockProcess.stderr.removeAllListeners();
  });

  describe("ExternalLogLibImpl", () => {
    describe("createCapturer", () => {
      it('should create a log capturer instance', () => {
        const capturer = logLib.createCapturer(mockProcess as any);
        
        expect(capturer).toBeDefined();
        expect(typeof capturer.start).toBe("function");
        expect(typeof capturer.stop).toBe("function");
        expect(typeof capturer.getEntries).toBe("function");
        expect(typeof capturer.clear).toBe("function");
        expect(typeof capturer.onLog).toBe("function");
      });
    });

    describe("parseLogLine", () => {
      it('should parse structured log format', () => {
        const line = '2023-06-01T12:00:00.123Z [INFO] This is a test message';
        const entry = logLib.parseLogLine(line, 'stdout');

        expect(entry.timestamp).toEqual(new Date('2023-06-01T12:00:00.123Z'));
        expect(entry.level).toBe('info');
        expect(entry.message).toBe('This is a test message');
        expect(entry.source).toBe('stdout');
      });

      it('should parse simple log format', () => {
        const line = '[ERROR] Something went wrong';
        const entry = logLib.parseLogLine(line, 'stderr');

        expect(entry.level).toBe('error');
        expect(entry.message).toBe('Something went wrong');
        expect(entry.source).toBe('stderr');
        expect(entry.timestamp).toBeInstanceOf(Date);
      });

      it('should handle unstructured logs from stdout', () => {
        const line = 'Plain text message';
        const entry = logLib.parseLogLine(line, 'stdout');

        expect(entry.level).toBe('info');
        expect(entry.message).toBe('Plain text message');
        expect(entry.source).toBe('stdout');
        expect(entry.timestamp).toBeInstanceOf(Date);
      });

      it('should handle unstructured logs from stderr as error', () => {
        const line = 'Error message without format';
        const entry = logLib.parseLogLine(line, 'stderr');

        expect(entry.level).toBe('error');
        expect(entry.message).toBe('Error message without format');
        expect(entry.source).toBe('stderr');
        expect(entry.timestamp).toBeInstanceOf(Date);
      });

      it('should parse different log levels correctly', () => {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        
        levels.forEach(level => {
          const line = `[${level}] Test message`;
          const entry = logLib.parseLogLine(line, 'stdout');
          
          expect(entry.level).toBe(level.toLowerCase());
          expect(entry.message).toBe('Test message');
        });
      });

      it('should handle structured logs with different levels', () => {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        
        levels.forEach(level => {
          const line = `2023-06-01T12:00:00.123Z [${level}] Structured message`;
          const entry = logLib.parseLogLine(line, 'stdout');
          
          expect(entry.level).toBe(level.toLowerCase());
          expect(entry.message).toBe('Structured message');
          expect(entry.timestamp).toEqual(new Date('2023-06-01T12:00:00.123Z'));
        });
      });
    });
  });

  describe("LogCapturer", () => {
    let capturer: LogCapturer;

    beforeEach(() => {
      capturer = logLib.createCapturer(mockProcess as any);
    });

    describe('start and stop', () => {
      it('should start capturing logs', () => {
        capturer.start();
        
        // Emit some data and verify it's captured
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].message).toBe('Test message');
        expect(entries[0].level).toBe('info');
        expect(entries[0].source).toBe('stdout');
      });

      it('should capture stderr logs', () => {
        capturer.start();
        
        mockProcess.stderr.emit('data', Buffer.from('[ERROR] Error message\n'));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].message).toBe('Error message');
        expect(entries[0].level).toBe('error');
        expect(entries[0].source).toBe('stderr');
      });

      it('should not capture when not started', () => {
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(0);
      });

      it('should stop capturing logs', () => {
        capturer.start();
        capturer.stop();
        
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(0);
      });

      it('should handle multiple start calls gracefully', () => {
        capturer.start();
        capturer.start(); // Should not throw or create duplicate listeners
        
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(1);
      });

      it('should handle multiple stop calls gracefully', () => {
        capturer.start();
        capturer.stop();
        capturer.stop(); // Should not throw
        
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(0);
      });
    });

    describe('log processing', () => {
      beforeEach(() => {
        capturer.start();
      });

      it('should handle multiple lines in single data event', () => {
        const multiLineData = '[INFO] First message\n[WARN] Second message\n[ERROR] Third message\n';
        mockProcess.stdout.emit('data', Buffer.from(multiLineData));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(3);
        expect(entries[0].message).toBe('First message');
        expect(entries[0].level).toBe('info');
        expect(entries[1].message).toBe('Second message');
        expect(entries[1].level).toBe('warn');
        expect(entries[2].message).toBe('Third message');
        expect(entries[2].level).toBe('error');
      });

      it('should filter out empty lines', () => {
        const dataWithEmptyLines = '[INFO] Message 1\n\n\n[INFO] Message 2\n   \n';
        mockProcess.stdout.emit('data', Buffer.from(dataWithEmptyLines));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(2);
        expect(entries[0].message).toBe('Message 1');
        expect(entries[1].message).toBe('Message 2');
      });

      it('should handle mixed stdout and stderr', () => {
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Stdout message\n'));
        mockProcess.stderr.emit('data', Buffer.from('[ERROR] Stderr message\n'));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(2);
        expect(entries[0].source).toBe('stdout');
        expect(entries[1].source).toBe('stderr');
      });

      it('should handle process with missing stdout', () => {
        const processWithoutStdout = new MockChildProcess();
        processWithoutStdout.stdout = null as any;
        
        const capturerWithoutStdout = logLib.createCapturer(processWithoutStdout as any);
        capturerWithoutStdout.start();
        
        // Should not throw error
        processWithoutStdout.stderr.emit('data', Buffer.from('[ERROR] Error message\n'));
        
        const entries = capturerWithoutStdout.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].source).toBe('stderr');
      });

      it('should handle process with missing stderr', () => {
        const processWithoutStderr = new MockChildProcess();
        processWithoutStderr.stderr = null as any;
        
        const capturerWithoutStderr = logLib.createCapturer(processWithoutStderr as any);
        capturerWithoutStderr.start();
        
        // Should not throw error
        processWithoutStderr.stdout.emit('data', Buffer.from('[INFO] Info message\n'));
        
        const entries = capturerWithoutStderr.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].source).toBe('stdout');
      });
    });

    describe("getEntries", () => {
      it('should return copy of entries array', () => {
        capturer.start();
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        const entries1 = capturer.getEntries();
        const entries2 = capturer.getEntries();
        
        expect(entries1).not.toBe(entries2); // Different array instances
        expect(entries1).toEqual(entries2); // Same content
        
        // Modifying returned array should not affect internal state
        entries1.push({
          timestamp: new Date(),
          level: 'debug',
          message: 'External addition',
          source: 'stdout'
        });
        
        expect(capturer.getEntries()).toHaveLength(1);
      });

      it('should return empty array when no entries', () => {
        const entries = capturer.getEntries();
        expect(entries).toEqual([]);
      });
    });

    describe('clear', () => {
      it('should clear all entries', () => {
        capturer.start();
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Message 1\n'));
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Message 2\n'));
        
        expect(capturer.getEntries()).toHaveLength(2);
        
        capturer.clear();
        
        expect(capturer.getEntries()).toHaveLength(0);
      });

      it('should not affect capturing state', () => {
        capturer.start();
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Message 1\n'));
        
        capturer.clear();
        
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Message 2\n'));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].message).toBe('Message 2');
      });
    });

    describe('onLog callback', () => {
      it('should call callback when new log entry is added', () => {
        const callback = jest.fn();
        capturer.onLog(callback);
        capturer.start();
        
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Test message',
            level: 'info',
            source: 'stdout'
          })
        );
      });

      it('should support multiple callbacks', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();
        
        capturer.onLog(callback1);
        capturer.onLog(callback2);
        capturer.start();
        
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
      });

      it('should call callbacks for each line in multi-line data', () => {
        const callback = jest.fn();
        capturer.onLog(callback);
        capturer.start();
        
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Message 1\n[WARN] Message 2\n'));
        
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
          message: 'Message 1',
          level: 'info'
        }));
        expect(callback).toHaveBeenNthCalledWith(2, expect.objectContaining({
          message: 'Message 2',
          level: 'warn'
        }));
      });

      it('should not call callbacks when not capturing', () => {
        const callback = jest.fn();
        capturer.onLog(callback);
        
        mockProcess.stdout.emit('data', Buffer.from('[INFO] Test message\n'));
        
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle binary data gracefully', () => {
        capturer.start();
        
        // Emit binary data that might not be valid UTF-8
        const binaryData = Buffer.from([0xFF, 0xFE, 0x41, 0x42, 0x43]);
        mockProcess.stdout.emit('data', binaryData);
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].source).toBe('stdout');
        expect(entries[0].level).toBe('info');
      });

      it('should handle very long log lines', () => {
        capturer.start();
        
        const longMessage = 'A'.repeat(10000);
        mockProcess.stdout.emit('data', Buffer.from(`[INFO] ${longMessage}\n`));
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].message).toBe(longMessage);
      });

      it('should handle rapid succession of events', () => {
        capturer.start();
        
        // Emit multiple events rapidly
        for (let i = 0; i < 100; i++) {
          mockProcess.stdout.emit('data', Buffer.from(`[INFO] Message ${i}\n`));
        }
        
        const entries = capturer.getEntries();
        expect(entries).toHaveLength(100);
        expect(entries[99].message).toBe('Message 99');
      });
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(externalLogLib).toBeInstanceOf(ExternalLogLibImpl);
      expect(typeof externalLogLib.createCapturer).toBe("function");
      expect(typeof externalLogLib.parseLogLine).toBe("function");
    });

    it('should maintain same instance across imports', () => {
      const secondImport = require('../../../src/external/external-log-lib').externalLogLib;
      expect(secondImport).toBe(externalLogLib);
    });
  });
});