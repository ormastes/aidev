import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { DefaultTaskExecutor } from '../../children/DefaultTaskExecutor';
import { Task } from '../../children/VFTaskQueueWrapper';

// Mock child_process
jest.mock('child_process');

// Mock promisify to pass through the mocked functions
jest.mock('util', () => ({
  promisify: (fn: any) => fn
}));

describe('DefaultTaskExecutor Comprehensive Tests', () => {
  let executor: DefaultTaskExecutor;
  let testDir: string;
  let mockExec: any;
  let mockExecFile: any;

  beforeEach(() => {
    testDir = path.join(__dirname, '../../temp/test-executor-comprehensive');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    
    executor = new DefaultTaskExecutor(testDir);
    jest.clearAllMocks();
    
    // Get mocked functions
    const childProcess = require('child_process');
    mockExec = childProcess.exec as jest.MockedFunction<any>;
    mockExecFile = childProcess.execFile as jest.MockedFunction<any>;
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('Command Execution', () => {
    it('should execute command successfully', async () => {
      const mockOutput = { stdout: 'command output', stderr: '' };
      mockExec.mockResolvedValue({ stdout: 'command output\n', stderr: '' } as any);

      const task: Task = {
        id: 'cmd-1',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'echo',
          args: ['hello', 'world']
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toBe('command output');
      expect(result.exitCode).toBe(0);
      expect(mockExec).toHaveBeenCalledWith('echo hello world', expect.any(Object));
    });

    it('should handle command with environment variables', async () => {
      mockExec.mockImplementation((cmd, options: any) => {
        expect(options.env).toHaveProperty('CUSTOM_VAR', 'custom_value');
        return Promise.resolve({ stdout: 'success', stderr: '' } as any);
      });

      const task: Task = {
        id: 'cmd-2',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'echo',
          args: ['$CUSTOM_VAR'],
          env: { CUSTOM_VAR: 'custom_value' }
        }
      };

      const taskExecutor = executor.getExecutor();
      await taskExecutor(task);

      expect(mockExec).toHaveBeenCalled();
    });

    it('should handle command execution errors', async () => {
      const error: any = new Error('Command failed');
      error.stdout = 'partial output';
      error.stderr = 'error output';
      error.code = 127;
      
      mockExec.mockRejectedValue(error);

      const task: Task = {
        id: 'cmd-3',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'invalid-command'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.exitCode).toBe(127);
      expect(result.error).toBe('Command failed');
      expect(result.stderr).toBe('error output');
    });
  });

  describe('Script Execution', () => {
    it('should execute script successfully', async () => {
      // Create test script
      const scriptPath = path.join(testDir, 'test.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "script output"');
      fs.chmodSync(scriptPath, 0o755);

      mockExecFile.mockResolvedValue({ stdout: 'script output\n', stderr: '' } as any);

      const task: Task = {
        id: 'script-1',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: 'test.sh'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toBe('script output');
      expect(result.exitCode).toBe(0);
    });

    it('should handle script with arguments', async () => {
      const scriptPath = path.join(testDir, 'args.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "$@"');
      fs.chmodSync(scriptPath, 0o755);

      mockExecFile.mockImplementation((file, args: any) => {
        expect(args).toEqual(['arg1', 'arg2']);
        return Promise.resolve({ stdout: 'arg1 arg2\n', stderr: '' } as any);
      });

      const task: Task = {
        id: 'script-2',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: 'args.sh',
          args: ['arg1', 'arg2']
        }
      };

      const taskExecutor = executor.getExecutor();
      await taskExecutor(task);

      expect(mockExecFile).toHaveBeenCalledWith(
        expect.stringContaining('args.sh'),
        ['arg1', 'arg2'],
        expect.any(Object)
      );
    });

    it('should handle non-existent script', async () => {
      const task: Task = {
        id: 'script-3',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: 'non-existent.sh'
        }
      };

      const taskExecutor = executor.getExecutor();
      
      await expect(taskExecutor(task)).rejects.toThrow('Script not found');
    });

    it('should make non-executable scripts executable', async () => {
      const scriptPath = path.join(testDir, 'non-exec.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "made executable"');
      // Don't make it executable initially

      mockExecFile.mockResolvedValue({ stdout: 'made executable\n', stderr: '' } as any);

      const task: Task = {
        id: 'script-4',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: 'non-exec.sh'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toBe('made executable');
      // Check that file is now executable
      const stats = fs.statSync(scriptPath);
      expect(stats.mode & 0o111).toBeTruthy(); // Check execute bits
    });
  });

  describe('Function Execution', () => {
    it('should execute registered function', async () => {
      const mockFn = jest.fn(() => Promise.resolve({ result: 'function result' }));
      executor.registerFunction("testFunc", mockFn);

      const task: Task = {
        id: 'func-1',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "testFunc",
          args: ['arg1', 'arg2']
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toEqual({ result: { result: 'function result' }, completed: true });
    });

    it('should handle function execution errors', async () => {
      executor.registerFunction("errorFunc", async () => {
        throw new Error('Function error');
      });

      const task: Task = {
        id: 'func-2',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "errorFunc"
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);
      
      expect(result.error).toBe('Function error');
      expect(result.completed).toBe(false);
    });

    it('should throw error for unregistered function', async () => {
      const task: Task = {
        id: 'func-3',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "unknownFunc"
        }
      };

      const taskExecutor = executor.getExecutor();
      
      await expect(taskExecutor(task)).rejects.toThrow('Function not registered: unknownFunc');
    });
  });

  describe('Built-in Functions', () => {
    it('should execute file operations', async () => {
      executor.registerFunction('fs:writeFile', async (path: string, content: string) => {
        fs.writeFileSync(path, content);
        return { success: true };
      });

      const task: Task = {
        id: 'builtin-1',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: 'fs:writeFile',
          args: ['test-file.txt', 'test content']
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.result.success).toBe(true);
      expect(result.completed).toBe(true);
      expect(fs.existsSync('test-file.txt')).toBe(true);
      expect(fs.readFileSync('test-file.txt', 'utf8')).toBe('test content');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown runnable type', async () => {
      const task: Task = {
        id: 'error-1',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'unknown' as any,
          command: 'test'
        }
      };

      const taskExecutor = executor.getExecutor();
      
      await expect(taskExecutor(task)).rejects.toThrow('Unknown runnable type: unknown');
    });

    it('should handle command with no arguments', async () => {
      mockExec.mockImplementation((cmd) => {
        expect(cmd).toBe('ls');
        return Promise.resolve({ stdout: 'file list\n', stderr: '' } as any);
      });

      const task: Task = {
        id: 'cmd-no-args',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'ls'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toBe('file list');
    });
  });

  describe('Working Directory', () => {
    it('should execute commands in correct working directory', async () => {
      mockExec.mockImplementation((cmd, options: any) => {
        expect(options.cwd).toBe(testDir);
        return Promise.resolve({ stdout: 'cwd output', stderr: '' } as any);
      });

      const task: Task = {
        id: 'cwd-test',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'pwd'
        }
      };

      const taskExecutor = executor.getExecutor();
      await taskExecutor(task);

      expect(mockExec).toHaveBeenCalled();
    });
  });
});