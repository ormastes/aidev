import { ProcessManager, ProcessHandle } from '../../src/domain/process-manager';
import { ProcessSimulator } from '../../../../tests/utils/process-simulator';

describe('ProcessManager Unit Test', () => {
  let processManager: ProcessManager;

  beforeAll(async () => {
    await ProcessSimulator.ensureHelperScript();
  });

  afterAll(async () => {
    await ProcessSimulator.cleanup();
  });

  beforeEach(() => {
    processManager = new ProcessManager();
  });

  afterEach(async () => {
    // Clean up any remaining processes
    await processManager.terminateAll();
  });

  describe('spawn', () => {
    it('should create ProcessHandle when spawning process', async () => {
      const handle = await processManager.spawn({
        command: 'node',
        args: ['-e', 'console.log("test"); process.exit(0)'],
        captureOutput: true
      });

      expect(handle).toBeInstanceOf(ProcessHandle);
      expect(handle.getPid()).toBeGreaterThan(0);
      
      // Wait for process to complete
      await handle.waitForExit();
    });

    it('should track spawned process in activeProcesses', async () => {
      const handle = await processManager.spawn({
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 100)'],
        captureOutput: false
      });

      expect(processManager.getActiveCount()).toBe(1);
      
      await handle.waitForExit();
      expect(processManager.getActiveCount()).toBe(0);
    });

    it('should spawn multiple processes independently', async () => {
      const handle1 = await processManager.spawn({
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 200)'],
        captureOutput: true
      });

      const handle2 = await processManager.spawn({
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 200)'],
        captureOutput: true
      });

      expect(processManager.getActiveCount()).toBe(2);
      expect(handle1.getPid()).not.toBe(handle2.getPid());
      expect(handle1.getPid()).toBeGreaterThan(0);
      expect(handle2.getPid()).toBeGreaterThan(0);
      
      // Clean up
      await Promise.all([handle1.waitForExit(), handle2.waitForExit()]);
    });
  });

  describe('activeProcesses tracking', () => {
    it('should remove process from active list when it exits', async () => {
      const handle = await processManager.spawn({
        command: 'node',
        args: ['-e', 'process.exit(0)'],
        captureOutput: true
      });

      expect(processManager.getActiveCount()).toBe(1);

      // Wait for process to exit naturally
      await handle.waitForExit();

      expect(processManager.getActiveCount()).toBe(0);
    });

    it('should handle multiple process exits correctly', async () => {
      // Create processes with different exit delays
      const handles = await Promise.all([
        processManager.spawn({ 
          command: 'node', 
          args: ['-e', 'setTimeout(() => process.exit(0), 100)'], 
          captureOutput: true 
        }),
        processManager.spawn({ 
          command: 'node', 
          args: ['-e', 'setTimeout(() => process.exit(0), 200)'], 
          captureOutput: true 
        }),
        processManager.spawn({ 
          command: 'node', 
          args: ['-e', 'setTimeout(() => process.exit(1), 150)'], 
          captureOutput: true 
        })
      ]);

      expect(processManager.getActiveCount()).toBe(3);

      // Wait for first process to exit
      await handles[0].waitForExit();
      expect(processManager.getActiveCount()).toBe(2);

      // Wait for third process to exit
      await handles[2].waitForExit();
      expect(processManager.getActiveCount()).toBe(1);

      // Wait for second process to exit
      await handles[1].waitForExit();
      expect(processManager.getActiveCount()).toBe(0);
    });
  });

  describe("getActiveCount", () => {
    it('should return 0 for new ProcessManager', () => {
      expect(processManager.getActiveCount()).toBe(0);
    });

    it('should clean up processes that report as not running', async () => {
      // Create a process that exits quickly
      const handle = await processManager.spawn({
        command: 'node',
        args: ['-e', 'process.exit(0)'],
        captureOutput: true
      });

      expect(processManager.getActiveCount()).toBe(1);

      // Wait for process to exit
      await handle.waitForExit();
      
      // Process should no longer be running
      expect(handle.isRunning()).toBe(false);
      
      // getActiveCount should reflect the dead process was removed
      expect(processManager.getActiveCount()).toBe(0);
    });
  });

  describe("terminateAll", () => {
    it('should terminate all active processes', async () => {
      // Create multiple long-running processes
      const handles = await Promise.all([
        processManager.spawn({
          command: 'node',
          args: ['-e', 'setInterval(() => {}, 1000)'],
          captureOutput: true
        }),
        processManager.spawn({
          command: 'node',
          args: ['-e', 'setInterval(() => {}, 1000)'],
          captureOutput: true
        }),
        processManager.spawn({
          command: 'node',
          args: ['-e', 'setInterval(() => {}, 1000)'],
          captureOutput: true
        })
      ]);

      expect(processManager.getActiveCount()).toBe(3);

      // Terminate all processes
      await processManager.terminateAll();

      // Verify all processes were terminated
      expect(processManager.getActiveCount()).toBe(0);
      
      // Verify processes are no longer running
      handles.forEach(handle => {
        expect(handle.isRunning()).toBe(false);
      });
    });

    it('should handle empty process list', async () => {
      expect(processManager.getActiveCount()).toBe(0);
      
      // Should not throw
      await processManager.terminateAll();
      
      expect(processManager.getActiveCount()).toBe(0);
    });

    it('should wait for all terminations to complete', async () => {
      // Create long-running processes
      const handles = await Promise.all([
        processManager.spawn({
          command: 'node',
          args: ['-e', 'setInterval(() => {}, 10000)'],
          captureOutput: true
        }),
        processManager.spawn({
          command: 'node',
          args: ['-e', 'setInterval(() => {}, 10000)'],
          captureOutput: true
        }),
        processManager.spawn({
          command: 'node',
          args: ['-e', 'setInterval(() => {}, 10000)'],
          captureOutput: true
        })
      ]);

      expect(processManager.getActiveCount()).toBe(3);

      // Verify all processes are running
      handles.forEach(handle => {
        expect(handle.isRunning()).toBe(true);
      });

      await processManager.terminateAll();
      
      // All processes should be terminated
      expect(processManager.getActiveCount()).toBe(0);
      
      // Verify all processes have stopped
      handles.forEach(handle => {
        expect(handle.isRunning()).toBe(false);
      });
    });
  });

  describe('process removal on exit', () => {
    it('should automatically remove process from active list on exit', async () => {
      const handle = await processManager.spawn({
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 50)'],
        captureOutput: true
      });

      // Verify process is tracked
      expect(processManager.getActiveCount()).toBe(1);

      // Wait for process to exit naturally
      await handle.waitForExit();

      // Verify process was removed
      expect(processManager.getActiveCount()).toBe(0);
    });
  });
});