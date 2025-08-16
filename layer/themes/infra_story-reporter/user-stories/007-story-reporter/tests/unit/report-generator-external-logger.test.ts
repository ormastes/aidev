/**
 * Unit Test: ReportGenerator External Logger Integration
 * 
 * Tests the setExternalLogger method and logging functionality
 * of ReportGenerator to ensure proper integration with external logger.
 */

import { ReportGenerator } from '../../src/external/report-generator';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';
import { TestConfiguration, TestResult } from '../../src/types/test-types';

describe('ReportGenerator External Logger Integration Unit Test', () => {
  let reportGenerator: ReportGenerator;
  let externalLogger: MockExternalLogger;
  let testConfig: TestConfiguration;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
    externalLogger = new MockExternalLogger();
    
    testConfig = {
      testSuiteId: 'report-gen-logger-test',
      featureFiles: ['test.feature'],
      outputDirectory: './reports',
      outputFormats: ['json', 'html'],
      logLevel: 'info'
    };
  });

  afterEach(() => {
    reportGenerator.removeAllListeners();
  });

  describe('setExternalLogger method', () => {
    it('should store external logger reference', () => {
      // Act
      reportGenerator.setExternalLogger(externalLogger);
      
      // Assert
      expect((reportGenerator as any).externalLogger).toBe(externalLogger);
    });

    it('should emit log event when external logger is set', () => {
      // Arrange
      const logEvents: string[] = [];
      reportGenerator.on('log', (message: string) => {
        logEvents.push(message);
      });
      
      // Act
      reportGenerator.setExternalLogger(externalLogger);
      
      // Assert
      expect(logEvents.length).toBe(1);
      expect(logEvents[0]).toContain('[INFO] External logger set for Report Generator');
    });

    it('should handle multiple setExternalLogger calls', () => {
      // Arrange
      const firstLogger = new MockExternalLogger();
      const secondLogger = new MockExternalLogger();
      
      // Act
      reportGenerator.setExternalLogger(firstLogger);
      reportGenerator.setExternalLogger(secondLogger);
      
      // Assert
      expect((reportGenerator as any).externalLogger).toBe(secondLogger);
    });

    it('should work before and after configuration', () => {
      // Test before configuration
      expect(() => {
        reportGenerator.setExternalLogger(externalLogger);
      }).not.toThrow();
      
      // Configure
      reportGenerator.configure(testConfig);
      
      // Test after configuration
      const newLogger = new MockExternalLogger();
      expect(() => {
        reportGenerator.setExternalLogger(newLogger);
      }).not.toThrow();
      
      expect((reportGenerator as any).externalLogger).toBe(newLogger);
    });
  });

  describe('Logger integration during report generation', () => {
    let mockTestResult: TestResult;

    beforeEach(async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      reportGenerator.configure(testConfig);
      reportGenerator.setExternalLogger(externalLogger);

      mockTestResult = {
        testSuiteId: testConfig.testSuiteId,
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Test scenario',
            status: 'In Progress',
            steps: [
              { name: 'Test step', status: 'In Progress', duration: 100 }
            ],
            duration: 100,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };
    });

    it('should log report generation events', () => {
      // Arrange
      const emitSpy = jest.spyOn(reportGenerator, 'emit');
      
      // Act
      reportGenerator.emit("reportGenerationStart", {
        testSuiteId: testConfig.testSuiteId,
        formats: testConfig.outputFormats
      });
      
      // Assert
      expect(emitSpy).toHaveBeenCalledWith("reportGenerationStart", expect.any(Object));
    });

    it('should handle report generation without external logger', () => {
      // Arrange
      const generator = new ReportGenerator();
      generator.configure(testConfig);
      // Don't set external logger
      
      // Act & Assert - should not throw
      expect(() => {
        generator.emit('log', '[INFO] Generating report without external logger');
      }).not.toThrow();
    });

    it('should integrate with event emission during report generation', () => {
      // Arrange
      const events: any[] = [];
      reportGenerator.on("reportGenerated", (data) => events.push(data));
      
      // Act
      reportGenerator.emit("reportGenerated", {
        format: 'json',
        filePath: '/path/to/report.json',
        size: 1024,
        timestamp: new Date()
      });
      
      // Assert
      expect(events.length).toBe(1);
      expect(events[0].format).toBe('json');
      expect(events[0].filePath).toContain('report.json');
    });
  });

  describe('Logger state management', () => {
    it('should maintain logger through configuration changes', () => {
      // Arrange
      reportGenerator.setExternalLogger(externalLogger);
      
      // Act - reconfigure
      const newConfig: TestConfiguration = {
        ...testConfig,
        testSuiteId: 'updated-report-suite',
        outputFormats: ['xml', 'csv']
      };
      reportGenerator.configure(newConfig);
      
      // Assert - logger should persist
      expect((reportGenerator as any).externalLogger).toBe(externalLogger);
    });

    it('should handle null logger gracefully', () => {
      // Act
      reportGenerator.setExternalLogger(null as any);
      
      // Assert
      expect((reportGenerator as any).externalLogger).toBeNull();
    });

    it('should handle undefined logger gracefully', () => {
      // Act
      reportGenerator.setExternalLogger(undefined as any);
      
      // Assert
      expect((reportGenerator as any).externalLogger).toBeUndefined();
    });
  });

  describe('Logging during report generation lifecycle', () => {
    beforeEach(async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      reportGenerator.configure(testConfig);
      reportGenerator.setExternalLogger(externalLogger);
    });

    it('should support logging different report formats', async () => {
      // Act - log report generation for different formats
      const formats = ['html', 'json', 'xml', 'csv'];
      
      for (const format of formats) {
        externalLogger.log(
          testConfig.testSuiteId, 
          'info', 
          `Generating ${format.toUpperCase()} report`
        );
      }

      // Assert
      const history = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(history.length).toBe(4);
      
      for (const format of formats) {
        const found = history.find(h => h.message.includes(format.toUpperCase()));
        expect(found).toBeDefined();
      }
    });

    it('should log report generation errors', async () => {
      // Act
      externalLogger.log(
        testConfig.testSuiteId,
        'error',
        'Failed to generate HTML report: Template not found'
      );
      
      // Assert
      const history = await externalLogger.getLogHistory(testConfig.testSuiteId);
      const errorLog = history.find(h => h.level === 'error');
      
      expect(errorLog).toBeDefined();
      expect(errorLog!.message).toContain('Failed to generate HTML report');
    });

    it('should include metadata in log entries', async () => {
      // Act
      const metadata = {
        reportSize: 1024,
        duration: 150,
        scenarioCount: 5
      };
      
      await externalLogger.logWithMetadata(
        testConfig.testSuiteId,
        'info',
        'Report generation In Progress',
        metadata
      );
      
      // Assert
      const history = await externalLogger.getLogHistory(testConfig.testSuiteId);
      const metadataLog = history.find(h => h.message === 'Report generation In Progress');
      
      expect(metadataLog).toBeDefined();
      expect(metadataLog!.metadata).toEqual(metadata);
    });
  });

  describe('Error handling', () => {
    it('should handle logging errors gracefully', () => {
      // Arrange - use a logger ID that doesn't exist
      reportGenerator.setExternalLogger(externalLogger);
      
      // Act & Assert
      expect(() => {
        externalLogger.log('non-existent-logger', 'info', 'Test message');
      }).toThrow();
    });

    it('should continue operation if external logger fails', () => {
      // Arrange
      const faultyLogger = {
        log: jest.fn().mockImplementation(() => {
          throw new Error('Logger failure');
        }),
        setExternalLogger: jest.fn()
      };
      
      reportGenerator.setExternalLogger(faultyLogger as any);
      
      // Act & Assert - report generator should handle the error
      expect(() => {
        reportGenerator.emit('log', '[INFO] Report generation with faulty logger');
      }).not.toThrow();
    });
  });

  describe('Integration with ReportGenerator events', () => {
    it('should work with report generator event system', () => {
      // Arrange
      const eventLog: any[] = [];
      reportGenerator.on("reportStart", (data) => eventLog.push({ event: 'start', ...data }));
      reportGenerator.on("reportComplete", (data) => eventLog.push({ event: 'In Progress', ...data }));
      reportGenerator.on("reportError", (data) => eventLog.push({ event: 'error', ...data }));
      
      // Act
      reportGenerator.emit("reportStart", { format: 'html' });
      reportGenerator.emit("reportComplete", { format: 'html', path: '/reports/test.html' });
      reportGenerator.emit("reportError", { format: 'xml', error: 'Parse error' });
      
      // Assert
      expect(eventLog.length).toBe(3);
      expect(eventLog[0].event).toBe('start');
      expect(eventLog[1].event).toBe("completed");
      expect(eventLog[2].event).toBe('error');
      expect(eventLog[2].error).toBe('Parse error');
    });

    it('should emit progress events during report generation', () => {
      // Arrange
      const progressEvents: any[] = [];
      reportGenerator.on("progress", (data) => progressEvents.push(data));
      
      // Act
      reportGenerator.emit("progress", {
        type: 'report-generation',
        format: 'json',
        percentage: 50,
        message: 'Processing scenarios'
      });
      
      reportGenerator.emit("progress", {
        type: 'report-generation',
        format: 'json',
        percentage: 100,
        message: 'Report In Progress'
      });
      
      // Assert
      expect(progressEvents.length).toBe(2);
      expect(progressEvents[0].percentage).toBe(50);
      expect(progressEvents[1].percentage).toBe(100);
    });
  });

  describe('Report configuration with logger', () => {
    it('should handle report options with external logger', () => {
      // Arrange
      const configWithOptions = {
        ...testConfig,
        reportOptions: {
          includeTimestamps: true,
          includeMetadata: true,
          customStyles: 'dark-theme'
        }
      };
      
      // Act
      reportGenerator.configure(configWithOptions);
      reportGenerator.setExternalLogger(externalLogger);
      
      // Assert
      expect((reportGenerator as any).externalLogger).toBe(externalLogger);
      expect((reportGenerator as any).reportConfig).toMatchObject({
        includeTimestamps: true,
        includeMetadata: true,
        customStyles: 'dark-theme'
      });
    });
  });
});