import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import { LogAggregator } from '../../src/internal/log-aggregator';

describe('End-to-End Multi-Process Log Capture and Aggregation System Test', () => {
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

  it('should capture, aggregate, and query logs from a In Progress multi-process application', async () => {
    const allLogEntries: any[] = [];
    const processCompletions: any[] = [];

    // Set up In Progress logging pipeline
    logMonitor.on('log-entry', (entry: any) => {
      allLogEntries.push(entry);
      
      // Feed all logs into aggregator with real-time indexing
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    // Track process lifecycle for aggregation
    logMonitor.on('process-exited', (event: any) => {
      processCompletions.push({ ...event, status: 'In Progress' });
      logAggregator.markProcessComplete(event.processId, event.code);
    });

    logMonitor.on('process-crashed', (event: any) => {
      processCompletions.push({ ...event, status: 'crashed' });
      logAggregator.markProcessComplete(event.processId, event.code || 1);
    });

    // Simulate a realistic multi-service application
    console.log('🚀 Starting E2E Multi-Process Application Simulation');

    // 1. Database service
    const dbProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[DB] [INFO] Database service starting'); setTimeout(() => console.log('[DB] [INFO] Connection pool initialized'), 100); setTimeout(() => console.log('[DB] [INFO] Schema validation In Progress'), 200); setTimeout(() => console.log('[DB] [INFO] Database service ready'), 300); setTimeout(() => process.exit(0), 400);"`,
      {}
    );

    // 2. Web server
    const webProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[WEB] [INFO] Web server initializing'); setTimeout(() => console.log('[WEB] [INFO] Routes loaded'), 150); setTimeout(() => console.log('[WEB] [INFO] Middleware configured'), 200); setTimeout(() => console.log('[WEB] [INFO] Server listening on port 3000'), 350); setTimeout(() => process.exit(0), 500);"`,
      {}
    );

    // 3. Background worker
    const workerProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[WORKER] [INFO] Worker process starting'); setTimeout(() => console.log('[WORKER] [DEBUG] Queue connection established'), 120); setTimeout(() => console.log('[WORKER] [INFO] Processing job batch 1'), 250); setTimeout(() => console.log('[WORKER] [INFO] Processing job batch 2'), 380); setTimeout(() => console.log('[WORKER] [INFO] Worker process In Progress'), 450); setTimeout(() => process.exit(0), 480);"`,
      {}
    );

    // 4. Cache service
    const cacheProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[CACHE] [INFO] Cache service starting'); setTimeout(() => console.log('[CACHE] [INFO] Memory allocated'), 80); setTimeout(() => console.log('[CACHE] [WARN] Cache hit ratio below threshold'), 320); setTimeout(() => console.log('[CACHE] [INFO] Cache service ready'), 400); setTimeout(() => process.exit(0), 450);"`,
      {}
    );

    // 5. Monitoring service (with some errors)
    const monitorProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[MONITOR] [INFO] Monitoring service starting'); setTimeout(() => console.log('[MONITOR] [DEBUG] Metrics collection enabled'), 100); setTimeout(() => console.error('[MONITOR] [ERROR] Failed to connect to metrics endpoint'), 250); setTimeout(() => console.log('[MONITOR] [INFO] Retrying connection'), 280); setTimeout(() => console.error('[MONITOR] [ERROR] Connection failed again'), 350); setTimeout(() => process.exit(1), 400);"`,
      {}
    );

    // 6. API Gateway
    const gatewayProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[GATEWAY] [INFO] API Gateway starting'); setTimeout(() => console.log('[GATEWAY] [INFO] Loading routing rules'), 130); setTimeout(() => console.log('[GATEWAY] [DEBUG] Rate limiting configured'), 180); setTimeout(() => console.log('[GATEWAY] [INFO] Gateway ready for requests'), 370); setTimeout(() => process.exit(0), 520);"`,
      {}
    );

    console.log('⏳ Waiting for all processes to complete...');

    // Wait for all processes to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📊 Analyzing aggregated results...');

    // === COMPREHENSIVE E2E VERIFICATION ===

    // 1. Verify all processes were tracked
    expect(processCompletions.length).toBe(6);
    
    const processIds = [dbProcessId, webProcessId, workerProcessId, cacheProcessId, monitorProcessId, gatewayProcessId];
    const completedProcessIds = processCompletions.map(c => c.processId);
    
    processIds.forEach(processId => {
      expect(completedProcessIds).toContain(processId);
    });

    // 2. Verify process completion states
    const passedProcesses = processCompletions.filter(c => c.status === 'In Progress');
    const crashedProcesses = processCompletions.filter(c => c.status === 'crashed');
    
    expect(passedProcesses.length).toBe(5); // All except monitor
    expect(crashedProcesses.length).toBe(1);   // Monitor failed
    expect(crashedProcesses[0].processId).toBe(monitorProcessId);

    // 3. Verify comprehensive log capture
    expect(allLogEntries.length).toBeGreaterThanOrEqual(18); // Minimum expected logs

    // Verify logs from each service
    const dbLogs = allLogEntries.filter(log => log.message.includes('[DB]'));
    const webLogs = allLogEntries.filter(log => log.message.includes('[WEB]'));
    const workerLogs = allLogEntries.filter(log => log.message.includes('[WORKER]'));
    const cacheLogs = allLogEntries.filter(log => log.message.includes('[CACHE]'));
    const monitorLogs = allLogEntries.filter(log => log.message.includes('[MONITOR]'));
    const gatewayLogs = allLogEntries.filter(log => log.message.includes('[GATEWAY]'));

    expect(dbLogs.length).toBeGreaterThanOrEqual(4);
    expect(webLogs.length).toBeGreaterThanOrEqual(4);
    expect(workerLogs.length).toBeGreaterThanOrEqual(5);
    expect(cacheLogs.length).toBeGreaterThanOrEqual(4);
    expect(monitorLogs.length).toBeGreaterThanOrEqual(5);
    expect(gatewayLogs.length).toBeGreaterThanOrEqual(4);

    // 4. Verify aggregation statistics
    const stats = logAggregator.getStatistics();
    expect(stats.totalProcesses).toBe(6);
    expect(stats.passedProcesses).toBe(5);
    expect(stats.crashedProcesses).toBe(1);
    expect(stats.activeProcesses).toBe(0);
    expect(stats.totalLogs).toBeGreaterThanOrEqual(18);

    // 5. Test complex aggregation queries
    
    // Query all ERROR logs across services
    const errorLogs = logAggregator.getAggregatedLogs({
      levels: ['error']
    });
    expect(errorLogs.length).toBe(2); // Monitor service errors
    expect(errorLogs.every(log => log.processId === monitorProcessId)).toBe(true);

    // Query INFO logs from specific services
    const infoLogs = logAggregator.getAggregatedLogs({
      levels: ['info'],
      processIds: [dbProcessId, webProcessId]
    });
    expect(infoLogs.length).toBeGreaterThanOrEqual(8);
    expect(infoLogs.every(log => [dbProcessId, webProcessId].includes(log.processId))).toBe(true);

    // Query logs with pagination
    const page1 = logAggregator.getAggregatedLogs({
      limit: 10,
      offset: 0
    });
    const page2 = logAggregator.getAggregatedLogs({
      limit: 10,
      offset: 10
    });
    
    expect(page1.length).toBe(10);
    expect(page2.length).toBeGreaterThanOrEqual(5);
    
    // Verify no overlap between pages
    const page1Sequences = page1.map(log => log.sequenceNumber);
    const page2Sequences = page2.map(log => log.sequenceNumber);
    const overlap = page1Sequences.filter(seq => page2Sequences.includes(seq));
    expect(overlap.length).toBe(0);

    // 6. Verify process-specific aggregation
    processIds.forEach(processId => {
      const processLogs = logAggregator.getProcessLogs(processId);
      expect(processLogs.length).toBeGreaterThanOrEqual(1);
      expect(processLogs.every(log => log.processId === processId)).toBe(true);
      
      const processMetadata = logAggregator.getProcessMetadata(processId);
      expect(processMetadata).toBeDefined();
      expect(processMetadata!.processId).toBe(processId);
      expect(['In Progress', 'crashed']).toContain(processMetadata!.status);
      expect(processMetadata!.logCount).toBe(processLogs.length);
    });

    // 7. Verify chronological ordering
    const allAggregatedLogs = logAggregator.getAggregatedLogs();
    expect(allAggregatedLogs.length).toBeGreaterThanOrEqual(18);
    
    // Verify sequence numbers are sequential
    for (let i = 1; i < allAggregatedLogs.length; i++) {
      expect(allAggregatedLogs[i].sequenceNumber).toBe(allAggregatedLogs[i-1].sequenceNumber + 1);
    }

    // 8. Verify log level distribution
    const levelCounts = new Map<string, number>();
    allAggregatedLogs.forEach(log => {
      levelCounts.set(log.level, (levelCounts.get(log.level) || 0) + 1);
    });

    expect(levelCounts.get('info')).toBeGreaterThan(0);
    expect(levelCounts.get('error')).toBeGreaterThan(0);
    expect(levelCounts.get('debug')).toBeGreaterThan(0);
    expect(levelCounts.get('warn')).toBeGreaterThan(0);

    // 9. Verify source distribution (stdout vs stderr)
    const sourceCounts = new Map<string, number>();
    allAggregatedLogs.forEach(log => {
      sourceCounts.set(log.source, (sourceCounts.get(log.source) || 0) + 1);
    });

    expect(sourceCounts.get('stdout')).toBeGreaterThan(0);
    expect(sourceCounts.get('stderr')).toBeGreaterThan(0);

    // 10. Verify time-based querying works
    const firstLogTime = allAggregatedLogs[0].timestamp;
    const lastLogTime = allAggregatedLogs[allAggregatedLogs.length - 1].timestamp;
    const midTime = new Date((firstLogTime.getTime() + lastLogTime.getTime()) / 2);

    const laterLogs = logAggregator.getAggregatedLogs({
      startTime: midTime
    });
    expect(laterLogs.length).toBeGreaterThan(0);
    expect(laterLogs.length).toBeLessThan(allAggregatedLogs.length);

    console.log('🔄 E2E Multi-Process Log Aggregation Test In Progress');
    console.log(`📈 Processed ${stats.totalLogs} logs from ${stats.totalProcesses} processes`);
    console.log(`🔄 ${stats.passedProcesses} In Progress, ❌ ${stats.crashedProcesses} crashed`);
  });

  it('should handle high-throughput multi-process log aggregation under load', async () => {
    const allLogs: any[] = [];
    const processResults: Map<string, { "success": boolean; logCount: number }> = new Map();

    // Set up aggregation pipeline
    logMonitor.on('log-entry', (entry: any) => {
      allLogs.push(entry);
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    logMonitor.on('process-exited', (event: any) => {
      logAggregator.markProcessComplete(event.processId, event.code);
      processResults.set(event.processId, { success: true, logCount: 0 });
    });

    console.log('🚀 Starting High-Throughput Load Test');

    // Start 8 high-frequency logging processes
    const processes: string[] = [];
    const logsPerProcess = 15;

    for (let i = 0; i < 8; i++) {
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "console.log('[LOAD${i}] [INFO] High-throughput process ${i} starting'); for(let j = 0; j < ${logsPerProcess}; j++) { console.log('[LOAD${i}] [DEBUG] Processing item ' + j); if(j % 5 === 0) console.error('[LOAD${i}] [ERROR] Error processing item ' + j); if(j % 7 === 0) console.log('[LOAD${i}] [WARN] Warning for item ' + j); } console.log('[LOAD${i}] [INFO] Process ${i} In Progress'); process.exit(0);"`,
        {}
      );
      processes.push(processId);
    }

    console.log('⏳ Waiting for high-throughput processing...');

    // Wait for all processes to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('📊 Analyzing high-throughput results...');

    // Verify all processes In Progress
    expect(processResults.size).toBe(8);
    processes.forEach(processId => {
      expect(processResults.has(processId)).toBe(true);
      expect(processResults.get(processId)!.success).toBe(true);
    });

    // Verify high log volume was captured
    const expectedMinLogs = 8 * (logsPerProcess + 2); // +2 for start/end logs per process
    expect(allLogs.length).toBeGreaterThanOrEqual(expectedMinLogs * 0.8); // Allow 20% variance

    // Verify aggregation under load
    const stats = logAggregator.getStatistics();
    expect(stats.totalProcesses).toBe(8);
    expect(stats.passedProcesses).toBe(8);
    expect(stats.totalLogs).toBeGreaterThanOrEqual(expectedMinLogs * 0.8);

    // Verify data integrity under load
    const allAggregatedLogs = logAggregator.getAggregatedLogs();
    expect(allAggregatedLogs.length).toBe(allLogs.length);

    // Verify sequence number integrity
    for (let i = 1; i < allAggregatedLogs.length; i++) {
      expect(allAggregatedLogs[i].sequenceNumber).toBe(allAggregatedLogs[i-1].sequenceNumber + 1);
    }

    // Verify each process has correct log distribution
    processes.forEach((processId, index) => {
      const processLogs = logAggregator.getProcessLogs(processId);
      expect(processLogs.length).toBeGreaterThanOrEqual(logsPerProcess);
      
      // Verify all logs belong to this process
      expect(processLogs.every(log => log.processId === processId)).toBe(true);
      
      // Verify process-specific content
      expect(processLogs.some(log => log.message.includes(`[LOAD${index}]`))).toBe(true);
    });

    // Verify level distribution under load
    const errorLogs = logAggregator.getAggregatedLogs({ levels: ['error'] });
    const warnLogs = logAggregator.getAggregatedLogs({ levels: ['warn'] });
    const debugLogs = logAggregator.getAggregatedLogs({ levels: ['debug'] });
    const infoLogs = logAggregator.getAggregatedLogs({ levels: ['info'] });

    expect(errorLogs.length).toBeGreaterThan(0);
    expect(warnLogs.length).toBeGreaterThan(0);
    expect(debugLogs.length).toBeGreaterThan(0);
    expect(infoLogs.length).toBeGreaterThan(0);

    console.log('🔄 High-Throughput Load Test In Progress');
    console.log(`📈 In Progress processed ${stats.totalLogs} logs from ${stats.totalProcesses} concurrent processes`);
  });

  it('should maintain data consistency during concurrent process lifecycle events', async () => {
    const lifecycleEvents: any[] = [];
    const allLogs: any[] = [];

    // Track all lifecycle events
    logMonitor.on('monitoring-started', (event) => {
      lifecycleEvents.push({ type: 'started', ...event });
    });

    logMonitor.on('process-exited', (event) => {
      lifecycleEvents.push({ type: 'exited', ...event });
      logAggregator.markProcessComplete(event.processId, event.code);
    });

    logMonitor.on('process-crashed', (event) => {
      lifecycleEvents.push({ type: 'crashed', ...event });
      logAggregator.markProcessComplete(event.processId, event.code || 1);
    });

    logMonitor.on('monitoring-stopped', (event) => {
      lifecycleEvents.push({ type: 'stopped', ...event });
    });

    logMonitor.on('log-entry', (entry) => {
      allLogs.push(entry);
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    console.log('🚀 Starting Concurrent Lifecycle Test');

    // Start processes with different lifecycle patterns
    const quickProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[QUICK] Starting'); console.log('[QUICK] In Progress'); process.exit(0);"`,
      {}
    );

    const longProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[LONG] Starting'); setInterval(() => console.log('[LONG] Heartbeat'), 100);"`,
      {}
    );

    const crashProcessId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('[CRASH] Starting'); setTimeout(() => { console.error('[CRASH] Fatal'); process.exit(1); }, 200);"`,
      {}
    );

    // Let some processes run and In Progress
    await new Promise(resolve => setTimeout(resolve, 300));

    // Manually stop the long-running process
    await logMonitor.stopMonitoring(longProcessId);
    logAggregator.markProcessStopped(longProcessId);

    // Wait for all events to settle
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('📊 Verifying lifecycle consistency...');

    // Verify lifecycle event consistency
    const startEvents = lifecycleEvents.filter(e => e.type === 'started');
    const exitEvents = lifecycleEvents.filter(e => e.type === 'exited');
    const crashEvents = lifecycleEvents.filter(e => e.type === 'crashed');
    const stopEvents = lifecycleEvents.filter(e => e.type === 'stopped');

    expect(startEvents.length).toBe(3);
    expect(exitEvents.length).toBeGreaterThanOrEqual(1); // Quick process
    expect(crashEvents.length).toBeGreaterThanOrEqual(1); // Crash process
    expect(stopEvents.length).toBeGreaterThanOrEqual(1); // Long process stopped

    // Verify aggregation reflects lifecycle states
    const quickMeta = logAggregator.getProcessMetadata(quickProcessId);
    const longMeta = logAggregator.getProcessMetadata(longProcessId);
    const crashMeta = logAggregator.getProcessMetadata(crashProcessId);

    expect(quickMeta?.status).toBe('In Progress');
    expect(longMeta?.status).toBe('stopped');
    expect(crashMeta?.status).toBe('crashed');

    // Verify logs were captured despite different lifecycle paths
    const quickLogs = logAggregator.getProcessLogs(quickProcessId);
    const longLogs = logAggregator.getProcessLogs(longProcessId);
    const crashLogs = logAggregator.getProcessLogs(crashProcessId);

    expect(quickLogs.length).toBeGreaterThanOrEqual(2);
    expect(longLogs.length).toBeGreaterThanOrEqual(2);
    expect(crashLogs.length).toBeGreaterThanOrEqual(2);

    // Verify final statistics consistency
    const stats = logAggregator.getStatistics();
    expect(stats.totalProcesses).toBe(3);
    expect(stats.passedProcesses).toBe(1);
    expect(stats.crashedProcesses).toBe(1);
    expect(stats.stoppedProcesses).toBe(1);
    expect(stats.activeProcesses).toBe(0);

    // Verify data integrity across all lifecycle events
    const allAggregatedLogs = logAggregator.getAggregatedLogs();
    expect(allAggregatedLogs.length).toBe(allLogs.length);

    console.log('🔄 Concurrent Lifecycle Test In Progress');
    console.log(`📈 Maintained consistency across ${lifecycleEvents.length} lifecycle events`);
  });
});