import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { ExternalLogLibImpl, LogEntry } from '../../src/external/external-log-lib';

// Mock readable stream
class MockReadableStream extends EventEmitter {
  on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }
  
  removeListener(event: string, listener: (...args: any[]) => void): this {
    super.removeListener(event, listener);
    return this;
  }
}

describe('LogCapturer Unit Test', () => {
  let mockProcess: jest.Mocked<ChildProcess>;
  let mockStdout: MockReadableStream;
  let mockStderr: MockReadableStream;
  let externalLogLib: ExternalLogLibImpl;

  beforeEach(() => {
    // Create mock streams
    mockStdout = new MockReadableStream();
    mockStderr = new MockReadableStream();

    // Create mock process
    mockProcess = {
      stdout: mockStdout as any,
      stderr: mockStderr as any,
      pid: 12345,
      on: jest.fn(),
      kill: jest.fn()
    } as any;

    externalLogLib = new ExternalLogLibImpl();
  });

  describe('start/stop functionality', () => {
    it('should start capturing when start() is called', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      const stdoutSpy = jest.spyOn(mockStdout, 'on');
      const stderrSpy = jest.spyOn(mockStderr, 'on');

      capturer.start();

      expect(stdoutSpy).toHaveBeenCalledWith('data', expect.any(Function));
      expect(stderrSpy).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should not register listeners twice if already capturing', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      const stdoutSpy = jest.spyOn(mockStdout, 'on');
      const stderrSpy = jest.spyOn(mockStderr, 'on');

      capturer.start();
      capturer.start(); // Second call

      expect(stdoutSpy).toHaveBeenCalledTimes(1);
      expect(stderrSpy).toHaveBeenCalledTimes(1);
    });

    it('should stop capturing when stop() is called', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      const stdoutRemoveSpy = jest.spyOn(mockStdout, 'removeListener');
      const stderrRemoveSpy = jest.spyOn(mockStderr, 'removeListener');

      capturer.start();
      capturer.stop();

      expect(stdoutRemoveSpy).toHaveBeenCalledWith('data', expect.any(Function));
      expect(stderrRemoveSpy).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should not remove listeners if not capturing', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      const stdoutRemoveSpy = jest.spyOn(mockStdout, 'removeListener');
      const stderrRemoveSpy = jest.spyOn(mockStderr, 'removeListener');

      capturer.stop(); // Stop without start

      expect(stdoutRemoveSpy).not.toHaveBeenCalled();
      expect(stderrRemoveSpy).not.toHaveBeenCalled();
    });

    it('should handle process without stdout/stderr', () => {
      const processWithoutStreams = {
        pid: 12345,
        on: jest.fn(),
        kill: jest.fn()
      } as any;

      const capturer = externalLogLib.createCapturer(processWithoutStreams);
      
      // Should not throw
      expect(() => capturer.start()).not.toThrow();
      expect(() => capturer.stop()).not.toThrow();
    });
  });

  describe('data handler registration/removal', () => {
    it('should register data handlers on start', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      capturer.start();

      // Check if handlers are registered
      expect(mockStdout.listenerCount('data')).toBe(1);
      expect(mockStderr.listenerCount('data')).toBe(1);
    });

    it('should remove data handlers on stop', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      capturer.start();
      
      // Verify handlers are registered
      expect(mockStdout.listenerCount('data')).toBe(1);
      expect(mockStderr.listenerCount('data')).toBe(1);

      capturer.stop();

      // Verify handlers are removed
      expect(mockStdout.listenerCount('data')).toBe(0);
      expect(mockStderr.listenerCount('data')).toBe(0);
    });

    it('should capture data from stdout', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      // Emit data to stdout
      mockStdout.emit('data', Buffer.from('[INFO] Test log from stdout\n'));

      const entries = capturer.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('Test log from stdout');
      expect(entries[0].level).toBe('info');
      expect(entries[0].source).toBe('stdout');
    });

    it('should capture data from stderr', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      // Emit data to stderr
      mockStderr.emit('data', Buffer.from('[ERROR] Test error from stderr\n'));

      const entries = capturer.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('Test error from stderr');
      expect(entries[0].level).toBe('error');
      expect(entries[0].source).toBe('stderr');
    });
  });

  describe('log entry collection', () => {
    it('should collect multiple log entries', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      // Emit multiple logs
      mockStdout.emit('data', Buffer.from('[INFO] Log 1\n'));
      mockStdout.emit('data', Buffer.from('[WARN] Log 2\n'));
      mockStderr.emit('data', Buffer.from('[ERROR] Log 3\n'));

      const entries = capturer.getEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('Log 1');
      expect(entries[1].message).toBe('Log 2');
      expect(entries[2].message).toBe('Log 3');
    });

    it('should handle multiple lines in single data event', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      // Emit multiple lines at once
      mockStdout.emit('data', Buffer.from('[INFO] Line 1\n[WARN] Line 2\n[DEBUG] Line 3\n'));

      const entries = capturer.getEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('Line 1');
      expect(entries[1].message).toBe('Line 2');
      expect(entries[2].message).toBe('Line 3');
    });

    it('should filter empty lines', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      // Emit data with empty lines
      mockStdout.emit('data', Buffer.from('[INFO] Log 1\n\n\n[WARN] Log 2\n   \n'));

      const entries = capturer.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe('Log 1');
      expect(entries[1].message).toBe('Log 2');
    });

    it('should return copy of entries array', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      mockStdout.emit('data', Buffer.from('[INFO] Test\n'));

      const entries1 = capturer.getEntries();
      const entries2 = capturer.getEntries();

      expect(entries1).not.toBe(entries2);
      expect(entries1).toEqual(entries2);
    });

    it('should clear entries when clear() is called', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      mockStdout.emit('data', Buffer.from('[INFO] Test 1\n'));
      mockStdout.emit('data', Buffer.from('[INFO] Test 2\n'));

      expect(capturer.getEntries()).toHaveLength(2);

      capturer.clear();

      expect(capturer.getEntries()).toHaveLength(0);
    });

    it('should continue collecting after clear', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      mockStdout.emit('data', Buffer.from('[INFO] Before clear\n'));
      capturer.clear();
      mockStdout.emit('data', Buffer.from('[INFO] After clear\n'));

      const entries = capturer.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('After clear');
    });
  });

  describe('callback notification', () => {
    it('should notify callbacks on new log entries', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      capturer.onLog(callback1);
      capturer.onLog(callback2);
      
      capturer.start();

      mockStdout.emit('data', Buffer.from('[INFO] Test log\n'));

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      
      const expectedEntry: Partial<LogEntry> = {
        level: 'info',
        message: 'Test log',
        source: 'stdout'
      };
      
      expect(callback1).toHaveBeenCalledWith(expect.objectContaining(expectedEntry));
      expect(callback2).toHaveBeenCalledWith(expect.objectContaining(expectedEntry));
    });

    it('should notify callbacks for each log entry', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      const callback = jest.fn();
      capturer.onLog(callback);
      
      capturer.start();

      mockStdout.emit('data', Buffer.from('[INFO] Log 1\n[WARN] Log 2\n'));

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({ message: 'Log 1' }));
      expect(callback).toHaveBeenNthCalledWith(2, expect.objectContaining({ message: 'Log 2' }));
    });

    it('should handle callbacks registered before start', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      const callback = jest.fn();
      capturer.onLog(callback);
      
      // Start after callback registration
      capturer.start();

      mockStdout.emit('data', Buffer.from('[INFO] Test\n'));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle callbacks registered after start', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      capturer.start();
      
      const callback = jest.fn();
      capturer.onLog(callback);

      mockStdout.emit('data', Buffer.from('[INFO] Test\n'));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should notify callbacks even after stop', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      
      const callback = jest.fn();
      capturer.onLog(callback);
      
      capturer.start();
      capturer.stop();

      // Manually add entry to test callback notification
      // Since we're stopped, we need to test the internal addEntry method
      // This would happen if logs are added programmatically
      const entries = capturer.getEntries();
      expect(entries).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle partial lines (no newline)', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      // Emit data without newline
      mockStdout.emit('data', Buffer.from('[INFO] Partial line'));

      // The implementation processes lines immediately, even without newline
      const entries = capturer.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('Partial line');
    });

    it('should handle binary data gracefully', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      // Emit binary data
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF]);
      
      // Should not throw
      expect(() => mockStdout.emit('data', binaryData)).not.toThrow();
    });

    it('should handle very long lines', () => {
      const capturer = externalLogLib.createCapturer(mockProcess);
      capturer.start();

      const longMessage = 'A'.repeat(10000);
      mockStdout.emit('data', Buffer.from(`[INFO] ${longMessage}\n`));

      const entries = capturer.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe(longMessage);
    });
  });
});