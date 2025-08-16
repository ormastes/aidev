import { fileAPI } from '../utils/file-api';
/**
 * ComprehensiveLogger
 * 
 * Main logging system that combines EventLogger, VfJsonWatcher, and RejectionTracker
 * Provides a unified interface for all logging needs
 */

import * as path from 'node:path';
import * as os from 'os';
import { EventEmitter } from 'node:events';
import { EventLogger, LogEventType, LogEntry, EventLoggerConfig } from './EventLogger';
import { VfJsonWatcher, VfJsonChange, VfJsonWatcherConfig } from './VfJsonWatcher';
import { RejectionTracker, Rejection, RejectionType, RejectionTrackerConfig } from './RejectionTracker';
import { FileViolationPreventer, FileViolationError } from '../validators/FileViolationPreventer';
import { getDefaultLogDirectory } from '../config/log-config';

export interface ComprehensiveLoggerConfig {
  enabled?: boolean;
  logDir?: string;
  watchVfJson?: boolean;
  trackRejections?: boolean;
  integrateWithFileViolationPreventer?: boolean;
  detail?: boolean;  // NEW: false = brief (default), true = full details
  eventLoggerConfig?: Partial<EventLoggerConfig>;
  vfJsonWatcherConfig?: Partial<VfJsonWatcherConfig>;
  rejectionTrackerConfig?: Partial<RejectionTrackerConfig>;
}

export interface LoggingSummary {
  startTime: Date;
  uptime: number;
  eventsLogged: number;
  vfJsonChanges: number;
  rejectionsTracked: number;
  currentLogPath: string;
  logSizeBytes?: number;
}

export class ComprehensiveLogger extends EventEmitter {
  private config: Required<ComprehensiveLoggerConfig>;
  private eventLogger!: EventLogger;
  private vfJsonWatcher: VfJsonWatcher | null = null;
  private rejectionTracker: RejectionTracker | null = null;
  private fileViolationPreventer: FileViolationPreventer | null = null;
  private startTime: Date;
  private eventCount = 0;
  private vfJsonChangeCount = 0;
  private rejectionCount = 0;
  
  constructor(config?: ComprehensiveLoggerConfig) {
    super();
    
    this.startTime = new Date();
    
    // Set default configuration
    const baseLogDir = config?.logDir || getDefaultLogDirectory();
    this.config = {
      enabled: true,
      logDir: baseLogDir,
      watchVfJson: true,
      trackRejections: true,
      integrateWithFileViolationPreventer: true,
      detail: false,  // Brief mode by default
      eventLoggerConfig: {},
      vfJsonWatcherConfig: {},
      rejectionTrackerConfig: {},
      ...config
    };
    
    if (!this.config.enabled) {
      return;
    }
    
    // Initialize EventLogger with detail mode
    this.eventLogger = new EventLogger({
      logDir: path.join(this.config.logDir, 'events'),
      detail: this.config.detail,  // Pass detail mode to EventLogger
      ...this.config.eventLoggerConfig
    });
    
    // Initialize VfJsonWatcher if enabled
    if (this.config.watchVfJson) {
      this.vfJsonWatcher = new VfJsonWatcher({
        logger: this.eventLogger,
        ...this.config.vfJsonWatcherConfig
      });
      
      this.vfJsonWatcher.on('change', this.handleVfJsonChange.bind(this));
    }
    
    // Initialize RejectionTracker if enabled
    if (this.config.trackRejections) {
      this.rejectionTracker = new RejectionTracker({
        logger: this.eventLogger,
        rejectionFilePath: path.join(this.config.logDir, 'rejections.json'),
        ...this.config.rejectionTrackerConfig
      });
      
      this.rejectionTracker.on("rejection", this.handleRejection.bind(this));
      this.rejectionTracker.on("resolved", this.handleRejectionResolved.bind(this));
    }
    
    // Setup FileViolationPreventer integration
    if (this.config.integrateWithFileViolationPreventer) {
      this.setupFileViolationIntegration();
    }
    
    // Setup event counting
    this.eventLogger.on('log', () => this.eventCount++);
    
    // Log startup
    this.logSystemEvent('start', 'ComprehensiveLogger initialized', {
      config: this.config,
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    });
  }
  
  /**
   * Start logging (begins watching)
   */
  async start(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Start VfJsonWatcher
    if (this.vfJsonWatcher) {
      await this.vfJsonWatcher.start();
    }
    
    this.logSystemEvent('ready', 'ComprehensiveLogger ready and watching');
    this.emit('ready');
  }
  
