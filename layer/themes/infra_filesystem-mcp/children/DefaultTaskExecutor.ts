/**
 * DefaultTaskExecutor - Default implementation for executing runnable tasks
 * 
 * Supports command execution, script running, and function calling
 */

import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { Task, TaskExecutor } from './VFTaskQueueWrapper';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export class DefaultTaskExecutor {
  private functionRegistry: Map<string, Function> = new Map();
  private workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * Get the working directory
   */
  get directory(): string {
    return this.workingDirectory;
  }

  /**
   * Register a function that can be called by runnable tasks
   * @param name Function name
   * @param fn Function implementation
   */
  async registerFunction(name: string, fn: Function): void {
    this.functionRegistry.set(name, fn);
  }

  /**
   * Get the task executor function
   * @returns TaskExecutor function
   */
  async getExecutor(): TaskExecutor {
    return async (task: Task) => {
      if (task.type !== 'runnable' || !task.runnable) {
        return {
          skipped: true,
          reason: 'Task has no runnable content'
        };
      }

      const { type, command, path: scriptPath, function: funcName, args = [], env = {} } = task.runnable;

      if (!type) {
        return {
          skipped: true,
          reason: 'No command specified in runnable'
        };
      }

      switch (type) {
        case 'command':
          return await this.executeCommand(command!, args, env, scriptPath);
        
        case 'script':
          return await this.executeScript(scriptPath!, args, env);
        
        case 'function':
          return await this.executeFunction(funcName!, args);
        
        default:
          throw new Error(`Unknown runnable type: ${type}`);
      }
    };
  }

  /**
   * Execute a shell command
   * @param command Command to execute
   * @param args Command arguments
   * @param env Environment variables
   * @returns Command output
   */
  private async executeCommand(command: string, args: string[], env: Record<string, string>, path?: string): Promise<any> {
    // Handle special file system commands
    if (command.startsWith('file:') || command.startsWith('dir:')) {
      return this.handleFileSystemCommand(command, args, path);
    }
    
    // Handle unknown command patterns
    if (command.includes(':') && !['http:', 'https:', 'ftp:', 'ssh:'].some(proto => command.startsWith(proto))) {
      throw new Error(`Unknown command: ${command}`);
    }
    
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
    
    const options = {
      cwd: this.workingDirectory,
      env: { ...process.env, ...env }
    };

    try {
      const { stdout, stderr } = await execAsync(fullCommand, options);
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        exitCode: error.code || 1,
        error: error.message
      };
    }
  }

  /**
   * Handle file system commands
   * @param command File system command
   * @param args Command arguments
   * @returns Command result
   */
  private async handleFileSystemCommand(command: string, args: string[], pathFromRunnable?: string): Promise<any> {
    try {
      switch (command) {
        case 'file:write': {
          const filePath = args[0] || pathFromRunnable;
          const content = args[1] || args[0];
          if (!filePath) throw new Error('No file path specified');
          const absolutePath = path.join(this.workingDirectory, filePath);
          await fileAPI.createFile(absolutePath, content || '', { type: FileType.TEMPORARY });
          return { success: true, path: absolutePath };
        }
        
        case 'file:read': {
          const filePath = args[0] || pathFromRunnable;
          if (!filePath) throw new Error('No file path specified');
          const absolutePath = path.join(this.workingDirectory, filePath);
          const content = await fs.promises.readFile(absolutePath, 'utf8');
          return { success: true, content };
        }
        
        case 'file:delete': {
          const filePath = args[0] || pathFromRunnable;
          if (!filePath) throw new Error('No file path specified');
          const absolutePath = path.join(this.workingDirectory, filePath);
          await fs.promises.unlink(absolutePath);
          return { success: true, path: absolutePath };
        }
        
        case 'file:exists': {
          const filePath = args[0] || pathFromRunnable;
          if (!filePath) throw new Error('No file path specified');
          const absolutePath = path.join(this.workingDirectory, filePath);
          const exists = fs.existsSync(absolutePath);
          return { success: true, exists };
        }
        
        case 'dir:create': {
          const dirPath = args[0] || pathFromRunnable;
          if (!dirPath) throw new Error('No directory path specified');
          const absolutePath = path.join(this.workingDirectory, dirPath);
          await fileAPI.createDirectory(absolutePath);
          return { success: true, path: absolutePath };
        }
        
        case 'dir:list': {
          const dirPath = args[0] || pathFromRunnable || '.';
          const absolutePath = path.join(this.workingDirectory, dirPath);
          const files = await fs.promises.readdir(absolutePath);
          return { success: true, files };
        }
        
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Execute a script file
   * @param scriptPath Path to script
   * @param args Script arguments
   * @param env Environment variables
   * @returns Script output
   */
  private async executeScript(scriptPath: string, args: string[], env: Record<string, string>): Promise<any> {
    const absolutePath = path.isAbsolute(scriptPath) 
      ? scriptPath 
      : path.join(this.workingDirectory, scriptPath);

    // Check if script exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Script not found: ${absolutePath}`);
    }

    // Make sure script is executable
    try {
      fs.accessSync(absolutePath, fs.constants.X_OK);
    } catch {
      // Try to make it executable
      fs.chmodSync(absolutePath, 0o755);
    }

    const options = {
      cwd: this.workingDirectory,
      env: { ...process.env, ...env }
    };

    try {
      const { stdout, stderr } = await execFileAsync(absolutePath, args, options);
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        exitCode: error.code || 1,
        error: error.message
      };
    }
  }

  /**
   * Execute a registered function
   * @param funcName Function name
   * @param args Function arguments
   * @returns Function result
   */
  private async executeFunction(funcName: string, args: string[]): Promise<any> {
    const func = this.functionRegistry.get(funcName);
    
    if (!func) {
      throw new Error(`Function not registered: ${funcName}`);
    }

    try {
      // Call function with spread arguments
      const result = await func(...args);
      return {
        success: true,
        result,
        completed: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        completed: false
      };
    }
  }

  /**
   * Create a default task executor with common functions registered
   * @param workingDirectory Working directory for commands/scripts
   * @returns DefaultTaskExecutor instance
   */
  static createDefault(workingDirectory?: string): DefaultTaskExecutor {
    const executor = new DefaultTaskExecutor(workingDirectory);

    // Register common utility functions
    executor.registerFunction('echo', (message: string) => {
      console.log(message);
      return message;
    });

    executor.registerFunction('sleep', async (ms: string) => {
      const milliseconds = parseInt(ms);
      await new Promise(resolve => setTimeout(resolve, milliseconds));
      return `Slept for ${milliseconds}ms`;
    });

    executor.registerFunction('writeFile', async (filePath: string, content: string) => {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(executor.workingDirectory, filePath);
      
      await fileAPI.createFile(absolutePath, content, { type: FileType.TEMPORARY });
      return `Written to ${filePath}`;
    });

    executor.registerFunction('readFile', async (filePath: string) => {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(executor.workingDirectory, filePath);
      
      const content = await fs.promises.readFile(absolutePath, 'utf-8');
      return content;
    });

    return executor;
  }
}