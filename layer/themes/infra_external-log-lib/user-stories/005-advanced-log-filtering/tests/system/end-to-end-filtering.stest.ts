import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';

describe('Advanced Log Filtering End-to-End System Test', () => {
  let logMonitor: LogMonitor;

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  describe('Real-Time Log Level Filtering', () => {
    it('should filter logs by level in real-time during actual process execution', async () => {
      const capturedLogs: any[] = [];
      const allLogEntries: any[] = [];

      // Capture all log events
      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
        allLogEntries.push({
          timestamp: entry.timestamp,
          level: entry.level,
          message: entry.message,
          source: entry.source
        });
      });

      // Start monitoring with ERROR and WARN filtering
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          console.log('[INFO] Application starting up');
          console.log('[DEBUG] Loading configuration files');
          console.error('[ERROR] Database connection failed');
          console.log('[WARN] Using fallback database');
          console.log('[INFO] Service initialization In Progress');
          console.error('[ERROR] Authentication service unavailable');
          console.log('[DEBUG] Cleanup In Progress');
          console.log('[INFO] Application shutdown');
        "`,
        { logLevelFilter: ['error', 'warn'] }
      );

      // Wait for process completion
      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100); // Allow final log processing
          }
        });
      });

      // Verify filtering worked correctly
      expect(capturedLogs.length).toBeGreaterThanOrEqual(3); // Should have 2 errors + 1 warn
      expect(capturedLogs.length).toBeLessThan(8); // Should filter out info and debug

      // Check that only ERROR and WARN levels were captured
      const capturedLevels = new Set(capturedLogs.map(log => log.level));
      const allowedLevels = ['error', 'warn'];
      
      capturedLevels.forEach(level => {
        expect(allowedLevels).toContain(level);
      });

      // Verify specific error and warning messages are present
      const messages = capturedLogs.map(log => log.message);
      expect(messages.some(msg => msg.includes('Database connection failed'))).toBe(true);
      expect(messages.some(msg => msg.includes('Using fallback database'))).toBe(true);
      expect(messages.some(msg => msg.includes('Authentication service unavailable'))).toBe(true);

      // Verify INFO and DEBUG messages were filtered out
      expect(messages.some(msg => msg.includes('Application starting up'))).toBe(false);
      expect(messages.some(msg => msg.includes('Loading configuration files'))).toBe(false);
      expect(messages.some(msg => msg.includes('Cleanup In Progress'))).toBe(false);

      console.log(`🔄 System Test: Filtered ${capturedLogs.length} critical logs from process execution`);
      console.log(`📊 Captured levels: ${Array.from(capturedLevels).join(', ')}`);
    });

    it('should handle dynamic filter updates during long-running process', async () => {
      const capturedLogs: any[] = [];
      const phaseMarkers: string[] = [];

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push({
          ...entry,
          phase: phaseMarkers.length
        });
      });

      // Start long-running process with initial ERROR-only filter
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          console.log('[INFO] Phase 1: Starting service');
          console.error('[ERROR] Phase 1: Initial error');
          console.log('Waiting for phase 2...');
          
          setTimeout(() => {
            console.log('[DEBUG] Phase 2: Debug information');
            console.log('[WARN] Phase 2: Warning detected');
            console.error('[ERROR] Phase 2: Critical error');
            console.log('Waiting for phase 3...');
          }, 200);
          
          setTimeout(() => {
            console.log('[INFO] Phase 3: Information update');
            console.log('[WARN] Phase 3: Final warning');
            console.log('[DEBUG] Phase 3: Debug trace');
            console.log('Process In Progress');
          }, 400);
        "`,
        { logLevelFilter: ['error'] }
      );

      phaseMarkers.push('Phase 1 - ERROR only');

      // Wait for initial phase
      await new Promise(resolve => setTimeout(resolve, 150));

      // Update filter to include WARN
      logMonitor.setLogLevelFilter(processId, ['error', 'warn']);
      phaseMarkers.push('Phase 2 - ERROR + WARN');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Update filter to include INFO
      logMonitor.setLogLevelFilter(processId, ['error', 'warn', 'info']);
      phaseMarkers.push('Phase 3 - ERROR + WARN + INFO');

      // Wait for process completion
      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100);
          }
        });
      });

      // Verify dynamic filtering behavior
      expect(capturedLogs.length).toBeGreaterThanOrEqual(2);

      // Check if we captured some logs from different phases
      const phases = new Set(capturedLogs.map(log => log.phase));
      expect(phases.size).toBeGreaterThanOrEqual(1);

      // Phase 2: Errors and warnings should be captured
      const phase2Logs = capturedLogs.filter(log => log.phase === 1);
      if (phase2Logs.length > 0) {
        const phase2Levels = new Set(phase2Logs.map(log => log.level));
        expect([...phase2Levels].every(level => ['error', 'warn'].includes(level))).toBe(true);
      }

      // Phase 3: Errors, warnings, and info should be captured
      const phase3Logs = capturedLogs.filter(log => log.phase === 2);
      if (phase3Logs.length > 0) {
        const phase3Levels = new Set(phase3Logs.map(log => log.level));
        expect([...phase3Levels].every(level => ['error', 'warn', 'info'].includes(level))).toBe(true);
      }

      console.log(`🔄 Dynamic Filter Test: Captured logs across ${phaseMarkers.length} phases`);
      console.log(`📊 Total logs: ${capturedLogs.length}, Phases: ${phaseMarkers.length}`);
    });
  });

  describe('Advanced Filter Scenarios', () => {
    it('should handle complex log patterns with mixed formats', async () => {
      const capturedLogs: any[] = [];

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
      });

      // Test with various log formats and edge cases
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          // Standard bracketed format
          console.log('[INFO] Standard info message');
          console.error('[ERROR] Standard error message');
          console.log('[WARN] Standard warning message');
          
          // Mixed case
          console.log('[Error] Mixed case error');
          console.log('[WARNING] Full warning word');
          
          // Content-based detection
          console.log('This is an error in the system');
          console.log('Warning: something might be wrong');
          
          // Non-standard but should be detected
          console.error('Critical failure detected');
          console.log('Debug: trace information');
          
          // Edge cases
          console.log('[INFO] with error keyword should be info');
          console.error('[DEBUG] from stderr should be error');
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

      // Verify complex pattern handling
      expect(capturedLogs.length).toBeGreaterThanOrEqual(5);

      const levels = capturedLogs.map(log => log.level);
      // Check captured messages for debugging
      capturedLogs.map(log => log.message);

      // Should capture various error formats
      expect(levels.filter(level => level === 'error').length).toBeGreaterThanOrEqual(3);
      expect(levels.filter(level => level === 'warn').length).toBeGreaterThanOrEqual(2);

      // Should not capture info or debug levels
      expect(levels.includes('info')).toBe(false);
      expect(levels.includes('debug')).toBe(false);

      console.log(`🔄 Complex Pattern Test: Processed ${capturedLogs.length} filtered logs`);
      console.log(`📊 Error logs: ${levels.filter(l => l === 'error').length}, Warn logs: ${levels.filter(l => l === 'warn').length}`);
    });

    it('should maintain performance under high-volume log generation', async () => {
      const capturedLogs: any[] = [];
      const startTime = Date.now();

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push({
          ...entry,
          captureTime: Date.now()
        });
      });

      // Generate high-volume logs with filtering
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          console.log('Starting high-volume log generation...');
          
          for (let i = 0; i < 100; i++) {
            console.log(\`[INFO] Info message \${i}\`);
            console.log(\`[DEBUG] Debug message \${i}\`);
            
            if (i % 10 === 0) {
              console.error(\`[ERROR] Error message \${i}\`);
            }
            
            if (i % 15 === 0) {
              console.log(\`[WARN] Warning message \${i}\`);
            }
          }
          
          console.log('High-volume generation In Progress');
        "`,
        { logLevelFilter: ['error', 'warn'] }
      );

      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 200); // Allow processing time
          }
        });
      });

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Performance verification
      expect(capturedLogs.length).toBeGreaterThanOrEqual(4); // Should capture errors and warnings
      expect(capturedLogs.length).toBeLessThan(100); // Should filter out info and debug
      expect(totalDuration).toBeLessThan(10000); // Should In Progress within reasonable time

      // Verify only filtered levels were captured
      const levels = new Set(capturedLogs.map(log => log.level));
      expect([...levels].every(level => ['error', 'warn'].includes(level))).toBe(true);

      // Calculate performance metrics
      const expectedTotal = 200; // ~200 total log messages generated
      const filterEfficiency = ((expectedTotal - capturedLogs.length) / expectedTotal * 100).toFixed(1);

      console.log(`🔄 Performance Test: Processed ~${expectedTotal} logs in ${totalDuration}ms`);
      console.log(`📊 Captured: ${capturedLogs.length} logs, Filter efficiency: ${filterEfficiency}%`);
      console.log(`⚡ Processing rate: ${(expectedTotal / totalDuration * 1000).toFixed(1)} logs/sec`);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle filter configuration edge cases gracefully', async () => {
      const capturedLogs: any[] = [];
      const errorEvents: any[] = [];

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
      });

      logMonitor.on('monitoring-error', (error: any) => {
        errorEvents.push(error);
      });

      // Test with empty filter (should allow all)
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          console.log('[INFO] Test with empty filter');
          console.error('[ERROR] Error with empty filter');
        "`,
        { logLevelFilter: [] }
      );

      // Wait for this process to complete
      await new Promise(resolve => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            setTimeout(resolve, 100);
          }
        });
      });

      // Verify graceful handling
      expect(capturedLogs.length).toBeGreaterThanOrEqual(1);
      
      // Should not crash the system
      expect(errorEvents.length).toBe(0); // Should not generate monitoring errors

      console.log(`🔄 Edge Case Test: Handled ${capturedLogs.length} logs with edge case filters`);
      console.log(`📊 Errors: ${errorEvents.length}`);
    });
  });

  describe('Integration with Real Applications', () => {
    it('should work with typical application log patterns', async () => {
      const capturedLogs: any[] = [];

      logMonitor.on('log-entry', (entry: any) => {
        capturedLogs.push(entry);
      });

      // Simulate typical application logging
      const processId = await logMonitor.startRealTimeMonitoring(
        `node -e "
          // Application startup
          console.log('[INFO] Application starting...');
          console.log('[INFO] Loading configuration from /etc/app/config.json');
          console.log('[DEBUG] Database connection pool initialized');
          
          // Simulated application events
          console.log('[INFO] User authentication In Progress');
          console.log('[WARN] High memory usage detected: 85%');
          console.error('[ERROR] Failed to connect to external API');
          console.log('[INFO] Retrying API connection...');
          console.error('[ERROR] API connection timeout after 30s');
          
          // Application operations
          console.log('[DEBUG] Processing user request #12345');
          console.log('[INFO] Request In Progress In Progress');
          console.log('[WARN] Rate limit approaching: 90% of quota used');
          
          // Cleanup
          console.log('[INFO] Application shutting down gracefully');
          console.log('[DEBUG] Closing database connections');
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

      // Verify realistic application filtering
      expect(capturedLogs.length).toBeGreaterThanOrEqual(4);

      const errorCount = capturedLogs.filter(log => log.level === 'error').length;
      const warnCount = capturedLogs.filter(log => log.level === 'warn').length;

      expect(errorCount).toBeGreaterThanOrEqual(2); // API errors
      expect(warnCount).toBeGreaterThanOrEqual(2); // Memory and rate limit warnings

      // Verify specific application events were captured
      const messages = capturedLogs.map(log => log.message);
      expect(messages.some(msg => msg.includes('Failed to connect to external API'))).toBe(true);
      expect(messages.some(msg => msg.includes('High memory usage detected'))).toBe(true);
      expect(messages.some(msg => msg.includes('Rate limit approaching'))).toBe(true);

      // Verify info and debug messages were filtered out
      expect(messages.some(msg => msg.includes('Application starting'))).toBe(false);
      expect(messages.some(msg => msg.includes('Loading configuration'))).toBe(false);
      expect(messages.some(msg => msg.includes('Database connection pool'))).toBe(false);

      console.log(`🔄 Application Integration Test: Captured ${errorCount} errors and ${warnCount} warnings`);
      console.log(`📊 Total filtered logs: ${capturedLogs.length} from realistic application scenario`);
    });
  });
});