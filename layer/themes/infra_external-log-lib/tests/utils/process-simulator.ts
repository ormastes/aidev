import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'node:events';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Creates a real child process that simulates specific behaviors for testing
 */
export class ProcessSimulator {
  private static readonly HELPER_SCRIPT = path.join(__dirname, 'process-helper.js');

  /**
   * Ensure helper script exists
   */
  static async ensureHelperScript(): Promise<void> {
    const helperContent = `
const process = require('process');

// Parse command line arguments
const args = process.argv.slice(2);
const config = JSON.parse(args[0] || '{}');

// Handle stdout messages
if (config.stdout) {
  config.stdout.forEach((msg, index) => {
    setTimeout(() => {
      process.stdout.write(msg + '\\n');
    }, config.stdoutDelay || 0);
  });
}

// Handle stderr messages
if (config.stderr) {
  config.stderr.forEach((msg, index) => {
    setTimeout(() => {
      process.stderr.write(msg + '\\n');
    }, config.stderrDelay || 0);
  });
}

// Handle exit
setTimeout(() => {
  process.exit(config.exitCode || 0);
}, config.exitDelay || 100);

// Handle signals
if (config.handleSignals) {
  process.on('SIGTERM', () => {
    process.exit(143); // 128 + 15 (SIGTERM)
  });
  
  process.on('SIGINT', () => {
    process.exit(130); // 128 + 2 (SIGINT)
  });
}
`;

    await fs.promises.mkdir(path.dirname(ProcessSimulator.HELPER_SCRIPT), { recursive: true });
    await fs.promises.writeFile(ProcessSimulator.HELPER_SCRIPT, helperContent, 'utf-8');
  }

  /**
   * Spawn a process with specific behavior
   */
  static async spawn(config: {
    stdout?: string[];
    stderr?: string[];
    exitCode?: number;
    exitDelay?: number;
    stdoutDelay?: number;
    stderrDelay?: number;
    handleSignals?: boolean;
  }): Promise<ChildProcess> {
    await ProcessSimulator.ensureHelperScript();
    
    return spawn('node', [ProcessSimulator.HELPER_SCRIPT, JSON.stringify(config)]);
  }

  /**
   * Create a Python-like process that outputs formatted logs
   */
  static async spawnPython(config: {
    logs?: Array<{ level: string; message: string; delay?: number }>;
    exitCode?: number;
    exitDelay?: number;
  }): Promise<ChildProcess> {
    const pythonConfig = {
      stdout: config.logs?.filter(log => log.level.toLowerCase() !== 'error')
        .map(log => {
          if (log.level.toLowerCase() === 'info' || log.level.toLowerCase() === 'debug') {
            return `${log.level.toUpperCase()}: ${log.message}`;
          }
          return log.message;
        }) || [],
      stderr: config.logs?.filter(log => log.level.toLowerCase() === 'error')
        .map(log => {
          const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '');
          return `${timestamp} - app - ERROR - ${log.message}`;
        }) || [],
      exitCode: config.exitCode,
      exitDelay: config.exitDelay,
      handleSignals: true
    };

    return ProcessSimulator.spawn(pythonConfig);
  }

  /**
   * Create a long-running process
   */
  static async spawnLongRunning(durationMs: number = 10000): Promise<ChildProcess> {
    return ProcessSimulator.spawn({
      stdout: ['Process started'],
      exitDelay: durationMs,
      handleSignals: true
    });
  }

  /**
   * Create a process that outputs multiple lines
   */
  static async spawnMultiLine(lines: string[], source: 'stdout' | 'stderr' = 'stdout'): Promise<ChildProcess> {
    const config = source === 'stdout' 
      ? { stdout: lines, exitDelay: 200 }
      : { stderr: lines, exitDelay: 200 };
    
    return ProcessSimulator.spawn(config);
  }

  /**
   * Clean up helper script
   */
  static async cleanup(): Promise<void> {
    try {
      await fs.promises.unlink(ProcessSimulator.HELPER_SCRIPT);
    } catch (error) {
      // Ignore errors if file doesn't exist
    }
  }
}

/**
 * Mock-like process for unit tests that need synchronous behavior
 */
export class MockProcess extends EventEmitter {
  public stdout: EventEmitter;
  public stderr: EventEmitter;
  public pid: number;
  private _killed = false;

  constructor(pid: number = Math.floor(Math.random() * 10000) + 1000) {
    super();
    this.pid = pid;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    
    // Make stdout/stderr look like real streams
    (this.stdout as any).setEncoding = () => {};
    (this.stderr as any).setEncoding = () => {};
  }

  kill(signal?: string): boolean {
    if (this._killed) return false;
    
    this._killed = true;
    setImmediate(() => {
      this.emit('exit', null, signal || 'SIGTERM');
      this.emit('close', null);
    });
    return true;
  }

  simulateExit(code: number): void {
    if (this._killed) return;
    
    setImmediate(() => {
      this.emit('exit', code);
      this.emit('close', code);
    });
  }

  simulateStdout(data: string): void {
    setImmediate(() => {
      this.stdout.emit('data', Buffer.from(data));
    });
  }

  simulateStderr(data: string): void {
    setImmediate(() => {
      this.stderr.emit('data', Buffer.from(data));
    });
  }
}