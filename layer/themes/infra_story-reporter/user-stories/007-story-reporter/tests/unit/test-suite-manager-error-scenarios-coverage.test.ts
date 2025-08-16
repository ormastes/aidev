import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { TestConfiguration } from '../../src/domain/test-configuration';
import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { ReportGenerator } from '../../src/external/report-generator';

// Mock dependencies
jest.mock('../../src/external/mock-free-test-runner');
jest.mock('../../src/external/report-generator');

describe('TestSuiteManager Error Scenarios Coverage Tests', () => {
  let testSuiteManager: TestSuiteManager;
  let testConfig: TestConfiguration;
  let mockTestRunner: jest.Mocked<MockFreeTestRunner>;
  let mockReportGenerator: jest.Mocked<ReportGenerator>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    testSuiteManager = new TestSuiteManager();
    testConfig = {
      testSuiteId: 'error-scenario-test',
      featureFiles: ['error-test.feature'],
      stepDefinitions: ['error-steps.js'],
      outputDirectory: './error-test-results',
      outputFormats: ['json']
    };

    // Create mock instances
    mockTestRunner = new MockFreeTestRunner() as jest.Mocked<MockFreeTestRunner>;
    mockReportGenerator = new ReportGenerator() as jest.Mocked<ReportGenerator>;

    // Setup mock implementations
    mockTestRunner.configure = jest.fn();
    mockTestRunner.executeTests = jest.fn().mockResolvedValue({
      testSuiteId: 'test',
      status: 'In Progress',
      startTime: new Date(),
      endTime: new Date(),
      scenarios: [],
      statistics: {
        totalScenarios: 0,
        passedScenarios: 0,
        failedScenarios: 0,
        skippedScenarios: 0,
        pendingScenarios: 0,
        totalSteps: 0,
        passedSteps: 0,
        failedSteps: 0,
        skippedSteps: 0,
        pendingSteps: 0,
        executionTime: 0
      },
      configuration: testConfig
    });
    mockTestRunner.cleanup = jest.fn();
    mockTestRunner.isConfigured = jest.fn().mockReturnValue(true);

    mockReportGenerator.configure = jest.fn();
    mockReportGenerator.generateAllReports = jest.fn().mockResolvedValue({
      reportPaths: ['test.json', 'test.html'],
      formats: ['json', 'html']
    });
    mockReportGenerator.saveReports = jest.fn().mockResolvedValue([
      'test.json', 'test.html'
    ]);
    mockReportGenerator.cleanup = jest.fn();

    // Mock the constructor calls
    (MockFreeTestRunner as jest.MockedClass<typeof MockFreeTestRunner>).mockImplementation(() => mockTestRunner);
    (ReportGenerator as jest.MockedClass<typeof ReportGenerator>).mockImplementation(() => mockReportGenerator);
  });

  afterEach(async () => {
    await testSuiteManager.cleanup();
  });

  describe('Configuration Error Scenarios (Line 310)', () => {
    it('should handle execution without configuration', async () => {
      // Attempt to execute without configuring first
      // This should trigger the error on line 310: "Configuration not set"
      
      const logSpy = jest.fn();
      const errorSpy = jest.fn();
      
      testSuiteManager.on('log', logSpy);
      testSuiteManager.on('error', errorSpy);

      await expect(testSuiteManager.executeAndGenerateReports()).rejects.toThrow('Test suite manager not configured');
    });

    it('should handle configuration state checks in private methods', () => {
      // Test that configuration state is properly validated
      expect(testSuiteManager.isConfigured()).toBe(false);
      
      testSuiteManager.configure(testConfig);
      expect(testSuiteManager.isConfigured()).toBe(true);
    });
  });

  describe('Invalid Log Level Error Scenarios (Line 216)', () => {
    it('should handle invalid log level during configuration', () => {
      const invalidLogLevelConfig: TestConfiguration = {
        ...testConfig,
        logLevel: 'invalid-level' as any // Force invalid log level
      };

      // This should trigger validation error during configure, not initializeLogLibrary
      expect(() => {
        testSuiteManager.configure(invalidLogLevelConfig);
      }).toThrow('logLevel must be one of: trace, debug, info, warn, error');
    });

    it('should handle empty string log level', () => {
      const emptyLogLevelConfig: TestConfiguration = {
        ...testConfig,
        logLevel: '' as any
      };

      expect(() => {
        testSuiteManager.configure(emptyLogLevelConfig);
      }).toThrow('logLevel must be one of: trace, debug, info, warn, error');
    });

    it('should handle numeric log level', () => {
      const numericLogLevelConfig: TestConfiguration = {
        ...testConfig,
        logLevel: '123' as any
      };

      expect(() => {
        testSuiteManager.configure(numericLogLevelConfig);
      }).toThrow('logLevel must be one of: trace, debug, info, warn, error');
    });

    it('should handle special characters in log level', () => {
      const specialCharsLogLevelConfig: TestConfiguration = {
        ...testConfig,
        logLevel: '@#$%' as any
      };

      expect(() => {
        testSuiteManager.configure(specialCharsLogLevelConfig);
      }).toThrow('logLevel must be one of: trace, debug, info, warn, error');
    });

    it('should accept valid log levels', async () => {
      const validLogLevels = ['trace', 'debug', 'info', 'warn', 'error'];
      
      for (const logLevel of validLogLevels) {
        const validConfig: TestConfiguration = {
          ...testConfig,
          logLevel: logLevel as any
        };

        testSuiteManager.configure(validConfig);
        
        // Should not throw for valid log levels
        await expect(testSuiteManager.initializeLogLibrary()).resolves.not.toThrow();
      }
    });
  });

  describe('Execution Error Scenarios (Lines 120-132)', () => {
    it('should handle TestRunner execution errors', async () => {
      testSuiteManager.configure(testConfig);
      
      // Mock TestRunner to throw an error during execution
      const testError = new Error('Mock execution error');
      mockTestRunner.executeTests.mockRejectedValue(testError);

      const logSpy = jest.fn();
      testSuiteManager.on('log', logSpy);

      // This should trigger the catch block on lines 120-132
      const result = await testSuiteManager.executeAndGenerateReports();

      // Verify error handling
      expect(result.testResults.status).toBe('failed');
      expect(result.testResults.errorMessage).toBe('Mock execution error');
      expect(result.testResults.errorStack).toBeDefined();
      expect(result.testResults.failedScenarios).toBe(1);
      expect(result.testResults.totalScenarios).toBe(1);

      // Verify error logging
      expect(logSpy).toHaveBeenCalledWith('[ERROR] Test suite execution failed: Mock execution error');
    });

    it('should handle non-Error exceptions', async () => {
      testSuiteManager.configure(testConfig);
      
      // Mock TestRunner to throw a non-Error object
      mockTestRunner.executeTests.mockRejectedValue('String error');

      const logSpy = jest.fn();
      testSuiteManager.on('log', logSpy);

      const result = await testSuiteManager.executeAndGenerateReports();

      // Verify error handling for non-Error objects
      expect(result.testResults.status).toBe('failed');
      expect(result.testResults.errorMessage).toBe('Unknown error');
      expect(result.testResults.errorStack).toBeUndefined();

      expect(logSpy).toHaveBeenCalledWith('[ERROR] Test suite execution failed: Unknown error');
    });

    it('should handle null/undefined exceptions', async () => {
      testSuiteManager.configure(testConfig);
      
      // Mock TestRunner to throw null
      mockTestRunner.executeTests.mockRejectedValue(null);

      const logSpy = jest.fn();
      testSuiteManager.on('log', logSpy);

      const result = await testSuiteManager.executeAndGenerateReports();

      expect(result.testResults.status).toBe('failed');
      expect(result.testResults.errorMessage).toBe('Unknown error');
      expect(logSpy).toHaveBeenCalledWith('[ERROR] Test suite execution failed: Unknown error');
    });

    it('should handle errors with undefined stack trace', async () => {
      testSuiteManager.configure(testConfig);
      
      // Create an error without stack trace
      const errorWithoutStack = new Error('Error without stack');
      delete errorWithoutStack.stack;
      
      mockTestRunner.executeTests.mockRejectedValue(errorWithoutStack);

      const result = await testSuiteManager.executeAndGenerateReports();

      expect(result.testResults.status).toBe('failed');
      expect(result.testResults.errorMessage).toBe('Error without stack');
      expect(result.testResults.errorStack).toBeUndefined();
    });

    it('should ensure running state is reset even after errors', async () => {
      testSuiteManager.configure(testConfig);
      
      expect(testSuiteManager.isRunning()).toBe(false);
      
      // Mock TestRunner to throw an error
      mockTestRunner.executeTests.mockRejectedValue(new Error('Test error'));

      await testSuiteManager.executeAndGenerateReports();

      // Verify running state is reset (finally block on line 134)
      expect(testSuiteManager.isRunning()).toBe(false);
    });
  });

  describe('Configuration Error Edge Cases', () => {
    it('should handle initializeLogLibrary without configuration', async () => {
      // Don't configure the manager
      
      await expect(testSuiteManager.initializeLogLibrary()).rejects.toThrow('Test suite manager not configured');
    });

    it('should handle multiple consecutive error scenarios', async () => {
      // Test multiple error scenarios in sequence
      
      // 1. Invalid log level during configuration
      const invalidConfig: TestConfiguration = {
        ...testConfig,
        logLevel: 'invalid' as any
      };
      
      expect(() => {
        testSuiteManager.configure(invalidConfig);
      }).toThrow('logLevel must be one of: trace, debug, info, warn, error');

      // 2. Execution error after fixing config
      testSuiteManager.configure(testConfig);
      mockTestRunner.executeTests.mockRejectedValue(new Error('Execution error'));
      
      const result = await testSuiteManager.executeAndGenerateReports();
      expect(result.testResults.status).toBe('failed');
    });

    it('should handle concurrent execution attempts', async () => {
      testSuiteManager.configure(testConfig);
      
      // Mock a slow execution
      mockTestRunner.executeTests.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({} as any), 100)));

      // Start first execution
      const execution1Promise = testSuiteManager.executeAndGenerateReports();
      
      expect(testSuiteManager.isRunning()).toBe(true);
      
      // Attempt concurrent execution
      await expect(testSuiteManager.executeAndGenerateReports()).rejects.toThrow('Test suite execution already in progress');
      
      // Wait for first execution to complete
      await execution1Promise;
      expect(testSuiteManager.isRunning()).toBe(false);
    });
  });
});