  /**
   * Stop logging
   */
  stop(): void {
    if (!this.config.enabled) return;
    
    // Generate summary
    const summary = this.getSummary();
    this.logSystemEvent('stop', 'ComprehensiveLogger stopping', summary);
    
    // Stop watchers
    if (this.vfJsonWatcher) {
      this.vfJsonWatcher.stop();
    }
    
    // Close trackers
    if (this.rejectionTracker) {
      this.rejectionTracker.close();
    }
    
    // Close event logger
    this.eventLogger.close();
    
    this.emit('stopped', summary);
  }
  
  /**
   * Log a system event
   */
  logSystemEvent(type: string, message: string, data?: any): void {
    if (!this.config.enabled) return;
    
    const eventType = `event.${type}` as LogEventType;
    this.eventLogger.logEvent(eventType, message, data);
  }
  
  /**
   * Log a custom event
   */
  logEvent(message: string, level: 'info' | 'warn' | 'error' = 'info', data?: any): void {
    if (!this.config.enabled) return;
    
    const eventType = level === 'error' ? LogEventType.EVENT_ERROR :
                     level === 'warn' ? LogEventType.EVENT_WARNING :
                     LogEventType.EVENT_CUSTOM;
    
    this.eventLogger.logEvent(eventType, message, data);
  }
  
  /**
   * Log task queue change
   */
  logTaskChange(
    action: 'created' | 'updated' | "completed" | 'deleted',
    taskId: string,
    taskData?: any
  ): void {
    if (!this.config.enabled) return;
    this.eventLogger.logTaskQueueChange(action, taskId, taskData);
  }
  
  /**
   * Log feature change
   */
  logFeatureChange(
    action: 'created' | 'updated' | "completed" | 'deleted',
    featureId: string,
    featureData?: any
  ): void {
    if (!this.config.enabled) return;
    this.eventLogger.logFeatureChange(action, featureId, featureData);
  }
  
  /**
   * Log name ID change
   */
  logNameIdChange(
    action: 'created' | 'updated' | 'deleted',
    nameId: string,
    entityData?: any
  ): void {
    if (!this.config.enabled) return;
    this.eventLogger.logNameIdChange(action, nameId, entityData);
  }
  
  /**
   * Log file operation
   */
  logFileOperation(
    operation: 'created' | "modified" | 'deleted' | 'moved',
    filePath: string,
    details?: any
  ): void {
    if (!this.config.enabled) return;
    this.eventLogger.logFileOperation(operation, filePath, details);
  }
  
  /**
   * Track a rejection
   */
  trackRejection(type: RejectionType, reason: string, details?: any): Rejection | undefined {
    if (!this.config.enabled || !this.rejectionTracker) return undefined;
    
    this.rejectionCount++;
    return this.rejectionTracker.trackRejection(type, reason, details);
  }
  
  /**
   * Track a file violation
   */
  trackFileViolation(error: FileViolationError, operation?: string): Rejection | undefined {
    if (!this.config.enabled || !this.rejectionTracker) return undefined;
    
    this.rejectionCount++;
    return this.rejectionTracker.trackFileViolation(error, operation);
  }
  
