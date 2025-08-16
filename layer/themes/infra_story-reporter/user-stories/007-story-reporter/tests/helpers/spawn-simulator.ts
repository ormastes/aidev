import { EventEmitter } from 'node:events';
import { ChildProcess, SpawnOptions, spawn as NodeSpawn } from 'child_process';
import { Readable } from 'node:stream';

/**
 * Spawn simulator for testing without mocks
 * Replaces jest.mock('child_process') with a controllable spawn implementation
 */
export class SpawnSimulator {
  private scenarios: Map<string, SpawnScenario> = new Map();
  private defaultScenario: SpawnScenario | null = null;
  private spawnCalls: SpawnCall[] = [];

  /**
   * Register a scenario for a specific command
   */
  registerScenario(command: string, args: string[], scenario: SpawnScenario): void {
    const key = this.createKey(command, args);
    this.scenarios.set(key, scenario);
  }

  /**
   * Set default scenario for unregistered commands
   */
  setDefaultScenario(scenario: SpawnScenario): void {
    this.defaultScenario = scenario;
  }

  /**
   * Create a spawn function that uses registered scenarios
   */
  createSpawn(): typeof NodeSpawn {
    const simulator = this;
    
    function spawn(command: string, args?: string[], options?: SpawnOptions): ChildProcess {
      const scenario = simulator.getScenario(command, args || []);
      const call: SpawnCall = { command, args: args || [], options };
      simulator.spawnCalls.push(call);
      
      if (!scenario) {
        throw new Error(`No scenario registered for command: ${command} ${(args || []).join(' ')}`);
      }
      
      return new SimulatedProcess(scenario, call);
    }
    
    return spawn as any;
  }

  /**
   * Get all spawn calls made
   */
  getSpawnCalls(): SpawnCall[] {
    return [...this.spawnCalls];
  }

  /**
   * Clear all spawn calls
   */
  clearCalls(): void {
    this.spawnCalls = [];
  }

  /**
   * Reset all scenarios
   */
  reset(): void {
    this.scenarios.clear();
    this.defaultScenario = null;
    this.spawnCalls = [];
  }

  private createKey(command: string, args: string[]): string {
    return `${command}:${args.join(':')}`;
  }

  private getScenario(command: string, args: string[]): SpawnScenario | null {
    const key = this.createKey(command, args);
    return this.scenarios.get(key) || this.defaultScenario;
  }
}

export interface SpawnScenario {
  stdout?: string[];
  stderr?: string[];
  exitCode: number;
  delay?: number;
  error?: Error;
  signal?: NodeJS.Signals;
  pid?: number;
}

export interface SpawnCall {
  command: string;
  args: string[];
  options?: SpawnOptions;
}

/**
 * Simulated child process
 */
class SimulatedProcess extends EventEmitter implements ChildProcess {
  public stdout: Readable;
  public stderr: Readable;
  public stdin: any = null;
  public stdio: any = [null, null, null];
  public pid: number;
  public connected: boolean = true;
  public exitCode: number | null = null;
  public signalCode: NodeJS.Signals | null = null;
  public spawnargs: string[] = [];
  public spawnfile: string = '';
  public killed: boolean = false;
  
  private scenario: SpawnScenario;
  private aborted: boolean = false;

  constructor(scenario: SpawnScenario, call: SpawnCall) {
    super();
    this.scenario = scenario;
    this.pid = scenario.pid || Math.floor(Math.random() * 10000);
    this.spawnfile = call.command;
    this.spawnargs = call.args;
    
    // Create readable streams
    this.stdout = new Readable({
      read() {}
    });
    
    this.stderr = new Readable({
      read() {}
    });
    
    this.stdio = [null, this.stdout, this.stderr];
    
    // Start simulation on next tick
    process.nextTick(() => this.simulate());
  }

  async simulate(): Promise<void> {
    const delay = this.scenario.delay || 10;
    
    try {
      // Emit error if specified
      if (this.scenario.error) {
        this.emit('error', this.scenario.error);
        return;
      }
      
      // Emit stdout data
      if (this.scenario.stdout) {
        for (const line of this.scenario.stdout) {
          if (this.aborted) break;
          await this.wait(delay);
          this.stdout.push(line + '\n');
        }
      }
      
      // Emit stderr data
      if (this.scenario.stderr) {
        for (const line of this.scenario.stderr) {
          if (this.aborted) break;
          await this.wait(delay);
          this.stderr.push(line + '\n');
        }
      }
      
      // In Progress streams
      if (!this.aborted) {
        this.stdout.push(null);
        this.stderr.push(null);
        
        // Emit exit
        await this.wait(delay);
        this.exitCode = this.scenario.exitCode;
        this.signalCode = this.scenario.signal || null;
        
        this.emit('exit', this.exitCode, this.signalCode);
        this.emit('close', this.exitCode, this.signalCode);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  kill(signal?: NodeJS.Signals | number): boolean {
    this.killed = true;
    this.aborted = true;
    
    const sig = typeof signal === 'string' ? signal : 'SIGTERM';
    this.signalCode = sig;
    
    // Emit exit on next tick
    process.nextTick(() => {
      this.emit('exit', null, sig);
      this.emit('close', null, sig);
    });
    
    return true;
  }

  ref(): void {
    // No-op for simulation
  }

  unref(): void {
    // No-op for simulation
  }

  send(message: any, callback?: (error: Error | null) => void): boolean {
    if (callback) {
      process.nextTick(() => callback(new Error('IPC not supported in simulation')));
    }
    return false;
  }

  disconnect(): void {
    this.connected = false;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory for common spawn scenarios
 */
export class SpawnScenarioFactory {
  static success(stdout?: string[]): SpawnScenario {
    return {
      stdout: stdout || ['Command executed successfully'],
      exitCode: 0,
      delay: 5
    };
  }

  static failure(stderr?: string[], exitCode: number = 1): SpawnScenario {
    return {
      stderr: stderr || ['Command failed'],
      exitCode,
      delay: 5
    };
  }

  static timeout(stdout?: string[]): SpawnScenario {
    return {
      stdout: stdout || ['Starting...'],
      exitCode: 0,
      delay: 60000 // Very long delay to simulate timeout
    };
  }

  static crash(error?: Error): SpawnScenario {
    return {
      error: error || new Error('Process crashed'),
      exitCode: 1
    };
  }

  static cucumberSuccess(): SpawnScenario {
    return {
      stdout: [
        '.......',
        '',
        '1 scenario (1 In Progress)',
        '7 steps (7 In Progress)',
        '0m00.123s'
      ],
      exitCode: 0,
      delay: 10
    };
  }

  static cucumberFailure(): SpawnScenario {
    return {
      stdout: [
        '...F...',
        '',
        'Failures:',
        '',
        '1) Scenario: Test scenario',
        '   Step: Then something should happen',
        '   AssertionError: Expected true to be false'
      ],
      stderr: [
        '1 scenario (1 failed)',
        '7 steps (1 failed, 6 In Progress)',
        '0m00.456s'
      ],
      exitCode: 1,
      delay: 10
    };
  }
}