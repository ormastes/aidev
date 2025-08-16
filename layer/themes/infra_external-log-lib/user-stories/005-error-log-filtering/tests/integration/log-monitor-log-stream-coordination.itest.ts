import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import { LogStream } from '../../../004-real-time-streaming/src/external/log-stream';
import { ProcessManager } from '../../../004-real-time-streaming/src/external/process-manager';

describe('LogMonitor and LogStream Coordination Integration Test', () => {
  it('should coordinate filtering between LogMonitor and LogStream', async () => {
    const logMonitor = new LogMonitor();
    const capturedLogs: any[] = [];
    const streamEvents: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });

    // Start monitoring with filter
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Test info\\"); console.error(\\"ERROR: Test error\\"); console.log(\\"DEBUG: Test debug\\");"',
      { logLevelFilter: ['error'] }
    );

    // Get internal process data to verify coordination
    const processes = (logMonitor as any).processes;
    const processData = processes.get(processId);
    
    expect(processData).toBeDefined();
    expect(processData.logStream).toBeDefined();
    
    // Verify LogStream has the filter applied
    const logStream: LogStream = processData.logStream;
    
    // Listen to LogStream events directly
    logStream.on('log-entry', (entry: any) => {
      streamEvents.push(entry);
    });

    // Wait for process completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify coordination
    expect(capturedLogs.length).toBeGreaterThan(0);
    expect(streamEvents.length).toBeGreaterThan(0);
    
    // Both should have filtered to only errors
    capturedLogs.forEach(log => {
      expect(log.level).toBe('error');
    });
    
    streamEvents.forEach(event => {
      expect(event.level).toBe('error');
    });

    // Verify processId is added by LogMonitor
    capturedLogs.forEach(log => {
      expect(log.processId).toBe(processId);
    });

    await logMonitor.stopAllMonitoring();
  });

  it('should propagate filter updates from LogMonitor to LogStream', async () => {
    const logMonitor = new LogMonitor();
    const capturedLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });

    // Simple process
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Initial\\"); console.error(\\"ERROR: Initial\\"); setTimeout(() => process.exit(0), 500);"',
      { logLevelFilter: ['error'] }
    );

    // Get LogStream reference to verify it exists
    const processData = (logMonitor as any).processes.get(processId);
    expect(processData.logStream).toBeDefined();
    
    // Wait for initial logs
    await new Promise(resolve => setTimeout(resolve, 200));
    const beforeUpdateCount = capturedLogs.length;

    // Update filter through LogMonitor
    logMonitor.setLogLevelFilter(processId, ['error', 'info']);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 400));

    // Verify we got some logs
    expect(capturedLogs.length).toBeGreaterThan(0);

    // Initial logs should only be errors
    if (beforeUpdateCount > 0) {
      const beforeLogs = capturedLogs.slice(0, beforeUpdateCount);
      beforeLogs.forEach(log => {
        expect(log.level).toBe('error');
      });
    }

    await logMonitor.stopAllMonitoring();
  });

  it('should maintain independent filters for multiple processes', async () => {
    const logMonitor = new LogMonitor();
    const process1Logs: any[] = [];
    const process2Logs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      if (entry.message.includes('Process1')) {
        process1Logs.push(entry);
      } else if (entry.message.includes('Process2')) {
        process2Logs.push(entry);
      }
    });

    // Start two processes with different filters
    const processId1 = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Process1 info\\"); console.error(\\"ERROR: Process1 error\\"); console.log(\\"DEBUG: Process1 debug\\");"',
      { logLevelFilter: ['error'] }
    );

    const processId2 = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Process2 info\\"); console.error(\\"ERROR: Process2 error\\"); console.log(\\"DEBUG: Process2 debug\\");"',
      { logLevelFilter: ['info', 'debug'] }
    );

    // Get both LogStreams
    const processes = (logMonitor as any).processes;
    const process1Data = processes.get(processId1);
    const process2Data = processes.get(processId2);
    
    expect(process1Data).toBeDefined();
    expect(process2Data).toBeDefined();

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify independent filtering
    expect(process1Logs.length).toBeGreaterThan(0);
    expect(process2Logs.length).toBeGreaterThan(0);

    // Process 1 should only have errors
    process1Logs.forEach(log => {
      expect(log.level).toBe('error');
      expect(log.processId).toBe(processId1);
    });

    // Process 2 should have info and debug (not error)
    const process2Levels = [...new Set(process2Logs.map(log => log.level))];
    expect(process2Levels).toContain('info');
    expect(process2Levels).toContain('debug');
    expect(process2Levels).not.toContain('error');

    await logMonitor.stopAllMonitoring();
  });

  it('should coordinate cleanup between LogMonitor and LogStream', async () => {
    const logMonitor = new LogMonitor();
    const cleanupEvents: string[] = [];
    
    // Start process
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.log(\\"INFO: Running\\"), 100);"',
      { logLevelFilter: ['info'] }
    );

    // Get references
    const processes = (logMonitor as any).processes;
    const processData = processes.get(processId);
    const logStream: LogStream = processData.logStream;
    const processManager: ProcessManager = processData.processManager;

    // Monitor cleanup
    const originalCleanup = logStream.cleanup.bind(logStream);
    logStream.cleanup = jest.fn(() => {
      cleanupEvents.push('logStream.cleanup');
      originalCleanup();
    });

    // Stop monitoring
    await logMonitor.stopMonitoring(processId);

    // Verify coordination
    expect(cleanupEvents).toContain('logStream.cleanup');
    expect(processManager.isRunning()).toBe(false);
    expect(processes.has(processId)).toBe(false);

    await logMonitor.stopAllMonitoring();
  });

  it('should handle filter edge cases in coordination', async () => {
    const logMonitor = new LogMonitor();
    const capturedLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });

    // Test empty filter (allow all)
    const processId1 = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Test\\"); console.error(\\"ERROR: Test\\");"',
      { logLevelFilter: [] }
    );

    // Test undefined filter (should default to allow all)
    const processId2 = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Test2\\"); console.error(\\"ERROR: Test2\\");"',
      {}
    );

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Both processes should capture all logs
    const process1Logs = capturedLogs.filter(log => log.processId === processId1);
    const process2Logs = capturedLogs.filter(log => log.processId === processId2);

    expect(process1Logs.length).toBeGreaterThanOrEqual(2);
    expect(process2Logs.length).toBeGreaterThanOrEqual(2);

    // Should have multiple log levels
    const levels1 = [...new Set(process1Logs.map(log => log.level))];
    const levels2 = [...new Set(process2Logs.map(log => log.level))];

    expect(levels1.length).toBeGreaterThan(1);
    expect(levels2.length).toBeGreaterThan(1);

    await logMonitor.stopAllMonitoring();
  });

  it('should coordinate error handling between components', async () => {
    const logMonitor = new LogMonitor();
    const crashEvents: any[] = [];
    
    logMonitor.on('process-crashed', (event: any) => {
      crashEvents.push(event);
    });

    // Start process that will crash
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Starting\\"); process.exit(1);"',
      { logLevelFilter: ['error'] }
    );

    // Wait for crash
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify crash coordination
    expect(crashEvents.length).toBeGreaterThan(0);
    
    // Process should be cleaned up after crash
    const processes = (logMonitor as any).processes;
    expect(processes.has(processId)).toBe(false);

    await logMonitor.stopAllMonitoring();
  });
});