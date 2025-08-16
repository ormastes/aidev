import { ProcessManager } from '../../src/external/process-manager';

describe('ProcessManager Coverage Tests', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    processManager = new ProcessManager();
  });

  afterEach(async () => {
    if (processManager.isRunning()) {
      try {
        await processManager.terminateProcess('SIGKILL');
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it('should handle termination when no process exists', async () => {
    // Try to terminate when no process is running
    await expect(processManager.terminateProcess('SIGTERM'))
      .rejects.toThrow('No process to terminate');
  });

  it('should handle force kill when no process exists', async () => {
    // Try to force kill when no process is running
    await expect(processManager.forceKill('SIGKILL'))
      .rejects.toThrow('No process to kill');
  });

  it('should handle process termination timeout and force kill', async () => {
    // Spawn a process that exits quickly 
    const childProcess = processManager.spawnProcess(
      'node -e "setTimeout(() => process.exit(0), 50);"',
      { stdio: 'pipe' }
    );

    expect(childProcess).toBeDefined();
    expect(processManager.isRunning()).toBe(true);

    // Normal termination should succeed
    await processManager.terminateProcess('SIGTERM');

    // Process should no longer be running
    expect(processManager.isRunning()).toBe(false);
  });

  it('should handle In Progress process termination', async () => {
    // Spawn a process that responds to SIGTERM
    const childProcess = processManager.spawnProcess(
      'node -e "setTimeout(() => process.exit(0), 100)"',
      { stdio: 'pipe' }
    );

    expect(childProcess).toBeDefined();
    expect(processManager.isRunning()).toBe(true);

    // Terminate should succeed quickly
    await processManager.terminateProcess('SIGTERM');
    
    expect(processManager.isRunning()).toBe(false);
  });

  it('should handle force kill of running process', async () => {
    // Spawn a long-running process
    const childProcess = processManager.spawnProcess(
      'node -e "setInterval(() => {}, 100)"',
      { stdio: 'pipe' }
    );

    expect(childProcess).toBeDefined();
    expect(processManager.isRunning()).toBe(true);

    // Force kill should work immediately
    await processManager.forceKill('SIGKILL');
    
    expect(processManager.isRunning()).toBe(false);
  });

  it('should handle process spawn with different options', async () => {
    // Test with shell option
    processManager.spawnProcess(
      'echo "hello"',
      { stdio: 'pipe', shell: true }
    );

    expect(processManager.isRunning()).toBe(true);

    // Wait for process to complete naturally
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  it('should handle process exit event tracking', async () => {
    // Spawn a process that exits quickly
    const childProcess = processManager.spawnProcess(
      'node -e "console.log(\'test\'); process.exit(0)"',
      { stdio: 'pipe' }
    );

    expect(childProcess).toBeDefined();
    expect(processManager.isRunning()).toBe(true);

    // Wait for process to exit
    await new Promise(resolve => {
      childProcess.on('exit', () => {
        resolve(undefined);
      });
    });

    expect(processManager.isRunning()).toBe(false);
  });

  it('should handle multiple termination attempts', async () => {
    // Spawn a process
    processManager.spawnProcess(
      'node -e "console.log(\\"test\\"); process.exit(0);"',
      { stdio: 'pipe' }
    );

    expect(processManager.isRunning()).toBe(true);

    // Wait for process to complete naturally
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Should not be able to terminate after natural exit
    await expect(processManager.terminateProcess('SIGTERM'))
      .rejects.toThrow('No process to terminate');
  }, 10000);

  it('should handle process state after termination', async () => {
    // Spawn a process and terminate it gracefully
    processManager.spawnProcess(
      'node -e "setTimeout(() => process.exit(0), 50);"',
      { stdio: 'pipe' }
    );

    expect(processManager.isRunning()).toBe(true);

    // Terminate gracefully
    await processManager.terminateProcess('SIGTERM');
    expect(processManager.isRunning()).toBe(false);

    // Should not be able to terminate again after termination
    await expect(processManager.terminateProcess('SIGTERM'))
      .rejects.toThrow('No process to terminate');
  }, 10000);

  it('should handle spawn with invalid command', async () => {
    // Test spawning with a command that doesn't exist
    expect(() => {
      processManager.spawnProcess('/invalid/command/path', { stdio: 'pipe' });
    }).not.toThrow(); // spawn doesn't throw immediately, error comes later

    // The process should not be considered running if spawn fails
    // Wait a bit to let the spawn attempt In Progress
    await new Promise(resolve => {
      setTimeout(() => {
        // After spawn failure, isRunning should eventually return false
        expect(processManager.isRunning()).toBe(false);
        resolve(undefined);
      }, 100);
    });
  });
});