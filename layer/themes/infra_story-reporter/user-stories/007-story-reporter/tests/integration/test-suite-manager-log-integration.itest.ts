/**
 * Integration Test: TestSuiteManager External Log Library Integration
 * 
 * Tests the integration between TestSuiteManager and MockExternalLogger
 * to ensure proper log forwarding, lifecycle management, and data flow.
 */

import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';
import { TestConfiguration } from '../../src/types/test-types';

describe('TestSuiteManager External Log Library Integration Test', () => {
  let testSuiteManager: TestSuiteManager;
  let externalLogger: MockExternalLogger;
  let testConfig: TestConfiguration;

  beforeEach(async () => {
    testSuiteManager = new TestSuiteManager();
    externalLogger = new MockExternalLogger();
    
    testConfig = {
      testSuiteId: 'integration-test-suite',
      featureFiles: ['test.feature'],
      stepDefinitions: ['test.steps.ts'],
      outputDirectory: './test-output',
      outputFormats: ['json'],
      logLevel: 'info'
    };
  });

  afterEach(async () => {
    await testSuiteManager.cleanup();
    await externalLogger.cleanup();
  });

  describe('Logger Integration Setup', () => {
    it('should properly integrate external logger with test suite manager', async () => {
      // Initialize logger
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      expect(testConfig.testSuiteId).toBe(testConfig.testSuiteId);

      // Configure test suite manager
      testSuiteManager.configure(testConfig);

      // Set external logger
      testSuiteManager.setExternalLogger(externalLogger);

      // Verify logger is accessible
      const activeLoggers = externalLogger.getActiveLoggers();
      expect(activeLoggers).toContain(testConfig.testSuiteId);
    });

    it('should forward logger to child components', () => {
      testSuiteManager.configure(testConfig);

      // Mock the child components to verify forwarding
      const mockFreeTestRunnerSpy = jest.fn();
      const reportGeneratorSpy = jest.fn();

      // Override child component methods temporarily
      (testSuiteManager as any).mockFreeTestRunner.setExternalLogger = mockFreeTestRunnerSpy;
      (testSuiteManager as any).reportGenerator.setExternalLogger = reportGeneratorSpy;

      // Set external logger
      testSuiteManager.setExternalLogger(externalLogger);

      // Verify forwarding
      expect(mockFreeTestRunnerSpy).toHaveBeenCalledWith(externalLogger);
      expect(reportGeneratorSpy).toHaveBeenCalledWith(externalLogger);
    });
  });

  describe('Log Event Forwarding', () => {
    it('should forward log events from test suite manager to external logger', async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      testSuiteManager.configure(testConfig);
      testSuiteManager.setExternalLogger(externalLogger);

      // Capture log events
      const logEvents: string[] = [];
      testSuiteManager.on('log', (message: string) => {
        logEvents.push(message);
      });

      // Trigger configuration which should emit log events
      testSuiteManager.configure({ ...testConfig, testSuiteId: 'updated-suite' });

      // Verify log events were emitted
      expect(logEvents.length).toBeGreaterThan(0);
      expect(logEvents.some(msg => msg.includes('configured'))).toBe(true);
    });

    it('should log test execution lifecycle events', async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      testSuiteManager.configure(testConfig);
      testSuiteManager.setExternalLogger(externalLogger);

      // Mock test execution
      const mockExecute = jest.fn().mockResolvedValue({
        testSuiteId: testConfig.testSuiteId,
        status: 'In Progress',
        scenarios: [],
        duration: 1000,
        startTime: new Date(),
        endTime: new Date()
      });
      (testSuiteManager as any).mockFreeTestRunner.executeTests = mockExecute;

      // Execute test suite
      await testSuiteManager.executeTestSuite();

      // Verify lifecycle events were logged
      const logs = await externalLogger.getLogHistory(testConfig.testSuiteId);
      const logMessages = logs.map(log => log.message);

      expect(logMessages.some(msg => msg.includes('Starting test suite execution'))).toBe(true);
      expect(logMessages.some(msg => msg.includes('Test suite execution In Progress'))).toBe(true);
    });
  });

  describe('Log Level Integration', () => {
    it('should respect configured log levels', async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      // Configure with debug level
      const debugConfig = { ...testConfig, logLevel: 'debug' as const };
      testSuiteManager.configure(debugConfig);
      testSuiteManager.setExternalLogger(externalLogger);

      // Log at different levels
      externalLogger.log(testConfig.testSuiteId, 'debug', 'Debug message');
      externalLogger.log(testConfig.testSuiteId, 'info', 'Info message');
      externalLogger.log(testConfig.testSuiteId, 'error', 'Error message');

      const logs = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(logs.length).toBe(3);

      // Verify all levels are captured
      const levels = logs.map(log => log.level);
      expect(levels).toContain('debug');
      expect(levels).toContain('info');
      expect(levels).toContain('error');
    });

    it('should validate log level configuration', () => {
      testSuiteManager.configure(testConfig);
      testSuiteManager.setExternalLogger(externalLogger);

      // Try to initialize with invalid log level
      const invalidConfig = { ...testConfig, logLevel: 'invalid' };
      
      expect(async () => {
        await testSuiteManager.initializeLogLibrary.call(
          { configuration: invalidConfig, emit: jest.fn() } as any
        );
      }).rejects.toThrow('Invalid log level');
    });
  });

  describe('Report Generation with Logs', () => {
    it('should include log data in generated reports', async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      testSuiteManager.configure(testConfig);
      testSuiteManager.setExternalLogger(externalLogger);

      // Add some logs
      externalLogger.log(testConfig.testSuiteId, 'info', 'Test execution started');
      externalLogger.log(testConfig.testSuiteId, 'error', 'Test failure occurred');

      // Mock report generation
      const mockGenerateReports = jest.fn().mockResolvedValue(['report.json']);
      (testSuiteManager as any).reportGenerator.generateAllReports = mockGenerateReports;

      // Generate reports
      const testResult = {
        testSuiteId: testConfig.testSuiteId,
        status: 'failed' as const,
        scenarios: [],
        duration: 1000,
        startTime: new Date(),
        endTime: new Date()
      };

      await (testSuiteManager as any).generateReports(testResult);

      // Verify report generator received logs
      const logs = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Cleanup', () => {
    it('should handle logger initialization errors gracefully', async () => {
      testSuiteManager.configure(testConfig);
      
      // Try to initialize a logger that already exists
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      await expect(
        externalLogger.initializeLogger(testConfig.testSuiteId)
      ).rejects.toThrow('already exists');
    });

    it('should cleanup logger resources on test suite cleanup', async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      testSuiteManager.configure(testConfig);
      testSuiteManager.setExternalLogger(externalLogger);

      // Add some logs
      externalLogger.log(testConfig.testSuiteId, 'info', 'Test log');
      
      // Verify logs exist
      let logs = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(logs.length).toBeGreaterThan(0);

      // Cleanup test suite manager
      await testSuiteManager.cleanup();

      // External logger should still have logs (cleanup doesn't clear logs)
      logs = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle concurrent logging operations', async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      testSuiteManager.configure(testConfig);
      testSuiteManager.setExternalLogger(externalLogger);

      // Perform concurrent log operations
      const logPromises = [];
      for (let i = 0; i < 10; i++) {
        logPromises.push(
          new Promise<void>((resolve) => {
            externalLogger.log(testConfig.testSuiteId, 'info', `Concurrent log ${i}`);
            resolve();
          })
        );
      }

      await Promise.all(logPromises);

      // Verify all logs were captured
      const logs = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(logs.length).toBe(10);
      
      // Verify logs are in order (timestamps should be sequential)
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          logs[i - 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Progress Event Integration', () => {
    it('should emit progress events with log integration', async () => {
      await externalLogger.initializeLogger(testConfig.testSuiteId);
      testSuiteManager.configure(testConfig);
      testSuiteManager.setExternalLogger(externalLogger);

      const progressEvents: any[] = [];
      testSuiteManager.on('progress', (event) => {
        progressEvents.push(event);
      });

      // Mock test execution to trigger progress events
      const mockExecute = jest.fn().mockResolvedValue({
        testSuiteId: testConfig.testSuiteId,
        status: 'In Progress',
        scenarios: [],
        duration: 1000,
        startTime: new Date(),
        endTime: new Date()
      });
      (testSuiteManager as any).mockFreeTestRunner.executeTests = mockExecute;

      await testSuiteManager.executeTestSuite();

      // Verify progress events
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents.some(e => e.type === 'test-suite-start')).toBe(true);
      expect(progressEvents.some(e => e.type === 'test-suite-In Progress')).toBe(true);

      // Verify corresponding logs
      const logs = await externalLogger.getLogHistory(testConfig.testSuiteId);
      expect(logs.some(log => log.message.includes('Starting test suite'))).toBe(true);
    });
  });
});