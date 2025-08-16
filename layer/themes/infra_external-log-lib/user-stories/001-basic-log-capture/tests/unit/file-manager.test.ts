import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'os';
import { FileManager } from '../../src/domain/file-manager';
import { LogEntry } from '../../src/external/external-log-lib';

describe('FileManager Unit Test', () => {
  let fileManager: FileManager;
  let tempDir: string;

  beforeEach(async () => {
    fileManager = new FileManager();
    // Create a unique temp directory for each test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'file-manager-test-'));
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
    const testLogs: LogEntry[] = [
      {
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        level: 'info',
        message: 'Test log',
        source: 'stdout'
      }
    ];

    it('should create directory if it does not exist', async () => {
      const subDir = path.join(tempDir, 'nested', 'dir');
      const filePath = path.join(subDir, 'logs.txt');

      // Verify directory doesn't exist
      expect(fs.existsSync(subDir)).toBe(false);

      await fileManager.saveLogsToFile(testLogs, filePath, {
        format: 'text'
      });

      // Verify directory was created
      expect(fs.existsSync(subDir)).toBe(true);
      // Verify file was created
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should not create directory if it exists', async () => {
      const subDir = path.join(tempDir, "existing");
      const filePath = path.join(subDir, 'logs.txt');
      
      // Create directory beforehand
      await fs.promises.mkdir(subDir, { recursive: true });
      
      // Verify directory exists before saving
      expect(fs.existsSync(subDir)).toBe(true);

      await fileManager.saveLogsToFile(testLogs, filePath, {
        format: 'text'
      });

      // Verify file was created in existing directory
      expect(fs.existsSync(filePath)).toBe(true);
      
      // Read the file to ensure it was written correctly
      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toBe('2024-01-01T10:00:00.000Z [INFO] Test log');
    });

    it('should select text format', async () => {
      const filePath = path.join(tempDir, 'logs.txt');

      await fileManager.saveLogsToFile(testLogs, filePath, {
        format: 'text'
      });

      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toBe('2024-01-01T10:00:00.000Z [INFO] Test log');
    });

    it('should select JSON format', async () => {
      const filePath = path.join(tempDir, 'logs.json');

      await fileManager.saveLogsToFile(testLogs, filePath, {
        format: 'json'
      });

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('Test log');
    });

    it('should select CSV format', async () => {
      const filePath = path.join(tempDir, 'logs.csv');

      await fileManager.saveLogsToFile(testLogs, filePath, {
        format: 'csv'
      });

      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toContain('timestamp,level,message,source');
      expect(content).toContain('2024-01-01T10:00:00.000Z,info,Test log,stdout');
    });

    it('should append to existing file when append is true', async () => {
      const filePath = path.join(tempDir, 'logs.txt');
      
      // Create initial file with content
      await fs.promises.writeFile(filePath, 'Initial content', 'utf-8');

      await fileManager.saveLogsToFile(testLogs, filePath, {
        format: 'text',
        append: true
      });

      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toBe('Initial content\n2024-01-01T10:00:00.000Z [INFO] Test log');
    });

    it('should overwrite file when append is false', async () => {
      const filePath = path.join(tempDir, 'logs.txt');
      
      // Create initial file with content
      await fs.promises.writeFile(filePath, 'This should be overwritten', 'utf-8');

      await fileManager.saveLogsToFile(testLogs, filePath, {
        format: 'text',
        append: false
      });

      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toBe('2024-01-01T10:00:00.000Z [INFO] Test log');
      expect(content).not.toContain('This should be overwritten');
    });

    it('should propagate errors from file operations', async () => {
      // Use a path that will fail (e.g., invalid characters on some systems)
      const invalidPath = path.join(tempDir, '\0invalid.txt');

      await expect(
        fileManager.saveLogsToFile(testLogs, invalidPath, { format: 'text' })
      ).rejects.toThrow();
    });
  });

  describe("formatAsText", () => {
    it('should format logs as plain text with timestamp and level', () => {
      const logs: LogEntry[] = [
        {
          timestamp: new Date('2024-01-01T10:00:00.000Z'),
          level: 'info',
          message: 'First log',
          source: 'stdout'
        },
        {
          timestamp: new Date('2024-01-01T10:00:01.000Z'),
          level: 'error',
          message: 'Error log',
          source: 'stderr'
        }
      ];

      const formatted = (fileManager as any).formatAsText(logs);
      const lines = formatted.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('2024-01-01T10:00:00.000Z [INFO] First log');
      expect(lines[1]).toBe('2024-01-01T10:00:01.000Z [ERROR] Error log');
    });

    it('should uppercase log levels', () => {
      const logs: LogEntry[] = [
        {
          timestamp: new Date('2024-01-01T10:00:00.000Z'),
          level: 'debug',
          message: 'Debug msg',
          source: 'stdout'
        }
      ];

      const formatted = (fileManager as any).formatAsText(logs);
      expect(formatted).toContain('[DEBUG]');
    });
  });

  describe("formatAsJson", () => {
    const logs: LogEntry[] = [{
      timestamp: new Date('2024-01-01T10:00:00.000Z'),
      level: 'info',
      message: 'Test',
      source: 'stdout'
    }];

    it('should format as JSON array without timestamp wrapper', () => {
      const formatted = (fileManager as any).formatAsJson(logs, { timestamp: false });
      const parsed = JSON.parse(formatted);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('Test');
      expect(parsed[0].level).toBe('info');
    });

    it('should format with timestamp wrapper when requested', () => {
      const formatted = (fileManager as any).formatAsJson(logs, { timestamp: true });
      const parsed = JSON.parse(formatted);
      
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.logs).toHaveLength(1);
      expect(parsed.logs[0].message).toBe('Test');
    });

    it('should use proper indentation', () => {
      const formatted = (fileManager as any).formatAsJson(logs, { timestamp: false });
      expect(formatted).toContain('\n  '); // Check for indentation
    });
  });

  describe("formatAsCsv", () => {
    it('should include CSV header', () => {
      const logs: LogEntry[] = [];
      const formatted = (fileManager as any).formatAsCsv(logs);
      
      expect(formatted).toBe('timestamp,level,message,source');
    });

    it('should format log entries as CSV rows', () => {
      const logs: LogEntry[] = [{
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        level: 'info',
        message: 'Simple message',
        source: 'stdout'
      }];

      const formatted = (fileManager as any).formatAsCsv(logs);
      const lines = formatted.split('\n');
      
      expect(lines[0]).toBe('timestamp,level,message,source');
      expect(lines[1]).toBe('2024-01-01T10:00:00.000Z,info,Simple message,stdout');
    });

    it('should escape fields containing commas', () => {
      const logs: LogEntry[] = [{
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        level: 'info',
        message: 'Message, with comma',
        source: 'stdout'
      }];

      const formatted = (fileManager as any).formatAsCsv(logs);
      expect(formatted).toContain('"Message, with comma"');
    });

    it('should escape fields containing quotes', () => {
      const logs: LogEntry[] = [{
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        level: 'info',
        message: 'Message with "quotes"',
        source: 'stdout'
      }];

      const formatted = (fileManager as any).formatAsCsv(logs);
      expect(formatted).toContain('"Message with ""quotes"""');
    });

    it('should escape fields containing newlines', () => {
      const logs: LogEntry[] = [{
        timestamp: new Date('2024-01-01T10:00:00.000Z'),
        level: 'info',
        message: 'Message\nwith\nnewlines',
        source: 'stdout'
      }];

      const formatted = (fileManager as any).formatAsCsv(logs);
      expect(formatted).toContain('"Message\nwith\nnewlines"');
    });
  });
});