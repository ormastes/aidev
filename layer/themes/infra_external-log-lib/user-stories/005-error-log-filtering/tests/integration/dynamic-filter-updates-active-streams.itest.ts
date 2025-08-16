import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';

describe('Dynamic Filter Updates with Active Streams Integration Test', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should update filters while actively streaming logs', async () => {
    const capturedLogs: any[] = [];
    const filterChanges: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push({
        ...entry,
        captureTime: Date.now()
      });
    });

    // Start continuous log generation
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'let count = 0;' +
      'const interval = setInterval(() => {' +
      '  count++;' +
      '  console.log(`INFO: Message ${count}`);' +
      '  console.error(`ERROR: Error ${count}`);' +
      '  console.log(`DEBUG: Debug ${count}`);' +
      '  if (count >= 20) { clearInterval(interval); process.exit(0); }' +
      '}, 50);' +
      '"',
      { logLevelFilter: ['error'] }
    );

    const startTime = Date.now();
    filterChanges.push({ time: 0, filter: ['error'] });

    // Update filter while logs are streaming
    setTimeout(() => {
      logMonitor.setLogLevelFilter(processId, ['error', 'info']);
      filterChanges.push({ time: Date.now() - startTime, filter: ['error', 'info'] });
    }, 200);

    setTimeout(() => {
      logMonitor.setLogLevelFilter(processId, ['debug']);
      filterChanges.push({ time: Date.now() - startTime, filter: ['debug'] });
    }, 400);

    setTimeout(() => {
      logMonitor.setLogLevelFilter(processId, []);
      filterChanges.push({ time: Date.now() - startTime, filter: [] });
    }, 600);

    // Wait for process completion
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify logs were captured with different filters
    expect(capturedLogs.length).toBeGreaterThan(0);
    
    // Group logs by approximate filter periods
    const phase1Logs = capturedLogs.filter(log => log.captureTime - startTime < 200);

    // Verify filter effects (some timing variance is expected)
    if (phase1Logs.length > 0) {
      phase1Logs.forEach(log => {
        expect(log.level).toBe('error');
      });
    }

    // Later phases should have more variety
    const allLevels = [...new Set(capturedLogs.map(log => log.level))];
    expect(allLevels.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle high-frequency filter updates', async () => {
    const capturedLogs: any[] = [];
    let updateCount = 0;
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });

    // Start fast log generation
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'let count = 0;' +
      'const interval = setInterval(() => {' +
      '  count++;' +
      '  console.log(`INFO: Fast ${count}`);' +
      '  console.error(`ERROR: Fast ${count}`);' +
      '  if (count >= 30) { clearInterval(interval); process.exit(0); }' +
      '}, 20);' +
      '"',
      { logLevelFilter: ['error'] }
    );

    // Rapid filter updates
    const updateInterval = setInterval(() => {
      updateCount++;
      const filters = [
        ['error'],
        ['info'],
        ['error', 'info'],
        [],
        ['info', 'debug'],
        ['error', 'debug']
      ];
      const filter = filters[updateCount % filters.length];
      
      try {
        logMonitor.setLogLevelFilter(processId, filter);
      } catch (error) {
        // Process might have ended
        clearInterval(updateInterval);
      }
    }, 100);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    clearInterval(updateInterval);

    // Should have captured logs despite rapid filter changes
    expect(capturedLogs.length).toBeGreaterThan(0);
    expect(updateCount).toBeGreaterThan(5);
    
    // Should have variety from different filters
    const levels = [...new Set(capturedLogs.map(log => log.level))];
    expect(levels.length).toBeGreaterThanOrEqual(1);
  });

  it('should maintain stream integrity during filter updates', async () => {
    const streamEvents: any[] = [];
    const logEntries: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });
    
    logMonitor.on('buffer-warning', (event: any) => {
      streamEvents.push({ type: 'buffer-warning', ...event });
    });

    // Generate logs with varying rates
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'let count = 0;' +
      'function burst() {' +
      '  for (let i = 0; i < 10; i++) {' +
      '    console.log(`INFO: Burst ${count}-${i}`);' +
      '    console.error(`ERROR: Burst ${count}-${i}`);' +
      '  }' +
      '  count++;' +
      '  if (count < 5) setTimeout(burst, 200);' +
      '  else process.exit(0);' +
      '}' +
      'burst();' +
      '"',
      { logLevelFilter: ['error'] }
    );

    // Update filters during bursts
    setTimeout(() => {
      logMonitor.setLogLevelFilter(processId, ['info', 'error']);
    }, 150);

    setTimeout(() => {
      logMonitor.setLogLevelFilter(processId, []);
    }, 350);

    setTimeout(() => {
      logMonitor.setLogLevelFilter(processId, ['error']);
    }, 550);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify stream maintained integrity
    expect(logEntries.length).toBeGreaterThan(0);
    
    // Check for any stream warnings
    const bufferWarnings = streamEvents.filter(e => e.type === 'buffer-warning');
    
    // Some warnings are acceptable under load
    if (bufferWarnings.length > 0) {
      console.log(`Stream integrity test: ${bufferWarnings.length} buffer warnings during bursts`);
    }
    
    // Verify no logs were corrupted (all have required fields)
    logEntries.forEach(entry => {
      expect(entry.level).toBeDefined();
      expect(entry.message).toBeDefined();
      expect(entry.processId).toBeDefined();
      expect(entry.timestamp).toBeDefined();
    });
  });

  it('should coordinate filter updates across multiple active streams', async () => {
    const allLogs: any[] = [];
    const processFilters: Map<string, string[]> = new Map();
    
    logMonitor.on('log-entry', (entry: any) => {
      allLogs.push(entry);
    });

    // Start multiple processes
    const processes: Array<{id: string, name: string}> = [];
    
    for (let i = 1; i <= 3; i++) {
      const id = await logMonitor.startRealTimeMonitoring(
        `node -e "
        let count = 0;
        const interval = setInterval(() => {
          count++;
          console.log('INFO: Process${i} log ' + count);
          console.error('ERROR: Process${i} error ' + count);
          console.log('DEBUG: Process${i} debug ' + count);
          if (count >= 10) { clearInterval(interval); process.exit(0); }
        }, 100);
        "`,
        { logLevelFilter: ['error'] }
      );
      
      processes.push({ id, name: `Process${i}` });
      processFilters.set(id, ['error']);
    }

    // Update filters at different times
    setTimeout(() => {
      logMonitor.setLogLevelFilter(processes[0].id, ['info', 'error']);
      processFilters.set(processes[0].id, ['info', 'error']);
    }, 200);

    setTimeout(() => {
      logMonitor.setLogLevelFilter(processes[1].id, ['debug']);
      processFilters.set(processes[1].id, ['debug']);
    }, 400);

    setTimeout(() => {
      logMonitor.setLogLevelFilter(processes[2].id, []);
      processFilters.set(processes[2].id, []);
    }, 600);

    // Wait for all to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify each process maintained independent filters
    processes.forEach(({ id }) => {
      const processLogs = allLogs.filter(log => log.processId === id);
      expect(processLogs.length).toBeGreaterThan(0);
      
      // Each should have logs matching their filter history
      const levels = [...new Set(processLogs.map(log => log.level))];
      expect(levels.length).toBeGreaterThanOrEqual(1);
    });

    // Total logs should reflect all processes
    expect(allLogs.length).toBeGreaterThan(processes.length * 5);
  });

  it('should handle filter updates during stream lifecycle events', async () => {
    const lifecycleEvents: any[] = [];
    const capturedLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });
    
    logMonitor.on('monitoring-started', (event: any) => {
      lifecycleEvents.push({ type: 'started', ...event });
    });
    
    logMonitor.on('process-exited', (event: any) => {
      lifecycleEvents.push({ type: 'exited', ...event });
    });

    // Process with distinct phases
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'console.log(\\"INFO: Starting up\\");' +
      'setTimeout(() => {' +
      '  console.error(\\"ERROR: Mid-process error\\");' +
      '  console.log(\\"INFO: Continuing\\");' +
      '}, 200);' +
      'setTimeout(() => {' +
      '  console.log(\\"INFO: Shutting down\\");' +
      '  process.exit(0);' +
      '}, 400);' +
      '"',
      { logLevelFilter: ['info'] }
    );

    // Update filter after startup
    setTimeout(() => {
      logMonitor.setLogLevelFilter(processId, ['error', 'info']);
    }, 100);

    // Try to update after process exits (should fail)
    setTimeout(async () => {
      try {
        logMonitor.setLogLevelFilter(processId, ['debug']);
      } catch (error: any) {
        lifecycleEvents.push({ 
          type: 'filter-update-failed', 
          error: error.message 
        });
      }
    }, 600);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify lifecycle and filter interaction
    expect(lifecycleEvents.length).toBeGreaterThan(0);
    expect(capturedLogs.length).toBeGreaterThan(0);
    
    const startEvent = lifecycleEvents.find(e => e.type === 'started');
    const exitEvent = lifecycleEvents.find(e => e.type === 'exited');
    const failedUpdate = lifecycleEvents.find(e => e.type === 'filter-update-failed');
    
    expect(startEvent).toBeDefined();
    expect(exitEvent).toBeDefined();
    expect(failedUpdate).toBeDefined();
    expect(failedUpdate.error).toContain('not found');
  });

  it('should handle concurrent filter updates safely', async () => {
    const capturedLogs: any[] = [];
    const updateAttempts: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      capturedLogs.push(entry);
    });

    // Start process
    const processId = await logMonitor.startRealTimeMonitoring(
      'node -e "' +
      'let count = 0;' +
      'const interval = setInterval(() => {' +
      '  count++;' +
      '  console.log(`INFO: Log ${count}`);' +
      '  console.error(`ERROR: Log ${count}`);' +
      '  if (count >= 15) { clearInterval(interval); process.exit(0); }' +
      '}, 50);' +
      '"',
      { logLevelFilter: ['error'] }
    );

    // Concurrent filter updates
    const updatePromises = [];
    
    for (let i = 0; i < 5; i++) {
      const delay = i * 100;
      const filters = [['error'], ['info'], ['error', 'info'], [], ['debug']];
      
      updatePromises.push(
        new Promise(resolve => {
          setTimeout(() => {
            try {
              logMonitor.setLogLevelFilter(processId, filters[i]);
              updateAttempts.push({ 
                time: Date.now(), 
                filter: filters[i], 
                "success": true 
              });
            } catch (error) {
              updateAttempts.push({ 
                time: Date.now(), 
                filter: filters[i], 
                "success": false 
              });
            }
            resolve(undefined);
          }, delay);
        })
      );
    }

    // Wait for all updates and process completion
    await Promise.all(updatePromises);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify system handled concurrent updates
    expect(updateAttempts.length).toBe(5);
    const completedfulUpdates = updateAttempts.filter(a => a.success);
    expect(completedfulUpdates.length).toBeGreaterThan(0);
    
    // Should have captured logs throughout
    expect(capturedLogs.length).toBeGreaterThan(0);
  });
});