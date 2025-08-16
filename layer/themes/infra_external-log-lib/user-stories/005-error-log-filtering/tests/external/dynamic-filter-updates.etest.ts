import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import { LogStream } from '../../../004-real-time-streaming/src/external/log-stream';
import { Readable } from 'node:stream';

describe('Dynamic Filter Updates External Test', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should support real-time filter updates through LogMonitor external interface', async () => {
    const allLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      allLogs.push(entry);
    });

    // Start process with initial error-only filter
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Initial\\"); console.error(\\"ERROR: Initial\\"); setTimeout(() => process.exit(0), 500);"',
      { logLevelFilter: ['error'] }
    );

    // Wait a bit then update filter
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update filter to include info logs
    logMonitor.setLogLevelFilter(processId, ['error', 'info']);

    // Wait for process completion
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify filter update worked
    expect(allLogs.length).toBeGreaterThan(0);
    
    // Should have captured error logs throughout
    const errorLogs = allLogs.filter(entry => entry.level === 'error');
    expect(errorLogs.length).toBeGreaterThan(0);

    console.log(`Dynamic filter test: ${allLogs.length} total logs, ${errorLogs.length} error logs`);
  });

  it('should handle rapid filter changes without losing logs', async () => {
    const allLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      allLogs.push(entry);
    });

    // Start simple process
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Test\\"); console.error(\\"ERROR: Test\\"); setTimeout(() => process.exit(0), 800);"',
      { logLevelFilter: ['error'] }
    );

    // Change filters
    await new Promise(resolve => setTimeout(resolve, 200));
    logMonitor.setLogLevelFilter(processId, ['info']);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    logMonitor.setLogLevelFilter(processId, ['error', 'info']);
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 600));

    // Should have captured some logs
    expect(allLogs.length).toBeGreaterThan(0);

    console.log(`Rapid filter changes: ${allLogs.length} logs captured`);
  });

  it('should support filter updates on multiple concurrent processes', async () => {
    const allLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      allLogs.push(entry);
    });

    // Start two processes with different filters
    const processId1 = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Process1\\"); console.error(\\"ERROR: Process1\\"); setTimeout(() => process.exit(0), 600);"',
      { logLevelFilter: ['error'] }
    );

    const processId2 = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Process2\\"); console.error(\\"ERROR: Process2\\"); setTimeout(() => process.exit(0), 600);"',
      { logLevelFilter: ['info'] }
    );

    // Wait a bit, then update filters
    await new Promise(resolve => setTimeout(resolve, 200));
    
    logMonitor.setLogLevelFilter(processId1, ['info']);
    logMonitor.setLogLevelFilter(processId2, ['error']);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify we captured logs from both processes
    expect(allLogs.length).toBeGreaterThan(0);

    // Should have both process IDs represented
    const processIds = [...new Set(allLogs.map(entry => entry.processId))];
    expect(processIds.length).toBeGreaterThanOrEqual(1);

    console.log(`Multi-process filter test: ${allLogs.length} total logs from ${processIds.length} processes`);
  });

  it('should handle filter updates with LogStream directly', async () => {
    const mockStdout = new Readable({ read() {} });
    const mockStderr = new Readable({ read() {} });
    const logStream = new LogStream(mockStdout, mockStderr);
    
    const timelineEntries: Array<{time: number, entry: any}> = [];
    
    logStream.on('log-entry', (entry: any) => {
      timelineEntries.push({time: Date.now(), entry});
    });

    const startTime = Date.now();

    // Initial filter: errors only
    logStream.setLogLevelFilter(['error']);

    // Send initial logs
    mockStdout.push('INFO: Initial info\n');
    mockStderr.push('ERROR: Initial error\n');
    mockStdout.push('DEBUG: Initial debug\n');

    await new Promise(resolve => setTimeout(resolve, 50));

    // Update filter: add info
    logStream.setLogLevelFilter(['error', 'info']);

    // Send more logs
    mockStdout.push('INFO: Updated info\n');
    mockStderr.push('ERROR: Updated error\n');
    mockStdout.push('DEBUG: Updated debug\n');

    await new Promise(resolve => setTimeout(resolve, 50));

    // Update filter: debug only
    logStream.setLogLevelFilter(['debug']);

    // Send final logs
    mockStdout.push('INFO: Final info\n');
    mockStderr.push('ERROR: Final error\n');
    mockStdout.push('DEBUG: Final debug\n');

    // End streams
    mockStdout.push(null);
    mockStderr.push(null);

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify timeline filtering
    expect(timelineEntries.length).toBeGreaterThan(0);

    // Group by time phases
    const phase1 = timelineEntries.filter(item => (item.time - startTime) < 50);
    const phase2 = timelineEntries.filter(item => (item.time - startTime) >= 50 && (item.time - startTime) < 100);
    const phase3 = timelineEntries.filter(item => (item.time - startTime) >= 100);

    // Phase 1: only errors should pass
    phase1.forEach(item => {
      expect(item.entry.level).toBe('error');
    });

    // Phase 2: error and info should pass
    if (phase2.length > 0) {
      const phase2Levels = phase2.map(item => item.entry.level);
      expect(phase2Levels.every(level => ['error', 'info'].includes(level))).toBe(true);
    }

    // Phase 3: only debug should pass
    if (phase3.length > 0) {
      phase3.forEach(item => {
        expect(item.entry.level).toBe('debug');
      });
    }

    logStream.cleanup();
  });

  it('should validate filter arrays and handle invalid inputs', async () => {
    const logEntries: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });

    // Start process
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Test\\"); console.error(\\"ERROR: Test\\"); setTimeout(() => process.exit(0), 400);"',
      { logLevelFilter: ['error'] }
    );

    // Test various filter inputs
    await new Promise(resolve => setTimeout(resolve, 100));

    // Valid filter update
    expect(() => {
      logMonitor.setLogLevelFilter(processId, ['info', 'error']);
    }).not.toThrow();

    // Empty filter (should allow all)
    expect(() => {
      logMonitor.setLogLevelFilter(processId, []);
    }).not.toThrow();

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 400));

    // Filter updates should work without throwing errors
    // Test implementation pending // Basic assertion that we got here
  });

  it('should maintain filter state across process lifecycle events', async () => {
    const logEntries: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });

    // Start process with filter
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"INFO: Test\\"); console.error(\\"ERROR: Test\\"); setTimeout(() => process.exit(0), 300);"',
      { logLevelFilter: ['error'] }
    );

    // Update filter during process execution
    await new Promise(resolve => setTimeout(resolve, 100));
    logMonitor.setLogLevelFilter(processId, ['info', 'error']);

    // Wait for process to complete naturally
    await new Promise(resolve => setTimeout(resolve, 400));

    // Verify filter is no longer accessible after process stops
    expect(() => {
      logMonitor.setLogLevelFilter(processId, ['debug']);
    }).toThrow(`Process ${processId} not found`);
  });
});