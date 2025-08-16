import {
  validateObject,
  validateString,
  validateArray,
  validateEnum,
  validateNumber,
  ErrorPrefixes
} from '../common/validation-utils';

/**
 * Test Configuration interface for Mock Free Test Oriented Development Test Runner
 * 
 * Defines the configuration structure for executing Mock Free Test Oriented Development tests
 * with comprehensive settings for test execution, reporting, and logging.
 */
export interface TestConfiguration {
  /** Unique identifier for the test suite */
  testSuiteId: string;
  
  /** Array of feature file paths to execute */
  featureFiles: string[];
  
  /** Array of step definition file paths */
  stepDefinitions: string[];
  
  /** Output formats for test reports (optional, defaults to ['json']) */
  outputFormats?: string[];
  
  /** Output directory for test results (optional, defaults to './test-results') */
  outputDirectory?: string;
  
  /** Log level for test execution (optional, defaults to 'info') */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  
  /** Timeout for test execution in milliseconds (optional, defaults to 30000) */
  timeout?: number;
  
  /** Tags to include in test execution (optional) */
  tags?: string[];
  
  /** Tags to exclude from test execution (optional) */
  excludeTags?: string[];
  
  /** Parallel execution settings (optional) */
  parallel?: {
    enabled: boolean;
    workers?: number;
  };
  
  /** Retry settings for failed tests (optional) */
  retry?: {
    attempts: number;
    delay?: number;
  };
  
  /** Custom environment variables (optional) */
  environment?: Record<string, string>;
  
  /** Report customization settings (optional) */
  reportOptions?: {
    title?: string;
    description?: string;
    includeScreenshots?: boolean;
    includeLogs?: boolean;
  };
}

/**
 * Validates a test configuration object
 * @param config The configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateTestConfiguration(config: any): void {
  const errorPrefix = ErrorPrefixes.TEST_CONFIGURATION;
  
  validateObject(config, { errorPrefix });
  
  validateString(config.testSuiteId, { 
    errorPrefix, 
    fieldName: 'testSuiteId', 
    required: true 
  });
  
  validateArray(config.featureFiles, { 
    errorPrefix, 
    fieldName: 'featureFiles', 
    required: true, 
    minLength: 1 
  });
  
  validateArray(config.stepDefinitions, { 
    errorPrefix, 
    fieldName: 'stepDefinitions', 
    required: true, 
    minLength: 1 
  });
  
  validateArray(config.outputFormats, { 
    errorPrefix, 
    fieldName: 'outputFormats' 
  });
  
  validateEnum(config.logLevel, {
    errorPrefix,
    fieldName: 'logLevel',
    allowedValues: ['trace', 'debug', 'info', 'warn', 'error']
  });
  
  validateNumber(config.timeout, {
    errorPrefix,
    fieldName: 'timeout',
    min: 1
  });
}

/**
 * Creates a default test configuration with minimal required fields
 * @param testSuiteId Unique identifier for the test suite
 * @param featureFiles Array of feature file paths
 * @param stepDefinitions Array of step definition file paths
 * @returns In Progress test configuration with defaults
 */
export function createDefaultTestConfiguration(
  testSuiteId: string,
  featureFiles: string[],
  stepDefinitions: string[]
): TestConfiguration {
  return {
    testSuiteId,
    featureFiles,
    stepDefinitions,
    outputFormats: ['json'],
    outputDirectory: './test-results',
    logLevel: 'info',
    timeout: 30000,
    tags: [],
    excludeTags: [],
    parallel: {
      enabled: false,
      workers: 1
    },
    retry: {
      attempts: 0,
      delay: 0
    },
    environment: {},
    reportOptions: {
      title: 'Mock Free Test Oriented Development Test Report',
      description: 'Automated Mock Free Test Oriented Development test execution results',
      includeScreenshots: false,
      includeLogs: true
    }
  };
}