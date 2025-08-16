/**
 * Error Handler for batch processing
 * Provides error recovery and retry mechanisms
 */

import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ProcessingError {
  id: string;
  type: 'parsing' | 'generation' | 'export' | 'io' | 'unknown';
  severity: 'critical' | 'error' | 'warning';
  source: string;
  message: string;
  stack?: string;
  context?: any;
  timestamp: Date;
  retryCount?: number;
  resolved?: boolean;
}

export interface ErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  continueOnError?: boolean;
  logErrors?: boolean;
  errorLogPath?: string;
  categorizeErrors?: boolean;
}

export interface ErrorStatistics {
  totalErrors: number;
  criticalErrors: number;
  regularErrors: number;
  warnings: number;
  resolvedErrors: number;
  unresolvedErrors: number;
  errorsByType: Map<string, number>;
  errorsBySeverity: Map<string, number>;
}

export interface RecoveryStrategy {
  type: 'retry' | 'skip' | 'fallback' | 'abort';
  action?: () => Promise<any>;
  fallbackValue?: any;
  maxAttempts?: number;
}

export class ErrorHandler extends EventEmitter {
  private options: ErrorHandlingOptions;
  private errors: Map<string, ProcessingError> = new Map();
  private errorLog: string[] = [];
  private statistics: ErrorStatistics;
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();

  constructor(options: ErrorHandlingOptions = {}) {
    super();
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      continueOnError: true,
      logErrors: true,
      categorizeErrors: true,
      ...options
    };

    this.statistics = {
      totalErrors: 0,
      criticalErrors: 0,
      regularErrors: 0,
      warnings: 0,
      resolvedErrors: 0,
      unresolvedErrors: 0,
      errorsByType: new Map(),
      errorsBySeverity: new Map()
    };

