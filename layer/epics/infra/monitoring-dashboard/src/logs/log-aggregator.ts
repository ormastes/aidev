import { fileAPI } from '../utils/file-api';
/**
 * LogAggregator - Collect, parse, and search logs from all services
 */

import { EventEmitter } from 'node:events';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { promisify } from 'node:util';
import { Tail } from 'tail';
import winston from 'winston';

const readFileAsync = promisify(fs.readFile);
const readDirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: Record<string, any>;
  source?: {
    file?: string;
    line?: number;
    function?: string;
  };
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface LogQuery {
  service?: string;
  level?: LogLevel;
  message?: string;
  startTime?: number;
  endTime?: number;
  traceId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface LogPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | "critical";
  description: string;
  alertOnMatch?: boolean;
}

export interface LogStatistics {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByService: Record<string, number>;
  errorsInLastHour: number;
  warningsInLastHour: number;
  topErrorMessages: Array<{ message: string; count: number }>;
  patternMatches: Array<{ pattern: string; count: number }>;
}

export class LogAggregator extends EventEmitter {
  private logger: winston.Logger;
  private logs: LogEntry[] = [];
  private logTails: Map<string, Tail> = new Map();
  private patterns: Map<string, LogPattern> = new Map();
  private isRunning = false;
  
  private maxRetentionTime = 7 * 24 * 60 * 60 * 1000; // 7 days
  private maxLogEntries = 100000;
  private logSources: string[] = [];
  
  // Performance caches
  private indexedLogs: Map<string, LogEntry[]> = new Map();
  private lastIndexUpdate = 0;
  private indexUpdateInterval = 60000; // 1 minute

