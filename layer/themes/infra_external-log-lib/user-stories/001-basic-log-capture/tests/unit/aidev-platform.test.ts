import { AIDevPlatform, LogCaptureSession } from '../../src/application/aidev-platform';
import { ProcessConfig } from '../../src/application/aidev-platform';
import { ProcessSimulator } from '../../../../tests/utils/process-simulator';

describe('AIDevPlatform Unit Test', () => {
  let platform: AIDevPlatform;

  beforeAll(async () => {
    await ProcessSimulator.ensureHelperScript();
  });

  afterAll(async () => {
    await ProcessSimulator.cleanup();
  });

  beforeEach(() => {
    platform = new AIDevPlatform();
  });

  afterEach(async () => {
    // Clean up any remaining processes
    const processManager = (platform as any).processManager;
    if (processManager) {
      await processManager.terminateAll();
    }
  });

  describe('startLogCapture', () => {
    it('should create LogCaptureSession with process', async () => {
      const config: ProcessConfig = {
        command: 'node',
        args: ['-e', 'console.log("test"); process.exit(0)'],
        captureOutput: true
      };

      const session = await platform.startLogCapture(config);

      expect(session).toBeInstanceOf(LogCaptureSession);
      
      // Wait for process to complete
      const result = await session.waitForCompletion();
      expect(result.exitCode).toBe(0);
    });

    it('should attach ProcessHandle to session', async () => {
      const config: ProcessConfig = {
        command: 'node',
        args: ['-e', 'setTimeout(() => { console.log("test"); process.exit(0); }, 100)'],
        captureOutput: true
      };

      const session = await platform.startLogCapture(config);
      const handle = session.getProcessHandle();

      expect(handle).toBeDefined();
      expect(handle?.getPid()).toBeGreaterThan(0);
      expect(handle?.isRunning()).toBe(true);
      
      // Wait for process to complete
      await session.waitForCompletion();
      expect(handle?.isRunning()).toBe(false);
    });

    it('should track process lifecycle', async () => {
      const config: ProcessConfig = {
        command: 'node',
        args: ['-e', 'console.log("test"); setTimeout(() => process.exit(0), 50)'],
        captureOutput: true
      };

      const session = await platform.startLogCapture(config);
      const handle = session.getProcessHandle();

      expect(handle?.isRunning()).toBe(true);

      // Wait for natural process exit
      const result = await session.waitForCompletion();
      expect(result.exitCode).toBe(0);
      expect(handle?.isRunning()).toBe(false);
    });
  });

  describe('configuration passing', () => {
    it('should handle captureOutput flag', async () => {
      const config: ProcessConfig = {
        command: 'node',
        args: ['-e', 'console.log("test output"); process.exit(0)'],
        captureOutput: true
      };

      const session = await platform.startLogCapture(config);
      
      // Wait for process to complete
      await session.waitForCompletion();
      
      // Should have captured the output
      const logs = session.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toBe('test output');
    });

    it('should not start capture when captureOutput is false', async () => {
      const config: ProcessConfig = {
        command: 'node',
        args: ['-e', 'console.log("test"); process.exit(0)'],
        captureOutput: false
      };

      const session = await platform.startLogCapture(config);
      
      // Wait for process to complete
      await session.waitForCompletion();
      
      // Should not have captured any output
      const logs = session.getLogs();
      expect(logs).toHaveLength(0);
    });

    it('should create independent sessions for multiple captures', async () => {
      const config1: ProcessConfig = {
        command: 'node',
        args: ['-e', 'console.log("test1"); process.exit(0)'],
        captureOutput: true
      };

      const config2: ProcessConfig = {
        command: 'node',
        args: ['-e', 'console.log("test2"); process.exit(0)'],
        captureOutput: true
      };

      const session1 = await platform.startLogCapture(config1);
      const session2 = await platform.startLogCapture(config2);

      expect(session1).not.toBe(session2);
      
      // Wait for both to complete
      await Promise.all([
        session1.waitForCompletion(),
        session2.waitForCompletion()
      ]);
      
      // Each should have its own logs
      const logs1 = session1.getLogs();
      const logs2 = session2.getLogs();
      
      expect(logs1[0].message).toBe('test1');
      expect(logs2[0].message).toBe('test2');
    });
  });
});