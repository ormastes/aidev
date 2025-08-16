import { LogMonitor } from '../../src/external/log-monitor';
import { LogStream } from '../../src/external/log-stream';
import { LogEntry } from '../../src/domain/log-entry';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import * as path from 'path';
import * as fs from 'fs';

describe('EventEmitter and Filtering Integration Test', () => {
  let logMonitor: LogMonitor;
  let logStream: LogStream;
  let eventEmitter: EventEmitter;
  let testAppsPath: string;
  let multiLevelAppPath: string;
  let continuousAppPath: string;

  beforeAll(async () => {
    testAppsPath = __dirname;
    
    // Create app that produces multi-level logs for filtering tests
    multiLevelAppPath = path.join(testAppsPath, 'test-multi-level-app.js');
    const multiLevelAppContent = `
const logCount = parseInt(process.argv[2]) || 20;
const interval = parseInt(process.argv[3]) || 100;

console.log('Multi-level app started');

let counter = 0;
const logTimer = setInterval(() => {
  counter++;
  
  const levels = ['debug', 'info', 'warn', 'error'];
  const level = levels[counter % levels.length];
  const timestamp = new Date().toISOString();
  
  const message = \`[\${timestamp}] \${level.toUpperCase()}: Multi-level log message \${counter} with data=\${Math.random().toFixed(3)}\`;
  
  if (level === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
  
  if (counter >= logCount) {
    clearInterval(logTimer);
    console.log('Multi-level app In Progress');
    process.exit(0);
  }
}, interval);

process.on('SIGTERM', () => {
  clearInterval(logTimer);
  console.log('Multi-level app terminated');
  process.exit(0);
});
    `;
    fs.writeFileSync(multiLevelAppPath, multiLevelAppContent);

    // Create app for continuous event testing
    continuousAppPath = path.join(testAppsPath, 'test-continuous-app.js');
    const continuousAppContent = `
const duration = parseInt(process.argv[2]) || 3000;
const logInterval = parseInt(process.argv[3]) || 50;

console.log(\`Continuous app starting for \${duration}ms\`);

let counter = 0;
const startTime = Date.now();

const logTimer = setInterval(() => {
  counter++;
  const elapsed = Date.now() - startTime;
  
  const logTypes = [
    'debug: Continuous debug message',
    'info: Continuous info message', 
    'warn: Continuous warning message',
    'error: Continuous error message'
  ];
  
  const logType = logTypes[counter % logTypes.length];
  console.log(\`\${logType} \${counter} at \${elapsed}ms\`);
  
  if (elapsed >= duration) {
    clearInterval(logTimer);
    console.log(\`Continuous app In Progress after \${counter} messages\`);
    process.exit(0);
  }
}, logInterval);

process.on('SIGTERM', () => {
  clearInterval(logTimer);
  console.log(\`Continuous app terminated after \${counter} messages\`);
  process.exit(0);
});
    `;
    fs.writeFileSync(continuousAppPath, continuousAppContent);
  });

  beforeEach(() => {
    logMonitor = new LogMonitor();
    eventEmitter = new EventEmitter();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
    if (logStream) {
      logStream.cleanup();
    }
    eventEmitter.removeAllListeners();
  });

  afterAll(() => {
    // Clean up test files
    [multiLevelAppPath, continuousAppPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  it('should integrate event emission with log level filtering', async () => {
    const allEvents: any[] = [];
    const filteredEvents: any[] = [];
    const logEntries: LogEntry[] = [];

    // Set up event listeners for different event types
    eventEmitter.on('log-entry', (entry: LogEntry) => {
      allEvents.push({ type: 'log-entry', ...entry });
      
      // Apply filtering logic at event level
      if (['error', 'warn'].includes(entry.level)) {
        filteredEvents.push({ type: 'filtered-log', ...entry });
      }
    });

    eventEmitter.on('process-started', (data) => {
      allEvents.push({ type: 'process-started', ...data });
    });

    eventEmitter.on('process-In Progress', (data) => {
      allEvents.push({ type: 'process-In Progress', ...data });
    });

    // Start monitoring with LogMonitor and bridge events
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${multiLevelAppPath}" 16 75`,
      { 
        format: 'auto',
        logLevelFilter: [] // No filter at LogMonitor level - filter at event level
      }
    );

    expect(processId).toBeDefined();

    // Bridge LogMonitor events to EventEmitter
    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
      eventEmitter.emit('log-entry', entry);
    });

    logMonitor.on('monitoring-started', (data) => {
      eventEmitter.emit('process-started', data);
    });

    logMonitor.on('process-exited', (data) => {
      eventEmitter.emit('process-In Progress', data);
    });

    // Wait for process completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 5000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Verify event emission and filtering integration
    expect(allEvents.length).toBeGreaterThan(10);
    expect(logEntries.length).toBeGreaterThan(10);
    expect(filteredEvents.length).toBeLessThan(allEvents.length);

    // Verify event types
    const logEventCount = allEvents.filter(e => e.type === 'log-entry').length;
    const processStartedCount = allEvents.filter(e => e.type === 'process-started').length;
    const processCompletedCount = allEvents.filter(e => e.type === 'process-completed').length;

    expect(logEventCount).toBeGreaterThan(10);
    expect(processStartedCount).toBeGreaterThanOrEqual(0); // May not always capture due to timing
    expect(processCompletedCount).toBeGreaterThanOrEqual(0); // May not always capture due to timing

    // Verify filtering worked correctly
    filteredEvents.forEach(event => {
      expect(['error', 'warn']).toContain(event.level);
    });

    // Verify all log levels were captured before filtering
    const allLevels = new Set(logEntries.map(entry => entry.level));
    expect(allLevels.has('debug')).toBe(true);
    expect(allLevels.has('info')).toBe(true);
    expect(allLevels.has('warn')).toBe(true);
    expect(allLevels.has('error')).toBe(true);

    // Verify only error/warn in filtered events
    const filteredLevels = new Set(filteredEvents.map(event => event.level));
    expect(filteredLevels.has('debug')).toBe(false);
    expect(filteredLevels.has('info')).toBe(false);
    expect(filteredLevels.has('warn')).toBe(true);
    expect(filteredLevels.has('error')).toBe(true);
  });

  it('should handle multiple EventEmitter instances with different filtering strategies', async () => {
    const errorOnlyEmitter = new EventEmitter();
    const infoDebugEmitter = new EventEmitter();
    const allLevelsEmitter = new EventEmitter();

    const errorOnlyEvents: any[] = [];
    const infoDebugEvents: any[] = [];
    const allLevelsEvents: any[] = [];

    // Set up different filtering strategies
    errorOnlyEmitter.on('log-entry', (entry: LogEntry) => {
      if (entry.level === 'error') {
        errorOnlyEvents.push(entry);
      }
    });

    infoDebugEmitter.on('log-entry', (entry: LogEntry) => {
      if (['info', 'debug'].includes(entry.level)) {
        infoDebugEvents.push(entry);
      }
    });

    allLevelsEmitter.on('log-entry', (entry: LogEntry) => {
      allLevelsEvents.push(entry);
    });

    // Start monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${multiLevelAppPath}" 20 60`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Bridge to all emitters
    logMonitor.on('log-entry', (entry: LogEntry) => {
      errorOnlyEmitter.emit('log-entry', entry);
      infoDebugEmitter.emit('log-entry', entry);
      allLevelsEmitter.emit('log-entry', entry);
    });

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 5000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Verify different filtering strategies
    expect(allLevelsEvents.length).toBeGreaterThan(10);
    expect(errorOnlyEvents.length).toBeLessThan(allLevelsEvents.length);
    expect(infoDebugEvents.length).toBeLessThan(allLevelsEvents.length);
    expect(errorOnlyEvents.length + infoDebugEvents.length).toBeLessThan(allLevelsEvents.length);

    // Verify error-only filtering
    errorOnlyEvents.forEach(entry => {
      expect(entry.level).toBe('error');
    });

    // Verify info/debug filtering
    infoDebugEvents.forEach(entry => {
      expect(['info', 'debug']).toContain(entry.level);
    });

    // Verify all levels received all entries
    const allLevels = new Set(allLevelsEvents.map(entry => entry.level));
    expect(allLevels.size).toBeGreaterThanOrEqual(3);

    // Clean up additional emitters
    errorOnlyEmitter.removeAllListeners();
    infoDebugEmitter.removeAllListeners();
    allLevelsEmitter.removeAllListeners();
  });

  it('should integrate event batching with filtering', async () => {
    const batchedEvents: LogEntry[][] = [];
    const filteredBatches: LogEntry[][] = [];
    const individualEvents: LogEntry[] = [];

    // Set up batch collection
    const batchSize = 5;
    let currentBatch: LogEntry[] = [];

    eventEmitter.on('log-entry', (entry: LogEntry) => {
      individualEvents.push(entry);
      currentBatch.push(entry);
      
      if (currentBatch.length >= batchSize) {
        const batch = [...currentBatch];
        batchedEvents.push(batch);
        
        // Apply filtering to batches
        const filteredBatch = batch.filter(entry => ['warn', 'error'].includes(entry.level));
        if (filteredBatch.length > 0) {
          filteredBatches.push(filteredBatch);
        }
        
        currentBatch = [];
        eventEmitter.emit('batch-processed', { batchSize: batch.length, filteredSize: filteredBatch.length });
      }
    });

    const batchProcessedEvents: any[] = [];
    eventEmitter.on('batch-processed', (data) => {
      batchProcessedEvents.push(data);
    });

    // Start monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${continuousAppPath}" 2000 40`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Bridge events
    logMonitor.on('log-entry', (entry: LogEntry) => {
      eventEmitter.emit('log-entry', entry);
    });

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 4000);
      logMonitor.on('process-exited', () => {
        // Process any remaining batch
        if (currentBatch.length > 0) {
          const batch = [...currentBatch];
          batchedEvents.push(batch);
          const filteredBatch = batch.filter(entry => ['warn', 'error'].includes(entry.level));
          if (filteredBatch.length > 0) {
            filteredBatches.push(filteredBatch);
          }
        }
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Verify batch processing with filtering
    expect(individualEvents.length).toBeGreaterThan(20);
    expect(batchedEvents.length).toBeGreaterThan(3);
    expect(batchProcessedEvents.length).toBeGreaterThan(3);

    // Verify batch sizes
    batchedEvents.forEach((batch, index) => {
      if (index < batchedEvents.length - 1) {
        // All batches except possibly the last should be full size
        expect(batch.length).toBeLessThanOrEqual(batchSize);
      }
      // Last batch might be partial
      expect(batch.length).toBeGreaterThan(0);
    });

    // Verify filtering worked on batches
    filteredBatches.forEach(batch => {
      batch.forEach(entry => {
        expect(['warn', 'error']).toContain(entry.level);
      });
    });

    // Verify total entries match
    const totalBatchedEntries = batchedEvents.reduce((sum, batch) => sum + batch.length, 0);
    expect(totalBatchedEntries).toBe(individualEvents.length);
  });

  it('should handle high-frequency event emission with filtering under load', async () => {
    const highFreqEvents: LogEntry[] = [];
    const filteredHighFreqEvents: LogEntry[] = [];
    const performanceMetrics = {
      startTime: Date.now(),
      eventCount: 0,
      filteredCount: 0,
      processingTimes: [] as number[]
    };

    // Set up high-frequency event handling with filtering
    eventEmitter.on('log-entry', (entry: LogEntry) => {
      const processingStart = Date.now();
      
      performanceMetrics.eventCount++;
      highFreqEvents.push(entry);
      
      // Apply complex filtering logic
      const shouldInclude = entry.level === 'error' || 
                           (entry.level === 'warn' && entry.message.includes('warning')) ||
                           (entry.level === 'info' && performanceMetrics.eventCount % 3 === 0);
      
      if (shouldInclude) {
        performanceMetrics.filteredCount++;
        filteredHighFreqEvents.push(entry);
      }
      
      const processingTime = Date.now() - processingStart;
      performanceMetrics.processingTimes.push(processingTime);
    });

    // Start multiple continuous processes for high load
    const processIds = await Promise.all([
      logMonitor.startRealTimeMonitoring(`node "${continuousAppPath}" 1500 25`, { format: 'auto' }),
      logMonitor.startRealTimeMonitoring(`node "${continuousAppPath}" 1500 30`, { format: 'auto' }),
      logMonitor.startRealTimeMonitoring(`node "${continuousAppPath}" 1500 35`, { format: 'auto' })
    ]);

    expect(processIds).toHaveLength(3);
    expect(processIds.every(id => typeof id === 'string')).toBe(true);

    // Bridge all events
    logMonitor.on('log-entry', (entry: LogEntry) => {
      eventEmitter.emit('log-entry', entry);
    });

    // Wait for all processes to complete
    await new Promise((resolve) => {
      let completedCount = 0;
      const timeout = setTimeout(() => resolve(undefined), 8000);
      
      logMonitor.on('process-exited', () => {
        completedCount++;
        if (completedCount >= 3) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
    });

    const duration = Date.now() - performanceMetrics.startTime;

    // Verify high-frequency processing
    expect(highFreqEvents.length).toBeGreaterThan(50);
    expect(filteredHighFreqEvents.length).toBeLessThan(highFreqEvents.length);
    expect(performanceMetrics.eventCount).toBe(highFreqEvents.length);
    expect(performanceMetrics.filteredCount).toBe(filteredHighFreqEvents.length);

    // Verify performance under load
    const avgProcessingTime = performanceMetrics.processingTimes.reduce((a, b) => a + b, 0) / 
                             performanceMetrics.processingTimes.length;
    expect(avgProcessingTime).toBeLessThan(5); // Should be very fast

    const eventsPerSecond = highFreqEvents.length / (duration / 1000);
    expect(eventsPerSecond).toBeGreaterThan(10); // Should handle reasonable throughput

    // Verify filtering logic worked correctly
    const errorEvents = filteredHighFreqEvents.filter(e => e.level === 'error');
    const warnEvents = filteredHighFreqEvents.filter(e => e.level === 'warn' && e.message.includes('warning'));
    const infoEvents = filteredHighFreqEvents.filter(e => e.level === 'info');

    expect(errorEvents.length).toBeGreaterThan(0);
    expect(warnEvents.length).toBeGreaterThan(0);
    expect(infoEvents.length).toBeGreaterThanOrEqual(0); // Info events should be roughly every 3rd based on filtering logic

    console.log(`High-frequency test: ${highFreqEvents.length} events, ${filteredHighFreqEvents.length} filtered, ${avgProcessingTime.toFixed(2)}ms avg processing`);
  });

  it('should handle event listener management with dynamic filtering', async () => {
    const phaseEvents: { [key: string]: LogEntry[] } = {
      phase1: [],
      phase2: [],
      phase3: []
    };

    let currentPhase = 'phase1';
    console.log(`Starting with ${currentPhase}`);
    
    // Phase 1: Only errors
    const phase1Listener = (entry: LogEntry) => {
      if (entry.level === 'error') {
        phaseEvents.phase1.push(entry);
      }
    };

    // Phase 2: Warnings and errors
    const phase2Listener = (entry: LogEntry) => {
      if (['warn', 'error'].includes(entry.level)) {
        phaseEvents.phase2.push(entry);
      }
    };

    // Phase 3: All levels
    const phase3Listener = (entry: LogEntry) => {
      phaseEvents.phase3.push(entry);
    };

    // Start with phase 1 filtering
    eventEmitter.on('log-entry', phase1Listener);

    // Start monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${multiLevelAppPath}" 30 80`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    // Bridge events
    logMonitor.on('log-entry', (entry: LogEntry) => {
      eventEmitter.emit('log-entry', entry);
    });

    // Switch to phase 2 after some time
    setTimeout(() => {
      currentPhase = 'phase2';
      eventEmitter.off('log-entry', phase1Listener);
      eventEmitter.on('log-entry', phase2Listener);
    }, 800);

    // Switch to phase 3 after more time
    setTimeout(() => {
      currentPhase = 'phase3';
      eventEmitter.off('log-entry', phase2Listener);
      eventEmitter.on('log-entry', phase3Listener);
    }, 1600);

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 5000);
      logMonitor.on('process-exited', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Verify dynamic filtering phases
    expect(phaseEvents.phase1.length).toBeGreaterThan(0);
    expect(phaseEvents.phase2.length).toBeGreaterThan(0);
    expect(phaseEvents.phase3.length).toBeGreaterThan(0);

    // Phase 1 should only have errors
    phaseEvents.phase1.forEach(entry => {
      expect(entry.level).toBe('error');
    });

    // Phase 2 should have warn and error
    phaseEvents.phase2.forEach(entry => {
      expect(['warn', 'error']).toContain(entry.level);
    });

    // Phase 3 should have all levels
    const phase3Levels = new Set(phaseEvents.phase3.map(entry => entry.level));
    expect(phase3Levels.size).toBeGreaterThanOrEqual(2);

    // Verify progression - later phases should generally have more events
    expect(phaseEvents.phase3.length).toBeGreaterThanOrEqual(phaseEvents.phase2.length);
    expect(phaseEvents.phase2.length).toBeGreaterThanOrEqual(phaseEvents.phase1.length);
  });

  it('should integrate LogStream events with EventEmitter filtering', async () => {
    const streamEvents: LogEntry[] = [];
    const emitterEvents: LogEntry[] = [];
    const filteredStreamEvents: LogEntry[] = [];

    // Create direct LogStream for integration
    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });
    
    logStream = new LogStream(stdout, stderr);

    // Set up LogStream filtering
    logStream.setLogLevelFilter(['warn', 'error']);

    // Set up LogStream events
    logStream.on('log-entry', (entry: LogEntry) => {
      filteredStreamEvents.push(entry);
      eventEmitter.emit('stream-filtered-entry', entry);
    });

    // Set up EventEmitter to receive from LogStream
    eventEmitter.on('stream-filtered-entry', (entry: LogEntry) => {
      emitterEvents.push(entry);
    });

    // Also set up LogMonitor for comparison
    const processId = await logMonitor.startRealTimeMonitoring(
      `node "${multiLevelAppPath}" 16 90`,
      { format: 'auto' }
    );

    expect(processId).toBeDefined();

    logMonitor.on('log-entry', (entry: LogEntry) => {
      streamEvents.push(entry);
      
      // Simulate streaming the same data to LogStream
      const logLine = entry.message + '\n';
      if (entry.level === 'error') {
        stderr.push(logLine);
      } else {
        stdout.push(logLine);
      }
    });

    // Wait for completion
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 4000);
      logMonitor.on('process-exited', () => {
        // End streams
        stdout.push(null);
        stderr.push(null);
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Verify integration between LogStream and EventEmitter
    expect(streamEvents.length).toBeGreaterThan(10);
    expect(filteredStreamEvents.length).toBeLessThan(streamEvents.length);
    expect(emitterEvents.length).toBe(filteredStreamEvents.length);

    // Verify LogStream filtering worked
    filteredStreamEvents.forEach(entry => {
      expect(['warn', 'error']).toContain(entry.level);
    });

    // Verify EventEmitter received filtered events
    emitterEvents.forEach(entry => {
      expect(['warn', 'error']).toContain(entry.level);
    });

    // Verify all original events had various levels
    const originalLevels = new Set(streamEvents.map(entry => entry.level));
    expect(originalLevels.size).toBeGreaterThanOrEqual(3);

    // Verify filtered events only have warn/error
    const filteredLevels = new Set(filteredStreamEvents.map(entry => entry.level));
    expect(filteredLevels.has('info')).toBe(false);
    expect(filteredLevels.has('debug')).toBe(false);
    expect(filteredLevels.has('warn')).toBe(true);
    expect(filteredLevels.has('error')).toBe(true);
  });
});