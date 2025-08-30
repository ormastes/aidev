import { EventEmitter } from 'node:events';
import { ErrorHandler } from '../../src/utils/error-handler';
import { TestConfiguration } from '../../src/domain/test-configuration';

describe("ErrorHandler", () => {
  let emitter: EventEmitter;
  let logEvents: string[];

  beforeEach(() => {
    emitter = new EventEmitter();
    logEvents = [];
    emitter.on('log', (message: string) => {
      logEvents.push(message);
    });
  });

  describe("handleTestExecutionError", () => {
    const mockConfig: TestConfiguration = {
      testSuiteId: 'test-suite-123',
      featureFiles: ['feature1.feature'],
      stepDefinitions: ['steps1.js']
    };
    const startTime = new Date('2023-01-01T10:00:00Z');

    it('should handle Error instance correctly', () => {
      const error = new Error('Test execution failed');
      error.stack = 'Stack trace here';
      
      const result = ErrorHandler.handleTestExecutionError(
        error,
        emitter,
        mockConfig,
        startTime,
        'Mock Free Test Oriented Development Test Runner'
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Test execution failed');
      expect(result.errorStack).toBe('Stack trace here');
      expect(result.testSuiteId).toBe('test-suite-123');
      expect(result.startTime).toBe(startTime);
      expect(result.failedScenarios).toBe(1);
      expect(result.totalScenarios).toBe(1);
      expect(result.configuration).toBe(mockConfig);
      expect(result.endTime).toBeInstanceOf(Date);
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe('[ERROR] Mock Free Test Oriented Development Test Runner failed: Test execution failed');
    });

    it('should handle non-Error types correctly', () => {
      const error = 'String error message';
      
      const result = ErrorHandler.handleTestExecutionError(
        error,
        emitter,
        mockConfig,
        startTime,
        'Report Generator'
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Unknown error');
      expect(result.errorStack).toBeUndefined();
      expect(result.testSuiteId).toBe('test-suite-123');
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe('[ERROR] Report Generator failed: Unknown error');
    });

    it('should handle null/undefined errors', () => {
      const result = ErrorHandler.handleTestExecutionError(
        null,
        emitter,
        mockConfig,
        startTime,
        'Test Suite Manager'
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Unknown error');
      expect(result.errorStack).toBeUndefined();
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe('[ERROR] Test Suite Manager failed: Unknown error');
    });
  });

  describe("handleFileSystemError", () => {
    it('should handle Error instance and throw with formatted message', () => {
      const error = new Error('Permission denied');
      
      expect(() => {
        ErrorHandler.handleFileSystemError(error, 'read file', emitter);
      }).toThrow("File system operation 'read file' failed: Permission denied");
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe("[ERROR] File system operation 'read file' failed: Permission denied");
    });

    it('should handle non-Error types', () => {
      const error = { message: 'Custom error' };
      
      expect(() => {
        ErrorHandler.handleFileSystemError(error, 'write file', emitter);
      }).toThrow("File system operation 'write file' failed: Unknown error");
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe("[ERROR] File system operation 'write file' failed: Unknown error");
    });
  });

  describe("handleProcessError", () => {
    it('should handle Error instance and throw with formatted message', () => {
      const error = new Error('Process crashed');
      
      expect(() => {
        ErrorHandler.handleProcessError(error, 'cucumber-runner', emitter);
      }).toThrow("Process 'cucumber-runner' failed: Process crashed");
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe("[ERROR] Process 'cucumber-runner' failed: Process crashed");
    });

    it('should handle non-Error types', () => {
      const error = 42;
      
      expect(() => {
        ErrorHandler.handleProcessError(error, 'test-process', emitter);
      }).toThrow("Process 'test-process' failed: Unknown error");
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe("[ERROR] Process 'test-process' failed: Unknown error");
    });
  });

  describe("handleValidationError", () => {
    it('should handle Error instance and throw with formatted message', () => {
      const error = new Error('Invalid configuration');
      
      expect(() => {
        ErrorHandler.handleValidationError(error, 'test-config', emitter);
      }).toThrow("Validation 'test-config' failed: Invalid configuration");
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe("[ERROR] Validation 'test-config' failed: Invalid configuration");
    });

    it('should handle non-Error types', () => {
      const error: any[] = [];
      
      expect(() => {
        ErrorHandler.handleValidationError(error, 'report-config', emitter);
      }).toThrow("Validation 'report-config' failed: Unknown error");
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe("[ERROR] Validation 'report-config' failed: Unknown error");
    });
  });

  describe("handleConfigurationError", () => {
    it('should handle Error instance and throw with formatted message', () => {
      const error = new Error('Missing required field');
      
      expect(() => {
        ErrorHandler.handleConfigurationError(error, 'bdd-config', emitter);
      }).toThrow("Configuration 'bdd-config' failed: Missing required field");
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe("[ERROR] Configuration 'bdd-config' failed: Missing required field");
    });

    it('should handle non-Error types', () => {
      const error = true;
      
      expect(() => {
        ErrorHandler.handleConfigurationError(error, 'output-config', emitter);
      }).toThrow("Configuration 'output-config' failed: Unknown error");
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0]).toBe("[ERROR] Configuration 'output-config' failed: Unknown error");
    });
  });

  describe("extractErrorMessage", () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(ErrorHandler.extractErrorMessage(error)).toBe('Test error message');
    });

    it('should return string error as-is', () => {
      const error = 'String error';
      expect(ErrorHandler.extractErrorMessage(error)).toBe('String error');
    });

    it('should return "Unknown error" for other types', () => {
      expect(ErrorHandler.extractErrorMessage(null)).toBe('Unknown error');
      expect(ErrorHandler.extractErrorMessage(undefined)).toBe('Unknown error');
      expect(ErrorHandler.extractErrorMessage(123)).toBe('Unknown error');
      expect(ErrorHandler.extractErrorMessage({})).toBe('Unknown error');
      expect(ErrorHandler.extractErrorMessage([])).toBe('Unknown error');
    });
  });

  describe("extractErrorStack", () => {
    it('should extract stack from Error instance', () => {
      const error = new Error('Test error');
      error.stack = 'Stack trace content';
      expect(ErrorHandler.extractErrorStack(error)).toBe('Stack trace content');
    });

    it('should return undefined for Error without stack', () => {
      const error = new Error('Test error');
      delete error.stack;
      expect(ErrorHandler.extractErrorStack(error)).toBeUndefined();
    });

    it('should return undefined for non-Error types', () => {
      expect(ErrorHandler.extractErrorStack('string')).toBeUndefined();
      expect(ErrorHandler.extractErrorStack(null)).toBeUndefined();
      expect(ErrorHandler.extractErrorStack({})).toBeUndefined();
    });
  });

  describe("createErrorContext", () => {
    it('should create context with Error instance', () => {
      const error = new Error('Context test error');
      error.stack = 'Stack trace for context';
      const additionalContext = { operation: 'test-operation', userId: '123' };
      
      const context = ErrorHandler.createErrorContext(error, additionalContext);
      
      expect(context.errorMessage).toBe('Context test error');
      expect(context.errorStack).toBe('Stack trace for context');
      expect(context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(context.operation).toBe('test-operation');
      expect(context.userId).toBe('123');
    });

    it('should create context with non-Error types', () => {
      const error = 'Simple error string';
      
      const context = ErrorHandler.createErrorContext(error);
      
      expect(context.errorMessage).toBe('Simple error string');
      expect(context.errorStack).toBeUndefined();
      expect(context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle empty additional context', () => {
      const error = new Error('Test without additional context');
      
      const context = ErrorHandler.createErrorContext(error);
      
      expect(context.errorMessage).toBe('Test without additional context');
      expect(context.timestamp).toBeDefined();
      expect(Object.keys(context)).toHaveLength(3); // errorMessage, errorStack, timestamp
    });

    it('should handle null/undefined errors', () => {
      const context = ErrorHandler.createErrorContext(null, { customField: 'value' });
      
      expect(context.errorMessage).toBe('Unknown error');
      expect(context.errorStack).toBeUndefined();
      expect(context.customField).toBe('value');
      expect(context.timestamp).toBeDefined();
    });
  });
});