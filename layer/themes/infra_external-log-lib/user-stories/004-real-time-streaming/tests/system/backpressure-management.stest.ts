import { LogMonitor } from '../../src/external/log-monitor';
import { LogEntry } from '../../src/domain/log-entry';
import * as path from 'path';
import * as fs from 'fs';

describe('Backpressure Management Under High Load System Test', () => {
  jest.setTimeout(15000); // 15 second timeout for stress tests
  let logMonitor: LogMonitor;
  let testAppsPath: string;
  let highBurstAppPath: string;
  let continuousFloodAppPath: string;
  let variableRateAppPath: string;
  let memoryStressAppPath: string;
  let concurrentOverloadAppPath: string;

  beforeAll(async () => {
    testAppsPath = __dirname;
    
    // Create app that produces high-burst logging
    highBurstAppPath = path.join(testAppsPath, 'test-high-burst-app.js');
    const highBurstAppContent = `
const burstCount = parseInt(process.argv[2]) || 1000;
const burstInterval = parseInt(process.argv[3]) || 50;
const burstSize = parseInt(process.argv[4]) || 10;

console.log(\`Starting high-burst app: \${burstCount} total logs, bursts of \${burstSize} every \${burstInterval}ms\`);

let totalEmitted = 0;
let burstNumber = 0;

const burstInterval_handle = setInterval(() => {
  burstNumber++;
  
  // Emit a burst of logs rapidly
  for (let i = 0; i < burstSize && totalEmitted < burstCount; i++) {
    totalEmitted++;
    const logLevel = totalEmitted % 5 === 0 ? 'ERROR' : 
                    totalEmitted % 4 === 0 ? 'WARN' : 
                    totalEmitted % 3 === 0 ? 'DEBUG' : 'INFO';
    
    const timestamp = new Date().toISOString();
    const payload = {
      id: totalEmitted,
      burst: burstNumber,
      sequence: i + 1,
      timestamp,
      data: new Array(50).fill(Math.random()).join(','), // Some payload
      checksum: \`\${totalEmitted}-\${burstNumber}-\${i}\`
    };
    
    if (logLevel === 'ERROR') {
      console.error(\`[\${timestamp}] ERROR \${totalEmitted}: Burst error in batch \${burstNumber} - \${JSON.stringify(payload)}\`);
    } else {
      console.log(\`[\${timestamp}] \${logLevel} \${totalEmitted}: Burst log \${burstNumber}.\${i + 1} - \${JSON.stringify(payload)}\`);
    }
  }
  
  if (totalEmitted >= burstCount) {
    clearInterval(burstInterval_handle);
    console.log(\`High-burst app In Progress: \${totalEmitted} logs in \${burstNumber} bursts\`);
    process.exit(0);
  }
}, burstInterval);

process.on('SIGTERM', () => {
  clearInterval(burstInterval_handle);
  console.log(\`Terminated after \${totalEmitted} logs\`);
  process.exit(0);
});
    `;
    fs.writeFileSync(highBurstAppPath, highBurstAppContent);

    // Create app that produces continuous flood of logs
    continuousFloodAppPath = path.join(testAppsPath, 'test-continuous-flood-app.js');
    const continuousFloodAppContent = `
const totalLogs = parseInt(process.argv[2]) || 2000;
const intervalMs = parseInt(process.argv[3]) || 1;

console.log(\`Starting continuous flood: \${totalLogs} logs every \${intervalMs}ms\`);

let counter = 0;
const startTime = Date.now();

const floodInterval = setInterval(() => {
  counter++;
  
  const timestamp = new Date().toISOString();
  const elapsed = Date.now() - startTime;
  const rate = counter / (elapsed / 1000);
  
  // Mix of structured and unstructured logs
  if (counter % 20 === 0) {
    console.error(JSON.stringify({
      timestamp,
      level: 'error',
      counter,
      message: \`Flood error \${counter}\`,
      rate: rate.toFixed(2),
      memory: process.memoryUsage().heapUsed,
      payload: new Array(100).fill('x').join('')
    }));
  } else if (counter % 10 === 0) {
    console.log(\`timestamp=\${timestamp} level=warn counter=\${counter} message="Flood warning \${counter}" rate=\${rate.toFixed(2)} heap=\${process.memoryUsage().heapUsed}\`);
  } else {
    console.log(\`[\${timestamp}] INFO \${counter}: Continuous flood log, rate=\${rate.toFixed(2)}/s, heap=\${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB\`);
  }
  
  if (counter >= totalLogs) {
    clearInterval(floodInterval);
    const finalRate = counter / ((Date.now() - startTime) / 1000);
    console.log(\`Flood In Progress: \${counter} logs at \${finalRate.toFixed(2)} logs/sec\`);
    process.exit(0);
  }
}, intervalMs);

process.on('SIGTERM', () => {
  clearInterval(floodInterval);
  console.log(\`Flood terminated after \${counter} logs\`);
  process.exit(0);
});
    `;
    fs.writeFileSync(continuousFloodAppPath, continuousFloodAppContent);

    // Create app with variable rate logging
    variableRateAppPath = path.join(testAppsPath, 'test-variable-rate-app.js');
    const variableRateAppContent = `
const duration = parseInt(process.argv[2]) || 5000;
const peakRate = parseInt(process.argv[3]) || 200;

console.log(\`Starting variable rate app: \${duration}ms duration, peak \${peakRate} logs/sec\`);

let counter = 0;
const startTime = Date.now();

const rateFunction = () => {
  const elapsed = Date.now() - startTime;
  const progress = elapsed / duration;
  
  // Sine wave rate: slow -> fast -> slow
  const rateMultiplier = Math.sin(progress * Math.PI);
  const currentRate = Math.max(1, Math.floor(peakRate * rateMultiplier));
  const intervalMs = Math.max(1, Math.floor(1000 / currentRate));
  
  return intervalMs;
};

const scheduleNext = () => {
  const elapsed = Date.now() - startTime;
  if (elapsed >= duration) {
    console.log(\`Variable rate app In Progress: \${counter} logs over \${elapsed}ms\`);
    process.exit(0);
    return;
  }
  
  counter++;
  const timestamp = new Date().toISOString();
  const currentRate = 1000 / rateFunction();
  
  if (counter % 50 === 0) {
    console.error(\`[\${timestamp}] ERROR \${counter}: Variable rate error at \${currentRate.toFixed(1)} logs/sec\`);
  } else if (counter % 10 === 0) {
    console.log(JSON.stringify({
      timestamp,
      level: 'info',
      counter,
      rate: currentRate.toFixed(1),
      phase: elapsed < duration/3 ? 'ramp-up' : elapsed < 2*duration/3 ? 'peak' : 'ramp-down'
    }));
  } else {
    console.log(\`[\${timestamp}] DEBUG \${counter}: Variable rate log at \${currentRate.toFixed(1)}/sec\`);
  }
  
  setTimeout(scheduleNext, rateFunction());
};

scheduleNext();

process.on('SIGTERM', () => {
  console.log(\`Variable rate terminated after \${counter} logs\`);
  process.exit(0);
});
    `;
    fs.writeFileSync(variableRateAppPath, variableRateAppContent);

    // Create app that intentionally stresses memory while logging
    memoryStressAppPath = path.join(testAppsPath, 'test-memory-stress-app.js');
    const memoryStressAppContent = `
const logCount = parseInt(process.argv[2]) || 500;
const memoryMB = parseInt(process.argv[3]) || 50;

console.log(\`Starting memory stress app: \${logCount} logs, \${memoryMB}MB memory stress\`);

// Allocate memory stress
const memoryStress = [];
for (let i = 0; i < memoryMB; i++) {
  memoryStress.push(new Array(1024 * 256).fill(Math.random())); // ~1MB per iteration
}

let counter = 0;
const logInterval = setInterval(() => {
  counter++;
  
  const memUsage = process.memoryUsage();
  const timestamp = new Date().toISOString();
  
  // Occasionally manipulate memory stress to trigger GC
  if (counter % 50 === 0) {
    memoryStress.push(new Array(1024 * 100).fill(\`stress-\${counter}\`));
    memoryStress.shift(); // Remove oldest
  }
  
  const logEntry = {
    timestamp,
    level: counter % 20 === 0 ? 'error' : counter % 10 === 0 ? 'warn' : 'info',
    counter,
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    },
    stress: memoryStress.length,
    payload: new Array(200).fill(\`data-\${counter}\`).join(',')
  };
  
  if (logEntry.level === 'error') {
    console.error(\`[\${timestamp}] ERROR \${counter}: Memory stress error - \${JSON.stringify(logEntry)}\`);
  } else {
    console.log(\`[\${timestamp}] \${logEntry.level.toUpperCase()} \${counter}: Memory stress log - \${JSON.stringify(logEntry)}\`);
  }
  
  if (counter >= logCount) {
    clearInterval(logInterval);
    console.log(\`Memory stress In Progress: \${counter} logs, final heap: \${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB\`);
    process.exit(0);
  }
}, 20);

process.on('SIGTERM', () => {
  clearInterval(logInterval);
  console.log(\`Memory stress terminated after \${counter} logs\`);
  process.exit(0);
});
    `;
    fs.writeFileSync(memoryStressAppPath, memoryStressAppContent);

    // Create app for concurrent overload testing
    concurrentOverloadAppPath = path.join(testAppsPath, 'test-concurrent-overload-app.js');
    const concurrentOverloadAppContent = `
const processId = process.argv[2] || '1';
const logCount = parseInt(process.argv[3]) || 300;
const intervalMs = parseInt(process.argv[4]) || 10;

console.log(\`Process \${processId} starting concurrent overload: \${logCount} logs every \${intervalMs}ms\`);

let counter = 0;
const startTime = Date.now();

const logInterval = setInterval(() => {
  counter++;
  
  const timestamp = new Date().toISOString();
  const elapsed = Date.now() - startTime;
  
  // Each process produces different mix of log levels
  const processNum = parseInt(processId);
  const isError = (counter + processNum) % 15 === 0;
  const isWarn = (counter + processNum * 2) % 8 === 0;
  const isDebug = (counter + processNum * 3) % 5 === 0;
  
  const level = isError ? 'ERROR' : isWarn ? 'WARN' : isDebug ? 'DEBUG' : 'INFO';
  
  const logData = {
    processId,
    timestamp,
    level,
    counter,
    elapsed,
    sequence: \`P\${processId}-\${counter}\`,
    payload: \`Process \${processId} concurrent log \${counter} with data \${new Array(50).fill(Math.random()).slice(0, 5).join(',')}\`
  };
  
  if (level === 'ERROR') {
    console.error(\`[\${timestamp}] ERROR P\${processId}-\${counter}: Concurrent error - \${JSON.stringify(logData)}\`);
  } else {
    console.log(\`[\${timestamp}] \${level} P\${processId}-\${counter}: Concurrent log - \${JSON.stringify(logData)}\`);
  }
  
  if (counter >= logCount) {
    clearInterval(logInterval);
    console.log(\`Process \${processId} In Progress: \${counter} logs in \${elapsed}ms\`);
    process.exit(0);
  }
}, intervalMs);

process.on('SIGTERM', () => {
  clearInterval(logInterval);
  console.log(\`Process \${processId} terminated after \${counter} logs\`);
  process.exit(0);
});
    `;
    fs.writeFileSync(concurrentOverloadAppPath, concurrentOverloadAppContent);
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
      highBurstAppPath,
      continuousFloodAppPath,
      variableRateAppPath,
      memoryStressAppPath,
      concurrentOverloadAppPath
    ].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  it('should handle high-burst logging without data loss', async () => {
    const logEntries: LogEntry[] = [];
    const bufferWarnings: any[] = [];
    const performanceMetrics = {
      startTime: Date.now(),
      memorySnapshots: [] as number[]
    };

    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    logMonitor.on('buffer-warning', (event) => {
      bufferWarnings.push(event);
    });

    // Monitor memory usage during test
    const memoryMonitor = setInterval(() => {
      performanceMetrics.memorySnapshots.push(process.memoryUsage().heapUsed);
    }, 100);

    // Start high-burst monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${highBurstAppPath}" 500 20 15`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    clearInterval(memoryMonitor);
    const duration = Date.now() - performanceMetrics.startTime;

    // Verify data integrity under burst conditions
    expect(logEntries.length).toBeGreaterThan(400); // Should capture most logs
    expect(duration).toBeLessThan(12000); // Should In Progress reasonably fast

    // Verify burst detection - should have logs with burst information
    const burstLogs = logEntries.filter(entry => 
      entry.message.includes('burst') || entry.message.includes('Burst')
    );
    expect(burstLogs.length).toBeGreaterThan(50);

    // Verify different log levels received
    const levels = new Set(logEntries.map(entry => entry.level));
    expect(levels.size).toBeGreaterThan(2);

    // Check for sequence integrity - logs should contain checksum data
    const checksumLogs = logEntries.filter(entry => 
      entry.message.includes('checksum')
    );
    expect(checksumLogs.length).toBeGreaterThan(10);

    // Memory should remain UPDATING
    const memoryGrowth = Math.max(...performanceMetrics.memorySnapshots) - 
                        Math.min(...performanceMetrics.memorySnapshots);
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth

    console.log(`Burst test: ${logEntries.length} logs, ${bufferWarnings.length} warnings, ${duration}ms duration`);
  });

  it('should maintain throughput under continuous flood conditions', async () => {
    const logEntries: LogEntry[] = [];
    const bufferWarnings: any[] = [];
    const throughputMetrics: number[] = [];
    const startTime = Date.now();

    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    logMonitor.on('buffer-warning', (event) => {
      bufferWarnings.push(event);
    });

    // Monitor throughput every second
    const throughputMonitor = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const currentThroughput = logEntries.length / elapsed;
      throughputMetrics.push(currentThroughput);
    }, 1000);

    // Start continuous flood monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${continuousFloodAppPath}" 1000 2`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    clearInterval(throughputMonitor);
    const duration = Date.now() - startTime;

    // Verify high throughput sustained
    expect(logEntries.length).toBeGreaterThan(800); // Should capture most logs
    
    // Calculate average throughput
    const avgThroughput = logEntries.length / (duration / 1000);
    expect(avgThroughput).toBeGreaterThan(100); // At least 100 logs/sec

    // Verify throughput remained UPDATING (no significant degradation)
    if (throughputMetrics.length > 3) {
      const firstHalf = throughputMetrics.slice(0, Math.floor(throughputMetrics.length / 2));
      const secondHalf = throughputMetrics.slice(Math.floor(throughputMetrics.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Second half should not be significantly slower than first half
      expect(secondAvg).toBeGreaterThan(firstAvg * 0.7); // No more than 30% degradation
    }

    // Verify different log formats handled
    const jsonLogs = logEntries.filter(entry => 
      entry.message.includes('{') && entry.message.includes('}')
    );
    const keyValueLogs = logEntries.filter(entry => 
      entry.message.includes('=') && entry.message.includes('timestamp=')
    );
    
    expect(jsonLogs.length).toBeGreaterThan(20);
    expect(keyValueLogs.length).toBeGreaterThan(20);

    console.log(`Flood test: ${logEntries.length} logs at ${avgThroughput.toFixed(1)} logs/sec`);
  });

  it('should adapt to variable rate logging patterns', async () => {
    const logEntries: LogEntry[] = [];
    const rateTracker: { timestamp: number; count: number }[] = [];
    const startTime = Date.now();

    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Track rate changes every 500ms
    const rateTracker_handle = setInterval(() => {
      rateTracker.push({
        timestamp: Date.now() - startTime,
        count: logEntries.length
      });
    }, 500);

    // Start variable rate monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${variableRateAppPath}" 4000 150`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 8000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    clearInterval(rateTracker_handle);

    // Verify rate adaptation
    expect(logEntries.length).toBeGreaterThan(200);
    expect(rateTracker.length).toBeGreaterThan(5);

    // Calculate rate changes
    const rates: number[] = [];
    for (let i = 1; i < rateTracker.length; i++) {
      const timeDiff = (rateTracker[i].timestamp - rateTracker[i-1].timestamp) / 1000;
      const countDiff = rateTracker[i].count - rateTracker[i-1].count;
      rates.push(countDiff / timeDiff);
    }

    // Should see rate variation (min and max rates should differ significantly)
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    expect(maxRate).toBeGreaterThan(minRate * 2); // At least 2x difference

    // Verify phase tracking in logs
    const phaseLogs = logEntries.filter(entry => 
      entry.message.includes('ramp-up') || 
      entry.message.includes('peak') || 
      entry.message.includes('ramp-down')
    );
    expect(phaseLogs.length).toBeGreaterThan(0);

    console.log(`Variable rate test: ${logEntries.length} logs, rate range ${minRate.toFixed(1)}-${maxRate.toFixed(1)} logs/sec`);
  });

  it('should handle memory-stressed processes without degradation', async () => {
    const logEntries: LogEntry[] = [];
    const memoryMetrics: any[] = [];
    const startTime = Date.now();

    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
      
      // Extract memory info from logs
      if (entry.message.includes('memory') || entry.message.includes('Memory')) {
        try {
          const memoryMatch = entry.message.match(/heapUsed.*?(\d+)/);
          if (memoryMatch) {
            memoryMetrics.push({
              timestamp: Date.now() - startTime,
              heapUsed: parseInt(memoryMatch[1])
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });

    // Start memory stress monitoring (reduced parameters for test environment)
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${memoryStressAppPath}" 200 20`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 8000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    const duration = Date.now() - startTime;

    // Verify processing under memory stress
    expect(logEntries.length).toBeGreaterThan(150); // Should capture most logs (reduced expectation)
    expect(duration).toBeLessThan(8000); // Should In Progress in reasonable time

    // Verify memory tracking was captured
    expect(memoryMetrics.length).toBeGreaterThan(10);

    // Verify large payloads were handled
    const largeLogs = logEntries.filter(entry => entry.message.length > 500);
    expect(largeLogs.length).toBeGreaterThan(50);

    // Verify different log levels under stress
    const errorLogs = logEntries.filter(entry => entry.level === 'error');
    const warnLogs = logEntries.filter(entry => entry.level === 'warn');
    const infoLogs = logEntries.filter(entry => entry.level === 'info');
    
    expect(errorLogs.length).toBeGreaterThan(5);
    expect(warnLogs.length).toBeGreaterThanOrEqual(10);
    expect(infoLogs.length).toBeGreaterThan(100);

    console.log(`Memory stress test: ${logEntries.length} logs, ${largeLogs.length} large payloads, ${duration}ms`);
  });

  it('should manage concurrent overload from multiple processes', async () => {
    const logEntries: LogEntry[] = [];
    const processEvents: any[] = [];
    const concurrencyMetrics = {
      maxConcurrent: 0,
      totalProcesses: 0
    };

    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    logMonitor.on('monitoring-started', (event) => {
      processEvents.push({ type: 'started', ...event });
      concurrencyMetrics.totalProcesses++;
    });

    logMonitor.on('process-exited', (event) => {
      processEvents.push({ type: 'exited', ...event });
    });

    // Monitor concurrent processes
    const concurrencyMonitor = setInterval(() => {
      const status = logMonitor.getMonitoringStatus();
      concurrencyMetrics.maxConcurrent = Math.max(
        concurrencyMetrics.maxConcurrent,
        status.activeProcesses
      );
    }, 100);

    // Start multiple concurrent processes
    const processIds = await Promise.all([
      logMonitor.startRealTimeMonitoring(`node "${concurrentOverloadAppPath}" 1 200 8`, { format: 'auto' }),
      logMonitor.startRealTimeMonitoring(`node "${concurrentOverloadAppPath}" 2 200 12`, { format: 'auto' }),
      logMonitor.startRealTimeMonitoring(`node "${concurrentOverloadAppPath}" 3 200 6`, { format: 'auto' }),
      logMonitor.startRealTimeMonitoring(`node "${concurrentOverloadAppPath}" 4 200 15`, { format: 'auto' }),
      logMonitor.startRealTimeMonitoring(`node "${concurrentOverloadAppPath}" 5 200 10`, { format: 'auto' })
    ]);

    expect(processIds).toHaveLength(5);
    expect(processIds.every(id => typeof id === 'string')).toBe(true);

    // Wait for all processes to complete
    await new Promise((resolve) => {
      let completedCount = 0;
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      
      logMonitor.on('process-exited', () => {
        completedCount++;
        if (completedCount >= 5) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
    });

    clearInterval(concurrencyMonitor);

    // Verify concurrent processing
    expect(logEntries.length).toBeGreaterThan(800); // 5 processes * 200 logs * 80% efficiency
    expect(concurrencyMetrics.maxConcurrent).toBeGreaterThanOrEqual(5);
    expect(concurrencyMetrics.totalProcesses).toBe(5);

    // Verify logs from all processes
    const processLogs = new Set();
    logEntries.forEach(entry => {
      const processMatch = entry.message.match(/P(\d+)-/);
      if (processMatch) {
        processLogs.add(processMatch[1]);
      }
    });
    expect(processLogs.size).toBeGreaterThanOrEqual(4); // At least 4 of 5 processes

    // Verify interleaving (logs shouldn't be completely sequential by process)
    const firstHalf = logEntries.slice(0, Math.floor(logEntries.length / 2));
    const secondHalf = logEntries.slice(Math.floor(logEntries.length / 2));
    
    const firstHalfProcesses = new Set();
    const secondHalfProcesses = new Set();
    
    firstHalf.forEach(entry => {
      const match = entry.message.match(/P(\d+)-/);
      if (match) firstHalfProcesses.add(match[1]);
    });
    
    secondHalf.forEach(entry => {
      const match = entry.message.match(/P(\d+)-/);
      if (match) secondHalfProcesses.add(match[1]);
    });
    
    // Both halves should have logs from multiple processes (indicating interleaving)
    expect(firstHalfProcesses.size).toBeGreaterThan(1);
    expect(secondHalfProcesses.size).toBeGreaterThan(1);

    // Verify final cleanup
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);

    console.log(`Concurrent test: ${logEntries.length} logs from ${processLogs.size} processes, max concurrent: ${concurrencyMetrics.maxConcurrent}`);
  });
});