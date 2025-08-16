/**
 * Request Logging Middleware
 * Comprehensive request/response logging with performance metrics
 */

import { Request, Response, NextFunction } from 'express';
import { ExternalLogService } from '../services/ExternalLogService';
import { DatabaseService } from '../services/DatabaseService';
import { crypto } from '../../../../../infra_external-log-lib/src';

export interface RequestLog {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  headers: Record<string, string>;
  ip: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  statusCode?: number;
  responseTime?: number;
  responseSize?: number;
  error?: string;
  level: 'info' | 'warn' | 'error';
}

export interface LoggingOptions {
  logBody?: boolean;
  logHeaders?: boolean;
  logQuery?: boolean;
  logResponse?: boolean;
  excludePaths?: string[];
  excludePatterns?: RegExp[];
  sensitiveFields?: string[];
  maxBodySize?: number;
  persistToDatabase?: boolean;
  slowRequestThreshold?: number; // ms
  errorOnly?: boolean;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  requestsByMethod: Record<string, number>;
  requestsByPath: Record<string, number>;
  requestsByStatus: Record<string, number>;
  requestsPerMinute: number;
}

export class RequestLoggingMiddleware {
  private logger: ExternalLogService;
  private dbService: DatabaseService;
  private options: LoggingOptions;
  private requestMetrics: Map<string, number>;
  private requestHistory: RequestLog[];
  private maxHistorySize: number = 1000;
  private metricsWindow: number = 60000; // 1 minute
  private requestTimestamps: number[];

  constructor(options?: LoggingOptions) {
    this.logger = new ExternalLogService();
    this.dbService = new DatabaseService();
    this.options = {
      logBody: true,
      logHeaders: true,
      logQuery: true,
      logResponse: false,
      excludePaths: ['/health', '/health/status', '/favicon.ico'],
      excludePatterns: [],
      sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],
      maxBodySize: 10000,
      persistToDatabase: true,
      slowRequestThreshold: 1000,
      errorOnly: false,
      ...options
    };
    this.requestMetrics = new Map();
    this.requestHistory = [];
    this.requestTimestamps = [];
    
