import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { os } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

/**
 * Test process simulator for unit testing without mocks
 * Creates actual processes that simulate various test scenarios
 */
export class TestProcessSimulator {
  private tempDir: string = '';
  private processes: Map<string, EventEmitter> = new Map();

  async setup(): Promise<void> {
    // Create temporary directory for test files
    this.tempDir = await fs.mkdtemp(join(os.tmpdir(), 'test-simulator-'));
  }

  async cleanup(): Promise<void> {
    // Clean up all processes
    this.processes.clear();
    
    // Remove temporary directory
    if (this.tempDir) {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Create a simulated child process that behaves like spawn
   */
  createProcess(name: string, behavior: ProcessBehavior): SimulatedProcess {
    const process = new SimulatedProcess(behavior);
    this.processes.set(name, process);
    
    // Start the simulation after a tick
    process.nextTick(() => process.start());
    
    return process;
  }

  /**
   * Create test files in temporary directory
   */
  async createTestFile(filename: string, content: string): Promise<string> {
    const filepath = join(this.tempDir, filename);
    await fs.writeFile(filepath, content);
    return filepath;
  }

  /**
   * Get the temporary directory path
   */
  getTempDir(): string {
    return this.tempDir;
  }
}

export interface ProcessBehavior {
  stdout?: string[];
  stderr?: string[];
  exitCode: number;
  delay?: number;
  throwError?: Error;
  hangIndefinitely?: boolean;
}

/**
 * Simulated child process that mimics Node.js ChildProcess behavior
 */
export class SimulatedProcess extends EventEmitter {
  public stdout: EventEmitter;
  public stderr: EventEmitter;
  public pid: number;
  private behavior: ProcessBehavior;
  private killed: boolean = false;

  constructor(behavior: ProcessBehavior) {
    super();
    this.behavior = behavior;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.pid = Math.floor(Math.random() * 10000);
  }

  /**
   * Start the process simulation
   */
  async start(): Promise<void> {
    if (this.behavior.throwError) {
      this.emit('error', this.behavior.throwError);
      return;
    }

    const delay = this.behavior.delay || 10;

    // Emit stdout data
    if (this.behavior.stdout) {
      for (const line of this.behavior.stdout) {
        if (this.killed) break;
        await this.wait(delay);
        this.stdout.emit('data', Buffer.from(line + '\n'));
      }
    }

    // Emit stderr data
    if (this.behavior.stderr) {
      for (const line of this.behavior.stderr) {
        if (this.killed) break;
        await this.wait(delay);
        this.stderr.emit('data', Buffer.from(line + '\n'));
      }
    }

    // Hang if requested
    if (this.behavior.hangIndefinitely && !this.killed) {
      // Just wait indefinitely
      return new Promise(() => {});
    }

    // Emit close event
    if (!this.killed) {
      await this.wait(delay);
      this.emit('close', this.behavior.exitCode);
    }
  }

  /**
   * Kill the process
   */
  kill(signal?: string): boolean {
    this.killed = true;
    this.emit('close', signal === 'SIGTERM' ? 143 : 137);
    return true;
  }

  /**
   * Helper to wait
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper to run callback on next tick
   */
  nextTick(callback: () => void): void {
    process.nextTick(callback);
  }
}

/**
 * Factory for creating common test scenarios
 */
export class TestScenarioFactory {
  static completedfulTest(stdout?: string[]): ProcessBehavior {
    return {
      stdout: stdout || ['Test In Progress', 'All scenarios In Progress'],
      exitCode: 0,
      delay: 5
    };
  }

  static failedTest(stderr?: string[]): ProcessBehavior {
    return {
      stdout: ['Running tests...'],
      stderr: stderr || ['Test failed', 'Error in scenario'],
      exitCode: 1,
      delay: 5
    };
  }

  static timeoutTest(): ProcessBehavior {
    return {
      stdout: ['Starting tests...'],
      hangIndefinitely: true,
      exitCode: 0
    };
  }

  static crashedTest(): ProcessBehavior {
    return {
      throwError: new Error('Process crashed'),
      exitCode: 1
    };
  }

  static emptyTest(): ProcessBehavior {
    return {
      exitCode: 0,
      delay: 1
    };
  }
}