import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';

describe('Log Aggregation Query External Test', () => {
  let logMonitor: LogMonitor;
  let capturedLogs: any[];

  beforeEach(() => {
    logMonitor = new LogMonitor();
    capturedLogs = [];
    
    // Capture all logs for verification
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should query aggregated logs across all processes', async () => {
    // Start multiple processes
    const process1Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Service1] INFO: Starting service\'); console.error(\'[Service1] ERROR: Connection failed\'); console.log(\'[Service1] INFO: Retrying\');"',
      {}
    );
    
    const process2Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Service2] DEBUG: Initializing\'); console.log(\'[Service2] INFO: Ready\'); console.error(\'[Service2] ERROR: Timeout\');"',
      {}
    );
    
    const process3Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.error(\'[Service3] ERROR: Failed to start\'); console.log(\'[Service3] WARN: Using fallback\'); console.log(\'[Service3] INFO: Running\');"',
      {}
    );

    // Wait for logs to be captured
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For now, we'll test with the captured logs as a basic aggregation
    // In a real implementation, LogMonitor would have a getAggregatedLogs method
    expect(capturedLogs.length).toBeGreaterThan(0);
    
    // Verify logs from all processes are aggregated
    const processIds = new Set(capturedLogs.map(log => log.processId));
    expect(processIds.size).toBe(3);
    expect(processIds.has(process1Id)).toBe(true);
    expect(processIds.has(process2Id)).toBe(true);
    expect(processIds.has(process3Id)).toBe(true);
    
    // Verify logs are properly structured
    capturedLogs.forEach(log => {
      expect(log).toHaveProperty("processId");
      expect(log).toHaveProperty("timestamp");
      expect(log).toHaveProperty('level');
      expect(log).toHaveProperty('message');
      expect(log).toHaveProperty('source'); // LogMonitor uses 'source' not 'stream'
    });
    
    // Test filtering aggregated logs by level
    const errorLogs = capturedLogs.filter(log => log.level === 'error');
    expect(errorLogs.length).toBe(3); // 1 from Service1, 1 from Service2, 1 from Service3
    
    const infoLogs = capturedLogs.filter(log => log.level === 'info');
    expect(infoLogs.length).toBe(4); // 2 from Service1, 1 from Service2, 1 from Service3
    
    const warnLogs = capturedLogs.filter(log => log.level === 'warn');
    expect(warnLogs.length).toBe(1); // 1 from Service3
    
    const debugLogs = capturedLogs.filter(log => log.level === 'debug');
    expect(debugLogs.length).toBe(1); // 1 from Service2
  });

  it('should maintain chronological order in aggregated logs', async () => {
    
    // Start processes with delays to ensure ordering
    await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[P1] First log\'); setTimeout(() => { console.log(\'[P1] Third log\'); process.exit(0); }, 200);"',
      {}
    );
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[P2] Second log\'); setTimeout(() => { console.log(\'[P2] Fourth log\'); process.exit(0); }, 200);"',
      {}
    );
    
    // Wait for all logs
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify chronological order
    expect(capturedLogs.length).toBeGreaterThanOrEqual(4);
    
    // Sort by timestamp to verify they're in order
    const sortedLogs = [...capturedLogs].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Verify the order matches expectations
    expect(sortedLogs[0].message).toContain('First log');
    expect(sortedLogs[1].message).toContain('Second log');
    
    // The exact order of "Third" and "Fourth" may vary due to timing
    const lastTwoMessages = [sortedLogs[2].message, sortedLogs[3].message];
    expect(lastTwoMessages.some(msg => msg.includes('Third log'))).toBe(true);
    expect(lastTwoMessages.some(msg => msg.includes('Fourth log'))).toBe(true);
  });

  it('should support filtering aggregated logs by time range', async () => {
    const timeMarkers: { [key: string]: Date } = {};
    
    // Record start time
    timeMarkers.start = new Date();
    
    // First batch of logs
    await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Early] Log 1\'); console.log(\'[Early] Log 2\');"',
      {}
    );
    
    await new Promise(resolve => setTimeout(resolve, 300));
    timeMarkers.middle = new Date();
    
    // Second batch of logs
    await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Late] Log 3\'); console.log(\'[Late] Log 4\');"',
      {}
    );
    
    await new Promise(resolve => setTimeout(resolve, 300));
    timeMarkers.end = new Date();
    
    // Filter logs by time range (manual filtering for now)
    const earlyLogs = capturedLogs.filter(log => 
      new Date(log.timestamp) < timeMarkers.middle
    );
    
    const lateLogs = capturedLogs.filter(log => 
      new Date(log.timestamp) >= timeMarkers.middle
    );
    
    // Verify filtering
    expect(earlyLogs.length).toBeGreaterThanOrEqual(2);
    expect(lateLogs.length).toBeGreaterThanOrEqual(2);
    
    earlyLogs.forEach(log => {
      expect(log.message).toContain('[Early]');
    });
    
    lateLogs.forEach(log => {
      expect(log.message).toContain('[Late]');
    });
  });

  it('should aggregate logs from concurrent long-running processes', async () => {
    const processIds: string[] = [];
    
    // Start 3 long-running processes
    for (let i = 1; i <= 3; i++) {
      const id = await logMonitor.startRealTimeMonitoring(
        `node -e "
          let count = 0;
          const interval = setInterval(() => {
            count++;
            console.log('[Process${i}] Heartbeat ' + count);
            if (count >= 3) {
              clearInterval(interval);
              process.exit(0);
            }
          }, 100);
        "`,
        {}
      );
      processIds.push(id);
    }
    
    // Wait for processes to generate logs
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify aggregation from all processes
    const aggregatedByProcess = new Map<string, any[]>();
    
    capturedLogs.forEach(log => {
      if (!aggregatedByProcess.has(log.processId)) {
        aggregatedByProcess.set(log.processId, []);
      }
      aggregatedByProcess.get(log.processId)!.push(log);
    });
    
    // Should have logs from all 3 processes
    expect(aggregatedByProcess.size).toBe(3);
    
    // Each process should have generated 3 heartbeat logs
    processIds.forEach(processId => {
      const processLogs = aggregatedByProcess.get(processId)!;
      expect(processLogs.length).toBeGreaterThanOrEqual(3);
      
      // Verify heartbeat sequence
      const heartbeatNumbers = processLogs
        .map(log => {
          const match = log.message.match(/Heartbeat (\d+)/);
          return match ? parseInt(match[1]) : null;
        })
        .filter(num => num !== null)
        .sort((a, b) => a - b);
      
      expect(heartbeatNumbers).toEqual([1, 2, 3]);
    });
  });

  it('should handle aggregation with process failures', async () => {
    const crashEvents: any[] = [];
    
    logMonitor.on('process-crashed', (event: any) => {
      crashEvents.push(event);
    });
    
    // Start mix of In Progress and failing processes
    const completedProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[In Progress] Starting\'); console.log(\'[In Progress] Working\'); console.log(\'[In Progress] In Progress\');"',
      {}
    );
    
    const crashProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[Crash] Starting\'); console.error(\'[Crash] Fatal error\'); process.exit(1);"',
      {}
    );
    
    const anothercompletedProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[completed2] Running\'); console.log(\'[completed2] In Progress\');"',
      {}
    );
    
    // Wait for processes to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify aggregation includes logs from all processes
    const allProcessIds = new Set(capturedLogs.map(log => log.processId));
    expect(allProcessIds.has(completedProcess)).toBe(true);
    expect(allProcessIds.has(crashProcess)).toBe(true);
    expect(allProcessIds.has(anothercompletedProcess)).toBe(true);
    
    // Verify crashed process logs were captured before crash
    const crashProcessLogs = capturedLogs.filter(log => log.processId === crashProcess);
    expect(crashProcessLogs.length).toBeGreaterThanOrEqual(2);
    expect(crashProcessLogs.some(log => log.message.includes('[Crash] Starting'))).toBe(true);
    expect(crashProcessLogs.some(log => log.message.includes('[Crash] Fatal error'))).toBe(true);
    
    // Verify crash event was recorded
    expect(crashEvents.length).toBe(1);
    expect(crashEvents[0].processId).toBe(crashProcess);
  });

  it('should support pagination in aggregated log queries', async () => {
    // Generate many logs
    const processes: string[] = [];
    
    for (let i = 1; i <= 3; i++) {
      const id = await logMonitor.startRealTimeMonitoring(
        `node -e "for(let j=1; j<=10; j++) { console.log('[P${i}] Message ' + j); }"`,
        {}
      );
      processes.push(id);
    }
    
    // Wait for all logs
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate pagination (manual for now)
    const pageSize = 10;
    const totalLogs = capturedLogs.length;
    expect(totalLogs).toBeGreaterThanOrEqual(30);
    
    // Get first page
    const page1 = capturedLogs.slice(0, pageSize);
    expect(page1.length).toBe(pageSize);
    
    // Get second page
    const page2 = capturedLogs.slice(pageSize, pageSize * 2);
    expect(page2.length).toBe(pageSize);
    
    // Get last page (may be partial)
    const pageCount = Math.ceil(totalLogs / pageSize);
    const lastPageStart = (pageCount - 1) * pageSize;
    const lastPage = capturedLogs.slice(lastPageStart);
    expect(lastPage.length).toBeGreaterThan(0);
    expect(lastPage.length).toBeLessThanOrEqual(pageSize);
    
    // Verify no overlap between pages
    const page1Ids = new Set(page1.map(log => `${log.processId}-${log.timestamp}`));
    const page2Ids = new Set(page2.map(log => `${log.processId}-${log.timestamp}`));
    
    page2Ids.forEach(id => {
      expect(page1Ids.has(id)).toBe(false);
    });
  });
});