  constructor() {
    super();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'log-aggregator.log' })
      ]
    });

    this.initializeDefaultPatterns();
  }

  /**
   * Start log aggregation from multiple sources
   */
  public async start(logSources: string[] = []): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Log aggregator is already running');
      return;
    }

    this.isRunning = true;
    this.logSources = logSources.length > 0 ? logSources : this.getDefaultLogSources();

    this.logger.info(`Starting log aggregation from ${this.logSources.length} sources`);

    // Start tailing log files
    for (const source of this.logSources) {
      await this.startTailingLogSource(source);
    }

    // Start periodic maintenance
    setInterval(() => this.performMaintenance(), 60000); // Every minute

    this.emit('started', this.logSources);
  }

  /**
   * Stop log aggregation
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Stop all tails
    for (const [source, tail] of this.logTails) {
      try {
        tail.unwatch();
      } catch (error) {
        this.logger.error(`Error stopping tail for ${source}:`, error);
      }
    }
    
    this.logTails.clear();
    this.logger.info('Log aggregation stopped');
    this.emit('stopped');
  }

  /**
   * Get default log sources
   */
  private getDefaultLogSources(): string[] {
    const sources: string[] = [];
    
    // Common log directories
    const logDirs = [
      '/var/log',
      '/var/log/nginx',
      '/var/log/apache2',
      '/var/log/docker',
      './logs',
      '../logs',
      '../../logs'
    ];

    for (const dir of logDirs) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (file.endsWith('.log') || file.endsWith('.txt')) {
              sources.push(path.join(dir, file));
            }
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    }

    return sources;
  }

  /**
   * Start tailing a log source
   */
  private async startTailingLogSource(source: string): Promise<void> {
    try {
      if (!fs.existsSync(source)) {
        this.logger.warn(`Log source does not exist: ${source}`);
        return;
      }

      const stat = await statAsync(source);
      if (!stat.isFile()) {
        // If it's a directory, scan for log files
        if (stat.isDirectory()) {
          await this.scanLogDirectory(source);
        }
        return;
      }

      const tail = new Tail(source);
      
      tail.on('line', (line: string) => {
        this.processLogLine(line, source);
      });

      tail.on('error', (error) => {
        this.logger.error(`Error tailing ${source}:`, error);
      });

      this.logTails.set(source, tail);
      this.logger.info(`Started tailing log source: ${source}`);

      // Also read existing logs
      await this.readExistingLogs(source);

    } catch (error) {
      this.logger.error(`Failed to start tailing ${source}:`, error);
    }
  }

  /**
   * Scan directory for log files
   */
  private async scanLogDirectory(directory: string): Promise<void> {
    try {
      const files = await readDirAsync(directory);
      for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = await statAsync(fullPath);
        
        if (stat.isFile() && (file.endsWith('.log') || file.endsWith('.txt'))) {
          await this.startTailingLogSource(fullPath);
        }
      }
    } catch (error) {
      this.logger.error(`Error scanning log directory ${directory}:`, error);
    }
  }

  /**
   * Read existing logs from file
   */
  private async readExistingLogs(filePath: string, maxLines: number = 1000): Promise<void> {
    try {
      const content = await readFileAsync(filePath, 'utf8');
      const lines = content.split('\n').slice(-maxLines);
      
      for (const line of lines) {
        if (line.trim()) {
          this.processLogLine(line, filePath);
        }
      }
    } catch (error) {
      this.logger.error(`Error reading existing logs from ${filePath}:`, error);
    }
  }

  /**
   * Process a log line
   */
  private processLogLine(line: string, source: string): void {
    try {
      const logEntry = this.parseLogLine(line, source);
      if (logEntry) {
        this.addLogEntry(logEntry);
        this.checkPatterns(logEntry);
        this.emit("logReceived", logEntry);
      }
    } catch (error) {
      this.logger.error('Error processing log line:', error);
    }
  }

  /**
   * Parse a log line into a structured LogEntry
   */
  private parseLogLine(line: string, source: string): LogEntry | null {
    if (!line.trim()) {
      return null;
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level: 'info',
      service: this.extractServiceFromSource(source),
      message: line,
      source: {
        file: source
      }
    };

    // Try to parse JSON logs first
    try {
      const jsonLog = JSON.parse(line);
      if (jsonLog.timestamp) {
        logEntry.timestamp = new Date(jsonLog.timestamp).getTime();
      }
      if (jsonLog.level) {
        logEntry.level = jsonLog.level.toLowerCase() as LogLevel;
      }
      if (jsonLog.service) {
        logEntry.service = jsonLog.service;
      }
      if (jsonLog.message) {
        logEntry.message = jsonLog.message;
      }
      if (jsonLog.metadata) {
        logEntry.metadata = jsonLog.metadata;
      }
      if (jsonLog.traceId) {
        logEntry.traceId = jsonLog.traceId;
      }
      if (jsonLog.spanId) {
        logEntry.spanId = jsonLog.spanId;
      }
      if (jsonLog.userId) {
        logEntry.userId = jsonLog.userId;
      }
      if (jsonLog.requestId) {
        logEntry.requestId = jsonLog.requestId;
      }
      return logEntry;
    } catch {
      // Not JSON, continue with regex parsing
    }

    // Try common log formats
    const formats = [
      // ISO timestamp with level
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s+\[?(\w+)\]?\s+(.*)/,
      // Apache/Nginx format
      /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+(.*)/,
      // Syslog format
      /^(\w{3}\s+\d{1,2}\s\d{2}:\d{2}:\d{2})\s+(\w+)\s+(\w+):\s+(.*)/,
      // Simple timestamp format
      /^(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.*)/
    ];

    for (const format of formats) {
      const match = line.match(format);
      if (match) {
        logEntry.timestamp = this.parseTimestamp(match[1]);
        logEntry.level = this.normalizeLogLevel(match[2]);
        logEntry.message = match[3] || match[4] || line;
        return logEntry;
      }
    }

    // Extract log level from message if no format matched
    const levelMatch = line.match(/\b(error|err|warn|warning|info|debug|trace)\b/i);
    if (levelMatch) {
      logEntry.level = this.normalizeLogLevel(levelMatch[1]);
    }

    return logEntry;
  }

  /**
   * Extract service name from log source path
   */
  private extractServiceFromSource(source: string): string {
    const basename = path.basename(source, path.extname(source));
    
    // Common patterns
    if (basename.includes('nginx')) return 'nginx';
    if (basename.includes('apache')) return 'apache';
    if (basename.includes('docker')) return 'docker';
    if (basename.includes('api')) return 'api';
    if (basename.includes('auth')) return 'auth-service';
    if (basename.includes('user')) return 'user-service';
    if (basename.includes('order')) return 'order-service';
    if (basename.includes("monitoring")) return "monitoring";
    
    return basename || 'unknown';
  }

  /**
   * Parse timestamp string
   */
  private parseTimestamp(timestampStr: string): number {
    try {
      // Handle different timestamp formats
      if (timestampStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return new Date(timestampStr).getTime();
      }
      if (timestampStr.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)) {
        return new Date(timestampStr).getTime();
      }
      if (timestampStr.match(/^\w{3}\s+\d{1,2}\s\d{2}:\d{2}:\d{2}/)) {
        // Syslog format, add current year
        const year = new Date().getFullYear();
        return new Date(`${year} ${timestampStr}`).getTime();
      }
      if (timestampStr.match(/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}/)) {
        return new Date(timestampStr).getTime();
      }
    } catch (error) {
      // Fall back to current time
    }
    return Date.now();
  }

  /**
   * Normalize log level
   */
  private normalizeLogLevel(level: string): LogLevel {
    const normalized = level.toLowerCase();
    switch (normalized) {
      case 'err':
      case 'error':
      case 'fatal':
      case "critical":
        return 'error';
      case 'warn':
      case 'warning':
        return 'warn';
      case 'info':
      case "information":
        return 'info';
      case 'http':
      case 'request':
        return 'http';
      case 'verbose':
        return 'verbose';
      case 'debug':
      case 'trace':
        return 'debug';
      default:
        return 'info';
    }
  }

  /**
   * Add log entry to storage
   */
  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Trim logs if we exceed maximum
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }
    
    // Invalidate indices for periodic rebuild
    if (Date.now() - this.lastIndexUpdate > this.indexUpdateInterval) {
      this.rebuildIndices();
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize default log patterns
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns: LogPattern[] = [
      {
        id: 'out-of-memory',
        name: 'Out of Memory',
        pattern: /out of memory|oom|OutOfMemoryError/i,
        severity: "critical",
        description: 'System or application running out of memory',
        alertOnMatch: true
      },
      {
        id: 'connection-refused',
        name: 'Connection Refused',
        pattern: /connection refused|ECONNREFUSED/i,
        severity: 'high',
        description: 'Connection to service refused',
        alertOnMatch: true
      },
      {
        id: 'timeout',
        name: 'Timeout Error',
        pattern: /timeout|ETIMEDOUT/i,
        severity: 'medium',
        description: 'Request or connection timeout',
        alertOnMatch: false
      },
      {
        id: 'authentication-failed',
        name: 'Authentication Failed',
        pattern: /auth.*fail|authentication.*fail|login.*fail|unauthorized/i,
        severity: 'high',
        description: 'Authentication failure detected',
        alertOnMatch: true
      },
      {
        id: 'database-error',
        name: 'Database Error',
        pattern: /database.*error|sql.*error|connection.*pool/i,
        severity: 'high',
        description: 'Database connection or query error',
        alertOnMatch: true
      },
      {
        id: 'high-response-time',
        name: 'High Response Time',
        pattern: /response.*time.*\d{4,}/i,
        severity: 'medium',
        description: 'High response time detected',
        alertOnMatch: false
      }
    ];

    for (const pattern of defaultPatterns) {
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * Check patterns against log entry
   */
  private checkPatterns(entry: LogEntry): void {
    for (const pattern of this.patterns.values()) {
      if (pattern.pattern.test(entry.message)) {
        this.emit("patternMatched", {
          pattern,
          logEntry: entry
        });
        
        if (pattern.alertOnMatch) {
          this.emit("alertTriggered", {
            type: 'pattern-match',
            pattern: pattern.name,
            severity: pattern.severity,
            logEntry: entry
          });
        }
      }
    }
  }

  /**
   * Add custom log pattern
   */
  public addPattern(pattern: LogPattern): void {
    this.patterns.set(pattern.id, pattern);
    this.logger.info(`Added log pattern: ${pattern.name}`);
  }

  /**
   * Remove log pattern
   */
  public removePattern(patternId: string): boolean {
    const removed = this.patterns.delete(patternId);
    if (removed) {
      this.logger.info(`Removed log pattern: ${patternId}`);
    }
    return removed;
  }

  /**
   * Get recent logs
   */
  public async getRecentLogs(query: LogQuery): Promise<LogEntry[]> {
    let filteredLogs = [...this.logs];

    // Apply filters
    if (query.service) {
      filteredLogs = filteredLogs.filter(log => log.service === query.service);
    }
    
    if (query.level) {
      filteredLogs = filteredLogs.filter(log => log.level === query.level);
    }
    
    if (query.message) {
      const regex = new RegExp(query.message, 'i');
      filteredLogs = filteredLogs.filter(log => regex.test(log.message));
    }
    
    if (query.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startTime!);
    }
    
    if (query.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endTime!);
    }
    
    if (query.traceId) {
      filteredLogs = filteredLogs.filter(log => log.traceId === query.traceId);
    }
    
    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Search logs with advanced query
   */
  public async searchLogs(searchQuery: {
    query?: string;
    filters?: LogQuery;
    aggregation?: string;
  }): Promise<{
    logs: LogEntry[];
    total: number;
    aggregations?: Record<string, any>;
  }> {
    const { query: searchText, filters = {}, aggregation } = searchQuery;
    
    let results = await this.getRecentLogs(filters);
    
    // Text search
    if (searchText) {
      const regex = new RegExp(searchText, 'i');
      results = results.filter(log => 
        regex.test(log.message) || 
        regex.test(log.service) ||
        (log.metadata && regex.test(JSON.stringify(log.metadata)))
      );
    }

    const response: any = {
      logs: results,
      total: results.length
    };

    // Apply aggregations if requested
    if (aggregation) {
      response.aggregations = this.calculateAggregations(results, aggregation);
    }

    return response;
  }

  /**
   * Calculate aggregations
   */
  private calculateAggregations(logs: LogEntry[], aggregationType: string): Record<string, any> {
    const aggregations: Record<string, any> = {};

    switch (aggregationType) {
      case 'by-service':
        aggregations.byService = {};
        logs.forEach(log => {
          aggregations.byService[log.service] = (aggregations.byService[log.service] || 0) + 1;
        });
        break;
        
      case 'by-level':
        aggregations.byLevel = {};
        logs.forEach(log => {
          aggregations.byLevel[log.level] = (aggregations.byLevel[log.level] || 0) + 1;
        });
        break;
        
      case "timeline":
        aggregations.timeline = this.createTimeline(logs);
        break;
    }

    return aggregations;
  }

  /**
   * Create timeline aggregation
   */
  private createTimeline(logs: LogEntry[], interval: number = 60000): Array<{ timestamp: number; count: number }> {
    const timeline: Record<number, number> = {};
    
    logs.forEach(log => {
      const bucket = Math.floor(log.timestamp / interval) * interval;
      timeline[bucket] = (timeline[bucket] || 0) + 1;
    });
    
    return Object.entries(timeline)
      .map(([timestamp, count]) => ({ timestamp: parseInt(timestamp), count }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get log statistics
   */
  public getStatistics(): LogStatistics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const recentLogs = this.logs.filter(log => log.timestamp >= oneHourAgo);
    
    const logsByLevel: Record<LogLevel, number> = {
      error: 0, warn: 0, info: 0, http: 0, verbose: 0, debug: 0, silly: 0
    };
    
    const logsByService: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};
    
    this.logs.forEach(log => {
      logsByLevel[log.level]++;
      logsByService[log.service] = (logsByService[log.service] || 0) + 1;
      
      if (log.level === 'error') {
        errorMessages[log.message] = (errorMessages[log.message] || 0) + 1;
      }
    });

    const topErrorMessages = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByService,
      errorsInLastHour: recentLogs.filter(log => log.level === 'error').length,
      warningsInLastHour: recentLogs.filter(log => log.level === 'warn').length,
      topErrorMessages,
      patternMatches: Array.from(this.patterns.entries()).map(([id, pattern]) => ({
        pattern: pattern.name,
        count: this.logs.filter(log => pattern.pattern.test(log.message)).length
      }))
    };
  }

  /**
   * Rebuild search indices for performance
   */
  private rebuildIndices(): void {
    this.indexedLogs.clear();
    
    // Index by service
    const serviceIndex: Map<string, LogEntry[]> = new Map();
    for (const log of this.logs) {
      if (!serviceIndex.has(log.service)) {
        serviceIndex.set(log.service, []);
      }
      serviceIndex.get(log.service)!.push(log);
    }
    
    this.indexedLogs = serviceIndex;
    this.lastIndexUpdate = Date.now();
  }

  /**
   * Perform periodic maintenance
   */
  private performMaintenance(): void {
    const now = Date.now();
    
    // Remove old logs
    const cutoff = now - this.maxRetentionTime;
    const originalLength = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
    
    if (this.logs.length < originalLength) {
      this.logger.info(`Cleaned up ${originalLength - this.logs.length} old log entries`);
    }
    
    // Rebuild indices if needed
    if (now - this.lastIndexUpdate > this.indexUpdateInterval) {
      this.rebuildIndices();
    }
  }

  /**
   * Get log sources status
   */
  public getSourcesStatus(): Array<{
    source: string;
    isActive: boolean;
    lastActivity?: number;
    errorCount: number;
  }> {
    return this.logSources.map(source => ({
      source,
      isActive: this.logTails.has(source),
      lastActivity: undefined, // Would track last line received
      errorCount: 0 // Would track errors per source
    }));
  }

  /**
   * Export logs to file
   */
  public async exportLogs(query: LogQuery, format: 'json' | 'csv' | 'txt' = 'json'): Promise<string> {
    const logs = await this.getRecentLogs(query);
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      case 'csv':
        return this.logsToCSV(logs);
      case 'txt':
        return logs.map(log => 
          `${new Date(log.timestamp).toISOString()} [${log.level.toUpperCase()}] ${log.service}: ${log.message}`
        ).join('\n');
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Convert logs to CSV format
   */
  private logsToCSV(logs: LogEntry[]): string {
    const headers = ["timestamp", 'level', 'service', 'message', 'traceId', 'userId'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.service,
      log.message.replace(/"/g, '""'),
      log.traceId || '',
      log.userId || ''
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
}