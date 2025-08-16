import { PythonLogPlatform } from '../../src/application/python-log-platform';
import { ProcessSimulator } from '../../../../tests/utils/process-simulator';

describe("PythonLogPlatform", () => {
  let platform: PythonLogPlatform;

  beforeAll(async () => {
    await ProcessSimulator.ensureHelperScript();
  });

  afterAll(async () => {
    await ProcessSimulator.cleanup();
  });

  beforeEach(() => {
    platform = new PythonLogPlatform();
  });

  afterEach(async () => {
    // Clean up any remaining processes
    const processManager = (platform as any).processManager;
    if (processManager) {
      await processManager.terminateAll();
    }
  });

  describe("startPythonLogCapture", () => {
    it('should create a log capture session with Python configuration', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("Python test"); process.exit(0)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);

      expect(session).toBeDefined();
      expect(session.waitForCompletion).toBeDefined();
      expect(session.getLogs).toBeDefined();
      expect(session.getFormattedLogs).toBeDefined();
      expect(session.saveLogsToFile).toBeDefined();
      expect(session.onLogEntry).toBeDefined();
      expect(session.getProcessHandle).toBeDefined();
      
      // Wait for completion
      await session.waitForCompletion();
    });

    it('should override python command with python3', async () => {
      // Mock the spawn to avoid calling python3
      const mockProcess = await ProcessSimulator.spawn({
        stdout: ['Python script output'],
        exitCode: 0,
        exitDelay: 100
      });
      
      const spawnSpy = jest.spyOn(require('child_process'), 'spawn').mockReturnValue(mockProcess);
      
      const config = {
        command: 'python',
        args: ['script.py'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);

      expect(spawnSpy).toHaveBeenCalledWith('python3', ['script.py']);
      
      // Wait for completion and clean up
      await session.waitForCompletion();
      spawnSpy.mockRestore();
    });

    it('should not override non-python commands', async () => {
      const spawnSpy = jest.spyOn(require('child_process'), 'spawn');
      
      const config = {
        command: 'node',
        args: ['-e', 'process.exit(0)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);

      expect(spawnSpy).toHaveBeenCalledWith('node', ['-e', 'process.exit(0)']);
      
      // Clean up
      spawnSpy.mockRestore();
      await session.waitForCompletion();
    });

    it('should preserve other config properties', async () => {
      // Mock the spawn
      const mockProcess = await ProcessSimulator.spawn({
        stdout: ['Python 3.9.0'],
        exitCode: 0,
        exitDelay: 100
      });
      
      const spawnSpy = jest.spyOn(require('child_process'), 'spawn').mockReturnValue(mockProcess);
      
      const config = {
        command: 'python',
        args: ['--version'],
        captureOutput: false,
        env: { PYTHONPATH: '/custom/path' }
      };

      const session = await platform.startPythonLogCapture(config);

      // Verify spawn was called correctly
      expect(spawnSpy).toHaveBeenCalledWith('python3', ['--version']);
      
      // Verify captureOutput is respected (no logs should be captured)
      const logs = session.getLogs();
      expect(logs).toHaveLength(0);
      
      // Wait for completion and clean up
      await session.waitForCompletion();
      spawnSpy.mockRestore();
    });

    it('should handle python3 command without override', async () => {
      // Mock the spawn
      const mockProcess = await ProcessSimulator.spawn({
        stdout: ['Test output'],
        exitCode: 0,
        exitDelay: 100
      });
      
      const spawnSpy = jest.spyOn(require('child_process'), 'spawn').mockReturnValue(mockProcess);
      
      const config = {
        command: 'python3',
        args: ['test.py'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);

      expect(spawnSpy).toHaveBeenCalledWith('python3', ['test.py']);
      
      // Wait for completion and clean up
      await session.waitForCompletion();
      spawnSpy.mockRestore();
    });

    it('should handle python3.x commands without override', async () => {
      // Mock the spawn to avoid calling non-existent python3.11
      const mockProcess = await ProcessSimulator.spawn({
        stdout: ['Python 3.11.0'],
        exitCode: 0,
        exitDelay: 100
      });
      
      const spawnSpy = jest.spyOn(require('child_process'), 'spawn').mockReturnValue(mockProcess);
      
      const config = {
        command: 'python3.11',
        args: ['test.py'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);

      expect(spawnSpy).toHaveBeenCalledWith('python3.11', ['test.py']);
      
      // Wait for completion and clean up
      await session.waitForCompletion();
      spawnSpy.mockRestore();
    });

    it('should create ProcessManager instance', () => {
      const newPlatform = new PythonLogPlatform();
      
      // ProcessManager should exist
      expect((newPlatform as any).processManager).toBeDefined();
    });

    it('should return session immediately without waiting for process', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 1000)'],
        captureOutput: true
      };

      // Session should be returned immediately
      const startTime = Date.now();
      const session = await platform.startPythonLogCapture(config);
      const duration = Date.now() - startTime;

      expect(session).toBeDefined();
      expect(duration).toBeLessThan(100); // Should return quickly
      
      // Process should still be running
      const handle = session.getProcessHandle();
      expect(handle?.isRunning()).toBe(true);
      
      // Clean up
      if (handle) {
        await handle.terminate();
      }
    });

    it('should handle empty args array', async () => {
      // Mock the spawn
      const mockProcess = await ProcessSimulator.spawn({
        stdout: ['>>>'],
        exitCode: 0,
        exitDelay: 100
      });
      
      const spawnSpy = jest.spyOn(require('child_process'), 'spawn').mockReturnValue(mockProcess);
      
      const config = {
        command: 'python',
        args: [],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);

      expect(spawnSpy).toHaveBeenCalledWith('python3', []);
      
      // Wait for completion and clean up
      await session.waitForCompletion();
      spawnSpy.mockRestore();
    });

    it('should handle undefined args', async () => {
      // Mock the spawn
      const mockProcess = await ProcessSimulator.spawn({
        stdout: ['>>>'],
        exitCode: 0,
        exitDelay: 100
      });
      
      const spawnSpy = jest.spyOn(require('child_process'), 'spawn').mockReturnValue(mockProcess);
      
      const config = {
        command: 'python',
        captureOutput: true
      } as any; // Cast to bypass TypeScript check

      const session = await platform.startPythonLogCapture(config);

      expect(spawnSpy).toHaveBeenCalledWith('python3', undefined);
      
      // Wait for completion and clean up
      await session.waitForCompletion();
      spawnSpy.mockRestore();
    });
  });
});