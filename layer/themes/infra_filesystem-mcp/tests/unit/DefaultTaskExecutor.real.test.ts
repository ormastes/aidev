/**
 * Real Unit tests for DefaultTaskExecutor (Mock Free Test Oriented Development)
 * 
 * Testing command execution, script running, and function calling capabilities
 * without using any mocks - all real operations
 */

import { DefaultTaskExecutor } from '../../children/DefaultTaskExecutor';
import { Task } from '../../children/VFTaskQueueWrapper';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe('DefaultTaskExecutor - Real Tests', () => {
  let testDir: string;
  let executor: DefaultTaskExecutor;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), 'default-task-executor-test-' + Date.now());
    await fs.promises.mkdir(testDir, { recursive: true });
    executor = new DefaultTaskExecutor(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe('constructor and basic properties', () => {
    it('should create executor with default working directory', () => {
      const defaultExecutor = new DefaultTaskExecutor();
      expect(defaultExecutor.directory).toBe(process.cwd());
    });

    it('should create executor with custom working directory', () => {
      expect(executor.directory).toBe(testDir);
    });
  });

  describe('function registration and execution', () => {
    it('should register and execute a simple function', async () => {
      let called = false;
      let receivedArgs: any[] = [];
      
      executor.registerFunction("testFunc", (...args: any[]) => {
        called = true;
        receivedArgs = args;
        return 'test result';
      });

      const task: Task = {
        id: 'test-1',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test function execution',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "testFunc",
          args: ['arg1', 'arg2']
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(called).toBe(true);
      expect(receivedArgs).toEqual(['arg1', 'arg2']);
      expect(result.result).toBe('test result');
      expect(result.completed).toBe(true);
    });

    it('should handle async function execution', async () => {
      executor.registerFunction("asyncFunc", async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });

      const task: Task = {
        id: 'test-2',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test async function',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "asyncFunc",
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.result).toBe('async result');
      expect(result.completed).toBe(true);
    });

    it('should handle function execution errors', async () => {
      executor.registerFunction("errorFunc", () => {
        throw new Error('Function error');
      });

      const task: Task = {
        id: 'test-3',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test error function',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "errorFunc",
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.error).toBe('Function error');
      expect(result.completed).toBe(false);
    });

    it('should throw error for unregistered function', async () => {
      const task: Task = {
        id: 'test-4',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test unregistered function',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "unknownFunc",
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      await expect(taskExecutor(task)).rejects.toThrow('Function not registered: unknownFunc');
    });
  });

  describe('command execution', () => {
    it('should execute simple command successfully', async () => {
      const task: Task = {
        id: 'test-5',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test command execution',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'echo',
          args: ['Hello, World!']
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toBe('Hello, World!');
      expect(result.exitCode).toBe(0);
    });

    it('should execute command with environment variables', async () => {
      const task: Task = {
        id: 'test-6',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test command with env',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: process.platform === 'win32' ? 'echo %TEST_VAR%' : 'printenv TEST_VAR',
          args: [],
          env: { TEST_VAR: 'test_value' }
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toContain('test_value');
      expect(result.exitCode).toBe(0);
    });

    it('should handle command execution errors', async () => {
      const task: Task = {
        id: 'test-7',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test command error',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: "nonexistentcommand123",
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeDefined();
    });

    it('should execute command in working directory', async () => {
      // Create a test file in the working directory
      const testFile = path.join(testDir, 'test.txt');
      await fs.promises.writeFile(testFile, 'test content');

      const task: Task = {
        id: 'test-8',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test command in working dir',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: process.platform === 'win32' ? 'dir' : 'ls',
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toContain('test.txt');
      expect(result.exitCode).toBe(0);
    });

    it('should handle command with no arguments', async () => {
      const task: Task = {
        id: 'test-command-no-args',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test command without args',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'command',
          command: 'pwd'
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
    });
  });

  describe('script execution', () => {
    it('should execute bash script successfully', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const scriptPath = path.join(testDir, 'test.sh');
      const scriptContent = `#!/bin/bash
echo "Script output"
echo "Args: $@"
exit 0`;
      await fs.promises.writeFile(scriptPath, scriptContent);
      await fs.promises.chmod(scriptPath, 0o755);

      const task: Task = {
        id: 'test-9',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test script execution',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: scriptPath,
          args: ['arg1', 'arg2']
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toContain('Script output');
      expect(result.stdout).toContain('Args: arg1 arg2');
      expect(result.exitCode).toBe(0);
    });

    it('should execute script with relative path', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const scriptPath = path.join(testDir, 'relative.sh');
      const scriptContent = `#!/bin/bash
echo "Relative script"`;
      await fs.promises.writeFile(scriptPath, scriptContent);
      await fs.promises.chmod(scriptPath, 0o755);

      const task: Task = {
        id: 'test-10',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test relative script',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: 'relative.sh',
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toContain('Relative script');
      expect(result.exitCode).toBe(0);
    });

    it('should make script executable if needed', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const scriptPath = path.join(testDir, 'non-exec.sh');
      const scriptContent = `#!/bin/bash
echo "Made executable"`;
      await fs.promises.writeFile(scriptPath, scriptContent);
      // Don't make it executable initially

      const task: Task = {
        id: 'test-11',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test non-executable script',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: scriptPath,
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toContain('Made executable');
      expect(result.exitCode).toBe(0);
      
      // Verify script is now executable
      const stats = await fs.promises.stat(scriptPath);
      expect(stats.mode & 0o111).toBeTruthy(); // Check if any execute bit is set
    });

    it('should handle script execution errors', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const scriptPath = path.join(testDir, 'error.sh');
      const scriptContent = `#!/bin/bash
echo "Error script" >&2
exit 1`;
      await fs.promises.writeFile(scriptPath, scriptContent);
      await fs.promises.chmod(scriptPath, 0o755);

      const task: Task = {
        id: 'test-12',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test script error',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: scriptPath,
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stderr).toContain('Error script');
      expect(result.exitCode).toBe(1);
    });

    it('should throw error for non-existent script', async () => {
      const task: Task = {
        id: 'test-13',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test non-existent script',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: '/non/existent/script.sh',
          args: []
        }
      };

      const taskExecutor = executor.getExecutor();
      await expect(taskExecutor(task)).rejects.toThrow('Script not found');
    });

    it('should execute script with environment variables', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const scriptPath = path.join(testDir, 'env.sh');
      const scriptContent = `#!/bin/bash
echo "Env var: $TEST_ENV_VAR"`;
      await fs.promises.writeFile(scriptPath, scriptContent);
      await fs.promises.chmod(scriptPath, 0o755);

      const task: Task = {
        id: 'test-14',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test script with env',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: scriptPath,
          args: [],
          env: { TEST_ENV_VAR: 'custom_value' }
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toContain('Env var: custom_value');
      expect(result.exitCode).toBe(0);
    });

    it('should handle script with no arguments or environment', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const scriptPath = path.join(testDir, 'simple.sh');
      const scriptContent = `#!/bin/bash
echo "Simple script"`;
      await fs.promises.writeFile(scriptPath, scriptContent);
      await fs.promises.chmod(scriptPath, 0o755);

      const task: Task = {
        id: 'test-simple-script',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test simple script',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'script',
          path: scriptPath
        }
      };

      const taskExecutor = executor.getExecutor();
      const result = await taskExecutor(task);

      expect(result.stdout).toContain('Simple script');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for non-runnable task', async () => {
      const task: Task = {
        id: 'test-15',
        type: 'message',
        priority: 'medium',
        content: {
          title: 'Non-runnable task',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const taskExecutor = executor.getExecutor();
      await expect(taskExecutor(task)).rejects.toThrow('Task is not runnable or missing runnable configuration');
    });

    it('should throw error for unknown runnable type', async () => {
      const task: Task = {
        id: 'test-16',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Unknown runnable type',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: 'unknown' as any,
          command: 'test'
        }
      };

      const taskExecutor = executor.getExecutor();
      await expect(taskExecutor(task)).rejects.toThrow('Unknown runnable type: unknown');
    });

    it('should handle missing runnable configuration', async () => {
      const task: Task = {
        id: 'test-missing-runnable',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Missing runnable',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const taskExecutor = executor.getExecutor();
      await expect(taskExecutor(task)).rejects.toThrow('Task is not runnable or missing runnable configuration');
    });
  });

  describe('createDefault factory method', () => {
    let defaultExecutor: DefaultTaskExecutor;

    beforeEach(() => {
      defaultExecutor = DefaultTaskExecutor.createDefault(testDir);
    });

    it('should create executor with registered utility functions', async () => {
      // Test echo function
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const echoTask: Task = {
        id: 'test-17',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test echo function',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: 'echo',
          args: ['Hello from echo']
        }
      };

      const taskExecutor = defaultExecutor.getExecutor();
      const result = await taskExecutor(echoTask);
      
      expect(consoleSpy).toHaveBeenCalledWith('Hello from echo');
      expect(result.result).toBe('Hello from echo');
      
      consoleSpy.mockRestore();
    });

    it('should execute sleep function', async () => {
      const sleepTask: Task = {
        id: 'test-18',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test sleep function',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: 'sleep',
          args: ['100']
        }
      };

      const taskExecutor = defaultExecutor.getExecutor();
      const startTime = Date.now();
      const result = await taskExecutor(sleepTask);
      const endTime = Date.now();

      expect(result.result).toBe('Slept for 100ms');
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should execute writeFile function', async () => {
      const writeTask: Task = {
        id: 'test-19',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test writeFile function',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "writeFile",
          args: ['test-write.txt', 'Test content']
        }
      };

      const taskExecutor = defaultExecutor.getExecutor();
      const result = await taskExecutor(writeTask);

      expect(result.result).toBe('Written to test-write.txt');
      
      const writtenContent = await fs.promises.readFile(
        path.join(testDir, 'test-write.txt'), 
        'utf-8'
      );
      expect(writtenContent).toBe('Test content');
    });

    it('should execute readFile function', async () => {
      // First write a file
      const testFile = path.join(testDir, 'test-read.txt');
      await fs.promises.writeFile(testFile, 'Content to read');

      const readTask: Task = {
        id: 'test-20',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test readFile function',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "readFile",
          args: ['test-read.txt']
        }
      };

      const taskExecutor = defaultExecutor.getExecutor();
      const result = await taskExecutor(readTask);

      expect(result.result).toBe('Content to read');
    });

    it('should handle writeFile with absolute path', async () => {
      const absolutePath = path.join(testDir, 'absolute-write.txt');
      const writeTask: Task = {
        id: 'test-21',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test writeFile with absolute path',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "writeFile",
          args: [absolutePath, 'Absolute path content']
        }
      };

      const taskExecutor = defaultExecutor.getExecutor();
      const result = await taskExecutor(writeTask);

      const writtenContent = await fs.promises.readFile(absolutePath, 'utf-8');
      expect(writtenContent).toBe('Absolute path content');
    });

    it('should handle readFile with absolute path', async () => {
      const absolutePath = path.join(testDir, 'absolute-read.txt');
      await fs.promises.writeFile(absolutePath, 'Absolute read content');

      const readTask: Task = {
        id: 'test-22',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test readFile with absolute path',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "readFile",
          args: [absolutePath]
        }
      };

      const taskExecutor = defaultExecutor.getExecutor();
      const result = await taskExecutor(readTask);

      expect(result.result).toBe('Absolute read content');
    });

    it('should handle readFile error for non-existent file', async () => {
      const readTask: Task = {
        id: 'test-read-error',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test readFile error',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "readFile",
          args: ['non-existent.txt']
        }
      };

      const taskExecutor = defaultExecutor.getExecutor();
      const result = await taskExecutor(readTask);

      expect(result.completed).toBe(false);
      expect(result.error).toContain('ENOENT');
    });

    it('should handle writeFile error for invalid path', async () => {
      const writeTask: Task = {
        id: 'test-write-error',
        type: "runnable",
        priority: 'medium',
        content: {
          title: 'Test writeFile error',
          description: 'Test'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: "writeFile",
          args: ['/invalid/path/test.txt', 'content']
        }
      };

      const taskExecutor = defaultExecutor.getExecutor();
      const result = await taskExecutor(writeTask);

      expect(result.completed).toBe(false);
      expect(result.error).toContain('ENOENT');
    });
  });
});