    this.initializeDefaultStrategies();
  }

  /**
   * Handle an error with recovery strategy
   */
  async handleError(
    error: Error | ProcessingError,
    source: string,
    context?: any
  ): Promise<boolean> {
    const processingError = this.normalizeError(error, source, context);
    
    // Add to error collection
    this.addError(processingError);
    
    // Log error if enabled
    if (this.options.logErrors) {
      await this.logError(processingError);
    }
    
    // Emit error event
    this.emit('error', processingError);
    
    // Determine recovery strategy
    const strategy = this.getRecoveryStrategy(processingError);
    
    // Execute recovery
    return await this.executeRecovery(processingError, strategy);
  }

  /**
   * Retry a failed operation
   */
  async retry<T>(
    operation: () => Promise<T>,
    errorContext: string,
    maxAttempts?: number
  ): Promise<T> {
    const attempts = maxAttempts || this.options.maxRetries || 3;
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await operation();
        
        // Mark as resolved if it was previously errored
        const errorId = this.generateErrorId(errorContext, 'retry');
        if (this.errors.has(errorId)) {
          const error = this.errors.get(errorId)!;
          error.resolved = true;
          this.statistics.resolvedErrors++;
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        const processingError: ProcessingError = {
          id: this.generateErrorId(errorContext, 'retry'),
          type: 'unknown',
          severity: 'error',
          source: errorContext,
          message: lastError.message,
          stack: lastError.stack,
          timestamp: new Date(),
          retryCount: attempt
        };
        
        this.addError(processingError);
        
        // Wait before retry
        if (attempt < attempts) {
          await this.delay(this.options.retryDelay! * attempt);
          this.emit('retry', { attempt, maxAttempts: attempts, error: processingError });
        }
      }
    }
    
    throw lastError || new Error('Retry failed');
  }

  /**
   * Register custom recovery strategy
   */
  async registerStrategy(errorType: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * Get error statistics
   */
  async getStatistics(): ErrorStatistics {
    return { ...this.statistics };
  }

  /**
   * Get all errors
   */
  async getErrors(): ProcessingError[] {
    return Array.from(this.errors.values());
  }

  /**
   * Get unresolved errors
   */
  async getUnresolvedErrors(): ProcessingError[] {
    return Array.from(this.errors.values()).filter(e => !e.resolved);
  }

  /**
   * Clear error history
   */
  async clear(): void {
    this.errors.clear();
    this.errorLog = [];
    this.statistics = {
      totalErrors: 0,
      criticalErrors: 0,
      regularErrors: 0,
      warnings: 0,
      resolvedErrors: 0,
      unresolvedErrors: 0,
      errorsByType: new Map(),
      errorsBySeverity: new Map()
    };
  }

  /**
   * Export error report
   */
  async exportReport(outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date(),
      statistics: this.statistics,
      errors: this.getErrors(),
      unresolvedErrors: this.getUnresolvedErrors(),
      errorLog: this.errorLog
    };
    
    await fileAPI.createFile(outputPath, JSON.stringify(report, { type: FileType.TEMPORARY }),
      'utf-8'
    );
  }

  private async initializeDefaultStrategies(): void {
    // Parsing errors - retry with fallback
    this.recoveryStrategies.set('parsing', {
      type: 'retry',
      maxAttempts: 2
    });
    
    // Generation errors - skip and continue
    this.recoveryStrategies.set('generation', {
      type: 'skip'
    });
    
    // Export errors - retry
    this.recoveryStrategies.set('export', {
      type: 'retry',
      maxAttempts: 3
    });
    
    // IO errors - retry with delay
    this.recoveryStrategies.set('io', {
      type: 'retry',
      maxAttempts: 3
    });
    
    // Critical errors - abort
    this.recoveryStrategies.set('critical', {
      type: 'abort'
    });
  }

  private async normalizeError(
    error: Error | ProcessingError,
    source: string,
    context?: any
  ): ProcessingError {
    if (this.isProcessingError(error)) {
      return error;
    }
    
    const errorObj = error as Error;
    const type = this.categorizeError(errorObj);
    const severity = this.determineSeverity(errorObj, type);
    
    return {
      id: this.generateErrorId(source, type),
      type,
      severity,
      source,
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      timestamp: new Date()
    };
  }

  private async isProcessingError(error: any): error is ProcessingError {
    return error && typeof error === 'object' && 'id' in error && 'type' in error;
  }

  private async categorizeError(error: Error): ProcessingError['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('parse') || message.includes('syntax')) {
      return 'parsing';
    }
    if (message.includes('generate') || message.includes('template')) {
      return 'generation';
    }
    if (message.includes('export') || message.includes('format')) {
      return 'export';
    }
    if (message.includes('file') || message.includes('directory') || message.includes('enoent')) {
      return 'io';
    }
    
    return 'unknown';
  }

  private async determineSeverity(
    error: Error,
    type: ProcessingError['type']
  ): ProcessingError['severity'] {
    // Critical errors that should stop processing
    if (type === 'io' && error.message.includes('EACCES')) {
      return 'critical';
    }
    
    // Warnings that can be ignored
    if (error.message.includes('deprecated') || error.message.includes('warning')) {
      return 'warning';
    }
    
    // Default to error
    return 'error';
  }

  private async generateErrorId(source: string, type: string): string {
    return `${source}-${type}-${Date.now()}`;
  }

  private async addError(error: ProcessingError): void {
    this.errors.set(error.id, error);
    this.statistics.totalErrors++;
    
    // Update severity statistics
    switch (error.severity) {
      case 'critical':
        this.statistics.criticalErrors++;
        break;
      case 'error':
        this.statistics.regularErrors++;
        break;
      case 'warning':
        this.statistics.warnings++;
        break;
    }
    
    // Update type statistics
    const typeCount = this.statistics.errorsByType.get(error.type) || 0;
    this.statistics.errorsByType.set(error.type, typeCount + 1);
    
    const severityCount = this.statistics.errorsBySeverity.get(error.severity) || 0;
    this.statistics.errorsBySeverity.set(error.severity, severityCount + 1);
    
    if (!error.resolved) {
      this.statistics.unresolvedErrors++;
    }
  }

  private async getRecoveryStrategy(error: ProcessingError): RecoveryStrategy {
    // Check for specific strategy
    if (this.recoveryStrategies.has(error.type)) {
      return this.recoveryStrategies.get(error.type)!;
    }
    
    // Check for severity-based strategy
    if (error.severity === 'critical') {
      return this.recoveryStrategies.get('critical') || { type: 'abort' };
    }
    
    // Default strategy
    return {
      type: this.options.continueOnError ? 'skip' : 'abort'
    };
  }

  private async executeRecovery(
    error: ProcessingError,
    strategy: RecoveryStrategy
  ): Promise<boolean> {
    switch (strategy.type) {
      case 'retry':
        if ((error.retryCount || 0) < (strategy.maxAttempts || this.options.maxRetries!)) {
          await this.delay(this.options.retryDelay!);
          return true; // Allow retry
        }
        return false;
      
      case 'skip':
        this.emit('skip', error);
        return true; // Continue processing
      
      case 'fallback':
        if (strategy.action) {
          try {
            await strategy.action();
            error.resolved = true;
            this.statistics.resolvedErrors++;
            return true;
          } catch (fallbackError) {
            return false;
          }
        }
        return false;
      
      case 'abort':
        this.emit('abort', error);
        return false; // Stop processing
      
      default:
        return this.options.continueOnError!;
    }
  }

  private async logError(error: ProcessingError): Promise<void> {
    const logEntry = `[${error.timestamp.toISOString()}] ${error.severity.toUpperCase()}: ${error.message} (${error.source})`;
    this.errorLog.push(logEntry);
    
    // Write to file if path is specified
    if (this.options.errorLogPath) {
      try {
        await fileAPI.writeFile(this.options.errorLogPath, logEntry + '\n', { append: true });
      } catch (writeError) {
        // Silently fail on log write errors
        console.error('Failed to write to error log:', writeError);
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ErrorHandler;