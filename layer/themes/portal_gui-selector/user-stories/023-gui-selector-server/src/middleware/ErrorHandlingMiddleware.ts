/**
 * Error Handling Middleware
 * Comprehensive error handling, recovery, and reporting
 */

import { Request, Response, NextFunction } from 'express';
import { ExternalLogService } from '../services/ExternalLogService';
import { DatabaseService } from '../services/DatabaseService';
import { crypto } from '../../../../../infra_external-log-lib/src';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = "critical"
}

export enum ErrorCategory {
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  DATABASE = "database",
  NETWORK = 'network',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorDetails {
  id: string;
  timestamp: Date;
  message: string;
  code?: string;
  statusCode: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  resolution?: string;
  recovered?: boolean;
}

export interface ErrorHandlingOptions {
  logErrors?: boolean;
  persistErrors?: boolean;
  includeStackTrace?: boolean;
  notifyOnCritical?: boolean;
  customErrorPages?: boolean;
  errorPageTemplate?: string;
  maxErrorHistorySize?: number;
  recoveryStrategies?: Map<string, RecoveryStrategy>;
}

export interface RecoveryStrategy {
  name: string;
  condition: (error: Error) => boolean;
  recover: (error: Error, req: Request, res: Response) => Promise<boolean>;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByStatusCode: Record<string, number>;
  recentErrors: ErrorDetails[];
  criticalErrors: number;
  recoveredErrors: number;
  errorRate: number; // errors per minute
}

export class ApplicationError extends Error {
  public statusCode: number;
  public code?: string;
  public severity: ErrorSeverity;
  public category: ErrorCategory;
  public context?: Record<string, any>;
  public resolution?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    options?: {
      code?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: Record<string, any>;
      resolution?: string;
    }
  ) {
    super(message);
    this.name = "ApplicationError";
    this.statusCode = statusCode;
    this.code = options?.code;
    this.severity = options?.severity || ErrorSeverity.MEDIUM;
    this.category = options?.category || ErrorCategory.UNKNOWN;
    this.context = options?.context;
    this.resolution = options?.resolution;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, {
      code: 'VALIDATION_ERROR',
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      context
    });
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, {
      code: 'AUTH_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.AUTHENTICATION
    });
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, {
      code: 'AUTHZ_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.AUTHORIZATION
    });
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, {
      code: 'NOT_FOUND',
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.BUSINESS_LOGIC
    });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, 409, {
      code: "CONFLICT",
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.BUSINESS_LOGIC
    });
    this.name = "ConflictError";
  }
}

export class RateLimitError extends ApplicationError {
  constructor(retryAfter?: number) {
    super('Too many requests', 429, {
      code: 'RATE_LIMIT',
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.NETWORK,
      context: { retryAfter }
    });
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, {
      code: 'DB_ERROR',
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.DATABASE,
      context: { originalError: originalError?.message }
    });
    this.name = "DatabaseError";
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string, originalError?: Error) {
    super(message, 502, {
      code: 'NETWORK_ERROR',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.NETWORK,
      context: { originalError: originalError?.message }
    });
    this.name = "NetworkError";
  }
}

export class ErrorHandlingMiddleware {
  private logger: ExternalLogService;
  private dbService: DatabaseService;
  private options: ErrorHandlingOptions;
  private errorHistory: ErrorDetails[];
  private errorTimestamps: number[];
  private recoveryStrategies: Map<string, RecoveryStrategy>;

  constructor(options?: ErrorHandlingOptions) {
    this.logger = new ExternalLogService();
    this.dbService = new DatabaseService();
    this.options = {
      logErrors: true,
      persistErrors: true,
      includeStackTrace: process.env.NODE_ENV !== "production",
      notifyOnCritical: true,
      customErrorPages: false,
      maxErrorHistorySize: 100,
      ...options
    };
    this.errorHistory = [];
    this.errorTimestamps = [];
    this.recoveryStrategies = options?.recoveryStrategies || new Map();
    
    this.initializeDefaultRecoveryStrategies();
    
    if (this.options.persistErrors) {
      this.initializeDatabase();
    }
  }

