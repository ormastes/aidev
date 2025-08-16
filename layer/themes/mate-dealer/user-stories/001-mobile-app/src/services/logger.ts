/**
 * External Logging Service with Winston
 * 
 * Comprehensive logging system for the Mate Dealer application
 * with performance metrics, error tracking, and log aggregation.
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export interface LogMetadata {
  userId?: string;
  sessionId?: string;
  action?: string;
  module?: string;
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
  error?: {
    stack?: string;
    code?: string;
    details?: any;
  };
  [key: string]: any;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

class LoggerService {
  private static instance: LoggerService;
  private logger: winston.Logger;
  private performanceTrackers: Map<string, PerformanceMetrics> = new Map();
  private environment: string;

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.logger = this.createLogger();
    this.setupExceptionHandlers();
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private createLogger(): winston.Logger {
    const logLevel = this.getLogLevel();
    
    // Custom format for logs
    const customFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (Object.keys(metadata).length > 0) {
          msg += ` | ${JSON.stringify(metadata)}`;
        }
        
        return msg;
      })
    );

    // Console transport
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    });

    // File transports with rotation
    const fileRotateTransport = new DailyRotateFile({
      filename: 'logs/mate-dealer-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: customFormat
    });

    const errorFileTransport = new DailyRotateFile({
      filename: 'logs/mate-dealer-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: customFormat
    });

    const transports: winston.transport[] = [consoleTransport];

    // Add file transports for non-development environments
    if (this.environment !== 'development') {
      transports.push(fileRotateTransport, errorFileTransport);
    }

    // Add external log aggregation transport for production
    if (this.environment === 'production' || this.environment === 'release') {
      // This would be configured with your log aggregation service
      // Example: Datadog, Splunk, ELK Stack, etc.
      const externalTransport = this.createExternalTransport();
      if (externalTransport) {
        transports.push(externalTransport);
      }
    }

    return winston.createLogger({
      level: logLevel,
      format: customFormat,
      transports,
      exitOnError: false
    });
  }

  private getLogLevel(): string {
    switch (this.environment) {
      case 'production':
      case 'release':
        return 'warn';
      case 'demo':
        return 'info';
      case 'test':
        return 'error';
      default:
        return 'debug';
    }
  }

  private createExternalTransport(): winston.transport | null {
    // Configure external log aggregation service
    // This is a placeholder for actual implementation
    if (process.env.LOG_AGGREGATION_ENDPOINT) {
      // Example: HTTP transport to send logs to external service
      const Http = require('winston/lib/winston/transports/http');
      return new Http({
        host: process.env.LOG_AGGREGATION_HOST,
        port: process.env.LOG_AGGREGATION_PORT,
        path: process.env.LOG_AGGREGATION_PATH,
        ssl: true,
        batch: true,
        batchInterval: 5000,
        batchCount: 10
      });
    }
    return null;
  }

  private setupExceptionHandlers(): void {
    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ 
        filename: 'logs/exceptions.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );

    // Handle unhandled promise rejections
    this.logger.rejections.handle(
      new winston.transports.File({ 
        filename: 'logs/rejections.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }

  // Logging methods
  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, metadata);
  }

  error(message: string, error?: Error | any, metadata?: LogMetadata): void {
    const errorMetadata: LogMetadata = {
      ...metadata,
      error: {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        details: error
      }
    };
    this.logger.error(message, errorMetadata);
  }

  // Performance tracking methods
  startPerformanceTracking(trackerId: string): void {
    this.performanceTrackers.set(trackerId, {
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    });
  }

  endPerformanceTracking(trackerId: string, message?: string): PerformanceMetrics | null {
    const tracker = this.performanceTrackers.get(trackerId);
    if (!tracker) {
      this.warn(`Performance tracker '${trackerId}' not found`);
      return null;
    }

    tracker.endTime = Date.now();
    tracker.duration = tracker.endTime - tracker.startTime;
    
    const endMemoryUsage = process.memoryUsage();
    const endCpuUsage = process.cpuUsage(tracker.cpuUsage);

    const metrics: PerformanceMetrics = {
      ...tracker,
      memoryUsage: endMemoryUsage,
      cpuUsage: endCpuUsage
    };

    // Log performance metrics
    this.info(message || `Performance metrics for ${trackerId}`, {
      performance: {
        duration: metrics.duration,
        memory: {
          rss: endMemoryUsage.rss,
          heapUsed: endMemoryUsage.heapUsed,
          heapTotal: endMemoryUsage.heapTotal
        },
        cpu: {
          user: endCpuUsage.user,
          system: endCpuUsage.system
        }
      }
    });

    this.performanceTrackers.delete(trackerId);
    return metrics;
  }

  // Specialized logging methods
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    metadata?: LogMetadata
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.logger.log(level, `API Request: ${method} ${url}`, {
      ...metadata,
      api: {
        method,
        url,
        statusCode,
        duration
      }
    });
  }

  logDatabaseQuery(
    query: string,
    duration: number,
    success: boolean,
    metadata?: LogMetadata
  ): void {
    const level = success ? 'debug' : 'error';
    
    this.logger.log(level, 'Database Query', {
      ...metadata,
      database: {
        query: query.substring(0, 200), // Truncate long queries
        duration,
        success
      }
    });
  }

  logUserAction(
    userId: string,
    action: string,
    details?: any,
    metadata?: LogMetadata
  ): void {
    this.info(`User Action: ${action}`, {
      ...metadata,
      userId,
      action,
      details
    });
  }

  logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    metadata?: LogMetadata
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    this.logger.log(level, `Security Event: ${eventType}`, {
      ...metadata,
      security: {
        eventType,
        severity,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  // App-specific metrics
  logAppStartup(startupTime: number, metadata?: LogMetadata): void {
    this.info('App Startup Complete', {
      ...metadata,
      performance: {
        startupTime,
        target: 3000, // Target: < 3s
        status: startupTime < 3000 ? 'success' : 'warning'
      }
    });
  }

  logScreenTransition(
    fromScreen: string,
    toScreen: string,
    duration: number,
    metadata?: LogMetadata
  ): void {
    const level = duration > 300 ? 'warn' : 'debug';
    
    this.logger.log(level, 'Screen Transition', {
      ...metadata,
      navigation: {
        from: fromScreen,
        to: toScreen,
        duration,
        target: 300, // Target: < 300ms
        status: duration < 300 ? 'success' : 'warning'
      }
    });
  }

  logMemoryUsage(metadata?: LogMetadata): void {
    const memoryUsage = process.memoryUsage();
    const level = memoryUsage.heapUsed > 200 * 1024 * 1024 ? 'warn' : 'debug';
    
    this.logger.log(level, 'Memory Usage', {
      ...metadata,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        target: '200MB',
        status: memoryUsage.heapUsed < 200 * 1024 * 1024 ? 'success' : 'warning'
      }
    });
  }

  // Battery usage tracking (for mobile)
  logBatteryUsage(
    batteryLevel: number,
    isCharging: boolean,
    appUsagePercent: number,
    metadata?: LogMetadata
  ): void {
    const level = appUsagePercent > 10 ? 'warn' : 'debug';
    
    this.logger.log(level, 'Battery Usage', {
      ...metadata,
      battery: {
        level: batteryLevel,
        isCharging,
        appUsagePercent,
        status: appUsagePercent < 10 ? 'optimal' : 'high'
      }
    });
  }

  // Crash reporting
  logCrash(error: Error, metadata?: LogMetadata): void {
    this.error('App Crash Detected', error, {
      ...metadata,
      crash: {
        timestamp: new Date().toISOString(),
        environment: this.environment,
        stack: error.stack,
        message: error.message
      }
    });
  }

  // Query logs
  query(options: winston.QueryOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      this.logger.query(options, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  // Stream logs
  stream(options?: any): NodeJS.ReadableStream {
    return this.logger.stream(options);
  }

  // Clear performance trackers
  clearPerformanceTrackers(): void {
    this.performanceTrackers.clear();
  }

  // Flush logs
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.end(() => {
        resolve();
      });
    });
  }
}

export default LoggerService.getInstance();
export { LoggerService };