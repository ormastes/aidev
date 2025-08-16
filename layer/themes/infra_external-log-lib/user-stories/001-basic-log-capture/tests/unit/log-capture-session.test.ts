import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'os';
import { LogCaptureSession } from '../../src/application/aidev-platform';
import { LogEntry } from '../../src/external/external-log-lib';

describe('LogCaptureSession Unit Test', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'log-capture-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("saveLogsToFile", () => {
    it('should write formatted logs to file', async () => {
      // Create a session
      const session = new LogCaptureSession({
        command: 'node',
        args: ['-e', 'process.exit(0)'],
        captureOutput: true
      });

      // Manually add some test logs
      const testLogs: LogEntry[] = [
        {
          timestamp: new Date('2024-01-01T10:00:00.000Z'),
          level: 'info',
          message: 'Test log 1',
          source: 'stdout'
        },
        {
          timestamp: new Date('2024-01-01T10:00:01.000Z'),
          level: 'error',
          message: 'Test error',
          source: 'stderr'
        }
      ];

      // Use reflection to set private logs
      (session as any).logs = testLogs;

      // Call saveLogsToFile
      const filePath = path.join(tempDir, 'test-logs.txt');
      await session.saveLogsToFile(filePath);

      // Verify file was created and contains expected content
      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toContain('2024-01-01T10:00:00.000Z');
      expect(content).toContain('[INFO]');
      expect(content).toContain('Test log 1');
      expect(content).toContain('[ERROR]');
      expect(content).toContain('Test error');

      // Clean up the spawned process
      const handle = session.getProcessHandle();
      if (handle) {
        await handle.terminate();
      }
    });

    it('should generate correct formatted output', () => {
      const session = new LogCaptureSession({
        command: 'node',
        args: ['-e', ''],
        captureOutput: true
      });

      const testLogs: LogEntry[] = [
        {
          timestamp: new Date('2024-01-01T12:00:00.000Z'),
          level: 'warn',
          message: 'Warning message',
          source: 'stdout'
        },
        {
          timestamp: new Date('2024-01-01T12:00:05.000Z'),
          level: 'debug',
          message: 'Debug info',
          source: 'stdout'
        }
      ];

      (session as any).logs = testLogs;

      const formatted = session.getFormattedLogs();

      // Verify format
      const lines = formatted.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('2024-01-01T12:00:00.000Z [WARN] Warning message');
      expect(lines[1]).toBe('2024-01-01T12:00:05.000Z [DEBUG] Debug info');
    });

    it('should propagate file write errors', async () => {
      const session = new LogCaptureSession({
        command: 'node',
        args: ['-e', 'process.exit(0)'],
        captureOutput: true
      });

      // Try to write to an invalid path
      const invalidPath = path.join(tempDir, '\0invalid.txt');

      // Should propagate the error
      await expect(session.saveLogsToFile(invalidPath))
        .rejects.toThrow();

      // Clean up
      const handle = session.getProcessHandle();
      if (handle) {
        await handle.terminate();
      }
    });

    it('should handle empty logs', async () => {
      const session = new LogCaptureSession({
        command: 'node',
        args: ['-e', 'process.exit(0)'],
        captureOutput: true
      });

      // No logs added
      const filePath = path.join(tempDir, 'empty.txt');
      await session.saveLogsToFile(filePath);

      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toBe('');

      // Clean up
      const handle = session.getProcessHandle();
      if (handle) {
        await handle.terminate();
      }
    });

    it('should format logs with various levels correctly', () => {
      const session = new LogCaptureSession({
        command: 'node',
        args: ['-e', ''],
        captureOutput: true
      });

      const testLogs: LogEntry[] = [
        { timestamp: new Date('2024-01-01T10:00:00.000Z'), level: 'info', message: 'Info', source: 'stdout' },
        { timestamp: new Date('2024-01-01T10:00:01.000Z'), level: 'warn', message: 'Warn', source: 'stdout' },
        { timestamp: new Date('2024-01-01T10:00:02.000Z'), level: 'error', message: 'Error', source: 'stderr' },
        { timestamp: new Date('2024-01-01T10:00:03.000Z'), level: 'debug', message: 'Debug', source: 'stdout' }
      ];

      (session as any).logs = testLogs;

      const formatted = session.getFormattedLogs();
      
      expect(formatted).toContain('[INFO]');
      expect(formatted).toContain('[WARN]');
      expect(formatted).toContain('[ERROR]');
      expect(formatted).toContain('[DEBUG]');
    });
  });

  describe('log storage and retrieval', () => {
    it('should store logs in order', async () => {
      const session = new LogCaptureSession({
        command: 'node',
        args: ['-e', 'process.exit(0)'],
        captureOutput: true
      });

      const log1: LogEntry = {
        timestamp: new Date(),
        level: 'info',
        message: 'First',
        source: 'stdout'
      };

      const log2: LogEntry = {
        timestamp: new Date(),
        level: 'info',
        message: 'Second',
        source: 'stdout'
      };

      // Simulate adding logs
      (session as any).logs = [log1, log2];

      const logs = session.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('First');
      expect(logs[1].message).toBe('Second');

      // Clean up
      const handle = session.getProcessHandle();
      if (handle) {
        await handle.terminate();
      }
    });

    it('should return copy of logs array', async () => {
      const session = new LogCaptureSession({
        command: 'node',
        args: ['-e', 'process.exit(0)'],
        captureOutput: true
      });

      const originalLogs = [{
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Test',
        source: 'stdout' as const
      }];

      (session as any).logs = originalLogs;

      const logs1 = session.getLogs();
      const logs2 = session.getLogs();

      // Should be different arrays
      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);

      // Clean up
      const handle = session.getProcessHandle();
      if (handle) {
        await handle.terminate();
      }
    });
  });
});