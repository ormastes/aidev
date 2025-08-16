import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { EventEmitter } from 'node:events';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = "critical"
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel | string;
  service: string;
  action?: string;
  message?: string;
  userId?: number | string;
  sessionId?: string;
  appId?: number;
  metadata?: any;
  stack?: string;
  errorId?: string;
  requestId?: string;
}

export interface ExternalLogConfig {
  service?: string;
  logDir?: string;
  maxFileSize?: number;
  maxFiles?: number;
  logToConsole?: boolean;
  logLevel?: LogLevel;
  bufferSize?: number;
  flushInterval?: number;
}

export class ExternalLogService extends EventEmitter {
  private config: Required<ExternalLogConfig>;
  private logDir: string;
  private currentLogFile: string;
  private logBuffer: LogEntry[];
  private flushTimer: NodeJS.Timer | null = null;
  private fileStream: fs.WriteStream | null = null;
  private currentFileSize: number = 0;
  private logLevels: Map<LogLevel, number>;

  constructor(config?: ExternalLogConfig) {
    super();
    
    this.config = {
      service: 'gui-selector',
      logDir: '',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      logToConsole: process.env.NODE_ENV === "development",
      logLevel: LogLevel.INFO,
      bufferSize: 100,
      flushInterval: 5000, // 5 seconds
      ...config
    };

    // Set up log levels hierarchy
    this.logLevels = new Map([
      [LogLevel.DEBUG, 0],
      [LogLevel.INFO, 1],
      [LogLevel.WARN, 2],
      [LogLevel.ERROR, 3],
      [LogLevel.CRITICAL, 4]
    ]);

    // Set up log directory
    if (!this.config.logDir) {
      const baseDir = path.join(process.cwd(), 'logs');
      this.logDir = path.join(baseDir, this.config.service);
    } else {
      this.logDir = this.config.logDir;
    }
    
    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      await fileAPI.createDirectory(this.logDir);
    }

    // Initialize log file
    this.currentLogFile = this.getLogFileName();
    this.logBuffer = [];
    
    // Set up file stream
    this.setupFileStream();
    
    // Start flush timer
    this.startFlushTimer();
    