    if (this.options.persistToDatabase) {
      this.initializeDatabase();
    }
  }

  /**
   * Initialize database for request logging
   */
  private async initializeDatabase(): Promise<void> {
    await this.dbService.init();
    
    const sql = `
      CREATE TABLE IF NOT EXISTS request_logs (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        query TEXT,
        body TEXT,
        headers TEXT,
        ip TEXT NOT NULL,
        user_agent TEXT,
        user_id TEXT,
        session_id TEXT,
        status_code INTEGER,
        response_time INTEGER,
        response_size INTEGER,
        error TEXT,
        level TEXT DEFAULT 'info'
      );

      CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_request_logs_session_id ON request_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_request_logs_status_code ON request_logs(status_code);
      CREATE INDEX IF NOT EXISTS idx_request_logs_path ON request_logs(path);
    `;

    await this.dbService.run(sql);
    this.logger.info('Request logging database initialized');
  }

  /**
   * Main logging middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check if path should be excluded
      if (this.shouldExclude(req.path)) {
        return next();
      }

      // Generate request ID
      const requestId = this.generateRequestId();
      (req as any).requestId = requestId;

      // Capture start time
      const startTime = Date.now();

      // Create initial log entry
      const logEntry: RequestLog = {
        id: requestId,
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        ip: this.getClientIp(req),
        headers: this.sanitizeHeaders(req.headers),
        level: 'info'
      };

      // Add optional fields
      if (this.options.logQuery && Object.keys(req.query).length > 0) {
        logEntry.query = this.sanitizeData(req.query);
      }

      if (this.options.logBody && req.body && Object.keys(req.body).length > 0) {
        logEntry.body = this.sanitizeData(req.body, this.options.maxBodySize);
      }

      // Add user info if available
      if ((req as any).user) {
        logEntry.userId = (req as any).user.userId;
      }

      if ((req as any).session) {
        logEntry.sessionId = (req as any).session.id || (req as any).session.sessionId;
      }

      logEntry.userAgent = req.headers['user-agent'];

      // Log request
      this.logRequest(logEntry);

      // Capture response
      const originalSend = res.send;
      const originalJson = res.json;
      let responseBody: any;
      let responseSize = 0;

      res.send = function(data: any) {
        responseBody = data;
        responseSize = Buffer.byteLength(data);
        return originalSend.call(this, data);
      };

      res.json = function(data: any) {
        responseBody = data;
        responseSize = JSON.stringify(data).length;
        return originalJson.call(this, data);
      };

      // Handle response completion
      res.on('finish', async () => {
        const responseTime = Date.now() - startTime;
        
        // Update log entry
        logEntry.statusCode = res.statusCode;
        logEntry.responseTime = responseTime;
        logEntry.responseSize = responseSize;

        // Determine log level based on status code
        if (res.statusCode >= 500) {
          logEntry.level = 'error';
        } else if (res.statusCode >= 400) {
          logEntry.level = 'warn';
        }

        // Check for slow request
        if (responseTime > this.options.slowRequestThreshold!) {
          this.logger.warn(`Slow request detected: ${req.method} ${req.path} took ${responseTime}ms`);
        }

        // Log response if enabled
        if (this.options.logResponse && responseBody) {
          (logEntry as any).response = this.sanitizeData(responseBody, this.options.maxBodySize);
        }

        // Log complete request
        this.logResponse(logEntry);

        // Update metrics
        this.updateMetrics(logEntry);

        // Persist to database if enabled
        if (this.options.persistToDatabase && !this.options.errorOnly || 
            (this.options.errorOnly && res.statusCode >= 400)) {
          await this.persistLog(logEntry);
        }

        // Add to history
        this.addToHistory(logEntry);
      });

      // Handle errors
      res.on('error', (error: Error) => {
        logEntry.error = error.message;
        logEntry.level = 'error';
        this.logger.error(`Request error: ${error.message}`, { requestId });
      });

      next();
    };
  }

  /**
   * Error logging middleware
   */
  errorMiddleware() {
    return async (err: Error, req: Request, res: Response, next: NextFunction) => {
      const requestId = (req as any).requestId || this.generateRequestId();
      
      const errorLog: RequestLog = {
        id: requestId,
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        ip: this.getClientIp(req),
        headers: this.sanitizeHeaders(req.headers),
        error: err.message,
        level: 'error',
        statusCode: res.statusCode || 500
      };

      // Log error
      this.logger.error(`Request error: ${err.message}`, {
        requestId,
        stack: err.stack,
        path: req.path,
        method: req.method
      });

      // Persist error log
      if (this.options.persistToDatabase) {
        await this.persistLog(errorLog);
      }

      // Add to history
      this.addToHistory(errorLog);

      next(err);
    };
  }

  /**
   * Get request logs from database
   */
  async getRequestLogs(filters?: {
    userId?: string;
    sessionId?: string;
    startDate?: Date;
    endDate?: Date;
    method?: string;
    path?: string;
    statusCode?: number;
    level?: string;
    limit?: number;
  }): Promise<RequestLog[]> {
    let sql = 'SELECT * FROM request_logs WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.userId) {
        sql += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters.sessionId) {
        sql += ' AND session_id = ?';
        params.push(filters.sessionId);
      }

      if (filters.startDate) {
        sql += ' AND timestamp >= ?';
        params.push(filters.startDate.toISOString());
      }

      if (filters.endDate) {
        sql += ' AND timestamp <= ?';
        params.push(filters.endDate.toISOString());
      }

      if (filters.method) {
        sql += ' AND method = ?';
        params.push(filters.method);
      }

      if (filters.path) {
        sql += ' AND path LIKE ?';
        params.push(`%${filters.path}%`);
      }

      if (filters.statusCode) {
        sql += ' AND status_code = ?';
        params.push(filters.statusCode);
      }

      if (filters.level) {
        sql += ' AND level = ?';
        params.push(filters.level);
      }
    }

    sql += ' ORDER BY timestamp DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.dbService.all(sql, params);
    return rows.map(row => this.parseLogRow(row));
  }

  /**
   * Get request metrics
   */
  getMetrics(): RequestMetrics {
    const now = Date.now();
    const windowStart = now - this.metricsWindow;
    
    // Filter timestamps within window
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > windowStart);
    
    const metrics: RequestMetrics = {
      totalRequests: this.getMetricValue('total_requests'),
      successfulRequests: this.getMetricValue('successful_requests'),
      failedRequests: this.getMetricValue('failed_requests'),
      averageResponseTime: this.calculateAverageResponseTime(),
      slowRequests: this.getMetricValue('slow_requests'),
      requestsByMethod: this.getRequestsByMethod(),
      requestsByPath: this.getRequestsByPath(),
      requestsByStatus: this.getRequestsByStatus(),
      requestsPerMinute: this.requestTimestamps.length
    };

    return metrics;
  }

  /**
   * Get request history
   */
  getRequestHistory(limit?: number): RequestLog[] {
    const history = [...this.requestHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear request logs older than specified days
   */
  async clearOldLogs(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.dbService.run(
      'DELETE FROM request_logs WHERE timestamp < ?',
      [cutoffDate.toISOString()]
    );

    this.logger.info(`Cleared ${result.changes} old request logs`);
    return result.changes;
  }

  /**
   * Get slow requests
   */
  async getSlowRequests(threshold?: number, limit: number = 10): Promise<RequestLog[]> {
    const slowThreshold = threshold || this.options.slowRequestThreshold;
    
    const rows = await this.dbService.all(
      `SELECT * FROM request_logs 
       WHERE response_time > ? 
       ORDER BY response_time DESC 
       LIMIT ?`,
      [slowThreshold, limit]
    );

    return rows.map(row => this.parseLogRow(row));
  }

  /**
   * Get error requests
   */
  async getErrorRequests(limit: number = 10): Promise<RequestLog[]> {
    const rows = await this.dbService.all(
      `SELECT * FROM request_logs 
       WHERE level = 'error' OR status_code >= 500 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [limit]
    );

    return rows.map(row => this.parseLogRow(row));
  }

  /**
   * Helper: Should exclude path
   */
  private shouldExclude(path: string): boolean {
    // Check exact paths
    if (this.options.excludePaths?.includes(path)) {
      return true;
    }

    // Check patterns
    for (const pattern of this.options.excludePatterns || []) {
      if (pattern.test(path)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Generate request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
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
   * Helper: Sanitize headers
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    if (!this.options.logHeaders) {
      return {};
    }

    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      // Check if header contains sensitive data
      if (this.options.sensitiveFields?.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Helper: Sanitize data
   */
  private sanitizeData(data: any, maxSize?: number): any {
    if (!data) return data;

    // Convert to string if needed
    let str = typeof data === 'string' ? data : JSON.stringify(data);

    // Truncate if too large
    if (maxSize && str.length > maxSize) {
      str = str.substring(0, maxSize) + '...[truncated]';
      data = { truncated: true, preview: str };
    }

    // Sanitize sensitive fields
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      for (const field of this.options.sensitiveFields || []) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Helper: Log request
   */
  private logRequest(log: RequestLog): void {
    const message = `${log.method} ${log.path}`;
    this.logger.info(message, {
      requestId: log.id,
      ip: log.ip,
      userId: log.userId
    });
  }

  /**
   * Helper: Log response
   */
  private logResponse(log: RequestLog): void {
    const message = `${log.method} ${log.path} ${log.statusCode} ${log.responseTime}ms`;
    
    const logData = {
      requestId: log.id,
      statusCode: log.statusCode,
      responseTime: log.responseTime,
      responseSize: log.responseSize
    };

    switch (log.level) {
      case 'error':
        this.logger.error(message, logData);
        break;
      case 'warn':
        this.logger.warn(message, logData);
        break;
      default:
        this.logger.info(message, logData);
    }
  }

  /**
   * Helper: Persist log to database
   */
  private async persistLog(log: RequestLog): Promise<void> {
    try {
      await this.dbService.run(
        `INSERT INTO request_logs 
         (id, timestamp, method, path, query, body, headers, ip, user_agent, 
          user_id, session_id, status_code, response_time, response_size, error, level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.id,
          log.timestamp.toISOString(),
          log.method,
          log.path,
          log.query ? JSON.stringify(log.query) : null,
          log.body ? JSON.stringify(log.body) : null,
          JSON.stringify(log.headers),
          log.ip,
          log.userAgent || null,
          log.userId || null,
          log.sessionId || null,
          log.statusCode || null,
          log.responseTime || null,
          log.responseSize || null,
          log.error || null,
          log.level
        ]
      );
    } catch (error: any) {
      this.logger.error(`Failed to persist request log: ${error.message}`);
    }
  }

  /**
   * Helper: Update metrics
   */
  private updateMetrics(log: RequestLog): void {
    // Update counters
    this.incrementMetric('total_requests');
    
    if (log.statusCode && log.statusCode < 400) {
      this.incrementMetric('successful_requests');
    } else {
      this.incrementMetric('failed_requests');
    }

    if (log.responseTime && log.responseTime > this.options.slowRequestThreshold!) {
      this.incrementMetric('slow_requests');
    }

    // Update method metrics
    this.incrementMetric(`method_${log.method}`);

    // Update path metrics
    this.incrementMetric(`path_${log.path}`);

    // Update status metrics
    if (log.statusCode) {
      this.incrementMetric(`status_${log.statusCode}`);
    }

    // Update response time metrics
    if (log.responseTime) {
      const currentTotal = this.getMetricValue('total_response_time');
      const currentCount = this.getMetricValue('response_time_count');
      this.setMetricValue('total_response_time', currentTotal + log.responseTime);
      this.setMetricValue('response_time_count', currentCount + 1);
    }

    // Add timestamp for rate calculation
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Helper: Add to history
   */
  private addToHistory(log: RequestLog): void {
    this.requestHistory.push(log);
    
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Helper: Parse database row
   */
  private parseLogRow(row: any): RequestLog {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      method: row.method,
      path: row.path,
      query: row.query ? JSON.parse(row.query) : undefined,
      body: row.body ? JSON.parse(row.body) : undefined,
      headers: JSON.parse(row.headers),
      ip: row.ip,
      userAgent: row.user_agent,
      userId: row.user_id,
      sessionId: row.session_id,
      statusCode: row.status_code,
      responseTime: row.response_time,
      responseSize: row.response_size,
      error: row.error,
      level: row.level
    };
  }

  /**
   * Helper: Get metric value
   */
  private getMetricValue(key: string): number {
    return this.requestMetrics.get(key) || 0;
  }

  /**
   * Helper: Set metric value
   */
  private setMetricValue(key: string, value: number): void {
    this.requestMetrics.set(key, value);
  }

  /**
   * Helper: Increment metric
   */
  private incrementMetric(key: string): void {
    this.setMetricValue(key, this.getMetricValue(key) + 1);
  }

  /**
   * Helper: Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    const total = this.getMetricValue('total_response_time');
    const count = this.getMetricValue('response_time_count');
    return count > 0 ? total / count : 0;
  }

  /**
   * Helper: Get requests by method
   */
  private getRequestsByMethod(): Record<string, number> {
    const methods: Record<string, number> = {};
    
    for (const [key, value] of this.requestMetrics.entries()) {
      if (key.startsWith('method_')) {
        const method = key.substring(7);
        methods[method] = value;
      }
    }

    return methods;
  }

  /**
   * Helper: Get requests by path
   */
  private getRequestsByPath(): Record<string, number> {
    const paths: Record<string, number> = {};
    
    for (const [key, value] of this.requestMetrics.entries()) {
      if (key.startsWith('path_')) {
        const path = key.substring(5);
        paths[path] = value;
      }
    }

    return paths;
  }

  /**
   * Helper: Get requests by status
   */
  private getRequestsByStatus(): Record<string, number> {
    const statuses: Record<string, number> = {};
    
    for (const [key, value] of this.requestMetrics.entries()) {
      if (key.startsWith('status_')) {
        const status = key.substring(7);
        statuses[status] = value;
      }
    }

    return statuses;
  }
}

// Export singleton instance
export const requestLogger = new RequestLoggingMiddleware();