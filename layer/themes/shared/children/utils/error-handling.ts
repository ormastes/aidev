/**
 * Shared error handling utilities for all themes
 */

import { Ora } from 'ora';

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

/**
 * Standard success response interface
 */
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
}

export type Result<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Wraps an async operation with standard error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  spinner?: Ora
): Promise<Result<T>> {
  try {
    const result = await operation();
    if (spinner) {
      spinner.succeed();
    }
    return { success: true, data: result };
  } catch (error) {
    const errorString = error instanceof Error ? error.message : String(error);
    if (spinner) {
      spinner.fail(`${errorMessage}: ${errorString}`);
    }
    return { 
      success: false, 
      error: errorMessage,
      details: errorString
    };
  }
}

/**
 * Wraps a sync operation with standard error handling
 */
export function withSyncErrorHandling<T>(
  operation: () => T,
  errorMessage: string
): Result<T> {
  try {
    const result = operation();
    return { success: true, data: result };
  } catch (error) {
    const errorString = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      error: errorMessage,
      details: errorString
    };
  }
}

/**
 * Creates a standardized error object
 */
export function createError(message: string, code?: string, details?: any): Error {
  const error = new Error(message);
  (error as any).code = code;
  (error as any).details = details;
  return error;
}

/**
 * Type guard for error responses
 */
export function isError<T>(result: Result<T>): result is ErrorResponse {
  return !result.success;
}

/**
 * Type guard for success responses
 */
export function isSuccess<T>(result: Result<T>): result is SuccessResponse<T> {
  return result.success;
}

/**
 * Retries an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Aggregates multiple errors into a single error message
 */
export function aggregateErrors(errors: Error[]): Error {
  if (errors.length === 0) {
    return new Error('No errors');
  }
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  const messages = errors.map(e => e.message).join('; ');
  return createError(`Multiple errors occurred: ${messages}`, 'MULTIPLE_ERRORS', errors);
}