import { LogMonitor } from '../../src/external/log-monitor';
import { LogEntry } from '../../src/domain/log-entry';
import * as path from 'path';
import * as fs from 'fs';

describe('Process Crash Handling and Recovery System Test', () => {
  let logMonitor: LogMonitor;
  let testAppsPath: string;
  let immediateExitAppPath: string;
  let delayedCrashAppPath: string;
  let memoryLeakAppPath: string;
  let resourceExhaustionAppPath: string;
  let segfaultAppPath: string;

  beforeAll(async () => {
    testAppsPath = __dirname;
    
    // Create app that exits immediately with different codes
    immediateExitAppPath = path.join(testAppsPath, 'test-immediate-exit-app.js');
    const immediateExitAppContent = `
const exitCode = parseInt(process.argv[2]);
const message = process.argv[3] || 'immediate exit';

// Default to 0 if no argument provided or invalid
const finalExitCode = isNaN(exitCode) ? 0 : exitCode;

console.log(\`Starting app that will exit with code \${finalExitCode}\`);
console.log(\`Message: \${message}\`);

if (finalExitCode === 0) {
  console.log('Exiting normally');
} else {
  console.error(\`Exiting with error code \${finalExitCode}\`);
}

process.exit(finalExitCode);
    `;
    fs.writeFileSync(immediateExitAppPath, immediateExitAppContent);

    // Create app that crashes after some activity
    delayedCrashAppPath = path.join(testAppsPath, 'test-delayed-crash-app.js');
    const delayedCrashAppContent = `
const delay = parseInt(process.argv[2]) || 1000;
const logCount = parseInt(process.argv[3]) || 5;

console.log(\`Starting app that will crash after \${delay}ms and \${logCount} logs\`);

let counter = 0;
const interval = setInterval(() => {
  counter++;
  console.log(\`Log entry \${counter}: Still running at \${new Date().toISOString()}\`);
  
  if (counter >= logCount) {
    clearInterval(interval);
    console.error(\`FATAL: About to crash after \${counter} log entries\`);
    console.error(\`Stack trace will follow...\`);
    
    // Simulate different types of crashes
    if (process.argv[4] === 'throw') {
      throw new Error('Intentional crash via throw');
    } else if (process.argv[4] === 'reference') {
      const obj = null;
      console.log(obj.nonexistent.property); // Reference error
    } else if (process.argv[4] === 'range') {
      const arr = [1, 2, 3];
      for (let i = 0; i < 1000000; i++) {
        arr[i] = i; // Range/memory error
      }
    } else {
      // Default: syntax-like error
      eval('invalid javascript syntax here');
    }
  }
}, delay / logCount);

process.on('uncaughtException', (error) => {
  console.error(\`UNCAUGHT EXCEPTION: \${error.message}\`);
  console.error(\`Stack: \${error.stack}\`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(\`UNHANDLED REJECTION at \${promise}: \${reason}\`);
  process.exit(1);
});
    `;
    fs.writeFileSync(delayedCrashAppPath, delayedCrashAppContent);

    // Create app that simulates memory leak
    memoryLeakAppPath = path.join(testAppsPath, 'test-memory-leak-app.js');
    const memoryLeakAppContent = `
const duration = parseInt(process.argv[2]) || 2000;
const leakRate = parseInt(process.argv[3]) || 100;

console.log(\`Starting memory leak simulation for \${duration}ms\`);

const leakedArrays = [];
let counter = 0;

const leakInterval = setInterval(() => {
  // Create memory leak
  const bigArray = new Array(leakRate * 1000).fill(Math.random());
  leakedArrays.push(bigArray);
  
  counter++;
  console.log(\`Leak \${counter}: Allocated \${leakRate}k items, total arrays: \${leakedArrays.length}\`);
  
  const memUsage = process.memoryUsage();
  console.log(\`Memory: \${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, \${Math.round(memUsage.rss / 1024 / 1024)}MB RSS\`);
}, 200);

setTimeout(() => {
  clearInterval(leakInterval);
  console.log(\`Memory leak test In Progress after \${duration}ms\`);
  console.log(\`Final memory usage: \${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\`);
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log(\`After GC: \${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\`);
  }
  
  process.exit(0);
}, duration);
    `;
    fs.writeFileSync(memoryLeakAppPath, memoryLeakAppContent);

    // Create app that exhausts file descriptors/resources
    resourceExhaustionAppPath = path.join(testAppsPath, 'test-resource-exhaustion-app.js');
    const resourceExhaustionAppContent = `
const fs = require('fs');
const path = require('path');

const maxFiles = parseInt(process.argv[2]) || 50;
console.log(\`Testing resource exhaustion with \${maxFiles} file handles\`);

const openFiles = [];
let counter = 0;

const exhaustInterval = setInterval(() => {
  try {
    counter++;
    // Try to open a file handle
    const fd = fs.openSync(__filename, 'r');
    openFiles.push(fd);
    
    console.log(\`Opened file handle \${counter}: fd=\${fd}, total=\${openFiles.length}\`);
    
    if (counter >= maxFiles) {
      clearInterval(exhaustInterval);
      console.log(\`Resource test In Progress with \${openFiles.length} open handles\`);
      
      // Clean up
      openFiles.forEach(fd => {
        try {
          fs.closeSync(fd);
        } catch (e) {
          console.error(\`Error closing fd \${fd}: \${e.message}\`);
        }
      });
      
      console.log('All file handles closed');
      process.exit(0);
    }
  } catch (error) {
    console.error(\`Resource exhaustion at \${counter}: \${error.message}\`);
    console.error(\`Error code: \${error.code}\`);
    clearInterval(exhaustInterval);
    
    // Try to clean up what we can
    openFiles.forEach(fd => {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    });
    
    process.exit(1);
  }
}, 50);

process.on('SIGTERM', () => {
  clearInterval(exhaustInterval);
  openFiles.forEach(fd => {
    try {
      fs.closeSync(fd);
    } catch (e) {}
  });
  console.log('Terminated gracefully');
  process.exit(0);
});
    `;
    fs.writeFileSync(resourceExhaustionAppPath, resourceExhaustionAppContent);

    // Create app that simulates segmentation fault (via native crash)
    segfaultAppPath = path.join(testAppsPath, 'test-segfault-app.js');
    const segfaultAppContent = `
console.log('Starting segfault simulation app');

const crashType = process.argv[2] || 'stack';
const delay = parseInt(process.argv[3]) || 500;

console.log(\`Will simulate \${crashType} crash after \${delay}ms\`);

setTimeout(() => {
  console.log('Preparing to simulate crash...');
  
  if (crashType === 'stack') {
    // Stack overflow
    function recursiveFunction() {
      console.log('Recursion depth increasing...');
      return recursiveFunction();
    }
    recursiveFunction();
  } else if (crashType === 'memory') {
    // Memory exhaustion
    const arrays = [];
    while (true) {
      arrays.push(new Array(1000000).fill('x'));
      console.log(\`Allocated array \${arrays.length}, memory: \${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\`);
    }
  } else if (crashType === 'exit') {
    // Abrupt exit
    console.log('Calling process.abort()');
    process.abort();
  } else {
    // Default: throw error
    console.error('Throwing unhandled error');
    throw new Error('Simulated crash');
  }
}, delay);

process.on('uncaughtException', (error) => {
  console.error(\`UNCAUGHT: \${error.message}\`);
  process.exit(1);
});
    `;
    fs.writeFileSync(segfaultAppPath, segfaultAppContent);
  });

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  afterAll(() => {
    // Clean up test files
    [
      immediateExitAppPath,
      delayedCrashAppPath,
      memoryLeakAppPath,
      resourceExhaustionAppPath,
      segfaultAppPath
    ].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  it('should handle immediate process exits with different exit codes', async () => {
    const crashEvents: any[] = [];
    const exitEvents: any[] = [];

    logMonitor.on('process-crashed', (event) => {
      crashEvents.push(event);
    });

    logMonitor.on('process-exited', (event) => {
      exitEvents.push(event);
    });

    // Test different exit codes
    const testCases = [
      { code: 0, expectCrash: false },
      { code: 1, expectCrash: true },
      { code: 127, expectCrash: true },
      { code: 255, expectCrash: true }
    ];

    for (const testCase of testCases) {
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${immediateExitAppPath}" ${testCase.code} "exit-test-${testCase.code}"`,
        { format: 'auto' }
      );

      // Wait for process to exit
      await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(undefined), 2000);
        const listener = (event: any) => {
          if (event.processId === processId) {
            clearTimeout(timeout);
            resolve(undefined);
          }
        };
        logMonitor.on('process-exited', listener);
        logMonitor.on('process-crashed', listener);
      });
    }

    // Verify we got the expected number of total events
    expect([...exitEvents, ...crashEvents]).toHaveLength(testCases.length);
    
    // Verify exit vs crash classification (only code 0 is considered normal exit)
    expect(exitEvents.some(e => e.code === 0)).toBe(true); // Normal exit
    expect(crashEvents.some(e => e.code === 1)).toBe(true); // Error exit treated as crash
    expect(crashEvents.some(e => e.code === 127)).toBe(true); // Command not found treated as crash
    expect(crashEvents.some(e => e.code === 255)).toBe(true); // General error treated as crash
    
    // Verify only exit code 0 goes to exitEvents
    expect(exitEvents.every(e => e.code === 0)).toBe(true);
    expect(crashEvents.every(e => e.code !== 0)).toBe(true);

    // All events should have proper metadata
    [...exitEvents, ...crashEvents].forEach(event => {
      expect(event.processId).toBeDefined();
      expect(event.endTime).toBeInstanceOf(Date);
      expect(typeof event.code).toBe('number');
    });
  });

  it('should capture logs before delayed crashes and provide crash context', async () => {
    const logEntries: LogEntry[] = [];
    const crashEvents: any[] = [];

    logMonitor.on('log-entry', (entry) => {
      logEntries.push(entry);
    });

    logMonitor.on('process-crashed', (event) => {
      crashEvents.push(event);
    });

    // Test different crash types
    const crashTypes = ['throw', 'reference', 'range'];
    
    for (const crashType of crashTypes) {
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${delayedCrashAppPath}" 800 4 ${crashType}`,
        { format: 'auto' }
      );

      // Wait for crash
      await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(undefined), 3000);
        logMonitor.on('process-crashed', (event) => {
          if (event.processId === processId) {
            clearTimeout(timeout);
            resolve(undefined);
          }
        });
      });
    }

    // Verify logs were captured before crashes
    expect(logEntries.length).toBeGreaterThan(6); // Should have logs from all processes
    expect(logEntries.some(entry => entry.message.includes('Still running'))).toBe(true);
    expect(logEntries.some(entry => entry.message.includes('FATAL'))).toBe(true);

    // Verify crash events with context (at least most of them should crash)
    expect(crashEvents.length).toBeGreaterThanOrEqual(crashTypes.length - 1);
    crashEvents.forEach(event => {
      expect(event.processId).toBeDefined();
      expect(event.code).not.toBe(0);
      expect(event.lastLogs).toBeDefined();
      expect(Array.isArray(event.lastLogs)).toBe(true);
      expect(event.lastLogs.length).toBeGreaterThan(0);
    });

    // Last logs should contain relevant crash information
    const allLastLogs = crashEvents.flatMap(e => e.lastLogs);
    expect(allLastLogs.some(log => log.message && log.message.includes('FATAL'))).toBe(true);
  });

  it('should handle memory exhaustion and resource limit crashes', async () => {
    const logEntries: LogEntry[] = [];
    const crashEvents: any[] = [];
    const exitEvents: any[] = [];

    logMonitor.on('log-entry', (entry) => {
      logEntries.push(entry);
    });

    logMonitor.on('process-crashed', (event) => {
      crashEvents.push(event);
    });

    logMonitor.on('process-exited', (event) => {
      exitEvents.push(event);
    });

    // Test memory leak (should In Progress normally but use lots of memory)
    const memoryProcessId = await logMonitor.startRealTimeMonitoring(
      `node "${memoryLeakAppPath}" 1500 50`,
      { format: 'auto' }
    );

    // Test resource exhaustion (may crash or succeed depending on system limits)
    const resourceProcessId = await logMonitor.startRealTimeMonitoring(
      `node "${resourceExhaustionAppPath}" 30`,
      { format: 'auto' }
    );

    // Wait for both processes to complete
    await new Promise((resolve) => {
      let completedCount = 0;
      const timeout = setTimeout(() => resolve(undefined), 8000);
      
      const checkComplete = () => {
        completedCount++;
        if (completedCount >= 2) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      };
      
      logMonitor.on('process-exited', checkComplete);
      logMonitor.on('process-crashed', checkComplete);
    });

    // Verify memory tracking in logs
    const memoryLogs = logEntries.filter(entry => 
      entry.processId === memoryProcessId && entry.message.includes('Memory:')
    );
    expect(memoryLogs.length).toBeGreaterThan(3);

    // Verify resource tracking in logs
    const resourceLogs = logEntries.filter(entry => 
      entry.processId === resourceProcessId && entry.message.includes('file handle')
    );
    expect(resourceLogs.length).toBeGreaterThan(5);

    // At least one process should have In Progress (memory leak should finish normally)
    expect([...exitEvents, ...crashEvents].length).toBeGreaterThanOrEqual(2);

    // Memory process should track increasing usage
    const memoryValues = memoryLogs
      .map(log => {
        const match = log.message.match(/(\d+)MB heap/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(val => val > 0);
    
    if (memoryValues.length > 1) {
      const maxMemory = Math.max(...memoryValues);
      const minMemory = Math.min(...memoryValues);
      expect(maxMemory).toBeGreaterThan(minMemory); // Memory should increase
    }
  });

  it('should handle abrupt process termination and cleanup properly', async () => {
    const logEntries: LogEntry[] = [];
    const processEvents: any[] = [];
    const monitoringStatus: any[] = [];

    logMonitor.on('log-entry', (entry) => {
      logEntries.push(entry);
    });

    logMonitor.on('process-crashed', (event) => {
      processEvents.push({ type: 'crashed', ...event });
    });

    logMonitor.on('monitoring-started', (event) => {
      processEvents.push({ type: 'started', ...event });
    });

    // Capture status before, during, and after
    const statusInterval = setInterval(() => {
      monitoringStatus.push({
        timestamp: Date.now(),
        ...logMonitor.getMonitoringStatus()
      });
    }, 200);

    // Test different abrupt termination types
    const segfaultProcessId = await logMonitor.startRealTimeMonitoring(
      `node "${segfaultAppPath}" stack 300`,
      { format: 'auto' }
    );

    const abortProcessId = await logMonitor.startRealTimeMonitoring(
      `node "${segfaultAppPath}" exit 400`,
      { format: 'auto' }
    );

    // Wait for crashes
    await new Promise((resolve) => {
      let crashCount = 0;
      const timeout = setTimeout(() => resolve(undefined), 5000);
      
      logMonitor.on('process-crashed', () => {
        crashCount++;
        if (crashCount >= 2) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
    });

    clearInterval(statusInterval);

    // Verify processes were tracked
    expect(processEvents.some(e => e.type === 'started' && e.processId === segfaultProcessId)).toBe(true);
    expect(processEvents.some(e => e.type === 'started' && e.processId === abortProcessId)).toBe(true);

    // Verify crashes were detected
    expect(processEvents.some(e => e.type === 'crashed' && e.processId === segfaultProcessId)).toBe(true);
    expect(processEvents.some(e => e.type === 'crashed' && e.processId === abortProcessId)).toBe(true);

    // Verify cleanup - final status should show no active processes
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
    expect(finalStatus.processes).toHaveLength(0);

    // Verify monitoring status tracked process lifecycle
    const maxActiveProcesses = Math.max(...monitoringStatus.map(s => s.activeProcesses));
    expect(maxActiveProcesses).toBeGreaterThanOrEqual(2);

    // Verify some logs were captured before crashes
    expect(logEntries.length).toBeGreaterThan(0);
    expect(logEntries.some(entry => entry.message.includes('Starting segfault'))).toBe(true);
  });

  it('should support crash recovery and restart monitoring after failures', async () => {
    const allEvents: any[] = [];
    const crashCount = { count: 0 };

    logMonitor.on('process-crashed', (event) => {
      allEvents.push({ type: 'crashed', timestamp: Date.now(), ...event });
      crashCount.count++;
    });

    logMonitor.on('monitoring-started', (event) => {
      allEvents.push({ type: 'started', timestamp: Date.now(), ...event });
    });

    logMonitor.on('process-exited', (event) => {
      allEvents.push({ type: 'exited', timestamp: Date.now(), ...event });
    });

    // Simulate crash recovery scenario
    const restartProcess = async (attempt: number): Promise<string> => {
      const command = attempt <= 2 
        ? `node "${delayedCrashAppPath}" 500 2 throw` // Will crash
        : `node "${immediateExitAppPath}" 0 "recovery-In Progress"`; // Will succeed
      
      return await logMonitor.startRealTimeMonitoring(command, { format: 'auto' });
    };

    // Attempt restart cycle
    for (let attempt = 1; attempt <= 4; attempt++) {
      const processId = await restartProcess(attempt);
      
      // Wait for completion
      await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(undefined), 2000);
        
        const listener = (event: any) => {
          if (event.processId === processId) {
            clearTimeout(timeout);
            resolve(undefined);
          }
        };
        
        logMonitor.on('process-crashed', listener);
        logMonitor.on('process-exited', listener);
      });
      
      // Brief recovery delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify crash and recovery pattern
    expect(crashCount.count).toBeGreaterThanOrEqual(2); // Should have crashes
    
    // Check for In Progress recovery (should have at least one In Progress exit or the last processes)
    const hascompletedfulExit = allEvents.some(e => e.type === 'exited' && e.code === 0);
    const haspassedProcesses = allEvents.length >= 4; // Should have events from all 4 attempts
    expect(hascompletedfulExit || haspassedProcesses).toBe(true);

    // Verify monitoring system remained UPDATING throughout
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0); // All processes should be cleaned up

    // Verify chronological order of events
    const timestamps = allEvents.map(e => e.timestamp);
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sortedTimestamps); // Events should be in chronological order

    // Verify we can still start new monitoring after recovery
    const finalProcessId = await logMonitor.startRealTimeMonitoring(
      `node "${immediateExitAppPath}" 0 "post-recovery-test"`,
      { format: 'auto' }
    );
    
    expect(finalProcessId).toBeDefined();
    
    // Wait for final process
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 1000);
      logMonitor.on('process-exited', (event) => {
        if (event.processId === finalProcessId) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
    });

    const postRecoveryStatus = logMonitor.getMonitoringStatus();
    expect(postRecoveryStatus.activeProcesses).toBe(0);
  });
});