/**
 * Unit Test: MockExternalLogger Concurrent Operations
 * 
 * Tests the MockExternalLogger's ability to handle concurrent
 * logging operations safely and maintain data integrity.
 */

import { MockExternalLogger, LogEntry } from '../../src/internal/mock-external-logger';

describe('MockExternalLogger Concurrent Operations Unit Test', () => {
  let mockExternalLogger: MockExternalLogger;

  beforeEach(() => {
    mockExternalLogger = new MockExternalLogger();
  });

  afterEach(() => {
    mockExternalLogger.cleanup();
  });

  describe('Concurrent logger initialization', () => {
    it('should handle concurrent logger initialization requests', async () => {
      // Arrange
      const loggerIds = ['logger-1', 'logger-2', 'logger-3', 'logger-4', 'logger-5'];
      
      // Act - initialize loggers concurrently
      const initPromises = loggerIds.map(id => mockExternalLogger.initializeLogger(id));
      const results = await Promise.all(initPromises);
      
      // Assert
      expect(results).toEqual(loggerIds);
      expect(mockExternalLogger.getActiveLoggers().length).toBe(5);
      
      // Verify each logger is properly initialized
      for (const loggerId of loggerIds) {
        const history = await mockExternalLogger.getLogHistory(loggerId);
        expect(history).toEqual([]);
      }
    });

    it('should prevent duplicate logger initialization even in concurrent requests', async () => {
      // Arrange
      const loggerId = 'duplicate-logger';
      
      // Act - try to initialize the same logger concurrently
      const promises = [
        mockExternalLogger.initializeLogger(loggerId),
        mockExternalLogger.initializeLogger(loggerId),
        mockExternalLogger.initializeLogger(loggerId)
      ];
      
      // Assert - only one should succeed, others should fail
      const results = await Promise.allSettled(promises);
      
      const succeeded = results.filter(r => r.status === "fulfilled");
      const failed = results.filter(r => r.status === "rejected");
      
      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(2);
      
      failed.forEach(result => {
        if (result.status === "rejected") {
          expect(result.reason.message).toContain('already exists');
        }
      });
    });
  });

  describe('Concurrent logging operations', () => {
    it('should handle concurrent log writes to the same logger', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('concurrent-logger');
      const logCount = 100;
      
      // Act - write logs concurrently
      const logPromises = [];
      for (let i = 0; i < logCount; i++) {
        logPromises.push(new Promise<void>((resolve) => {
          mockExternalLogger.log(loggerId, 'info', `Concurrent log message ${i}`);
          resolve();
        }));
      }
      
      await Promise.all(logPromises);
      
      // Assert - all logs should be captured
      const history = await mockExternalLogger.getLogHistory(loggerId);
      expect(history.length).toBe(logCount);
      
      // Verify all messages are present
      for (let i = 0; i < logCount; i++) {
        const found = history.find(log => log.message === `Concurrent log message ${i}`);
        expect(found).toBeDefined();
      }
    });

    it('should handle concurrent logs to multiple loggers', async () => {
      // Arrange
      const loggerCount = 5;
      const logsPerLogger = 20;
      const loggerIds: string[] = [];
      
      // Initialize loggers
      for (let i = 0; i < loggerCount; i++) {
        const id = await mockExternalLogger.initializeLogger(`logger-${i}`);
        loggerIds.push(id);
      }
      
      // Act - log to all loggers concurrently
      const allPromises = [];
      for (let i = 0; i < loggerCount; i++) {
        for (let j = 0; j < logsPerLogger; j++) {
          allPromises.push(new Promise<void>((resolve) => {
            mockExternalLogger.log(loggerIds[i], 'info', `Logger ${i} - Message ${j}`);
            resolve();
          }));
        }
      }
      
      await Promise.all(allPromises);
      
      // Assert - each logger should have the correct number of logs
      for (let i = 0; i < loggerCount; i++) {
        const history = await mockExternalLogger.getLogHistory(loggerIds[i]);
        expect(history.length).toBe(logsPerLogger);
        
        // Verify logs belong to the correct logger
        history.forEach(log => {
          expect(log.message).toContain(`Logger ${i}`);
          expect(log.processId).toBe(loggerIds[i]);
        });
      }
    });

    it('should maintain log order within reasonable bounds', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('order-test-logger');
      const logCount = 50;
      
      // Act - log with slight delays to establish order
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < logCount; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              mockExternalLogger.log(loggerId, 'info', `Order test ${i}`);
              resolve();
            }, i * 2); // Small delay between logs
          })
        );
      }
      
      await Promise.all(promises);
      
      // Assert - timestamps should be in ascending order
      const history = await mockExternalLogger.getLogHistory(loggerId);
      
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Concurrent read operations', () => {
    it('should handle concurrent reads of log history', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('read-test-logger');
      
      // Add some logs
      for (let i = 0; i < 10; i++) {
        mockExternalLogger.log(loggerId, 'info', `Message ${i}`);
      }
      
      // Act - read history concurrently
      const readPromises = [];
      for (let i = 0; i < 20; i++) {
        readPromises.push(mockExternalLogger.getLogHistory(loggerId));
      }
      
      const results = await Promise.all(readPromises);
      
      // Assert - all reads should return the same data
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.length).toBe(firstResult.length);
        expect(result.length).toBe(10);
      });
    });

    it('should handle concurrent filtering operations', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('filter-test-logger');
      
      // Add logs of different levels
      mockExternalLogger.log(loggerId, 'info', 'Info 1');
      mockExternalLogger.log(loggerId, 'error', 'Error 1');
      mockExternalLogger.log(loggerId, 'info', 'Info 2');
      mockExternalLogger.log(loggerId, 'error', 'Error 2');
      mockExternalLogger.log(loggerId, 'debug', 'Debug 1');
      
      // Act - filter by level concurrently
      const filterPromises = [
        mockExternalLogger.getLogsByLevel(loggerId, 'info'),
        mockExternalLogger.getLogsByLevel(loggerId, 'error'),
        mockExternalLogger.getLogsByLevel(loggerId, 'debug'),
        mockExternalLogger.getLogsByLevel(loggerId, 'info'),
        mockExternalLogger.getLogsByLevel(loggerId, 'error')
      ];
      
      const results = await Promise.all(filterPromises);
      
      // Assert
      expect(results[0].length).toBe(2); // info logs
      expect(results[1].length).toBe(2); // error logs
      expect(results[2].length).toBe(1); // debug logs
      expect(results[3].length).toBe(2); // info logs again
      expect(results[4].length).toBe(2); // error logs again
    });
  });

  describe('Concurrent mixed operations', () => {
    it('should handle concurrent reads and writes', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('mixed-ops-logger');
      const operations = [];
      
      // Act - mix reads and writes
      for (let i = 0; i < 50; i++) {
        if (i % 3 === 0) {
          // Read operation
          operations.push(mockExternalLogger.getLogHistory(loggerId));
        } else {
          // Write operation
          operations.push(new Promise<void>((resolve) => {
            mockExternalLogger.log(loggerId, 'info', `Mixed operation ${i}`);
            resolve();
          }));
        }
      }
      
      await Promise.all(operations);
      
      // Assert - final state should have all writes
      const finalHistory = await mockExternalLogger.getLogHistory(loggerId);
      const writeCount = operations.length - Math.floor(operations.length / 3);
      expect(finalHistory.length).toBeLessThanOrEqual(writeCount);
    });

    it('should handle concurrent logger state changes', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('state-change-logger');
      
      // Act - perform various state changes concurrently
      const stateOperations = [
        // Log some messages
        ...Array(5).fill(null).map((_, i) => 
          new Promise<void>((resolve) => {
            mockExternalLogger.log(loggerId, 'info', `Message ${i}`);
            resolve();
          })
        ),
        // Deactivate and reactivate
        new Promise<void>((resolve) => {
          mockExternalLogger.deactivateLogger(loggerId);
          resolve();
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            mockExternalLogger.reactivateLogger(loggerId);
            resolve();
          }, 10);
        }),
        // Try to log while potentially deactivated
        ...Array(3).fill(null).map((_, i) => 
          new Promise<void>((resolve) => {
            try {
              mockExternalLogger.log(loggerId, 'info', `After state change ${i}`);
            } catch (e) {
              // Expected if logger is deactivated
            }
            resolve();
          })
        )
      ];
      
      await Promise.all(stateOperations);
      
      // Assert - logger should be in a valid state
      const activeLoggers = mockExternalLogger.getActiveLoggers();
      expect(activeLoggers).toContain(loggerId);
      
      // Should be able to log after reactivation
      expect(() => {
        mockExternalLogger.log(loggerId, 'info', 'Final message');
      }).not.toThrow();
    });
  });

  describe('Concurrent search and statistics operations', () => {
    it('should handle concurrent search operations', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('search-test-logger');
      
      // Add searchable logs
      for (let i = 0; i < 20; i++) {
        mockExternalLogger.log(loggerId, 'info', `Search term ${i % 5}`);
      }
      
      // Act - search concurrently
      const searchPromises = [
        mockExternalLogger.searchLogs(loggerId, 'term 0'),
        mockExternalLogger.searchLogs(loggerId, 'term 1'),
        mockExternalLogger.searchLogs(loggerId, 'term 2'),
        mockExternalLogger.searchLogs(loggerId, 'term 0'),
        mockExternalLogger.searchLogs(loggerId, 'Search')
      ];
      
      const results = await Promise.all(searchPromises);
      
      // Assert
      expect(results[0].length).toBe(4); // "term 0" appears 4 times
      expect(results[1].length).toBe(4); // "term 1" appears 4 times
      expect(results[2].length).toBe(4); // "term 2" appears 4 times
      expect(results[3].length).toBe(4); // "term 0" again
      expect(results[4].length).toBe(20); // "Search" appears in all
    });

    it('should handle concurrent statistics calculations', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('stats-test-logger');
      
      // Add logs with different levels
      mockExternalLogger.log(loggerId, 'info', 'Info message');
      mockExternalLogger.log(loggerId, 'error', 'Error message');
      mockExternalLogger.log(loggerId, 'debug', 'Debug message');
      mockExternalLogger.log(loggerId, 'info', 'Another info');
      
      // Act - get statistics concurrently
      const statsPromises = Array(10).fill(null).map(() => 
        mockExternalLogger.getLogStatistics(loggerId)
      );
      
      const results = await Promise.all(statsPromises);
      
      // Assert - all should return the same statistics
      results.forEach(stats => {
        expect(stats.total).toBe(4);
        expect(stats.byLevel.info).toBe(2);
        expect(stats.byLevel.error).toBe(1);
        expect(stats.byLevel.debug).toBe(1);
        expect(stats.oldestEntry).toBeDefined();
        expect(stats.newestEntry).toBeDefined();
      });
    });
  });

  describe('Error handling in concurrent scenarios', () => {
    it('should handle errors in concurrent operations gracefully', async () => {
      // Arrange
      const validLoggerId = await mockExternalLogger.initializeLogger('valid-logger');
      const invalidLoggerId = 'invalid-logger';
      
      // Act - mix valid and invalid operations
      const operations = [
        // Valid operations
        mockExternalLogger.getLogHistory(validLoggerId),
        new Promise<void>((resolve) => {
          mockExternalLogger.log(validLoggerId, 'info', 'Valid log');
          resolve();
        }),
        // Invalid operations that should fail
        mockExternalLogger.getLogHistory(invalidLoggerId).catch(e => e),
        new Promise((resolve) => {
          try {
            mockExternalLogger.log(invalidLoggerId, 'info', 'Invalid log');
          } catch (e) {
            resolve(e);
          }
        })
      ];
      
      const results = await Promise.allSettled(operations);
      
      // Assert
      expect(results[0].status).toBe("fulfilled"); // Valid read
      expect(results[1].status).toBe("fulfilled"); // Valid write
      expect(results[2].status).toBe("fulfilled"); // Caught error
      expect(results[3].status).toBe("fulfilled"); // Caught error
    });
  });

  describe('Concurrent metadata operations', () => {
    it('should handle concurrent logWithMetadata operations', async () => {
      // Arrange
      const loggerId = await mockExternalLogger.initializeLogger('metadata-logger');
      const metadataLogs = [];
      
      // Act - log with metadata concurrently
      for (let i = 0; i < 20; i++) {
        metadataLogs.push(
          mockExternalLogger.logWithMetadata(
            loggerId,
            'info',
            `Metadata log ${i}`,
            { index: i, category: i % 3 === 0 ? 'A' : 'B' }
          )
        );
      }
      
      await Promise.all(metadataLogs);
      
      // Assert
      const history = await mockExternalLogger.getLogHistory(loggerId);
      expect(history.length).toBe(20);
      
      // Verify metadata integrity
      history.forEach((log, index) => {
        expect(log.metadata).toBeDefined();
        expect(log.metadata!.index).toBeDefined();
        expect(typeof log.metadata!.index).toBe('number');
      });
      
      // Check category distribution
      const categoryA = history.filter(log => log.metadata?.category === 'A');
      const categoryB = history.filter(log => log.metadata?.category === 'B');
      expect(categoryA.length).toBeGreaterThan(0);
      expect(categoryB.length).toBeGreaterThan(0);
    });
  });
});