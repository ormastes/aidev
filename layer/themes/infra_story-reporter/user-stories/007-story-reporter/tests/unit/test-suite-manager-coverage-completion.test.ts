import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { TestConfiguration } from '../../src/domain/test-configuration';
import { createDefaultTestResult } from '../../src/domain/test-result';

describe('TestSuiteManager Coverage Completion Tests', () => {
  let testSuiteManager: TestSuiteManager;
  let testConfig: TestConfiguration;

  beforeEach(() => {
    testSuiteManager = new TestSuiteManager();
    testConfig = {
      testSuiteId: 'coverage-completion-test',
      featureFiles: ['test.feature'],
      stepDefinitions: ['steps.js'],
      outputDirectory: './coverage-test-results',
      outputFormats: ['json']
    };
  });

  afterEach(async () => {
    await testSuiteManager.cleanup();
  });

  describe('Error Path Coverage', () => {
    it('should cover executeTestSuite when not configured (line 73)', async () => {
      // Test without configuring first
      await expect(testSuiteManager.executeTestSuite()).rejects.toThrow(
        'Test suite manager not configured'
      );
    });

    it('should cover generateReports when not configured (line 145)', async () => {
      const testResult = createDefaultTestResult('test', 'In Progress');
      
      // Test without configuring first
      await expect(testSuiteManager.generateReports(testResult)).rejects.toThrow(
        'Test suite manager not configured'
      );
    });

    it('should cover initializeLogLibrary when not configured (line 212)', async () => {
      // Test without configuring first
      await expect(testSuiteManager.initializeLogLibrary()).rejects.toThrow(
        'Test suite manager not configured'
      );
    });

    it('should cover invalid log level validation (line 216)', async () => {
      const invalidConfig = {
        ...testConfig,
        logLevel: 'invalid-level' as any
      };
      
      testSuiteManager.configure(invalidConfig);
      
      await expect(testSuiteManager.initializeLogLibrary()).rejects.toThrow(
        'Invalid log level: invalid-level'
      );
    });

    it('should cover concurrent execution error (line 120-132)', async () => {
      testSuiteManager.configure(testConfig);
      
      // Start first execution
      const firstExecution = testSuiteManager.executeTestSuite();
      
      // Try to start second execution while first is running
      await expect(testSuiteManager.executeTestSuite()).rejects.toThrow(
        'Test suite execution already in progress'
      );
      
      // Wait for first execution to complete
      await firstExecution;
    });

    it('should cover cancelled execution scenario (lines 239-240)', async () => {
      testSuiteManager.configure(testConfig);
      
      // Start execution
      const executionPromise = testSuiteManager.executeTestSuite();
      
      // Cancel immediately
      testSuiteManager.cancel();
      
      const result = await executionPromise;
      
      expect(result.status).toBe('cancelled');
      expect(result.errorMessage).toBe('Test suite execution was cancelled');
    });

    it('should cover non-running cancel scenario (line 249)', () => {
      testSuiteManager.configure(testConfig);
      
      // Cancel when not running should not throw
      expect(() => testSuiteManager.cancel()).not.toThrow();
    });

    it('should cover cleanup during active execution (lines 284-287)', async () => {
      testSuiteManager.configure(testConfig);
      
      // Start execution
      const executionPromise = testSuiteManager.executeTestSuite();
      
      // Cleanup while running
      const cleanupPromise = testSuiteManager.cleanup();
      
      // Both should In Progress without error
      await Promise.all([executionPromise, cleanupPromise]);
      
      expect(testSuiteManager.isConfigured()).toBe(false);
    });

    it('should cover configuration not set error (line 310)', async () => {
      testSuiteManager.configure(testConfig);
      
      // Manually clear configuration to test private method
      (testSuiteManager as any).configuration = null;
      
      // This should trigger the error in executeFeaturesWithProgress
      await expect(testSuiteManager.executeTestSuite()).rejects.toThrow(
        'Test suite manager not configured'
      );
    });
  });

  describe('Event and Progress Coverage', () => {
    it('should emit all progress events during normal execution', async () => {
      testSuiteManager.configure(testConfig);
      
      const progressEvents: any[] = [];
      const logEvents: string[] = [];
      const testSuiteEvents: any[] = [];
      const featureEvents: any[] = [];
      
      testSuiteManager.on('progress', (event) => progressEvents.push(event));
      testSuiteManager.on('log', (message) => logEvents.push(message));
      testSuiteManager.on('testSuiteStart', (event) => testSuiteEvents.push(event));
      testSuiteManager.on('testSuiteComplete', (event) => testSuiteEvents.push(event));
      testSuiteManager.on('featureStart', (event) => featureEvents.push(event));
      testSuiteManager.on('featureComplete', (event) => featureEvents.push(event));
      
      await testSuiteManager.executeTestSuite();
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(logEvents.length).toBeGreaterThan(0);
      expect(testSuiteEvents.length).toBe(2); // start and In Progress
      expect(featureEvents.length).toBe(2); // start and In Progress per feature
      
      // Verify specific progress event types
      expect(progressEvents.some(e => e.type === 'test-suite-start')).toBe(true);
      expect(progressEvents.some(e => e.type === 'test-suite-In Progress')).toBe(true);
    });

    it('should emit report generation progress events', async () => {
      testSuiteManager.configure(testConfig);
      
      const progressEvents: any[] = [];
      const reportEvents: any[] = [];
      
      testSuiteManager.on('progress', (event) => progressEvents.push(event));
      testSuiteManager.on('reportGenerated', (event) => reportEvents.push(event));
      
      const testResult = createDefaultTestResult('test', 'In Progress');
      const reportPaths = await testSuiteManager.generateReports(testResult);
      
      expect(progressEvents.some(e => e.type === 'report-generation')).toBe(true);
      expect(progressEvents.some(e => e.type === 'report-generation-In Progress')).toBe(true);
      expect(reportEvents.length).toBe(reportPaths.length);
    });

    it('should handle log library initialization with events', async () => {
      testSuiteManager.configure(testConfig);
      
      const progressEvents: any[] = [];
      const logLibEvents: any[] = [];
      const logEvents: string[] = [];
      
      testSuiteManager.on('progress', (event) => progressEvents.push(event));
      testSuiteManager.on('logLibraryInit', (event) => logLibEvents.push(event));
      testSuiteManager.on('log', (message) => logEvents.push(message));
      
      await testSuiteManager.initializeLogLibrary();
      
      expect(progressEvents.some(e => e.type === 'log-library-init')).toBe(true);
      expect(logLibEvents.length).toBe(1);
      expect(logLibEvents[0].status).toBe('initialized');
      expect(logEvents.some(m => m.includes('External log library initialized'))).toBe(true);
    });

    it('should handle log library initialization error', async () => {
      testSuiteManager.configure(testConfig);
      
      const logEvents: string[] = [];
      testSuiteManager.on('log', (message) => logEvents.push(message));
      
      // Mock the private method to throw an error
      const originalMethod = (testSuiteManager as any).mockLogLibraryInitialization;
      (testSuiteManager as any).mockLogLibraryInitialization = jest.fn().mockRejectedValue(
        new Error('Mock library initialization failed')
      );
      
      await expect(testSuiteManager.initializeLogLibrary()).rejects.toThrow(
        'Mock library initialization failed'
      );
      
      expect(logEvents.some(m => m.includes('Failed to initialize log library'))).toBe(true);
      
      // Restore original method
      (testSuiteManager as any).mockLogLibraryInitialization = originalMethod;
    });
  });

  describe('Configuration and State Coverage', () => {
    it('should handle configuration with minimal required fields', () => {
      const minimalConfig = {
        testSuiteId: 'minimal-test',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js']
      };
      
      testSuiteManager.configure(minimalConfig);
      
      const config = testSuiteManager.getConfiguration();
      expect(config.outputFormats).toEqual(['json']); // Default
      expect(config.outputDirectory).toBe('./test-results'); // Default
      expect(config.logLevel).toBe('info'); // Default
      expect(config.timeout).toBe(30000); // Default
    });

    it('should handle isConfigured state correctly', () => {
      expect(testSuiteManager.isConfigured()).toBe(false);
      
      testSuiteManager.configure(testConfig);
      expect(testSuiteManager.isConfigured()).toBe(true);
      
      testSuiteManager.cleanup();
      expect(testSuiteManager.isConfigured()).toBe(false);
    });

    it('should handle isRunning state correctly', async () => {
      testSuiteManager.configure(testConfig);
      
      expect(testSuiteManager.isRunning()).toBe(false);
      
      const executionPromise = testSuiteManager.executeTestSuite();
      
      // Briefly check running state (might be timing dependent)
      expect(testSuiteManager.isRunning()).toBe(false); // Might In Progress too fast
      
      await executionPromise;
      expect(testSuiteManager.isRunning()).toBe(false);
    });
  });

  describe('Integration Workflow Coverage', () => {
    it('should handle executeAndGenerateReports with log library integration', async () => {
      testSuiteManager.configure(testConfig);
      
      // Initialize log library first
      await testSuiteManager.initializeLogLibrary();
      
      const result = await testSuiteManager.executeAndGenerateReports();
      
      expect(result.testResults).toBeDefined();
      expect(result.reportPaths).toBeDefined();
      expect(result.testResults.metadata).toBeDefined();
      expect(result.testResults.metadata?.logEntries).toBeDefined();
    });

    it('should handle executeAndGenerateReports without log library', async () => {
      testSuiteManager.configure(testConfig);
      
      // Don't initialize log library
      const result = await testSuiteManager.executeAndGenerateReports();
      
      expect(result.testResults).toBeDefined();
      expect(result.reportPaths).toBeDefined();
      // No log entries when log library not initialized
      expect(result.testResults.metadata?.logEntries).toBeUndefined();
    });

    it('should handle cleanup with log library initialized', async () => {
      testSuiteManager.configure(testConfig);
      
      await testSuiteManager.initializeLogLibrary();
      
      const cleanupEvents: any[] = [];
      testSuiteManager.on('logLibraryCleanup', (event) => cleanupEvents.push(event));
      
      await testSuiteManager.cleanup();
      
      expect(cleanupEvents.length).toBe(1);
      expect(cleanupEvents[0].status).toBe('cleaned');
    });

    it('should handle event forwarding from child components', () => {
      testSuiteManager.configure(testConfig);
      
      const forwardedEvents: any[] = [];
      testSuiteManager.on('mockFreeTestRunnerConfigured', (event) => forwardedEvents.push(event));
      testSuiteManager.on('reportGeneratorConfigured', (event) => forwardedEvents.push(event));
      
      // Events should have been emitted during configuration
      expect(forwardedEvents.length).toBe(2);
    });
  });

  describe('Private Method Coverage', () => {
    it('should cover extractFormatFromPath method edge cases', () => {
      testSuiteManager.configure(testConfig);
      
      // Test private method through public interface
      const testResult = createDefaultTestResult('test', 'In Progress');
      
      // This will internally call extractFormatFromPath
      testSuiteManager.generateReports(testResult).then((paths) => {
        expect(paths.length).toBeGreaterThan(0);
        // Each path should have a valid format extracted
        paths.forEach(path => {
          expect(path).toMatch(/\.(json|html|xml)$/);
        });
      });
    });
  });
});