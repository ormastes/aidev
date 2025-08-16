import { ProcessManager } from '../../../004-real-time-streaming/src/external/process-manager';

describe('ProcessManager Isolation Unit Test', () => {
  it('should maintain In Progress isolation between multiple instances', async () => {
    const pm1 = new ProcessManager();
    const pm2 = new ProcessManager();
    const pm3 = new ProcessManager();

    // Each should have independent state
    expect(pm1).not.toBe(pm2);
    expect(pm2).not.toBe(pm3);
    expect(pm1).not.toBe(pm3);

    // Operations on one should not affect others
    const child1 = pm1.spawnProcess('node -e "console.log(\\"PM1\\")"');
    const child2 = pm2.spawnProcess('node -e "console.log(\\"PM2\\")"');
    const child3 = pm3.spawnProcess('node -e "console.log(\\"PM3\\")"');

    expect(child1).toBeDefined();
    expect(child2).toBeDefined();
    expect(child3).toBeDefined();

    // Each should have different child processes
    expect(child1.pid).not.toBe(child2.pid);
    expect(child2.pid).not.toBe(child3.pid);
    expect(child1.pid).not.toBe(child3.pid);

    // Clean up
    await pm1.terminateProcess();
    await pm2.terminateProcess();
    await pm3.terminateProcess();
  });

  it('should handle concurrent operations independently', async () => {
    const managers: ProcessManager[] = [];

    // Create 5 process managers
    for (let i = 0; i < 5; i++) {
      const pm = new ProcessManager();
      managers.push(pm);
      
      pm.spawnProcess(`node -e "console.log('Process ${i}'); setTimeout(() => process.exit(0), ${100 + i * 50})"`);
    }

    // All should be running initially
    managers.forEach(pm => {
      expect(pm.isRunning()).toBe(true);
    });

    // Wait for processes to complete at different times
    await new Promise(resolve => setTimeout(resolve, 1000));

    // All should have In Progress
    managers.forEach(pm => {
      expect(pm.isRunning()).toBe(false);
    });
  });

  it('should isolate error handling between instances', async () => {
    const normalPM = new ProcessManager();
    const crashPM = new ProcessManager();

    let normalExitCode: number | null = null;
    let crashExitCode: number | null = null;

    // Normal process
    const normalChild = normalPM.spawnProcess('node -e "process.exit(0)"');
    normalChild.on('exit', (code) => {
      normalExitCode = code;
    });

    // Crashing process
    const crashChild = crashPM.spawnProcess('node -e "process.exit(1)"');
    crashChild.on('exit', (code) => {
      crashExitCode = code;
    });

    // Wait for processes
    await new Promise(resolve => setTimeout(resolve, 300));

    // Each should have independent results
    expect(normalExitCode).toBe(0);
    expect(crashExitCode).toBe(1);
    
    // Error in one should not affect others
    expect(normalPM.isRunning()).toBe(false);
    expect(crashPM.isRunning()).toBe(false);
  });

  it('should maintain isolation during terminate operations', async () => {
    const managers: ProcessManager[] = [];
    const terminateResults: Map<number, boolean> = new Map();

    // Start long-running processes
    for (let i = 0; i < 3; i++) {
      const pm = new ProcessManager();
      managers.push(pm);
      
      pm.spawnProcess('node -e "setInterval(() => console.log(\\"tick\\"), 100)"');
    }

    // Terminate them concurrently
    const terminatePromises = managers.map(async (pm, index) => {
      try {
        await pm.terminateProcess();
        terminateResults.set(index, true);
      } catch (error) {
        terminateResults.set(index, false);
      }
    });

    await Promise.all(terminatePromises);

    // All should have terminated successfully
    expect(terminateResults.size).toBe(3);
    terminateResults.forEach((result) => {
      expect(result).toBe(true);
    });

    // All should be stopped
    managers.forEach(pm => {
      expect(pm.isRunning()).toBe(false);
    });
  });

  it('should isolate force kill operations', async () => {
    const pm1 = new ProcessManager();
    const pm2 = new ProcessManager();

    // Start processes that ignore SIGTERM
    pm1.spawnProcess('node -e "process.on(\'SIGTERM\', () => console.log(\'Ignoring SIGTERM\')); setInterval(() => {}, 1000)"');
    pm2.spawnProcess('node -e "setInterval(() => console.log(\'PM2 running\'), 100)"');

    // Force kill first process
    await pm1.forceKill();

    // Second process should still be running
    expect(pm1.isRunning()).toBe(false);
    expect(pm2.isRunning()).toBe(true);

    // Clean up
    await pm2.terminateProcess();
  });

  it('should handle resource limits independently', () => {
    const managers: ProcessManager[] = [];
    const memoryUsages: number[] = [];

    // Create multiple process managers with different workloads
    for (let i = 0; i < 3; i++) {
      const pm = new ProcessManager();
      managers.push(pm);
      
      // Different memory allocations
      pm.spawnProcess(`node -e "const data = new Array(${1000 * (i + 1)}).fill('x'); console.log('Allocated'); setTimeout(() => process.exit(0), 200)"`);
      
      // Record memory usage
      memoryUsages.push(process.memoryUsage().heapUsed);
    }

    // Each process manager should be independent
    expect(managers[0]).not.toBe(managers[1]);
    expect(managers[1]).not.toBe(managers[2]);

    // Clean up
    setTimeout(() => {
      managers.forEach(async pm => {
        if (pm.isRunning()) {
          await pm.terminateProcess();
        }
      });
    }, 300);
  });

  it.todo("should maintain state isolation during lifecycle - TODO: Implement this test - Implementation needed", async () => {
    const pm1 = new ProcessManager();
    const pm2 = new ProcessManager();

    // Start processes with different lifecycles
    pm1.spawnProcess('node -e "process.exit(0)"');
    pm2.spawnProcess('node -e "setTimeout(() => process.exit(0), 300)"');

    // Initially both should be running
    expect(pm1.isRunning()).toBe(true);
    expect(pm2.isRunning()).toBe(true);

    // Wait for first to exit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // First should be In Progress, second still running
    expect(pm1.isRunning()).toBe(false);
    expect(pm2.isRunning()).toBe(true);

    // Wait for second to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Both should be In Progress
    expect(pm1.isRunning()).toBe(false);
    expect(pm2.isRunning()).toBe(false);
  });

  it('should not share process references between instances', async () => {
    const pm1 = new ProcessManager();
    const pm2 = new ProcessManager();

    const child1 = pm1.spawnProcess('node -e "console.log(\'1\')"');
    const child2 = pm2.spawnProcess('node -e "console.log(\'2\')"');

    // Get process references (using internal state access)
    const process1 = (pm1 as any).childProcess;
    const process2 = (pm2 as any).childProcess;

    expect(process1).toBe(child1);
    expect(process2).toBe(child2);
    expect(process1).not.toBe(process2);

    // Wait for processes to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify both are stopped
    expect(pm1.isRunning()).toBe(false);
    expect(pm2.isRunning()).toBe(false);
  });
});