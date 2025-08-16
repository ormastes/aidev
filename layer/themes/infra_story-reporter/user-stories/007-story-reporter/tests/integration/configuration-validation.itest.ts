import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { ReportGenerator } from '../../src/external/report-generator';
import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { TestConfiguration, validateTestConfiguration } from '../../src/domain/test-configuration';
import { ReportConfig, validateReportConfig } from '../../src/domain/report-config';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';
import { ErrorHandler } from '../../src/common/error-handler';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';

describe('Configuration Validation Integration Test', () => {
  let mockLogger: MockExternalLogger;
  let testDir: string;
  let outputDir: string;
  let loggerId: string;

  beforeAll(async () => {
    testDir = join(__dirname, 'config-validation-fixtures');
    outputDir = join(testDir, 'results');
    
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create basic test fixtures
    const featureFile = join(testDir, 'test.feature');
    await fs.writeFile(featureFile, `
Feature: Configuration Validation
  Scenario: Test configuration validation
    Given I have a configuration
    When I validate it
    Then it should pass or fail appropriately
`);

    const stepDefsFile = join(testDir, 'steps.js');
    await fs.writeFile(stepDefsFile, `
const { Given, When, Then } = require('@cucumber/cucumber');
Given('I have a configuration', function () {});
When('I validate it', function () {});
Then('it should pass or fail appropriately', function () {});
`);
  });

  beforeEach(async () => {
    mockLogger = new MockExternalLogger();
    loggerId = await mockLogger.initializeLogger('config-validation-test');
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('MockFreeTestRunner Configuration Validation Integration', () => {
    it('should validate configuration before test execution', async () => {
      const validConfig: TestConfiguration = {
        testSuiteId: 'config-validation-test',
        featureFiles: [join(testDir, 'test.feature')],
        stepDefinitions: [join(testDir, 'steps.js')],
        outputDirectory: outputDir,
        logLevel: 'info'
      };

      // Should not throw with valid configuration
      expect(() => validateTestConfiguration(validConfig)).not.toThrow();

      const runner = new MockFreeTestRunner();
      
      // Set up log capture
      const capturedLogs: string[] = [];
      runner.on('log', (entry: string) => {
        capturedLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });
      
      // MockFreeTestRunner should accept valid configuration
      expect(() => runner.configure(validConfig)).not.toThrow();
      
      // Verify logger captured configuration validation
      expect(capturedLogs.some((log: string) => log.includes('Mock Free Test Oriented Development Test Runner configured'))).toBe(true);
    });

    it('should handle invalid configuration gracefully across components', async () => {
      const invalidConfig = {
        testSuiteId: '', // Invalid: empty string
        featureFiles: [], // Invalid: empty array
        stepDefinitions: null, // Invalid: null
        logLevel: 'invalid-level' // Invalid: not in allowed values
      };

      // Validation should fail
      expect(() => validateTestConfiguration(invalidConfig)).toThrow();

      const runner = new MockFreeTestRunner();
      
      // Set up log capture
      const capturedLogs: string[] = [];
      runner.on('log', (entry: string) => {
        capturedLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });
      
      // MockFreeTestRunner should handle invalid configuration with proper error handling
      expect(() => runner.configure(invalidConfig as any)).toThrow();
    });

    it('should propagate configuration errors through error handler', async () => {
      const invalidConfig = {
        testSuiteId: null,
        featureFiles: 'not-an-array',
        stepDefinitions: undefined
      };

      try {
        // This should trigger the error handler
        validateTestConfiguration(invalidConfig);
        fail('Expected validation to throw');
      } catch (error) {
        // Test error handler integration
        const context = ErrorHandler.createErrorContext(error, {
          component: 'MockFreeTestRunner',
          operation: 'configuration-validation'
        });

        expect(context.errorMessage).toContain('Invalid configuration');
        expect(context.component).toBe('MockFreeTestRunner');
        expect(context.operation).toBe('configuration-validation');
        expect(context.timestamp).toBeDefined();
      }
    });
  });

  describe('ReportGenerator Configuration Validation Integration', () => {
    it('should validate report configuration independently', async () => {
      const testConfig: TestConfiguration = {
        testSuiteId: 'report-config-test',
        featureFiles: [join(testDir, 'test.feature')],
        stepDefinitions: [join(testDir, 'steps.js')],
        outputDirectory: outputDir
      };

      const reportConfig: ReportConfig = {
        title: 'Integration Test Report',
        description: 'Testing configuration validation integration',
        includeScreenshots: true,
        includeLogs: true,
        fileNamePattern: '{testSuiteId}-{timestamp}',
        jsonFormatting: {
          indent: 2,
          sortKeys: true
        }
      };

      // Both configurations should be valid
      expect(() => validateTestConfiguration(testConfig)).not.toThrow();
      expect(() => validateReportConfig(reportConfig)).not.toThrow();

      const reportGenerator = new ReportGenerator();
      
      // Set up log capture
      const capturedLogs: string[] = [];
      reportGenerator.on('log', (entry: string) => {
        capturedLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });
      
      // ReportGenerator should accept valid configuration
      expect(() => reportGenerator.configure(testConfig)).not.toThrow();

      // Verify configuration was logged
      expect(capturedLogs.some((log: string) => log.includes('Report Generator configured'))).toBe(true);
    });

    it('should handle invalid report configuration', async () => {
      const invalidReportConfig = {
        title: 123, // Invalid: should be string
        includeScreenshots: 'yes', // Invalid: should be boolean
        jsonFormatting: 'not-an-object' // Invalid: should be object
      };

      // Report configuration validation should fail
      expect(() => validateReportConfig(invalidReportConfig)).toThrow();

      // Test error handler integration for report config
      try {
        validateReportConfig(invalidReportConfig);
        fail('Expected validation to throw');
      } catch (error) {
        const context = ErrorHandler.createErrorContext(error, {
          component: 'ReportGenerator',
          operation: 'report-config-validation'
        });

        expect(context.errorMessage).toContain('Invalid report config');
        expect(context.component).toBe('ReportGenerator');
        expect(context.operation).toBe('report-config-validation');
      }
    });
  });

  describe('TestSuiteManager Configuration Validation Integration', () => {
    it('should coordinate configuration validation across components', async () => {
      const testConfig: TestConfiguration = {
        testSuiteId: 'suite-manager-test',
        featureFiles: [join(testDir, 'test.feature')],
        stepDefinitions: [join(testDir, 'steps.js')],
        outputDirectory: outputDir,
        parallel: {
          enabled: true,
          workers: 2
        },
        retry: {
          attempts: 3,
          delay: 1000
        }
      };

      // Validate configuration
      expect(() => validateTestConfiguration(testConfig)).not.toThrow();

      const suiteManager = new TestSuiteManager();
      
      // Set up log capture
      const capturedLogs: string[] = [];
      suiteManager.on('log', (entry: string) => {
        capturedLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });
      
      // TestSuiteManager should validate and coordinate all component configurations
      expect(() => suiteManager.configure(testConfig)).not.toThrow();

      // Verify configuration propagation was logged
      expect(capturedLogs.some((log: string) => log.includes('Test Suite Manager configured'))).toBe(true);
    });

    it('should validate complex configuration structures', async () => {
      const complexConfig: TestConfiguration = {
        testSuiteId: 'complex-config-test',
        featureFiles: [join(testDir, 'test.feature')],
        stepDefinitions: [join(testDir, 'steps.js')],
        outputDirectory: outputDir,
        outputFormats: ['json', 'html', 'xml'],
        logLevel: 'debug',
        timeout: 60000,
        tags: ['@smoke', '@regression'],
        excludeTags: ['@skip'],
        parallel: {
          enabled: true,
          workers: 4
        },
        retry: {
          attempts: 2,
          delay: 500
        },
        environment: {
          NODE_ENV: 'test',
          LOG_LEVEL: 'debug'
        }
      };

      // Complex configuration should be valid
      expect(() => validateTestConfiguration(complexConfig)).not.toThrow();

      const suiteManager = new TestSuiteManager();
      expect(() => suiteManager.configure(complexConfig)).not.toThrow();
    });
  });

  describe('Cross-Component Configuration Error Handling', () => {
    it('should handle cascading configuration errors across components', async () => {
      const problematicConfig = {
        testSuiteId: null, // Will cause validation error
        featureFiles: [], // Will cause validation error
        stepDefinitions: undefined, // Will cause validation error
        timeout: -1, // Will cause validation error
        logLevel: 'invalid' // Will cause validation error
      };

      // Test error propagation through multiple components
      const components = [
        () => new MockFreeTestRunner(),
        () => new ReportGenerator(),
        () => new TestSuiteManager()
      ];

      for (const createComponent of components) {
        const component = createComponent();
        
        expect(() => {
          (component as any).configure(problematicConfig);
        }).toThrow();
      }
    });

    it('should maintain component isolation during configuration errors', async () => {
      const validConfig: TestConfiguration = {
        testSuiteId: 'isolation-test',
        featureFiles: [join(testDir, 'test.feature')],
        stepDefinitions: [join(testDir, 'steps.js')],
        outputDirectory: outputDir
      };

      const bddRunner = new MockFreeTestRunner();
      const reportGenerator = new ReportGenerator();

      // Set up log capture for both components
      const bddLogs: string[] = [];
      const reportLogs: string[] = [];
      
      bddRunner.on('log', (entry: string) => {
        bddLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });
      
      reportGenerator.on('log', (entry: string) => {
        reportLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      // Configure Mock Free Test Oriented Development runner In Progress
      expect(() => bddRunner.configure(validConfig)).not.toThrow();

      // Configure report generator with same valid config (should also work)
      expect(() => reportGenerator.configure(validConfig)).not.toThrow();

      // Both components should have logged their configuration
      expect(bddLogs.some((log: string) => log.includes('Mock Free Test Oriented Development Test Runner configured'))).toBe(true);
      expect(reportLogs.some((log: string) => log.includes('Report Generator configured'))).toBe(true);
    });
  });

  describe('Configuration Validation Performance Integration', () => {
    it('should handle rapid configuration changes efficiently', async () => {
      const baseConfig: TestConfiguration = {
        testSuiteId: 'performance-test',
        featureFiles: [join(testDir, 'test.feature')],
        stepDefinitions: [join(testDir, 'steps.js')],
        outputDirectory: outputDir
      };

      const bddRunner = new MockFreeTestRunner();
      
      const startTime = Date.now();
      
      // Perform multiple configuration changes rapidly
      for (let i = 0; i < 10; i++) {
        const config = {
          ...baseConfig,
          testSuiteId: `performance-test-${i}`,
          timeout: 1000 + (i * 100)
        };
        
        expect(() => validateTestConfiguration(config)).not.toThrow();
        expect(() => bddRunner.configure(config)).not.toThrow();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Configuration changes should be fast (under 1 second for 10 changes)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Error Handler Integration with Validation', () => {
    it('should integrate error handler with validation across all components', async () => {
      const invalidConfigs = [
        { testSuiteId: '', featureFiles: [], stepDefinitions: [] }, // Mock Free Test Oriented Development Config
        { title: null, includeScreenshots: 'invalid' }, // Report Config
        { testSuiteId: 123, timeout: 'not-a-number' } // General Config
      ];

      const validationErrors: any[] = [];

      for (const config of invalidConfigs) {
        try {
          if (config.hasOwnProperty('title')) {
            validateReportConfig(config);
          } else {
            validateTestConfiguration(config);
          }
        } catch (error) {
          const context = ErrorHandler.createErrorContext(error, {
            configType: config.hasOwnProperty('title') ? 'report' : 'test'
          });
          validationErrors.push(context);
        }
      }

      // Should have captured all validation errors
      expect(validationErrors).toHaveLength(3);
      
      // All errors should have proper context
      validationErrors.forEach(error => {
        expect(error.errorMessage).toBeDefined();
        expect(error.timestamp).toBeDefined();
        expect(error.configType).toBeDefined();
      });
    });
  });
});