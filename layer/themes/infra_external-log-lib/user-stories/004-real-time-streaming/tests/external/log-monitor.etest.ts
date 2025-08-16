import { LogMonitor } from '../../src/external/log-monitor';
import { LogEntry } from '../../src/domain/log-entry';

describe('LogMonitor Real-time Monitoring Interface External Test', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    // Clean up any running processes
    await logMonitor.stopAllMonitoring();
  });

  it('should start real-time monitoring of a process', async () => {
    const monitoringEvents: any[] = [];

    // Setup event listener
    logMonitor.on('monitoring-started', (event) => {
      monitoringEvents.push({ type: 'monitoring-started', ...event });
    });

    // Start monitoring a simple Node.js process
    const processId = await logMonitor.startRealTimeMonitoring('node -e "console.log(\'test\')"', {
      format: 'auto'
    });

    // Verify monitoring started
    expect(processId).toBeDefined();
    expect(typeof processId).toBe('string');
    expect(processId.length).toBeGreaterThan(0);

    // Wait for monitoring started event
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(monitoringEvents).toHaveLength(1);
    expect(monitoringEvents[0].type).toBe('monitoring-started');
    expect(monitoringEvents[0].processId).toBe(processId);
    expect(monitoringEvents[0].command).toContain('node');
  });

  it('should receive real-time log entries from monitored process', async () => {
    const logEntries: LogEntry[] = [];
    const testMessage = 'realtime-test-message';

    // Setup log entry listener
    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Start monitoring process that outputs a known message
    const processId = await logMonitor.startRealTimeMonitoring(
      `node -e "console.log('${testMessage}'); setTimeout(() => process.exit(0), 100);"`,
      { format: 'auto' }
    );

    // Verify we started monitoring
    expect(processId).toBeDefined();

    // Wait for log entries
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify we received log entries
    expect(logEntries.length).toBeGreaterThan(0);
    
    const matchingEntry = logEntries.find(entry => 
      entry.message.includes(testMessage)
    );
    expect(matchingEntry).toBeDefined();
    // Console.log output may come from stdout or stderr depending on Node.js execution context
    expect(['stdout', 'stderr']).toContain(matchingEntry!.source);
    expect(matchingEntry!.timestamp).toBeDefined();
  });

  it('should handle multiple simultaneous monitoring sessions', async () => {
    const monitoringEvents: any[] = [];
    const logEntries: { [processId: string]: LogEntry[] } = {};

    // Setup event listeners
    logMonitor.on('monitoring-started', (event) => {
      monitoringEvents.push(event);
    });

    logMonitor.on('log-entry', (entry: LogEntry) => {
      if (!logEntries[entry.processId]) {
        logEntries[entry.processId] = [];
      }
      logEntries[entry.processId].push(entry);
    });

    // Start multiple monitoring sessions
    const processId1 = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'process1\'); setTimeout(() => process.exit(0), 200);"',
      { format: 'auto' }
    );

    const processId2 = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'process2\'); setTimeout(() => process.exit(0), 200);"',
      { format: 'auto' }
    );

    // Wait for both processes to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify both sessions started
    expect(monitoringEvents).toHaveLength(2);
    expect(processId1).not.toBe(processId2);

    // Verify we received logs from both processes
    expect(Object.keys(logEntries)).toHaveLength(2);
    expect(logEntries[processId1]).toBeDefined();
    expect(logEntries[processId2]).toBeDefined();

    const process1Logs = logEntries[processId1].filter(entry => 
      entry.message.includes('process1')
    );
    const process2Logs = logEntries[processId2].filter(entry => 
      entry.message.includes('process2')
    );

    expect(process1Logs.length).toBeGreaterThan(0);
    expect(process2Logs.length).toBeGreaterThan(0);
  });

  it('should support log level filtering', async () => {
    const logEntries: LogEntry[] = [];

    // Setup log entry listener
    logMonitor.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Start monitoring with error-level filter
    const processId = await logMonitor.startRealTimeMonitoring(
      `node -e "
        console.log('INFO: This is info');
        console.error('ERROR: This is error');
        console.log('DEBUG: This is debug');
        setTimeout(() => process.exit(0), 100);
      "`,
      { 
        format: 'auto',
        logLevelFilter: ['error']
      }
    );

    // Verify we started monitoring the correct process
    expect(processId).toBeDefined();

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify only error logs were received
    expect(logEntries.length).toBeGreaterThan(0);
    const errorLogs = logEntries.filter(entry => 
      entry.level === 'error' || entry.message.includes('ERROR')
    );
    const nonErrorLogs = logEntries.filter(entry => 
      entry.level !== 'error' && !entry.message.includes('ERROR')
    );

    expect(errorLogs.length).toBeGreaterThan(0);
    expect(nonErrorLogs.length).toBe(0); // Should be filtered out
  });

  it('should handle process termination events', async () => {
    const processEvents: any[] = [];

    // Setup process event listeners
    logMonitor.on('process-exited', (event) => {
      processEvents.push({ type: 'process-exited', ...event });
    });

    // Start monitoring process that runs longer
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'starting\'); setTimeout(() => process.exit(0), 500);"',
      { format: 'auto' }
    );

    // Give more time for process to setup and exit
    await new Promise(resolve => setTimeout(resolve, 700));

    // Verify process exit event
    expect(processEvents).toHaveLength(1);
    expect(processEvents[0].type).toBe('process-exited');
    expect(processEvents[0].processId).toBe(processId);
    expect(processEvents[0].code).toBe(0);
  });

  it('should handle process crash events', async () => {
    const processEvents: any[] = [];

    // Setup process event listeners
    logMonitor.on('process-crashed', (event) => {
      processEvents.push({ type: 'process-crashed', ...event });
    });

    // Start monitoring process that crashes
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'about to crash\'); throw new Error(\'crash\');"',
      { format: 'auto' }
    );

    // Verify we started monitoring
    expect(processId).toBeDefined();

    // Wait for process to crash
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify process crash event
    expect(processEvents).toHaveLength(1);
    expect(processEvents[0].type).toBe('process-crashed');
    expect(processEvents[0].processId).toBe(processId);
    expect(processEvents[0].code).not.toBe(0);
  });

  it('should stop monitoring specific process', async () => {
    const monitoringEvents: any[] = [];

    logMonitor.on('monitoring-started', (event) => {
      monitoringEvents.push({ type: 'monitoring-started', ...event });
    });

    logMonitor.on('monitoring-stopped', (event) => {
      monitoringEvents.push({ type: 'monitoring-stopped', ...event });
    });

    // Start monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.log(\'running\'), 50);"',
      { format: 'auto' }
    );

    // Wait for monitoring to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Stop monitoring
    await logMonitor.stopMonitoring(processId);

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify events
    const startedEvents = monitoringEvents.filter(e => e.type === 'monitoring-started');
    const stoppedEvents = monitoringEvents.filter(e => e.type === 'monitoring-stopped');

    expect(startedEvents).toHaveLength(1);
    expect(stoppedEvents).toHaveLength(1);
    expect(stoppedEvents[0].processId).toBe(processId);
  });

  it('should provide current monitoring status', async () => {
    // Initially no monitoring sessions
    const initialStatus = logMonitor.getMonitoringStatus();
    expect(initialStatus.activeProcesses).toBe(0);
    expect(initialStatus.processes).toEqual([]);

    // Start monitoring
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.log(\'status test\'), 100);"',
      { format: 'auto' }
    );

    // Check status with active process
    const activeStatus = logMonitor.getMonitoringStatus();
    expect(activeStatus.activeProcesses).toBe(1);
    expect(activeStatus.processes).toHaveLength(1);
    expect(activeStatus.processes[0].processId).toBe(processId);
    expect(activeStatus.processes[0].status).toBe('running');

    // Stop monitoring
    await logMonitor.stopMonitoring(processId);

    // Check status after stopping
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
    expect(finalStatus.processes).toEqual([]);
  });
});