  /**
   * Initialize database for error logging
   */
  private async initializeDatabase(): Promise<void> {
    await this.dbService.init();
    
    const sql = `
      CREATE TABLE IF NOT EXISTS error_logs (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        message TEXT NOT NULL,
        code TEXT,
        status_code INTEGER NOT NULL,
        severity TEXT NOT NULL,
        category TEXT NOT NULL,
        stack TEXT,
        context TEXT,
        user_id TEXT,
        session_id TEXT,
        request_id TEXT,
        path TEXT,
        method TEXT,
        ip TEXT,
        user_agent TEXT,
        resolution TEXT,
        recovered INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
      CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
      CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
    `;

    await this.dbService.run(sql);
    this.logger.info('Error logging database initialized');
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultRecoveryStrategies(): void {
    // Database connection recovery
    this.registerRecoveryStrategy({
      name: 'database_reconnect',
      condition: (error) => error.message.includes("database") || error.message.includes('SQLITE'),
      recover: async (error, req, res) => {
        try {
          await this.dbService.init();
          this.logger.info('Database connection recovered');
          return true;
        } catch (recoveryError) {
          this.logger.error('Database recovery failed');
          return false;
        }
      }
    });

    // Rate limit recovery
    this.registerRecoveryStrategy({
      name: 'rate_limit_retry',
      condition: (error) => error instanceof RateLimitError,
      recover: async (error, req, res) => {
        const retryAfter = (error as RateLimitError).context?.retryAfter || 60;
        res.setHeader('Retry-After', retryAfter.toString());
        return false; // Don't auto-recover, let client retry
      }
    });

    // Session recovery
    this.registerRecoveryStrategy({
      name: 'session_recovery',
      condition: (error) => error.message.includes('session'),
      recover: async (error, req, res) => {
        try {
          // Clear and regenerate session
          if ((req as any).session) {
            await (req as any).session.regenerate();
            this.logger.info('Session recovered');
            return true;
          }
          return false;
        } catch (recoveryError) {
          return false;
        }
      }
    });
  }

  /**
   * Register recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.name, strategy);
    this.logger.info(`Registered recovery strategy: ${strategy.name}`);
  }

  /**
   * Main error handling middleware
   */
  middleware() {
    return async (err: Error | ApplicationError, req: Request, res: Response, next: NextFunction) => {
      // Generate error ID
      const errorId = this.generateErrorId();
      
      // Extract error details
      const errorDetails = this.extractErrorDetails(err, req, errorId);
      
      // Log error
      if (this.options.logErrors) {
        this.logError(errorDetails);
      }

      // Attempt recovery
      let recovered = false;
      if (errorDetails.severity !== ErrorSeverity.CRITICAL) {
        recovered = await this.attemptRecovery(err, req, res);
        errorDetails.recovered = recovered;
      }

      // Persist error
      if (this.options.persistErrors) {
        await this.persistError(errorDetails);
      }

      // Add to history
      this.addToHistory(errorDetails);

      // Notify if critical
      if (this.options.notifyOnCritical && errorDetails.severity === ErrorSeverity.CRITICAL) {
        await this.notifyCriticalError(errorDetails);
      }

      // Send response if not recovered
      if (!recovered && !res.headersSent) {
        this.sendErrorResponse(errorDetails, req, res);
      }
    };
  }

  /**
   * Not found handler
   */
  notFoundHandler() {
    return (req: Request, res: Response, next: NextFunction) => {
      const error = new NotFoundError(`Route ${req.path}`);
      next(error);
    };
  }

  /**
   * Async error wrapper
   */
  asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Get error statistics
   */
  getStatistics(): ErrorStatistics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Filter recent timestamps
    this.errorTimestamps = this.errorTimestamps.filter(ts => ts > oneMinuteAgo);
    
    const stats: ErrorStatistics = {
      totalErrors: this.errorHistory.length,
      errorsByCategory: {},
      errorsBySeverity: {},
      errorsByStatusCode: {},
      recentErrors: this.errorHistory.slice(-10),
      criticalErrors: 0,
      recoveredErrors: 0,
      errorRate: this.errorTimestamps.length
    };

    // Calculate statistics
    for (const error of this.errorHistory) {
      // By category
      stats.errorsByCategory[error.category] = (stats.errorsByCategory[error.category] || 0) + 1;
      
      // By severity
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
      
      // By status code
      const statusGroup = `${Math.floor(error.statusCode / 100)}xx`;
      stats.errorsByStatusCode[statusGroup] = (stats.errorsByStatusCode[statusGroup] || 0) + 1;
      
      // Critical count
      if (error.severity === ErrorSeverity.CRITICAL) {
        stats.criticalErrors++;
      }
      
      // Recovered count
      if (error.recovered) {
        stats.recoveredErrors++;
      }
    }

    return stats;
  }

