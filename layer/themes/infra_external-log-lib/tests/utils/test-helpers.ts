import { LogEntry } from '../../user-stories/001-basic-log-capture/src/external/external-log-lib';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

/**
 * Creates a real log capturer that works with mock processes
 */
export class TestLogCapturer {
  private callbacks: Array<(entry: LogEntry) => void> = [];
  private running = false;

  constructor(private process: ChildProcess | MockChildProcess) {}

  onLog(callback: (entry: LogEntry) => void): void {
    this.callbacks.push(callback);
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    if (this.process.stdout) {
      this.process.stdout.on('data', (data: Buffer | string) => {
        const message = data.toString().trim();
        if (message) {
          this.emitLog({
            timestamp: new Date(),
            level: 'info',
            message,
            source: 'stdout'
          });
        }
      });
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (data: Buffer | string) => {
        const message = data.toString().trim();
        if (message) {
          this.emitLog({
            timestamp: new Date(),
            level: 'error',
            message,
            source: 'stderr'
          });
        }
      });
    }
  }

  stop(): void {
    this.running = false;
    // Remove listeners
    if (this.process.stdout) {
      this.process.stdout.removeAllListeners('data');
    }
    if (this.process.stderr) {
      this.process.stderr.removeAllListeners('data');
    }
  }

  private emitLog(entry: LogEntry): void {
    this.callbacks.forEach(cb => cb(entry));
  }
}

/**
 * Mock child process that extends EventEmitter for testing
 */
export class MockChildProcess extends EventEmitter {
  public stdout: EventEmitter;
  public stderr: EventEmitter;
  public pid: number;
  public killed = false;

  constructor(pid?: number) {
    super();
    this.pid = pid || Math.floor(Math.random() * 10000) + 1000;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    
    // Add stream-like methods
    (this.stdout as any).setEncoding = () => {};
    (this.stderr as any).setEncoding = () => {};
    (this.stdout as any).on = this.stdout.on.bind(this.stdout);
    (this.stderr as any).on = this.stderr.on.bind(this.stderr);
    (this.stdout as any).removeListener = this.stdout.removeListener.bind(this.stdout);
    (this.stderr as any).removeListener = this.stderr.removeListener.bind(this.stderr);
  }

  kill(signal?: string): boolean {
    if (this.killed) return false;
    this.killed = true;
    
    setImmediate(() => {
      this.emit('exit', null, signal || 'SIGTERM');
      this.emit('close', null);
    });
    
    return true;
  }
}

/**
 * Creates a mock external log lib
 */
export function createMockExternalLogLib() {
  return {
    createCapturer: (process: ChildProcess | MockChildProcess) => {
      return new TestLogCapturer(process);
    }
  };
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Creates a process handle mock
 */
export function createMockProcessHandle(process: MockChildProcess) {
  let running = true;
  
  process.on('exit', () => {
    running = false;
  });
  
  return {
    process,
    pid: process.pid,
    getPid: () => process.pid,
    isRunning: () => running,
    waitForExit: () => new Promise<number | null>(resolve => {
      if (!running) {
        resolve(0);
      } else {
        process.once('exit', (code) => resolve(code));
      }
    }),
    terminate: async () => {
      process.kill();
      return true;
    },
    getResourceUsage: () => ({
      pid: process.pid,
      startTime: new Date()
    })
  };
}