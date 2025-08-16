/**
 * EventLogger
 * 
 * Comprehensive logging system that tracks:
 * - Task queue changes
 * - Feature updates
 * - Name ID modifications
 * - System events
 * - File operation rejections
 */

import * as fs from '../../layer/themes/infra_external-log-lib/src';
import * as path from 'node:path';
import * as os from 'os';
import { EventEmitter } from 'node:events';
import { getFileAPI, FileType } from '../../pipe';
import { getDefaultLogDirectory } from '../config/log-config';
import {
  extractTaskEssentials,
  extractFeatureEssentials,
  extractNameIdEssentials,
  formatEssentialInfo
} from '../utils/essential-info-extractor';

const fileAPI = getFileAPI();

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  type: LogEventType;
  category: string;
  message: string;
  data?: any;
  metadata?: LogMetadata;
}

export interface LogMetadata {
  pid: number;
  hostname: string;
  theme: string;
  user?: string;
  sessionId?: string;
  correlationId?: string;
}

export enum LogEventType {
  // VF.json changes
  TASK_QUEUE_CREATED = 'task_queue.created',
  TASK_QUEUE_UPDATED = 'task_queue.updated',
  TASK_QUEUE_COMPLETED = 'task_queue.completed',
  TASK_QUEUE_DELETED = 'task_queue.deleted',
  
  FEATURE_CREATED = 'feature.created',
  FEATURE_UPDATED = 'feature.updated',
  FEATURE_COMPLETED = 'feature.completed',
  FEATURE_DELETED = 'feature.deleted',
  
  NAME_ID_CREATED = 'name_id.created',
  NAME_ID_UPDATED = 'name_id.updated',
  NAME_ID_DELETED = 'name_id.deleted',
  
  // Events
  EVENT_SYSTEM_START = 'event.system_start',
  EVENT_SYSTEM_STOP = 'event.system_stop',
  EVENT_ERROR = 'event.error',
  EVENT_WARNING = 'event.warning',
  EVENT_CUSTOM = 'event.custom',
  
  // Rejections
  REJECTION_FILE_VIOLATION = 'rejection.file_violation',
  REJECTION_PERMISSION_DENIED = 'rejection.permission_denied',
  REJECTION_VALIDATION_FAILED = 'rejection.validation_failed',
  REJECTION_QUOTA_EXCEEDED = 'rejection.quota_exceeded',
  
  // File operations
  FILE_CREATED = 'file.created',
  FILE_MODIFIED = 'file.modified',
  FILE_DELETED = 'file.deleted',
  FILE_MOVED = 'file.moved',
  
  // Log management
  LOG_ROTATION = 'log.rotation',
  LOG_CLEANUP = 'log.cleanup',
  LOG_ERROR = 'log.error'
}

export interface EventLoggerConfig {
  logDir?: string;
  maxFileSize?: number;  // bytes
  maxFiles?: number;
  rotationInterval?: 'daily' | 'hourly' | 'size';
  format?: 'json' | 'text';
  enableConsole?: boolean;
  sessionId?: string;
  metadata?: Partial<LogMetadata>;
  detail?: boolean;  // NEW: false = brief (default), true = full details
}

export class EventLogger extends EventEmitter {
  private config: Required<EventLoggerConfig>;
  private currentLogPath: string;
  private logStream: fs.WriteStream | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private buffer: LogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 1000; // ms
  private flushTimer: NodeJS.Timeout | null = null;
  
  constructor(config?: EventLoggerConfig) {
    super();
    
    // Set default configuration
    this.config = {
      logDir: config?.logDir || getDefaultLogDirectory(),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      rotationInterval: 'daily',
      format: 'json',
      enableConsole: false,
      sessionId: this.generateSessionId(),
      detail: false,  // Brief mode by default
      metadata: {
        pid: process.pid,
        hostname: os.hostname(),
        theme: 'infra_external-log-lib',
        user: process.env.USER || 'unknown',
        ...config?.metadata
      },
      ...config
    };
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Initialize log file
    this.currentLogPath = this.getLogFileName();
    this.initializeLogStream();
    
    // Setup rotation
    this.setupRotation();
    
    // Setup buffer flush
    this.setupBufferFlush();
    
    // Log system start
    this.logEvent(LogEventType.EVENT_SYSTEM_START, 'EventLogger initialized');
  }
  
  /**
   * Log a task queue change
   */
  async logTaskQueueChange(
    action: 'created' | 'updated' | "completed" | 'deleted',
    taskId: string,
    taskData?: any
  ): void {
    const eventType = `task_queue.${action}` as LogEventType;
    
    // Extract essential info if not in detail mode
    let logData: any;
    let message: string;
    
    if (this.config.detail) {
      // Full details mode
      logData = { taskId, ...taskData };
      message = `Task ${taskId} ${action}`;
    } else {
      // Brief mode - only essential info
      const essentials = extractTaskEssentials({ id: taskId, ...taskData });
      const brief = formatEssentialInfo(essentials);
      logData = { 
        taskId,
        brief,
        essential: essentials
      };
      message = `Task ${action}: ${brief}`;
    }
    
    this.log('info', eventType, 'task_queue', message, logData);
  }
  
