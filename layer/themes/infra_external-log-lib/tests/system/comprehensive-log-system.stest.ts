import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// import { spawn, ChildProcess } from 'child_process';
import { LogMonitor } from '../../user-stories/004-real-time-streaming/src/external/log-monitor';
import { LogAggregator } from '../../user-stories/006-multi-process-aggregation/src/internal/log-aggregator';
import { LogFilter } from '../../user-stories/005-advanced-log-filtering/src/external/log-filter';
import { AIDevPlatform } from '../../user-stories/001-basic-log-capture/src/application/aidev-platform';
import { FileManager } from '../../user-stories/001-basic-log-capture/src/domain/file-manager';
import { LogEntry } from '../../user-stories/004-real-time-streaming/src/domain/log-entry';

describe('Comprehensive External Log Library System Tests', () => {
  jest.setTimeout(30000); // 30 second timeout for comprehensive tests
  
  let testDir: string;
  let testAppsDir: string;
  let testOutputDir: string;
  let logMonitor: LogMonitor;
  let logAggregator: LogAggregator;
  let fileManager: FileManager;

  beforeAll(async () => {
    // Create test directories
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-lib-test-'));
    testAppsDir = path.join(testDir, 'apps');
    testOutputDir = path.join(testDir, 'output');
    fs.mkdirSync(testAppsDir, { recursive: true });
    fs.mkdirSync(testOutputDir, { recursive: true });

    // Create test applications with various logging behaviors
    await createTestApplications();
  });

  beforeEach(() => {
    logMonitor = new LogMonitor();
    logAggregator = new LogAggregator();
    fileManager = new FileManager();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
    logAggregator.clear();
  });

  afterAll(() => {
    // Clean up test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  async function createTestApplications() {
    // 1. Simple continuous logger
    const continuousLoggerPath = path.join(testAppsDir, 'continuous-logger.js');
    fs.writeFileSync(continuousLoggerPath, `
      const logInterval = parseInt(process.argv[2]) || 100;
      const duration = parseInt(process.argv[3]) || 5000;
      
      const startTime = Date.now();
      let counter = 0;
      
      const interval = setInterval(() => {
        counter++;
        const elapsed = Date.now() - startTime;
        
        if (elapsed > duration) {
          console.log('[INFO] Continuous logger In Progress: ' + counter + ' logs');
          clearInterval(interval);
          process.exit(0);
        }
        
        const level = counter % 10 === 0 ? 'ERROR' : 
                     counter % 5 === 0 ? 'WARN' : 
                     counter % 3 === 0 ? 'DEBUG' : 'INFO';
        
        if (level === 'ERROR') {
          console.error('[' + level + '] Error log #' + counter + ' at ' + elapsed + 'ms');
        } else {
          console.log('[' + level + '] Log message #' + counter + ' at ' + elapsed + 'ms');
        }
      }, logInterval);
      
      process.on('SIGTERM', () => {
        clearInterval(interval);
        console.log('[INFO] Process terminated gracefully after ' + counter + ' logs');
        process.exit(0);
      });
    `);

    // 2. Structured log producer
    const structuredLoggerPath = path.join(testAppsDir, 'structured-logger.js');
    fs.writeFileSync(structuredLoggerPath, `
      const formats = ['json', 'keyvalue', 'mixed'];
      const format = process.argv[2] || 'mixed';
      const count = parseInt(process.argv[3]) || 10;
      
      for (let i = 1; i <= count; i++) {
        const timestamp = new Date().toISOString();
        const level = i % 4 === 0 ? 'error' : i % 3 === 0 ? 'warn' : 'info';
        
        if (format === 'json' || (format === 'mixed' && i % 2 === 0)) {
          const logObj = {
            timestamp,
            level,
            message: 'Structured log entry ' + i,
            metadata: {
              counter: i,
              pid: process.pid,
              format: 'json'
            }
          };
          
          if (level === 'error') {
            console.error(JSON.stringify(logObj));
          } else {
            console.log(JSON.stringify(logObj));
          }
        } else {
          const kvLog = 'timestamp=' + timestamp + ' level=' + level + ' message="Structured log ' + i + '" counter=' + i + ' format=keyvalue';
          
          if (level === 'error') {
            console.error(kvLog);
          } else {
            console.log(kvLog);
          }
        }
      }
      
      console.log('[INFO] Structured logger In Progress: ' + count + ' logs');
    `);

    // 3. Multi-line log producer (for buffering tests)
    const multiLineLoggerPath = path.join(testAppsDir, 'multiline-logger.js');
    fs.writeFileSync(multiLineLoggerPath, `
      const scenarios = parseInt(process.argv[2]) || 5;
      
      for (let i = 1; i <= scenarios; i++) {
        console.log('[INFO] Starting multi-line scenario ' + i);
        
        // Produce partial lines to test buffering
        process.stdout.write('Partial line start...');
        setTimeout(() => {
          process.stdout.write(' middle part...');
          setTimeout(() => {
            console.log(' and the end!');
          }, 50);
        }, 50);
        
        // Produce stack trace
        if (i % 2 === 0) {
          console.error('[ERROR] Exception in scenario ' + i);
          console.error('    at function1 (file.js:10:15)');
          console.error('    at function2 (file.js:20:8)');
          console.error('    at main (file.js:30:3)');
        }
        
        // Wait before next scenario
        require('child_process').execSync('sleep 0.2');
      }
      
      console.log('[INFO] Multi-line logger In Progress');
    `);

    // 4. High-frequency burst logger (for backpressure testing)
    const burstLoggerPath = path.join(testAppsDir, 'burst-logger.js');
    fs.writeFileSync(burstLoggerPath, `
      const burstSize = parseInt(process.argv[2]) || 100;
      const burstCount = parseInt(process.argv[3]) || 5;
      const delayBetweenBursts = parseInt(process.argv[4]) || 500;
      
      async function produceBurst(burstNumber) {
        console.log('[INFO] Starting burst ' + burstNumber + ' with ' + burstSize + ' logs');
        const startTime = Date.now();
        
        for (let i = 0; i < burstSize; i++) {
          const logData = {
            burst: burstNumber,
            sequence: i,
            timestamp: Date.now(),
            payload: new Array(50).fill(Math.random()).join(',')
          };
          
          if (i % 20 === 0) {
            console.error('[ERROR] Burst ' + burstNumber + ' error log ' + i + ': ' + JSON.stringify(logData));
          } else {
            console.log('[INFO] Burst ' + burstNumber + ' log ' + i + ': ' + JSON.stringify(logData));
          }
        }
        
        const duration = Date.now() - startTime;
        console.log('[INFO] Burst ' + burstNumber + ' In Progress in ' + duration + 'ms');
      }
      
      async function main() {
        for (let b = 1; b <= burstCount; b++) {
          await produceBurst(b);
          if (b < burstCount) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBursts));
          }
        }
        console.log('[INFO] All bursts In Progress');
      }
      
      main().catch(console.error);
    `);

    // 5. Concurrent process simulator
    const concurrentSimPath = path.join(testAppsDir, 'concurrent-sim.js');
    fs.writeFileSync(concurrentSimPath, `
      const processId = process.argv[2] || 'default';
      const logCount = parseInt(process.argv[3]) || 20;
      const logInterval = parseInt(process.argv[4]) || 100;
      
      console.log('[INFO] Process ' + processId + ' starting with ' + logCount + ' logs');
      
      let counter = 0;
      const interval = setInterval(() => {
        counter++;
        
        const level = counter % 4 === 0 ? 'ERROR' : 
                     counter % 3 === 0 ? 'WARN' : 
                     counter % 2 === 0 ? 'DEBUG' : 'INFO';
        
        const logEntry = {
          processId,
          counter,
          timestamp: new Date().toISOString(),
          level,
          message: 'Log from process ' + processId + ' #' + counter
        };
        
        if (level === 'ERROR') {
          console.error('[' + level + '] ' + JSON.stringify(logEntry));
        } else {
          console.log('[' + level + '] ' + JSON.stringify(logEntry));
        }
        
        if (counter >= logCount) {
          clearInterval(interval);
          console.log('[INFO] Process ' + processId + ' In Progress');
          process.exit(0);
        }
      }, logInterval);
      
      process.on('SIGTERM', () => {
        clearInterval(interval);
        console.log('[INFO] Process ' + processId + ' terminated after ' + counter + ' logs');
        process.exit(0);
      });
    `);
  }

  describe('Real-Time Log Capture and Streaming', () => {
    it('should capture logs from real processes in real-time', async () => {
      const capturedLogs: LogEntry[] = [];
      const logTimestamps: number[] = [];

      logMonitor.on('log-entry', (entry: LogEntry) => {
        capturedLogs.push(entry);
        logTimestamps.push(Date.now());
      });

      // Start monitoring a continuous logger
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'continuous-logger.js')}" 50 2000`
      );

      expect(processId).toBeDefined();

      // Wait for process completion
      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify real-time capture
      expect(capturedLogs.length).toBeGreaterThan(20); // ~40 logs expected (2000ms / 50ms)
      
      // Verify logs were captured in real-time (not all at once)
      const timeDiffs = [];
      for (let i = 1; i < logTimestamps.length; i++) {
        timeDiffs.push(logTimestamps[i] - logTimestamps[i-1]);
      }
      
      // Should have variation in timestamps
      const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      expect(avgTimeDiff).toBeGreaterThan(10); // Average gap should be significant
      expect(Math.max(...timeDiffs)).toBeGreaterThan(40); // Some gaps should be close to interval
    });

    it('should handle multiple concurrent real processes', async () => {
      const processLogs = new Map<string, LogEntry[]>();
      
      logMonitor.on('log-entry', (entry: LogEntry) => {
        if (!processLogs.has(entry.processId)) {
          processLogs.set(entry.processId, []);
        }
        processLogs.get(entry.processId)!.push(entry);
        
        // Also add to aggregator
        logAggregator.addLog(entry.processId, entry);
      });

      // Start multiple concurrent processes
      const processIds = await Promise.all([
        logMonitor.startRealTimeMonitoring(
          `node "${path.join(testAppsDir, 'concurrent-sim.js')}" alpha 15 50`
        ),
        logMonitor.startRealTimeMonitoring(
          `node "${path.join(testAppsDir, 'concurrent-sim.js')}" beta 15 75`
        ),
        logMonitor.startRealTimeMonitoring(
          `node "${path.join(testAppsDir, 'concurrent-sim.js')}" gamma 15 60`
        )
      ]);

      expect(processIds).toHaveLength(3);

      // Wait for all processes to complete
      await new Promise<void>((resolve) => {
        let completed = 0;
        logMonitor.on('process-exited', () => {
          completed++;
          if (completed === 3) {
            resolve();
          }
        });
      });

      // Verify logs from all processes
      expect(processLogs.size).toBe(3);
      
      processIds.forEach(processId => {
        const logs = processLogs.get(processId) || [];
        expect(logs.length).toBeGreaterThanOrEqual(10);
        
        // Verify process metadata in aggregator
        const metadata = logAggregator.getProcessMetadata(processId);
        expect(metadata).toBeDefined();
        expect(metadata?.status).toBe('In Progress');
        expect(metadata?.logCount).toBeGreaterThanOrEqual(10);
      });

      // Verify aggregated statistics
      const stats = logAggregator.getStatistics();
      expect(stats.totalProcesses).toBe(3);
      expect(stats.passedProcesses).toBe(3);
      expect(stats.totalLogs).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Log Filtering with Real Data', () => {
    it('should filter logs by level in real-time', async () => {
      const allLogs: LogEntry[] = [];
      const filteredLogs: LogEntry[] = [];
      
      // Set up filtering for ERROR and WARN only
      const filter = new LogFilter();
      filter.configure(['error', 'warn']);

      logMonitor.on('log-entry', (entry: LogEntry) => {
        allLogs.push(entry);
        
        if (filter.filterLog(entry.level, entry.message)) {
          filteredLogs.push(entry);
        }
      });

      // Start monitoring with level filter
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'continuous-logger.js')}" 30 1500`,
        { logLevelFilter: ['error', 'warn'] }
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify filtering worked
      expect(allLogs.length).toBeGreaterThan(filteredLogs.length);
      
      // All filtered logs should be ERROR or WARN
      filteredLogs.forEach(log => {
        expect(['error', 'warn']).toContain(log.level);
      });

      // Verify we got both ERROR and WARN logs
      const errorLogs = filteredLogs.filter(log => log.level === 'error');
      const warnLogs = filteredLogs.filter(log => log.level === 'warn');
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(warnLogs.length).toBeGreaterThan(0);
    });

    it('should support dynamic filter updates during monitoring', async () => {
      const capturedLogs: LogEntry[] = [];
      let filterChangedAt: number = 0;

      logMonitor.on('log-entry', (entry: LogEntry) => {
        capturedLogs.push(entry);
      });

      // Start with no filter
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'continuous-logger.js')}" 100 5000`
      );

      // After 1 second, apply ERROR-only filter
      setTimeout(() => {
        filterChangedAt = capturedLogs.length;
        logMonitor.setLogLevelFilter(processId, ['error']);
      }, 1000);

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify dynamic filtering
      expect(filterChangedAt).toBeGreaterThan(0);
      
      // Logs before filter change should include all levels
      const beforeFilter = capturedLogs.slice(0, filterChangedAt);
      const levelsBeforeFilter = new Set(beforeFilter.map(log => log.level));
      expect(levelsBeforeFilter.size).toBeGreaterThan(1);

      // Logs after filter change should be mostly ERROR
      // (Note: some non-error logs might slip through due to timing)
      const afterFilter = capturedLogs.slice(filterChangedAt + 5); // Skip a few for timing
      const errorPercentage = afterFilter.filter(log => log.level === 'error').length / afterFilter.length;
      expect(errorPercentage).toBeGreaterThan(0.8); // Most should be errors
    });
  });

  describe('Log Buffering and Stream Processing', () => {
    it('should handle partial line buffering correctly', async () => {
      const capturedLogs: LogEntry[] = [];

      logMonitor.on('log-entry', (entry: LogEntry) => {
        capturedLogs.push(entry);
      });

      // Run multi-line logger
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'multiline-logger.js')}" 3`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify partial lines were properly buffered and assembled
      const partialLineLogs = capturedLogs.filter(log => 
        log.message.includes('Partial line start... middle part... and the end!')
      );
      expect(partialLineLogs.length).toBeGreaterThanOrEqual(3);

      // Verify multi-line stack traces were captured
      const errorLogs = capturedLogs.filter(log => log.level === 'error');
      expect(errorLogs.length).toBeGreaterThan(0);
      
      // Stack trace lines should be captured as separate logs
      const stackTraceLogs = capturedLogs.filter(log => 
        log.message.includes('at function') || log.message.includes('at main')
      );
      expect(stackTraceLogs.length).toBeGreaterThan(0);
    });

    it('should handle high-frequency burst logging without data loss', async () => {
      const capturedLogs: LogEntry[] = [];
      const burstMetrics = new Map<number, { start: number; end: number; count: number }>();

      logMonitor.on('log-entry', (entry: LogEntry) => {
        capturedLogs.push(entry);
        
        // Track burst metrics
        const burstMatch = entry.message.match(/burst[": ]+(\d+)/i);
        if (burstMatch) {
          const burstNum = parseInt(burstMatch[1]);
          if (!burstMetrics.has(burstNum)) {
            burstMetrics.set(burstNum, { start: Date.now(), end: Date.now(), count: 0 });
          }
          const metrics = burstMetrics.get(burstNum)!;
          metrics.end = Date.now();
          metrics.count++;
        }
      });

      // Run burst logger
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'burst-logger.js')}" 100 3 500`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify all bursts were captured
      expect(burstMetrics.size).toBe(3);
      
      // Verify each burst captured most of its logs
      burstMetrics.forEach((metrics, _burstNum) => {
        expect(metrics.count).toBeGreaterThan(80); // Should capture at least 80% of 100 logs
        
        // Verify burst duration (should be fast)
        const duration = metrics.end - metrics.start;
        expect(duration).toBeLessThan(1000); // Each burst should In Progress quickly
      });

      // Verify total log count
      expect(capturedLogs.length).toBeGreaterThan(250); // 3 bursts * 100 logs * 80% efficiency
    });
  });

  describe('Log Formatting and Persistence', () => {
    it('should save logs in multiple formats with real data', async () => {
      const platform = new AIDevPlatform();
      
      // Capture structured logs
      const session = await platform.startLogCapture({
        command: 'node',
        args: [path.join(testAppsDir, 'structured-logger.js'), 'mixed', '20'],
        captureOutput: true
      });

      await session.waitForCompletion();
      
      const logs = session.getLogs();
      expect(logs.length).toBeGreaterThan(15);

      // Save in different formats
      const textFile = path.join(testOutputDir, 'logs.txt');
      const jsonFile = path.join(testOutputDir, 'logs.json');
      const csvFile = path.join(testOutputDir, 'logs.csv');

      await fileManager.saveLogsToFile(logs, textFile, { format: 'text' });
      await fileManager.saveLogsToFile(logs, jsonFile, { format: 'json', timestamp: true });
      await fileManager.saveLogsToFile(logs, csvFile, { format: 'csv' });

      // Verify files exist and have content
      expect(fs.existsSync(textFile)).toBe(true);
      expect(fs.existsSync(jsonFile)).toBe(true);
      expect(fs.existsSync(csvFile)).toBe(true);

      // Verify text format
      const textContent = fs.readFileSync(textFile, 'utf-8');
      expect(textContent.split('\n').length).toBeGreaterThan(15);
      expect(textContent).toMatch(/\[\w+\]/); // Should contain log levels

      // Verify JSON format
      const jsonContent = fs.readFileSync(jsonFile, 'utf-8');
      const jsonData = JSON.parse(jsonContent);
      expect(jsonData.timestamp).toBeDefined();
      expect(jsonData.logs).toBeInstanceOf(Array);
      expect(jsonData.logs.length).toBeGreaterThan(15);

      // Verify CSV format
      const csvContent = fs.readFileSync(csvFile, 'utf-8');
      const csvLines = csvContent.split('\n');
      expect(csvLines[0]).toBe('timestamp,level,message,source');
      expect(csvLines.length).toBeGreaterThan(16); // Header + logs
    });

    it('should handle append mode correctly', async () => {
      const appendFile = path.join(testOutputDir, 'append-test.txt');
      
      // First session
      const session1 = await new AIDevPlatform().startLogCapture({
        command: 'node',
        args: ['-e', 'console.log("[INFO] First session log 1"); console.log("[INFO] First session log 2")'],
        captureOutput: true
      });
      
      await session1.waitForCompletion();
      const logs1 = session1.getLogs();
      
      await fileManager.saveLogsToFile(logs1, appendFile, { format: 'text' });
      
      // Second session
      const session2 = await new AIDevPlatform().startLogCapture({
        command: 'node',
        args: ['-e', 'console.log("[INFO] Second session log 1"); console.log("[INFO] Second session log 2")'],
        captureOutput: true
      });
      
      await session2.waitForCompletion();
      const logs2 = session2.getLogs();
      
      await fileManager.saveLogsToFile(logs2, appendFile, { format: 'text', append: true });
      
      // Verify both sessions' logs are in the file
      const content = fs.readFileSync(appendFile, 'utf-8');
      expect(content).toContain('First session log 1');
      expect(content).toContain('First session log 2');
      expect(content).toContain('Second session log 1');
      expect(content).toContain('Second session log 2');
      
      const lines = content.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(4);
    });
  });

  describe('Process Management and Error Handling', () => {
    it('should handle process crashes gracefully', async () => {
      const crashedProcessEvents: any[] = [];
      const lastLogs: LogEntry[] = [];

      logMonitor.on('process-crashed', (event) => {
        crashedProcessEvents.push(event);
        if (event.lastLogs) {
          lastLogs.push(...event.lastLogs);
        }
      });

      // Create a crashing process
      const crashScript = `
        console.log('[INFO] Process starting normally');
        console.log('[INFO] About to crash...');
        console.error('[ERROR] Fatal error occurred!');
        process.exit(1);
      `;

      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "${crashScript.replace(/"/g, '\\"')}"`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-crashed', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify crash was detected
      expect(crashedProcessEvents.length).toBe(1);
      expect(crashedProcessEvents[0].code).toBe(1);
      expect(crashedProcessEvents[0].processId).toBe(processId);
      
      // Verify last logs were captured
      expect(lastLogs.length).toBeGreaterThan(0);
      const errorLog = lastLogs.find(log => log.message.includes('Fatal error'));
      expect(errorLog).toBeDefined();
    });

    it('should terminate long-running processes gracefully', async () => {
      let processTerminated = false;
      let terminationForced = false;

      logMonitor.on('monitoring-stopped', (event) => {
        processTerminated = true;
        if (event.forced) {
          terminationForced = true;
        }
      });

      // Start a long-running process
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'continuous-logger.js')}" 100 60000` // 60 second process
      );

      // Let it run for a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stop monitoring (should terminate the process)
      await logMonitor.stopMonitoring(processId);

      expect(processTerminated).toBe(true);
      expect(terminationForced).toBe(false); // Should use graceful termination

      // Verify process is no longer active
      const status = logMonitor.getMonitoringStatus();
      expect(status.activeProcesses).toBe(0);
    });
  });

  describe('Advanced Multi-Process Aggregation', () => {
    it('should aggregate logs from multiple processes with filtering', async () => {
      const processIds: string[] = [];
      
      logMonitor.on('log-entry', (entry: LogEntry) => {
        logAggregator.addLog(entry.processId, entry);
      });

      logMonitor.on('process-exited', (event) => {
        logAggregator.markProcessComplete(event.processId, event.code || 0);
      });

      // Start multiple processes with different characteristics
      processIds.push(await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'concurrent-sim.js')}" proc1 20 50`
      ));
      processIds.push(await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'concurrent-sim.js')}" proc2 20 75`
      ));
      processIds.push(await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'concurrent-sim.js')}" proc3 20 60`
      ));

      // Wait for all to complete
      await new Promise<void>((resolve) => {
        let completed = 0;
        logMonitor.on('process-exited', () => {
          completed++;
          if (completed === 3) {
            resolve();
          }
        });
      });

      // Test aggregation with various filters
      
      // 1. Get all logs
      const allLogs = logAggregator.getAggregatedLogs();
      expect(allLogs.length).toBeGreaterThanOrEqual(60);

      // 2. Filter by process
      const proc1Logs = logAggregator.getAggregatedLogs({
        processIds: [processIds[0]]
      });
      expect(proc1Logs.length).toBeGreaterThanOrEqual(20);
      expect(proc1Logs.every(log => log.processId === processIds[0])).toBe(true);

      // 3. Filter by log level
      const errorLogs = logAggregator.getAggregatedLogs({
        levels: ['error']
      });
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs.every(log => log.level === 'error')).toBe(true);

      // 4. Combined filters
      const proc2Errors = logAggregator.getAggregatedLogs({
        processIds: [processIds[1]],
        levels: ['error', 'warn']
      });
      expect(proc2Errors.every(log => 
        log.processId === processIds[1] && 
        ['error', 'warn'].includes(log.level)
      )).toBe(true);

      // 5. Pagination
      const firstPage = logAggregator.getAggregatedLogs({
        limit: 10,
        offset: 0
      });
      const secondPage = logAggregator.getAggregatedLogs({
        limit: 10,
        offset: 10
      });
      
      expect(firstPage.length).toBe(10);
      expect(secondPage.length).toBe(10);
      expect(firstPage[0].sequenceNumber).toBeLessThan(secondPage[0].sequenceNumber);

      // 6. Verify statistics
      const stats = logAggregator.getStatistics();
      expect(stats.totalProcesses).toBe(3);
      expect(stats.passedProcesses).toBe(3);
      expect(stats.crashedProcesses).toBe(0);
      expect(stats.totalLogs).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Transport Layer Readiness', () => {
    it('should prepare logs for transport to external systems', async () => {
      // This test verifies that logs can be formatted and prepared for transport
      // even though actual network transport is not In Progress yet
      
      const transportReadyLogs: any[] = [];
      
      logMonitor.on('log-entry', (entry: LogEntry) => {
        // Simulate preparing for transport
        const transportPayload = {
          timestamp: entry.timestamp.toISOString(),
          level: entry.level,
          message: entry.message,
          source: entry.source,
          processId: entry.processId,
          metadata: {
            capturedAt: new Date().toISOString(),
            hostname: os.hostname(),
            platform: os.platform(),
            nodeVersion: process.version
          }
        };
        
        transportReadyLogs.push(transportPayload);
      });

      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'structured-logger.js')}" json 10`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify logs are ready for transport
      expect(transportReadyLogs.length).toBeGreaterThan(5);
      
      transportReadyLogs.forEach(payload => {
        // Verify required fields for transport
        expect(payload.timestamp).toBeDefined();
        expect(payload.level).toBeDefined();
        expect(payload.message).toBeDefined();
        expect(payload.metadata).toBeDefined();
        expect(payload.metadata.hostname).toBeDefined();
        
        // Verify JSON serializable
        const serialized = JSON.stringify(payload);
        expect(() => JSON.parse(serialized)).not.toThrow();
      });

      // Simulate batch preparation for transport
      const transportBatch = {
        batchId: `batch_${Date.now()}`,
        logs: transportReadyLogs,
        summary: {
          count: transportReadyLogs.length,
          levels: [...new Set(transportReadyLogs.map(log => log.level))],
          timeRange: {
            start: transportReadyLogs[0].timestamp,
            end: transportReadyLogs[transportReadyLogs.length - 1].timestamp
          }
        }
      };

      expect(transportBatch.logs.length).toBe(transportReadyLogs.length);
      expect(transportBatch.summary.levels.length).toBeGreaterThan(0);
    });
  });
});