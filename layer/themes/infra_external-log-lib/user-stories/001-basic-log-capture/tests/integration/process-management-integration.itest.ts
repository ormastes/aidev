import { AIDevPlatform } from '../../src/application/aidev-platform';
import { ProcessManager } from '../../src/domain/process-manager';

describe('Process Management Integration Test', () => {
  let platform: AIDevPlatform;
  let processManager: ProcessManager;

  beforeEach(() => {
    platform = new AIDevPlatform();
    processManager = new ProcessManager();
  });

  afterEach(async () => {
    // Clean up any remaining processes
    await processManager.terminateAll();
  });

  it('should manage process lifecycle through integration', async () => {
    // Test process spawning and management
    const config = {
      command: 'node',
      args: ['-e', 'setTimeout(() => process.exit(0), 100)'],
      captureOutput: true
    };
    
    const processHandle = await processManager.spawn(config);
    
    // Verify process is running
    expect(processHandle.isRunning()).toBe(true);
    expect(processHandle.getPid()).toBeGreaterThan(0);
    
    // Wait for natural completion
    const exitCode = await processHandle.waitForExit();
    expect(exitCode).toBe(0);
    expect(processHandle.isRunning()).toBe(false);
  });

  it('should handle multiple concurrent processes', async () => {
    const processes = await Promise.all([
      processManager.spawn({
        command: 'node',
        args: ['-e', 'console.log("Process 1"); process.exit(0)'],
        captureOutput: true
      }),
      processManager.spawn({
        command: 'node',
        args: ['-e', 'console.log("Process 2"); process.exit(0)'],
        captureOutput: true
      }),
      processManager.spawn({
        command: 'node',
        args: ['-e', 'console.log("Process 3"); process.exit(0)'],
        captureOutput: true
      })
    ]);
    
    // All should be running initially
    expect(processes.every(p => p.isRunning())).toBe(true);
    
    // Get active process count
    expect(processManager.getActiveCount()).toBe(3);
    
    // Wait for all to complete
    const exitCodes = await Promise.all(
      processes.map(p => p.waitForExit())
    );
    
    expect(exitCodes).toEqual([0, 0, 0]);
    expect(processManager.getActiveCount()).toBe(0);
  });

  it('should handle process termination', async () => {
    // Long-running process
    const processHandle = await processManager.spawn({
      command: 'node',
      args: ['-e', 'setInterval(() => console.log("alive"), 1000)'],
      captureOutput: true
    });
    
    expect(processHandle.isRunning()).toBe(true);
    
    // Terminate the process
    const terminated = await processHandle.terminate();
    expect(terminated).toBe(true);
    expect(processHandle.isRunning()).toBe(false);
  });

  it('should integrate process management with log capture', async () => {
    // Test that process manager works with platform's log capture
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("[INFO] Managed process")'],
      captureOutput: true
    });
    
    // Get process handle from session
    const processHandle = session.getProcessHandle();
    expect(processHandle).toBeDefined();
    expect(processHandle!.isRunning()).toBe(true);
    
    await session.waitForCompletion();
    
    // Verify process In Progress and logs captured
    expect(processHandle!.isRunning()).toBe(false);
    const logs = session.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Managed process');
  });

  it('should handle process errors and crashes', async () => {
    const processHandle = await processManager.spawn({
      command: 'node',
      args: ['-e', 'throw new Error("Crash!")'],
      captureOutput: true
    });
    
    const exitCode = await processHandle.waitForExit();
    
    // Non-zero exit code for error
    expect(exitCode).not.toBe(0);
    expect(processHandle.isRunning()).toBe(false);
  });

  it('should track process resource usage', async () => {
    const processHandle = await processManager.spawn({
      command: 'node',
      args: ['-e', 'const arr = new Array(1000000); setTimeout(() => process.exit(0), 100)'],
      captureOutput: true
    });
    
    // Get resource info while running
    const resourcesBeforeExit = processHandle.getResourceUsage();
    expect(resourcesBeforeExit).toBeDefined();
    expect(resourcesBeforeExit.pid).toBe(processHandle.getPid());
    expect(resourcesBeforeExit.startTime).toBeInstanceOf(Date);
    expect(resourcesBeforeExit.duration).toBeUndefined(); // Still running
    
    await processHandle.waitForExit();
    
    // Get resource info after exit
    const resourcesAfterExit = processHandle.getResourceUsage();
    expect(resourcesAfterExit.duration).toBeDefined();
    expect(resourcesAfterExit.duration).toBeGreaterThan(0);
  });
});