  /**
   * Get error logs from database
   */
  async getErrorLogs(filters?: {
    startDate?: Date;
    endDate?: Date;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    userId?: string;
    limit?: number;
  }): Promise<ErrorDetails[]> {
    let sql = 'SELECT * FROM error_logs WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.startDate) {
        sql += ' AND timestamp >= ?';
        params.push(filters.startDate.toISOString());
      }

      if (filters.endDate) {
        sql += ' AND timestamp <= ?';
        params.push(filters.endDate.toISOString());
      }

      if (filters.severity) {
        sql += ' AND severity = ?';
        params.push(filters.severity);
      }

      if (filters.category) {
        sql += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.userId) {
        sql += ' AND user_id = ?';
        params.push(filters.userId);
      }
    }

    sql += ' ORDER BY timestamp DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.dbService.all(sql, params);
    return rows.map(row => this.parseErrorRow(row));
  }

  /**
   * Clear old error logs
   */
  async clearOldErrors(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.dbService.run(
      'DELETE FROM error_logs WHERE timestamp < ?',
      [cutoffDate.toISOString()]
    );

    this.logger.info(`Cleared ${result.changes} old error logs`);
    return result.changes;
  }

  /**
   * Helper: Extract error details
   */
  private extractErrorDetails(err: Error | ApplicationError, req: Request, errorId: string): ErrorDetails {
    const appError = err as ApplicationError;
    
    const details: ErrorDetails = {
      id: errorId,
      timestamp: new Date(),
      message: err.message,
      statusCode: appError.statusCode || 500,
      severity: appError.severity || this.determineSeverity(appError.statusCode || 500),
      category: appError.category || this.determineCategory(err),
      code: appError.code,
      stack: this.options.includeStackTrace ? err.stack : undefined,
      context: appError.context,
      requestId: (req as any).requestId,
      path: req.path,
      method: req.method,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      resolution: appError.resolution
    };

    // Add user info if available
    if ((req as any).user) {
      details.userId = (req as any).user.userId;
    }

    if ((req as any).session) {
      details.sessionId = (req as any).session.id || (req as any).session.sessionId;
    }

    return details;
  }

  /**
   * Helper: Determine severity from status code
   */
  private determineSeverity(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Helper: Determine category from error
   */
  private determineCategory(err: Error): ErrorCategory {
    const message = err.message.toLowerCase();
    
    if (message.includes("validation")) return ErrorCategory.VALIDATION;
    if (message.includes('auth')) return ErrorCategory.AUTHENTICATION;
    if (message.includes("permission") || message.includes("forbidden")) return ErrorCategory.AUTHORIZATION;
    if (message.includes("database") || message.includes('sql')) return ErrorCategory.DATABASE;
    if (message.includes('network') || message.includes('timeout')) return ErrorCategory.NETWORK;
    
    return ErrorCategory.UNKNOWN;
  }

  /**
   * Helper: Attempt recovery
   */
  private async attemptRecovery(err: Error, req: Request, res: Response): Promise<boolean> {
    for (const [name, strategy] of this.recoveryStrategies) {
      if (strategy.condition(err)) {
        try {
          const recovered = await strategy.recover(err, req, res);
          if (recovered) {
            this.logger.info(`Error recovered using strategy: ${name}`);
            return true;
          }
        } catch (recoveryError: any) {
          this.logger.error(`Recovery strategy ${name} failed: ${recoveryError.message}`);
        }
      }
    }
    return false;
  }

  /**
   * Helper: Send error response
   */
  private sendErrorResponse(error: ErrorDetails, req: Request, res: Response): void {
    // Set status code
    res.status(error.statusCode);

    // Send custom error page if enabled
    if (this.options.customErrorPages && req.accepts('html')) {
      res.send(this.renderErrorPage(error));
    } else {
      // Send JSON response
      const response: any = {
        error: {
          id: error.id,
          message: error.message,
          code: error.code,
          timestamp: error.timestamp
        }
      };

      // Add resolution hint if available
      if (error.resolution) {
        response.error.resolution = error.resolution;
      }

      // Add debug info in development
      if (process.env.NODE_ENV !== "production") {
        response.error.path = error.path;
        response.error.method = error.method;
        
        if (this.options.includeStackTrace) {
          response.error.stack = error.stack;
        }
      }

      res.json(response);
    }
  }

  /**
   * Helper: Render error page
   */
  private renderErrorPage(error: ErrorDetails): string {
    if (this.options.errorPageTemplate) {
      return this.options.errorPageTemplate
        .replace('{{statusCode}}', error.statusCode.toString())
        .replace('{{message}}', error.message)
        .replace('{{errorId}}', error.id);
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error ${error.statusCode}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #d32f2f; }
            .error-id { color: #666; font-size: 0.9em; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Error ${error.statusCode}</h1>
          <p>${error.message}</p>
          ${error.resolution ? `<p><strong>Resolution:</strong> ${error.resolution}</p>` : ''}
          <div class="error-id">Error ID: ${error.id}</div>
        </body>
      </html>
    `;
  }

  /**
   * Helper: Log error
   */
  private logError(error: ErrorDetails): void {
    const logData = {
      errorId: error.id,
      code: error.code,
      category: error.category,
      severity: error.severity,
      userId: error.userId,
      path: error.path,
      method: error.method
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        this.logger.error(error.message, logData);
        if (error.stack) {
          this.logger.error('Stack trace:', { stack: error.stack });
        }
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(error.message, logData);
        break;
      default:
        this.logger.info(error.message, logData);
    }
  }

  /**
   * Helper: Persist error
   */
  private async persistError(error: ErrorDetails): Promise<void> {
    try {
      await this.dbService.run(
        `INSERT INTO error_logs 
         (id, timestamp, message, code, status_code, severity, category, stack, 
          context, user_id, session_id, request_id, path, method, ip, user_agent, 
          resolution, recovered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          error.id,
          error.timestamp.toISOString(),
          error.message,
          error.code || null,
          error.statusCode,
          error.severity,
          error.category,
          error.stack || null,
          error.context ? JSON.stringify(error.context) : null,
          error.userId || null,
          error.sessionId || null,
          error.requestId || null,
          error.path || null,
          error.method || null,
          error.ip || null,
          error.userAgent || null,
          error.resolution || null,
          error.recovered ? 1 : 0
        ]
      );
    } catch (persistError: any) {
      this.logger.error(`Failed to persist error log: ${persistError.message}`);
    }
  }

  /**
   * Helper: Notify critical error
   */
  private async notifyCriticalError(error: ErrorDetails): Promise<void> {
    this.logger.error('CRITICAL ERROR ALERT', {
      errorId: error.id,
      message: error.message,
      category: error.category,
      userId: error.userId,
      path: error.path
    });

    // Here you could implement additional notification mechanisms:
    // - Send email
    // - Send Slack message
    // - Trigger PagerDuty alert
    // - etc.
  }

  /**
   * Helper: Add to history
   */
  private addToHistory(error: ErrorDetails): void {
    this.errorHistory.push(error);
    this.errorTimestamps.push(Date.now());

    if (this.errorHistory.length > this.options.maxErrorHistorySize!) {
      this.errorHistory = this.errorHistory.slice(-this.options.maxErrorHistorySize!);
    }
  }

  /**
   * Helper: Generate error ID
   */
  private generateErrorId(): string {
    return `err-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Helper: Get client IP
   */
  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           (req.headers['x-real-ip'] as string) ||
           req.socket.remoteAddress ||
           'unknown';
  }

  /**
   * Helper: Parse database row
   */
  private parseErrorRow(row: any): ErrorDetails {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      message: row.message,
      code: row.code,
      statusCode: row.status_code,
      severity: row.severity as ErrorSeverity,
      category: row.category as ErrorCategory,
      stack: row.stack,
      context: row.context ? JSON.parse(row.context) : undefined,
      userId: row.user_id,
      sessionId: row.session_id,
      requestId: row.request_id,
      path: row.path,
      method: row.method,
      ip: row.ip,
      userAgent: row.user_agent,
      resolution: row.resolution,
      recovered: row.recovered === 1
    };
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlingMiddleware();