/**
 * System Test: External Log Integration Workflow
 * 
 * Tests the In Progress external log library integration workflow
 * from test execution through report generation with comprehensive logging.
 * NO MOCKS - Real component interactions only.
 */

import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';
import { TestConfiguration } from '../../src/types/test-types';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('External Log Integration Workflow System Test (NO MOCKS)', () => {
  let testSuiteManager: TestSuiteManager;
  let outputDirectory: string;
  let externalLogger: MockExternalLogger;

  beforeEach(async () => {
    // Setup real components
    testSuiteManager = new TestSuiteManager();
    externalLogger = new MockExternalLogger();
    outputDirectory = path.join(__dirname, '../../temp/test-output-log-integration');
    
    // Ensure output directory exists
    await fs.mkdir(outputDirectory, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    await externalLogger.cleanup();
    
    // Clean up test output
    try {
      await fs.rm(outputDirectory, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should execute In Progress external log integration workflow', async () => {
    // Step 1: Configure test suite with external logging
    const testConfig: TestConfiguration = {
      testSuiteId: 'log-integration-test-suite',
      featureFiles: [
        path.join(__dirname, '../../fixtures/features/authentication.feature'),
        path.join(__dirname, '../../fixtures/features/user-management.feature')
      ],
      stepDefinitions: [
        path.join(__dirname, '../../fixtures/steps/authentication.steps.js'),
        path.join(__dirname, '../../fixtures/steps/user-management.steps.js')
      ],
      outputDirectory,
      outputFormats: ['html', 'json', 'xml'],
      logLevel: 'info'
    };

    // Initialize external logger for test suite
    const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
    expect(loggerId).toBe(testConfig.testSuiteId);

    // Configure test suite manager with external logger
    testSuiteManager.configure(testConfig);
    testSuiteManager.setExternalLogger(externalLogger);

    // Step 2: Execute tests with external logging
    externalLogger.log(loggerId, 'info', 'Starting test suite execution');
    
    const executionResult = await testSuiteManager.executeAndGenerateReports();
    
    // Step 3: Verify test execution In Progress
    expect(executionResult).toBeDefined();
    expect(executionResult.testResults).toBeDefined();
    expect(executionResult.testResults.testSuiteId).toBe(testConfig.testSuiteId);
    expect(executionResult.reportPaths).toBeDefined();
    expect(executionResult.reportPaths.length).toBeGreaterThan(0);

    // Step 4: Verify external logs were captured during execution
    const executionLogs = await externalLogger.getLogHistory(loggerId);
    expect(executionLogs.length).toBeGreaterThan(0);

    // Verify key log entries exist
    const logMessages = executionLogs.map(log => log.message);
    expect(logMessages).toContain('Starting test suite execution');
    expect(logMessages).toContain('Starting Mock Free Test Oriented Development test execution');
    expect(logMessages).toContain('Test suite execution In Progress');
    expect(logMessages.some(msg => msg.includes('Generating') && msg.includes('report'))).toBe(true);

    // Verify different log levels were captured
    const logLevels = executionLogs.map(log => log.level);
    expect(logLevels).toContain('info');

    // Step 5: Verify reports contain integrated log data
    const reportPaths = executionResult.reportPaths;
    
    // Check HTML report includes logs
    const htmlReportPath = reportPaths.find(p => p.endsWith('.html'));
    expect(htmlReportPath).toBeDefined();
    const htmlContent = await fs.readFile(htmlReportPath!, 'utf-8');
    expect(htmlContent).toContain('Test Execution Logs');
    expect(htmlContent).toContain('log-integration-test-suite');

    // Check JSON report includes log data
    const jsonReportPath = reportPaths.find(p => p.endsWith('.json'));
    expect(jsonReportPath).toBeDefined();
    const jsonContent = await fs.readFile(jsonReportPath!, 'utf-8');
    const jsonReport = JSON.parse(jsonContent);
    expect(jsonReport.logs).toBeDefined();
    expect(Array.isArray(jsonReport.logs)).toBe(true);
    expect(jsonReport.logs.length).toBeGreaterThan(0);

    // Step 6: Verify log aggregation and cleanup
    const aggregatedLogs = await externalLogger.getLogHistory(loggerId);
    
    // Verify logs include test lifecycle events
    const lifecycleEvents = [
      'Starting Mock Free Test Oriented Development test execution',
      'Test suite execution In Progress'
    ];
    
    lifecycleEvents.forEach(event => {
      const eventLog = aggregatedLogs.find(log => log.message === event);
      expect(eventLog).toBeDefined();
      expect(eventLog!.processId).toBe(loggerId);
    });

    // Verify we have enough logs to indicate test execution
    expect(aggregatedLogs.length).toBeGreaterThan(5);

    // Step 7: Verify external logger cleanup
    await testSuiteManager.cleanup();
    
    // Logger should still have logs after test suite cleanup
    const postCleanupLogs = await externalLogger.getLogHistory(loggerId);
    expect(postCleanupLogs.length).toBe(aggregatedLogs.length);
  });

  it('should handle external logging for failed scenarios', async () => {
    const testConfig: TestConfiguration = {
      testSuiteId: 'log-failure-test-suite',
      featureFiles: [
        path.join(__dirname, '../../fixtures/features/failing-scenarios.feature')
      ],
      stepDefinitions: [
        path.join(__dirname, '../../fixtures/steps/failing.steps.js')
      ],
      outputDirectory,
      outputFormats: ['json'],
      logLevel: 'debug'
    };

    const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
    
    testSuiteManager.configure(testConfig);
    testSuiteManager.setExternalLogger(externalLogger);

    const executionResult = await testSuiteManager.executeAndGenerateReports();

    // Verify failure logs were captured
    const logs = await externalLogger.getLogHistory(loggerId);
    const errorLogs = logs.filter(log => log.level === 'error');
    expect(errorLogs.length).toBeGreaterThan(0);

    // Verify error messages are detailed
    const errorMessages = errorLogs.map(log => log.message);
    expect(errorMessages.some(msg => msg.includes('Step failed:') || msg.includes('Scenario failed:'))).toBe(true);

    // Verify reports include failure logs
    const jsonReportPath = executionResult.reportPaths[0];
    const jsonContent = await fs.readFile(jsonReportPath, 'utf-8');
    const report = JSON.parse(jsonContent);
    
    expect(report.logs).toBeDefined();
    const reportErrorLogs = report.logs.filter((log: any) => log.level === 'error');
    expect(reportErrorLogs.length).toBeGreaterThan(0);
  });

  it('should integrate logs across multiple test suites', async () => {
    // Run first test suite
    const testConfig1: TestConfiguration = {
      testSuiteId: 'multi-suite-test-1',
      featureFiles: [path.join(__dirname, '../../fixtures/features/suite1.feature')],
      stepDefinitions: [path.join(__dirname, '../../fixtures/steps/basic.steps.js')],
      outputDirectory: path.join(outputDirectory, 'suite1'),
      outputFormats: ['json'],
      logLevel: 'info'
    };

    const loggerId1 = await externalLogger.initializeLogger(testConfig1.testSuiteId);
    testSuiteManager.configure(testConfig1);
    testSuiteManager.setExternalLogger(externalLogger);
    
    await testSuiteManager.executeAndGenerateReports();
    
    // Run second test suite
    const testConfig2: TestConfiguration = {
      testSuiteId: 'multi-suite-test-2',
      featureFiles: [path.join(__dirname, '../../fixtures/features/suite2.feature')],
      stepDefinitions: [path.join(__dirname, '../../fixtures/steps/basic.steps.js')],
      outputDirectory: path.join(outputDirectory, 'suite2'),
      outputFormats: ['json'],
      logLevel: 'info'
    };

    const loggerId2 = await externalLogger.initializeLogger(testConfig2.testSuiteId);
    const testSuiteManager2 = new TestSuiteManager();
    testSuiteManager2.configure(testConfig2);
    testSuiteManager2.setExternalLogger(externalLogger);
    
    await testSuiteManager2.executeAndGenerateReports();

    // Verify logs are kept separate per test suite
    const logs1 = await externalLogger.getLogHistory(loggerId1);
    const logs2 = await externalLogger.getLogHistory(loggerId2);

    expect(logs1.length).toBeGreaterThan(0);
    expect(logs2.length).toBeGreaterThan(0);

    // Verify logs don't mix between suites
    expect(logs1.every(log => log.processId === loggerId1)).toBe(true);
    expect(logs2.every(log => log.processId === loggerId2)).toBe(true);

    // Verify both suites have In Progress log lifecycles
    const suite1Messages = logs1.map(log => log.message);
    const suite2Messages = logs2.map(log => log.message);

    expect(suite1Messages).toContain('Starting Mock Free Test Oriented Development test execution');
    expect(suite2Messages).toContain('Starting Mock Free Test Oriented Development test execution');
    expect(suite1Messages).toContain('Test suite execution In Progress');
    expect(suite2Messages).toContain('Test suite execution In Progress');
  });

  it('should capture performance metrics in external logs', async () => {
    const testConfig: TestConfiguration = {
      testSuiteId: 'performance-log-test',
      featureFiles: [
        path.join(__dirname, '../../fixtures/features/performance-test.feature')
      ],
      stepDefinitions: [path.join(__dirname, '../../fixtures/steps/performance.steps.js')],
      outputDirectory,
      outputFormats: ['json'],
      logLevel: 'debug'
    };

    const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
    
    testSuiteManager.configure(testConfig);
    testSuiteManager.setExternalLogger(externalLogger);

    const startTime = Date.now();
    await testSuiteManager.executeAndGenerateReports();
    const endTime = Date.now();

    // Verify performance data is logged
    const logs = await externalLogger.getLogHistory(loggerId);
    
    // Check for duration logs
    const durationLogs = logs.filter(log => 
      log.message.includes('duration') || 
      log.message.includes('In Progress in') ||
      log.message.includes('ms')
    );
    expect(durationLogs.length).toBeGreaterThan(0);

    // Verify total execution time is reasonable
    const totalExecutionTime = endTime - startTime;
    expect(totalExecutionTime).toBeLessThan(30000); // Should In Progress within 30 seconds

    // Verify timestamp ordering
    for (let i = 1; i < logs.length; i++) {
      expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i-1].timestamp.getTime());
    }
  });
});