import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import * as fs from 'fs';
import * as path from 'path';

describe('Error Log Filtering End-to-End System Test', () => {
  const tempDir = path.join(__dirname, 'temp-test-apps');
  
  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should filter error logs from a real application', async () => {
    const logMonitor = new LogMonitor();
    const capturedLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });

    // Create a test application that simulates real-world logging
    const testAppCode = `
      // Simulate application startup
      console.log('INFO: Application starting...');
      console.log('INFO: Loading configuration');
      console.error('ERROR: Failed to connect to database');
      console.log('INFO: Retrying connection...');
      console.error('ERROR: Database connection timeout');
      console.log('DEBUG: Debug mode enabled');
      console.error('ERROR: Critical system failure');
      console.log('INFO: Shutting down gracefully');
      process.exit(0);
    `;

    const testAppPath = path.join(tempDir, 'error-filter-app.js');
    fs.writeFileSync(testAppPath, testAppCode);

    // Start monitoring with error-only filter
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${testAppPath}"`,
      { logLevelFilter: ['error'] }
    );

    // Wait for process to complete
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const status = logMonitor.getMonitoringStatus();
        if (status.activeProcesses === 0) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(undefined);
      }, 5000);
    });

    // Verify only error logs were captured
    expect(capturedLogs.length).toBeGreaterThan(0);
    expect(capturedLogs.length).toBeLessThan(8); // Should filter out non-error logs
    
    // All captured logs should be errors
    capturedLogs.forEach(log => {
      expect(log.level).toBe('error');
      expect(log.message).toContain('ERROR:');
      expect(log.processId).toBe(processId);
    });

    // Verify specific error messages were captured
    const errorMessages = capturedLogs.map(log => log.message);
    expect(errorMessages).toContainEqual(expect.stringContaining('Failed to connect to database'));
    expect(errorMessages).toContainEqual(expect.stringContaining('Database connection timeout'));
    expect(errorMessages).toContainEqual(expect.stringContaining('Critical system failure'));

    await logMonitor.stopAllMonitoring();
  });

  it('should support dynamic filter updates in production-like scenario', async () => {
    const logMonitor = new LogMonitor();
    const capturedLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push({
        ...entry,
        captureTime: Date.now()
      });
    });

    // Create a long-running application
    const longRunningAppCode = `
      let count = 0;
      const logInterval = setInterval(() => {
        count++;
        console.log(\`INFO: Processing request \${count}\`);
        
        if (count % 3 === 0) {
          console.error(\`ERROR: Failed to process request \${count}\`);
        }
        
        if (count % 5 === 0) {
          console.log(\`WARN: High memory usage detected at request \${count}\`);
        }
        
        console.log(\`DEBUG: Request \${count} details...\`);
        
        if (count >= 15) {
          clearInterval(logInterval);
          console.log('INFO: Application shutting down');
          process.exit(0);
        }
      }, 100);
    `;

    const longRunningAppPath = path.join(tempDir, 'long-running-app.js');
    fs.writeFileSync(longRunningAppPath, longRunningAppCode);

    // Start with error-only filter
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${longRunningAppPath}"`,
      { logLevelFilter: ['error'] }
    );

    // Phase 1: Error only (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    const phase1Count = capturedLogs.length;
    
    // Phase 2: Add info logs
    logMonitor.setLogLevelFilter(processId, ['error', 'info']);
    await new Promise(resolve => setTimeout(resolve, 500));
    const phase2Count = capturedLogs.length - phase1Count;
    
    // Phase 3: All logs (empty filter)
    logMonitor.setLogLevelFilter(processId, []);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Wait for completion
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const status = logMonitor.getMonitoringStatus();
        if (status.activeProcesses === 0) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(undefined);
      }, 3000);
    });

    // Verify filter changes took effect
    expect(capturedLogs.length).toBeGreaterThan(0);
    expect(phase1Count).toBeGreaterThan(0);
    expect(phase2Count).toBeGreaterThan(phase1Count);
    
    // Verify log level distribution changes over time
    const phase1Logs = capturedLogs.slice(0, phase1Count);
    const phase2Logs = capturedLogs.slice(phase1Count, phase1Count + phase2Count);
    const phase3Logs = capturedLogs.slice(phase1Count + phase2Count);
    
    // Phase 1 should only have errors
    phase1Logs.forEach(log => {
      expect(log.level).toBe('error');
    });
    
    // Phase 2 should have errors and info
    const phase2Levels = [...new Set(phase2Logs.map(log => log.level))];
    expect(phase2Levels).toContain('error');
    expect(phase2Levels).toContain('info');
    
    // Phase 3 should have all levels
    if (phase3Logs.length > 0) {
      const phase3Levels = [...new Set(phase3Logs.map(log => log.level))];
      expect(phase3Levels.length).toBeGreaterThanOrEqual(2);
    }

    await logMonitor.stopAllMonitoring();
  });

  it('should handle multiple concurrent filtered processes', async () => {
    const logMonitor = new LogMonitor();
    const webServerLogs: any[] = [];
    const workerLogs: any[] = [];
    const cronJobLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      if (entry.message.includes('[WebServer]')) {
        webServerLogs.push(entry);
      } else if (entry.message.includes('[Worker]')) {
        workerLogs.push(entry);
      } else if (entry.message.includes('[CronJob]')) {
        cronJobLogs.push(entry);
      }
    });

    // Create three different applications with different logging patterns
    
    // Web Server - lots of info logs, occasional errors
    const webServerCode = `
      let reqCount = 0;
      const serverInterval = setInterval(() => {
        reqCount++;
        console.log(\`INFO: [WebServer] Request \${reqCount} received\`);
        if (reqCount % 7 === 0) {
          console.error(\`ERROR: [WebServer] Request \${reqCount} failed - 500 Internal Server Error\`);
        }
        if (reqCount >= 10) {
          clearInterval(serverInterval);
          process.exit(0);
        }
      }, 150);
    `;

    // Worker - debug logs and warnings
    const workerCode = `
      let taskCount = 0;
      const workerInterval = setInterval(() => {
        taskCount++;
        console.log(\`DEBUG: [Worker] Processing task \${taskCount}\`);
        if (taskCount % 4 === 0) {
          console.error(\`WARN: [Worker] Task \${taskCount} taking longer than expected\`);
        }
        if (taskCount >= 8) {
          clearInterval(workerInterval);
          process.exit(0);
        }
      }, 200);
    `;

    // Cron Job - mostly errors
    const cronJobCode = `
      let runCount = 0;
      const cronInterval = setInterval(() => {
        runCount++;
        console.error(\`ERROR: [CronJob] Failed to execute scheduled task \${runCount}\`);
        console.log(\`INFO: [CronJob] Retrying task \${runCount}\`);
        if (runCount >= 5) {
          clearInterval(cronInterval);
          process.exit(0);
        }
      }, 300);
    `;

    const webServerPath = path.join(tempDir, 'web-server.js');
    const workerPath = path.join(tempDir, 'worker.js');
    const cronJobPath = path.join(tempDir, 'cron-job.js');
    
    fs.writeFileSync(webServerPath, webServerCode);
    fs.writeFileSync(workerPath, workerCode);
    fs.writeFileSync(cronJobPath, cronJobCode);

    // Start processes with different filters
    const webServerId = await logMonitor.startRealTimeMonitoring(
      `node "${webServerPath}"`,
      { logLevelFilter: ['error'] } // Only errors for web server
    );

    await logMonitor.startRealTimeMonitoring(
      `node "${workerPath}"`,
      { logLevelFilter: ['debug', 'warn'] } // Debug and warnings for worker
    );

    await logMonitor.startRealTimeMonitoring(
      `node "${cronJobPath}"`,
      { logLevelFilter: [] } // All logs for cron job
    );

    // Wait for all processes to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify each process was filtered independently
    expect(webServerLogs.length).toBeGreaterThan(0);
    expect(workerLogs.length).toBeGreaterThan(0);
    expect(cronJobLogs.length).toBeGreaterThan(0);

    // Web server should only have error logs
    webServerLogs.forEach(log => {
      expect(log.level).toBe('error');
      expect(log.processId).toBe(webServerId);
    });

    // Worker should have debug logs (warnings show as errors in stderr)
    const workerLevels = [...new Set(workerLogs.map(log => log.level))];
    expect(workerLevels).toContain('debug');

    // Cron job should have both error and info logs
    const cronJobLevels = [...new Set(cronJobLogs.map(log => log.level))];
    expect(cronJobLevels).toContain('error');
    expect(cronJobLevels).toContain('info');

    await logMonitor.stopAllMonitoring();
  });

  it('should handle high-volume filtered logging in production scenario', async () => {
    const logMonitor = new LogMonitor();
    const errorLogs: any[] = [];
    const startTime = Date.now();
    
    logMonitor.on('log-entry', (entry: any) => {
      errorLogs.push({
        ...entry,
        timestamp: Date.now() - startTime
      });
    });

    // Create high-volume logging application
    const highVolumeCode = `
      let count = 0;
      function generateLogs() {
        for (let i = 0; i < 50; i++) {
          count++;
          
          // 80% info logs, 15% errors, 5% debug
          const rand = Math.random();
          if (rand < 0.8) {
            console.log(\`INFO: Transaction \${count} processed In Progress\`);
          } else if (rand < 0.95) {
            console.error(\`ERROR: Transaction \${count} failed - validation error\`);
          } else {
            console.log(\`DEBUG: Transaction \${count} debug details\`);
          }
        }
        
        if (count < 500) {
          setImmediate(generateLogs);
        } else {
          console.log('INFO: Batch processing In Progress');
          process.exit(0);
        }
      }
      
      generateLogs();
    `;

    const highVolumePath = path.join(tempDir, 'high-volume-app.js');
    fs.writeFileSync(highVolumePath, highVolumeCode);

    // Monitor with error-only filter
    await logMonitor.startRealTimeMonitoring(
      `node "${highVolumePath}"`,
      { logLevelFilter: ['error'] }
    );

    // Wait for completion
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const status = logMonitor.getMonitoringStatus();
        if (status.activeProcesses === 0) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(undefined);
      }, 5000);
    });

    const endTime = Date.now() - startTime;

    // Verify filtering effectiveness
    expect(errorLogs.length).toBeGreaterThan(0);
    expect(errorLogs.length).toBeLessThan(100); // Should have filtered out most logs
    
    // All captured logs should be errors
    errorLogs.forEach(log => {
      expect(log.level).toBe('error');
      expect(log.message).toContain('ERROR:');
    });

    // Verify performance - should In Progress quickly despite high volume
    expect(endTime).toBeLessThan(3000); // Should In Progress in under 3 seconds

    console.log(`High-volume test: Filtered ${errorLogs.length} error logs from ~500 total logs in ${endTime}ms`);

    await logMonitor.stopAllMonitoring();
  });
});