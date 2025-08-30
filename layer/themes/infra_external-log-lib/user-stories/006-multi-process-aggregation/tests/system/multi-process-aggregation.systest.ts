import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

interface ProcessLogEntry {
  processId: number;
  processName: string;
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

interface AggregatedStats {
  totalLogs: number;
  processCounts: Record<number, number>;
  levelCounts: Record<string, number>;
  timeRange: { start: string; end: string };
  averageLogsPerSecond: number;
}

class MultiProcessLogAggregator {
  private logs: ProcessLogEntry[] = [];
  private processes: Map<number, { name: string; startTime: Date }> = new Map();

  addLog(log: ProcessLogEntry): void {
    this.logs.push(log);
    
    if (!this.processes.has(log.processId)) {
      this.processes.set(log.processId, {
        name: log.processName,
        startTime: new Date(log.timestamp)
      });
    }
  }

  getAllLogs(): ProcessLogEntry[] {
    return [...this.logs];
  }

  getLogsByProcess(processId: number): ProcessLogEntry[] {
    return this.logs.filter(log => log.processId === processId);
  }

  getLogsByLevel(level: string): ProcessLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getAggregatedStats(): AggregatedStats {
    if (this.logs.length === 0) {
      return {
        totalLogs: 0,
        processCounts: {},
        levelCounts: {},
        timeRange: { start: '', end: '' },
        averageLogsPerSecond: 0
      };
    }

    const processCounts: Record<number, number> = {};
    const levelCounts: Record<string, number> = {};
    
    this.logs.forEach(log => {
      processCounts[log.processId] = (processCounts[log.processId] || 0) + 1;
      levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
    });

    const timestamps = this.logs.map(log => new Date(log.timestamp)).sort();
    const startTime = timestamps[0];
    const endTime = timestamps[timestamps.length - 1];
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    const averageLogsPerSecond = durationSeconds > 0 ? this.logs.length / durationSeconds : 0;

    return {
      totalLogs: this.logs.length,
      processCounts,
      levelCounts,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      averageLogsPerSecond
    };
  }

  mergeFromFile(filePath: string): Promise<void> {
    return fs.readFile(filePath, 'utf-8')
      .then(content => {
        const lines = content.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          try {
            const log = JSON.parse(line);
            this.addLog(log);
          } catch (error) {
            // Skip malformed log lines
          }
        });
      });
  }

  exportToFile(filePath: string): Promise<void> {
    const content = this.logs.map(log => JSON.stringify(log)).join('\n');
    return fs.writeFile(filePath, content);
  }
}

