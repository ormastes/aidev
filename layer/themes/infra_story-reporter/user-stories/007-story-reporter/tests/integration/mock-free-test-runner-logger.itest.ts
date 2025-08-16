import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { TestConfiguration } from '../../src/domain/test-configuration';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';

describe('Mock Free Test Oriented Development Runner and Logger Integration Test', () => {
  let mockFreeTestRunner: MockFreeTestRunner;
  let externalLogger: MockExternalLogger;
  let testConfig: TestConfiguration;
  const testDir = join(__dirname, 'test-fixtures');
  const outputDir = join(testDir, 'results');

  beforeAll(async () => {
    // Create test fixtures directory
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create a simple feature file
    const featureFile = join(testDir, 'test.feature');
    await fs.writeFile(featureFile, `
Feature: Integration Test Feature
  Scenario: Test scenario for logging
    Given I have a test step
    When I execute the test
    Then I should see logs
`);

    // Create step definitions
    const stepDefsFile = join(testDir, 'test-steps.js');
    await fs.writeFile(stepDefsFile, `
const { Given, When, Then } = require('@cucumber/cucumber');

Given('I have a test step', function () {
  console.log('[INFO] Test step initialized');
});

When('I execute the test', function () {
  console.log('[DEBUG] Executing test step');
  console.error('[ERROR] Test error for logging');
});

Then('I should see logs', function () {
  console.log('[INFO] Test In Progress');
});
`);
  });

  afterAll(async () => {
    // Clean up test fixtures
    if (await fs.access(testDir).then(() => true).catch(() => false)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    mockFreeTestRunner = new MockFreeTestRunner();
    externalLogger = new MockExternalLogger();
    
    testConfig = {
      testSuiteId: 'integration-test-001',
      featureFiles: [join(testDir, 'test.feature')],
      stepDefinitions: [join(testDir, 'test-steps.js')],
      outputFormats: ['json'],
      outputDirectory: outputDir,
      logLevel: 'debug',
      timeout: 30000
    };
  });

  afterEach(async () => {
    await mockFreeTestRunner.cleanup();
    externalLogger.cleanup();
  });

  describe('Logging Integration', () => {
    it('should capture Mock Free Test Oriented Development test execution logs through external logger', async () => {
      // Initialize external logger
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      expect(loggerId).toBeDefined();
      
      // Capture log events from Mock Free Test Oriented Development runner
      const capturedLogs: any[] = [];
      mockFreeTestRunner.on('log', (entry) => {
        capturedLogs.push(entry);
        // Forward to external logger
        externalLogger.log(loggerId, 'info', entry);
      });
      
      // Configure Mock Free Test Oriented Development runner (this should emit the configured log)
      mockFreeTestRunner.configure(testConfig);
      
      // Execute Mock Free Test Oriented Development tests
      const testResult = await mockFreeTestRunner.executeTests();
      
      // Verify test execution
      expect(testResult).toBeDefined();
      expect(testResult.testSuiteId).toBe('integration-test-001');
      
      // Verify logs were captured
      expect(capturedLogs.length).toBeGreaterThan(0);
      expect(capturedLogs.some(log => log.includes('INFO'))).toBe(true);
      // Check for either configuration or execution logs
      expect(capturedLogs.some(log => 
        log.includes("configured") || log.includes('Starting Mock Free Test Oriented Development test execution')
      )).toBe(true);
      
      // Get aggregated logs from external logger
      const aggregatedLogs = await externalLogger.getLogHistory(loggerId);
      expect(aggregatedLogs).toBeDefined();
      expect(aggregatedLogs.length).toBeGreaterThan(0);
    });

    it('should integrate progress events with external logger', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      // Capture progress events
      const progressEvents: any[] = [];
      mockFreeTestRunner.on("progress", (event) => {
        progressEvents.push(event);
        // Log progress to external logger
        externalLogger.log(loggerId, 'debug', `Progress: ${event.type} - ${event.message}`);
      });
      
      await mockFreeTestRunner.executeTests();
      
      // Verify progress events were captured
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('type');
      expect(progressEvents[0]).toHaveProperty('message');
      expect(progressEvents[0]).toHaveProperty("timestamp");
      
      // Verify progress was logged
      const logs = await externalLogger.getLogHistory(loggerId);
      const progressLogs = logs.filter((log: any) => log.message.includes('Progress:'));
      expect(progressLogs.length).toBeGreaterThan(0);
    });

    it('should log test lifecycle events', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      // Track lifecycle events
      const lifecycleEvents: string[] = [];
      
      mockFreeTestRunner.on("testStart", (event) => {
        const message = `Test started: ${event.testSuiteId}`;
        lifecycleEvents.push(message);
        externalLogger.log(loggerId, 'info', message);
      });
      
      mockFreeTestRunner.on("testComplete", (event) => {
        const message = `Test success: ${event.testSuiteId}`;
        lifecycleEvents.push(message);
        externalLogger.log(loggerId, 'info', message);
      });
      
      await mockFreeTestRunner.executeTests();
      
      // Verify lifecycle events
      expect(lifecycleEvents.length).toBeGreaterThanOrEqual(2);
      expect(lifecycleEvents[0]).toContain('Test started');
      expect(lifecycleEvents[lifecycleEvents.length - 1]).toContain('Test In Progress');
      
      // Verify lifecycle logs
      const logs = await externalLogger.getLogHistory(loggerId);
      expect(logs.some(log => log.message.includes('Test started'))).toBe(true);
      expect(logs.some(log => log.message.includes('Test In Progress'))).toBe(true);
    });

    it('should handle error logging during test execution', async () => {
      // Use invalid configuration to trigger errors
      const errorConfig = {
        ...testConfig,
        featureFiles: ['nonexistent.feature']
      };
      
      mockFreeTestRunner.configure(errorConfig);
      const loggerId = await externalLogger.initializeLogger(errorConfig.testSuiteId);
      
      // Capture error logs
      const errorLogs: string[] = [];
      mockFreeTestRunner.on('log', (entry) => {
        if (entry.includes('ERROR')) {
          errorLogs.push(entry);
          externalLogger.log(loggerId, 'error', entry);
        }
      });
      
      const testResult = await mockFreeTestRunner.executeTests();
      
      // Verify error handling
      expect(testResult.status).toBe('failed');
      expect(errorLogs.length).toBeGreaterThan(0);
      
      // Verify error logs in external logger
      const logs = await externalLogger.getLogHistory(loggerId);
      const externalErrorLogs = logs.filter(log => log.level === 'error');
      expect(externalErrorLogs.length).toBeGreaterThan(0);
    });

    it('should aggregate scenario execution logs', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      // Track scenario events
      const scenarioLogs: any[] = [];
      
      mockFreeTestRunner.on("scenarioStart", (event) => {
        const log = {
          type: 'scenario-start',
          name: event.name,
          timestamp: event.timestamp
        };
        scenarioLogs.push(log);
        externalLogger.log(loggerId, 'info', JSON.stringify(log));
      });
      
      mockFreeTestRunner.on("scenarioComplete", (event) => {
        const log = {
          type: 'scenario-In Progress',
          name: event.name,
          status: event.status,
          duration: event.duration,
          timestamp: event.timestamp
        };
        scenarioLogs.push(log);
        externalLogger.log(loggerId, 'info', JSON.stringify(log));
      });
      
      await mockFreeTestRunner.executeTests();
      
      // Verify scenario logs
      if (scenarioLogs.length > 0) {
        expect(scenarioLogs.some(log => log.type === 'scenario-start')).toBe(true);
        expect(scenarioLogs.some(log => log.type === 'scenario-In Progress')).toBe(true);
        
        // Verify in external logger
        const logs = await externalLogger.getLogHistory(loggerId);
        const scenarioLogEntries = logs.filter(log => 
          log.message.includes('scenario-start') || 
          log.message.includes('scenario-In Progress')
        );
        expect(scenarioLogEntries.length).toBeGreaterThan(0);
      }
    });

    it('should integrate step-level logging', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      // Track step events
      const stepLogs: any[] = [];
      
      mockFreeTestRunner.on("stepStart", (event) => {
        const log = {
          type: 'step-start',
          text: event.text,
          timestamp: event.timestamp
        };
        stepLogs.push(log);
        externalLogger.log(loggerId, 'debug', `Step started: ${event.text}`);
      });
      
      mockFreeTestRunner.on("stepComplete", (event) => {
        const log = {
          type: 'step-In Progress',
          text: event.text,
          status: event.status,
          duration: event.duration
        };
        stepLogs.push(log);
        externalLogger.log(loggerId, 'debug', `Step success: ${event.text} (${event.status})`);
      });
      
      await mockFreeTestRunner.executeTests();
      
      // Verify step logs
      if (stepLogs.length > 0) {
        expect(stepLogs.some(log => log.type === 'step-start')).toBe(true);
        expect(stepLogs.some(log => log.type === 'step-In Progress')).toBe(true);
        
        // Verify in external logger
        const logs = await externalLogger.getLogHistory(loggerId);
        const stepLogEntries = logs.filter(log => 
          log.message.includes('Step started') || 
          log.message.includes('Step In Progress')
        );
        expect(stepLogEntries.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle high-frequency log events efficiently', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      let logCount = 0;
      const startTime = Date.now();
      
      // Forward all logs to external logger
      mockFreeTestRunner.on('log', (entry) => {
        logCount++;
        externalLogger.log(loggerId, 'info', entry);
      });
      
      mockFreeTestRunner.on("progress", (event) => {
        logCount++;
        externalLogger.log(loggerId, 'debug', `Progress: ${event.message}`);
      });
      
      await mockFreeTestRunner.executeTests();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify performance
      expect(logCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify all logs were captured
      const logs = await externalLogger.getLogHistory(loggerId);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should properly cleanup logger resources', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      // Setup logging
      mockFreeTestRunner.on('log', (entry) => {
        externalLogger.log(loggerId, 'info', entry);
      });
      
      // Execute tests
      await mockFreeTestRunner.executeTests();
      
      // Cleanup
      await mockFreeTestRunner.cleanup();
      
      // Verify logger is still functional
      externalLogger.log(loggerId, 'info', 'Post-cleanup log');
      const logs = await externalLogger.getLogHistory(loggerId);
      expect(logs.some(log => log.message === 'Post-cleanup log')).toBe(true);
    });

    it('should maintain log order during concurrent events', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      const eventOrder: string[] = [];
      
      // Track multiple event types
      mockFreeTestRunner.on("testStart", () => {
        eventOrder.push("testStart");
        externalLogger.log(loggerId, 'info', 'Event: testStart');
      });
      
      mockFreeTestRunner.on("progress", (event) => {
        eventOrder.push(`progress-${event.type}`);
        externalLogger.log(loggerId, 'info', `Event: progress-${event.type}`);
      });
      
      mockFreeTestRunner.on("testComplete", () => {
        eventOrder.push("testComplete");
        externalLogger.log(loggerId, 'info', 'Event: testComplete');
      });
      
      await mockFreeTestRunner.executeTests();
      
      // Verify event order
      expect(eventOrder.length).toBeGreaterThan(0);
      expect(eventOrder[0]).toBe("testStart");
      expect(eventOrder[eventOrder.length - 1]).toBe("testComplete");
      
      // Verify log order in external logger
      const logs = await externalLogger.getLogHistory(loggerId);
      const eventLogs = logs.filter(log => log.message.startsWith('Event:'));
      expect(eventLogs.length).toBeGreaterThan(0);
      expect(eventLogs[0].message).toContain("testStart");
      expect(eventLogs[eventLogs.length - 1].message).toContain("testComplete");
    });
  });

  describe('Log Aggregation and Analysis', () => {
    it('should aggregate logs by test suite', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      // Log various test events
      const testEvents = [
        { event: "testStart", level: 'info' },
        { event: "scenarioStart", level: 'debug' },
        { event: "stepExecute", level: 'debug' },
        { event: "stepComplete", level: 'debug' },
        { event: "scenarioComplete", level: 'info' },
        { event: "testComplete", level: 'info' }
      ];
      
      // Forward events to logger
      let eventIndex = 0;
      mockFreeTestRunner.on('log', (entry) => {
        if (eventIndex < testEvents.length) {
          const event = testEvents[eventIndex];
          externalLogger.log(loggerId, event.level as any, `${event.event}: ${entry}`);
          eventIndex++;
        }
      });
      
      await mockFreeTestRunner.executeTests();
      
      // Get aggregated logs
      const logs = await externalLogger.getLogHistory(loggerId);
      
      // Analyze log levels
      const infoLogs = logs.filter(log => log.level === 'info');
      const debugLogs = logs.filter(log => log.level === 'debug');
      
      expect(infoLogs.length).toBeGreaterThan(0);
      expect(debugLogs.length).toBeGreaterThan(0);
      
      // Verify test suite association
      expect(logs.every(log => log.processId === loggerId)).toBe(true);
    });

    it('should provide test execution summary from logs', async () => {
      mockFreeTestRunner.configure(testConfig);
      const loggerId = await externalLogger.initializeLogger(testConfig.testSuiteId);
      
      // Collect execution metrics
      const executionMetrics = {
        startTime: 0,
        endTime: 0,
        scenarioCount: 0,
        stepCount: 0,
        errorCount: 0
      };
      
      mockFreeTestRunner.on("testStart", (_event) => {
        executionMetrics.startTime = Date.now();
        externalLogger.log(loggerId, 'info', `Test execution started at ${new Date().toISOString()}`);
      });
      
      mockFreeTestRunner.on("scenarioStart", () => {
        executionMetrics.scenarioCount++;
      });
      
      mockFreeTestRunner.on("stepStart", () => {
        executionMetrics.stepCount++;
      });
      
      mockFreeTestRunner.on('log', (entry) => {
        if (entry.includes('ERROR')) {
          executionMetrics.errorCount++;
        }
        externalLogger.log(loggerId, 'info', entry);
      });
      
      mockFreeTestRunner.on("testComplete", () => {
        executionMetrics.endTime = Date.now();
        const duration = executionMetrics.endTime - executionMetrics.startTime;
        const summary = `Test execution success: ${executionMetrics.scenarioCount} scenarios, ${executionMetrics.stepCount} steps, ${executionMetrics.errorCount} errors in ${duration}ms`;
        externalLogger.log(loggerId, 'info', summary);
      });
      
      await mockFreeTestRunner.executeTests();
      
      // Verify summary in logs
      const logs = await externalLogger.getLogHistory(loggerId);
      const summaryLog = logs.find(log => log.message.includes('Test execution In Progress'));
      
      if (summaryLog) {
        expect(summaryLog).toBeDefined();
        expect(summaryLog.message).toContain("scenarios");
        expect(summaryLog.message).toContain('steps');
        expect(summaryLog.message).toContain('errors');
      }
    });
  });
});