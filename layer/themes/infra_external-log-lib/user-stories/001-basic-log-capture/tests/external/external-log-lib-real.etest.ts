import { spawn } from 'child_process';
import { externalLogLib } from '../../src/external/external-log-lib';

describe('External Log Library Real Implementation Test', () => {
  it('should capture logs from a real child process', (done) => {
    const script = `
      console.log('[INFO] Starting application');
      console.error('[ERROR] Something went wrong');
      console.log('Regular log without level');
    `;

    const childProcess = spawn('node', ['-e', script]);
    const capturer = externalLogLib.createCapturer(childProcess);

    const capturedLogs: any[] = [];
    capturer.onLog((entry) => {
      capturedLogs.push(entry);
    });

    capturer.start();

    childProcess.on('close', () => {
      capturer.stop();
      
      // Verify captured logs
      expect(capturedLogs).toHaveLength(3);
      
      // Find specific logs regardless of order
      const infoLog = capturedLogs.find(log => log.message === 'Starting application');
      expect(infoLog).toBeDefined();
      expect(infoLog!.level).toBe('info');
      expect(infoLog!.source).toBe('stdout');
      
      const errorLog = capturedLogs.find(log => log.message === 'Something went wrong');
      expect(errorLog).toBeDefined();
      expect(errorLog!.level).toBe('error');
      expect(errorLog!.source).toBe('stderr');
      
      const plainLog = capturedLogs.find(log => log.message === 'Regular log without level');
      expect(plainLog).toBeDefined();
      expect(plainLog!.level).toBe('info');
      expect(plainLog!.source).toBe('stdout');

      done();
    });
  });

  it('should parse structured log formats', () => {
    const testCases = [
      {
        line: '2024-01-15T10:30:00.000Z [INFO] Application started',
        expectedLevel: 'info',
        expectedMessage: 'Application started'
      },
      {
        line: '[DEBUG] Debug information',
        expectedLevel: 'debug',
        expectedMessage: 'Debug information'
      },
      {
        line: 'Plain text log',
        expectedLevel: 'info',
        expectedMessage: 'Plain text log'
      }
    ];

    testCases.forEach(({ line, expectedLevel, expectedMessage }) => {
      const entry = externalLogLib.parseLogLine(line, 'stdout');
      expect(entry.level).toBe(expectedLevel);
      expect(entry.message).toBe(expectedMessage);
      expect(entry.source).toBe('stdout');
    });
  });

  it('should handle real-time log streaming', (done) => {
    const script = `
      console.log('[INFO] Log 1');
      setTimeout(() => console.log('[INFO] Log 2'), 100);
      setTimeout(() => console.log('[INFO] Log 3'), 200);
      setTimeout(() => process.exit(0), 300);
    `;

    const childProcess = spawn('node', ['-e', script]);
    const capturer = externalLogLib.createCapturer(childProcess);

    const logTimes: number[] = [];
    const startTime = Date.now();

    capturer.onLog((_entry) => {
      logTimes.push(Date.now() - startTime);
    });

    capturer.start();

    childProcess.on('close', () => {
      capturer.stop();
      
      expect(logTimes).toHaveLength(3);
      // Verify logs came at different times
      expect(logTimes[1] - logTimes[0]).toBeGreaterThan(50);
      expect(logTimes[2] - logTimes[1]).toBeGreaterThan(50);

      done();
    });
  });

  it('should handle buffer clearing', (done) => {
    const script = `
      console.log('[INFO] Log 1');
      console.log('[INFO] Log 2');
    `;

    const childProcess = spawn('node', ['-e', script]);
    const capturer = externalLogLib.createCapturer(childProcess);

    capturer.start();

    childProcess.on('close', () => {
      capturer.stop();
      
      // Check logs are captured
      expect(capturer.getEntries()).toHaveLength(2);
      
      // Clear buffer
      capturer.clear();
      
      // Verify buffer is empty
      expect(capturer.getEntries()).toHaveLength(0);

      done();
    });
  });

  it('should properly stop capturing', (done) => {
    const childProcess = spawn('node', ['-e', 'console.log("test")']);
    const capturer = externalLogLib.createCapturer(childProcess);

    capturer.start();
    
    // Stop immediately after starting
    capturer.stop();
    
    // Try to capture after stopping - should not work
    let captureCount = 0;
    capturer.onLog(() => {
      captureCount++;
    });

    childProcess.on('close', () => {
      // Should not have captured anything since we stopped before data arrived
      expect(captureCount).toBe(0);
      done();
    });
  });
});