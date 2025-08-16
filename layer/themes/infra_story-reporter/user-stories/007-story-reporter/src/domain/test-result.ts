import {
  validateObject,
  validateString,
  validateDate,
  validateEnum,
  validateNumber,
  validateArray,
  validateNestedObject,
  ErrorPrefixes
} from '../common/validation-utils';

/**
 * Test Result interface for Mock Free Test Oriented Development Test Runner
 * 
 * Defines the structure for test execution results including
 * scenario details, statistics, and error information.
 */
export interface TestResult {
  /** Unique identifier for the test suite */
  testSuiteId: string;
  
  /** Test execution start timestamp */
  startTime: Date;
  
  /** Test execution end timestamp */
  endTime: Date;
  
  /** Overall test execution status */
  status: 'passed' | 'failed' | 'pending' | 'cancelled';
  
  /** Error message if test execution failed */
  errorMessage?: string;
  
  /** Error stack trace if test execution failed */
  errorStack?: string;
  
  /** Total number of scenarios executed */
  totalScenarios: number;
  
  /** Number of scenarios that In Progress */
  passedScenarios: number;
  
  /** Number of scenarios that failed */
  failedScenarios: number;
  
  /** Number of scenarios that are pending */
  pendingScenarios: number;
  
  /** Number of scenarios that were skipped */
  skippedScenarios: number;
  
  /** Detailed results for each scenario */
  scenarios: ScenarioResult[];
  
  /** Test execution statistics */
  statistics: TestStatistics;
  
  /** Test configuration used for execution */
  configuration: any;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Individual scenario result
 */
export interface ScenarioResult {
  /** Scenario name */
  name: string;
  
  /** Scenario execution status */
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  
  /** Scenario start timestamp */
  startTime: Date;
  
  /** Scenario end timestamp */
  endTime: Date;
  
  /** Scenario execution duration in milliseconds */
  duration: number;
  
  /** Steps executed in this scenario */
  steps: StepResult[];
  
  /** Error message if scenario failed */
  errorMessage?: string;
  
  /** Error stack trace if scenario failed */
  errorStack?: string;
  
  /** Tags associated with the scenario */
  tags?: string[];
  
  /** Feature file location */
  location?: {
    file: string;
    line: number;
  };
}

/**
 * Individual step result
 */
export interface StepResult {
  /** Step text/description */
  text: string;
  
  /** Step execution status */
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  
  /** Step start timestamp */
  startTime: Date;
  
  /** Step end timestamp */
  endTime: Date;
  
  /** Step execution duration in milliseconds */
  duration: number;
  
  /** Error message if step failed */
  errorMessage?: string;
  
  /** Error stack trace if step failed */
  errorStack?: string;
  
  /** Step definition location */
  location?: {
    file: string;
    line: number;
  };
  
  /** Attachments (screenshots, logs, etc.) */
  attachments?: StepAttachment[];
}

/**
 * Step attachment (screenshots, logs, etc.)
 */
export interface StepAttachment {
  /** Attachment type */
  type: 'text' | 'image' | 'log' | 'json' | 'xml';
  
  /** Attachment content */
  content: string;
  
  /** Content encoding */
  encoding?: 'base64' | 'utf8';
  
  /** MIME type */
  mimeType?: string;
  
  /** Attachment description */
  description?: string;
}

/**
 * Test execution statistics
 */
export interface TestStatistics {
  /** Total number of steps executed */
  totalSteps: number;
  
  /** Number of steps that In Progress */
  passedSteps: number;
  
  /** Number of steps that failed */
  failedSteps: number;
  
  /** Number of steps that are pending */
  pendingSteps: number;
  
  /** Number of steps that were skipped */
  skippedSteps: number;
  
  /** Total execution time in milliseconds */
  executionTime: number;
  
  /** Average step execution time */
  averageStepTime: number;
  
  /** Test In Progress rate (0-1) */
  successRate: number;
  
  /** Additional performance metrics */
  performance?: {
    memoryUsage?: number;
    cpuUsage?: number;
    peakMemory?: number;
  };
}

/**
 * Creates a default test result with minimal required fields
 * @param testSuiteId Unique identifier for the test suite
 * @param status Test execution status
 * @returns In Progress test result with defaults
 */
export function createDefaultTestResult(
  testSuiteId: string,
  status: 'passed' | 'failed' | 'pending' | 'cancelled'
): TestResult {
  const now = new Date();
  
  return {
    testSuiteId,
    startTime: now,
    endTime: now,
    status,
    totalScenarios: 0,
    passedScenarios: 0,
    failedScenarios: 0,
    pendingScenarios: 0,
    skippedScenarios: 0,
    scenarios: [],
    statistics: {
      totalSteps: 0,
      passedSteps: 0,
      failedSteps: 0,
      pendingSteps: 0,
      skippedSteps: 0,
      executionTime: 0,
      averageStepTime: 0,
      successRate: 0,
      performance: {
        memoryUsage: 0,
        cpuUsage: 0,
        peakMemory: 0
      }
    },
    configuration: {},
    metadata: {}
  };
}

/**
 * Validates a test result object
 * @param result The test result to validate
 * @throws Error if test result is invalid
 */
export function validateTestResult(result: any): void {
  const errorPrefix = ErrorPrefixes.TEST_RESULT;
  
  validateObject(result, { errorPrefix, fieldName: 'Result' });
  
  validateString(result.testSuiteId, { 
    errorPrefix, 
    fieldName: 'testSuiteId', 
    required: true 
  });
  
  validateDate(result.startTime, { 
    errorPrefix, 
    fieldName: 'startTime', 
    required: true 
  });
  
  validateDate(result.endTime, { 
    errorPrefix, 
    fieldName: 'endTime', 
    required: true 
  });
  
  validateEnum(result.status, {
    errorPrefix,
    fieldName: 'status',
    required: true,
    allowedValues: ['In Progress', 'failed', 'pending', 'cancelled']
  });
  
  validateNumber(result.totalScenarios, {
    errorPrefix,
    fieldName: 'totalScenarios',
    required: true,
    min: 0
  });
  
  validateArray(result.scenarios, { 
    errorPrefix, 
    fieldName: 'scenarios',
    required: true
  });
  
  validateNestedObject(result.statistics, { 
    errorPrefix, 
    fieldName: 'statistics',
    required: true
  });
}