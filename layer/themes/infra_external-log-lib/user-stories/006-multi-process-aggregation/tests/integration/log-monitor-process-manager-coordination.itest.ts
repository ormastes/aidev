import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';

describe('LogMonitor and ProcessManager Coordination Integration Test', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should coordinate multiple ProcessManagers for concurrent processes', async () => {
    const processEvents: any[] = [];
    const processManagers = new Map<string, any>();
    
    // Track process events
    logMonitor.on('monitoring-started', (event: any) => {
      processEvents.push({ type: 'started', ...event });
    });
    
    logMonitor.on('process-exited', (event: any) => {
      processEvents.push({ type: 'exited', ...event });
    });

    // Start multiple processes
    const processIds: string[] = [];
    
    const p1Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'P1 start\'); setTimeout(() => { console.log(\'P1 end\'); process.exit(0); }, 300);"',
      {}
    );
    processIds.push(p1Id);
    
    const p2Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'P2 start\'); setTimeout(() => { console.log(\'P2 end\'); process.exit(0); }, 400);"',
      {}
    );
    processIds.push(p2Id);
    
    const p3Id = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'P3 start\'); setTimeout(() => { console.log(\'P3 end\'); process.exit(0); }, 500);"',
      {}
    );
    processIds.push(p3Id);

    // Access internal state to verify ProcessManagers
    const processes = (logMonitor as any).processes;
    
    // Verify each process has its own ProcessManager
    processIds.forEach(processId => {
      const processData = processes.get(processId);
      expect(processData).toBeDefined();
      expect(processData.processManager).toBeDefined();
      expect(processData.childProcess).toBeDefined();
      
      // Store ProcessManager references
      processManagers.set(processId, processData.processManager);
    });
    
    // Verify all ProcessManagers are unique
    const uniqueManagers = new Set(processManagers.values());
    expect(uniqueManagers.size).toBe(3);
    
    // Verify all are running
    processManagers.forEach((manager) => {
      expect(manager.isRunning()).toBe(true);
    });
    
    // Wait for all processes to complete
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Verify coordination of lifecycle events
    expect(processEvents.filter(e => e.type === 'started')).toHaveLength(3);
    expect(processEvents.filter(e => e.type === 'exited').length).toBeGreaterThanOrEqual(2);
    
    // Verify all ProcessManagers are no longer running
    processManagers.forEach((manager) => {
      expect(manager.isRunning()).toBe(false);
    });
    
    // Verify cleanup
    processIds.forEach(processId => {
      expect(processes.has(processId)).toBe(false);
    });
  });

  it('should handle independent ProcessManager lifecycle events', async () => {
    const lifecycleEvents: Map<string, any[]> = new Map();
    
    // Start processes with different behaviors
    const normalId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'Normal process\'); setTimeout(() => process.exit(0), 200);"',
      {}
    );
    lifecycleEvents.set(normalId, []);
    
    const crashId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'Crash process\'); process.exit(1);"',
      {}
    );
    lifecycleEvents.set(crashId, []);
    
    const longId = await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => console.log(\'Still running\'), 100);"',
      {}
    );
    lifecycleEvents.set(longId, []);
    
    // Track events per process
    logMonitor.on('process-exited', (event: any) => {
      lifecycleEvents.get(event.processId)?.push({ type: 'exited', ...event });
    });
    
    logMonitor.on('process-crashed', (event: any) => {
      lifecycleEvents.get(event.processId)?.push({ type: 'crashed', ...event });
    });
    
    // Wait for short processes to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get ProcessManagers
    const processes = (logMonitor as any).processes;
    
    // Verify normal process In Progress
    expect(lifecycleEvents.get(normalId)?.some(e => e.type === 'exited')).toBe(true);
    expect(processes.has(normalId)).toBe(false);
    
    // Verify crash process failed
    expect(lifecycleEvents.get(crashId)?.some(e => e.type === 'crashed')).toBe(true);
    expect(processes.has(crashId)).toBe(false);
    
    // Verify long process still running
    expect(lifecycleEvents.get(longId)?.length).toBe(0);
    expect(processes.has(longId)).toBe(true);
    
    const longProcessData = processes.get(longId);
    expect(longProcessData.processManager.isRunning()).toBe(true);
    
    // Stop the long-running process
    await logMonitor.stopMonitoring(longId);
    
    // Verify it's cleaned up
    expect(processes.has(longId)).toBe(false);
  });

  it('should coordinate resource management across ProcessManagers', async () => {
    const memoryUsage: any[] = [];
    const processIds: string[] = [];
    
    // Get initial memory baseline
    const baselineMemory = process.memoryUsage().heapUsed;
    
    // Start resource-intensive processes
    for (let i = 0; i < 5; i++) {
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          const data = [];
          for (let j = 0; j < 1000; j++) {
            data.push('Process ${i} data item ' + j);
          }
          console.log('Process ${i} allocated memory');
          setInterval(() => {
            console.log('Process ${i} heartbeat');
          }, 200);
        "`,
        {}
      );
      processIds.push(processId);
      
      // Record memory after each process starts
      memoryUsage.push({
        afterProcess: i + 1,
        memory: process.memoryUsage().heapUsed - baselineMemory
      });
    }
    
    // Verify all processes are managed
    const processes = (logMonitor as any).processes;
    expect(processes.size).toBe(5);
    
    // Verify each has unique resources
    const childProcesses = new Set();
    const processManagers = new Set();
    const logStreams = new Set();
    
    processes.forEach((processData: any) => {
      childProcesses.add(processData.childProcess);
      processManagers.add(processData.processManager);
      logStreams.add(processData.logStream);
    });
    
    expect(childProcesses.size).toBe(5);
    expect(processManagers.size).toBe(5);
    expect(logStreams.size).toBe(5);
    
    // Stop all processes
    await logMonitor.stopAllMonitoring();
    
    // Verify cleanup
    expect(processes.size).toBe(0);
    
    // All ProcessManagers should be stopped
    processManagers.forEach((manager: any) => {
      expect(manager.isRunning()).toBe(false);
    });
  });

  it('should maintain isolation between ProcessManagers', async () => {
    const isolatedLogs: Map<string, string[]> = new Map();
    
    // Set up log capture
    logMonitor.on('log-entry', (entry: any) => {
      if (!isolatedLogs.has(entry.processId)) {
        isolatedLogs.set(entry.processId, []);
      }
      isolatedLogs.get(entry.processId)!.push(entry.message);
    });
    
    // Start processes with unique identifiers
    const processConfigs = [
      { name: 'Alpha', prefix: 'ALPHA' },
      { name: 'Beta', prefix: 'BETA' },
      { name: 'Gamma', prefix: 'GAMMA' }
    ];
    
    const processIds: Map<string, string> = new Map();
    
    for (const config of processConfigs) {
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          for (let i = 1; i <= 5; i++) {
            console.log('[${config.prefix}] Message ' + i);
          }
        "`,
        {}
      );
      processIds.set(config.name, processId);
    }
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify isolation
    processIds.forEach((processId, name) => {
      const logs = isolatedLogs.get(processId) || [];
      expect(logs.length).toBe(5);
      
      // All logs should be from the correct process
      const expectedPrefix = processConfigs.find(c => c.name === name)!.prefix;
      logs.forEach(log => {
        expect(log).toContain(`[${expectedPrefix}]`);
        // Should not contain other prefixes
        processConfigs.forEach(config => {
          if (config.prefix !== expectedPrefix) {
            expect(log).not.toContain(`[${config.prefix}]`);
          }
        });
      });
    });
  });

  it('should coordinate error handling across ProcessManagers', async () => {
    const errorEvents: any[] = [];
    
    logMonitor.on('monitoring-error', (event: any) => {
      errorEvents.push(event);
    });
    
    logMonitor.on('process-crashed', (event: any) => {
      errorEvents.push({ type: 'crash', ...event });
    });
    
    // Start mix of valid and problematic processes
    const validId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\'Valid process\');"',
      {}
    );
    
    // Process that crashes immediately
    const crashId = await logMonitor.startRealTimeMonitoring(
      'node -e "throw new Error(\'Immediate crash\');"',
      {}
    );
    
    // Process with delayed crash
    const delayedCrashId = await logMonitor.startRealTimeMonitoring(
      'node -e "setTimeout(() => { throw new Error(\'Delayed crash\'); }, 200);"',
      {}
    );
    
    // Invalid command (might succeed on some systems)
    let invalidId: string | null = null;
    let invalidCommandFailed = false;
    try {
      invalidId = await logMonitor.startRealTimeMonitoring(
        'nonexistent-command-that-should-not-exist-anywhere --invalid-args',
        {}
      );
    } catch (error) {
      // Expected to fail
      invalidCommandFailed = true;
    }
    
    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify error handling
    const crashEvents = errorEvents.filter(e => e.type === 'crash');
    expect(crashEvents.length).toBeGreaterThanOrEqual(2);
    
    // Verify valid process is unaffected
    const processes = (logMonitor as any).processes;
    expect(processes.has(validId)).toBe(false); // Should have In Progress normally
    
    // Verify crashed processes are cleaned up
    expect(processes.has(crashId)).toBe(false);
    expect(processes.has(delayedCrashId)).toBe(false);
    
    // If invalid command succeeded, it should also crash
    if (!invalidCommandFailed && invalidId) {
      expect(processes.has(invalidId)).toBe(false);
    }
  });

  it('should coordinate concurrent operations on ProcessManagers', async () => {
    const operations: Promise<any>[] = [];
    const processIds: string[] = [];
    
    // Start processes concurrently
    for (let i = 0; i < 10; i++) {
      operations.push(
        logMonitor.startRealTimeMonitoring(
          `node -e "setInterval(() => console.log('Process ${i} tick'), 100);"`,
          {}
        ).then(id => {
          processIds.push(id);
          return id;
        })
      );
    }
    
    // Wait for all to start
    await Promise.all(operations);
    
    // Verify all started
    expect(processIds.length).toBe(10);
    const processes = (logMonitor as any).processes;
    expect(processes.size).toBe(10);
    
    // Perform concurrent operations
    const stopOperations: Promise<void>[] = [];
    
    // Stop even-numbered processes
    processIds.forEach((id, index) => {
      if (index % 2 === 0) {
        stopOperations.push(logMonitor.stopMonitoring(id));
      }
    });
    
    await Promise.all(stopOperations);
    
    // Verify correct processes were stopped
    processIds.forEach((id, index) => {
      if (index % 2 === 0) {
        expect(processes.has(id)).toBe(false);
      } else {
        expect(processes.has(id)).toBe(true);
      }
    });
    
    // Stop remaining
    await logMonitor.stopAllMonitoring();
    expect(processes.size).toBe(0);
  });
});