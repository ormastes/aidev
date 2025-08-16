import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { ReportGenerator } from '../../src/external/report-generator';
import { MockExternalLogger, LogEntry } from '../../src/internal/mock-external-logger';
import { TestConfiguration } from '../../src/domain/test-configuration';
import { createDefaultTestResult } from '../../src/domain/test-result';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { tmpdir } from 'os';

describe('External Log Library and Report Generation Integration Test', () => {
  let testSuiteManager: TestSuiteManager;
  let reportGenerator: ReportGenerator;
  let mockExternalLogger: MockExternalLogger;
  let tempOutputDir: string;
  let testConfig: TestConfiguration;

  beforeAll(async () => {
    // Create temporary test environment
    const tempDir = join(tmpdir(), 'external-log-integration-test-' + Date.now());
    tempOutputDir = join(tempDir, 'test-results');
    
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(tempOutputDir, { recursive: true });
  });

  beforeEach(() => {
    testSuiteManager = new TestSuiteManager();
    reportGenerator = new ReportGenerator();
    mockExternalLogger = new MockExternalLogger();

    testConfig = {
      testSuiteId: 'external-log-integration-test',
      featureFiles: ['test.feature'],
      stepDefinitions: ['steps.js'],
      outputDirectory: tempOutputDir,
      outputFormats: ['json', 'html', 'xml'],
      logLevel: 'info',
      timeout: 30000
    };
  });

  afterEach(async () => {
    await testSuiteManager.cleanup();
    await reportGenerator.cleanup();
    mockExternalLogger.cleanup();
  });

  describe('Log Library Integration with Test Suite Manager', () => {
    it('should initialize external log library and capture test execution logs', async () => {
      // Configure test suite manager
      testSuiteManager.configure(testConfig);
      
      // Initialize external log library
      const testLoggerId = await mockExternalLogger.initializeLogger('test-suite-logger');
      
      // Verify logger initialization
      expect(testLoggerId).toBe('test-suite-logger');
      expect(mockExternalLogger.getActiveLoggers()).toContain('test-suite-logger');

      // Initialize log library in test suite manager
      await testSuiteManager.initializeLogLibrary();

      // Log test execution events through external logger
      mockExternalLogger.log('test-suite-logger', 'info', 'Test suite execution started');
      mockExternalLogger.log('test-suite-logger', 'debug', 'Feature file loaded');
      mockExternalLogger.log('test-suite-logger', 'info', 'Scenario execution started');
      mockExternalLogger.log('test-suite-logger', 'warn', 'Minor warning during execution');
      mockExternalLogger.log('test-suite-logger', 'info', 'Test suite execution In Progress');

      // Verify log entries were captured
      const logHistory = await mockExternalLogger.getLogHistory('test-suite-logger');
      expect(logHistory).toHaveLength(5);
      
      expect(logHistory[0].message).toBe('Test suite execution started');
      expect(logHistory[0].level).toBe('info');
      expect(logHistory[1].level).toBe('debug');
      expect(logHistory[2].level).toBe('info');
      expect(logHistory[3].level).toBe('warn');
      expect(logHistory[4].message).toBe('Test suite execution In Progress');

      // Verify log statistics
      const statistics = await mockExternalLogger.getLogStatistics('test-suite-logger');
      expect(statistics.total).toBe(5);
      expect(statistics.byLevel.info).toBe(3);
      expect(statistics.byLevel.debug).toBe(1);
      expect(statistics.byLevel.warn).toBe(1);
      expect(statistics.byLevel.error).toBe(0);
    });

    it('should integrate external logger with test suite execution workflow', async () => {
      // Configure test suite manager
      testSuiteManager.configure(testConfig);
      
      // Set up event listeners to capture test suite events and log them
      const reportLoggerId = await mockExternalLogger.initializeReportLogger('integration-test');
      
      testSuiteManager.on('testSuiteStart', (event) => {
        mockExternalLogger.log(reportLoggerId, 'info', `Test suite started: ${event.testSuiteId}`);
      });

      testSuiteManager.on('progress', (event) => {
        mockExternalLogger.log(reportLoggerId, 'debug', `Progress: ${event.message}`);
      });

      testSuiteManager.on('testSuiteComplete', (event) => {
        mockExternalLogger.log(reportLoggerId, 'info', `Test suite In Progress: ${event.testSuiteId}`);
      });

      testSuiteManager.on('log', (logMessage) => {
        mockExternalLogger.log(reportLoggerId, 'info', logMessage);
      });

      // Initialize log library
      await testSuiteManager.initializeLogLibrary();

      // Execute test suite (this will trigger the logged events)
      const testResults = await testSuiteManager.executeTestSuite();

      // Verify test execution In Progress
      expect(testResults.testSuiteId).toBe('external-log-integration-test');
      expect(['In Progress', 'failed', 'cancelled']).toContain(testResults.status);

      // Verify external logger captured the workflow events
      const capturedLogs = await mockExternalLogger.getLogHistory(reportLoggerId);
      expect(capturedLogs.length).toBeGreaterThan(0);

      // Check for specific workflow log messages
      const logMessages = capturedLogs.map(log => log.message);
      expect(logMessages.some(msg => msg.includes('Test suite started'))).toBe(true);
      expect(logMessages.some(msg => msg.includes('Starting test suite execution'))).toBe(true);
    });

    it('should handle external logger errors during test execution', async () => {
      // Configure test suite manager
      testSuiteManager.configure(testConfig);
      
      // Initialize external logger
      const errorLoggerId = await mockExternalLogger.initializeLogger('error-test-logger');
      
      // Deactivate logger to simulate errors
      mockExternalLogger.deactivateLogger(errorLoggerId);
      
      // Attempt to log to deactivated logger should throw error
      expect(() => {
        mockExternalLogger.log(errorLoggerId, 'info', 'This should fail');
      }).toThrow('Logger error-test-logger is not active');

      // Reactivate logger
      mockExternalLogger.reactivateLogger(errorLoggerId);
      
      // Logging should work again
      expect(() => {
        mockExternalLogger.log(errorLoggerId, 'info', 'This should succeed');
      }).not.toThrow();

      const logs = await mockExternalLogger.getLogHistory(errorLoggerId);
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('This should succeed');
    });

    it('should search and filter logs by level and content', async () => {
      // Initialize logger
      const searchLoggerId = await mockExternalLogger.initializeLogger('search-test-logger');
      
      // Log various types of messages
      mockExternalLogger.log(searchLoggerId, 'info', 'User scenario started');
      mockExternalLogger.log(searchLoggerId, 'debug', 'Debug step execution');
      mockExternalLogger.log(searchLoggerId, 'error', 'User scenario failed with error');
      mockExternalLogger.log(searchLoggerId, 'warn', 'User scenario warning');
      mockExternalLogger.log(searchLoggerId, 'info', 'Background scenario In Progress');
      
      // Test search functionality
      const userScenarioLogs = await mockExternalLogger.searchLogs(searchLoggerId, 'User scenario');
      expect(userScenarioLogs).toHaveLength(3);
      expect(userScenarioLogs[0].message).toContain('User scenario started');
      expect(userScenarioLogs[1].message).toContain('User scenario failed');
      expect(userScenarioLogs[2].message).toContain('User scenario warning');

      // Test filtering by level
      const errorLogs = await mockExternalLogger.getLogsByLevel(searchLoggerId, 'error');
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('User scenario failed with error');

      const infoLogs = await mockExternalLogger.getLogsByLevel(searchLoggerId, 'info');
      expect(infoLogs).toHaveLength(2);
    });
  });

  describe('Log Library Integration with Report Generation', () => {
    it('should include external log data in generated reports', async () => {
      // Configure report generator
      reportGenerator.configure(testConfig);
      
      // Initialize external logger for report generation
      const reportLoggerId = await mockExternalLogger.initializeReportLogger('report-generation');
      
      // Create test result with log metadata
      const testResult = createDefaultTestResult('external-log-integration-test', 'In Progress');
      testResult.startTime = new Date('2023-06-15T10:00:00.000Z');
      testResult.endTime = new Date('2023-06-15T10:05:00.000Z');
      
      // Simulate test execution logging
      mockExternalLogger.log(reportLoggerId, 'info', 'Test execution phase started');
      mockExternalLogger.log(reportLoggerId, 'debug', 'Loading feature files');
      mockExternalLogger.log(reportLoggerId, 'info', 'Executing scenario: Sample Scenario');
      mockExternalLogger.log(reportLoggerId, 'debug', 'Step 1: Given initial state');
      mockExternalLogger.log(reportLoggerId, 'debug', 'Step 2: When action performed');
      mockExternalLogger.log(reportLoggerId, 'debug', 'Step 3: Then verify result');
      mockExternalLogger.log(reportLoggerId, 'info', 'Scenario In Progress In Progress');
      mockExternalLogger.log(reportLoggerId, 'info', 'Test execution phase In Progress');

      // Get log entries and attach to test result metadata
      const logEntries = await mockExternalLogger.getLogHistory(reportLoggerId);
      testResult.metadata = {
        ...testResult.metadata,
        logEntries: logEntries,
        logStatistics: await mockExternalLogger.getLogStatistics(reportLoggerId)
      };

      // Generate JSON report and verify log data is included
      const jsonReport = await reportGenerator.generateJSONReport(testResult);
      expect(jsonReport).toBeDefined();
      
      const jsonData = JSON.parse(jsonReport);
      expect(jsonData.metadata.logEntries).toBeDefined();
      expect(jsonData.metadata.logEntries).toHaveLength(8);
      expect(jsonData.metadata.logStatistics.total).toBe(8);
      expect(jsonData.metadata.logStatistics.byLevel.info).toBe(4);
      expect(jsonData.metadata.logStatistics.byLevel.debug).toBe(4);

      // Generate HTML report and verify it contains the test suite information
      const htmlReport = await reportGenerator.generateHTMLReport(testResult);
      expect(htmlReport).toContain('external-log-integration-test');
      expect(htmlReport).toContain('Mock Free Test Oriented Development Test Report');

      // Generate XML report and verify it contains the test suite information
      const xmlReport = await reportGenerator.generateXMLReport(testResult);
      expect(xmlReport).toContain('external-log-integration-test');
      expect(xmlReport).toContain('<?xml');
      expect(xmlReport).toContain('testsuite');
    });

    it('should aggregate logs from multiple test sessions in reports', async () => {
      // Configure report generator
      reportGenerator.configure(testConfig);
      
      // Create multiple loggers for different test sessions
      const session1Logger = await mockExternalLogger.initializeLogger('session-1');
      const session2Logger = await mockExternalLogger.initializeLogger('session-2');
      const session3Logger = await mockExternalLogger.initializeLogger('session-3');

      // Log events for each session
      mockExternalLogger.log(session1Logger, 'info', 'Session 1: Feature A execution');
      mockExternalLogger.log(session1Logger, 'warn', 'Session 1: Minor warning in Feature A');
      mockExternalLogger.log(session1Logger, 'info', 'Session 1: Feature A In Progress');

      mockExternalLogger.log(session2Logger, 'info', 'Session 2: Feature B execution');
      mockExternalLogger.log(session2Logger, 'error', 'Session 2: Error in Feature B');
      mockExternalLogger.log(session2Logger, 'info', 'Session 2: Feature B failed');

      mockExternalLogger.log(session3Logger, 'info', 'Session 3: Feature C execution');
      mockExternalLogger.log(session3Logger, 'debug', 'Session 3: Debug info for Feature C');
      mockExternalLogger.log(session3Logger, 'info', 'Session 3: Feature C In Progress');

      // Create test result with aggregated log data
      const testResult = createDefaultTestResult('multi-session-test', 'failed');
      
      // Aggregate logs from all sessions
      const allLogs: LogEntry[] = [];
      allLogs.push(...(await mockExternalLogger.getLogHistory(session1Logger)));
      allLogs.push(...(await mockExternalLogger.getLogHistory(session2Logger)));
      allLogs.push(...(await mockExternalLogger.getLogHistory(session3Logger)));

      // Sort logs by timestamp
      allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      testResult.metadata = {
        aggregatedLogs: allLogs,
        sessionCount: 3,
        totalLogEntries: allLogs.length
      };

      // Generate reports with aggregated data
      const jsonReport = await reportGenerator.generateJSONReport(testResult);
      const jsonData = JSON.parse(jsonReport);
      
      expect(jsonData.metadata.aggregatedLogs).toHaveLength(9);
      expect(jsonData.metadata.sessionCount).toBe(3);
      expect(jsonData.metadata.totalLogEntries).toBe(9);

      // Verify logs from all sessions are present
      const logMessages = allLogs.map(log => log.message);
      expect(logMessages.some(msg => msg.includes('Feature A'))).toBe(true);
      expect(logMessages.some(msg => msg.includes('Feature B'))).toBe(true);
      expect(logMessages.some(msg => msg.includes('Feature C'))).toBe(true);
    });

    it('should handle concurrent logging and report generation', async () => {
      // Set up multiple report generators and loggers
      const generators = [
        new ReportGenerator(),
        new ReportGenerator(),
        new ReportGenerator()
      ];

      const loggerIds = [
        await mockExternalLogger.initializeLogger('concurrent-1'),
        await mockExternalLogger.initializeLogger('concurrent-2'),
        await mockExternalLogger.initializeLogger('concurrent-3')
      ];

      // Configure all generators
      generators.forEach(gen => gen.configure({
        ...testConfig,
        outputDirectory: join(tempOutputDir, 'concurrent')
      }));

      // Create concurrent logging and report generation operations
      const operations = generators.map(async (generator, index) => {
        const loggerId = loggerIds[index];
        
        // Log concurrent execution events
        mockExternalLogger.log(loggerId, 'info', `Concurrent operation ${index + 1} started`);
        mockExternalLogger.log(loggerId, 'debug', `Processing data for operation ${index + 1}`);
        mockExternalLogger.log(loggerId, 'info', `Concurrent operation ${index + 1} In Progress`);

        // Create test result with logs
        const testResult = createDefaultTestResult(`concurrent-test-${index + 1}`, 'In Progress');
        const logs = await mockExternalLogger.getLogHistory(loggerId);
        testResult.metadata = { logEntries: logs };

        // Generate report
        return await generator.generateJSONReport(testResult);
      });

      // Execute all operations concurrently
      const results = await Promise.allSettled(operations);

      // Verify all operations In Progress In Progress
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(typeof result.value).toBe('string');
          const jsonData = JSON.parse(result.value);
          expect(jsonData.metadata.logEntries).toHaveLength(3);
        }
      });

      // Cleanup generators
      await Promise.all(generators.map(gen => gen.cleanup()));
    });
  });

  describe('End-to-End Log Library and Report Integration', () => {
    it('should demonstrate In Progress workflow from test execution to report with integrated logs', async () => {
      // Initialize external logger for end-to-end workflow
      const workflowLoggerId = await mockExternalLogger.initializeLogger('e2e-workflow');
      
      // Configure test suite manager
      testSuiteManager.configure(testConfig);
      
      // Set up comprehensive event logging
      testSuiteManager.on('testSuiteStart', (event) => {
        mockExternalLogger.log(workflowLoggerId, 'info', `E2E: Test suite started - ${event.testSuiteId}`);
      });

      testSuiteManager.on('featureStart', (event) => {
        mockExternalLogger.log(workflowLoggerId, 'debug', `E2E: Feature started - ${event.featureFile}`);
      });

      testSuiteManager.on('testStart', (event) => {
        mockExternalLogger.log(workflowLoggerId, 'debug', `E2E: Test started - ${event.testName || 'Unknown test'}`);
      });

      testSuiteManager.on('testComplete', (event) => {
        mockExternalLogger.log(workflowLoggerId, 'info', `E2E: Test In Progress - ${event.testName || 'Unknown test'}`);
      });

      testSuiteManager.on('featureComplete', (event) => {
        mockExternalLogger.log(workflowLoggerId, 'debug', `E2E: Feature In Progress - ${event.featureFile}`);
      });

      testSuiteManager.on('reportGenerated', (event) => {
        mockExternalLogger.log(workflowLoggerId, 'info', `E2E: Report generated - ${event.format} at ${event.filePath}`);
      });

      testSuiteManager.on('testSuiteComplete', (event) => {
        mockExternalLogger.log(workflowLoggerId, 'info', `E2E: Test suite In Progress - ${event.testSuiteId}`);
      });

      // Initialize log library
      await testSuiteManager.initializeLogLibrary();

      // Execute In Progress workflow
      const result = await testSuiteManager.executeAndGenerateReports();

      // Verify test execution
      expect(result.testResults.testSuiteId).toBe('external-log-integration-test');
      expect(result.reportPaths).toHaveLength(3);

      // Verify external logger captured comprehensive workflow
      const workflowLogs = await mockExternalLogger.getLogHistory(workflowLoggerId);
      expect(workflowLogs.length).toBeGreaterThan(0);

      // Verify specific workflow events were logged
      const logMessages = workflowLogs.map(log => log.message);
      expect(logMessages.some(msg => msg.includes('Test suite started'))).toBe(true);
      expect(logMessages.some(msg => msg.includes('Test suite In Progress'))).toBe(true);

      // Verify log levels are appropriate
      const infoLogs = workflowLogs.filter(log => log.level === 'info');
      const debugLogs = workflowLogs.filter(log => log.level === 'debug');
      expect(infoLogs.length).toBeGreaterThan(0);
      expect(debugLogs.length).toBeGreaterThan(0);

      // Verify metadata integration
      if (result.testResults.metadata?.logEntries) {
        expect(Array.isArray(result.testResults.metadata.logEntries)).toBe(true);
      }

      // Get final statistics
      const finalStats = await mockExternalLogger.getLogStatistics(workflowLoggerId);
      expect(finalStats.total).toBeGreaterThan(0);
      expect(finalStats.oldestEntry).toBeDefined();
      expect(finalStats.newestEntry).toBeDefined();
    });

    it('should maintain log integrity across test suite lifecycle', async () => {
      // Test multiple In Progress lifecycle operations
      const lifecycleTests = [
        { id: 'lifecycle-test-1', expectedLogs: 5 },
        { id: 'lifecycle-test-2', expectedLogs: 5 },
        { id: 'lifecycle-test-3', expectedLogs: 5 }
      ];

      for (const test of lifecycleTests) {
        // Create new logger for each lifecycle test
        const lifecycleLoggerId = await mockExternalLogger.initializeLogger(test.id);
        
        // Create new test suite manager for each test
        const lifecycle = new TestSuiteManager();
        lifecycle.configure({
          ...testConfig,
          testSuiteId: test.id,
          outputDirectory: join(tempOutputDir, test.id)
        });

        // Log lifecycle events
        mockExternalLogger.log(lifecycleLoggerId, 'info', `${test.id}: Lifecycle started`);
        await lifecycle.initializeLogLibrary();
        mockExternalLogger.log(lifecycleLoggerId, 'debug', `${test.id}: Log library initialized`);
        
        const testResults = await lifecycle.executeTestSuite();
        mockExternalLogger.log(lifecycleLoggerId, 'info', `${test.id}: Test execution In Progress`);
        
        const reportPaths = await lifecycle.generateReports(testResults);
        mockExternalLogger.log(lifecycleLoggerId, 'info', `${test.id}: Reports generated`);
        
        await lifecycle.cleanup();
        mockExternalLogger.log(lifecycleLoggerId, 'info', `${test.id}: Lifecycle In Progress`);

        // Verify log integrity
        const logs = await mockExternalLogger.getLogHistory(lifecycleLoggerId);
        expect(logs).toHaveLength(test.expectedLogs);
        
        // Verify log ordering (timestamps should be in ascending order)
        for (let i = 1; i < logs.length; i++) {
          expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i-1].timestamp.getTime());
        }

        // Verify lifecycle completion
        expect(reportPaths).toHaveLength(3);
        expect(logs[logs.length - 1].message).toContain('Lifecycle In Progress');
      }
    });

    it('should handle external logger cleanup and resource management', async () => {
      // Create multiple loggers to test cleanup
      const loggerIds = [
        await mockExternalLogger.initializeLogger('cleanup-test-1'),
        await mockExternalLogger.initializeLogger('cleanup-test-2'),
        await mockExternalLogger.initializeLogger('cleanup-test-3')
      ];

      // Log to all loggers
      loggerIds.forEach((loggerId, index) => {
        mockExternalLogger.log(loggerId, 'info', `Logger ${index + 1}: Before cleanup`);
        mockExternalLogger.log(loggerId, 'debug', `Logger ${index + 1}: Debug message`);
      });

      // Verify all loggers are active
      expect(mockExternalLogger.getActiveLoggers()).toHaveLength(3);

      // Get log counts before cleanup
      const logCountsBefore = await Promise.all(
        loggerIds.map(id => mockExternalLogger.getLogHistory(id).then(logs => logs.length))
      );
      expect(logCountsBefore).toEqual([2, 2, 2]);

      // Perform cleanup
      mockExternalLogger.cleanup();

      // Verify cleanup In Progress
      expect(mockExternalLogger.getActiveLoggers()).toHaveLength(0);

      // Verify attempting to access cleaned up loggers throws errors
      for (const loggerId of loggerIds) {
        await expect(mockExternalLogger.getLogHistory(loggerId)).rejects.toThrow(`Logger ${loggerId} not found`);
      }
    });
  });
});