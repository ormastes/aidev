import { ChildProcess, spawn } from 'child_process';
import { IProcessHandle, IProcessManager, ProcessConfig, ResourceUsage } from '../interfaces';

export class ProcessHandle implements IProcessHandle {
  private process: ChildProcess;
  private running: boolean = true;
  private startTime: Date;
  private exitPromise: Promise<number | null>;

  constructor(process: ChildProcess) {
    this.process = process;
    this.startTime = new Date();
    
    this.exitPromise = new Promise((resolve) => {
      this.process.on('exit', (code) => {
        this.running = false;
        resolve(code);
      });
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  getPid(): number {
    return this.process.pid || 0;
  }

  async waitForExit(): Promise<number | null> {
    return this.exitPromise;
  }

  async terminate(): Promise<boolean> {
    if (!this.running) return true;
    
    return new Promise((resolve) => {
      this.process.on('exit', () => {
        this.running = false;
        resolve(true);
      });
      
      // Try graceful shutdown first
      this.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.running) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  getResourceUsage(): ResourceUsage {
    const now = new Date();
    const duration = this.running ? undefined : now.getTime() - this.startTime.getTime();
    
    return {
      pid: this.getPid(),
      startTime: this.startTime,
      duration
    };
  }
}

export class ProcessManager implements IProcessManager {
  private activeProcesses: Set<ProcessHandle> = new Set();

  async spawn(config: ProcessConfig): Promise<ProcessHandle> {
    const childProcess = spawn(config.command, config.args);
    const handle = new ProcessHandle(childProcess);
    
    this.activeProcesses.add(handle);
    
    // Remove from active list when process exits
    handle.waitForExit().then(() => {
      this.activeProcesses.delete(handle);
    });
    
    return handle;
  }

  getActiveCount(): number {
    // Clean up any processes that have exited
    this.activeProcesses.forEach(handle => {
      if (!handle.isRunning()) {
        this.activeProcesses.delete(handle);
      }
    });
    
    return this.activeProcesses.size;
  }

  async terminateAll(): Promise<void> {
    const terminationPromises = Array.from(this.activeProcesses).map(handle => 
      handle.terminate()
    );
    
    await Promise.all(terminationPromises);
    this.activeProcesses.clear();
  }
}