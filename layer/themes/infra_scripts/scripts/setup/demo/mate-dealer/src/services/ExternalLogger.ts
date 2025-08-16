/**
 * External Logging Service
 * Provides comprehensive logging across the Mate Dealer application
 * Inspired by the React Native implementation's logging system
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class ExternalLogger {
  private static instance: ExternalLogger;
  private logs: LogEntry[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private logEndpoint: string;
  private batchSize: number = 50;
  private flushInterval: number = 5000; // 5 seconds
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string;
  private userId: string | null = null;

  private constructor() {
    this.logEndpoint = process.env.LOG_ENDPOINT || 'http://localhost:3402/api/logs';
    this.sessionId = this.generateSessionId();
    this.startBatchFlush();
  }

  static getInstance(): ExternalLogger {
    if (!ExternalLogger.instance) {
      ExternalLogger.instance = new ExternalLogger();
    }
    return ExternalLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  error(message: string, context?: string, metadata?: Record<string, any>, error?: Error): void {
    const stackTrace = error?.stack;
    this.log(LogLevel.ERROR, message, context, { ...metadata, error: error?.message }, stackTrace);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    stackTrace?: string
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      metadata,
      stackTrace
    };

    this.logs.push(logEntry);
    
    // Console output for development
    const consoleMethod = level === LogLevel.ERROR ? 'error' : 
                         level === LogLevel.WARN ? 'warn' : 
                         level === LogLevel.DEBUG ? 'debug' : 'log';
    
    console[consoleMethod](`[${level}] ${context ? `[${context}] ` : ''}${message}`, metadata || '');

    // Immediate flush for errors
    if (level === LogLevel.ERROR) {
      this.flush();
    } else if (this.logs.length >= this.batchSize) {
      this.flush();
    }
  }

  logPerformance(name: string, value: number, unit: string = 'ms', metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.performanceMetrics.push(metric);
    
    // Console output for development
    console.log(`[PERFORMANCE] ${name}: ${value}${unit}`, metadata || '');
  }

  logApiRequest(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    error?: Error
  ): void {
    const metadata = {
      method,
      url,
      statusCode,
      duration,
      error: error?.message
    };

    if (error) {
      this.error(`API Request Failed: ${method} ${url}`, 'API', metadata, error);
    } else {
      this.info(`API Request: ${method} ${url} - ${statusCode}`, 'API', metadata);
    }

    if (duration) {
      this.logPerformance(`api_request_${method.toLowerCase()}`, duration, 'ms', { url });
    }
  }

  logUserAction(action: string, details?: Record<string, any>): void {
    this.info(`User Action: ${action}`, 'USER_ACTION', details);
  }

  logNavigation(from: string, to: string, metadata?: Record<string, any>): void {
    this.info(`Navigation: ${from} → ${to}`, 'NAVIGATION', metadata);
  }

  private async flush(): Promise<void> {
    if (this.logs.length === 0 && this.performanceMetrics.length === 0) {
      return;
    }

    const logsToSend = [...this.logs];
    const metricsToSend = [...this.performanceMetrics];
    
    // Clear local buffers
    this.logs = [];
    this.performanceMetrics = [];

    try {
      const payload = {
        logs: logsToSend,
        metrics: metricsToSend,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      };

      // In a real implementation, this would send to an external service
      // For demo purposes, we'll store locally and optionally send to a logger service
      if (process.env.ENABLE_EXTERNAL_LOGGING === 'true') {
        const response = await fetch(this.logEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          console.error('Failed to send logs to external service:', response.statusText);
          // Re-add logs to buffer for retry
          this.logs.unshift(...logsToSend);
          this.performanceMetrics.unshift(...metricsToSend);
        }
      } else {
        // Store logs locally for demo
        this.storeLogsLocally(payload);
      }
    } catch (error) {
      console.error('Error flushing logs:', error);
      // Re-add logs to buffer for retry
      this.logs.unshift(...logsToSend);
      this.performanceMetrics.unshift(...metricsToSend);
    }
  }

  private storeLogsLocally(payload: any): void {
    // In a real app, this might write to a file or local database
    // For demo, we'll use localStorage in the browser or a file in Node.js
    if (typeof window !== 'undefined') {
      const existingLogs = JSON.parse(localStorage.getItem('mate_dealer_logs') || '[]');
      existingLogs.push(payload);
      // Keep only last 100 log batches
      if (existingLogs.length > 100) {
        existingLogs.shift();
      }
      localStorage.setItem('mate_dealer_logs', JSON.stringify(existingLogs));
    }
  }

  private startBatchFlush(): void {
    this.intervalId = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  stopBatchFlush(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Final flush
    this.flush();
  }

  // Get logs for debug panel
  getRecentLogs(limit: number = 100): LogEntry[] {
    if (typeof window !== 'undefined') {
      const storedLogs = JSON.parse(localStorage.getItem('mate_dealer_logs') || '[]');
      const allLogs: LogEntry[] = [];
      
      storedLogs.forEach((batch: any) => {
        if (batch.logs) {
          allLogs.push(...batch.logs);
        }
      });

      return allLogs.slice(-limit);
    }
    return this.logs.slice(-limit);
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    if (typeof window !== 'undefined') {
      const storedLogs = JSON.parse(localStorage.getItem('mate_dealer_logs') || '[]');
      const allMetrics: PerformanceMetric[] = [];
      
      storedLogs.forEach((batch: any) => {
        if (batch.metrics) {
          allMetrics.push(...batch.metrics);
        }
      });

      return allMetrics;
    }
    return this.performanceMetrics;
  }

  clearLogs(): void {
    this.logs = [];
    this.performanceMetrics = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mate_dealer_logs');
    }
  }
}

// Export singleton instance
export const logger = ExternalLogger.getInstance();

// Middleware for Express.js
export function loggingMiddleware(req: any, res: any, next: any): void {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(data: any) {
    res.send = originalSend;
    const duration = Date.now() - startTime;
    
    logger.logApiRequest(
      req.method,
      req.originalUrl || req.url,
      res.statusCode,
      duration
    );

    return res.send(data);
  };

  next();
}

// Error handling middleware
export function errorLoggingMiddleware(err: any, req: any, res: any, next: any): void {
  logger.error(
    'Unhandled error in request',
    'EXPRESS_ERROR',
    {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: req.headers,
      body: req.body
    },
    err
  );

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}