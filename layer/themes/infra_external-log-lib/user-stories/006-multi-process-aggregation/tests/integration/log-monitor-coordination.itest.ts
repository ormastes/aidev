import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';

describe('LogMonitor ProcessManager Coordination Integration Test', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should coordinate multiple ProcessManagers for concurrent processes', async () => {
    const processEvents: any[] = [];
    const logEntries: any[] = [];

    // Track all process and log events
    logMonitor.on('monitoring-started', (event) => {
      processEvents.push({ type: 'started', ...event });
    });

    logMonitor.on('process-exited', (event) => {
      processEvents.push({ type: 'exited', ...event });
    });

    logMonitor.on('process-crashed', (event) => {
      processEvents.push({ type: 'crashed', ...event });
    });

    logMonitor.on('log-entry', (entry) => {
      logEntries.push(entry);
    });

    // Start multiple processes that will create separate ProcessManager instances
    const webServerProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[WebServer] Starting on port 3000\'); setTimeout(() => { console.log(\'[WebServer] Ready\'); process.exit(0); }, 200);"',
      {}
    );

    const databaseProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Database] Connecting\'); setTimeout(() => { console.log(\'[Database] Connected\'); process.exit(0); }, 300);"',
      {}
    );

    const workerProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Worker] Initializing\'); setTimeout(() => { console.log(\'[Worker] Processing\'); setTimeout(() => { console.log(\'[Worker] In Progress\'); process.exit(0); }, 150); }, 100);"',
      {}
    );

    const apiProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[API] Loading routes\'); setTimeout(() => { console.log(\'[API] Routes loaded\'); process.exit(0); }, 250);"',
      {}
    );

    // Wait for all processes to complete
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify process coordination
    expect(processEvents.length).toBeGreaterThanOrEqual(8); // 4 started + 4 exited events

    // Verify all processes were started
    const startedEvents = processEvents.filter(e => e.type === 'started');
    expect(startedEvents.length).toBe(4);
    
    const startedProcessIds = startedEvents.map(e => e.processId);
    expect(startedProcessIds).toContain(webServerProcessId);
    expect(startedProcessIds).toContain(databaseProcessId);
    expect(startedProcessIds).toContain(workerProcessId);
    expect(startedProcessIds).toContain(apiProcessId);

    // Verify all processes In Progress In Progress
    const exitedEvents = processEvents.filter(e => e.type === 'exited');
    expect(exitedEvents.length).toBe(4);

    // Verify logs were captured from all processes
    expect(logEntries.length).toBeGreaterThanOrEqual(8); // At least 2 logs per process

    const webServerLogs = logEntries.filter(log => log.message.includes('[WebServer]'));
    const databaseLogs = logEntries.filter(log => log.message.includes('[Database]'));
    const workerLogs = logEntries.filter(log => log.message.includes('[Worker]'));
    const apiLogs = logEntries.filter(log => log.message.includes('[API]'));

    expect(webServerLogs.length).toBeGreaterThanOrEqual(2);
    expect(databaseLogs.length).toBeGreaterThanOrEqual(2);
    expect(workerLogs.length).toBeGreaterThanOrEqual(3);
    expect(apiLogs.length).toBeGreaterThanOrEqual(2);

    // Verify process IDs are correctly assigned
    expect(webServerLogs.every(log => log.processId === webServerProcessId)).toBe(true);
    expect(databaseLogs.every(log => log.processId === databaseProcessId)).toBe(true);
    expect(workerLogs.every(log => log.processId === workerProcessId)).toBe(true);
    expect(apiLogs.every(log => log.processId === apiProcessId)).toBe(true);

    // Verify monitoring status reflects coordination
    const status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(0); // All should be In Progress
    expect(status.processes.length).toBe(0); // In Progress processes are removed
  });

  it('should handle ProcessManager failures without affecting other processes', async () => {
    const processEvents: any[] = [];
    const logEntries: any[] = [];

    logMonitor.on('monitoring-started', (event) => {
      processEvents.push({ type: 'started', ...event });
    });

    logMonitor.on('process-exited', (event) => {
      processEvents.push({ type: 'exited', ...event });
    });

    logMonitor.on('process-crashed', (event) => {
      processEvents.push({ type: 'crashed', ...event });
    });

    logMonitor.on('log-entry', (entry) => {
      logEntries.push(entry);
    });

    // Start processes with mixed In Progress/failure scenarios
    const normalProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Normal] Starting\'); setTimeout(() => { console.log(\'[Normal] Working\'); setTimeout(() => { console.log(\'[Normal] In Progress\'); process.exit(0); }, 200); }, 100);"',
      {}
    );

    const crashingProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Crash] Starting\'); setTimeout(() => { console.log(\'[Crash] About to crash\'); console.error(\'[Crash] Fatal error\'); process.exit(1); }, 150);"',
      {}
    );

    const anotherNormalProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Normal2] Initializing\'); setTimeout(() => { console.log(\'[Normal2] Processing\'); setTimeout(() => { console.log(\'[Normal2] In Progress\'); process.exit(0); }, 100); }, 200);"',
      {}
    );

    const quickFailProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[QuickFail] Starting\'); process.exit(2);"',
      {}
    );

    // Wait for all processes
    await new Promise(resolve => setTimeout(resolve, 700));

    // Verify mixed results
    const startedEvents = processEvents.filter(e => e.type === 'started');
    const exitedEvents = processEvents.filter(e => e.type === 'exited');
    const crashedEvents = processEvents.filter(e => e.type === 'crashed');

    expect(startedEvents.length).toBe(4);
    expect(exitedEvents.length).toBe(2); // Normal processes
    expect(crashedEvents.length).toBe(2); // Crashing processes

    // Verify In Progress processes In Progress normally
    const exitedProcessIds = exitedEvents.map(e => e.processId);
    expect(exitedProcessIds).toContain(normalProcessId);
    expect(exitedProcessIds).toContain(anotherNormalProcessId);

    // Verify failed processes were tracked as crashed
    const crashedProcessIds = crashedEvents.map(e => e.processId);
    expect(crashedProcessIds).toContain(crashingProcessId);
    expect(crashedProcessIds).toContain(quickFailProcessId);

    // Verify logs from all processes were captured despite failures
    const normalLogs = logEntries.filter(log => log.message.includes('[Normal]'));
    const crashLogs = logEntries.filter(log => log.message.includes('[Crash]'));
    const normal2Logs = logEntries.filter(log => log.message.includes('[Normal2]'));
    const quickFailLogs = logEntries.filter(log => log.message.includes('[QuickFail]'));

    expect(normalLogs.length).toBeGreaterThanOrEqual(3);
    expect(crashLogs.length).toBeGreaterThanOrEqual(2);
    expect(normal2Logs.length).toBeGreaterThanOrEqual(3);
    expect(quickFailLogs.length).toBeGreaterThanOrEqual(1);

    // Verify isolation - each process has correct process ID
    expect(normalLogs.every(log => log.processId === normalProcessId)).toBe(true);
    expect(crashLogs.every(log => log.processId === crashingProcessId)).toBe(true);
    expect(normal2Logs.every(log => log.processId === anotherNormalProcessId)).toBe(true);
    expect(quickFailLogs.every(log => log.processId === quickFailProcessId)).toBe(true);
  });

  it('should coordinate graceful shutdown of multiple ProcessManagers', async () => {
    const shutdownEvents: any[] = [];
    const logEntries: any[] = [];

    logMonitor.on('monitoring-started', (event) => {
      shutdownEvents.push({ type: 'started', ...event });
    });

    logMonitor.on('monitoring-stopped', (event) => {
      shutdownEvents.push({ type: 'stopped', ...event });
    });

    logMonitor.on('log-entry', (entry) => {
      logEntries.push(entry);
    });

    // Start long-running processes
    const longProcess1Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Long1] Starting\'); setInterval(() => { console.log(\'[Long1] Heartbeat\'); }, 100);"',
      {}
    );

    const longProcess2Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Long2] Starting\'); setInterval(() => { console.log(\'[Long2] Working\'); }, 150);"',
      {}
    );

    const longProcess3Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Long3] Starting\'); setInterval(() => { console.log(\'[Long3] Processing\'); }, 200);"',
      {}
    );

    // Let them run for a bit
    await new Promise(resolve => setTimeout(resolve, 400));

    // Verify processes are active
    const statusBefore = logMonitor.getMonitoringStatus();
    expect(statusBefore.activeProcesses).toBe(3);
    expect(statusBefore.processes.length).toBe(3);

    // Stop all monitoring (should gracefully shutdown all ProcessManagers)
    await logMonitor.stopAllMonitoring();

    // Verify shutdown coordination
    const statusAfter = logMonitor.getMonitoringStatus();
    expect(statusAfter.activeProcesses).toBe(0);
    expect(statusAfter.processes.length).toBe(0);

    // Verify shutdown events
    const startedEvents = shutdownEvents.filter(e => e.type === 'started');
    const stoppedEvents = shutdownEvents.filter(e => e.type === 'stopped');

    expect(startedEvents.length).toBe(3);
    expect(stoppedEvents.length).toBe(3);

    // Verify all processes were stopped
    const stoppedProcessIds = stoppedEvents.map(e => e.processId);
    expect(stoppedProcessIds).toContain(longProcess1Id);
    expect(stoppedProcessIds).toContain(longProcess2Id);
    expect(stoppedProcessIds).toContain(longProcess3Id);

    // Verify logs were captured before shutdown
    expect(logEntries.length).toBeGreaterThanOrEqual(6); // At least 2 per process

    const long1Logs = logEntries.filter(log => log.message.includes('[Long1]'));
    const long2Logs = logEntries.filter(log => log.message.includes('[Long2]'));
    const long3Logs = logEntries.filter(log => log.message.includes('[Long3]'));

    expect(long1Logs.length).toBeGreaterThanOrEqual(2);
    expect(long2Logs.length).toBeGreaterThanOrEqual(2);
    expect(long3Logs.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle individual ProcessManager termination while others continue', async () => {
    const processEvents: any[] = [];
    const logEntries: any[] = [];

    logMonitor.on('monitoring-started', (event) => {
      processEvents.push({ type: 'started', ...event });
    });

    logMonitor.on('monitoring-stopped', (event) => {
      processEvents.push({ type: 'stopped', ...event });
    });

    logMonitor.on('log-entry', (entry) => {
      logEntries.push(entry);
    });

    // Start multiple processes
    const continuousProcess1Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Continuous1] Starting\'); setInterval(() => { console.log(\'[Continuous1] Running\'); }, 100);"',
      {}
    );

    const targetProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Target] Starting\'); setInterval(() => { console.log(\'[Target] Working\'); }, 100);"',
      {}
    );

    const continuousProcess2Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Continuous2] Starting\'); setInterval(() => { console.log(\'[Continuous2] Operating\'); }, 150);"',
      {}
    );

    // Let all processes run
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify all are active
    let status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(3);

    // Stop only the target process
    await logMonitor.stopMonitoring(targetProcessId);

    // Verify target is stopped but others continue
    status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(2);
    expect(status.processes.every(p => p.processId !== targetProcessId)).toBe(true);

    // Let others continue running
    await new Promise(resolve => setTimeout(resolve, 200));

    // Stop remaining processes
    await logMonitor.stopAllMonitoring();

    // Verify event coordination
    const startedEvents = processEvents.filter(e => e.type === 'started');
    const stoppedEvents = processEvents.filter(e => e.type === 'stopped');

    expect(startedEvents.length).toBe(3);
    expect(stoppedEvents.length).toBe(3);

    // Verify selective stopping
    const targetStoppedEvent = stoppedEvents.find(e => e.processId === targetProcessId);
    const otherStoppedEvents = stoppedEvents.filter(e => e.processId !== targetProcessId);

    expect(targetStoppedEvent).toBeDefined();
    expect(otherStoppedEvents.length).toBe(2);

    // Verify logs from all processes
    const continuous1Logs = logEntries.filter(log => log.message.includes('[Continuous1]'));
    const targetLogs = logEntries.filter(log => log.message.includes('[Target]'));
    const continuous2Logs = logEntries.filter(log => log.message.includes('[Continuous2]'));

    expect(continuous1Logs.length).toBeGreaterThanOrEqual(3);
    expect(targetLogs.length).toBeGreaterThanOrEqual(2);
    expect(continuous2Logs.length).toBeGreaterThanOrEqual(3);

    // Verify process isolation in logs
    expect(continuous1Logs.every(log => log.processId === continuousProcess1Id)).toBe(true);
    expect(targetLogs.every(log => log.processId === targetProcessId)).toBe(true);
    expect(continuous2Logs.every(log => log.processId === continuousProcess2Id)).toBe(true);
  });

  it('should coordinate resource management across multiple ProcessManagers', async () => {
    const resourceEvents: any[] = [];
    const logEntries: any[] = [];

    logMonitor.on('monitoring-started', (event) => {
      resourceEvents.push({ type: 'started', processId: event.processId, timestamp: event.startTime });
    });

    logMonitor.on('process-exited', (event) => {
      resourceEvents.push({ type: 'exited', processId: event.processId, timestamp: event.endTime });
    });

    logMonitor.on('log-entry', (entry) => {
      logEntries.push(entry);
    });

    // Start processes with different resource patterns
    const quickProcesses = [];
    for (let i = 0; i < 5; i++) {
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "console.log('[Quick${i}] Starting'); setTimeout(() => { console.log('[Quick${i}] In Progress'); process.exit(0); }, ${50 + i * 50});"`,
        {}
      );
      quickProcesses.push(processId);
    }

    // Start some medium-duration processes
    const mediumProcesses = [];
    for (let i = 0; i < 3; i++) {
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "console.log('[Medium${i}] Starting'); setTimeout(() => { console.log('[Medium${i}] Working'); setTimeout(() => { console.log('[Medium${i}] In Progress'); process.exit(0); }, 200); }, 100);"`,
        {}
      );
      mediumProcesses.push(processId);
    }

    // Wait for all to complete
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify resource coordination
    const allProcessIds = [...quickProcesses, ...mediumProcesses];
    expect(allProcessIds.length).toBe(8);

    // Verify all processes were tracked
    const startedEvents = resourceEvents.filter(e => e.type === 'started');
    const exitedEvents = resourceEvents.filter(e => e.type === 'exited');

    expect(startedEvents.length).toBe(8);
    expect(exitedEvents.length).toBe(8);

    // Verify all process IDs accounted for
    const startedProcessIds = startedEvents.map(e => e.processId);
    const exitedProcessIds = exitedEvents.map(e => e.processId);

    allProcessIds.forEach(processId => {
      expect(startedProcessIds).toContain(processId);
      expect(exitedProcessIds).toContain(processId);
    });

    // Verify logs from all processes
    expect(logEntries.length).toBeGreaterThanOrEqual(16); // At least 2 per process

    // Verify resource cleanup
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
    expect(finalStatus.processes.length).toBe(0);

    // Verify timing coordination (processes In Progress in reasonable order)
    const exitTimes = exitedEvents.map(e => e.timestamp.getTime()).sort();
    for (let i = 1; i < exitTimes.length; i++) {
      expect(exitTimes[i]).toBeGreaterThanOrEqual(exitTimes[i-1]);
    }

    // Verify no resource leaks by checking log count per process
    allProcessIds.forEach(processId => {
      const processLogs = logEntries.filter(log => log.processId === processId);
      expect(processLogs.length).toBeGreaterThanOrEqual(2);
    });
  });
});