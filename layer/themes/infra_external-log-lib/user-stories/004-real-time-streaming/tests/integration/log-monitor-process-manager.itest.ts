import { LogMonitor } from '../../src/external/log-monitor';
import { ProcessManager } from '../../src/external/process-manager';
import { LogEntry } from '../../src/domain/log-entry';
import * as path from 'node:path';
import * as fs from 'node:fs';

describe('LogMonitor and ProcessManager Coordination Integration Test', () => {
  let logMonitor: LogMonitor;
  let processManager: ProcessManager;
  let testAppsPath: string;
  let testAppPath: string;
  let longRunningAppPath: string;
  let quickExitAppPath: string;
  let errorAppPath: string;

  beforeAll(async () => {
    testAppsPath = __dirname;
    
    // Create a basic test app
    testAppPath = path.join(testAppsPath, 'test-coordination-app.js');
    const testAppContent = `
const duration = parseInt(process.argv[2]) || 2000;
const logInterval = parseInt(process.argv[3]) || 200;

console.log('Integration test app started');
console.log(\`Will run for \${duration}ms, logging every \${logInterval}ms\`);

let counter = 0;
const startTime = Date.now();

const logTimer = setInterval(() => {
  counter++;
  const elapsed = Date.now() - startTime;
  
  if (counter % 5 === 0) {
    console.error(\`ERROR \${counter}: Integration error log at \${elapsed}ms\`);
  } else if (counter % 3 === 0) {
    console.log(\`WARN \${counter}: Integration warning log at \${elapsed}ms\`);
  } else {
    console.log(\`INFO \${counter}: Integration info log at \${elapsed}ms\`);
  }
  
  if (elapsed >= duration) {
    clearInterval(logTimer);
    console.log(\`Integration test app In Progress after \${counter} logs\`);
    process.exit(0);
  }
}, logInterval);

process.on('SIGTERM', () => {
  clearInterval(logTimer);
  console.log(\`Integration test app terminated after \${counter} logs\`);
  process.exit(0);
});

process.on('SIGINT', () => {
  clearInterval(logTimer);
  console.log(\`Integration test app interrupted after \${counter} logs\`);
  process.exit(0);
});
    `;
    fs.writeFileSync(testAppPath, testAppContent);

    // Create a long-running app for termination testing
    longRunningAppPath = path.join(testAppsPath, 'test-long-running-app.js');
    const longRunningAppContent = `
console.log('Long-running app started');

let counter = 0;
const logTimer = setInterval(() => {
  counter++;
  console.log(\`Long-running log \${counter} at \${new Date().toISOString()}\`);
  
  // This app runs indefinitely until terminated
}, 100);

process.on('SIGTERM', () => {
  clearInterval(logTimer);
  console.log(\`Long-running app gracefully terminated after \${counter} logs\`);
  process.exit(0);
});

process.on('SIGINT', () => {
  clearInterval(logTimer);
  console.log(\`Long-running app interrupted after \${counter} logs\`);
  process.exit(0);
});

process.on('SIGKILL', () => {
  // Cannot handle SIGKILL, but we can try cleanup
  clearInterval(logTimer);
});
    `;
    fs.writeFileSync(longRunningAppPath, longRunningAppContent);

    // Create a quick exit app for rapid lifecycle testing
    quickExitAppPath = path.join(testAppsPath, 'test-quick-exit-app.js');
    const quickExitAppContent = `
const exitCode = parseInt(process.argv[2]) || 0;
const delay = parseInt(process.argv[3]) || 100;

console.log(\`Quick exit app starting, will exit with code \${exitCode} after \${delay}ms\`);

setTimeout(() => {
  console.log(\`Quick exit app exiting with code \${exitCode}\`);
  process.exit(exitCode);
}, delay);
    `;
    fs.writeFileSync(quickExitAppPath, quickExitAppContent);

    // Create an error-prone app for error handling testing
    errorAppPath = path.join(testAppsPath, 'test-error-app.js');
    const errorAppContent = `
const errorType = process.argv[2] || 'throw';

console.log(\`Error app starting with error type: \${errorType}\`);

setTimeout(() => {
  console.log('Error app about to trigger error');
  
  if (errorType === 'throw') {
    throw new Error('Integration test error');
  } else if (errorType === "reference") {
    const obj = null;
    console.log(obj.property);
  } else if (errorType === 'exit') {
    console.error('Error app exiting with error code');
    process.exit(1);
  } else {
    console.error('Unknown error type, exiting');
    process.exit(2);
  }
}, 200);

process.on("uncaughtException", (error) => {
  console.error(\`UNCAUGHT: \${error.message}\`);
  process.exit(1);
});
    `;
    fs.writeFileSync(errorAppPath, errorAppContent);
  });

  beforeEach(() => {
    logMonitor = new LogMonitor();
    processManager = new ProcessManager();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
    if (processManager.isRunning()) {
      await processManager.terminateProcess('SIGTERM');
    }
  });

  afterAll(() => {
    // Clean up test files
    [testAppPath, longRunningAppPath, quickExitAppPath, errorAppPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  it('should coordinate process lifecycle through LogMonitor and ProcessManager', async () => {
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

    logMonitor.on('monitoring-stopped', (event) => {
      processEvents.push({ type: 'monitoring-stopped', ...event });
    });

    // Start monitoring through LogMonitor (which uses ProcessManager internally)
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${testAppPath}" 1500 150`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Verify initial state
    const initialStatus = logMonitor.getMonitoringStatus();
    expect(initialStatus.activeProcesses).toBe(1);
    expect(initialStatus.processes).toHaveLength(1);
    expect(initialStatus.processes[0].status).toBe('running');

    // Wait for some logs to be generated
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify logs are being captured
    expect(logEntries.length).toBeGreaterThan(0);
    expect(logEntries.every(entry => entry.processId === processId)).toBe(true);

    // Wait for process to complete naturally
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 3000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Verify final state
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
    expect(finalStatus.processes).toHaveLength(0);

    // Verify event sequence
    expect(processEvents.some(e => e.type === 'monitoring-started')).toBe(true);
    expect(processEvents.some(e => e.type === 'process-exited')).toBe(true);

    const exitEvent = processEvents.find(e => e.type === 'process-exited');
    expect(exitEvent.code).toBe(0);
    expect(exitEvent.processId).toBe(processId);

    // Verify log coordination
    expect(logEntries.length).toBeGreaterThan(5);
    expect(logEntries.some(entry => entry.level === 'error')).toBe(true);
    expect(logEntries.some(entry => entry.level === 'warn')).toBe(true);
    expect(logEntries.some(entry => entry.level === 'info')).toBe(true);
  });

  it('should handle manual process termination coordination', async () => {
    const logEntries: LogEntry[] = [];
    const processEvents: any[] = [];

    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    logMonitor.on('monitoring-started', (event) => {
      processEvents.push({ type: 'monitoring-started', ...event });
    });

    logMonitor.on('monitoring-stopped', (event) => {
      processEvents.push({ type: 'monitoring-stopped', ...event });
    });

    logMonitor.on('process-exited', (event) => {
      processEvents.push({ type: 'process-exited', ...event });
    });

    // Use a process that runs long enough to be manually terminated
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${testAppPath}" 5000 100`, // Run for 5 seconds
      { format: 'auto' }
    );

    // Wait for process to start and generate some logs
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify we received some logs (process was active)
    expect(logEntries.length).toBeGreaterThan(0);

    // Should have monitoring started event
    expect(processEvents.some(e => e.type === 'monitoring-started')).toBe(true);

    // Manually stop monitoring after enough time for logs but before natural completion
    await logMonitor.stopMonitoring(processId);

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify process was terminated
    const stoppedStatus = logMonitor.getMonitoringStatus();
    expect(stoppedStatus.activeProcesses).toBe(0);

    // Should have stop event from manual termination
    expect(processEvents.some(e => e.type === 'monitoring-stopped')).toBe(true);

    // Verify logs were captured before termination
    expect(logEntries.length).toBeGreaterThan(0);
    expect(logEntries.some(entry => entry.message.includes("Integration"))).toBe(true);
  });

  it('should coordinate multiple process instances simultaneously', async () => {
    const allLogEntries: LogEntry[] = [];
    const allProcessEvents: any[] = [];

    logMonitor.on('log-entry', (entry: LogEntry) => {
      allLogEntries.push(entry);
    });

    logMonitor.on('monitoring-started', (event) => {
      allProcessEvents.push({ type: 'monitoring-started', ...event });
    });

    logMonitor.on('process-exited', (event) => {
      allProcessEvents.push({ type: 'process-exited', ...event });
    });

    // Start multiple processes with different durations
    const processId1 = await logMonitor.startRealTimeMonitoring(
      `node "${quickExitAppPath}" 0 500`,
      { format: 'auto' }
    );

    const processId2 = await logMonitor.startRealTimeMonitoring(
      `node "${testAppPath}" 1000 100`,
      { format: 'auto' }
    );

    const processId3 = await logMonitor.startRealTimeMonitoring(
      `node "${quickExitAppPath}" 0 800`,
      { format: 'auto' }
    );

    // Verify all processes are tracked
    const activeStatus = logMonitor.getMonitoringStatus();
    expect(activeStatus.activeProcesses).toBe(3);
    expect(activeStatus.processes).toHaveLength(3);

    // Wait for all processes to complete
    await new Promise((resolve) => {
      let exitedCount = 0;
      const timeout = setTimeout(() => resolve(undefined), 3000);
      
      logMonitor.on('process-exited', () => {
        exitedCount++;
        if (exitedCount >= 3) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
    });

    // Verify all processes In Progress
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);

    // Verify events for all processes
    const startEvents = allProcessEvents.filter(e => e.type === 'monitoring-started');
    const exitEvents = allProcessEvents.filter(e => e.type === 'process-exited');

    expect(startEvents).toHaveLength(3);
    expect(exitEvents).toHaveLength(3);

    const processIds = [processId1, processId2, processId3];
    processIds.forEach(pid => {
      expect(startEvents.some(e => e.processId === pid)).toBe(true);
      expect(exitEvents.some(e => e.processId === pid)).toBe(true);
    });

    // Verify logs from different processes
    const processLogs = new Set(allLogEntries.map(entry => entry.processId));
    expect(processLogs.size).toBeGreaterThanOrEqual(2); // At least 2 processes generated logs

    // Verify proper exit codes
    exitEvents.forEach(event => {
      expect(event.code).toBe(0); // All should exit normally
    });
  });

  it('should coordinate error handling between LogMonitor and ProcessManager', async () => {
    const logEntries: LogEntry[] = [];
    const errorEvents: any[] = [];

    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    logMonitor.on('process-crashed', (event) => {
      errorEvents.push({ type: 'process-crashed', ...event });
    });

    logMonitor.on('process-error', (event) => {
      errorEvents.push({ type: 'process-error', ...event });
    });

    // Test different error scenarios
    const errorProcessId1 = await logMonitor.startRealTimeMonitoring(
      `node "${errorAppPath}" throw`,
      { format: 'auto' }
    );

    const errorProcessId2 = await logMonitor.startRealTimeMonitoring(
      `node "${errorAppPath}" exit`,
      { format: 'auto' }
    );

    // Wait for errors to occur
    await new Promise((resolve) => {
      let errorCount = 0;
      const timeout = setTimeout(() => resolve(undefined), 2000);
      
      const onError = () => {
        errorCount++;
        if (errorCount >= 2) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      };
      
      logMonitor.on('process-crashed', onError);
      logMonitor.on('process-error', onError);
    });

    // Verify error coordination
    expect(errorEvents.length).toBeGreaterThanOrEqual(2);
    
    const crashEvents = errorEvents.filter(e => e.type === 'process-crashed');
    expect(crashEvents.length).toBeGreaterThan(0);

    crashEvents.forEach(event => {
      expect([errorProcessId1, errorProcessId2]).toContain(event.processId);
      expect(event.code).not.toBe(0);
    });

    // Verify error logs were captured before crashes
    expect(logEntries.length).toBeGreaterThan(0);
    expect(logEntries.some(entry => entry.message.includes('Error app'))).toBe(true);

    // Verify cleanup after errors
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
  });

  it('should coordinate log level filtering with process management', async () => {
    const filteredEntries: LogEntry[] = [];
    const allEntries: LogEntry[] = [];

    // Set up filtered monitor
    const filteredMonitor = new LogMonitor();
    filteredMonitor.on('log-entry', (entry: LogEntry) => {
      filteredEntries.push(entry);
    });

    // Set up unfiltered monitor
    const unfilteredMonitor = new LogMonitor();
    unfilteredMonitor.on('log-entry', (entry: LogEntry) => {
      allEntries.push(entry);
    });

    try {
      // Start same process with different filters
      const filteredProcessId = await filteredMonitor.startRealTimeMonitoring(
        `node "${testAppPath}" 1000 100`,
        { 
          format: 'auto',
          logLevelFilter: ['error', 'warn']
        }
      );

      const unfilteredProcessId = await unfilteredMonitor.startRealTimeMonitoring(
        `node "${testAppPath}" 1000 100`,
        { format: 'auto' }
      );

      expect(filteredProcessId).toBeDefined();
      expect(unfilteredProcessId).toBeDefined();

      // Wait for processes to complete
      await Promise.all([
        new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(undefined), 2500);
          filteredMonitor.on('process-exited', () => {
            clearTimeout(timeout);
            resolve(undefined);
          });
        }),
        new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(undefined), 2500);
          unfilteredMonitor.on('process-exited', () => {
            clearTimeout(timeout);
            resolve(undefined);
          });
        })
      ]);

      // Verify filtering coordination
      expect(filteredEntries.length).toBeGreaterThan(0);
      expect(allEntries.length).toBeGreaterThan(filteredEntries.length);

      // Filtered logs should only contain error and warn
      filteredEntries.forEach(entry => {
        expect(['error', 'warn']).toContain(entry.level);
      });

      // Unfiltered logs should contain all levels
      const unfilteredLevels = new Set(allEntries.map(entry => entry.level));
      expect(unfilteredLevels.has('info')).toBe(true);
      expect(unfilteredLevels.has('error')).toBe(true);

      // Verify both processes In Progress In Progress
      const filteredStatus = filteredMonitor.getMonitoringStatus();
      const unfilteredStatus = unfilteredMonitor.getMonitoringStatus();
      
      expect(filteredStatus.activeProcesses).toBe(0);
      expect(unfilteredStatus.activeProcesses).toBe(0);

    } finally {
      await filteredMonitor.stopAllMonitoring();
      await unfilteredMonitor.stopAllMonitoring();
    }
  });

  it('should coordinate process state synchronization between components', async () => {
    const stateChanges: any[] = [];

    logMonitor.on('monitoring-started', (event) => {
      stateChanges.push({ 
        timestamp: Date.now(), 
        type: 'monitoring-started', 
        processId: event.processId 
      });
    });

    logMonitor.on('process-exited', (event) => {
      stateChanges.push({ 
        timestamp: Date.now(), 
        type: 'process-exited', 
        processId: event.processId 
      });
    });

    logMonitor.on('monitoring-stopped', (event) => {
      stateChanges.push({ 
        timestamp: Date.now(), 
        type: 'monitoring-stopped', 
        processId: event.processId 
      });
    });

    // Start a process
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${testAppPath}" 800 150`,
      { format: 'auto' }
    );

    // Check initial state
    let status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(1);
    expect(status.processes[0].processId).toBe(processId);
    expect(status.processes[0].status).toBe('running');

    // Wait for process completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 2000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Check final state
    status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(0);
    expect(status.processes).toHaveLength(0);

    // Verify state change sequence
    expect(stateChanges.length).toBeGreaterThanOrEqual(2);
    
    const startEvent = stateChanges.find(e => e.type === 'monitoring-started');
    const exitEvent = stateChanges.find(e => e.type === 'process-exited');
    
    expect(startEvent).toBeDefined();
    expect(exitEvent).toBeDefined();
    expect(startEvent.processId).toBe(processId);
    expect(exitEvent.processId).toBe(processId);
    expect(exitEvent.timestamp).toBeGreaterThan(startEvent.timestamp);

    // Verify proper chronological order
    const timestamps = stateChanges.map(e => e.timestamp);
    const sortedTimestamps = [...timestamps].sort();
    expect(timestamps).toEqual(sortedTimestamps);
  });
});