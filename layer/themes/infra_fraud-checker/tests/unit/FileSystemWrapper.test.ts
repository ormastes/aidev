import { FileSystemWrapper } from '../../external/FileSystemWrapper';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

// Mock fs module
jest.mock('fs/promises');
jest.mock('path');

describe("FileSystemWrapper", () => {
  let wrapper: FileSystemWrapper;
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;
    
    // Default path.resolve mock
    mockPath.resolve.mockImplementation((...paths) => paths.join('/'));
    mockPath.dirname.mockImplementation((filePath) => filePath.substring(0, filePath.lastIndexOf('/')));
    
    wrapper = new FileSystemWrapper('/base/path');
  });

  describe("constructor", () => {
    it('should initialize with provided base path', () => {
      const customWrapper = new FileSystemWrapper('/custom/path');
      expect(customWrapper).toBeDefined();
    });

    it('should use current working directory as default', () => {
      const defaultWrapper = new FileSystemWrapper();
      expect(defaultWrapper).toBeDefined();
    });
  });

  describe("readFile", () => {
    it('should read file successfully and update metrics', async () => {
      const fileContent = 'test file content';
      const filePath = 'test.txt';
      const expectedPath = '/base/path/test.txt';

      mockPath.resolve.mockReturnValue(expectedPath);
      mockFs.readFile.mockResolvedValue(fileContent);

      const result = await wrapper.readFile(filePath);

      expect(result).toBe(fileContent);
      expect(mockPath.resolve).toHaveBeenCalledWith('/base/path', filePath);
      expect(mockFs.readFile).toHaveBeenCalledWith(expectedPath, 'utf8');

      const metrics = wrapper.getMetrics();
      expect(metrics.readCount).toBe(1);
      expect(metrics.totalBytesRead).toBe(Buffer.byteLength(fileContent));
    });

    it('should handle custom encoding', async () => {
      const fileContent = 'test content';
      const filePath = 'test.txt';
      
      mockFs.readFile.mockResolvedValue(fileContent);

      await wrapper.readFile(filePath, 'ascii');

      expect(mockFs.readFile).toHaveBeenCalledWith(expect.any(String), 'ascii');
    });

    it('should handle read errors and update error metrics', async () => {
      const filePath = 'nonexistent.txt';
      const error = new Error('File not found');

      mockFs.readFile.mockRejectedValue(error);

      await expect(wrapper.readFile(filePath)).rejects.toThrow('File not found');

      const metrics = wrapper.getMetrics();
      expect(metrics.readCount).toBe(0);
      expect(metrics.errors).toHaveLength(1);
      expect(metrics.errors[0]).toBe(error);
    });

    it('should log file operations', async () => {
      const logCallback = jest.fn();
      wrapper.onLog(logCallback);

      mockFs.readFile.mockResolvedValue('content');

      await wrapper.readFile('test.txt');

      expect(logCallback).toHaveBeenCalledTimes(2);
      expect(logCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        level: 'info',
        message: expect.stringContaining('Reading file:')
      }));
      expect(logCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
        level: 'debug',
        message: expect.stringContaining('Successfully read')
      }));
    });
  });

  describe("writeFile", () => {
    it('should write file successfully and update metrics', async () => {
      const fileContent = 'content to write';
      const filePath = 'test.txt';
      const expectedPath = '/base/path/test.txt';
      const expectedDir = '/base/path';

      mockPath.resolve.mockReturnValue(expectedPath);
      mockPath.dirname.mockReturnValue(expectedDir);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      await wrapper.writeFile(filePath, fileContent);

      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(expectedPath, fileContent, 'utf8');

      const metrics = wrapper.getMetrics();
      expect(metrics.writeCount).toBe(1);
      expect(metrics.totalBytesWritten).toBe(Buffer.byteLength(fileContent));
    });

    it('should handle custom encoding', async () => {
      const fileContent = 'content';
      const filePath = 'test.txt';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      await wrapper.writeFile(filePath, fileContent, 'ascii');

      expect(mockFs.writeFile).toHaveBeenCalledWith(expect.any(String), fileContent, 'ascii');
    });

    it('should handle write errors and update error metrics', async () => {
      const filePath = 'test.txt';
      const content = 'content';
      const error = new Error('Permission denied');

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(error);

      await expect(wrapper.writeFile(filePath, content)).rejects.toThrow('Permission denied');

      const metrics = wrapper.getMetrics();
      expect(metrics.writeCount).toBe(0);
      expect(metrics.errors).toHaveLength(1);
      expect(metrics.errors[0]).toBe(error);
    });

    it('should handle directory creation errors', async () => {
      const filePath = 'test.txt';
      const content = 'content';
      const error = new Error('Cannot create directory');

      mockFs.mkdir.mockRejectedValue(error);

      await expect(wrapper.writeFile(filePath, content)).rejects.toThrow('Cannot create directory');

      const metrics = wrapper.getMetrics();
      expect(metrics.errors).toHaveLength(1);
    });

    it('should log write operations', async () => {
      const logCallback = jest.fn();
      wrapper.onLog(logCallback);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      await wrapper.writeFile('test.txt', 'content');

      expect(logCallback).toHaveBeenCalledTimes(2);
      expect(logCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        level: 'info',
        message: expect.stringContaining('Writing file:')
      }));
      expect(logCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
        level: 'debug',
        message: expect.stringContaining('Successfully wrote')
      }));
    });
  });

  describe('readdir', () => {
    it('should read directory successfully', async () => {
      const files = ['file1.txt', 'file2.txt'];
      const dirPath = 'testdir';
      const expectedPath = '/base/path/testdir';

      mockPath.resolve.mockReturnValue(expectedPath);
      mockFs.readdir.mockResolvedValue(files as any);

      const result = await wrapper.readdir(dirPath);

      expect(result).toEqual(files);
      expect(mockFs.readdir).toHaveBeenCalledWith(expectedPath);
    });

    it('should handle readdir errors', async () => {
      const dirPath = "nonexistent";
      const error = new Error('Directory not found');

      mockFs.readdir.mockRejectedValue(error);

      await expect(wrapper.readdir(dirPath)).rejects.toThrow('Directory not found');

      const metrics = wrapper.getMetrics();
      expect(metrics.errors).toHaveLength(1);
    });

    it('should log directory operations', async () => {
      const logCallback = jest.fn();
      wrapper.onLog(logCallback);

      mockFs.readdir.mockResolvedValue(['file1'] as any);

      await wrapper.readdir('testdir');

      expect(logCallback).toHaveBeenCalledTimes(2);
      expect(logCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        level: 'info',
        message: expect.stringContaining('Reading directory:')
      }));
      expect(logCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
        level: 'debug',
        message: expect.stringContaining('Found 1 files in')
      }));
    });
  });

  describe('stat', () => {
    it('should get file stats successfully', async () => {
      const filePath = 'test.txt';
      const expectedPath = '/base/path/test.txt';
      const mockStats = { size: 100, isFile: () => true } as any;

      mockPath.resolve.mockReturnValue(expectedPath);
      mockFs.stat.mockResolvedValue(mockStats);

      const result = await wrapper.stat(filePath);

      expect(result).toBe(mockStats);
      expect(mockFs.stat).toHaveBeenCalledWith(expectedPath);
    });

    it('should handle stat errors', async () => {
      const filePath = 'nonexistent.txt';
      const error = new Error('File not found');

      mockFs.stat.mockRejectedValue(error);

      await expect(wrapper.stat(filePath)).rejects.toThrow('File not found');

      const metrics = wrapper.getMetrics();
      expect(metrics.errors).toHaveLength(1);
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = 'existing.txt';

      mockFs.access.mockResolvedValue();

      const result = await wrapper.exists(filePath);

      expect(result).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = 'nonexistent.txt';

      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await wrapper.exists(filePath);

      expect(result).toBe(false);
    });
  });

  describe('metrics management', () => {
    it('should track multiple operations correctly', async () => {
      mockFs.readFile.mockResolvedValue("content1");
      mockFs.writeFile.mockResolvedValue();
      mockFs.mkdir.mockResolvedValue(undefined);

      await wrapper.readFile('file1.txt');
      await wrapper.readFile('file2.txt');
      await wrapper.writeFile('file3.txt', "content2");

      const metrics = wrapper.getMetrics();

      expect(metrics.readCount).toBe(2);
      expect(metrics.writeCount).toBe(1);
      expect(metrics.totalBytesRead).toBe(Buffer.byteLength("content1") * 2);
      expect(metrics.totalBytesWritten).toBe(Buffer.byteLength("content2"));
      expect(metrics.errors).toHaveLength(0);
    });

    it('should reset metrics correctly', async () => {
      mockFs.readFile.mockResolvedValue('content');

      await wrapper.readFile('test.txt');

      let metrics = wrapper.getMetrics();
      expect(metrics.readCount).toBe(1);

      wrapper.resetMetrics();

      metrics = wrapper.getMetrics();
      expect(metrics.readCount).toBe(0);
      expect(metrics.writeCount).toBe(0);
      expect(metrics.totalBytesRead).toBe(0);
      expect(metrics.totalBytesWritten).toBe(0);
      expect(metrics.errors).toHaveLength(0);
    });

    it('should return a copy of metrics to prevent mutation', () => {
      const metrics1 = wrapper.getMetrics();
      const metrics2 = wrapper.getMetrics();

      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2);

      metrics1.readCount = 999;
      expect(wrapper.getMetrics().readCount).toBe(0);
    });
  });

  describe('logging functionality', () => {
    it('should support multiple log callbacks', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      wrapper.onLog(callback1);
      wrapper.onLog(callback2);

      mockFs.readFile.mockResolvedValue('content');

      await wrapper.readFile('test.txt');

      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('should store log entries internally', async () => {
      mockFs.readFile.mockResolvedValue('content');

      await wrapper.readFile('test.txt');

      const logs = wrapper.getLogEntries();
      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        level: 'info',
        message: expect.stringContaining('Reading file:'),
        source: 'stdout'
      });
    });

    it('should clear logs correctly', async () => {
      mockFs.readFile.mockResolvedValue('content');

      await wrapper.readFile('test.txt');

      expect(wrapper.getLogEntries()).toHaveLength(2);

      wrapper.clearLogs();

      expect(wrapper.getLogEntries()).toHaveLength(0);
    });

    it('should create proper log entry format', async () => {
      const logCallback = jest.fn();
      wrapper.onLog(logCallback);

      mockFs.readFile.mockResolvedValue('content');

      await wrapper.readFile('test.txt');

      const logEntry = logCallback.mock.calls[0][0];
      expect(logEntry).toMatchObject({
        timestamp: expect.any(Date),
        level: 'info',
        message: expect.any(String),
        source: 'stdout'
      });
    });
  });

  describe('error logging', () => {
    it('should log errors with proper level', async () => {
      const logCallback = jest.fn();
      wrapper.onLog(logCallback);

      const error = new Error('Test error');
      mockFs.readFile.mockRejectedValue(error);

      await expect(wrapper.readFile('test.txt')).rejects.toThrow();

      expect(logCallback).toHaveBeenCalledWith(expect.objectContaining({
        level: 'error',
        message: expect.stringContaining('Failed to read file')
      }));
    });

    it('should log write errors', async () => {
      const logCallback = jest.fn();
      wrapper.onLog(logCallback);

      const error = new Error('Write error');
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(error);

      await expect(wrapper.writeFile('test.txt', 'content')).rejects.toThrow();

      expect(logCallback).toHaveBeenCalledWith(expect.objectContaining({
        level: 'error',
        message: expect.stringContaining('Failed to write file')
      }));
    });
  });
});