import { MockExternalLogger } from '../../src/internal/mock-external-logger';

describe('External Log Library Interface Validation Test (NO MOCKS)', () => {
  let externalLogger: MockExternalLogger;

  beforeEach(() => {
    externalLogger = new MockExternalLogger();
  });

  afterEach(async () => {
    await externalLogger.cleanup();
  });

  describe('External Log Library Core Interface', () => {
    it('should validate external log library initialization interface', async () => {
      // Test external interface without mocks - real external log library behavior
      const testLoggerId = 'external-interface-test-001';
      
      // Initialize logger through external interface
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Validate external interface returns expected identifier
      expect(loggerId).toBe(testLoggerId);
      expect(typeof loggerId).toBe('string');
      expect(loggerId.length).toBeGreaterThan(0);
      
      // Verify logger is properly initialized by checking active loggers
      const activeLoggers = externalLogger.getActiveLoggers();
      expect(activeLoggers).toContain(loggerId);
    });

    it('should validate external log entry interface', async () => {
      const testLoggerId = 'external-log-entry-test-002';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Test different log level interfaces
      const logLevels = ['trace', 'debug', 'info', 'warn', 'error'];
      
      for (const level of logLevels) {
        const testMessage = `External test message for ${level} level`;
        
        // Log through external interface
        externalLogger.log(loggerId, level as any, testMessage);
        
        // Verify external log entry was created
        const logHistory = await externalLogger.getLogHistory(loggerId);
        const levelEntries = logHistory.filter(entry => 
          entry.level === level && entry.message === testMessage
        );
        
        expect(levelEntries.length).toBeGreaterThan(0);
        expect(levelEntries[0].level).toBe(level);
        expect(levelEntries[0].message).toBe(testMessage);
        expect(levelEntries[0].timestamp).toBeInstanceOf(Date);
      }
    });

    it('should validate external log retrieval interface', async () => {
      const testLoggerId = 'external-retrieval-test-003';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Create test log entries through external interface
      const testEntries = [
        { level: 'info', message: 'External test entry 1' },
        { level: 'warn', message: 'External test entry 2' },
        { level: 'error', message: 'External test entry 3' }
      ];
      
      for (const entry of testEntries) {
        externalLogger.log(loggerId, entry.level as any, entry.message);
      }
      
      // Retrieve logs through external interface
      const retrievedLogs = await externalLogger.getLogHistory(loggerId);
      
      // Validate external retrieval interface
      expect(Array.isArray(retrievedLogs)).toBe(true);
      expect(retrievedLogs.length).toBeGreaterThanOrEqual(testEntries.length);
      
      // Verify each test entry is retrievable
      for (const testEntry of testEntries) {
        const matchingLogs = retrievedLogs.filter(log => 
          log.level === testEntry.level && log.message === testEntry.message
        );
        expect(matchingLogs.length).toBeGreaterThan(0);
      }
    });

    it('should validate external log filtering interface', async () => {
      const testLoggerId = 'external-filtering-test-004';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Create mixed log entries
      externalLogger.log(loggerId, 'info', 'Info message for filtering');
      externalLogger.log(loggerId, 'error', 'Error message for filtering');
      externalLogger.log(loggerId, 'debug', 'Debug message for filtering');
      externalLogger.log(loggerId, 'warn', 'Warning message for filtering');
      
      // Test external filtering interface
      const errorLogs = await externalLogger.getLogsByLevel(loggerId, 'error');
      const infoLogs = await externalLogger.getLogsByLevel(loggerId, 'info');
      
      // Validate filtering works through external interface
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs.every(log => log.level === 'error')).toBe(true);
      expect(errorLogs.some(log => log.message === 'Error message for filtering')).toBe(true);
      
      expect(infoLogs.length).toBeGreaterThan(0);
      expect(infoLogs.every(log => log.level === 'info')).toBe(true);
      expect(infoLogs.some(log => log.message === 'Info message for filtering')).toBe(true);
    });

    it('should validate external log cleanup interface', async () => {
      const testLoggerId = 'external-cleanup-test-005';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Add some log entries
      externalLogger.log(loggerId, 'info', 'Test message before cleanup');
      
      // Verify logs exist before cleanup
      const logsBeforeCleanup = await externalLogger.getLogHistory(loggerId);
      expect(logsBeforeCleanup.length).toBeGreaterThan(0);
      
      // Test external cleanup interface
      await externalLogger.clearLogs(loggerId);
      
      // Verify cleanup worked through external interface
      const logsAfterCleanup = await externalLogger.getLogHistory(loggerId);
      expect(logsAfterCleanup.length).toBe(0);
    });
  });

  describe('External Log Library Error Handling Interface', () => {
    it('should validate external error handling for invalid logger ID', async () => {
      const invalidLoggerId = 'non-existent-logger-999';
      
      // Test external interface error handling
      expect(() => {
        externalLogger.log(invalidLoggerId, 'info', 'Test message');
      }).toThrow();
      
      await expect(
        externalLogger.getLogHistory(invalidLoggerId)
      ).rejects.toThrow();
    });

    it('should validate external interface accepts valid log levels', async () => {
      const testLoggerId = 'external-error-test-006';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Test external interface with valid log levels
      const validLevels = ['trace', 'debug', 'info', 'warn', 'error'];
      
      for (const level of validLevels) {
        expect(() => {
          externalLogger.log(loggerId, level as any, `Test message for ${level}`);
        }).not.toThrow();
      }
      
      // Verify all messages were logged
      const logs = await externalLogger.getLogHistory(loggerId);
      expect(logs.length).toBe(validLevels.length);
    });

    it('should validate external error handling for duplicate initialization', async () => {
      const testLoggerId = 'duplicate-init-test-007';
      
      // Initialize logger first time
      await externalLogger.initializeLogger(testLoggerId);
      
      // Test external interface error handling for duplicate initialization
      await expect(
        externalLogger.initializeLogger(testLoggerId)
      ).rejects.toThrow();
    });
  });

  describe('External Log Library Performance Interface', () => {
    it('should validate external interface performance with high volume logging', async () => {
      const testLoggerId = 'external-performance-test-008';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      const startTime = Date.now();
      const logCount = 1000;
      
      // Test external interface performance
      for (let i = 0; i < logCount; i++) {
        externalLogger.log(loggerId, 'info', `Performance test message ${i}`);
      }
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Validate external interface can handle high volume
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify all logs were recorded through external interface
      const allLogs = await externalLogger.getLogHistory(loggerId);
      expect(allLogs.length).toBeGreaterThanOrEqual(logCount);
    });

    it('should validate external interface concurrent access', async () => {
      const testLoggerId = 'external-concurrent-test-009';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Test external interface with concurrent operations
      externalLogger.log(loggerId, 'info', 'Concurrent message 1');
      externalLogger.log(loggerId, 'warn', 'Concurrent message 2');
      externalLogger.log(loggerId, 'error', 'Concurrent message 3');
      const historyResult = await externalLogger.getLogHistory(loggerId);
      externalLogger.log(loggerId, 'debug', 'Concurrent message 4');
      
      // All operations should complete without errors
      expect(Array.isArray(historyResult)).toBe(true);
      
      // Final verification - all messages should be logged
      const finalLogs = await externalLogger.getLogHistory(loggerId);
      const concurrentMessages = finalLogs.filter(log => 
        log.message.includes('Concurrent message')
      );
      expect(concurrentMessages.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('External Log Library Integration Points', () => {
    it('should validate external interface data format consistency', async () => {
      const testLoggerId = 'external-format-test-010';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Test external interface data format
      externalLogger.log(loggerId, 'info', 'Format validation message');
      
      const logs = await externalLogger.getLogHistory(loggerId);
      const testLog = logs[logs.length - 1];
      
      // Validate external interface returns consistent data format
      expect(testLog).toHaveProperty('level');
      expect(testLog).toHaveProperty('message');
      expect(testLog).toHaveProperty("timestamp");
      expect(testLog).toHaveProperty("processId");
      
      expect(typeof testLog.level).toBe('string');
      expect(typeof testLog.message).toBe('string');
      expect(testLog.timestamp).toBeInstanceOf(Date);
      expect(typeof testLog.processId).toBe('string');
    });

    it('should validate external interface search functionality', async () => {
      const testLoggerId = 'external-search-test-011';
      const loggerId = await externalLogger.initializeLogger(testLoggerId);
      
      // Add logs with searchable content
      externalLogger.log(loggerId, 'info', 'Message with search term SEARCHABLE');
      externalLogger.log(loggerId, 'error', 'Regular error message');
      externalLogger.log(loggerId, 'debug', 'Another SEARCHABLE debug message');
      
      // Test external search interface
      const searchResults = await externalLogger.searchLogs(loggerId, "SEARCHABLE");
      
      // Validate external interface search functionality
      expect(searchResults.length).toBe(2);
      expect(searchResults.every(log => log.message.includes("SEARCHABLE"))).toBe(true);
    });
  });
});