  /**
   * Query logs
   */
  async queryLogs(options: {
    startDate?: Date;
    endDate?: Date;
    type?: LogEventType | LogEventType[];
    level?: LogEntry['level'] | LogEntry['level'][];
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    if (!this.config.enabled) return [];
    return this.eventLogger.query(options);
  }
  
  /**
   * Get rejections
   */
  getRejections(options?: {
    resolved?: boolean;
    type?: RejectionType;
    severity?: string;
    path?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Rejection[] {
    if (!this.config.enabled || !this.rejectionTracker) return [];
    return this.rejectionTracker.getAllRejections(options);
  }
  
  /**
   * Get summary
   */
  getSummary(): LoggingSummary {
    const uptime = Date.now() - this.startTime.getTime();
    
    const summary: LoggingSummary = {
      startTime: this.startTime,
      uptime,
      eventsLogged: this.eventCount,
      vfJsonChanges: this.vfJsonChangeCount,
      rejectionsTracked: this.rejectionCount,
      currentLogPath: this.eventLogger.getCurrentLogPath()
    };
    
    // Try to get log file size
    try {
      const fs = require('../../layer/themes/infra_external-log-lib/src');
      const stats = fs.statSync(summary.currentLogPath);
      summary.logSizeBytes = stats.size;
    } catch (error) {
      // Ignore
    }
    
    return summary;
  }
  
  /**
   * Generate report
   */
  generateReport(): string {
    const summary = this.getSummary();
    const uptimeSeconds = Math.round(summary.uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    
    const report: string[] = [
      '# Comprehensive Logging Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Start Time: ${summary.startTime.toISOString()}`,
      `- Uptime: ${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
      `- Events Logged: ${summary.eventsLogged}`,
      `- VF.json Changes: ${summary.vfJsonChanges}`,
      `- Rejections Tracked: ${summary.rejectionsTracked}`,
      `- Current Log: ${summary.currentLogPath}`
    ];
    
    if (summary.logSizeBytes) {
      const sizeMB = (summary.logSizeBytes / (1024 * 1024)).toFixed(2);
      report.push(`- Log Size: ${sizeMB} MB`);
    }
    
    // Add rejection statistics if available
    if (this.rejectionTracker) {
      const rejectionStats = this.rejectionTracker.getStatistics();
      report.push(
        '',
        '## Rejection Statistics',
        `- Total: ${rejectionStats.total}`,
        `- Resolved: ${rejectionStats.resolved}`,
        `- Unresolved: ${rejectionStats.unresolved}`
      );
      
      if (rejectionStats.mostCommonType) {
        report.push(`- Most Common Type: ${rejectionStats.mostCommonType}`);
      }
      
      if (rejectionStats.mostCommonPath) {
        report.push(`- Most Common Path: ${rejectionStats.mostCommonPath}`);
      }
    }
    
    // Add watched files if available
    if (this.vfJsonWatcher) {
      const watchedFiles = this.vfJsonWatcher.getWatchedFiles();
      report.push(
        '',
        '## Watched VF.json Files',
        `- Total: ${watchedFiles.length}`
      );
      
      for (const file of watchedFiles) {
        report.push(`- ${file.type}: ${file.path}`);
      }
    }
    
    return report.join('\n');
  }
  
  /**
   * Handle VfJsonChange event
   */
  private handleVfJsonChange(change: VfJsonChange): void {
    this.vfJsonChangeCount++;
    this.emit("vfJsonChange", change);
  }
  
  /**
   * Handle rejection event
   */
  private handleRejection(rejection: Rejection): void {
    this.emit("rejection", rejection);
  }
  
  /**
   * Handle rejection resolved event
   */
  private handleRejectionResolved(rejection: Rejection): void {
    this.emit("rejectionResolved", rejection);
  }
  
  /**
   * Setup FileViolationPreventer integration
   */
  private setupFileViolationIntegration(): void {
    try {
      // Hook into FileViolationPreventer if available
      const originalWriteFile = require('../../layer/themes/infra_external-log-lib/src').writeFileSync;
      const self = this;
      
      require('node:fs').writeFileSync = function(path: string, ...args: any[]) {
        try {
          // Attempt write
          return originalWriteFile.call(this, path, ...args);
        } catch (error) {
          // Log if it's a violation
          if (error && (error as any).name === "FileViolationError") {
            self.trackFileViolation(error as FileViolationError, 'write');
          }
          throw error;
        }
      };
    } catch (error) {
      // Ignore integration errors
    }
  }
  
  /**
   * Get log directory
   */
  getLogDirectory(): string {
    return this.config.logDir;
  }
  
  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * Set detail mode
   */
  setDetailMode(enabled: boolean): void {
    this.config.detail = enabled;
    this.eventLogger.setDetailMode(enabled);
    
    this.logSystemEvent('config', `Detail mode ${enabled ? 'enabled' : "disabled"}`);
  }
  
  /**
   * Get detail mode status
   */
  isDetailMode(): boolean {
    return this.config.detail;
  }
  
  /**
   * Enable detail mode (full logging)
   */
  enableDetailMode(): void {
    this.setDetailMode(true);
  }
  
  /**
   * Disable detail mode (brief logging)
   */
  disableDetailMode(): void {
    this.setDetailMode(false);
  }
}

// Singleton instance
let loggerInstance: ComprehensiveLogger | null = null;

/**
 * Get or create comprehensive logger instance
 */
export function getComprehensiveLogger(config?: ComprehensiveLoggerConfig): ComprehensiveLogger {
  if (!loggerInstance) {
    loggerInstance = new ComprehensiveLogger(config);
  }
  return loggerInstance;
}

/**
 * Initialize and start comprehensive logging
 */
export async function startComprehensiveLogging(config?: ComprehensiveLoggerConfig): Promise<ComprehensiveLogger> {
  const logger = getComprehensiveLogger(config);
  await logger.start();
  return logger;
}

export default ComprehensiveLogger;