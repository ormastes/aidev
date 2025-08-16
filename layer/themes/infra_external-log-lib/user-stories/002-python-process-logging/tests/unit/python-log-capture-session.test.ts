import { PythonLogPlatform } from '../../src/application/python-log-platform';
import { spawn } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'os';
import { ProcessSimulator } from '../../../../tests/utils/process-simulator';

describe("PythonLogCaptureSession", () => {
  let platform: PythonLogPlatform;
  let tempDir: string;

  beforeAll(async () => {
    await ProcessSimulator.ensureHelperScript();
  });

  afterAll(async () => {
    await ProcessSimulator.cleanup();
  });

  beforeEach(async () => {
    platform = new PythonLogPlatform();
    // Create a unique temp directory for each test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'python-log-test-'));
  });

  afterEach(async () => {
    // Clean up any remaining processes
    const processManager = (platform as any).processManager;
    if (processManager) {
      await processManager.terminateAll();
    }
    // Clean up temp directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Process Lifecycle', () => {
    it('should spawn process with correct command and args', async () => {
      const spawnSpy = jest.spyOn(require('child_process'), 'spawn');
      
      const config = {
        command: 'python',
        args: ['test.py', '--verbose'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);

      expect(spawnSpy).toHaveBeenCalledWith('python3', ['test.py', '--verbose']);
      
      // Clean up
      spawnSpy.mockRestore();
      const handle = session.getProcessHandle();
      if (handle) {
        await handle.terminate();
      }
    });

    it('should handle process completion', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("Python simulation"); process.exit(0)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      const result = await session.waitForCompletion();
      expect(result).toEqual({ exitCode: 0 });
    });

    it('should handle process failure', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.error("Python error"); process.exit(1)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      const result = await session.waitForCompletion();
      expect(result).toEqual({ exitCode: 1 });
    });

    it('should handle null exit code', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'setInterval(() => {}, 1000)'], // Long running
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      const handle = session.getProcessHandle();
      
      // Kill the process
      if (handle) {
        await handle.terminate();
      }

      const result = await session.waitForCompletion();
      expect(result.exitCode).toBeNull();
    });

    it('should return process handle', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'setTimeout(() => process.exit(0), 100)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      const handle = session.getProcessHandle();

      expect(handle).toBeDefined();
      expect(handle?.waitForExit).toBeDefined();
      expect(handle?.terminate).toBeDefined();
      expect(handle?.isRunning).toBeDefined();
      expect(handle?.isRunning()).toBe(true);
      
      // Wait for completion
      await session.waitForCompletion();
      expect(handle?.isRunning()).toBe(false);
    });
  });

  describe('Log Collection', () => {
    it('should capture stdout logs', async () => {
      const process = await ProcessSimulator.spawn({
        stdout: ['Plain stdout message'],
        exitCode: 0,
        exitDelay: 100
      });

      // Mock spawn to return our simulated process
      const originalSpawn = spawn;
      (spawn as any) = jest.fn().mockReturnValue(process);

      const config = {
        command: 'python',
        args: ['test.py'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for logs to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logs = session.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Plain stdout message');
      expect(logs[0].source).toBe('stdout');
      expect(logs[0].level).toBe('info');
      
      // Restore and clean up
      (spawn as any) = originalSpawn;
      await session.waitForCompletion();
    });

    it('should capture stderr logs', async () => {
      const process = await ProcessSimulator.spawnPython({
        logs: [{ level: 'error', message: 'Error message' }],
        exitCode: 0,
        exitDelay: 100
      });

      // Mock spawn to return our simulated process
      const originalSpawn = spawn;
      (spawn as any) = jest.fn().mockReturnValue(process);

      const config = {
        command: 'python',
        args: ['test.py'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for logs to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logs = session.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Error message');
      expect(logs[0].source).toBe('stderr');
      expect(logs[0].level).toBe('error');
      
      // Restore and clean up
      (spawn as any) = originalSpawn;
      await session.waitForCompletion();
    });

    it('should handle multiple log lines in one chunk', async () => {
      const process = await ProcessSimulator.spawn({
        stderr: [
          'INFO: First message',
          'ERROR: Second message',
          'DEBUG: Third message'
        ],
        exitCode: 0,
        exitDelay: 100
      });

      // Mock spawn to return our simulated process
      const originalSpawn = spawn;
      (spawn as any) = jest.fn().mockReturnValue(process);

      const config = {
        command: 'python',
        args: ['test.py'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for logs to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logs = session.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('First message');
      expect(logs[1].message).toBe('Second message');
      expect(logs[2].message).toBe('Third message');
      
      // Restore and clean up
      (spawn as any) = originalSpawn;
      await session.waitForCompletion();
    });

    it('should not capture logs when captureOutput is false', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("Should not capture"); process.exit(0)'],
        captureOutput: false
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for process to complete
      await session.waitForCompletion();
      
      const logs = session.getLogs();
      expect(logs).toHaveLength(0);
    });

    it('should return copy of logs array', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("Test message"); process.exit(0)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for process to complete and logs to be captured
      await session.waitForCompletion();
      
      const logs1 = session.getLogs();
      const logs2 = session.getLogs();
      
      expect(logs1).not.toBe(logs2); // Different array instances
      expect(logs1).toEqual(logs2); // Same content
    });
  });

  describe('Log Callbacks', () => {
    it('should trigger callback on new log entry', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("Test log message"); setTimeout(() => process.exit(0), 100)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      const callback = jest.fn();
      
      session.onLogEntry(callback);
      
      // Wait for log to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test log message',
        level: 'info',
        source: 'stdout'
      }));
      
      // Clean up
      await session.waitForCompletion();
    });

    it('should support multiple callbacks', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.error("ERROR: Test error"); setTimeout(() => process.exit(0), 100)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      session.onLogEntry(callback1);
      session.onLogEntry(callback2);
      
      // Wait for log to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      
      // Clean up
      await session.waitForCompletion();
    });

    it('should handle callbacks for Python formatted logs', async () => {
      const process = await ProcessSimulator.spawn({
        stderr: ['2025-01-15 10:30:45,123 - logger - INFO - Application started'],
        exitCode: 0,
        exitDelay: 100
      });

      // Mock spawn to return our simulated process
      const originalSpawn = spawn;
      (spawn as any) = jest.fn().mockReturnValue(process);

      const config = {
        command: 'python',
        args: ['test.py'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      const callback = jest.fn();
      
      session.onLogEntry(callback);
      
      // Wait for log to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Application started',
        level: 'info',
        timestamp: new Date('2025-01-15T10:30:45.123Z')
      }));
      
      // Restore and clean up
      (spawn as any) = originalSpawn;
      await session.waitForCompletion();
    });
  });

  describe('Log Formatting and File Saving', () => {
    it('should format logs correctly', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("INFO: First message"); console.error("ERROR: Second message"); setTimeout(() => process.exit(0), 100)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for logs to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const formatted = session.getFormattedLogs();
      const lines = formatted.split('\n');
      
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] First message$/);
      expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[ERROR\] Second message$/);
      
      // Clean up
      await session.waitForCompletion();
    });

    it('should save logs to file', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("Test log 1"); console.error("Test log 2"); process.exit(0)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for process to complete
      await session.waitForCompletion();
      
      const filePath = path.join(tempDir, 'test-logs.txt');
      await session.saveLogsToFile(filePath);
      
      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toMatch(/.*\[INFO\] Test log 1\n.*\[ERROR\] Test log 2/);
    });

    it('should handle empty logs when formatting', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'process.exit(0)'], // No output
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for process to complete
      await session.waitForCompletion();
      
      const formatted = session.getFormattedLogs();
      expect(formatted).toBe('');
    });

    it('should handle empty logs when saving to file', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'process.exit(0)'], // No output
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for process to complete
      await session.waitForCompletion();
      
      const filePath = path.join(tempDir, 'empty-logs.txt');
      await session.saveLogsToFile(filePath);
      
      const content = await fs.promises.readFile(filePath, 'utf-8');
      expect(content).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty lines in output', async () => {
      const process = await ProcessSimulator.spawn({
        stdout: ['Line 1', '', '', 'Line 2'],
        exitCode: 0,
        exitDelay: 100
      });

      // Mock spawn to return our simulated process
      const originalSpawn = spawn;
      (spawn as any) = jest.fn().mockReturnValue(process);

      const config = {
        command: 'python',
        args: ['test.py'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for logs to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logs = session.getLogs();
      // Empty lines should be filtered out
      expect(logs.length).toBeGreaterThanOrEqual(2);
      const messages = logs.map(log => log.message);
      expect(messages).toContain('Line 1');
      expect(messages).toContain('Line 2');
      
      // Restore and clean up
      (spawn as any) = originalSpawn;
      await session.waitForCompletion();
    });

    it('should handle log data without trailing newline', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'process.stdout.write("No newline"); setTimeout(() => process.exit(0), 100)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for logs to be captured
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const logs = session.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('No newline');
      
      // Clean up
      await session.waitForCompletion();
    });

    it('should stop capturer when process closes', async () => {
      const config = {
        command: 'node',
        args: ['-e', 'console.log("Before close"); process.exit(0)'],
        captureOutput: true
      };

      const session = await platform.startPythonLogCapture(config);
      
      // Wait for process to complete
      await session.waitForCompletion();
      
      // Get logs captured before close
      const logs = session.getLogs();
      const logCount = logs.length;
      expect(logCount).toBeGreaterThan(0);
      expect(logs[0].message).toBe('Before close');
      
      // Verify no more logs can be added after close
      const logsAfterClose = session.getLogs();
      expect(logsAfterClose).toHaveLength(logCount);
    });
  });
});