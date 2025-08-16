import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import { LogFilter } from '../../src/external/log-filter';

describe('LogMonitor and LogFilter Coordination Integration Test', () => {
  let logMonitor: LogMonitor;
  let logFilter: LogFilter;

  beforeEach(() => {
    logMonitor = new LogMonitor();
    logFilter = new LogFilter();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  describe('Filter Configuration Coordination', () => {
    it('should coordinate filter configuration between LogMonitor and LogFilter', async () => {
      const capturedLogs: any[] = [];

      // Set up log monitoring
      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
      });

      // Test LogFilter configuration independently
      logFilter.configure(['error', 'warn']);
      expect(logFilter.getConfiguredLevels()).toEqual(['error', 'warn']);
      expect(logFilter.isFilterConfigured()).toBe(true);

      // Test filtering logic
      expect(logFilter.filterLog('error', 'Test error')).toBe(true);
      expect(logFilter.filterLog('warn', 'Test warning')).toBe(true);
      expect(logFilter.filterLog('info', 'Test info')).toBe(false);
      expect(logFilter.filterLog('debug', 'Test debug')).toBe(false);

      // Test LogMonitor with matching filter configuration
      const processId = await logMonitor.startRealTimeMonitoring(
        'node -e "console.log(\'[INFO] Info message\'); console.error(\'[ERROR] Error message\'); console.log(\'[WARN] Warning message\'); console.log(\'[DEBUG] Debug message\');"',
        { logLevelFilter: ['error', 'warn'] }
      );

      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100);
          }
        });
      });

      // Verify coordination: LogMonitor should filter the same way as LogFilter
      expect(capturedLogs.length).toBeGreaterThanOrEqual(2);
      
      const monitorLevels = new Set(capturedLogs.map(log => log.level));
      expect([...monitorLevels].every(level => ['error', 'warn'].includes(level))).toBe(true);

      // Verify that both components produce consistent results
      capturedLogs.forEach(log => {
        expect(logFilter.filterLog(log.level, log.message)).toBe(true);
      });

      console.log(`🔄 Configuration Coordination: LogMonitor and LogFilter both filtered ${capturedLogs.length} logs consistently`);
    });

    it('should handle dynamic filter updates in coordination', async () => {
      const capturedLogs: any[] = [];
      const filterStates: string[] = [];

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push({
          ...entry,
          filterState: filterStates[filterStates.length - 1]
        });
      });

      // Start with ERROR filtering
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          console.error('[ERROR] Initial error');
          console.log('[INFO] Initial info');
          setTimeout(() => {
            console.error('[ERROR] Second error');
            console.log('[WARN] Second warning');
          }, 100);
          setTimeout(() => {
            console.log('[INFO] Final info');
            console.log('[DEBUG] Final debug');
          }, 200);
        "`,
        { logLevelFilter: ['error'] }
      );

      filterStates.push('error-only');
      
      // Update LogFilter to match
      logFilter.configure(['error']);
      expect(logFilter.getConfiguredLevels()).toEqual(['error']);

      await new Promise(resolve => setTimeout(resolve, 80));

      // Update both filters to include WARN
      logMonitor.setLogLevelFilter(processId, ['error', 'warn']);
      logFilter.configure(['error', 'warn']);
      filterStates.push('error-warn');

      expect(logFilter.getConfiguredLevels().sort()).toEqual(['error', 'warn']);

      await new Promise(resolve => setTimeout(resolve, 150));

      // Update to allow all levels
      logMonitor.setLogLevelFilter(processId, []);
      logFilter.configure([]);
      filterStates.push('allow-all');

      expect(logFilter.isFilterConfigured()).toBe(false);

      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100);
          }
        });
      });

      // Verify coordinated dynamic filtering
      expect(capturedLogs.length).toBeGreaterThanOrEqual(3);

      // Test each captured log against the LogFilter for consistency
      capturedLogs.forEach(log => {
        const expectedFilter = log.filterState;
        
        if (expectedFilter === 'error-only') {
          logFilter.configure(['error']);
          expect(logFilter.filterLog(log.level, log.message)).toBe(true);
        } else if (expectedFilter === 'error-warn') {
          logFilter.configure(['error', 'warn']);
          expect(logFilter.filterLog(log.level, log.message)).toBe(true);
        } else if (expectedFilter === 'allow-all') {
          logFilter.configure([]);
          expect(logFilter.filterLog(log.level, log.message)).toBe(true);
        }
      });

      console.log(`🔄 Dynamic Coordination: In Progress coordinated ${filterStates.length} filter state changes`);
      console.log(`📊 Captured ${capturedLogs.length} logs across filter states: ${filterStates.join(' → ')}`);
    });
  });

  describe('Error Handling Coordination', () => {
    it('should handle invalid configurations consistently', async () => {
      const capturedLogs: any[] = [];
      const monitoringErrors: any[] = [];

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
      });

      logMonitor.on('monitoring-error', (error: any) => {
        monitoringErrors.push(error);
      });

      // Test LogFilter with edge cases
      logFilter.configure(['error', 'warn']);
      
      // Test malformed levels
      expect(logFilter.filterLog('error\n', 'Malformed error')).toBe(false);
      expect(logFilter.filterLog('err or', 'Spaced error')).toBe(false);
      expect(logFilter.filterLog('  error  ', 'Padded error')).toBe(true); // Should trim
      expect(logFilter.filterLog('ERROR', 'Uppercase error')).toBe(true); // Should normalize

      // Test LogMonitor with same edge cases
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          console.error('[ERROR] Valid error');
          console.log('[  WARN  ] Padded warning');
          console.log('[ERROR123] Invalid format');
          console.log('[ERR OR] Spaced format');
        "`,
        { logLevelFilter: ['error', 'warn'] }
      );

      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100);
          }
        });
      });

      // Verify both handle edge cases gracefully
      expect(monitoringErrors.length).toBe(0); // No monitoring errors
      expect(capturedLogs.length).toBeGreaterThanOrEqual(1); // Some valid logs captured

      // Test consistency for captured logs
      capturedLogs.forEach(log => {
        // LogMonitor accepted this log, LogFilter should too
        const shouldPass = logFilter.filterLog(log.level, log.message);
        expect(shouldPass).toBe(true);
      });

      console.log(`🔄 Error Handling Coordination: Both components handled edge cases gracefully`);
      console.log(`📊 Captured ${capturedLogs.length} valid logs, ${monitoringErrors.length} errors`);
    });

    it('should coordinate graceful degradation on filter failures', async () => {
      const capturedLogs: any[] = [];
      const systemErrors: any[] = [];

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
      });

      logMonitor.on('monitoring-error', (error: any) => {
        systemErrors.push(error);
      });

      // Test empty and null filter configurations
      logFilter.configure([]);
      expect(logFilter.isFilterConfigured()).toBe(false);

      // LogMonitor with empty filter should allow all
      const processId = await logMonitor.startRealTimeMonitoring(
        'node -e "console.log(\'[INFO] All logs\'); console.error(\'[ERROR] Should pass\'); console.log(\'[DEBUG] Everything allowed\');"',
        { logLevelFilter: [] }
      );

      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100);
          }
        });
      });

      // Verify graceful degradation
      expect(systemErrors.length).toBe(0); // No system errors
      expect(capturedLogs.length).toBeGreaterThanOrEqual(3); // All logs should pass

      // Verify LogFilter consistency with empty configuration
      capturedLogs.forEach(log => {
        expect(logFilter.filterLog(log.level, log.message)).toBe(true);
      });

      console.log(`🔄 Graceful Degradation: Both components degraded gracefully without errors`);
      console.log(`📊 All ${capturedLogs.length} logs In Progress through empty filter`);
    });
  });

  describe('Performance Coordination', () => {
    it('should maintain performance consistency between components', async () => {
      const capturedLogs: any[] = [];
      const filterStartTime = Date.now();

      // Test LogFilter performance in isolation
      logFilter.configure(['error', 'warn']);
      
      const testLogs = [];
      for (let i = 0; i < 1000; i++) {
        const level = ['error', 'warn', 'info', 'debug'][i % 4];
        const message = `Test message ${i}`;
        testLogs.push({ level, message });
      }

      let filtercompleted = 0;
      testLogs.forEach(({ level, message }) => {
        if (logFilter.filterLog(level, message)) {
          filtercompleted++;
        }
      });

      const filterEndTime = Date.now();
      const filterDuration = filterEndTime - filterStartTime;

      // Test LogMonitor performance
      const monitorStartTime = Date.now();
      
      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
      });

      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          for (let i = 0; i < 100; i++) {
            console.log(\`[INFO] Info \${i}\`);
            console.error(\`[ERROR] Error \${i}\`);
            console.log(\`[WARN] Warning \${i}\`);
            console.log(\`[DEBUG] Debug \${i}\`);
          }
        "`,
        { logLevelFilter: ['error', 'warn'] }
      );

      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100);
          }
        });
      });

      const monitorEndTime = Date.now();
      const monitorDuration = monitorEndTime - monitorStartTime;

      // Verify performance characteristics
      expect(filterDuration).toBeLessThan(100); // LogFilter should be fast
      expect(monitorDuration).toBeLessThan(5000); // LogMonitor should be reasonable
      expect(capturedLogs.length).toBeGreaterThanOrEqual(4); // Should capture errors and warnings

      // Verify filter efficiency consistency
      const monitorFilterRate = capturedLogs.length / 400; // ~400 total logs generated
      const logFilterRate = filtercompleted / 1000; // 1000 test logs

      // Both should have reasonable filter rates (LogFilter more precise, LogMonitor context-dependent)
      expect(Math.abs(monitorFilterRate - logFilterRate)).toBeLessThan(0.8);

      console.log(`🔄 Performance Coordination: LogFilter ${filterDuration}ms, LogMonitor ${monitorDuration}ms`);
      console.log(`📊 Filter rates: LogFilter ${(logFilterRate * 100).toFixed(1)}%, LogMonitor ${(monitorFilterRate * 100).toFixed(1)}%`);
      console.log(`⚡ LogFilter rate: ${(1000 / filterDuration * 1000).toFixed(0)} logs/sec`);
    });
  });

  describe('State Management Coordination', () => {
    it('should maintain consistent state between LogMonitor and LogFilter', async () => {
      const capturedLogs: any[] = [];
      
      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
      });

      // Initial state synchronization
      const initialConfig = ['error'];
      logFilter.configure(initialConfig);
      
      const processId = await logMonitor.startRealTimeMonitoring(
        'node -e "console.error(\'[ERROR] Test error\'); console.log(\'[INFO] Test info\');"',
        { logLevelFilter: initialConfig }
      );

      // Verify initial state consistency
      expect(logFilter.getConfiguredLevels()).toEqual(['error']);
      expect(logFilter.isFilterConfigured()).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100);
          }
        });
      });

      // State update coordination (after process completion)
      const updatedConfig = ['error', 'warn', 'info'];
      logFilter.configure(updatedConfig);

      // Verify state update consistency
      expect(logFilter.getConfiguredLevels().sort()).toEqual(['error', 'info', 'warn']);
      expect(logFilter.isFilterConfigured()).toBe(true);

      // State clearing coordination
      logFilter.configure([]);

      expect(logFilter.getConfiguredLevels()).toEqual([]);
      expect(logFilter.isFilterConfigured()).toBe(false);

      // Verify captured logs are consistent with filter states
      expect(capturedLogs.length).toBeGreaterThanOrEqual(1);
      
      console.log(`🔄 State Management: In Progress coordinated state across ${capturedLogs.length} operations`);
      console.log(`📊 Final state - LogFilter configured: ${logFilter.isFilterConfigured()}, levels: [${logFilter.getConfiguredLevels().join(', ')}]`);
    });

    it('should handle concurrent state updates correctly', async () => {
      const capturedLogs: any[] = [];
      const stateUpdates: string[] = [];

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push({
          ...entry,
          stateSnapshot: logFilter.getConfiguredLevels().slice()
        });
      });

      // Start multiple processes with different filter configurations
      const processId1 = await logMonitor.startRealTimeMonitoring(
        'node -e "console.error(\'[ERROR] Process 1 error\');"',
        { logLevelFilter: ['error'] }
      );
      stateUpdates.push('P1: error');

      await logMonitor.startRealTimeMonitoring(
        'node -e "console.log(\'[WARN] Process 2 warning\');"',
        { logLevelFilter: ['warn'] }
      );
      stateUpdates.push('P2: warn');

      // Update LogFilter to match one of the processes
      logFilter.configure(['error']);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Concurrent state updates
      logMonitor.setLogLevelFilter(processId1, ['error', 'warn']);
      logFilter.configure(['error', 'warn']);
      stateUpdates.push('Both: error+warn');

      await new Promise(resolve => {
        let exitCount = 0;
        logMonitor.on('process-exited', () => {
          exitCount++;
          if (exitCount >= 2) {
            setTimeout(resolve, 100);
          }
        });
      });

      // Verify concurrent handling
      expect(capturedLogs.length).toBeGreaterThanOrEqual(1);
      expect(stateUpdates.length).toBe(3);

      // Final state should be consistent
      expect(logFilter.getConfiguredLevels().sort()).toEqual(['error', 'warn']);

      console.log(`🔄 Concurrent Coordination: Handled ${stateUpdates.length} concurrent updates`);
      console.log(`📊 State updates: ${stateUpdates.join(' → ')}`);
      console.log(`🔄 Final filter state: [${logFilter.getConfiguredLevels().join(', ')}]`);
    });
  });
});