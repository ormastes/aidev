import { LogFilter } from '../../src/external/log-filter';

describe('LogFilter External Interface Test', () => {
  let logFilter: LogFilter;

  beforeEach(() => {
    logFilter = new LogFilter();
  });

  describe('Log Level Filtering', () => {
    it('should filter logs by configured log levels', () => {
      // Configure filter for ERROR and WARN only
      logFilter.configure(['error', 'warn']);

      // Test different log levels
      expect(logFilter.filterLog('error', 'Database connection failed')).toBe(true);
      expect(logFilter.filterLog('warn', 'Configuration missing')).toBe(true);
      expect(logFilter.filterLog('info', 'Application started')).toBe(false);
      expect(logFilter.filterLog('debug', 'Loading modules')).toBe(false);
    });

    it('should allow all logs when no filter is configured', () => {
      // No configuration - should allow all
      expect(logFilter.filterLog('error', 'Error message')).toBe(true);
      expect(logFilter.filterLog('warn', 'Warning message')).toBe(true);
      expect(logFilter.filterLog('info', 'Info message')).toBe(true);
      expect(logFilter.filterLog('debug', 'Debug message')).toBe(true);
    });

    it('should handle empty filter array as allow-all', () => {
      logFilter.configure([]);

      expect(logFilter.filterLog('error', 'Error message')).toBe(true);
      expect(logFilter.filterLog('warn', 'Warning message')).toBe(true);
      expect(logFilter.filterLog('info', 'Info message')).toBe(true);
      expect(logFilter.filterLog('debug', 'Debug message')).toBe(true);
    });

    it('should handle case sensitivity appropriately', () => {
      logFilter.configure(['error', 'warn']);

      // Test case variations
      expect(logFilter.filterLog('ERROR', 'Error in uppercase')).toBe(true);
      expect(logFilter.filterLog('Error', 'Error in titlecase')).toBe(true);
      expect(logFilter.filterLog('INFO', 'Info in uppercase')).toBe(false);
      expect(logFilter.filterLog('Debug', 'Debug in titlecase')).toBe(false);
    });

    it('should filter by non-standard log levels', () => {
      logFilter.configure(["critical", 'fatal']);

      expect(logFilter.filterLog("critical", 'Critical system error')).toBe(true);
      expect(logFilter.filterLog('fatal', 'Fatal system failure')).toBe(true);
      expect(logFilter.filterLog('error', 'Regular error')).toBe(false);
      expect(logFilter.filterLog('warn', 'Regular warning')).toBe(false);
    });
  });

  describe('Dynamic Filter Updates', () => {
    it('should support dynamic filter reconfiguration', () => {
      // Start with ERROR only
      logFilter.configure(['error']);
      expect(logFilter.filterLog('error', 'Error message')).toBe(true);
      expect(logFilter.filterLog('warn', 'Warning message')).toBe(false);

      // Add WARN to filter
      logFilter.configure(['error', 'warn']);
      expect(logFilter.filterLog('error', 'Error message')).toBe(true);
      expect(logFilter.filterLog('warn', 'Warning message')).toBe(true);
      expect(logFilter.filterLog('info', 'Info message')).toBe(false);

      // Change to INFO only
      logFilter.configure(['info']);
      expect(logFilter.filterLog('error', 'Error message')).toBe(false);
      expect(logFilter.filterLog('warn', 'Warning message')).toBe(false);
      expect(logFilter.filterLog('info', 'Info message')).toBe(true);
    });

    it('should maintain filter state between filter calls', () => {
      logFilter.configure(['error', 'warn']);

      // Multiple calls should maintain same filtering behavior
      expect(logFilter.filterLog('error', 'First error')).toBe(true);
      expect(logFilter.filterLog('info', 'First info')).toBe(false);
      expect(logFilter.filterLog('warn', 'First warning')).toBe(true);
      expect(logFilter.filterLog('debug', 'First debug')).toBe(false);
      expect(logFilter.filterLog('error', 'Second error')).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined log levels gracefully', () => {
      logFilter.configure(['error', 'warn']);

      // These should not throw but return false
      expect(logFilter.filterLog(null as any, 'Message with null level')).toBe(false);
      expect(logFilter.filterLog(undefined as any, 'Message with undefined level')).toBe(false);
      expect(logFilter.filterLog('', 'Message with empty level')).toBe(false);
    });

    it('should handle null and undefined messages gracefully', () => {
      logFilter.configure(['error', 'warn']);

      // Level matching should work regardless of message content
      expect(logFilter.filterLog('error', null as any)).toBe(true);
      expect(logFilter.filterLog('error', undefined as any)).toBe(true);
      expect(logFilter.filterLog('error', '')).toBe(true);
      expect(logFilter.filterLog('info', null as any)).toBe(false);
    });

    it('should handle malformed log levels', () => {
      logFilter.configure(['error', 'warn']);

      expect(logFilter.filterLog("error123", 'Malformed level')).toBe(false);
      expect(logFilter.filterLog('err or', 'Level with space')).toBe(false);
      expect(logFilter.filterLog('error\n', 'Level with newline')).toBe(false);
      expect(logFilter.filterLog('  error  ', 'Level with whitespace')).toBe(true); // Should trim
    });

    it('should handle very long filter lists efficiently', () => {
      const longFilterList: string[] = [];
      for (let i = 0; i < 100; i++) {
        longFilterList.push(`level${i}`);
      }

      logFilter.configure(longFilterList);

      // Should efficiently find matches
      expect(logFilter.filterLog('level50', 'Middle match')).toBe(true);
      expect(logFilter.filterLog('level0', 'First match')).toBe(true);
      expect(logFilter.filterLog('level99', 'Last match')).toBe(true);
      expect(logFilter.filterLog("level100", 'No match')).toBe(false);
    });
  });

  describe('Filter Configuration Validation', () => {
    it('should handle configuration with duplicate levels', () => {
      logFilter.configure(['error', 'warn', 'error', 'warn']);

      // Should work correctly despite duplicates
      expect(logFilter.filterLog('error', 'Error message')).toBe(true);
      expect(logFilter.filterLog('warn', 'Warning message')).toBe(true);
      expect(logFilter.filterLog('info', 'Info message')).toBe(false);
    });

    it('should preserve filter configuration for multiple instances', () => {
      const logFilter1 = new LogFilter();
      const logFilter2 = new LogFilter();

      logFilter1.configure(['error']);
      logFilter2.configure(['warn']);

      // Each instance should maintain its own configuration
      expect(logFilter1.filterLog('error', 'Error for filter1')).toBe(true);
      expect(logFilter1.filterLog('warn', 'Warning for filter1')).toBe(false);

      expect(logFilter2.filterLog('error', 'Error for filter2')).toBe(false);
      expect(logFilter2.filterLog('warn', 'Warning for filter2')).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should filter logs efficiently under high volume', () => {
      logFilter.configure(['error', 'warn']);
      const startTime = Date.now();

      // Simulate high-volume filtering
      for (let i = 0; i < 1000; i++) {
        logFilter.filterLog('error', `Error message ${i}`);
        logFilter.filterLog('info', `Info message ${i}`);
        logFilter.filterLog('warn', `Warning message ${i}`);
        logFilter.filterLog('debug', `Debug message ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(100); // 100ms for 4000 filter operations

      console.log(`🔄 Filtered 4000 log entries in ${duration}ms`);
      console.log(`⚡ Filter rate: ${(4000 / duration * 1000).toFixed(1)} operations/sec`);
    });
  });
});