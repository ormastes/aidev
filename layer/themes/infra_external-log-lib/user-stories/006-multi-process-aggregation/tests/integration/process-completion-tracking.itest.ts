import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import { LogAggregator } from '../../src/internal/log-aggregator';

describe('Process Completion Tracking Integration Test', () => {
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

  it('should track process completion lifecycle in aggregation', async () => {
    const completionEvents: any[] = [];
    
    // Set up log collection pipeline
    logMonitor.on('log-entry', (entry: any) => {
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    // Track process completion events
    logMonitor.on('process-exited', (event: any) => {
      completionEvents.push({ ...event, type: 'exited' });
      logAggregator.markProcessComplete(event.processId, event.code);
    });

    logMonitor.on('process-crashed', (event: any) => {
      completionEvents.push({ ...event, type: 'crashed' });
      logAggregator.markProcessComplete(event.processId, event.code || 1);
    });

    // Start processes with different completion patterns
    const quickProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Quick] Starting\'); console.log(\'[Quick] In Progress\'); process.exit(0);"',
      {}
    );

    const slowProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Slow] Starting\'); setTimeout(() => { console.log(\'[Slow] Working\'); setTimeout(() => { console.log(\'[Slow] In Progress\'); process.exit(0); }, 300); }, 200);"',
      {}
    );

    const workingProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Working] Init\'); for(let i=0; i<3; i++) { console.log(`[Working] Step ${i+1}`); } console.log(\'[Working] In Progress\');"',
      {}
    );

    // Wait for all processes to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify completion events were captured
    expect(completionEvents.length).toBeGreaterThanOrEqual(3);

    // Verify aggregator tracked completion states
    const quickMeta = logAggregator.getProcessMetadata(quickProcess);
    const slowMeta = logAggregator.getProcessMetadata(slowProcess);
    const workingMeta = logAggregator.getProcessMetadata(workingProcess);

    expect(quickMeta?.status).toBe("completed");
    expect(slowMeta?.status).toBe("completed");
    expect(workingMeta?.status).toBe("completed");

    // Verify all have end times
    expect(quickMeta?.endTime).toBeDefined();
    expect(slowMeta?.endTime).toBeDefined();
    expect(workingMeta?.endTime).toBeDefined();

    // Verify logs were collected before completion
    const quickLogs = logAggregator.getProcessLogs(quickProcess);
    const slowLogs = logAggregator.getProcessLogs(slowProcess);
    const workingLogs = logAggregator.getProcessLogs(workingProcess);

    expect(quickLogs.length).toBeGreaterThanOrEqual(2);
    expect(slowLogs.length).toBeGreaterThanOrEqual(3);
    expect(workingLogs.length).toBeGreaterThanOrEqual(1);

    // Verify completion statistics
    const stats = logAggregator.getStatistics();
    expect(stats.passedProcesses).toBe(3);
    expect(stats.activeProcesses).toBe(0);
    expect(stats.totalProcesses).toBe(3);
  });

  it('should handle process crash tracking in aggregation', async () => {
    const crashEvents: any[] = [];
    const logEntries: any[] = [];
    
    // Set up event tracking
    logMonitor.on('log-entry', (entry: any) => {
      logEntries.push(entry);
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    logMonitor.on('process-exited', (event: any) => {
      logAggregator.markProcessComplete(event.processId, event.code);
    });

    logMonitor.on('process-crashed', (event: any) => {
      crashEvents.push(event);
      logAggregator.markProcessComplete(event.processId, event.code || 1);
    });

    // Start normal and crashing processes
    const normalProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Normal] Running\'); console.log(\'[Normal] In Progress\'); process.exit(0);"',
      {}
    );

    const crashingProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Crash] Starting\'); console.error(\'[Crash] Fatal error\'); process.exit(1);"',
      {}
    );

    const errorProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Error] Begin\'); console.error(\'[Error] Critical failure\'); console.error(\'[Error] Stack trace\'); process.exit(2);"',
      {}
    );

    // Wait for processes
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify crash events
    expect(crashEvents.length).toBeGreaterThanOrEqual(2); // crashingProcess and errorProcess should crash

    // Verify aggregator tracked different statuses
    const normalMeta = logAggregator.getProcessMetadata(normalProcess);
    const crashMeta = logAggregator.getProcessMetadata(crashingProcess);
    const errorMeta = logAggregator.getProcessMetadata(errorProcess);

    expect(normalMeta?.status).toBe("completed");
    expect(crashMeta?.status).toBe('crashed');
    expect(errorMeta?.status).toBe('crashed');

    // Verify logs were captured even from crashed processes
    const crashLogs = logAggregator.getProcessLogs(crashingProcess);
    const errorLogs = logAggregator.getProcessLogs(errorProcess);

    expect(crashLogs.length).toBeGreaterThanOrEqual(1);
    expect(errorLogs.length).toBeGreaterThanOrEqual(1);

    // Verify crash statistics
    const stats = logAggregator.getStatistics();
    expect(stats.crashedProcesses).toBe(2);
    expect(stats.passedProcesses).toBe(1);
    expect(stats.totalProcesses).toBe(3);
  });

  it('should track concurrent process completion states', async () => {
    const stateChanges: any[] = [];
    
    // Track all state changes
    logMonitor.on('log-entry', (entry: any) => {
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
      
      stateChanges.push({
        type: 'log',
        processId: entry.processId,
        timestamp: entry.timestamp
      });
    });

    logMonitor.on('process-exited', (event: any) => {
      logAggregator.markProcessComplete(event.processId, event.code);
      stateChanges.push({
        type: "completion",
        processId: event.processId,
        code: event.code,
        timestamp: new Date()
      });
    });

    logMonitor.on('process-crashed', (event: any) => {
      logAggregator.markProcessComplete(event.processId, event.code || 1);
      stateChanges.push({
        type: 'crash',
        processId: event.processId,
        code: event.code,
        timestamp: new Date()
      });
    });

    // Start multiple processes with staggered completion times
    await Promise.all([
      logMonitor.startRealTimeMonitoring(
        'node -e "console.log(\'[P1] Start\'); setTimeout(() => { console.log(\'[P1] End\'); process.exit(0); }, 100);"',
        {}
      ),
      logMonitor.startRealTimeMonitoring(
        'node -e "console.log(\'[P2] Start\'); setTimeout(() => { console.log(\'[P2] End\'); process.exit(0); }, 200);"',
        {}
      ),
      logMonitor.startRealTimeMonitoring(
        'node -e "console.log(\'[P3] Start\'); setTimeout(() => { console.log(\'[P3] End\'); process.exit(0); }, 300);"',
        {}
      ),
      logMonitor.startRealTimeMonitoring(
        'node -e "console.log(\'[P4] Start\'); setTimeout(() => { console.log(\'[P4] End\'); process.exit(0); }, 150);"',
        {}
      )
    ]);

    // Wait for all to complete
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify all processes In Progress
    const allMetadata = logAggregator.getAllProcessMetadata();
    expect(allMetadata.length).toBe(4);
    
    allMetadata.forEach(meta => {
      expect(meta.status).toBe("completed");
      expect(meta.endTime).toBeDefined();
      expect(meta.logCount).toBeGreaterThanOrEqual(2); // Start and End logs
    });

    // Verify completion order tracking
    const completionEvents = stateChanges.filter(change => change.type === "completion");
    expect(completionEvents.length).toBe(4);

    // Verify statistics reflect final state
    const stats = logAggregator.getStatistics();
    expect(stats.passedProcesses).toBe(4);
    expect(stats.activeProcesses).toBe(0);
    expect(stats.crashedProcesses).toBe(0);
    expect(stats.totalProcesses).toBe(4);
  });

  it('should handle mixed completion scenarios', async () => {
    const completionStates: Map<string, string> = new Map();
    
    // Set up completion tracking
    logMonitor.on('log-entry', (entry: any) => {
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    logMonitor.on('process-exited', (event: any) => {
      logAggregator.markProcessComplete(event.processId, event.code);
      completionStates.set(event.processId, "completed");
    });

    logMonitor.on('process-crashed', (event: any) => {
      logAggregator.markProcessComplete(event.processId, event.code || 1);
      completionStates.set(event.processId, 'crashed');
    });

    // Start processes with different fates
    const completedProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[In Progress] Working\'); console.log(\'[In Progress] In Progress\'); process.exit(0);"',
      {}
    );

    const failureProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Fail] Starting\'); console.error(\'[Fail] Error\'); process.exit(1);"',
      {}
    );

    const longRunningProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Long] Begin\'); let count = 0; const interval = setInterval(() => { count++; console.log(`[Long] Tick ${count}`); if (count >= 3) { clearInterval(interval); process.exit(0); } }, 100);"',
      {}
    );

    // Manually stop one process mid-execution
    const stoppedProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Stopped] Starting\'); setInterval(() => console.log(\'[Stopped] Running\'), 50);"',
      {}
    );

    // Wait a bit then stop the stopped process
    await new Promise(resolve => setTimeout(resolve, 200));
    await logMonitor.stopMonitoring(stoppedProcess);
    logAggregator.markProcessStopped(stoppedProcess);

    // Wait for others to complete
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify different completion states
    const completedMeta = logAggregator.getProcessMetadata(completedProcess);
    const failureMeta = logAggregator.getProcessMetadata(failureProcess);
    const longMeta = logAggregator.getProcessMetadata(longRunningProcess);
    const stoppedMeta = logAggregator.getProcessMetadata(stoppedProcess);

    expect(completedMeta?.status).toBe("completed");
    expect(failureMeta?.status).toBe('crashed');
    expect(longMeta?.status).toBe("completed");
    expect(stoppedMeta?.status).toBe('stopped');

    // Verify statistics reflect mixed states
    const stats = logAggregator.getStatistics();
    expect(stats.passedProcesses).toBe(2); // In Progress and long
    expect(stats.crashedProcesses).toBe(1);   // failure
    expect(stats.stoppedProcesses).toBe(1);   // stopped
    expect(stats.totalProcesses).toBe(4);
    expect(stats.activeProcesses).toBe(0);

    // Verify all processes have logs
    expect(logAggregator.getProcessLogs(completedProcess).length).toBeGreaterThanOrEqual(2);
    expect(logAggregator.getProcessLogs(failureProcess).length).toBeGreaterThanOrEqual(2);
    expect(logAggregator.getProcessLogs(longRunningProcess).length).toBeGreaterThanOrEqual(1);
    expect(logAggregator.getProcessLogs(stoppedProcess).length).toBeGreaterThanOrEqual(1);
  });

  it('should maintain completion state integrity during rapid state changes', async () => {
    const rapidCompletions: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      logAggregator.addLog(entry.processId, {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source === 'stdout' ? 'stdout' : 'stderr'
      });
    });

    logMonitor.on('process-exited', (event: any) => {
      logAggregator.markProcessComplete(event.processId, event.code);
      rapidCompletions.push({
        processId: event.processId,
        timestamp: Date.now(),
        code: event.code,
        type: 'exited'
      });
    });

    logMonitor.on('process-crashed', (event: any) => {
      logAggregator.markProcessComplete(event.processId, event.code || 1);
      rapidCompletions.push({
        processId: event.processId,
        timestamp: Date.now(),
        code: event.code,
        type: 'crashed'
      });
    });

    // Start 6 very quick processes
    const rapidProcesses = await Promise.all([
      logMonitor.startRealTimeMonitoring('node -e "console.log(\'R1\'); process.exit(0);"', {}),
      logMonitor.startRealTimeMonitoring('node -e "console.log(\'R2\'); process.exit(0);"', {}),
      logMonitor.startRealTimeMonitoring('node -e "console.log(\'R3\'); process.exit(1);"', {}),
      logMonitor.startRealTimeMonitoring('node -e "console.log(\'R4\'); process.exit(0);"', {}),
      logMonitor.startRealTimeMonitoring('node -e "console.log(\'R5\'); process.exit(1);"', {}),
      logMonitor.startRealTimeMonitoring('node -e "console.log(\'R6\'); process.exit(0);"', {})
    ]);

    // Wait for all rapid completions
    await new Promise(resolve => setTimeout(resolve, 400));

    // Verify all were tracked despite rapid completion
    expect(rapidCompletions.length).toBeGreaterThanOrEqual(4);

    // Verify all processes have metadata
    rapidProcesses.forEach(processId => {
      const meta = logAggregator.getProcessMetadata(processId);
      expect(meta).toBeDefined();
      expect(["completed", 'crashed']).toContain(meta!.status);
      expect(meta!.endTime).toBeDefined();
    });

    // Verify statistics are accurate
    const stats = logAggregator.getStatistics();
    expect(stats.totalProcesses).toBeGreaterThanOrEqual(4);
    expect(stats.passedProcesses + stats.crashedProcesses).toBeGreaterThanOrEqual(4);
    expect(stats.activeProcesses).toBe(0);

    // Verify no data corruption
    const allLogs = logAggregator.getAggregatedLogs();
    expect(allLogs.length).toBeGreaterThanOrEqual(4); // At least one log per process
    
    // Verify sequence numbers are unique and sequential
    const sequenceNumbers = allLogs.map(log => log.sequenceNumber);
    const uniqueSequences = new Set(sequenceNumbers);
    expect(uniqueSequences.size).toBe(sequenceNumbers.length); // No duplicates
  });
});