    // Handle process exit
    process.on('exit', () => this.flush());
    process.on('SIGINT', () => this.flush());
    process.on('SIGTERM', () => this.flush());
  }

  /**
   * Main logging method
   */
  async log(entry: LogEntry | string, metadata?: any): Promise<void> {
    // Handle string messages
    if (typeof entry === 'string') {
      entry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        service: this.config.service,
        message: entry,
        metadata
      };
    }

    // Ensure required fields
    entry.timestamp = entry.timestamp || new Date().toISOString();
    entry.service = entry.service || this.config.service;
    entry.level = entry.level || LogLevel.INFO;

    // Check log level
    if (!this.shouldLog(entry.level as LogLevel)) {
      return;
    }

    // Add to buffer
    this.logBuffer.push(entry);

    // Emit log event
    this.emit('log', entry);

    // Log to console if enabled
    if (this.config.logToConsole) {
      this.logToConsole(entry);
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.config.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message: string, metadata?: any): void {
    this.log({
      level: LogLevel.DEBUG,
      service: this.config.service,
      message,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  info(message: string, metadata?: any): void {
    this.log({
      level: LogLevel.INFO,
      service: this.config.service,
      message,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  warn(message: string, metadata?: any): void {
    this.log({
      level: LogLevel.WARN,
      service: this.config.service,
      message,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  error(message: string, metadata?: any): void {
    this.log({
      level: LogLevel.ERROR,
      service: this.config.service,
      message,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  critical(message: string, metadata?: any): void {
    this.log({
      level: LogLevel.CRITICAL,
      service: this.config.service,
      message,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Flush log buffer to file
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    try {
      for (const entry of entries) {
        const logLine = JSON.stringify(entry) + '\n';
        const buffer = Buffer.from(logLine);
        
        // Check if we need to rotate
        if (this.currentFileSize + buffer.length > this.config.maxFileSize) {
          await this.rotateLogFile();
        }

        // Write to stream
        if (this.fileStream) {
          this.fileStream.write(buffer);
          this.currentFileSize += buffer.length;
        }
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Re-add entries to buffer for retry
      this.logBuffer.unshift(...entries);
    }
  }

  /**
   * Get logs from file
   */
  async getLogs(options?: {
    startDate?: Date;
    endDate?: Date;
    level?: LogLevel;
    limit?: number;
    userId?: string;
    sessionId?: string;
  }): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];
    const files = await this.getLogFiles();

    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          
          // Apply filters
          if (options) {
            const entryDate = new Date(entry.timestamp);
            
            if (options.startDate && entryDate < options.startDate) continue;
            if (options.endDate && entryDate > options.endDate) continue;
            if (options.level && !this.isLevelMatch(entry.level as LogLevel, options.level)) continue;
            if (options.userId && entry.userId !== options.userId) continue;
            if (options.sessionId && entry.sessionId !== options.sessionId) continue;
          }
          
          logs.push(entry);
          
          if (options?.limit && logs.length >= options.limit) {
            return logs;
          }
        } catch (error) {
          // Skip invalid JSON lines
        }
      }
    }

    return logs;
  }

  /**
   * Search logs
   */
  async searchLogs(query: string, options?: {
    limit?: number;
    level?: LogLevel;
  }): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];
    const files = await this.getLogFiles();
    const searchRegex = new RegExp(query, 'i');

    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          
          // Check if entry matches search
          const entryStr = JSON.stringify(entry);
          if (!searchRegex.test(entryStr)) continue;
          
          // Apply level filter
          if (options?.level && !this.isLevelMatch(entry.level as LogLevel, options.level)) {
            continue;
          }
          
          logs.push(entry);
          
          if (options?.limit && logs.length >= options.limit) {
            return logs;
          }
        } catch (error) {
          // Skip invalid JSON lines
        }
      }
    }

    return logs;
  }

  /**
   * Get log statistics
   */
  async getStatistics(): Promise<{
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsByService: Record<string, number>;
    oldestLog?: Date;
    newestLog?: Date;
    totalSize: number;
  }> {
    const stats = {
      totalLogs: 0,
      logsByLevel: {} as Record<string, number>,
      logsByService: {} as Record<string, number>,
      oldestLog: undefined as Date | undefined,
      newestLog: undefined as Date | undefined,
      totalSize: 0
    };

    const files = await this.getLogFiles();

    for (const file of files) {
      const stat = await fs.promises.stat(file);
      stats.totalSize += stat.size;

      const content = await fs.promises.readFile(file, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          stats.totalLogs++;
          
          // Count by level
          stats.logsByLevel[entry.level] = (stats.logsByLevel[entry.level] || 0) + 1;
          
          // Count by service
          stats.logsByService[entry.service] = (stats.logsByService[entry.service] || 0) + 1;
          
          // Track oldest and newest
          const entryDate = new Date(entry.timestamp);
          if (!stats.oldestLog || entryDate < stats.oldestLog) {
            stats.oldestLog = entryDate;
          }
          if (!stats.newestLog || entryDate > stats.newestLog) {
            stats.newestLog = entryDate;
          }
        } catch (error) {
          // Skip invalid JSON lines
        }
      }
    }

    return stats;
  }

  /**
   * Clean old log files
   */
  async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    const files = await this.getLogFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let deletedCount = 0;

    for (const file of files) {
      const stat = await fs.promises.stat(file);
      if (stat.mtime < cutoffDate) {
        await fs.promises.unlink(file);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Helper: Set up file stream
   */
  private setupFileStream(): void {
    if (this.fileStream) {
      this.fileStream.close();
    }

    this.fileStream = fileAPI.createWriteStream(this.currentLogFile, {
      flags: 'a',
      encoding: 'utf-8'
    });

    // Get current file size
    try {
      const stat = fs.statSync(this.currentLogFile);
      this.currentFileSize = stat.size;
    } catch (error) {
      this.currentFileSize = 0;
    }
  }

  /**
   * Helper: Rotate log file
   */
  private async rotateLogFile(): Promise<void> {
    // Close current stream
    if (this.fileStream) {
      this.fileStream.close();
    }

    // Clean old files if needed
    await this.cleanExcessFiles();

    // Create new file
    this.currentLogFile = this.getLogFileName();
    this.setupFileStream();
  }

  /**
   * Helper: Clean excess log files
   */
  private async cleanExcessFiles(): Promise<void> {
    const files = await this.getLogFiles();
    
    if (files.length >= this.config.maxFiles) {
      // Sort by modification time
      const fileStats = await Promise.all(
        files.map(async file => ({
          file,
          mtime: (await fs.promises.stat(file)).mtime
        }))
      );
      
      fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
      
      // Delete oldest files
      const toDelete = fileStats.slice(0, files.length - this.config.maxFiles + 1);
      for (const { file } of toDelete) {
        await fs.promises.unlink(file);
      }
    }
  }

  /**
   * Helper: Get log file name
   */
  private getLogFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.logDir, `${this.config.service}-${timestamp}.log`);
  }

  /**
   * Helper: Get all log files
   */
  private async getLogFiles(): Promise<string[]> {
    const files = await fs.promises.readdir(this.logDir);
    return files
      .filter(file => file.startsWith(this.config.service) && file.endsWith('.log'))
      .map(file => path.join(this.logDir, file))
      .sort();
  }

  /**
   * Helper: Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Helper: Should log based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levelValue = this.logLevels.get(level) || 0;
    const configLevelValue = this.logLevels.get(this.config.logLevel) || 0;
    return levelValue >= configLevelValue;
  }

  /**
   * Helper: Check if level matches or is higher
   */
  private isLevelMatch(entryLevel: LogLevel, minLevel: LogLevel): boolean {
    const entryValue = this.logLevels.get(entryLevel) || 0;
    const minValue = this.logLevels.get(minLevel) || 0;
    return entryValue >= minValue;
  }

  /**
   * Helper: Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const message = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}] ${entry.message || entry.action || ''}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.metadata || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.metadata || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.metadata || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.metadata || '');
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flush();
    
    if (this.fileStream) {
      this.fileStream.close();
    }
  }

  async logUserAction(userId: number, action: string, metadata?: any): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'gui-selector',
      action,
      userId,
      metadata
    });
  }

  async logAppAction(appId: number, action: string, userId?: number, metadata?: any): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'gui-selector',
      action,
      appId,
      userId,
      metadata
    });
  }

  async logError(action: string, error: any, metadata?: any): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'gui-selector',
      action,
      metadata: {
        ...metadata,
        error: error.message || error,
        stack: error.stack
      }
    });
  }

  async logSystemEvent(action: string, metadata?: any): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'gui-selector',
      action,
      metadata
    });
  }

  // Get logs for monitoring
  async getRecentLogs(limit = 100): Promise<LogEntry[]> {
    try {
      const content = await fs.promises.readFile(this.currentLogFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      const logs = lines.slice(-limit).map(line => JSON.parse(line));
      return logs.reverse();
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }
}