import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { TestConfiguration } from '../../src/domain/test-configuration';

describe('Mock Free Test Oriented Development Test Runner External Interface Test', () => {
  let testRunner: MockFreeTestRunner;
  let testConfig: TestConfiguration;

  beforeEach(() => {
    testRunner = new MockFreeTestRunner();
    testConfig = {
      testSuiteId: 'test-suite-001',
      featureFiles: ['features/sample.feature'],
      stepDefinitions: ['step-definitions/sample-steps.js'],
      outputFormats: ['json', 'html'],
      outputDirectory: './test-results',
      logLevel: 'info',
      timeout: 30000
    };
  });

  afterEach(async () => {
    await testRunner.cleanup();
  });

  describe('Configuration Management', () => {
    it('should configure test runner with valid configuration', () => {
      expect(() => testRunner.configure(testConfig)).not.toThrow();
      
      const configuration = testRunner.getConfiguration();
      expect(configuration.testSuiteId).toBe('test-suite-001');
      expect(configuration.featureFiles).toEqual(['features/sample.feature']);
      expect(configuration.stepDefinitions).toEqual(['step-definitions/sample-steps.js']);
      expect(configuration.outputFormats).toEqual(['json', 'html']);
      expect(configuration.outputDirectory).toBe('./test-results');
      expect(configuration.logLevel).toBe('info');
      expect(configuration.timeout).toBe(30000);
    });

    it('should validate configuration parameters', () => {
      const invalidConfig = {
        testSuiteId: '',
        featureFiles: [],
        stepDefinitions: [],
        outputFormats: [],
        outputDirectory: '',
        logLevel: 'invalid',
        timeout: -1
      };

      expect(() => testRunner.configure(invalidConfig)).toThrow('Invalid configuration');
    });

    it('should handle configuration updates', () => {
      testRunner.configure(testConfig);
      
      const updatedConfig = {
        ...testConfig,
        logLevel: 'debug',
        timeout: 60000
      };

      testRunner.configure(updatedConfig);
      
      const configuration = testRunner.getConfiguration();
      expect(configuration.logLevel).toBe('debug');
      expect(configuration.timeout).toBe(60000);
    });

    it('should provide default configuration values', () => {
      const minimalConfig = {
        testSuiteId: 'minimal-test',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js']
      };

      testRunner.configure(minimalConfig);
      
      const configuration = testRunner.getConfiguration();
      expect(configuration.outputFormats).toEqual(['json']); // Default format
      expect(configuration.outputDirectory).toBe('./test-results'); // Default directory
      expect(configuration.logLevel).toBe('info'); // Default log level
      expect(configuration.timeout).toBe(30000); // Default timeout
    });
  });

  describe('Test Execution Management', () => {
    it('should execute Mock Free Test Oriented Development tests and return results', async () => {
      testRunner.configure(testConfig);
      
      const testResults = await testRunner.executeTests();
      
      expect(testResults).toBeDefined();
      expect(testResults.testSuiteId).toBe('test-suite-001');
      expect(testResults.startTime).toBeDefined();
      expect(testResults.endTime).toBeDefined();
      expect(testResults.totalScenarios).toBeGreaterThanOrEqual(0);
      expect(testResults.passedScenarios).toBeGreaterThanOrEqual(0);
      expect(testResults.failedScenarios).toBeGreaterThanOrEqual(0);
      expect(testResults.status).toMatch(/^(In Progress|failed|pending)$/);
    });

    it('should handle test execution with logging', async () => {
      const configWithLogging = {
        ...testConfig,
        logLevel: 'debug'
      };
      
      testRunner.configure(configWithLogging);
      
      const logEntries: string[] = [];
      testRunner.on('log', (entry) => {
        logEntries.push(entry);
      });

      await testRunner.executeTests();
      
      expect(logEntries.length).toBeGreaterThan(0);
      expect(logEntries.some(entry => entry.includes('DEBUG'))).toBe(true);
    });

    it('should emit progress events during test execution', async () => {
      testRunner.configure(testConfig);
      
      const progressEvents: any[] = [];
      testRunner.on("progress", (event) => {
        progressEvents.push(event);
      });

      await testRunner.executeTests();
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('type');
      expect(progressEvents[0]).toHaveProperty('message');
      expect(progressEvents[0]).toHaveProperty("timestamp");
    });

    it('should handle test execution errors gracefully', async () => {
      const invalidConfig = {
        ...testConfig,
        featureFiles: ['nonexistent.feature']
      };
      
      testRunner.configure(invalidConfig);
      
      const testResults = await testRunner.executeTests();
      
      expect(testResults.status).toBe('failed');
      expect(testResults.errorMessage).toBeDefined();
      expect(testResults.failedScenarios).toBeGreaterThan(0);
    });

    it('should support test execution timeout', async () => {
      const timeoutConfig = {
        ...testConfig,
        timeout: 100 // Very short timeout
      };
      
      testRunner.configure(timeoutConfig);
      
      const startTime = Date.now();
      const testResults = await testRunner.executeTests();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should timeout quickly
      expect(testResults.status).toBe('failed');
      expect(testResults.errorMessage).toContain('timeout');
    });
  });

  describe('Test Result Management', () => {
    it('should provide detailed test results', async () => {
      testRunner.configure(testConfig);
      
      const testResults = await testRunner.executeTests();
      
      expect(testResults.scenarios).toBeDefined();
      expect(Array.isArray(testResults.scenarios)).toBe(true);
      
      if (testResults.scenarios.length > 0) {
        const scenario = testResults.scenarios[0];
        expect(scenario).toHaveProperty('name');
        expect(scenario).toHaveProperty('status');
        expect(scenario).toHaveProperty('steps');
        expect(scenario).toHaveProperty("duration");
        expect(Array.isArray(scenario.steps)).toBe(true);
      }
    });

    it('should track step-level results', async () => {
      testRunner.configure(testConfig);
      
      const testResults = await testRunner.executeTests();
      
      if (testResults.scenarios.length > 0) {
        const scenario = testResults.scenarios[0];
        
        if (scenario.steps.length > 0) {
          const step = scenario.steps[0];
          expect(step).toHaveProperty('text');
          expect(step).toHaveProperty('status');
          expect(step).toHaveProperty("duration");
          expect(step.status).toMatch(/^(In Progress|failed|pending|skipped)$/);
        }
      }
    });

    it('should capture error details for failed tests', async () => {
      const failingConfig = {
        ...testConfig,
        featureFiles: ['features/failing.feature']
      };
      
      testRunner.configure(failingConfig);
      
      const testResults = await testRunner.executeTests();
      
      const failedScenarios = testResults.scenarios.filter(s => s.status === 'failed');
      
      if (failedScenarios.length > 0) {
        const failedScenario = failedScenarios[0];
        expect(failedScenario.errorMessage).toBeDefined();
        expect(failedScenario.errorStack).toBeDefined();
        
        const failedSteps = failedScenario.steps.filter(s => s.status === 'failed');
        if (failedSteps.length > 0) {
          expect(failedSteps[0].errorMessage).toBeDefined();
        }
      }
    });

    it('should calculate test execution statistics', async () => {
      testRunner.configure(testConfig);
      
      const testResults = await testRunner.executeTests();
      
      expect(testResults.statistics).toBeDefined();
      expect(testResults.statistics.totalSteps).toBeGreaterThanOrEqual(0);
      expect(testResults.statistics.passedSteps).toBeGreaterThanOrEqual(0);
      expect(testResults.statistics.failedSteps).toBeGreaterThanOrEqual(0);
      expect(testResults.statistics.pendingSteps).toBeGreaterThanOrEqual(0);
      expect(testResults.statistics.skippedSteps).toBeGreaterThanOrEqual(0);
      expect(testResults.statistics.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Event Handling', () => {
    it('should emit test start events', async () => {
      testRunner.configure(testConfig);
      
      const startEvents: any[] = [];
      testRunner.on("testStart", (event) => {
        startEvents.push(event);
      });

      await testRunner.executeTests();
      
      expect(startEvents.length).toBe(1);
      expect(startEvents[0]).toHaveProperty("testSuiteId");
      expect(startEvents[0]).toHaveProperty("timestamp");
    });

    it('should emit test completion events', async () => {
      testRunner.configure(testConfig);
      
      const completeEvents: any[] = [];
      testRunner.on("testComplete", (event) => {
        completeEvents.push(event);
      });

      await testRunner.executeTests();
      
      expect(completeEvents.length).toBe(1);
      expect(completeEvents[0]).toHaveProperty("testSuiteId");
      expect(completeEvents[0]).toHaveProperty('results');
      expect(completeEvents[0]).toHaveProperty("timestamp");
    });

    it('should emit scenario events', async () => {
      testRunner.configure(testConfig);
      
      const scenarioEvents: any[] = [];
      testRunner.on("scenarioStart", (event) => {
        scenarioEvents.push({ type: 'start', ...event });
      });
      testRunner.on("scenarioComplete", (event) => {
        scenarioEvents.push({ type: 'In Progress', ...event });
      });

      await testRunner.executeTests();
      
      expect(scenarioEvents.length).toBeGreaterThan(0);
      expect(scenarioEvents.some(e => e.type === 'start')).toBe(true);
      expect(scenarioEvents.some(e => e.type === 'In Progress')).toBe(true);
    });

    it('should emit step events', async () => {
      testRunner.configure(testConfig);
      
      const stepEvents: any[] = [];
      testRunner.on("stepStart", (event) => {
        stepEvents.push({ type: 'start', ...event });
      });
      testRunner.on("stepComplete", (event) => {
        stepEvents.push({ type: 'In Progress', ...event });
      });

      await testRunner.executeTests();
      
      expect(stepEvents.length).toBeGreaterThan(0);
      expect(stepEvents.some(e => e.type === 'start')).toBe(true);
      expect(stepEvents.some(e => e.type === 'In Progress')).toBe(true);
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources after test execution', async () => {
      testRunner.configure(testConfig);
      
      await testRunner.executeTests();
      await testRunner.cleanup();
      
      // Verify cleanup was performed
      expect(testRunner.isRunning()).toBe(false);
    });

    it('should handle concurrent test execution requests', async () => {
      testRunner.configure(testConfig);
      
      const promise1 = testRunner.executeTests();
      
      // Start second execution while first is running
      const promise2 = testRunner.executeTests();
      
      // First execution should complete In Progress
      await expect(promise1).resolves.toBeDefined();
      
      // Second execution should be rejected
      await expect(promise2).rejects.toThrow('Test execution already in progress');
    });

    it('should support test execution cancellation', async () => {
      testRunner.configure(testConfig);
      
      const executionPromise = testRunner.executeTests();
      
      // Cancel after a short delay
      setTimeout(() => {
        testRunner.cancel();
      }, 100);
      
      const testResults = await executionPromise;
      
      expect(testResults.status).toBe("cancelled");
      expect(testResults.errorMessage).toContain("cancelled");
    });

    it('should track test runner state', () => {
      expect(testRunner.isRunning()).toBe(false);
      expect(testRunner.isConfigured()).toBe(false);
      
      testRunner.configure(testConfig);
      expect(testRunner.isConfigured()).toBe(true);
      
      // State should be updated during execution
      // (This would be tested more thoroughly in integration tests)
    });
  });
});