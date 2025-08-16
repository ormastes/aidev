import { LogMonitor } from '../../src/external/log-monitor';

describe('LogMonitor Coverage Tests', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should handle process error events through child process error', async () => {
    const processErrorEvents: any[] = [];
    
    logMonitor.on('process-error', (event) => {
      processErrorEvents.push(event);
    });

    // Start a valid process and then emit error on it
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\\"test\\")"',
      { format: 'auto' }
    );

    // Simulate process error by emitting error on the child process
    const processData = (logMonitor as any).processes.get(processId);
    if (processData && processData.childProcess) {
      processData.childProcess.emit('error', new Error('Simulated process error'));
    }

    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify process-error event was emitted
    expect(processErrorEvents.length).toBeGreaterThan(0);
    expect(processErrorEvents[0].processId).toBe(processId);
    expect(processErrorEvents[0].error).toBe('Simulated process error');
  });

  it('should handle process termination failures and force kill', async () => {
    const stoppedEvents: any[] = [];
    
    logMonitor.on('monitoring-stopped', (event) => {
      stoppedEvents.push(event);
    });

    // Start a valid process first
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "setInterval(() => {}, 1000)"', // Long-running process
      { format: 'auto' }
    );

    // Mock ProcessManager to simulate termination failure
    const processData = (logMonitor as any).processes.get(processId);
    if (processData) {
      const originalTerminate = processData.processManager.terminateProcess.bind(processData.processManager);
      processData.processManager.terminateProcess = jest.fn(() => {
        throw new Error('Termination failed');
      });
      
      processData.processManager.forceKill = jest.fn(() => {
        // Simulate force kill In Progress
        return originalTerminate('SIGKILL');
      });
    }

    // Attempt to stop monitoring (should trigger force kill path)
    await logMonitor.stopMonitoring(processId);

    // Verify forced termination event
    expect(stoppedEvents.length).toBeGreaterThan(0);
    const forcedStopEvent = stoppedEvents.find(e => e.forced === true);
    expect(forcedStopEvent).toBeDefined();
    expect(forcedStopEvent.processId).toBe(processId);
  });

  it('should handle stopMonitoring for non-existent process', async () => {
    const nonExistentProcessId = 'non-existent-process-id';
    
    await expect(logMonitor.stopMonitoring(nonExistentProcessId))
      .rejects.toThrow(`Process ${nonExistentProcessId} not found`);
  });

  it('should handle setLogLevelFilter for non-existent process', () => {
    const nonExistentProcessId = 'non-existent-process-id';
    
    expect(() => logMonitor.setLogLevelFilter(nonExistentProcessId, ['error']))
      .toThrow(`Process ${nonExistentProcessId} not found`);
  });

  it('should handle process error events', async () => {
    const processErrorEvents: any[] = [];
    
    logMonitor.on('process-error', (event) => {
      processErrorEvents.push(event);
    });

    // Start a process
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "console.log(\"test\")"',
      { format: 'auto' }
    );

    // Simulate process error by emitting error on the child process
    const processData = (logMonitor as any).processes.get(processId);
    if (processData && processData.childProcess) {
      processData.childProcess.emit('error', new Error('Simulated process error'));
    }

    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify process-error event was emitted
    expect(processErrorEvents.length).toBeGreaterThan(0);
    expect(processErrorEvents[0].processId).toBe(processId);
    expect(processErrorEvents[0].error).toBe('Simulated process error');
  });

  it('should handle monitoring status when processes exist', async () => {
    // Start a process
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "setTimeout(() => {}, 100)"',
      { format: 'auto' }
    );

    const status = logMonitor.getMonitoringStatus();
    expect(status.activeProcesses).toBe(1);
    expect(status.processes).toHaveLength(1);
    expect(status.processes[0].processId).toBe(processId);
    expect(status.processes[0].status).toBe('running');
    expect(status.processes[0].startTime).toBeInstanceOf(Date);

    // Manually stop the process to ensure clean state
    await logMonitor.stopMonitoring(processId);

    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
  });

  it('should handle log level filtering functionality', async () => {
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "setTimeout(() => {}, 100)"',
      { format: 'auto' }
    );

    // Test setting log level filter
    expect(() => logMonitor.setLogLevelFilter(processId, ['error', 'warn']))
      .not.toThrow();

    // Test with empty filter
    expect(() => logMonitor.setLogLevelFilter(processId, []))
      .not.toThrow();

    // Wait for process to complete
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  it('should properly clean up when stopping all monitoring', async () => {
    // Start multiple processes
    const processIds = await Promise.all([
      logMonitor.startRealTimeMonitoring('node -e "setTimeout(() => {}, 500)"', { format: 'auto' }),
      logMonitor.startRealTimeMonitoring('node -e "setTimeout(() => {}, 500)"', { format: 'auto' }),
      logMonitor.startRealTimeMonitoring('node -e "setTimeout(() => {}, 500)"', { format: 'auto' })
    ]);

    expect(processIds).toHaveLength(3);

    const initialStatus = logMonitor.getMonitoringStatus();
    expect(initialStatus.activeProcesses).toBe(3);

    // Stop all monitoring
    await logMonitor.stopAllMonitoring();

    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
    expect(finalStatus.processes).toHaveLength(0);
  });
});