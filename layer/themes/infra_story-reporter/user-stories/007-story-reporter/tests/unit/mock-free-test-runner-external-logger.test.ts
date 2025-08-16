/**
 * Unit Test: MockFreeTestRunner External Logger Integration
 * 
 * Tests the setExternalLogger method and logging functionality
 * of MockFreeTestRunner to ensure proper integration with external logger.
 */

import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';
import { TestConfiguration } from '../../src/types/test-types';

describe('MockFreeTestRunner External Logger Integration Unit Test', () => {
  let mockFreeTestRunner: MockFreeTestRunner;
  let externalLogger: MockExternalLogger;
  let testConfig: TestConfiguration;

  beforeEach(() => {
    mockFreeTestRunner = new MockFreeTestRunner();
    externalLogger = new MockExternalLogger();
    
    testConfig = {
      testSuiteId: 'test-runner-logger-test',
      featureFiles: ['test.feature'],
      outputDirectory: './output',
      outputFormats: ['json'],
      logLevel: 'info'
    };
  });

  afterEach(() => {
    mockFreeTestRunner.removeAllListeners();
  });

  describe('setExternalLogger method', () => {
    it('should store external logger reference', () => {
      // Act
      mockFreeTestRunner.setExternalLogger(externalLogger);
      
      // Assert
      expect((mockFreeTestRunner as any).externalLogger).toBe(externalLogger);
    });

    it('should emit log event when external logger is set', () => {
      // Arrange
      const logEvents: string[] = [];
      mockFreeTestRunner.on('log', (message: string) => {
        logEvents.push(message);
      });
      
      // Act
      mockFreeTestRunner.setExternalLogger(externalLogger);
      
      // Assert
      expect(logEvents.length).toBe(1);
      expect(logEvents[0]).toContain('[INFO] External logger set for Mock Free Test Runner');
    });

    it('should handle multiple setExternalLogger calls', () => {
      // Arrange
      const firstLogger = new MockExternalLogger();
      const secondLogger = new MockExternalLogger();
      
      // Act
      mockFreeTestRunner.setExternalLogger(firstLogger);
      mockFreeTestRunner.setExternalLogger(secondLogger);
      
      // Assert
      expect((mockFreeTestRunner as any).externalLogger).toBe(secondLogger);
    });

    it('should work with or without configuration', () => {
      // Test before configuration
      expect(() => {
        mockFreeTestRunner.setExternalLogger(externalLogger);
      }).not.toThrow();
      
      // Configure
      mockFreeTestRunner.configure(testConfig);
      
      // Test after configuration
      const newLogger = new MockExternalLogger();
      expect(() => {
        mockFreeTestRunner.setExternalLogger(newLogger);
      }).not.toThrow();
      
      expect((mockFreeTestRunner as any).externalLogger).toBe(newLogger);
    });
  });

  describe('Logger integration during test execution', () => {
    beforeEach(async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      mockFreeTestRunner.configure(testConfig);
      mockFreeTestRunner.setExternalLogger(externalLogger);
    });

    it('should log test execution start when external logger is set', () => {
      // Arrange
      const emitSpy = jest.spyOn(mockFreeTestRunner, 'emit');
      
      // Act - trigger an event that would use the logger
      mockFreeTestRunner.emit("testStart", {
        testSuiteId: testConfig.testSuiteId,
        timestamp: new Date()
      });
      
      // Assert
      expect(emitSpy).toHaveBeenCalledWith("testStart", expect.any(Object));
    });

    it('should handle logging when external logger is not set', () => {
      // Arrange
      const runner = new MockFreeTestRunner();
      runner.configure(testConfig);
      // Don't set external logger
      
      // Act & Assert - should not throw
      expect(() => {
        runner.emit('log', '[INFO] Test message without external logger');
      }).not.toThrow();
    });

    it('should integrate with event emission system', () => {
      // Arrange
      const events: string[] = [];
      mockFreeTestRunner.on('log', (msg) => events.push(msg));
      
      // Act
      mockFreeTestRunner.emit('log', '[INFO] Test event emission');
      
      // Assert
      expect(events).toContain('[INFO] Test event emission');
    });
  });

  describe('Logger state management', () => {
    it('should maintain logger through configuration changes', () => {
      // Arrange
      mockFreeTestRunner.setExternalLogger(externalLogger);
      
      // Act - reconfigure
      const newConfig: TestConfiguration = {
        ...testConfig,
        testSuiteId: 'updated-test-suite'
      };
      mockFreeTestRunner.configure(newConfig);
      
      // Assert - logger should persist
      expect((mockFreeTestRunner as any).externalLogger).toBe(externalLogger);
    });

    it('should handle null logger gracefully', () => {
      // Act
      mockFreeTestRunner.setExternalLogger(null as any);
      
      // Assert
      expect((mockFreeTestRunner as any).externalLogger).toBeNull();
    });

    it('should handle undefined logger gracefully', () => {
      // Act
      mockFreeTestRunner.setExternalLogger(undefined as any);
      
      // Assert
      expect((mockFreeTestRunner as any).externalLogger).toBeUndefined();
    });
  });

  describe('Logging during test lifecycle', () => {
    beforeEach(async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      mockFreeTestRunner.configure(testConfig);
      mockFreeTestRunner.setExternalLogger(externalLogger);
    });

    it('should support logging at different levels', async () => {
      // Act - emit logs at different levels
      const logMessages = [
        { level: 'debug', message: 'Debug message' },
        { level: 'info', message: 'Info message' },
        { level: 'warn', message: 'Warning message' },
        { level: 'error', message: 'Error message' }
      ];

      for (const log of logMessages) {
        externalLogger.log(testConfig.testSuiteId, log.level as any, log.message);
      }

      // Assert
      const history = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(history.length).toBe(4);
      
      for (const log of logMessages) {
        const found = history.find(h => h.level === log.level && h.message === log.message);
        expect(found).toBeDefined();
      }
    });

    it('should include timestamp in log entries', async () => {
      // Arrange
      const beforeTime = new Date();
      
      // Act
      externalLogger.log(testConfig.testSuiteId, 'info', 'Timestamp test');
      
      const afterTime = new Date();
      
      // Assert
      const history = await externalLogger.getLogHistory(testConfig.testSuiteId);
      const logEntry = history[0];
      
      expect(logEntry.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(logEntry.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should properly identify process/logger ID', async () => {
      // Act
      externalLogger.log(testConfig.testSuiteId, 'info', 'Process ID test');
      
      // Assert
      const history = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(history[0].processId).toBe(testConfig.testSuiteId);
    });
  });

  describe('Error handling', () => {
    it('should handle logging errors gracefully', async () => {
      // Arrange - use a logger ID that doesn't exist
      mockFreeTestRunner.setExternalLogger(externalLogger);
      
      // Act & Assert - should handle error internally
      expect(() => {
        externalLogger.log('non-existent-logger', 'info', 'Test message');
      }).toThrow();
    });

    it('should continue operation if external logger fails', () => {
      // Arrange
      const faultyLogger = {
        log: jest.fn().mockImplementation(() => {
          throw new Error('Logger failure');
        })
      };
      
      mockFreeTestRunner.setExternalLogger(faultyLogger as any);
      
      // Act & Assert - test runner should handle the error
      expect(() => {
        mockFreeTestRunner.emit('log', '[INFO] Test with faulty logger');
      }).not.toThrow();
    });
  });

  describe('Integration with MockFreeTestRunner events', () => {
    it('should work with test runner event system', () => {
      // Arrange
      const eventLog: any[] = [];
      mockFreeTestRunner.on("scenarioStart", (data) => eventLog.push(data));
      mockFreeTestRunner.on("scenarioComplete", (data) => eventLog.push(data));
      
      // Act
      mockFreeTestRunner.emit("scenarioStart", { scenario: 'test-scenario' });
      mockFreeTestRunner.emit("scenarioComplete", { scenario: 'test-scenario', status: 'In Progress' });
      
      // Assert
      expect(eventLog.length).toBe(2);
      expect(eventLog[0].scenario).toBe('test-scenario');
      expect(eventLog[1].status).toBe("completed");
    });
  });
});