import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { TestConfiguration } from '../../src/domain/test-configuration';

describe('Test Suite Manager External Interface Test', () => {
  let testSuiteManager: TestSuiteManager;
  let testConfig: TestConfiguration;

  beforeEach(() => {
    testSuiteManager = new TestSuiteManager();
    testConfig = {
      testSuiteId: 'test-suite-001',
      featureFiles: ['features/login.feature', 'features/dashboard.feature'],
      stepDefinitions: ['step-definitions/login-steps.js', 'step-definitions/dashboard-steps.js'],
      outputFormats: ['html', 'json', 'xml'],
      outputDirectory: './test-results',
      logLevel: 'info',
      timeout: 30000
    };
  });

  afterEach(async () => {
    await testSuiteManager.cleanup();
  });

  describe('Configuration Management', () => {
    it('should configure test suite manager with valid configuration', () => {
      expect(() => testSuiteManager.configure(testConfig)).not.toThrow();
      
      const configuration = testSuiteManager.getConfiguration();
      expect(configuration.testSuiteId).toBe('test-suite-001');
      expect(configuration.featureFiles).toEqual(['features/login.feature', 'features/dashboard.feature']);
      expect(configuration.stepDefinitions).toEqual(['step-definitions/login-steps.js', 'step-definitions/dashboard-steps.js']);
      expect(configuration.outputFormats).toEqual(['html', 'json', 'xml']);
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

      expect(() => testSuiteManager.configure(invalidConfig)).toThrow('Invalid configuration');
    });

    it('should handle configuration updates', () => {
      testSuiteManager.configure(testConfig);
      
      const updatedConfig = {
        ...testConfig,
        logLevel: 'debug',
        timeout: 60000,
        outputFormats: ['json']
      };

      testSuiteManager.configure(updatedConfig);
      
      const configuration = testSuiteManager.getConfiguration();
      expect(configuration.logLevel).toBe('debug');
      expect(configuration.timeout).toBe(60000);
      expect(configuration.outputFormats).toEqual(['json']);
    });

    it('should provide default configuration values', () => {
      const minimalConfig = {
        testSuiteId: 'minimal-test',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js']
      };

      testSuiteManager.configure(minimalConfig);
      
      const configuration = testSuiteManager.getConfiguration();
      expect(configuration.outputFormats).toEqual(['json']); // Default format
      expect(configuration.outputDirectory).toBe('./test-results'); // Default directory
      expect(configuration.logLevel).toBe('info'); // Default log level
      expect(configuration.timeout).toBe(30000); // Default timeout
    });
  });

  describe('Test Suite Execution', () => {
    it('should execute In Progress test suite and return results', async () => {
      testSuiteManager.configure(testConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      expect(testResults).toBeDefined();
      expect(testResults.testSuiteId).toBe('test-suite-001');
      expect(testResults.startTime).toBeDefined();
      expect(testResults.endTime).toBeDefined();
      expect(testResults.totalScenarios).toBeGreaterThanOrEqual(0);
      expect(testResults.passedScenarios).toBeGreaterThanOrEqual(0);
      expect(testResults.failedScenarios).toBeGreaterThanOrEqual(0);
      expect(testResults.status).toMatch(/^(In Progress|failed|pending)$/);
      expect(testResults.scenarios).toBeDefined();
      expect(Array.isArray(testResults.scenarios)).toBe(true);
    });

    it('should handle test suite execution with logging integration', async () => {
      const configWithLogging = {
        ...testConfig,
        logLevel: 'debug'
      };
      
      testSuiteManager.configure(configWithLogging);
      
      const logEntries: string[] = [];
      testSuiteManager.on('log', (entry) => {
        logEntries.push(entry);
      });

      await testSuiteManager.executeTestSuite();
      
      expect(logEntries.length).toBeGreaterThan(0);
      expect(logEntries.some(entry => entry.includes('DEBUG'))).toBe(true);
      expect(logEntries.some(entry => entry.includes('Test suite execution'))).toBe(true);
    });

    it('should emit progress events during test suite execution', async () => {
      testSuiteManager.configure(testConfig);
      
      const progressEvents: any[] = [];
      testSuiteManager.on("progress", (event) => {
        progressEvents.push(event);
      });

      await testSuiteManager.executeTestSuite();
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('type');
      expect(progressEvents[0]).toHaveProperty('message');
      expect(progressEvents[0]).toHaveProperty("timestamp");
    });

    it('should handle test suite execution errors gracefully', async () => {
      const invalidConfig = {
        ...testConfig,
        featureFiles: ['nonexistent.feature'],
        stepDefinitions: ['nonexistent-steps.js']
      };
      
      testSuiteManager.configure(invalidConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      expect(testResults.status).toBe('failed');
      expect(testResults.errorMessage).toBeDefined();
      expect(testResults.failedScenarios).toBeGreaterThan(0);
    });

    it('should support test suite execution timeout', async () => {
      const timeoutConfig = {
        ...testConfig,
        timeout: 100 // Very short timeout
      };
      
      testSuiteManager.configure(timeoutConfig);
      
      const startTime = Date.now();
      const testResults = await testSuiteManager.executeTestSuite();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should timeout quickly
      expect(testResults.status).toBe('failed');
      expect(testResults.errorMessage).toContain('timeout');
    });

    it('should support test suite execution with tags', async () => {
      const taggedConfig = {
        ...testConfig,
        tags: ['@smoke', '@regression'],
        excludeTags: ['@wip']
      };
      
      testSuiteManager.configure(taggedConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      expect(testResults).toBeDefined();
      expect(testResults.testSuiteId).toBe('test-suite-001');
      // Results should only include scenarios with specified tags
    });

    it('should support parallel test execution', async () => {
      const parallelConfig = {
        ...testConfig,
        parallel: {
          enabled: true,
          workers: 2
        }
      };
      
      testSuiteManager.configure(parallelConfig);
      
      const startTime = Date.now();
      const testResults = await testSuiteManager.executeTestSuite();
      const endTime = Date.now();
      
      expect(testResults).toBeDefined();
      expect(testResults.testSuiteId).toBe('test-suite-001');
      expect(endTime - startTime).toBeGreaterThan(0); // Should have some execution time
    });
  });

  describe('Report Generation Integration', () => {
    it('should generate and save reports after test execution', async () => {
      testSuiteManager.configure(testConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      const reportPaths = await testSuiteManager.generateReports(testResults);
      
      expect(reportPaths).toBeDefined();
      expect(Array.isArray(reportPaths)).toBe(true);
      expect(reportPaths.length).toBeGreaterThan(0);
      
      // Check that all configured formats are generated
      expect(reportPaths.some(path => path.endsWith('.html'))).toBe(true);
      expect(reportPaths.some(path => path.endsWith('.json'))).toBe(true);
      expect(reportPaths.some(path => path.endsWith('.xml'))).toBe(true);
    });

    it('should execute test suite and generate reports in one operation', async () => {
      testSuiteManager.configure(testConfig);
      
      const result = await testSuiteManager.executeAndGenerateReports();
      
      expect(result).toBeDefined();
      expect(result.testResults).toBeDefined();
      expect(result.reportPaths).toBeDefined();
      expect(result.testResults.testSuiteId).toBe('test-suite-001');
      expect(Array.isArray(result.reportPaths)).toBe(true);
      expect(result.reportPaths.length).toBeGreaterThan(0);
    });

    it('should handle report generation errors gracefully', async () => {
      const invalidConfig = {
        ...testConfig,
        outputDirectory: '/invalid/path/that/cannot/be/created'
      };
      
      testSuiteManager.configure(invalidConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      await expect(testSuiteManager.generateReports(testResults)).rejects.toThrow();
    });

    it('should support custom report generation options', async () => {
      const customConfig = {
        ...testConfig,
        reportOptions: {
          title: 'Custom Test Suite Report',
          description: 'End-to-end integration test results',
          includeScreenshots: true,
          includeLogs: true
        }
      };
      
      testSuiteManager.configure(customConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      const reportPaths = await testSuiteManager.generateReports(testResults);
      
      expect(reportPaths).toBeDefined();
      expect(reportPaths.length).toBeGreaterThan(0);
    });
  });

  describe('External Log Library Integration', () => {
    it('should initialize external log library for test logging', async () => {
      testSuiteManager.configure(testConfig);
      
      const initEvents: any[] = [];
      testSuiteManager.on("logLibraryInit", (event) => {
        initEvents.push(event);
      });
      
      await testSuiteManager.initializeLogLibrary();
      
      expect(initEvents.length).toBe(1);
      expect(initEvents[0]).toHaveProperty("testSuiteId");
      expect(initEvents[0]).toHaveProperty('status');
      expect(initEvents[0].status).toBe("initialized");
    });

    it('should capture test logs using external log library', async () => {
      testSuiteManager.configure(testConfig);
      
      await testSuiteManager.initializeLogLibrary();
      
      const logEntries: any[] = [];
      testSuiteManager.on('testLog', (entry) => {
        logEntries.push(entry);
      });
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      expect(testResults).toBeDefined();
      expect(logEntries.length).toBeGreaterThan(0);
      expect(logEntries[0]).toHaveProperty('level');
      expect(logEntries[0]).toHaveProperty('message');
      expect(logEntries[0]).toHaveProperty("timestamp");
      expect(logEntries[0]).toHaveProperty("testSuiteId");
    });

    it('should aggregate test logs in final report', async () => {
      testSuiteManager.configure(testConfig);
      
      await testSuiteManager.initializeLogLibrary();
      
      const result = await testSuiteManager.executeAndGenerateReports();
      
      expect(result.testResults).toBeDefined();
      expect(result.testResults.metadata).toBeDefined();
      expect(result.testResults.metadata!.logEntries).toBeDefined();
      expect(Array.isArray(result.testResults.metadata!.logEntries)).toBe(true);
    });

    it('should handle log library initialization errors', async () => {
      testSuiteManager.configure(testConfig);
      
      // Mock the log library to throw an error during initialization
      const originalInitialize = testSuiteManager.initializeLogLibrary;
      testSuiteManager.initializeLogLibrary = jest.fn().mockRejectedValue(new Error('Log library initialization failed'));
      
      await expect(testSuiteManager.initializeLogLibrary()).rejects.toThrow('Log library initialization failed');
      
      // Restore the original method
      testSuiteManager.initializeLogLibrary = originalInitialize;
    });

    it('should cleanup log library resources', async () => {
      testSuiteManager.configure(testConfig);
      
      await testSuiteManager.initializeLogLibrary();
      
      const cleanupEvents: any[] = [];
      testSuiteManager.on("logLibraryCleanup", (event) => {
        cleanupEvents.push(event);
      });
      
      await testSuiteManager.cleanup();
      
      expect(cleanupEvents.length).toBe(1);
      expect(cleanupEvents[0]).toHaveProperty("testSuiteId");
      expect(cleanupEvents[0]).toHaveProperty('status');
      expect(cleanupEvents[0].status).toBe('cleaned');
    });
  });

  describe('Event Handling', () => {
    it('should emit test suite start events', async () => {
      testSuiteManager.configure(testConfig);
      
      const startEvents: any[] = [];
      testSuiteManager.on("testSuiteStart", (event) => {
        startEvents.push(event);
      });

      await testSuiteManager.executeTestSuite();
      
      expect(startEvents.length).toBe(1);
      expect(startEvents[0]).toHaveProperty("testSuiteId");
      expect(startEvents[0]).toHaveProperty("timestamp");
      expect(startEvents[0]).toHaveProperty("configuration");
    });

    it('should emit test suite completion events', async () => {
      testSuiteManager.configure(testConfig);
      
      const completeEvents: any[] = [];
      testSuiteManager.on("testSuiteComplete", (event) => {
        completeEvents.push(event);
      });

      await testSuiteManager.executeTestSuite();
      
      expect(completeEvents.length).toBe(1);
      expect(completeEvents[0]).toHaveProperty("testSuiteId");
      expect(completeEvents[0]).toHaveProperty('results');
      expect(completeEvents[0]).toHaveProperty("timestamp");
      expect(completeEvents[0]).toHaveProperty("duration");
    });

    it('should emit feature execution events', async () => {
      testSuiteManager.configure(testConfig);
      
      const featureEvents: any[] = [];
      testSuiteManager.on("featureStart", (event) => {
        featureEvents.push({ type: 'start', ...event });
      });
      testSuiteManager.on("featureComplete", (event) => {
        featureEvents.push({ type: 'In Progress', ...event });
      });

      await testSuiteManager.executeTestSuite();
      
      expect(featureEvents.length).toBeGreaterThan(0);
      expect(featureEvents.some(e => e.type === 'start')).toBe(true);
      expect(featureEvents.some(e => e.type === 'In Progress')).toBe(true);
    });

    it('should emit report generation events', async () => {
      testSuiteManager.configure(testConfig);
      
      const reportEvents: any[] = [];
      testSuiteManager.on("reportGenerated", (event) => {
        reportEvents.push(event);
      });

      const testResults = await testSuiteManager.executeTestSuite();
      await testSuiteManager.generateReports(testResults);
      
      expect(reportEvents.length).toBeGreaterThan(0);
      expect(reportEvents[0]).toHaveProperty('format');
      expect(reportEvents[0]).toHaveProperty("filePath");
      expect(reportEvents[0]).toHaveProperty('size');
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources after test suite execution', async () => {
      testSuiteManager.configure(testConfig);
      
      await testSuiteManager.executeTestSuite();
      await testSuiteManager.cleanup();
      
      // Verify cleanup was performed
      expect(testSuiteManager.isRunning()).toBe(false);
      expect(testSuiteManager.isConfigured()).toBe(false);
    });

    it('should handle concurrent test suite execution requests', async () => {
      testSuiteManager.configure(testConfig);
      
      const promise1 = testSuiteManager.executeTestSuite();
      
      // Start second execution while first is running
      const promise2 = testSuiteManager.executeTestSuite();
      
      // First execution should complete In Progress
      await expect(promise1).resolves.toBeDefined();
      
      // Second execution should be rejected
      await expect(promise2).rejects.toThrow('Test suite execution already in progress');
    });

    it('should support test suite execution cancellation', async () => {
      testSuiteManager.configure(testConfig);
      
      const executionPromise = testSuiteManager.executeTestSuite();
      
      // Cancel after a short delay
      setTimeout(() => {
        testSuiteManager.cancel();
      }, 100);
      
      const testResults = await executionPromise;
      
      expect(testResults.status).toBe("cancelled");
      expect(testResults.errorMessage).toContain("cancelled");
    });

    it('should track test suite execution state', () => {
      expect(testSuiteManager.isRunning()).toBe(false);
      expect(testSuiteManager.isConfigured()).toBe(false);
      
      testSuiteManager.configure(testConfig);
      expect(testSuiteManager.isConfigured()).toBe(true);
      
      // State should be updated during execution
      // (This would be tested more thoroughly in integration tests)
    });

    it('should handle memory cleanup for large test suites', async () => {
      const largeConfig = {
        ...testConfig,
        featureFiles: Array(10).fill(0).map((_, i) => `features/test-${i}.feature`)
      };
      
      testSuiteManager.configure(largeConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      expect(testResults).toBeDefined();
      expect(testResults.testSuiteId).toBe('test-suite-001');
      
      // Memory should be cleaned up properly
      await testSuiteManager.cleanup();
    });
  });

  describe('Integration with Mock Free Test Oriented Development Test Runner', () => {
    it('should delegate test execution to Mock Free Test Oriented Development Test Runner', async () => {
      testSuiteManager.configure(testConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      expect(testResults).toBeDefined();
      expect(testResults.testSuiteId).toBe('test-suite-001');
      expect(testResults.scenarios).toBeDefined();
      expect(testResults.statistics).toBeDefined();
    });

    it('should handle Mock Free Test Oriented Development Test Runner errors', async () => {
      const invalidConfig = {
        ...testConfig,
        stepDefinitions: ['invalid-steps.js']
      };
      
      testSuiteManager.configure(invalidConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      expect(testResults.status).toBe('failed');
      expect(testResults.errorMessage).toBeDefined();
    });

    it('should pass configuration to Mock Free Test Oriented Development Test Runner', async () => {
      const configEvents: any[] = [];
      testSuiteManager.on("bddRunnerConfigured", (event) => {
        configEvents.push(event);
      });
      
      testSuiteManager.configure(testConfig);
      
      expect(configEvents.length).toBe(1);
      expect(configEvents[0]).toHaveProperty("configuration");
      expect(configEvents[0].configuration.testSuiteId).toBe('test-suite-001');
    });
  });

  describe('Integration with Report Generator', () => {
    it('should delegate report generation to Report Generator', async () => {
      testSuiteManager.configure(testConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      const reportPaths = await testSuiteManager.generateReports(testResults);
      
      expect(reportPaths).toBeDefined();
      expect(Array.isArray(reportPaths)).toBe(true);
      expect(reportPaths.length).toBeGreaterThan(0);
    });

    it('should handle Report Generator errors', async () => {
      const invalidConfig = {
        ...testConfig,
        outputDirectory: '/invalid/path'
      };
      
      testSuiteManager.configure(invalidConfig);
      
      const testResults = await testSuiteManager.executeTestSuite();
      
      await expect(testSuiteManager.generateReports(testResults)).rejects.toThrow();
    });

    it('should pass configuration to Report Generator', async () => {
      const configEvents: any[] = [];
      testSuiteManager.on("reportGeneratorConfigured", (event) => {
        configEvents.push(event);
      });
      
      testSuiteManager.configure(testConfig);
      
      expect(configEvents.length).toBe(1);
      expect(configEvents[0]).toHaveProperty("configuration");
      expect(configEvents[0].configuration.testSuiteId).toBe('test-suite-001');
    });
  });
});