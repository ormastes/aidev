import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';

describe('Individual Process Log Query External Test', () => {
  let logMonitor: LogMonitor;
  let allCapturedLogs: any[];

  beforeEach(() => {
    logMonitor = new LogMonitor();
    allCapturedLogs = [];
    
    // Capture all logs
    logMonitor.on('log-entry', (entry: any) => {
      allCapturedLogs.push(entry);
    });
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should query individual process logs from aggregation', async () => {
    // Start multiple processes with distinct logs
    const webServerId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[WebServer] GET /api/users\'); console.log(\'[WebServer] POST /api/login\'); console.error(\'[WebServer] 404 Not Found\');"',
      {}
    );
    
    const workerId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Worker] Processing job 123\'); console.log(\'[Worker] Job In Progress\'); console.log(\'[Worker] Starting job 124\');"',
      {}
    );
    
    const schedulerId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Scheduler] Running daily backup\'); console.error(\'[Scheduler] Backup failed\'); console.log(\'[Scheduler] Retrying backup\');"',
      {}
    );

    // Wait for all logs
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Query logs for specific process (simulated)
    const webServerLogs = allCapturedLogs.filter(log => log.processId === webServerId);
    const workerLogs = allCapturedLogs.filter(log => log.processId === workerId);
    const schedulerLogs = allCapturedLogs.filter(log => log.processId === schedulerId);
    
    // Verify individual process queries
    expect(webServerLogs.length).toBe(3);
    expect(webServerLogs.every(log => log.message.includes('[WebServer]'))).toBe(true);
    expect(webServerLogs.some(log => log.message.includes('GET /api/users'))).toBe(true);
    expect(webServerLogs.some(log => log.message.includes('POST /api/login'))).toBe(true);
    expect(webServerLogs.some(log => log.message.includes('404 Not Found'))).toBe(true);
    
    expect(workerLogs.length).toBe(3);
    expect(workerLogs.every(log => log.message.includes('[Worker]'))).toBe(true);
    expect(workerLogs.some(log => log.message.includes('Processing job 123'))).toBe(true);
    expect(workerLogs.some(log => log.message.includes('Job In Progress'))).toBe(true);
    expect(workerLogs.some(log => log.message.includes('Starting job 124'))).toBe(true);
    
    expect(schedulerLogs.length).toBe(3);
    expect(schedulerLogs.every(log => log.message.includes('[Scheduler]'))).toBe(true);
    expect(schedulerLogs.some(log => log.message.includes('Running daily backup'))).toBe(true);
    expect(schedulerLogs.some(log => log.message.includes('Backup failed'))).toBe(true);
    expect(schedulerLogs.some(log => log.message.includes('Retrying backup'))).toBe(true);
  });

  it('should maintain log order within individual process queries', async () => {
    // Start process with sequential logs
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'console.log(\'Step 1: Initialize\'); ' +
      'console.log(\'Step 2: Connect to database\'); ' +
      'console.log(\'Step 3: Load configuration\'); ' +
      'console.log(\'Step 4: Start server\'); ' +
      'console.log(\'Step 5: Ready\'); ' +
      '"',
      {}
    );

    // Wait for logs
    await new Promise(resolve => setTimeout(resolve, 500));

    // Query process logs
    const processLogs = allCapturedLogs.filter(log => log.processId === processId);
    
    // Verify count and order
    expect(processLogs.length).toBe(5);
    
    // Verify sequential order
    processLogs.forEach((log, index) => {
      expect(log.message).toContain(`Step ${index + 1}:`);
    });
    
    // Verify timestamps are in ascending order
    for (let i = 1; i < processLogs.length; i++) {
      const prevTime = new Date(processLogs[i - 1].timestamp).getTime();
      const currTime = new Date(processLogs[i].timestamp).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
    }
  });

  it('should filter individual process logs by level', async () => {
    // Start process with mixed log levels
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'console.log(\'INFO: Application starting\'); ' +
      'console.error(\'ERROR: Database connection failed\'); ' +
      'console.log(\'DEBUG: Retry attempt 1\'); ' +
      'console.error(\'ERROR: Database still unavailable\'); ' +
      'console.log(\'INFO: Using cache mode\'); ' +
      'console.log(\'WARN: Running in degraded mode\'); ' +
      '"',
      {}
    );

    // Wait for logs
    await new Promise(resolve => setTimeout(resolve, 500));

    // Query and filter process logs
    const processLogs = allCapturedLogs.filter(log => log.processId === processId);
    
    // Filter by level
    const errorLogs = processLogs.filter(log => log.level === 'error');
    const infoLogs = processLogs.filter(log => log.level === 'info');
    const debugLogs = processLogs.filter(log => log.level === 'debug');
    const warnLogs = processLogs.filter(log => log.level === 'warn');
    
    // Verify filtering
    expect(errorLogs.length).toBe(2);
    expect(errorLogs.every(log => log.message.includes('ERROR:'))).toBe(true);
    
    expect(infoLogs.length).toBe(2);
    expect(infoLogs.every(log => log.message.includes('INFO:'))).toBe(true);
    
    expect(debugLogs.length).toBe(1);
    expect(debugLogs[0].message).toContain('DEBUG:');
    
    expect(warnLogs.length).toBe(1);
    expect(warnLogs[0].message).toContain('WARN:');
  });

  it('should handle queries for non-existent processes', async () => {
    // Start a real process
    const existingProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'Real process log\');"',
      {}
    );

    // Wait for logs
    await new Promise(resolve => setTimeout(resolve, 500));

    // Query for non-existent process
    const fakeProcessId = 'proc_fake_12345';
    const nonExistentLogs = allCapturedLogs.filter(log => log.processId === fakeProcessId);
    
    // Should return empty array
    expect(nonExistentLogs.length).toBe(0);
    
    // Verify real process logs exist
    const realLogs = allCapturedLogs.filter(log => log.processId === existingProcessId);
    expect(realLogs.length).toBe(1);
  });

  it('should query logs from In Progress processes', async () => {
    // Start processes that In Progress at different times
    const shortProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Short] Quick log\'); process.exit(0);"',
      {}
    );
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const longProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'console.log(\'[Long] Starting\'); ' +
      'setTimeout(() => { ' +
      '  console.log(\'[Long] Still running\'); ' +
      '  console.log(\'[Long] Finishing\'); ' +
      '  process.exit(0); ' +
      '}, 300); ' +
      '"',
      {}
    );

    // Wait for both to complete
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify both processes are no longer active
    const status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(0);
    
    // Query logs from In Progress processes
    const shortProcessLogs = allCapturedLogs.filter(log => log.processId === shortProcessId);
    const longProcessLogs = allCapturedLogs.filter(log => log.processId === longProcessId);
    
    // Verify logs are still available after process completion
    expect(shortProcessLogs.length).toBe(1);
    expect(shortProcessLogs[0].message).toContain('[Short] Quick log');
    
    expect(longProcessLogs.length).toBe(3);
    expect(longProcessLogs[0].message).toContain('[Long] Starting');
    expect(longProcessLogs[1].message).toContain('[Long] Still running');
    expect(longProcessLogs[2].message).toContain('[Long] Finishing');
  });

  it('should support time range queries for individual processes', async () => {
    const timestamps: { [key: string]: number } = {};
    
    // Start a process that logs over time
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'console.log(\'[T0] Initial log\'); ' +
      'setTimeout(() => console.log(\'[T1] After 200ms\'), 200); ' +
      'setTimeout(() => console.log(\'[T2] After 400ms\'), 400); ' +
      'setTimeout(() => console.log(\'[T3] After 600ms\'), 600); ' +
      'setTimeout(() => { console.log(\'[T4] Final log\'); process.exit(0); }, 800); ' +
      '"',
      {}
    );

    // Record time markers
    timestamps.start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 300));
    timestamps.mid1 = Date.now();
    await new Promise(resolve => setTimeout(resolve, 200));
    timestamps.mid2 = Date.now();
    await new Promise(resolve => setTimeout(resolve, 400));
    timestamps.end = Date.now();

    // Query process logs
    const processLogs = allCapturedLogs.filter(log => log.processId === processId);
    expect(processLogs.length).toBeGreaterThanOrEqual(4); // May miss some due to timing
    
    // Filter by time ranges
    const earlyLogs = processLogs.filter(log => 
      new Date(log.timestamp).getTime() < timestamps.mid1
    );
    
    const middleLogs = processLogs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= timestamps.mid1 && logTime < timestamps.mid2;
    });
    
    const lateLogs = processLogs.filter(log => 
      new Date(log.timestamp).getTime() >= timestamps.mid2
    );
    
    // Verify time-based filtering
    expect(earlyLogs.length).toBeGreaterThanOrEqual(1); // T0 and possibly T1
    expect(earlyLogs.some(log => log.message.includes('[T0]'))).toBe(true);
    
    expect(middleLogs.length).toBeGreaterThanOrEqual(1); // T1 or T2
    
    expect(lateLogs.length).toBeGreaterThanOrEqual(1); // At least T3 or T4
    // At least one of the late logs should be present
    expect(lateLogs.some(log => log.message.includes('[T3]') || log.message.includes('[T4]'))).toBe(true);
  });

  it('should handle concurrent queries for multiple processes', async () => {
    // Start multiple processes
    const processIds: string[] = [];
    
    for (let i = 1; i <= 5; i++) {
      const id = await logMonitor.startRealTimeMonitoring(
        `node -e "
          for (let j = 1; j <= 10; j++) {
            console.log('[P${i}] Log message ' + j);
          }
        "`,
        {}
      );
      processIds.push(id);
    }

    // Wait for all logs
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate concurrent queries
    const queryPromises = processIds.map(async (processId, index) => {
      const processLogs = allCapturedLogs.filter(log => log.processId === processId);
      
      // Verify each process has its logs
      expect(processLogs.length).toBe(10);
      expect(processLogs.every(log => log.message.includes(`[P${index + 1}]`))).toBe(true);
      
      // Verify logs are sequential
      processLogs.forEach((log, logIndex) => {
        expect(log.message).toContain(`Log message ${logIndex + 1}`);
      });
      
      return processLogs;
    });

    // Execute queries concurrently
    const results = await Promise.all(queryPromises);
    
    // Verify all queries succeeded
    expect(results.length).toBe(5);
    results.forEach(logs => {
      expect(logs.length).toBe(10);
    });
    
    // Verify no cross-contamination between queries
    for (let i = 0; i < results.length; i++) {
      for (let j = 0; j < results.length; j++) {
        if (i !== j) {
          const logsI = results[i];
          const logsJ = results[j];
          
          // Process IDs should be different
          expect(logsI[0].processId).not.toBe(logsJ[0].processId);
        }
      }
    }
  });
});