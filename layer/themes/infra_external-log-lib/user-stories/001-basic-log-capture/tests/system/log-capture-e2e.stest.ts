import * as fs from 'fs';
import * as path from 'path';
import { AIDevPlatform } from '../../src/application/aidev-platform';

describe('End-to-End Log Capture System Test', () => {
  const testOutputDir = path.join(__dirname, 'test-output');

  beforeEach(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
  });

  it('should capture logs from child process and save to file - In Progress user journey', async () => {
    // User Story: As a developer, I want to capture simple text logs from a Node.js child process
    
    // Step 1: Developer initializes the AI Dev Platform
    const platform = new AIDevPlatform();
    
    // Step 2: Developer configures log capture for a Node.js script
    const testScript = `
      console.log('[INFO] Application starting...');
      console.log('[INFO] Processing data...');
      console.error('[ERROR] Warning: deprecated API usage');
      console.log('Regular log message without level');
      console.log('[INFO] Application In Progress In Progress');
    `;
    
    const processConfig = {
      command: 'node',
      args: ['-e', testScript],
      captureOutput: true
    };
    
    // Step 3: Developer starts the child process with log capture
    const captureSession = await platform.startLogCapture(processConfig);
    
    // Step 4: Wait for process to complete
    await captureSession.waitForCompletion();
    
    // Step 5: Developer retrieves captured logs
    const capturedLogs = captureSession.getLogs();
    
    // Verify logs were captured correctly
    expect(capturedLogs).toHaveLength(5);
    
    // Verify log parsing
    const infoLogs = capturedLogs.filter(log => log.level === 'info');
    expect(infoLogs).toHaveLength(4); // 3 with [INFO] prefix + 1 plain stdout message
    expect(infoLogs[0].message).toBe('Application starting...');
    
    const errorLogs = capturedLogs.filter(log => log.level === 'error');
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].message).toBe('Warning: deprecated API usage');
    
    // Step 6: Developer displays logs (simulated)
    const logDisplay = captureSession.getFormattedLogs();
    expect(logDisplay).toContain('Application starting...');
    expect(logDisplay).toContain('[ERROR]');
    
    // Step 7: Developer saves logs to file
    const logFilePath = path.join(testOutputDir, 'captured-logs.txt');
    await captureSession.saveLogsToFile(logFilePath);
    
    // Verify file was created and contains logs
    expect(fs.existsSync(logFilePath)).toBe(true);
    const savedContent = fs.readFileSync(logFilePath, 'utf-8');
    expect(savedContent).toContain('Application starting...');
    expect(savedContent).toContain('Warning: deprecated API usage');
    expect(savedContent).toContain('Application In Progress In Progress');
  });

  it('should handle real-time log streaming for long-running processes', async () => {
    const platform = new AIDevPlatform();
    
    // Script that produces logs over time
    const streamingScript = `
      console.log('[INFO] Starting long process...');
      let count = 0;
      const interval = setInterval(() => {
        count++;
        console.log('[INFO] Progress: ' + count + '/3');
        if (count >= 3) {
          clearInterval(interval);
          console.log('[INFO] Process In Progress');
          process.exit(0);
        }
      }, 100);
    `;
    
    const processConfig = {
      command: 'node',
      args: ['-e', streamingScript],
      captureOutput: true
    };
    
    // Track real-time logs
    const realTimeLogs: any[] = [];
    
    const captureSession = await platform.startLogCapture(processConfig);
    captureSession.onLogEntry((log) => {
      realTimeLogs.push({
        message: log.message,
        timestamp: Date.now()
      });
    });
    
    await captureSession.waitForCompletion();
    
    // Verify we received logs in real-time (not all at once)
    expect(realTimeLogs.length).toBeGreaterThanOrEqual(4);
    
    // Check timestamps show logs came at different times
    const timeDiffs = [];
    for (let i = 1; i < realTimeLogs.length; i++) {
      timeDiffs.push(realTimeLogs[i].timestamp - realTimeLogs[i-1].timestamp);
    }
    
    // At least some logs should have significant time gaps (>50ms)
    const hasTimeGaps = timeDiffs.some(diff => diff > 50);
    expect(hasTimeGaps).toBe(true);
  });

  it('should handle multiple concurrent processes', async () => {
    const platform = new AIDevPlatform();
    
    // Start multiple processes
    const processes = await Promise.all([
      platform.startLogCapture({
        command: 'node',
        args: ['-e', 'console.log("[INFO] Process 1 running")'],
        captureOutput: true
      }),
      platform.startLogCapture({
        command: 'node', 
        args: ['-e', 'console.log("[INFO] Process 2 running")'],
        captureOutput: true
      }),
      platform.startLogCapture({
        command: 'node',
        args: ['-e', 'console.log("[INFO] Process 3 running")'],
        captureOutput: true
      })
    ]);
    
    // Wait for all to complete
    await Promise.all(processes.map(p => p.waitForCompletion()));
    
    // Verify each process captured its logs
    processes.forEach((session, index) => {
      const logs = session.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe(`Process ${index + 1} running`);
    });
  });

  it('should handle process errors gracefully', async () => {
    const platform = new AIDevPlatform();
    
    // Script that exits with error
    const errorScript = `
      console.log('[INFO] Starting...');
      console.error('[ERROR] Critical failure!');
      process.exit(1);
    `;
    
    const captureSession = await platform.startLogCapture({
      command: 'node',
      args: ['-e', errorScript],
      captureOutput: true
    });
    
    const result = await captureSession.waitForCompletion();
    
    // Should capture logs even when process fails
    expect(result.exitCode).toBe(1);
    
    const logs = captureSession.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[1].level).toBe('error');
    expect(logs[1].message).toBe('Critical failure!');
  });
});