  /**
   * Log a feature change
   */
  async logFeatureChange(
    action: 'created' | 'updated' | "completed" | 'deleted',
    featureId: string,
    featureData?: any
  ): void {
    const eventType = `feature.${action}` as LogEventType;
    
    let logData: any;
    let message: string;
    
    if (this.config.detail) {
      // Full details mode
      logData = { featureId, ...featureData };
      message = `Feature ${featureId} ${action}`;
    } else {
      // Brief mode - only essential info
      const essentials = extractFeatureEssentials({ id: featureId, ...featureData });
      const brief = formatEssentialInfo(essentials);
      logData = {
        featureId,
        brief,
        essential: essentials
      };
      message = `Feature ${action}: ${brief}`;
    }
    
    this.log('info', eventType, 'feature', message, logData);
  }
  
  /**
   * Log a name ID change
   */
  async logNameIdChange(
    action: 'created' | 'updated' | 'deleted',
    nameId: string,
    entityData?: any
  ): void {
    const eventType = `name_id.${action}` as LogEventType;
    
    let logData: any;
    let message: string;
    
    if (this.config.detail) {
      // Full details mode
      logData = { nameId, ...entityData };
      message = `Name ID ${nameId} ${action}`;
    } else {
      // Brief mode - only essential info
      const essentials = extractNameIdEssentials(nameId, entityData);
      const brief = formatEssentialInfo(essentials);
      logData = {
        nameId,
        brief,
        essential: essentials
      };
      message = `Name ID ${action}: ${brief}`;
    }
    
    this.log('info', eventType, 'name_id', message, logData);
  }
  
  /**
   * Log a system event
   */
  async logEvent(type: LogEventType, message: string, data?: any): void {
    const level = this.getLogLevelForEventType(type);
    this.log(level, type, 'event', message, data);
  }
  
  /**
   * Log a rejection
   */
  async logRejection(
    type: 'file_violation' | 'permission_denied' | 'validation_failed' | 'quota_exceeded',
    message: string,
    details?: any
  ): void {
    const eventType = `rejection.${type}` as LogEventType;
    this.log('warn', eventType, "rejection", message, details);
    this.emit("rejection", { type, message, details });
  }
  
  /**
   * Log a file operation
   */
  async logFileOperation(
    operation: 'created' | "modified" | 'deleted' | 'moved',
    filePath: string,
    details?: any
  ): void {
    const eventType = `file.${operation}` as LogEventType;
    this.log('info', eventType, 'file', `File ${operation}: ${filePath}`, {
      filePath,
      ...details
    });
  }
  
  /**
   * Core logging method
   */
  private async log(
    level: LogEntry['level'],
    type: LogEventType,
    category: string,
    message: string,
    data?: any
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      type,
      category,
      message,
      data,
      metadata: {
        ...this.config.metadata as LogMetadata,
        sessionId: this.config.sessionId,
        correlationId: this.generateCorrelationId()
      }
    };
    
    // Add to buffer
    this.buffer.push(entry);
    
