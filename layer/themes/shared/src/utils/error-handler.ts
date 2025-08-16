/**
 * Shared error handling utilities to reduce code duplication across themes
 */

export interface ErrorContext {
  operation: string;
  component?: string;
  details?: Record<string, any>;
}

export interface ErrorResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    context?: ErrorContext;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCallback?: (error: Error, context?: ErrorContext) => void;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  setErrorCallback(callback: (error: Error, context?: ErrorContext) => void): void {
    this.errorCallback = callback;
  }

  async handleAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<ErrorResult<T>> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }

  handle<T>(
    operation: () => T,
    context: ErrorContext
  ): ErrorResult<T> {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }

  private handleError(error: Error, context: ErrorContext): ErrorResult {
    if (this.errorCallback) {
      this.errorCallback(error, context);
    }

    const errorCode = this.extractErrorCode(error);
    const message = this.formatErrorMessage(error, context);

    console.error(`[${context.component || 'System'}] ${context.operation} failed:`, {
      message: error.message,
      code: errorCode,
      details: context.details,
      stack: error.stack
    });

    return {
      success: false,
      error: {
        message,
        code: errorCode,
        context
      }
    };
  }

  private extractErrorCode(error: Error): string | undefined {
    if ('code' in error && typeof (error as any).code === 'string') {
      return (error as any).code;
    }
    if (error.name && error.name !== 'Error') {
      return error.name;
    }
    return undefined;
  }

  private formatErrorMessage(error: Error, context: ErrorContext): string {
    const baseMessage = error.message || 'An unknown error occurred';
    const component = context.component ? `[${context.component}] ` : '';
    return `${component}${context.operation} failed: ${baseMessage}`;
  }

  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    exponentialBackoff: boolean = true
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = exponentialBackoff 
            ? delayMs * Math.pow(2, attempt - 1)
            : delayMs;
          
          console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  static createSafeWrapper<T extends (...args: any[]) => any>(
    fn: T,
    defaultValue?: ReturnType<T>
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        console.error(`Function ${fn.name || "anonymous"} threw error:`, error);
        return defaultValue;
      }
    }) as T;
  }
}

export const errorHandler = ErrorHandler.getInstance();

export function withErrorHandling<T extends (...args: any[]) => any>(
  context: ErrorContext
) {
  return function decorator(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const extendedContext = {
        ...context,
        component: target.constructor.name,
        operation: propertyKey
      };

      const handler = ErrorHandler.getInstance();
      
      if (originalMethod.constructor.name === "AsyncFunction") {
        return handler.handleAsync(
          () => originalMethod.apply(this, args),
          extendedContext
        );
      } else {
        return handler.handle(
          () => originalMethod.apply(this, args),
          extendedContext
        );
      }
    };

    return descriptor;
  };
}