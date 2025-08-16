import { spawn, ChildProcess, SpawnOptions } from 'child_process';

export interface ProcessSpawnOptions extends SpawnOptions {
  stdio?: 'pipe' | 'inherit' | 'ignore';
}

export class ProcessManager {
  private childProcess?: ChildProcess;
  private processExited: boolean = false;

  spawnProcess(command: string, options: ProcessSpawnOptions = {}): ChildProcess {
    // Set default options
    const spawnOptions: SpawnOptions = {
      stdio: 'pipe',
      shell: true,  // Use shell to handle complex commands
      ...options
    };

    // Reset state
    this.processExited = false;
    
    // Spawn the process using shell
    this.childProcess = spawn(command, [], spawnOptions);
    
    // Track when process exits
    this.childProcess.on('exit', () => {
      this.processExited = true;
    });
    
    this.childProcess.on('error', () => {
      this.processExited = true;
    });
    
    return this.childProcess;
  }

  async terminateProcess(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    if (!this.childProcess) {
      throw new Error('No process to terminate');
    }

    return new Promise((resolve, reject) => {
      if (!this.childProcess) {
        reject(new Error('No process to terminate'));
        return;
      }

      // Set up timeout for graceful termination
      const timeout = setTimeout(() => {
        if (this.childProcess && !this.childProcess.killed) {
          this.childProcess.kill('SIGKILL');
          reject(new Error('Process termination timeout, force killed'));
        }
      }, 5000);

      this.childProcess.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.childProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Send termination signal
      this.childProcess.kill(signal);
    });
  }

  forceKill(signal: NodeJS.Signals = 'SIGKILL'): Promise<void> {
    if (!this.childProcess) {
      throw new Error('No process to kill');
    }

    return new Promise((resolve, reject) => {
      if (!this.childProcess) {
        reject(new Error('No process to kill'));
        return;
      }

      this.childProcess.on('exit', () => {
        resolve();
      });

      this.childProcess.on('error', (error) => {
        reject(error);
      });

      this.childProcess.kill(signal);
    });
  }

  getProcessId(): number | undefined {
    return this.childProcess?.pid;
  }

  isRunning(): boolean {
    return this.childProcess ? !this.processExited : false;
  }
}