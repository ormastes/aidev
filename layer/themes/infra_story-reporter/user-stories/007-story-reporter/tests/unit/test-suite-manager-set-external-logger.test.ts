/**
 * Unit Test: TestSuiteManager setExternalLogger
 * 
 * Tests the setExternalLogger method of TestSuiteManager to ensure
 * proper logger storage and forwarding to child components.
 */

import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';

describe('TestSuiteManager setExternalLogger Unit Test', () => {
  let testSuiteManager: TestSuiteManager;
  let mockExternalLogger: MockExternalLogger;
  
  beforeEach(() => {
    testSuiteManager = new TestSuiteManager();
    mockExternalLogger = new MockExternalLogger();
  });

  afterEach(() => {
    testSuiteManager.removeAllListeners();
  });

  describe('setExternalLogger method', () => {
    it('should store external logger reference', () => {
      // Act
      testSuiteManager.setExternalLogger(mockExternalLogger);
      
      // Assert - check internal state
      expect((testSuiteManager as any).externalLogger).toBe(mockExternalLogger);
    });

    it('should forward external logger to MockFreeTestRunner', () => {
      // Arrange
      const mockFreeTestRunnerSpy = jest.fn();
      (testSuiteManager as any).mockFreeTestRunner.setExternalLogger = mockFreeTestRunnerSpy;
      
      // Act
      testSuiteManager.setExternalLogger(mockExternalLogger);
      
      // Assert
      expect(mockFreeTestRunnerSpy).toHaveBeenCalledTimes(1);
      expect(mockFreeTestRunnerSpy).toHaveBeenCalledWith(mockExternalLogger);
    });

    it('should forward external logger to ReportGenerator', () => {
      // Arrange
      const reportGeneratorSpy = jest.fn();
      (testSuiteManager as any).reportGenerator.setExternalLogger = reportGeneratorSpy;
      
      // Act
      testSuiteManager.setExternalLogger(mockExternalLogger);
      
      // Assert
      expect(reportGeneratorSpy).toHaveBeenCalledTimes(1);
      expect(reportGeneratorSpy).toHaveBeenCalledWith(mockExternalLogger);
    });

    it('should emit log event when external logger is set', () => {
      // Arrange
      const logEvents: string[] = [];
      testSuiteManager.on('log', (message: string) => {
        logEvents.push(message);
      });
      
      // Act
      testSuiteManager.setExternalLogger(mockExternalLogger);
      
      // Assert
      expect(logEvents.length).toBe(1);
      expect(logEvents[0]).toContain('[INFO] External logger set for test suite manager');
    });

    it('should handle multiple setExternalLogger calls', () => {
      // Arrange
      const firstLogger = new MockExternalLogger();
      const secondLogger = new MockExternalLogger();
      
      // Act
      testSuiteManager.setExternalLogger(firstLogger);
      testSuiteManager.setExternalLogger(secondLogger);
      
      // Assert - should use the most recent logger
      expect((testSuiteManager as any).externalLogger).toBe(secondLogger);
    });

    it('should work correctly when child components are mocked', () => {
      // Arrange
      const mockFreeTestRunner = {
        setExternalLogger: jest.fn()
      };
      const reportGenerator = {
        setExternalLogger: jest.fn()
      };
      
      (testSuiteManager as any).mockFreeTestRunner = mockFreeTestRunner;
      (testSuiteManager as any).reportGenerator = reportGenerator;
      
      // Act
      testSuiteManager.setExternalLogger(mockExternalLogger);
      
      // Assert
      expect(mockFreeTestRunner.setExternalLogger).toHaveBeenCalledWith(mockExternalLogger);
      expect(reportGenerator.setExternalLogger).toHaveBeenCalledWith(mockExternalLogger);
    });

    it('should not throw error if logger methods are undefined', () => {
      // Arrange - remove setExternalLogger methods
      delete (testSuiteManager as any).mockFreeTestRunner.setExternalLogger;
      delete (testSuiteManager as any).reportGenerator.setExternalLogger;
      
      // Act & Assert - should not throw
      expect(() => {
        testSuiteManager.setExternalLogger(mockExternalLogger);
      }).not.toThrow();
    });
  });

  describe('Event emission', () => {
    it('should use EventEmitter properly for log events', () => {
      // Arrange
      const emitSpy = jest.spyOn(testSuiteManager, 'emit');
      
      // Act
      testSuiteManager.setExternalLogger(mockExternalLogger);
      
      // Assert
      expect(emitSpy).toHaveBeenCalledWith('log', expect.stringContaining('External logger set'));
    });

    it('should not interfere with other event listeners', () => {
      // Arrange
      const logListener = jest.fn();
      const otherListener = jest.fn();
      
      testSuiteManager.on('log', logListener);
      testSuiteManager.on('progress', otherListener);
      
      // Act
      testSuiteManager.setExternalLogger(mockExternalLogger);
      
      // Assert
      expect(logListener).toHaveBeenCalledTimes(1);
      expect(otherListener).not.toHaveBeenCalled();
    });
  });

  describe('Logger type validation', () => {
    it('should accept MockExternalLogger instance', () => {
      // Act & Assert - should not throw
      expect(() => {
        testSuiteManager.setExternalLogger(mockExternalLogger);
      }).not.toThrow();
    });

    it('should handle null logger gracefully', () => {
      // Act
      testSuiteManager.setExternalLogger(null as any);
      
      // Assert
      expect((testSuiteManager as any).externalLogger).toBeNull();
    });

    it('should handle undefined logger gracefully', () => {
      // Act
      testSuiteManager.setExternalLogger(undefined as any);
      
      // Assert
      expect((testSuiteManager as any).externalLogger).toBeUndefined();
    });
  });

  describe('Integration with TestSuiteManager state', () => {
    it('should work before configuration', () => {
      // Act & Assert - should not throw
      expect(() => {
        testSuiteManager.setExternalLogger(mockExternalLogger);
      }).not.toThrow();
    });

    it('should work after configuration', () => {
      // Arrange
      const testConfig = {
        testSuiteId: 'test-suite',
        featureFiles: ['test.feature'],
        outputDirectory: './output',
        outputFormats: ['json']
      };
      
      testSuiteManager.configure(testConfig);
      
      // Act & Assert - should not throw
      expect(() => {
        testSuiteManager.setExternalLogger(mockExternalLogger);
      }).not.toThrow();
    });

    it('should persist logger through multiple operations', () => {
      // Arrange
      testSuiteManager.setExternalLogger(mockExternalLogger);
      
      // Act - perform other operations
      testSuiteManager.configure({
        testSuiteId: 'test',
        featureFiles: ['test.feature'],
        outputDirectory: './output',
        outputFormats: ['json']
      });
      
      // Assert - logger should still be set
      expect((testSuiteManager as any).externalLogger).toBe(mockExternalLogger);
    });
  });
});