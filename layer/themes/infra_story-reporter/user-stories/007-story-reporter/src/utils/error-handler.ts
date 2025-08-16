import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { TestResult, createDefaultTestResult } from '../domain/test-result';
import { TestConfiguration } from '../domain/test-configuration';

/**
 * Common Error Handler for Story Reporter Components
 * 
 * Provides centralized error handling functionality to reduce code duplication
 * and ensure consistent error processing across all components.
 */
export class ErrorHandler {
  /**
   * Handle test execution errors and create a standardized failed result
   * @param error The error that occurred
   * @param emitter EventEmitter instance to emit log events
   * @param configuration Test configuration
   * @param startTime Test execution start time
   * @param context Context description for logging
   * @returns Failed test result
   */
  static handleTestExecutionError(
    error: unknown,
    emitter: EventEmitter,
    configuration: TestConfiguration,
    startTime: Date,
    context: string
  ): TestResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    emitter.emit('log', `[ERROR] ${context} failed: ${errorMessage}`);
    
    const failedResult = createDefaultTestResult(configuration.testSuiteId, 'failed');
    failedResult.startTime = startTime;
    failedResult.endTime = new Date();
    failedResult.errorMessage = errorMessage;
    failedResult.errorStack = error instanceof Error ? error.stack : undefined;
    failedResult.failedScenarios = 1;
    failedResult.totalScenarios = 1;
    failedResult.configuration = configuration;
    
    return failedResult;
  }

  /**
   * Handle file system operation errors
   * @param error The error that occurred
   * @param operation The file system operation that failed
   * @param emitter EventEmitter instance to emit log events
   * @throws Error with standardized message
   */
  static handleFileSystemError(
    error: unknown,
    operation: string,
    emitter: EventEmitter
  ): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    emitter.emit('log', `[ERROR] File system operation '${operation}' failed: ${errorMessage}`);
    
    throw new Error(`File system operation '${operation}' failed: ${errorMessage}`);
  }

  /**
   * Handle process management errors
   * @param error The error that occurred
   * @param processName The process that failed
   * @param emitter EventEmitter instance to emit log events
   * @throws Error with standardized message
   */
  static handleProcessError(
    error: unknown,
    processName: string,
    emitter: EventEmitter
  ): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    emitter.emit('log', `[ERROR] Process '${processName}' failed: ${errorMessage}`);
    
    throw new Error(`Process '${processName}' failed: ${errorMessage}`);
  }

  /**
   * Handle validation errors
   * @param error The error that occurred
   * @param validationType The type of validation that failed
   * @param emitter EventEmitter instance to emit log events
   * @throws Error with standardized message
   */
  static handleValidationError(
    error: unknown,
    validationType: string,
    emitter: EventEmitter
  ): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    emitter.emit('log', `[ERROR] Validation '${validationType}' failed: ${errorMessage}`);
    
    throw new Error(`Validation '${validationType}' failed: ${errorMessage}`);
  }

  /**
   * Handle configuration errors
   * @param error The error that occurred
   * @param configType The type of configuration that failed
   * @param emitter EventEmitter instance to emit log events
   * @throws Error with standardized message
   */
  static handleConfigurationError(
    error: unknown,
    configType: string,
    emitter: EventEmitter
  ): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    emitter.emit('log', `[ERROR] Configuration '${configType}' failed: ${errorMessage}`);
    
    throw new Error(`Configuration '${configType}' failed: ${errorMessage}`);
  }

  /**
   * Extract error message from unknown error type
   * @param error The error to extract message from
   * @returns Error message string
   */
  static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }

  /**
   * Extract error stack from unknown error type
   * @param error The error to extract stack from
   * @returns Error stack string or undefined
   */
  static extractErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  /**
   * Create a standardized error context object
   * @param error The error that occurred
   * @param context Additional context information
   * @returns Error context object
   */
  static createErrorContext(error: unknown, context: Record<string, any> = {}): Record<string, any> {
    return {
      errorMessage: ErrorHandler.extractErrorMessage(error),
      errorStack: ErrorHandler.extractErrorStack(error),
      timestamp: new Date().toISOString(),
      ...context
    };
  }
}