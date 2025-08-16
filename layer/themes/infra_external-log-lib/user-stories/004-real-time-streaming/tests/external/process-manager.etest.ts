import { ProcessManager } from '../../src/external/process-manager';
import { ChildProcess } from 'child_process';

describe('ProcessManager Process Lifecycle Management External Test', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    processManager = new ProcessManager();
  });

  afterEach(async () => {
    // Clean up any running processes
    if (processManager.isRunning()) {
      try {
        await processManager.forceKill('SIGKILL');
      } catch (error) {
        // Process may already be terminated
      }
    }
  });

  it('should spawn a simple process In Progress', async () => {
    const command = 'node -e "console.log(\'spawned process\')"';
    
    const childProcess = processManager.spawnProcess(command);
    
    expect(childProcess).toBeInstanceOf(ChildProcess);
    expect(processManager.getProcessId()).toBeDefined();
    expect(processManager.getProcessId()).toBeGreaterThan(0);
    expect(processManager.isRunning()).toBe(true);

    // Wait for process to complete
    await new Promise((resolve) => {
      childProcess.on('exit', resolve);
    });

    expect(processManager.isRunning()).toBe(false);
  });

  it('should spawn process with custom options', async () => {
    const command = 'node -e "console.log(\'custom options\')"';
    const options = {
      stdio: 'pipe' as const,
      shell: true
    };
    
    const childProcess = processManager.spawnProcess(command, options);
    
    expect(childProcess).toBeInstanceOf(ChildProcess);
    expect(childProcess.stdio).toBeDefined();
    expect(processManager.isRunning()).toBe(true);

    // Wait for process to complete
    await new Promise((resolve) => {
      childProcess.on('exit', resolve);
    });
  });

  it('should handle long-running process lifecycle', async () => {
    const command = 'node -e "setInterval(() => console.log(\'running\'), 100)"';
    
    const childProcess = processManager.spawnProcess(command);
    
    expect(childProcess).toBeInstanceOf(ChildProcess);
    expect(processManager.isRunning()).toBe(true);
    expect(processManager.getProcessId()).toBeDefined();

    // Let it run for a short time
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(processManager.isRunning()).toBe(true);

    // Terminate the process
    await processManager.terminateProcess('SIGTERM');
    
    expect(processManager.isRunning()).toBe(false);
  });

  it('should terminate process gracefully with SIGTERM', async () => {
    const command = `node -e "
      process.on('SIGTERM', () => {
        console.log('received SIGTERM');
        process.exit(0);
      });
      setInterval(() => console.log("heartbeat"), 50);
    "`;
    
    const childProcess = processManager.spawnProcess(command);
    let exitCode: number | null = null;
    let exitSignal: NodeJS.Signals | null = null;

    childProcess.on('exit', (code, signal) => {
      exitCode = code;
      exitSignal = signal;
    });

    // Let it run briefly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(processManager.isRunning()).toBe(true);

    // Terminate gracefully
    await processManager.terminateProcess('SIGTERM');
    
    expect(processManager.isRunning()).toBe(false);
    // Exit code may be null for killed processes, which is acceptable
    expect([0, null]).toContain(exitCode);
    expect([null, 'SIGTERM']).toContain(exitSignal);
  });

  it('should force kill process with SIGKILL', async () => {
    const command = `node -e "
      // Ignore SIGTERM to test force kill
      process.on('SIGTERM', () => {
        console.log('ignoring SIGTERM');
      });
      setInterval(() => console.log('running'), 50);
    "`;
    
    const childProcess = processManager.spawnProcess(command);
    let exitSignal: NodeJS.Signals | null = null;

    childProcess.on('exit', (_code, signal) => {
      exitSignal = signal;
    });
    
    expect(childProcess).toBeInstanceOf(ChildProcess);

    // Let it run briefly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(processManager.isRunning()).toBe(true);

    // Force kill
    await processManager.forceKill('SIGKILL');
    
    expect(processManager.isRunning()).toBe(false);
    expect(exitSignal).toBe('SIGKILL');
  });

  it('should handle termination timeout and force kill', async () => {
    const command = 'node -e "setInterval(() => console.log(\'running\'), 50)"';
    
    const childProcess = processManager.spawnProcess(command);
    
    expect(childProcess).toBeInstanceOf(ChildProcess);
    
    // Let it run briefly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(processManager.isRunning()).toBe(true);

    // Test force termination
    const startTime = Date.now();
    await processManager.terminateProcess('SIGTERM');
    const duration = Date.now() - startTime;
    
    expect(processManager.isRunning()).toBe(false);
    // Should terminate reasonably quickly (either gracefully or by force)
    expect(duration).toBeLessThan(10000);
  });

  it('should handle process that exits immediately', async () => {
    const command = 'node -e "process.exit(42)"';
    
    const childProcess = processManager.spawnProcess(command);
    let exitCode: number | null = null;

    childProcess.on('exit', (code) => {
      exitCode = code;
    });

    // Wait for process to exit
    await new Promise((resolve) => {
      if (!processManager.isRunning()) {
        resolve(undefined);
        return;
      }
      childProcess.on('exit', resolve);
      // Fallback timeout
      setTimeout(resolve, 1000);
    });
    
    expect(processManager.isRunning()).toBe(false);
    expect(exitCode).toBe(42);
  });

  it('should handle process that crashes', async () => {
    const command = 'node -e "throw new Error(\'crash test\')"';
    
    const childProcess = processManager.spawnProcess(command);
    let exitCode: number | null = null;

    childProcess.on('exit', (code) => {
      exitCode = code;
    });

    // Wait for process to crash
    await new Promise((resolve) => {
      if (!processManager.isRunning()) {
        resolve(undefined);
        return;
      }
      childProcess.on('exit', resolve);
      setTimeout(resolve, 1000); // Fallback timeout
    });
    
    expect(processManager.isRunning()).toBe(false);
    expect(exitCode).not.toBe(0); // Should exit with error code
  });

  it('should handle multiple process instances sequentially', async () => {
    // First process
    const command1 = 'node -e "console.log(\'process 1\')"';
    const childProcess1 = processManager.spawnProcess(command1);
    const pid1 = processManager.getProcessId();
    
    expect(processManager.isRunning()).toBe(true);
    
    await new Promise((resolve) => {
      childProcess1.on('exit', resolve);
    });
    
    expect(processManager.isRunning()).toBe(false);

    // Second process
    const command2 = 'node -e "console.log(\'process 2\')"';
    const childProcess2 = processManager.spawnProcess(command2);
    const pid2 = processManager.getProcessId();
    
    expect(processManager.isRunning()).toBe(true);
    expect(pid2).not.toBe(pid1); // Different process
    
    await new Promise((resolve) => {
      childProcess2.on('exit', resolve);
    });
    
    expect(processManager.isRunning()).toBe(false);
  });

  it('should handle complex commands with arguments and quotes', async () => {
    const command = `node -e "
      const message = process.env.TEST_MESSAGE || 'default';
      console.log('Message: ' + message);
      process.exit(0);
    "`;
    
    // Use environment variable instead of command line argument
    const options = {
      env: { ...process.env, TEST_MESSAGE: 'complex argument' }
    };
    
    const childProcess = processManager.spawnProcess(command, options);
    const outputChunks: Buffer[] = [];

    childProcess.stdout?.on('data', (chunk) => {
      outputChunks.push(chunk);
    });

    await new Promise((resolve) => {
      childProcess.on('exit', resolve);
    });
    
    const output = outputChunks.map(chunk => chunk.toString()).join('');
    expect(output).toContain('Message: complex argument');
    expect(processManager.isRunning()).toBe(false);
  });

  it('should handle invalid commands gracefully', async () => {
    const command = 'nonexistent-command-12345';
    
    let spawnError: Error | null = null;
    
    try {
      const childProcess = processManager.spawnProcess(command);
      
      // Listen for spawn error
      childProcess.on('error', (error) => {
        spawnError = error;
      });

      // Wait for error
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      spawnError = error as Error;
    }
    
    expect(spawnError).toBeDefined();
    expect(processManager.isRunning()).toBe(false);
  });

  it('should handle termination when no process is running', async () => {
    // No process spawned yet
    expect(processManager.isRunning()).toBe(false);
    
    try {
      await processManager.terminateProcess('SIGTERM');
      expect(true).toBe(false); // Should throw error
    } catch (error) {
      expect((error as Error).message).toContain('No process to terminate');
    }

    try {
      await processManager.forceKill('SIGKILL');
      expect(true).toBe(false); // Should throw error
    } catch (error) {
      expect((error as Error).message).toContain('No process to kill');
    }
  });

  it('should provide accurate process status information', async () => {
    // Initially no process
    expect(processManager.isRunning()).toBe(false);
    expect(processManager.getProcessId()).toBeUndefined();

    // Spawn a long-running process
    const command = 'node -e "setInterval(() => {}, 100)"';
    const childProcess = processManager.spawnProcess(command);
    
    expect(childProcess).toBeInstanceOf(ChildProcess);
    expect(processManager.isRunning()).toBe(true);
    expect(processManager.getProcessId()).toBeDefined();
    expect(typeof processManager.getProcessId()).toBe('number');

    // Terminate and check status
    await processManager.terminateProcess('SIGTERM');
    
    expect(processManager.isRunning()).toBe(false);
    // PID may still be available even after termination
  });

  it('should handle rapid spawn and terminate cycles', async () => {
    const cycles = 3;
    
    for (let i = 0; i < cycles; i++) {
      const command = `node -e "
        setInterval(() => console.log('cycle ${i}'), 50);
      "`;
      
      const childProcess = processManager.spawnProcess(command);
      expect(childProcess).toBeInstanceOf(ChildProcess);
      expect(processManager.isRunning()).toBe(true);
      
      // Let it run briefly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Terminate
      await processManager.terminateProcess('SIGTERM');
      expect(processManager.isRunning()).toBe(false);
      
      // Brief pause between cycles
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });
});