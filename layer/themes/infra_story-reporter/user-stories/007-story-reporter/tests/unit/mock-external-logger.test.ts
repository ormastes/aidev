import { MockExternalLogger, LogEntry } from '../../src/internal/mock-external-logger';

describe('MockExternalLogger Unit Test', () => {
  let mockLogger: MockExternalLogger;

  beforeEach(() => {
    mockLogger = new MockExternalLogger();
  });

  afterEach(() => {
    mockLogger.cleanup();
  });

  describe('Logger Initialization', () => {
    it('should initialize a new logger with unique ID', async () => {
      const loggerId = await mockLogger.initializeLogger('test-logger-001');
      expect(loggerId).toBe('test-logger-001');
      
      const activeLoggers = mockLogger.getActiveLoggers();
      expect(activeLoggers).toContain('test-logger-001');
    });

    it('should throw error when initializing duplicate logger', async () => {
      await mockLogger.initializeLogger('duplicate-logger');
      
      await expect(mockLogger.initializeLogger('duplicate-logger'))
        .rejects.toThrow('Logger duplicate-logger already exists');
    });

    it('should initialize report logger with report prefix', async () => {
      const reportId = await mockLogger.initializeReportLogger('report-001');
      expect(reportId).toBe('report-report-001');
      
      const activeLoggers = mockLogger.getActiveLoggers();
      expect(activeLoggers).toContain('report-report-001');
    });
  });

  describe('Logging Operations', () => {
    it('should log messages with correct structure', async () => {
      const loggerId = await mockLogger.initializeLogger('log-test');
      
      mockLogger.log(loggerId, 'info', 'Test message');
      
      const logs = await mockLogger.getLogHistory(loggerId);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'info',
        message: 'Test message',
        processId: loggerId
      });
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should maintain chronological order of logs', async () => {
      const loggerId = await mockLogger.initializeLogger('order-test');
      
      mockLogger.log(loggerId, 'info', 'First message');
      await new Promise(resolve => setTimeout(resolve, 10));
      mockLogger.log(loggerId, 'debug', 'Second message');
      await new Promise(resolve => setTimeout(resolve, 10));
      mockLogger.log(loggerId, 'error', 'Third message');
      
      const logs = await mockLogger.getLogHistory(loggerId);
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('First message');
      expect(logs[1].message).toBe('Second message');
      expect(logs[2].message).toBe('Third message');
      
      // Verify timestamps are in order
      expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(logs[1].timestamp.getTime());
      expect(logs[1].timestamp.getTime()).toBeLessThanOrEqual(logs[2].timestamp.getTime());
    });

    it('should throw error when logging to non-existent logger', () => {
      expect(() => mockLogger.log('non-existent', 'info', 'Test'))
        .toThrow('Logger non-existent not found');
    });

    it('should throw error when logging to inactive logger', async () => {
      const loggerId = await mockLogger.initializeLogger('inactive-test');
      mockLogger.deactivateLogger(loggerId);
      
      expect(() => mockLogger.log(loggerId, 'info', 'Test'))
        .toThrow('Logger inactive-test is not active');
    });

    it('should handle all log levels correctly', async () => {
      const loggerId = await mockLogger.initializeLogger('levels-test');
      const levels: LogEntry['level'][] = ['trace', 'debug', 'info', 'warn', 'error'];
      
      levels.forEach(level => {
        mockLogger.log(loggerId, level, `${level} message`);
      });
      
      const logs = await mockLogger.getLogHistory(loggerId);
      expect(logs).toHaveLength(5);
      
      levels.forEach((level, index) => {
        expect(logs[index].level).toBe(level);
        expect(logs[index].message).toBe(`${level} message`);
      });
    });
  });

  describe('Log Retrieval', () => {
    it('should filter logs by level', async () => {
      const loggerId = await mockLogger.initializeLogger('filter-test');
      
      mockLogger.log(loggerId, 'info', 'Info 1');
      mockLogger.log(loggerId, 'error', 'Error 1');
      mockLogger.log(loggerId, 'info', 'Info 2');
      mockLogger.log(loggerId, 'error', 'Error 2');
      mockLogger.log(loggerId, 'debug', 'Debug 1');
      
      const errorLogs = await mockLogger.getLogsByLevel(loggerId, 'error');
      expect(errorLogs).toHaveLength(2);
      expect(errorLogs[0].message).toBe('Error 1');
      expect(errorLogs[1].message).toBe('Error 2');
      
      const infoLogs = await mockLogger.getLogsByLevel(loggerId, 'info');
      expect(infoLogs).toHaveLength(2);
      expect(infoLogs[0].message).toBe('Info 1');
      expect(infoLogs[1].message).toBe('Info 2');
    });

    it('should search logs by message content', async () => {
      const loggerId = await mockLogger.initializeLogger('search-test');
      
      mockLogger.log(loggerId, 'info', 'Starting process');
      mockLogger.log(loggerId, 'info', 'Process running');
      mockLogger.log(loggerId, 'error', 'Process failed');
      mockLogger.log(loggerId, 'info', 'Restarting process');
      
      const processLogs = await mockLogger.searchLogs(loggerId, 'process');
      expect(processLogs).toHaveLength(2);
      
      const ProcessLogs = await mockLogger.searchLogs(loggerId, 'Process');
      expect(ProcessLogs).toHaveLength(2);
      
      const failedLogs = await mockLogger.searchLogs(loggerId, 'failed');
      expect(failedLogs).toHaveLength(1);
      expect(failedLogs[0].level).toBe('error');
    });

    it('should provide accurate log statistics', async () => {
      const loggerId = await mockLogger.initializeLogger('stats-test');
      
      mockLogger.log(loggerId, 'info', 'Info 1');
      mockLogger.log(loggerId, 'info', 'Info 2');
      mockLogger.log(loggerId, 'error', 'Error 1');
      mockLogger.log(loggerId, 'warn', 'Warning 1');
      mockLogger.log(loggerId, 'debug', 'Debug 1');
      mockLogger.log(loggerId, 'debug', 'Debug 2');
      mockLogger.log(loggerId, 'debug', 'Debug 3');
      
      const stats = await mockLogger.getLogStatistics(loggerId);
      
      expect(stats.total).toBe(7);
      expect(stats.byLevel).toEqual({
        trace: 0,
        debug: 3,
        info: 2,
        warn: 1,
        error: 1
      });
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      expect(stats.oldestEntry!.getTime()).toBeLessThanOrEqual(stats.newestEntry!.getTime());
    });

    it('should return empty statistics for logger with no logs', async () => {
      const loggerId = await mockLogger.initializeLogger('empty-stats');
      
      const stats = await mockLogger.getLogStatistics(loggerId);
      
      expect(stats.total).toBe(0);
      expect(stats.byLevel).toEqual({
        trace: 0,
        debug: 0,
        info: 0,
        warn: 0,
        error: 0
      });
      expect(stats.oldestEntry).toBeUndefined();
      expect(stats.newestEntry).toBeUndefined();
    });
  });

  describe('Logger Management', () => {
    it('should clear logs for specific logger', async () => {
      const loggerId = await mockLogger.initializeLogger('clear-test');
      
      mockLogger.log(loggerId, 'info', 'Message 1');
      mockLogger.log(loggerId, 'info', 'Message 2');
      
      let logs = await mockLogger.getLogHistory(loggerId);
      expect(logs).toHaveLength(2);
      
      mockLogger.clearLogs(loggerId);
      
      logs = await mockLogger.getLogHistory(loggerId);
      expect(logs).toHaveLength(0);
    });

    it('should deactivate and reactivate logger', async () => {
      const loggerId = await mockLogger.initializeLogger('active-test');
      
      // Logger should be active initially
      expect(mockLogger.getActiveLoggers()).toContain(loggerId);
      
      // Log should work
      mockLogger.log(loggerId, 'info', 'Active log');
      
      // Deactivate logger
      mockLogger.deactivateLogger(loggerId);
      expect(mockLogger.getActiveLoggers()).not.toContain(loggerId);
      
      // Log should fail
      expect(() => mockLogger.log(loggerId, 'info', 'Inactive log'))
        .toThrow('Logger active-test is not active');
      
      // Reactivate logger
      mockLogger.reactivateLogger(loggerId);
      expect(mockLogger.getActiveLoggers()).toContain(loggerId);
      
      // Log should work again
      mockLogger.log(loggerId, 'info', 'Reactivated log');
      
      const logs = await mockLogger.getLogHistory(loggerId);
      expect(logs).toHaveLength(2); // Only active logs
      expect(logs[0].message).toBe('Active log');
      expect(logs[1].message).toBe('Reactivated log');
    });

    it('should cleanup all loggers', async () => {
      await mockLogger.initializeLogger('cleanup-1');
      await mockLogger.initializeLogger('cleanup-2');
      await mockLogger.initializeLogger('cleanup-3');
      
      expect(mockLogger.getActiveLoggers()).toHaveLength(3);
      
      mockLogger.cleanup();
      
      expect(mockLogger.getActiveLoggers()).toHaveLength(0);
      
      // Should be able to create new loggers after cleanup
      await mockLogger.initializeLogger('after-cleanup');
      expect(mockLogger.getActiveLoggers()).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw appropriate errors for invalid operations', async () => {
      // Operations on non-existent logger
      await expect(mockLogger.getLogHistory('non-existent'))
        .rejects.toThrow('Logger non-existent not found');
      
      await expect(mockLogger.getLogsByLevel('non-existent', 'info'))
        .rejects.toThrow('Logger non-existent not found');
      
      await expect(mockLogger.searchLogs('non-existent', 'test'))
        .rejects.toThrow('Logger non-existent not found');
      
      expect(() => mockLogger.clearLogs('non-existent'))
        .toThrow('Logger non-existent not found');
      
      expect(() => mockLogger.deactivateLogger('non-existent'))
        .toThrow('Logger non-existent not found');
      
      expect(() => mockLogger.reactivateLogger('non-existent'))
        .toThrow('Logger non-existent not found');
    });
  });

  describe('Integration Testing Support', () => {
    it('should support multiple concurrent loggers', async () => {
      const logger1 = await mockLogger.initializeLogger('concurrent-1');
      const logger2 = await mockLogger.initializeLogger('concurrent-2');
      const logger3 = await mockLogger.initializeLogger('concurrent-3');
      
      // Log to different loggers
      mockLogger.log(logger1, 'info', 'Logger 1 message');
      mockLogger.log(logger2, 'error', 'Logger 2 message');
      mockLogger.log(logger3, 'debug', 'Logger 3 message');
      mockLogger.log(logger1, 'warn', 'Logger 1 warning');
      
      // Verify isolation
      const logs1 = await mockLogger.getLogHistory(logger1);
      const logs2 = await mockLogger.getLogHistory(logger2);
      const logs3 = await mockLogger.getLogHistory(logger3);
      
      expect(logs1).toHaveLength(2);
      expect(logs2).toHaveLength(1);
      expect(logs3).toHaveLength(1);
      
      expect(logs1[0].message).toBe('Logger 1 message');
      expect(logs1[1].message).toBe('Logger 1 warning');
      expect(logs2[0].message).toBe('Logger 2 message');
      expect(logs3[0].message).toBe('Logger 3 message');
    });

    it('should maintain logger state across operations', async () => {
      const loggerId = await mockLogger.initializeLogger('state-test');
      
      // Add logs
      mockLogger.log(loggerId, 'info', 'Message 1');
      mockLogger.log(loggerId, 'info', 'Message 2');
      
      // Clear logs
      mockLogger.clearLogs(loggerId);
      
      // Add new logs
      mockLogger.log(loggerId, 'info', 'Message 3');
      
      // Deactivate and reactivate
      mockLogger.deactivateLogger(loggerId);
      mockLogger.reactivateLogger(loggerId);
      
      // Add final log
      mockLogger.log(loggerId, 'info', 'Message 4');
      
      const logs = await mockLogger.getLogHistory(loggerId);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Message 3');
      expect(logs[1].message).toBe('Message 4');
    });
  });
});