test.describe('Multi-Process Log Aggregation System Tests', () => {
  let tempDir: string;
  let aggregator: MultiProcessLogAggregator;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `aggregation-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    aggregator = new MultiProcessLogAggregator();
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should aggregate logs from multiple concurrent processes', async () => {
    const processCount = 5;
    const logsPerProcess = 10;
    const logFiles: string[] = [];
    const processes: Promise<void>[] = [];

    // Create multiple processes that generate logs
    for (let processId = 1; processId <= processCount; processId++) {
      const processName = `worker-${processId}`;
      const logFile = path.join(tempDir, `process-${processId}.log`);
      logFiles.push(logFile);

      const processPromise = new Promise<void>((resolve, reject) => {
        const logs: ProcessLogEntry[] = [];
        
        for (let i = 0; i < logsPerProcess; i++) {
          logs.push({
            processId: processId * 1000 + i, // Unique process ID
            processName,
            timestamp: new Date(Date.now() + i * 100).toISOString(),
            level: ['INFO', 'WARN', 'ERROR', 'DEBUG'][i % 4],
            message: `Process ${processId} log message ${i}`,
            metadata: {
              iteration: i,
              worker_id: processId,
              memory_mb: Math.floor(Math.random() * 100) + 50
            }
          });
        }

        const content = logs.map(log => JSON.stringify(log)).join('\n');
        fs.writeFile(logFile, content)
          .then(() => resolve())
          .catch(reject);
      });

      processes.push(processPromise);
    }

    // Wait for all processes to complete
    await Promise.all(processes);

    // Aggregate logs from all processes
    for (const logFile of logFiles) {
      await aggregator.mergeFromFile(logFile);
    }

    const stats = aggregator.getAggregatedStats();
    
    // Verify aggregation
    expect(stats.totalLogs).toBe(processCount * logsPerProcess);
    expect(Object.keys(stats.processCounts)).toHaveLength(processCount * logsPerProcess); // Each log has unique process ID
    expect(stats.levelCounts['INFO']).toBeGreaterThan(0);
    expect(stats.levelCounts['WARN']).toBeGreaterThan(0);
    expect(stats.levelCounts['ERROR']).toBeGreaterThan(0);
    expect(stats.levelCounts['DEBUG']).toBeGreaterThan(0);
  });

  test('should handle real-time log aggregation from spawned processes', async ({ timeout }) => {
    timeout(15000); // 15 second timeout for spawning processes
    
    const nodeScriptTemplate = `
const processId = process.pid;
const processName = 'node-worker';
let counter = 0;

const logInterval = setInterval(() => {
  const log = {
    processId,
    processName,
    timestamp: new Date().toISOString(),
    level: ['INFO', 'WARN', 'ERROR'][counter % 3],
    message: \`Node process \${processId} log \${counter}\`,
    metadata: {
      counter,
      uptime: process.uptime()
    }
  };
  
  console.log(JSON.stringify(log));
  counter++;
  
  if (counter >= 5) {
    clearInterval(logInterval);
    process.exit(0);
  }
}, 200);
`;

    const scriptPath = path.join(tempDir, 'log_generator.js');
    await fs.writeFile(scriptPath, nodeScriptTemplate);

    const spawnedProcesses: ChildProcess[] = [];
    const aggregatedLogs: ProcessLogEntry[] = [];

    // Spawn multiple Node.js processes
    for (let i = 0; i < 3; i++) {
      const child = spawn('node', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      spawnedProcesses.push(child);

      child.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          try {
            const log: ProcessLogEntry = JSON.parse(line);
            aggregatedLogs.push(log);
            aggregator.addLog(log);
          } catch (error) {
            // Skip malformed JSON
          }
        });
      });
    }

    // Wait for all processes to complete
    await Promise.all(spawnedProcesses.map(child => {
      return new Promise<void>((resolve) => {
        child.on('close', () => resolve());
      });
    }));

    const stats = aggregator.getAggregatedStats();
    
    // Verify real-time aggregation
    expect(stats.totalLogs).toBe(15); // 3 processes × 5 logs each
    expect(Object.keys(stats.processCounts)).toHaveLength(3); // 3 different process IDs
    expect(aggregatedLogs.length).toBe(stats.totalLogs);
    
    // Verify each process contributed logs
    Object.values(stats.processCounts).forEach(count => {
      expect(count).toBe(5); // Each process should have 5 logs
    });
  });

  test('should merge logs from different time periods correctly', async () => {
    const baseTime = Date.now();
    const timePeriods = [
      { start: baseTime, count: 5, period: 'morning' },
      { start: baseTime + 3600000, count: 8, period: 'afternoon' }, // +1 hour
      { start: baseTime + 7200000, count: 6, period: 'evening' } // +2 hours
    ];

    // Generate logs for different time periods
    for (const period of timePeriods) {
      const logFile = path.join(tempDir, `${period.period}_logs.log`);
      const logs: ProcessLogEntry[] = [];

      for (let i = 0; i < period.count; i++) {
        logs.push({
          processId: Math.floor(Math.random() * 1000),
          processName: `${period.period}-service`,
          timestamp: new Date(period.start + i * 60000).toISOString(), // 1 minute intervals
          level: ['INFO', 'WARN', 'ERROR'][i % 3],
          message: `${period.period} log message ${i}`,
          metadata: {
            period: period.period,
            batch: i
          }
        });
      }

      const content = logs.map(log => JSON.stringify(log)).join('\n');
      await fs.writeFile(logFile, content);
      await aggregator.mergeFromFile(logFile);
    }

    const stats = aggregator.getAggregatedStats();
    
    // Verify time-based aggregation
    expect(stats.totalLogs).toBe(19); // 5 + 8 + 6
    expect(new Date(stats.timeRange.start).getTime()).toBe(baseTime);
    expect(new Date(stats.timeRange.end).getTime()).toBeGreaterThan(baseTime + 7200000);
    
    // Verify logs can be filtered by time period
    const morningLogs = aggregator.getAllLogs().filter(log => 
      log.metadata?.period === 'morning'
    );
    expect(morningLogs).toHaveLength(5);
  });

  test('should handle high-volume log aggregation efficiently', async () => {
    const processCount = 10;
    const logsPerProcess = 1000;
    const startTime = Date.now();

    // Generate high-volume logs from multiple processes
    const promises = Array.from({ length: processCount }, async (_, processIndex) => {
      const logs: ProcessLogEntry[] = [];
      
      for (let i = 0; i < logsPerProcess; i++) {
        logs.push({
          processId: processIndex + 1,
          processName: `high-volume-process-${processIndex}`,
          timestamp: new Date(startTime + i).toISOString(),
          level: ['INFO', 'DEBUG', 'WARN', 'ERROR'][i % 4],
          message: `High volume log ${i} from process ${processIndex}`,
          metadata: {
            sequence: i,
            process_index: processIndex,
            batch_size: 100
          }
        });
      }

      const logFile = path.join(tempDir, `high_volume_${processIndex}.log`);
      const content = logs.map(log => JSON.stringify(log)).join('\n');
      await fs.writeFile(logFile, content);
      return logFile;
    });

    const logFiles = await Promise.all(promises);

    // Measure aggregation performance
    const aggregationStart = Date.now();
    
    for (const logFile of logFiles) {
      await aggregator.mergeFromFile(logFile);
    }
    
    const aggregationEnd = Date.now();
    const aggregationTime = aggregationEnd - aggregationStart;

    const stats = aggregator.getAggregatedStats();
    
    // Verify performance and accuracy
    expect(stats.totalLogs).toBe(processCount * logsPerProcess);
    expect(aggregationTime).toBeLessThan(5000); // Should complete in under 5 seconds
    
    // Verify process distribution
    expect(Object.keys(stats.processCounts)).toHaveLength(processCount);
    Object.values(stats.processCounts).forEach(count => {
      expect(count).toBe(logsPerProcess);
    });
    
    console.log(`Aggregated ${stats.totalLogs} logs in ${aggregationTime}ms`);
    console.log(`Performance: ${Math.round(stats.totalLogs / (aggregationTime / 1000))} logs/second`);
  });

  test('should detect and handle duplicate log entries', async () => {
    const baseLogs: ProcessLogEntry[] = [
      {
        processId: 1001,
        processName: 'service-a',
        timestamp: '2025-08-28T10:00:00Z',
        level: 'INFO',
        message: 'Operation completed',
        metadata: { operation_id: 'op-123' }
      },
      {
        processId: 1002,
        processName: 'service-b',
        timestamp: '2025-08-28T10:01:00Z',
        level: 'WARN',
        message: 'Resource limit exceeded',
        metadata: { resource: 'memory' }
      }
    ];

    // Create multiple log files with duplicates
    const logFile1 = path.join(tempDir, 'logs1.log');
    const logFile2 = path.join(tempDir, 'logs2.log');
    const logFile3 = path.join(tempDir, 'logs3.log');

    // File 1: Original logs + duplicates
    const file1Content = [
      ...baseLogs,
      baseLogs[0], // Duplicate
      {
        processId: 1003,
        processName: 'service-c',
        timestamp: '2025-08-28T10:02:00Z',
        level: 'ERROR',
        message: 'Connection failed'
      }
    ];

    // File 2: Some duplicates + new logs
    const file2Content = [
      baseLogs[1], // Duplicate
      {
        processId: 1004,
        processName: 'service-d',
        timestamp: '2025-08-28T10:03:00Z',
        level: 'INFO',
        message: 'Startup complete'
      }
    ];

    // File 3: All new logs
    const file3Content = [
      {
        processId: 1005,
        processName: 'service-e',
        timestamp: '2025-08-28T10:04:00Z',
        level: 'DEBUG',
        message: 'Debug information'
      }
    ];

    await fs.writeFile(logFile1, file1Content.map(log => JSON.stringify(log)).join('\n'));
    await fs.writeFile(logFile2, file2Content.map(log => JSON.stringify(log)).join('\n'));
    await fs.writeFile(logFile3, file3Content.map(log => JSON.stringify(log)).join('\n'));

    // Simple aggregator (allows duplicates)
    await aggregator.mergeFromFile(logFile1);
    await aggregator.mergeFromFile(logFile2);
    await aggregator.mergeFromFile(logFile3);

    const allLogs = aggregator.getAllLogs();
    expect(allLogs.length).toBe(6); // Includes duplicates

    // Count unique logs by creating a deduplication key
    const uniqueLogKeys = new Set(
      allLogs.map(log => `${log.processId}-${log.timestamp}-${log.message}`)
    );
    
    expect(uniqueLogKeys.size).toBe(5); // 5 unique logs
    expect(allLogs.length - uniqueLogKeys.size).toBe(1); // 1 duplicate detected
  });

  test('should export and import aggregated logs', async () => {
    // Add test logs to aggregator
    const testLogs: ProcessLogEntry[] = [
      {
        processId: 2001,
        processName: 'export-test',
        timestamp: '2025-08-28T12:00:00Z',
        level: 'INFO',
        message: 'Test log 1'
      },
      {
        processId: 2002,
        processName: 'export-test',
        timestamp: '2025-08-28T12:01:00Z',
        level: 'ERROR',
        message: 'Test log 2'
      }
    ];

    testLogs.forEach(log => aggregator.addLog(log));

    // Export aggregated logs
    const exportFile = path.join(tempDir, 'exported_logs.log');
    await aggregator.exportToFile(exportFile);

    // Verify export file exists and contains correct data
    const exportedContent = await fs.readFile(exportFile, 'utf-8');
    const exportedLines = exportedContent.split('\n').filter(line => line.trim());
    
    expect(exportedLines).toHaveLength(2);
    
    const exportedLogs = exportedLines.map(line => JSON.parse(line));
    expect(exportedLogs[0].message).toBe('Test log 1');
    expect(exportedLogs[1].message).toBe('Test log 2');

    // Import into new aggregator
    const newAggregator = new MultiProcessLogAggregator();
    await newAggregator.mergeFromFile(exportFile);

    const importedStats = newAggregator.getAggregatedStats();
    expect(importedStats.totalLogs).toBe(2);
    expect(importedStats.levelCounts['INFO']).toBe(1);
    expect(importedStats.levelCounts['ERROR']).toBe(1);
  });

  test('should handle process lifecycle and state changes', async () => {
    const processLifecycleLogs: ProcessLogEntry[] = [
      {
        processId: 3001,
        processName: 'lifecycle-service',
        timestamp: '2025-08-28T13:00:00Z',
        level: 'INFO',
        message: 'Process starting',
        metadata: { state: 'starting', memory_mb: 50 }
      },
      {
        processId: 3001,
        processName: 'lifecycle-service',
        timestamp: '2025-08-28T13:00:05Z',
        level: 'INFO',
        message: 'Process initialized',
        metadata: { state: 'running', memory_mb: 75 }
      },
      {
        processId: 3001,
        processName: 'lifecycle-service',
        timestamp: '2025-08-28T13:00:30Z',
        level: 'WARN',
        message: 'High memory usage',
        metadata: { state: 'running', memory_mb: 150 }
      },
      {
        processId: 3001,
        processName: 'lifecycle-service',
        timestamp: '2025-08-28T13:01:00Z',
        level: 'INFO',
        message: 'Process shutting down',
        metadata: { state: 'stopping', memory_mb: 45 }
      },
      {
        processId: 3001,
        processName: 'lifecycle-service',
        timestamp: '2025-08-28T13:01:05Z',
        level: 'INFO',
        message: 'Process terminated',
        metadata: { state: 'stopped', memory_mb: 0 }
      }
    ];

    processLifecycleLogs.forEach(log => aggregator.addLog(log));

    // Analyze process lifecycle
    const processLogs = aggregator.getLogsByProcess(3001);
    expect(processLogs).toHaveLength(5);

    const states = processLogs.map(log => log.metadata?.state);
    expect(states).toEqual(['starting', 'running', 'running', 'stopping', 'stopped']);

    // Track memory usage over time
    const memoryUsage = processLogs.map(log => log.metadata?.memory_mb);
    expect(memoryUsage[0]).toBe(50);  // Starting
    expect(memoryUsage[2]).toBe(150); // Peak usage
    expect(memoryUsage[4]).toBe(0);   // Terminated

    const stats = aggregator.getAggregatedStats();
    expect(stats.processCounts[3001]).toBe(5);
  });
});