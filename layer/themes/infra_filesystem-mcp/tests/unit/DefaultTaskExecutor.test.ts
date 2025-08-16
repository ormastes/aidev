import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { DefaultTaskExecutor } from '../../children/DefaultTaskExecutor';
import { Task } from '../../children/VFTaskQueueWrapper';

// Mock child_process
jest.mock('child_process');

describe("DefaultTaskExecutor", () => {
  let executor: DefaultTaskExecutor;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(__dirname, '../../temp/test-default-executor');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    
    executor = new DefaultTaskExecutor(testDir);
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    jest.clearAllMocks();
  });

  describe("getExecutor", () => {
    it('should return a task executor function', () => {
      const taskExecutor = executor.getExecutor();
      expect(typeof taskExecutor).toBe("function");
    });

    it('should handle tasks with no runnable property', async () => {
      const task: Task = {
        id: 'test-1',
        type: 'data',
        priority: 'medium',
        content: { message: 'test' },
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);
      
      expect(result).toEqual({
        skipped: true,
        reason: 'Task has no runnable content'
      });
    });
  });

  describe('file operations', () => {
    it('should execute file:write command', async () => {
      const task: Task = {
        id: 'test-file-write',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'file:write',
          path: 'test.txt',
          args: ['test.txt', 'Hello World']
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.success).toBe(true);
      expect(fs.existsSync('test.txt')).toBe(true);
      expect(fs.readFileSync('test.txt', 'utf8')).toBe('Hello World');
    });

    it('should execute file:read command', async () => {
      // Create test file
      fs.writeFileSync('test-read.txt', 'Test content');

      const task: Task = {
        id: 'test-file-read',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'file:read',
          path: 'test-read.txt'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Test content');
    });

    it('should execute file:delete command', async () => {
      // Create test file
      fs.writeFileSync('test-delete.txt', 'Delete me');

      const task: Task = {
        id: 'test-file-delete',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'file:delete',
          path: 'test-delete.txt'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.success).toBe(true);
      expect(fs.existsSync('test-delete.txt')).toBe(false);
    });

    it('should execute file:exists command', async () => {
      fs.writeFileSync('exists.txt', 'I exist');

      const task: Task = {
        id: 'test-file-exists',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'file:exists',
          path: 'exists.txt'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.success).toBe(true);
      expect(result.exists).toBe(true);
    });
  });

  describe('directory operations', () => {
    it('should execute dir:create command', async () => {
      const task: Task = {
        id: 'test-dir-create',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'dir:create',
          path: 'test-dir/nested'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.success).toBe(true);
      expect(fs.existsSync('test-dir/nested')).toBe(true);
    });

    it('should execute dir:list command', async () => {
      fs.mkdirSync('list-dir');
      fs.writeFileSync('list-dir/file1.txt', "content1");
      fs.writeFileSync('list-dir/file2.txt', "content2");

      const task: Task = {
        id: 'test-dir-list',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'dir:list',
          path: 'list-dir'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.success).toBe(true);
      expect(result.files).toContain('file1.txt');
      expect(result.files).toContain('file2.txt');
    });
  });

  describe('function execution', () => {
    it('should execute registered functions', async () => {
      let functionCalled = false;
      executor.registerFunction("testFunction", async (arg1: string, arg2: number) => {
        functionCalled = true;
        return `Called with ${arg1} and ${arg2}`;
      });

      const task: Task = {
        id: 'test-function',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "testFunction",
          args: ['hello', '42']
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.success).toBe(true);
      expect(functionCalled).toBe(true);
      expect(result.result).toBe('Called with hello and 42');
    });

    it('should handle function errors', async () => {
      executor.registerFunction("errorFunction", async () => {
        throw new Error('Function error');
      });

      const task: Task = {
        id: 'test-function-error',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "errorFunction"
        }
      };

      const taskExecutor = executor.getExecutor();
      
      const result = await taskExecutor(task);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Function error');
      expect(result.completed).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle file read errors', async () => {
      const task: Task = {
        id: 'test-read-error',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'file:read',
          path: 'non-existent.txt'
        }
      };

      const taskExecutor = executor.getExecutor();
      
      await expect(taskExecutor(task)).rejects.toThrow();
    });

    it('should handle unknown commands', async () => {
      const task: Task = {
        id: 'test-unknown',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'unknown:command'
        }
      };

      const taskExecutor = executor.getExecutor();
      
      await expect(taskExecutor(task)).rejects.toThrow('Unknown command: unknown:command');
    });
  });

  describe('command execution', () => {
    it('should handle missing runnable.command', async () => {
      const task: Task = {
        id: 'test-no-command',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {} as any
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);
      
      expect(result).toEqual({
        skipped: true,
        reason: 'No command specified in runnable'
      });
    });
  });
});