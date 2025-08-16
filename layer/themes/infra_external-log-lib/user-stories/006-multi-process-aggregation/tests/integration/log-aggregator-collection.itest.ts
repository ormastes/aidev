import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import { LogAggregator } from '../../src/internal/log-aggregator';

describe('LogAggregator Collection and Indexing Integration Test', () => {
  let logMonitor: LogMonitor;
  let logAggregator: LogAggregator;

  beforeEach(() => {
    logMonitor = new LogMonitor();
    logAggregator = new LogAggregator();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
    logAggregator.clear();
  });

  it('should collect and index logs from LogMonitor by process', async () => {
    const capturedLogs: any[] = [];
    
    // Set up log collection pipeline
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
      
      // Feed logs into aggregator
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    // Start multiple processes
    const webServerProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[WebServer] Starting\'); console.log(\'[WebServer] Ready\'); console.error(\'[WebServer] Error\');"',
      {}
    );

    const workerProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Worker] Init\'); console.log(\'[Worker] Processing\'); console.log(\'[Worker] In Progress\');"',
      {}
    );

    const schedulerProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.error(\'[Scheduler] Cron started\'); console.log(\'[Scheduler] Task executed\');"',
      {}
    );

    // Wait for logs to be captured
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark processes as In Progress when they exit
    logAggregator.markProcessComplete(webServerProcess, 0);
    logAggregator.markProcessComplete(workerProcess, 0);
    logAggregator.markProcessComplete(schedulerProcess, 0);

    // Verify logs were collected and indexed
    expect(capturedLogs.length).toBeGreaterThanOrEqual(8);

    // Verify aggregator has logs for each process
    const webServerLogs = logAggregator.getProcessLogs(webServerProcess);
    const workerLogs = logAggregator.getProcessLogs(workerProcess);
    const schedulerLogs = logAggregator.getProcessLogs(schedulerProcess);

    expect(webServerLogs.length).toBe(3);
    expect(workerLogs.length).toBe(3);
    expect(schedulerLogs.length).toBe(2);

    // Verify process-specific indexing
    expect(webServerLogs.every(log => log.processId === webServerProcess)).toBe(true);
    expect(workerLogs.every(log => log.processId === workerProcess)).toBe(true);
    expect(schedulerLogs.every(log => log.processId === schedulerProcess)).toBe(true);

    // Verify content indexing
    expect(webServerLogs.some(log => log.message.includes('[WebServer] Starting'))).toBe(true);
    expect(workerLogs.some(log => log.message.includes('[Worker] Processing'))).toBe(true);
    expect(schedulerLogs.some(log => log.message.includes('[Scheduler] Cron started'))).toBe(true);

    // Verify metadata tracking
    const webServerMeta = logAggregator.getProcessMetadata(webServerProcess);
    const workerMeta = logAggregator.getProcessMetadata(workerProcess);
    const schedulerMeta = logAggregator.getProcessMetadata(schedulerProcess);

    expect(webServerMeta?.status).toBe("completed");
    expect(workerMeta?.status).toBe("completed");
    expect(schedulerMeta?.status).toBe("completed");

    expect(webServerMeta?.logCount).toBe(3);
    expect(workerMeta?.logCount).toBe(3);
    expect(schedulerMeta?.logCount).toBe(2);
  });

  it('should handle real-time log aggregation during process execution', async () => {
    const realTimeLogs: any[] = [];
    let totalLogsCaptured = 0;
    
    // Set up real-time aggregation
    logMonitor.on('log-entry', (entry: any) => {
      totalLogsCaptured++;
      
      // Immediately aggregate
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
      
      // Query aggregated logs in real-time
      const aggregated = logAggregator.getAggregatedLogs();
      realTimeLogs.push({
        captureTime: Date.now(),
        totalAggregated: aggregated.length,
        latestEntry: aggregated[aggregated.length - 1]
      });
    });

    // Start a process that logs over time
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'let count = 0; ' +
      'const interval = setInterval(() => { ' +
      '  count++; ' +
      '  console.log(`[TimedProcess] Log ${count}`); ' +
      '  if (count >= 5) { ' +
      '    clearInterval(interval); ' +
      '    process.exit(0); ' +
      '  } ' +
      '}, 100);' +
      '"',
      {}
    );

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    logAggregator.markProcessComplete(processId, 0);

    // Verify real-time aggregation
    expect(realTimeLogs.length).toBeGreaterThanOrEqual(1);
    expect(totalLogsCaptured).toBeGreaterThanOrEqual(1);

    // Verify incremental aggregation
    for (let i = 1; i < realTimeLogs.length; i++) {
      expect(realTimeLogs[i].totalAggregated).toBeGreaterThanOrEqual(realTimeLogs[i-1].totalAggregated);
    }

    // Verify final state
    const finalAggregated = logAggregator.getAggregatedLogs();
    expect(finalAggregated.length).toBe(totalLogsCaptured);

    const processLogs = logAggregator.getProcessLogs(processId);
    expect(processLogs.length).toBeGreaterThanOrEqual(1);
    expect(processLogs.every(log => log.message.includes('[TimedProcess]'))).toBe(true);
  });

  it('should maintain proper indexing during concurrent process logging', async () => {
    const concurrentProcesses: string[] = [];
    const logCounts: Map<string, number> = new Map();
    
    // Set up concurrent aggregation
    logMonitor.on('log-entry', (entry: any) => {
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
      
      // Track log counts per process
      logCounts.set(entry.processId, (logCounts.get(entry.processId) || 0) + 1);
    });

    // Start 4 concurrent processes with different logging patterns
    const processes = await Promise.all([
      logMonitor.startRealTimeMonitoring(
        'node -e "for(let i=1; i<=3; i++) console.log(`[P1] Message ${i}`);"',
        {}
      ),
      logMonitor.startRealTimeMonitoring(
        'node -e "for(let i=1; i<=5; i++) console.error(`[P2] Error ${i}`);"',
        {}
      ),
      logMonitor.startRealTimeMonitoring(
        'node -e "for(let i=1; i<=2; i++) console.log(`[P3] Info ${i}`);"',
        {}
      ),
      logMonitor.startRealTimeMonitoring(
        'node -e "for(let i=1; i<=4; i++) console.log(`[P4] Debug ${i}`);"',
        {}
      )
    ]);

    concurrentProcesses.push(...processes);

    // Wait for all processes
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark all as In Progress
    processes.forEach(processId => {
      logAggregator.markProcessComplete(processId, 0);
    });

    // Verify indexing integrity
    expect(logCounts.size).toBe(4);
    
    // Verify individual process logs
    const p1Logs = logAggregator.getProcessLogs(processes[0]);
    const p2Logs = logAggregator.getProcessLogs(processes[1]);
    const p3Logs = logAggregator.getProcessLogs(processes[2]);
    const p4Logs = logAggregator.getProcessLogs(processes[3]);

    expect(p1Logs.length).toBeGreaterThanOrEqual(1);
    expect(p2Logs.length).toBeGreaterThanOrEqual(1);
    expect(p3Logs.length).toBeGreaterThanOrEqual(1);
    expect(p4Logs.length).toBeGreaterThanOrEqual(1);

    // Verify cross-process isolation
    expect(p1Logs.every(log => log.message.includes('[P1]'))).toBe(true);
    expect(p2Logs.every(log => log.message.includes('[P2]'))).toBe(true);
    expect(p3Logs.every(log => log.message.includes('[P3]'))).toBe(true);
    expect(p4Logs.every(log => log.message.includes('[P4]'))).toBe(true);

    // Verify aggregated view
    const allAggregated = logAggregator.getAggregatedLogs();
    expect(allAggregated.length).toBeGreaterThanOrEqual(4); // At least one from each process

    // Verify sequence numbering is sequential
    const sequenceNumbers = allAggregated.map(log => log.sequenceNumber);
    const sortedNumbers = [...sequenceNumbers].sort((a, b) => a - b);
    expect(sequenceNumbers).toEqual(sortedNumbers); // Should already be in order
  });

  it('should handle process crash scenarios in aggregation', async () => {
    const crashEvents: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    logMonitor.on('process-crashed', (event: any) => {
      crashEvents.push(event);
      logAggregator.markProcessComplete(event.processId, event.code || 1);
    });

    // Start normal and crashing processes
    const normalProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Normal] Working\'); console.log(\'[Normal] In Progress\');"',
      {}
    );

    const crashingProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Crash] Starting\'); console.error(\'[Crash] Fatal error\'); process.exit(1);"',
      {}
    );

    const anotherNormalProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Normal2] Running\'); console.log(\'[Normal2] In Progress\');"',
      {}
    );

    // Wait for processes
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mark normal processes as In Progress
    logAggregator.markProcessComplete(normalProcess, 0);
    logAggregator.markProcessComplete(anotherNormalProcess, 0);

    // Verify crash handling
    expect(crashEvents.length).toBeGreaterThanOrEqual(1);

    // Verify logs were still collected from crashed process
    const crashLogs = logAggregator.getProcessLogs(crashingProcess);
    expect(crashLogs.length).toBeGreaterThanOrEqual(2);
    expect(crashLogs.some(log => log.message.includes('[Crash] Starting'))).toBe(true);
    expect(crashLogs.some(log => log.message.includes('[Crash] Fatal error'))).toBe(true);

    // Verify other processes were unaffected
    const normalLogs = logAggregator.getProcessLogs(normalProcess);
    const normal2Logs = logAggregator.getProcessLogs(anotherNormalProcess);

    expect(normalLogs.length).toBe(2);
    expect(normal2Logs.length).toBe(2);

    // Verify metadata reflects crash
    const crashMeta = logAggregator.getProcessMetadata(crashingProcess);
    const normalMeta = logAggregator.getProcessMetadata(normalProcess);

    expect(crashMeta?.status).toBe('crashed');
    expect(normalMeta?.status).toBe("completed");

    // Verify statistics
    const stats = logAggregator.getStatistics();
    expect(stats.crashedProcesses).toBe(1);
    expect(stats.passedProcesses).toBe(2);
    expect(stats.totalProcesses).toBe(3);
  });

  it('should support complex querying across indexed processes', async () => {
    // Set up aggregation pipeline
    logMonitor.on('log-entry', (entry: any) => {
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    // Create processes with known log patterns
    const dbProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'console.log(\'[DB] INFO: Database connected\'); ' +
      'console.error(\'[DB] ERROR: Query failed\'); ' +
      'console.log(\'[DB] INFO: Transaction committed\'); ' +
      'console.error(\'[DB] ERROR: Connection lost\'); ' +
      '"',
      {}
    );

    const apiProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'console.log(\'[API] INFO: Server started\'); ' +
      'console.log(\'[API] DEBUG: Request received\'); ' +
      'console.error(\'[API] ERROR: Authentication failed\'); ' +
      'console.log(\'[API] INFO: Response sent\'); ' +
      '"',
      {}
    );

    // Wait for logs
    await new Promise(resolve => setTimeout(resolve, 800));

    logAggregator.markProcessComplete(dbProcess, 0);
    logAggregator.markProcessComplete(apiProcess, 0);

    // Complex query 1: All error logs
    const errorLogs = logAggregator.getAggregatedLogs({
      levels: ['error']
    });
    expect(errorLogs.length).toBe(3);
    expect(errorLogs.every(log => log.level === 'error')).toBe(true);

    // Complex query 2: DB process only
    const dbOnlyLogs = logAggregator.getAggregatedLogs({
      processIds: [dbProcess]
    });
    expect(dbOnlyLogs.length).toBe(4);
    expect(dbOnlyLogs.every(log => log.processId === dbProcess)).toBe(true);

    // Complex query 3: INFO logs from API process
    const apiInfoLogs = logAggregator.getAggregatedLogs({
      processIds: [apiProcess],
      levels: ['info']
    });
    expect(apiInfoLogs.length).toBe(2);
    expect(apiInfoLogs.every(log => log.processId === apiProcess && log.level === 'info')).toBe(true);

    // Complex query 4: Pagination
    const page1 = logAggregator.getAggregatedLogs({
      limit: 3,
      offset: 0
    });
    const page2 = logAggregator.getAggregatedLogs({
      limit: 3,
      offset: 3
    });

    expect(page1.length).toBe(3);
    expect(page2.length).toBe(3);
    
    // No overlap between pages
    const page1Ids = page1.map(log => log.sequenceNumber);
    const page2Ids = page2.map(log => log.sequenceNumber);
    const intersection = page1Ids.filter(id => page2Ids.includes(id));
    expect(intersection.length).toBe(0);

    // Verify comprehensive statistics
    const stats = logAggregator.getStatistics();
    expect(stats.totalLogs).toBe(8);
    expect(stats.totalProcesses).toBe(2);
    expect(stats.passedProcesses).toBe(2);
    expect(stats.activeProcesses).toBe(0);
  });
});