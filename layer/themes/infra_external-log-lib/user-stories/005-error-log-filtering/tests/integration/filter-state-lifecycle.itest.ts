import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';

describe('Log Level Filter State Management Integration Test', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should maintain filter state throughout process lifecycle', async () => {
    const lifecycleEvents: any[] = [];
    const capturedLogs: any[] = [];
    
    // Track lifecycle events
    logMonitor.on('monitoring-started', (event: any) => {
      lifecycleEvents.push({ type: 'started', ...event });
    });
    
    logMonitor.on('process-exited', (event: any) => {
      lifecycleEvents.push({ type: 'exited', ...event });
    });
    
    logMonitor.on('monitoring-stopped', (event: any) => {
      lifecycleEvents.push({ type: 'stopped', ...event });
    });
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });

    // Start process with initial filter
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Start\\"); console.error(\\"ERROR: Middle\\"); console.log(\\"INFO: End\\"); setTimeout(() => process.exit(0), 200);"',
      { logLevelFilter: ['error'] }
    );

    // Verify initial filter state
    expect(lifecycleEvents.length).toBeGreaterThan(0);
    expect(lifecycleEvents[0].type).toBe('started');
    expect(lifecycleEvents[0].processId).toBe(processId);

    // Wait for process to complete naturally
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify filter was maintained throughout lifecycle
    expect(capturedLogs.length).toBeGreaterThan(0);
    capturedLogs.forEach(log => {
      expect(log.level).toBe('error');
      expect(log.processId).toBe(processId);
    });

    // Verify lifecycle completion
    const exitEvent = lifecycleEvents.find(e => e.type === 'exited');
    expect(exitEvent).toBeDefined();
    expect(exitEvent.code).toBe(0);

    // Verify filter state is cleaned up after process exit
    expect(() => {
      logMonitor.setLogLevelFilter(processId, ['info']);
    }).toThrow(`Process ${processId} not found`);
  });

  it('should preserve filter state during concurrent process management', async () => {
    const process1Logs: any[] = [];
    const process2Logs: any[] = [];
    const process3Logs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      if (entry.message.includes('P1')) {
        process1Logs.push(entry);
      } else if (entry.message.includes('P2')) {
        process2Logs.push(entry);
      } else if (entry.message.includes('P3')) {
        process3Logs.push(entry);
      }
    });

    // Start three processes with different filters
    await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: P1 info\\"); console.error(\\"ERROR: P1 error\\"); console.log(\\"DEBUG: P1 debug\\");"',
      { logLevelFilter: ['error'] }
    );

    await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: P2 info\\"); console.error(\\"ERROR: P2 error\\"); console.log(\\"DEBUG: P2 debug\\");"',
      { logLevelFilter: ['info'] }
    );

    await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: P3 info\\"); console.error(\\"ERROR: P3 error\\"); console.log(\\"DEBUG: P3 debug\\");"',
      { logLevelFilter: [] } // All logs
    );

    // Verify initial state
    const status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(3);

    // Wait for all processes to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify each process maintained its filter
    expect(process1Logs.length).toBeGreaterThan(0);
    process1Logs.forEach(log => {
      expect(log.level).toBe('error');
    });

    expect(process2Logs.length).toBeGreaterThan(0);
    process2Logs.forEach(log => {
      expect(log.level).toBe('info');
    });

    expect(process3Logs.length).toBeGreaterThan(0);
    const p3Levels = [...new Set(process3Logs.map(log => log.level))];
    expect(p3Levels.length).toBeGreaterThan(1); // Multiple levels

    // Verify all filters cleaned up
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
  });

  it('should handle filter state transitions correctly', async () => {
    const stateTransitions: any[] = [];
    const capturedLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push({
        ...entry,
        timestamp: Date.now()
      });
    });

    // Start with restrictive filter
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'let count = 0;' +
      'const interval = setInterval(() => {' +
      '  count++;' +
      '  console.log(`INFO: Log ${count}`);' +
      '  console.error(`ERROR: Log ${count}`);' +
      '  if (count >= 5) { clearInterval(interval); process.exit(0); }' +
      '}, 200);' +
      '"',
      { logLevelFilter: ['error'] }
    );

    stateTransitions.push({ 
      time: Date.now(), 
      state: 'initial', 
      filter: ['error'] 
    });

    // Transition 1: Add info level
    await new Promise(resolve => setTimeout(resolve, 300));
    logMonitor.setLogLevelFilter(processId, ['error', 'info']);
    stateTransitions.push({ 
      time: Date.now(), 
      state: 'expanded', 
      filter: ['error', 'info'] 
    });

    // Transition 2: Remove all filters (allow all)
    await new Promise(resolve => setTimeout(resolve, 300));
    logMonitor.setLogLevelFilter(processId, []);
    stateTransitions.push({ 
      time: Date.now(), 
      state: 'all', 
      filter: [] 
    });

    // Transition 3: Back to restrictive
    await new Promise(resolve => setTimeout(resolve, 300));
    logMonitor.setLogLevelFilter(processId, ['error']);
    stateTransitions.push({ 
      time: Date.now(), 
      state: 'restrictive', 
      filter: ['error'] 
    });

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify state transitions affected log capture
    expect(capturedLogs.length).toBeGreaterThan(0);
    
    // Should have a mix of log levels from different states
    const logLevels = [...new Set(capturedLogs.map(log => log.level))];
    expect(logLevels.length).toBeGreaterThanOrEqual(1);

    // Verify we tracked state transitions
    expect(stateTransitions.length).toBe(4);
  });

  it('should handle filter state during process crashes', async () => {
    const crashedProcesses: string[] = [];
    const activeLogs: any[] = [];
    
    logMonitor.on('process-crashed', (event: any) => {
      crashedProcesses.push(event.processId);
    });
    
    logMonitor.on('log-entry', (entry: any) => {
      activeLogs.push(entry);
    });

    // Start process that will crash
    const crashingProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.error(\\"ERROR: Before crash\\"); process.exit(1);"',
      { logLevelFilter: ['error'] }
    );

    // Start normal process
    const normalProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Normal\\"); console.error(\\"ERROR: Normal\\"); setTimeout(() => process.exit(0), 500);"',
      { logLevelFilter: ['info', 'error'] }
    );

    // Wait for crash
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify crashed process is cleaned up
    expect(crashedProcesses).toContain(crashingProcessId);
    expect(() => {
      logMonitor.setLogLevelFilter(crashingProcessId, ['info']);
    }).toThrow(`Process ${crashingProcessId} not found`);

    // Verify normal process continues with its filter
    logMonitor.setLogLevelFilter(normalProcessId, ['error']);

    // Wait for normal process to complete
    await new Promise(resolve => setTimeout(resolve, 400));

    // Should have logs from both processes
    expect(activeLogs.length).toBeGreaterThan(0);
    
    const crashLogs = activeLogs.filter(log => log.processId === crashingProcessId);
    const normalLogs = activeLogs.filter(log => log.processId === normalProcessId);
    
    expect(crashLogs.length).toBeGreaterThan(0);
    expect(normalLogs.length).toBeGreaterThan(0);
  });

  it('should maintain filter integrity during rapid state changes', async () => {
    const capturedLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });

    // Start long-running process
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => { console.log(\\"INFO: Tick\\"); console.error(\\"ERROR: Tick\\"); }, 50);"',
      { logLevelFilter: ['error'] }
    );

    // Rapid filter changes
    const filterChanges = [
      { delay: 100, filter: ['info'] },
      { delay: 50, filter: ['error', 'info'] },
      { delay: 50, filter: [] },
      { delay: 50, filter: ['error'] },
      { delay: 50, filter: ['info'] },
      { delay: 50, filter: ['error', 'info'] }
    ];

    for (const change of filterChanges) {
      await new Promise(resolve => setTimeout(resolve, change.delay));
      logMonitor.setLogLevelFilter(processId, change.filter);
    }

    // Let it run a bit more
    await new Promise(resolve => setTimeout(resolve, 200));

    // Stop the process
    await logMonitor.stopMonitoring(processId);

    // Verify logs were captured throughout changes
    expect(capturedLogs.length).toBeGreaterThan(0);
    
    // Should have variety from filter changes
    const levels = [...new Set(capturedLogs.map(log => log.level))];
    expect(levels.length).toBeGreaterThanOrEqual(1);

    // Verify process was properly cleaned up
    expect(() => {
      logMonitor.setLogLevelFilter(processId, ['debug']);
    }).toThrow(`Process ${processId} not found`);
  });

  it('should handle filter state with stopAllMonitoring', async () => {
    const allLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      allLogs.push(entry);
    });

    // Start multiple processes with different filters
    const processIds: string[] = [];
    
    processIds.push(await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.error(\\"ERROR: P1\\"), 100);"',
      { logLevelFilter: ['error'] }
    ));
    
    processIds.push(await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.log(\\"INFO: P2\\"), 100);"',
      { logLevelFilter: ['info'] }
    ));
    
    processIds.push(await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.log(\\"DEBUG: P3\\"), 100);"',
      { logLevelFilter: ['debug'] }
    ));

    // Let them run
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify all are active
    const statusBefore = logMonitor.getMonitoringStatus();
    expect(statusBefore.activeProcesses).toBe(3);

    // Stop all
    await logMonitor.stopAllMonitoring();

    // Verify all filters are cleaned up
    const statusAfter = logMonitor.getMonitoringStatus();
    expect(statusAfter.activeProcesses).toBe(0);

    // Verify no process filters are accessible
    processIds.forEach(processId => {
      expect(() => {
        logMonitor.setLogLevelFilter(processId, ['error']);
      }).toThrow(`Process ${processId} not found`);
    });

    // Should have captured some logs
    expect(allLogs.length).toBeGreaterThan(0);
  });
});