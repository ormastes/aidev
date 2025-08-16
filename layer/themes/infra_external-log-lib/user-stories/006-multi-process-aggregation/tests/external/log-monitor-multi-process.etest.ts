import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';

describe('LogMonitor Multi-Process Management External Test', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should manage multiple concurrent processes through external interface', async () => {
    const processIds: string[] = [];
    const capturedLogs: Map<string, any[]> = new Map();
    
    // Set up log capture
    logMonitor.on('log-entry', (entry: any) => {
      if (!capturedLogs.has(entry.processId)) {
        capturedLogs.set(entry.processId, []);
      }
      capturedLogs.get(entry.processId)!.push(entry);
    });

    // Start multiple processes concurrently
    const process1Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'[P1] Starting\'); console.log(\'[P1] Working\'); console.log(\'[P1] In Progress\');"',
      {}
    );
    processIds.push(process1Id);

    const process2Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.error(\'[P2] Error 1\'); console.log(\'[P2] Info\'); console.error(\'[P2] Error 2\');"',
      {}
    );
    processIds.push(process2Id);

    const process3Id = await logMonitor.startRealTimeMonitoring(
      'node -e "for(let i=1; i<=3; i++) { console.log(\'[P3] Message \' + i); }"',
      {}
    );
    processIds.push(process3Id);

    // Verify all processes are being monitored
    const status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(3);
    expect(status.processes.length).toBe(3);

    // Wait for processes to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify logs were captured from all processes
    expect(capturedLogs.size).toBe(3);
    expect(capturedLogs.has(process1Id)).toBe(true);
    expect(capturedLogs.has(process2Id)).toBe(true);
    expect(capturedLogs.has(process3Id)).toBe(true);

    // Verify each process has its logs
    const p1Logs = capturedLogs.get(process1Id)!;
    expect(p1Logs.length).toBe(3);
    expect(p1Logs.every(log => log.message.includes('[P1]'))).toBe(true);

    const p2Logs = capturedLogs.get(process2Id)!;
    expect(p2Logs.length).toBe(3);
    expect(p2Logs.every(log => log.message.includes('[P2]'))).toBe(true);

    const p3Logs = capturedLogs.get(process3Id)!;
    expect(p3Logs.length).toBe(3);
    expect(p3Logs.every(log => log.message.includes('[P3]'))).toBe(true);

    // Verify final status
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
    
    // Verify total logs captured
    const totalLogs = Array.from(capturedLogs.values()).reduce((sum, logs) => sum + logs.length, 0);
    expect(totalLogs).toBe(9);
  });

  it('should handle concurrent process lifecycle events', async () => {
    const lifecycleEvents: Array<{type: string, processId: string, timestamp: number}> = [];
    const startTime = Date.now();
    
    // Track lifecycle events
    logMonitor.on('monitoring-started', (event: any) => {
      lifecycleEvents.push({
        type: 'started',
        processId: event.processId,
        timestamp: Date.now() - startTime
      });
    });
    
    logMonitor.on('process-exited', (event: any) => {
      lifecycleEvents.push({
        type: 'exited',
        processId: event.processId,
        timestamp: Date.now() - startTime
      });
    });
    
    logMonitor.on('monitoring-stopped', (event: any) => {
      lifecycleEvents.push({
        type: 'stopped',
        processId: event.processId,
        timestamp: Date.now() - startTime
      });
    });

    // Start processes with different durations
    const shortProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'Short process\'); process.exit(0);"',
      {}
    );
    
    const mediumProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "setTimeout(() => { console.log(\'Medium process\'); process.exit(0); }, 200);"',
      {}
    );
    
    const longProcessId = await logMonitor.startRealTimeMonitoring(
      'node -e "setTimeout(() => { console.log(\'Long process\'); process.exit(0); }, 400);"',
      {}
    );

    // Wait for all to complete
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify all processes went through In Progress lifecycle
    const startEvents = lifecycleEvents.filter(e => e.type === 'started');
    const exitEvents = lifecycleEvents.filter(e => e.type === 'exited');
    
    expect(startEvents.length).toBe(3);
    expect(exitEvents.length).toBe(3);
    
    // Verify each process has its events
    const processIds = [shortProcessId, mediumProcessId, longProcessId];
    processIds.forEach(processId => {
      const processEvents = lifecycleEvents.filter(e => e.processId === processId);
      expect(processEvents.some(e => e.type === 'started')).toBe(true);
      expect(processEvents.some(e => e.type === 'exited')).toBe(true);
    });
  });

  it('should support querying status of individual processes', async () => {
    const processes: Array<{id: string, name: string}> = [];
    
    // Start multiple processes
    processes.push({
      id: await logMonitor.startRealTimeMonitoring(
        'node -e "setInterval(() => console.log(\'P1 tick\'), 100);"',
        {}
      ),
      name: 'continuous-1'
    });
    
    processes.push({
      id: await logMonitor.startRealTimeMonitoring(
        'node -e "setInterval(() => console.log(\'P2 tick\'), 100);"',
        {}
      ),
      name: 'continuous-2'
    });
    
    processes.push({
      id: await logMonitor.startRealTimeMonitoring(
        'node -e "console.log(\'P3 quick\'); process.exit(0);"',
        {}
      ),
      name: 'quick-exit'
    });

    // Let processes run
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check individual process status
    const activeProcesses = (logMonitor as any).processes;
    
    // Continuous processes should still be active
    expect(activeProcesses.has(processes[0].id)).toBe(true);
    expect(activeProcesses.has(processes[1].id)).toBe(true);
    
    // Quick process should have exited
    expect(activeProcesses.has(processes[2].id)).toBe(false);

    // Stop specific process
    await logMonitor.stopMonitoring(processes[0].id);
    
    // Verify it was stopped
    expect(activeProcesses.has(processes[0].id)).toBe(false);
    expect(activeProcesses.has(processes[1].id)).toBe(true);
    
    // Clean up
    await logMonitor.stopAllMonitoring();
  });

  it('should handle concurrent start and stop operations', async () => {
    const operations: Promise<any>[] = [];
    const processIds: string[] = [];
    
    // Start 5 processes concurrently
    for (let i = 1; i <= 5; i++) {
      operations.push(
        logMonitor.startRealTimeMonitoring(
          `node -e "setInterval(() => console.log('[P${i}] Running'), 100);"`,
          {}
        ).then(id => {
          processIds.push(id);
          return id;
        })
      );
    }
    
    // Wait for all to start
    await Promise.all(operations);
    
    expect(processIds.length).toBe(5);
    expect(logMonitor.getMonitoringStatus().activeProcesses).toBe(5);
    
    // Stop some processes concurrently
    const stopOperations: Promise<void>[] = [];
    stopOperations.push(logMonitor.stopMonitoring(processIds[0]));
    stopOperations.push(logMonitor.stopMonitoring(processIds[2]));
    stopOperations.push(logMonitor.stopMonitoring(processIds[4]));
    
    await Promise.all(stopOperations);
    
    // Verify correct processes were stopped
    expect(logMonitor.getMonitoringStatus().activeProcesses).toBe(2);
    
    const activeProcesses = (logMonitor as any).processes;
    expect(activeProcesses.has(processIds[0])).toBe(false);
    expect(activeProcesses.has(processIds[1])).toBe(true);
    expect(activeProcesses.has(processIds[2])).toBe(false);
    expect(activeProcesses.has(processIds[3])).toBe(true);
    expect(activeProcesses.has(processIds[4])).toBe(false);
  });

  it('should maintain isolation between process logs', async () => {
    const processLogs: Map<string, string[]> = new Map();
    
    logMonitor.on('log-entry', (entry: any) => {
      if (!processLogs.has(entry.processId)) {
        processLogs.set(entry.processId, []);
      }
      processLogs.get(entry.processId)!.push(entry.message);
    });
    
    // Start processes that generate unique logs
    const processIds = await Promise.all([
      logMonitor.startRealTimeMonitoring(
        'node -e "for(let i=1; i<=5; i++) console.log(\'A\' + i);"',
        {}
      ),
      logMonitor.startRealTimeMonitoring(
        'node -e "for(let i=1; i<=5; i++) console.log(\'B\' + i);"',
        {}
      ),
      logMonitor.startRealTimeMonitoring(
        'node -e "for(let i=1; i<=5; i++) console.log(\'C\' + i);"',
        {}
      )
    ]);
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify isolation
    expect(processLogs.size).toBe(3);
    
    processIds.forEach((processId, index) => {
      const logs = processLogs.get(processId)!;
      expect(logs).toHaveLength(5);
      
      const prefix = String.fromCharCode(65 + index); // 'A', 'B', 'C'
      logs.forEach((log, i) => {
        expect(log).toBe(`${prefix}${i + 1}`);
      });
    });
  });

  it('should handle process crashes in multi-process scenario', async () => {
    const crashedProcesses: string[] = [];
    const activeLogs: Map<string, number> = new Map();
    
    logMonitor.on('process-crashed', (event: any) => {
      crashedProcesses.push(event.processId);
    });
    
    logMonitor.on('log-entry', (entry: any) => {
      const count = activeLogs.get(entry.processId) || 0;
      activeLogs.set(entry.processId, count + 1);
    });
    
    // Start mix of normal and crashing processes
    const normalProcess1 = await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.log(\'Normal 1\'), 100);"',
      {}
    );
    
    const crashingProcess = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'About to crash\'); process.exit(1);"',
      {}
    );
    
    const normalProcess2 = await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.log(\'Normal 2\'), 100);"',
      {}
    );
    
    // Wait for crash
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify crash handling
    expect(crashedProcesses).toContain(crashingProcess);
    expect(crashedProcesses).not.toContain(normalProcess1);
    expect(crashedProcesses).not.toContain(normalProcess2);
    
    // Verify other processes continue running
    const status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(2);
    
    // Verify crashed process is cleaned up
    const activeProcesses = (logMonitor as any).processes;
    expect(activeProcesses.has(crashingProcess)).toBe(false);
    expect(activeProcesses.has(normalProcess1)).toBe(true);
    expect(activeProcesses.has(normalProcess2)).toBe(true);
  });
});