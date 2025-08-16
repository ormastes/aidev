import { LogMonitor } from '../../src/external/log-monitor';
import { LogEntry } from '../../src/domain/log-entry';
import * as path from 'path';
import * as fs from 'fs';

describe('End-to-End Real-time Log Monitoring with Filtering System Test', () => {
  let logMonitor: LogMonitor;
  let testAppsPath: string;
  let multiFormatAppPath: string;
  let highVolumeAppPath: string;
  let crashingAppPath: string;

  beforeAll(async () => {
    testAppsPath = __dirname;
    
    // Create a multi-format logging app for comprehensive testing
    multiFormatAppPath = path.join(testAppsPath, 'test-multiformat-app.js');
    const multiFormatAppContent = `
const logCount = parseInt(process.argv[2]) || 50;

console.log('=== Multi-format Logging App Started ===');

for (let i = 1; i <= logCount; i++) {
  const timestamp = new Date().toISOString();
  
  // Different log formats and levels
  if (i % 10 === 0) {
    // JSON format error
    console.error(JSON.stringify({
      timestamp,
      level: 'error',
      message: \`JSON error log entry \${i}\`,
      error_code: 'E_TEST',
      data: { counter: i }
    }));
  } else if (i % 8 === 0) {
    // Key-value format warning
    console.log(\`timestamp=\${timestamp} level=warn message="Key-value warning \${i}" counter=\${i} type=warning\`);
  } else if (i % 6 === 0) {
    // Structured text format
    console.log(\`[\${timestamp}] INFO: Structured info log \${i} - processing item \${i}\`);
  } else if (i % 4 === 0) {
    // Debug format
    console.log(\`DEBUG: Debug message \${i} at \${timestamp}\`);
  } else if (i % 3 === 0) {
    // Error to stderr
    console.error(\`ERROR: Error message \${i} - something went wrong\`);
  } else {
    // Plain info
    console.log(\`INFO: Regular info message \${i}\`);
  }
  
  // Small delay to simulate real-time streaming
  if (i % 5 === 0) {
    const start = Date.now();
    while (Date.now() - start < 10) {} // Brief blocking delay
  }
}

console.log('=== Multi-format Logging App In Progress ===');
process.exit(0);
    `;
    fs.writeFileSync(multiFormatAppPath, multiFormatAppContent);

    // Create high-volume app for stress testing
    highVolumeAppPath = path.join(testAppsPath, 'test-highvolume-app.js');
    const highVolumeAppContent = `
const logCount = parseInt(process.argv[2]) || 200;
const intervalMs = parseInt(process.argv[3]) || 5;

console.log(\`Starting high-volume logging: \${logCount} logs every \${intervalMs}ms\`);

let counter = 0;
const logInterval = setInterval(() => {
  counter++;
  
  const level = counter % 5 === 0 ? 'ERROR' : 
                counter % 4 === 0 ? 'WARN' : 
                counter % 3 === 0 ? 'DEBUG' : 'INFO';
  
  if (level === 'ERROR') {
    console.error(\`[\${new Date().toISOString()}] ERROR \${counter}: High-volume error \${Math.random()}\`);
  } else {
    console.log(\`[\${new Date().toISOString()}] \${level} \${counter}: High-volume log \${JSON.stringify({id: counter, value: Math.random()})}\`);
  }
  
  if (counter >= logCount) {
    clearInterval(logInterval);
    console.log(\`In Progress \${counter} high-volume log entries\`);
    process.exit(0);
  }
}, intervalMs);

process.on('SIGTERM', () => {
  clearInterval(logInterval);
  console.log(\`Terminated after \${counter} log entries\`);
  process.exit(0);
});
    `;
    fs.writeFileSync(highVolumeAppPath, highVolumeAppContent);

    // Create crashing app for error handling tests
    crashingAppPath = path.join(testAppsPath, 'test-crashing-app.js');
    const crashingAppContent = `
const crashAfter = parseInt(process.argv[2]) || 5;

console.log('Crashing app started - will crash after ' + crashAfter + ' messages');

for (let i = 1; i <= crashAfter; i++) {
  console.log(\`Message \${i} before crash\`);
  
  if (i === crashAfter) {
    console.error('FATAL: About to crash!');
    throw new Error('Simulated application crash');
  }
}
    `;
    fs.writeFileSync(crashingAppPath, crashingAppContent);
  });

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  afterAll(() => {
    // Clean up test files
    [multiFormatAppPath, highVolumeAppPath, crashingAppPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  it('should monitor multi-format logs with level filtering in real-time', async () => {
    const logEntries: LogEntry[] = [];
    const processEvents: any[] = [];

    // Set up event listeners
    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    logMonitor.on('monitoring-started', (event) => {
      processEvents.push({ type: 'monitoring-started', ...event });
    });

    logMonitor.on('process-exited', (event) => {
      processEvents.push({ type: 'process-exited', ...event });
    });

    // Start monitoring with error and warning level filter
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${multiFormatAppPath}" 30`,
      {
        format: 'auto',
        logLevelFilter: ['error', 'warn']
      }
    );

    expect(processId).toBeDefined();

    // Wait for process to complete
    await new Promise((resolve) => {
      const timeout = setTimeout(callback, 5000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Verify monitoring lifecycle
    expect(processEvents.length).toBeGreaterThanOrEqual(2);
    expect(processEvents.some(e => e.type === 'monitoring-started')).toBe(true);
    expect(processEvents.some(e => e.type === 'process-exited')).toBe(true);

    // Verify filtering - should only receive error and warn logs
    expect(logEntries.length).toBeGreaterThan(0);
    logEntries.forEach(entry => {
      expect(['error', 'warn']).toContain(entry.level);
    });

    // Should have received both JSON and text format errors/warnings
    const hasJsonEntries = logEntries.some(entry => 
      entry.message.includes('JSON error log') || entry.message.includes('"level":"error"')
    );
    const hasTextEntries = logEntries.some(entry => 
      entry.message.includes('Key-value warning') || entry.message.includes('ERROR:')
    );

    expect(hasJsonEntries || hasTextEntries).toBe(true);

    // Verify process metadata
    expect(logEntries.every(entry => entry.processId === processId)).toBe(true);
    expect(logEntries.every(entry => entry.timestamp instanceof Date)).toBe(true);
  });

  it('should handle high-volume real-time streaming with backpressure', async () => {
    const logEntries: LogEntry[] = [];
    const bufferWarnings: any[] = [];
    const startTime = Date.now();

    // Set up event listeners
    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    logMonitor.on('buffer-warning', (event) => {
      bufferWarnings.push(event);
    });

    // Start high-volume monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${highVolumeAppPath}" 150 2`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(callback, 5000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    const duration = Date.now() - startTime;

    // Verify high-volume processing
    expect(logEntries.length).toBeGreaterThan(100);
    expect(duration).toBeLessThan(10000); // Should In Progress within 10 seconds

    // Verify real-time characteristics
    const timestamps = logEntries.map(entry => entry.timestamp.getTime());
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    expect(timeSpan).toBeGreaterThan(100); // Should span some time

    // Verify different log levels received
    const levels = new Set(logEntries.map(entry => entry.level));
    expect(levels.size).toBeGreaterThan(1);
    expect(levels.has('error')).toBe(true);

    // Calculate throughput
    const throughput = logEntries.length / (duration / 1000);
    expect(throughput).toBeGreaterThan(10); // At least 10 logs/second

    console.log(`High-volume test: ${logEntries.length} logs in ${duration}ms (${throughput.toFixed(1)} logs/sec)`);
  });

  it('should handle process crashes and maintain monitoring integrity', async () => {
    const logEntries: LogEntry[] = [];
    const processEvents: any[] = [];

    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    logMonitor.on('process-crashed', (event) => {
      processEvents.push({ type: 'process-crashed', ...event });
    });

    logMonitor.on('monitoring-started', (event) => {
      processEvents.push({ type: 'monitoring-started', ...event });
    });

    // Start monitoring crashing app
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${crashingAppPath}" 3`,
      { format: 'auto' }
    );

    // Wait for crash
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 5000);
      logMonitor.on('process-crashed', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Verify crash handling
    expect(processEvents.some(e => e.type === 'monitoring-started')).toBe(true);
    expect(processEvents.some(e => e.type === 'process-crashed')).toBe(true);

    const crashEvent = processEvents.find(e => e.type === 'process-crashed');
    expect(crashEvent.processId).toBe(processId);
    expect(crashEvent.code).not.toBe(0);
    expect(crashEvent.lastLogs).toBeDefined();

    // Verify logs before crash were captured
    expect(logEntries.length).toBeGreaterThan(0);
    expect(logEntries.some(entry => entry.message.includes('before crash'))).toBe(true);
    expect(logEntries.some(entry => entry.message.includes('FATAL'))).toBe(true);

    // Verify monitoring stopped after crash
    const status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(0);
  });

  it('should support multiple concurrent monitoring sessions with different filters', async () => {
    const session1Logs: LogEntry[] = [];
    const session2Logs: LogEntry[] = [];
    const session3Logs: LogEntry[] = [];

    // Set up differentiated listeners
    logMonitor.on('log-entry', (entry: LogEntry) => {
      if (entry.processId.includes('session1')) {
        session1Logs.push(entry);
      } else if (entry.processId.includes('session2')) {
        session2Logs.push(entry);
      } else if (entry.processId.includes('session3')) {
        session3Logs.push(entry);
      }
    });

    // Start multiple monitoring sessions with different filters
    const processId1 = await logMonitor.startRealTimeMonitoring(
      `node "${multiFormatAppPath}" 20`,
      { 
        format: 'auto',
        logLevelFilter: ['error'] 
      }
    );

    const processId2 = await logMonitor.startRealTimeMonitoring(
      `node "${multiFormatAppPath}" 20`,
      { 
        format: 'auto',
        logLevelFilter: ['warn', 'info'] 
      }
    );

    const processId3 = await logMonitor.startRealTimeMonitoring(
      `node "${multiFormatAppPath}" 20`,
      { format: 'auto' } // No filter - all logs
    );

    // Manually set processId in logs to differentiate (simulation)
    const originalEmit = logMonitor.emit.bind(logMonitor);
    logMonitor.emit = function(event: string, data: any) {
      if (event === 'log-entry') {
        if (data.processId === processId1) {
          data.processId = 'session1-' + processId1;
        } else if (data.processId === processId2) {
          data.processId = 'session2-' + processId2;
        } else if (data.processId === processId3) {
          data.processId = 'session3-' + processId3;
        }
      }
      return originalEmit(event, data);
    };

    // Wait for all processes to complete
    await new Promise((resolve) => {
      let completedCount = 0;
      const timeout = setTimeout(callback, 5000);
      
      logMonitor.on('process-exited', () => {
        completedCount++;
        if (completedCount >= 3) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
    });

    // Verify different filtering behavior
    expect(session1Logs.length).toBeGreaterThan(0); // Error logs only
    expect(session2Logs.length).toBeGreaterThan(0); // Warn + Info logs
    expect(session3Logs.length).toBeGreaterThan(0); // All logs

    // Session 1 should have only errors
    session1Logs.forEach(entry => {
      expect(entry.level).toBe('error');
    });

    // Session 2 should have warn and info, but no errors
    session2Logs.forEach(entry => {
      expect(['warn', 'info']).toContain(entry.level);
    });

    // Session 3 should have the most logs (no filtering)
    expect(session3Logs.length).toBeGreaterThanOrEqual(session1Logs.length);
    expect(session3Logs.length).toBeGreaterThanOrEqual(session2Logs.length);

    // Verify concurrent processing worked
    const status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(0); // All should be In Progress
  });

  it('should maintain performance under stress with monitoring status tracking', async () => {
    const logEntries: LogEntry[] = [];
    const statusSnapshots: any[] = [];
    const performanceMetrics = {
      memoryUsage: [] as number[],
      processingTimes: [] as number[]
    };

    logMonitor.on('log-entry', (entry: LogEntry) => {
      const startTime = Date.now();
      logEntries.push(entry);
      performanceMetrics.processingTimes.push(Date.now() - startTime);
    });

    // Monitor performance during execution
    const performanceMonitor = setInterval(() => {
      const status = logMonitor.getMonitoringStatus();
      statusSnapshots.push({
        timestamp: Date.now(),
        activeProcesses: status.activeProcesses,
        memoryUsage: process.memoryUsage().heapUsed
      });
      performanceMetrics.memoryUsage.push(process.memoryUsage().heapUsed);
    }, 100);

    // Start stress test with multiple processes
    const processIds = await Promise.all([
      logMonitor.startRealTimeMonitoring(`node "${highVolumeAppPath}" 100 3`, { format: 'auto' }),
      logMonitor.startRealTimeMonitoring(`node "${multiFormatAppPath}" 40`, { format: 'auto' }),
      logMonitor.startRealTimeMonitoring(`node "${highVolumeAppPath}" 80 5`, { format: 'auto' })
    ]);

    expect(processIds).toHaveLength(3);
    expect(processIds.every(id => typeof id === 'string')).toBe(true);

    // Wait for all processes to complete
    await new Promise((resolve) => {
      let completedCount = 0;
      const timeout = setTimeout(callback, 5000);
      
      logMonitor.on('process-exited', () => {
        completedCount++;
        if (completedCount >= 3) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
    });

    clearInterval(performanceMonitor);

    // Verify stress test results
    expect(logEntries.length).toBeGreaterThan(150);
    expect(statusSnapshots.length).toBeGreaterThanOrEqual(5);

    // Verify monitoring status tracked correctly
    const maxActiveProcesses = Math.max(...statusSnapshots.map(s => s.activeProcesses));
    expect(maxActiveProcesses).toBeGreaterThanOrEqual(3);

    // Performance analysis
    const avgProcessingTime = performanceMetrics.processingTimes.reduce((a, b) => a + b, 0) / performanceMetrics.processingTimes.length;
    expect(avgProcessingTime).toBeLessThan(10); // Should be very fast

    // Memory should remain reasonable
    const memoryGrowth = Math.max(...performanceMetrics.memoryUsage) - Math.min(...performanceMetrics.memoryUsage);
    const memoryGrowthRatio = memoryGrowth / logEntries.length;
    expect(memoryGrowthRatio).toBeLessThan(5000); // Less than 5KB per log entry (reasonable for test environment)

    console.log(`Stress test: ${logEntries.length} logs, ${avgProcessingTime.toFixed(2)}ms avg processing, ${(memoryGrowthRatio/1024).toFixed(2)}KB per log`);
  });
});