    // Console output if enabled
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }
    
    // Emit event
    this.emit('log', entry);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }
  
  /**
   * Flush buffer to file
   */
  private async flush(): void {
    if (this.buffer.length === 0 || !this.logStream) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    for (const entry of entries) {
      const line = this.formatLogEntry(entry);
      this.logStream.write(line + '\n');
    }
  }
  
  /**
   * Format log entry based on configuration
   */
  private formatLogEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify(entry);
    } else {
      // Text format
      const { timestamp, level, type, category, message, data } = entry;
      const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
      return `[${timestamp}] [${level.toUpperCase()}] [${type}] ${message}${dataStr}`;
    }
  }
  
  /**
   * Log to console
   */
  private async logToConsole(entry: LogEntry): void {
    const { level, type, message } = entry;
    const prefix = `[${type}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message);
        break;
      case 'info':
        console.info(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
      case 'fatal':
        console.error(prefix, message);
        break;
    }
  }
  
  /**
   * Get log level for event type
   */
  private async getLogLevelForEventType(type: LogEventType): LogEntry['level'] {
    if (type.includes('error') || type.includes('fatal')) return 'error';
    if (type.includes('warn') || type.includes("rejection")) return 'warn';
    if (type.includes('debug')) return 'debug';
    return 'info';
  }
  
  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDir)) {
      await fileAPI.createDirectory(this.config.logDir);
    }
  }
  
  /**
   * Get log file name
   */
  private async getLogFileName(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    if (this.config.rotationInterval === 'hourly') {
      const hour = date.getHours().toString().padStart(2, '0');
      return path.join(this.config.logDir, `events-${dateStr}-${hour}.log`);
    } else {
      return path.join(this.config.logDir, `events-${dateStr}.log`);
    }
  }
  
  /**
   * Initialize log stream
   */
  private async initializeLogStream(): void {
    if (this.logStream) {
      this.logStream.end();
    }
    
    this.logStream = fileAPI.createWriteStream(this.currentLogPath, {
      flags: 'a',
      encoding: 'utf8'
    });
    
    this.logStream.on('error', (error) => {
      console.error('Log stream error:', error);
      this.emit('error', error);
    });
  }
  
  /**
   * Setup log rotation
   */
  private async setupRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    
    if (this.config.rotationInterval === 'daily') {
      // Rotate at midnight
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        this.rotate();
        // Then rotate every 24 hours
        this.rotationTimer = setInterval(() => this.rotate(), 24 * 60 * 60 * 1000);
      }, msUntilMidnight);
      
    } else if (this.config.rotationInterval === 'hourly') {
      // Rotate every hour
      this.rotationTimer = setInterval(() => this.rotate(), 60 * 60 * 1000);
    }
    
    // Also check size-based rotation periodically
    setInterval(() => this.checkSizeRotation(), 60 * 1000); // Check every minute
  }
  
  /**
   * Setup buffer flush timer
   */
  private async setupBufferFlush(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }
  
  /**
   * Rotate log file
   */
  private async rotate(): void {
    this.flush();
    this.logEvent(LogEventType.LOG_ROTATION, 'Rotating log file');
    
    if (this.logStream) {
      this.logStream.end();
    }
    
    this.currentLogPath = this.getLogFileName();
    this.initializeLogStream();
    
    this.cleanupOldLogs();
  }
  
  /**
   * Check if size-based rotation is needed
   */
  private async checkSizeRotation(): void {
    if (this.config.rotationInterval !== 'size') return;
    
    try {
      const stats = fs.statSync(this.currentLogPath);
      if (stats.size >= this.config.maxFileSize) {
        this.rotate();
      }
    } catch (error) {
      // File doesn't exist yet
    }
  }
  
  /**
   * Cleanup old log files
   */
  private async cleanupOldLogs(): void {
    const files = fs.readdirSync(this.config.logDir)
      .filter(file => file.startsWith('events-') && file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(this.config.logDir, file),
        mtime: fs.statSync(path.join(this.config.logDir, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    // Keep only maxFiles
    if (files.length > this.config.maxFiles) {
      const filesToDelete = files.slice(this.config.maxFiles);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        this.logEvent(LogEventType.LOG_CLEANUP, `Deleted old log: ${file.name}`);
      }
    }
  }
  
  /**
   * Generate session ID
   */
  private async generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate correlation ID
   */
  private async generateCorrelationId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Query logs
   */
  async query(options: {
    startDate?: Date;
    endDate?: Date;
    type?: LogEventType | LogEventType[];
    level?: LogEntry['level'] | LogEntry['level'][];
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    const results: LogEntry[] = [];
    const { startDate, endDate, type, level, category, search, limit = 1000 } = options;
    
    // Get log files to search
    const files = fs.readdirSync(this.config.logDir)
      .filter(file => file.startsWith('events-') && file.endsWith('.log'))
      .map(file => path.join(this.config.logDir, file));
    
    for (const file of files) {
      const content = fileAPI.readFileSync(file, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (results.length >= limit) break;
        
        try {
          const entry = JSON.parse(line) as LogEntry;
          
          // Apply filters
          if (startDate && new Date(entry.timestamp) < startDate) continue;
          if (endDate && new Date(entry.timestamp) > endDate) continue;
          if (type) {
            const types = Array.isArray(type) ? type : [type];
            if (!types.includes(entry.type)) continue;
          }
          if (level) {
            const levels = Array.isArray(level) ? level : [level];
            if (!levels.includes(entry.level)) continue;
          }
          if (category && entry.category !== category) continue;
          if (search && !JSON.stringify(entry).includes(search)) continue;
          
          results.push(entry);
        } catch (error) {
          // Skip malformed lines
        }
      }
      
      if (results.length >= limit) break;
    }
    
    return results;
  }
  
  /**
   * Get current log file path
   */
  async getCurrentLogPath(): string {
    return this.currentLogPath;
  }
  
  /**
   * Get log directory
   */
  async getLogDirectory(): string {
    return this.config.logDir;
  }
  
  /**
   * Set detail mode
   */
  async setDetailMode(enabled: boolean): void {
    this.config.detail = enabled;
    this.logEvent(
      LogEventType.EVENT_CUSTOM,
      `Detail mode ${enabled ? 'enabled' : "disabled"}`
    );
  }
  
  /**
   * Get detail mode status
   */
  async isDetailMode(): boolean {
    return this.config.detail;
  }
  
  /**
   * Close logger
   */
  async close(): void {
    this.flush();
    this.logEvent(LogEventType.EVENT_SYSTEM_STOP, 'EventLogger shutting down');
    
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    if (this.logStream) {
      this.logStream.end();
    }
    
    this.removeAllListeners();
  }
}

// Singleton instance
let loggerInstance: EventLogger | null = null;

/**
 * Get or create logger instance
 */
export function getEventLogger(config?: EventLoggerConfig): EventLogger {
  if (!loggerInstance) {
    loggerInstance = new EventLogger(config);
  }
  return loggerInstance;
}

export default EventLogger;