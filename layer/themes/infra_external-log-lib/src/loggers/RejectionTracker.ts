/**
 * RejectionTracker
 * 
 * Tracks and logs file operation rejections and violations
 * Integrates with FileViolationPreventer to capture all rejections
 */

import { EventEmitter } from 'events';
import { EventLogger, LogEventType } from './EventLogger';
import { FileViolationError } from '../validators/FileViolationPreventer';
import { getFileAPI, FileType } from '../../pipe';

const fileAPI = getFileAPI();


export interface Rejection {
  id: string;
  timestamp: Date;
  type: RejectionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  path?: string;
  operation?: string;
  reason: string;
  details?: any;
  stackTrace?: string;
  resolved?: boolean;
  resolutionTime?: Date;
  resolutionNotes?: string;
}

export enum RejectionType {
  FILE_VIOLATION = 'file_violation',
  PERMISSION_DENIED = 'permission_denied',
  VALIDATION_FAILED = 'validation_failed',
  QUOTA_EXCEEDED = 'quota_exceeded',
  FREEZE_VIOLATION = 'freeze_violation',
  PATTERN_MISMATCH = 'pattern_mismatch',
  DUPLICATE_FILE = 'duplicate_file',
  BACKUP_FILE = 'backup_file',
  UNEXPECTED_DIRECTORY = 'unexpected_directory',
  MISSING_REQUIRED = 'missing_required',
  SYSTEM_ERROR = 'system_error'
}

export interface RejectionStats {
  total: number;
  byType: Record<RejectionType, number>;
  bySeverity: Record<string, number>;
  resolved: number;
  unresolved: number;
  averageResolutionTime?: number;
  mostCommonType?: RejectionType;
  mostCommonPath?: string;
}

export interface RejectionTrackerConfig {
  logger?: EventLogger;
  maxRejections?: number;
  autoResolveTimeout?: number; // ms
  persistRejections?: boolean;
  rejectionFilePath?: string;
}

export class RejectionTracker extends EventEmitter {
  private config: Required<RejectionTrackerConfig>;
  private logger: EventLogger;
  private rejections: Map<string, Rejection> = new Map();
  private rejectionHistory: Rejection[] = [];
  private pathRejectionCount: Map<string, number> = new Map();
  private autoResolveTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(config?: RejectionTrackerConfig) {
    super();
    
    this.config = {
      logger: config?.logger || new EventLogger(),
      maxRejections: 10000,
      autoResolveTimeout: 0, // Disabled by default
      persistRejections: true,
      rejectionFilePath: '/tmp/external-log-lib/rejections.json',
      ...config
    };
    
    this.logger = this.config.logger;
    
    // Load persisted rejections if enabled
    if (this.config.persistRejections) {
      this.loadPersistedRejections();
    }
    
    // Setup process hooks
    this.setupProcessHooks();
  }
  
  /**
   * Track a rejection
   */
  async trackRejection(
    type: RejectionType,
    reason: string,
    details?: {
      path?: string;
      operation?: string;
      error?: Error | FileViolationError;
      additionalInfo?: any;
    }
  ): Rejection {
    const rejection: Rejection = {
      id: this.generateRejectionId(),
      timestamp: new Date(),
      type,
      severity: this.determineSeverity(type),
      path: details?.path,
      operation: details?.operation,
      reason,
      details: details?.additionalInfo,
      stackTrace: details?.error?.stack,
      resolved: false
    };
    
    // Store rejection
    this.rejections.set(rejection.id, rejection);
    this.rejectionHistory.push(rejection);
    
    // Update path rejection count
    if (rejection.path) {
      const count = this.pathRejectionCount.get(rejection.path) || 0;
      this.pathRejectionCount.set(rejection.path, count + 1);
      
      // Warn if path has too many rejections
      if (count + 1 >= 5) {
        this.logger.logEvent(
          LogEventType.EVENT_WARNING,
          `Path ${rejection.path} has ${count + 1} rejections`,
          { path: rejection.path, count: count + 1 }
        );
      }
    }
    
    // Log the rejection
    this.logger.logRejection(
      this.mapRejectionTypeToLogType(type),
      reason,
      {
        id: rejection.id,
        path: rejection.path,
        operation: rejection.operation,
        details: rejection.details
      }
    );
    
    // Emit event
    this.emit('rejection', rejection);
    
    // Setup auto-resolve if configured
    if (this.config.autoResolveTimeout > 0) {
      this.setupAutoResolve(rejection);
    }
    
    // Maintain max rejections limit
    this.enforceMaxRejections();
    
    // Persist if enabled
    if (this.config.persistRejections) {
      this.persistRejections();
    }
    
    return rejection;
  }
  
  /**
   * Track a file violation error
   */
  async trackFileViolation(error: FileViolationError, operation?: string): Rejection {
    const type = this.mapViolationTypeToRejectionType(error.violationType);
    
    return this.trackRejection(type, error.message, {
      path: error.path,
      operation,
      error,
      additionalInfo: { violationType: error.violationType }
    });
  }
  
  /**
   * Resolve a rejection
   */
  async resolveRejection(id: string, notes?: string): boolean {
    const rejection = this.rejections.get(id);
    if (!rejection || rejection.resolved) {
      return false;
    }
    
    rejection.resolved = true;
    rejection.resolutionTime = new Date();
    rejection.resolutionNotes = notes;
    
    // Clear auto-resolve timer
    const timer = this.autoResolveTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.autoResolveTimers.delete(id);
    }
    
    // Log resolution
    this.logger.logEvent(
      LogEventType.EVENT_CUSTOM,
      `Rejection ${id} resolved`,
      {
        id,
        type: rejection.type,
        path: rejection.path,
        notes
      }
    );
    
    // Emit event
    this.emit('resolved', rejection);
    
    // Persist if enabled
    if (this.config.persistRejections) {
      this.persistRejections();
    }
    
    return true;
  }
  
  /**
   * Get rejection by ID
   */
  async getRejection(id: string): Rejection | undefined {
    return this.rejections.get(id);
  }
  
  /**
   * Get all rejections
   */
  async getAllRejections(options?: {
    resolved?: boolean;
    type?: RejectionType;
    severity?: string;
    path?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Rejection[] {
    let results = Array.from(this.rejections.values());
    
    if (options) {
      if (options.resolved !== undefined) {
        results = results.filter(r => r.resolved === options.resolved);
      }
      if (options.type) {
        results = results.filter(r => r.type === options.type);
      }
      if (options.severity) {
        results = results.filter(r => r.severity === options.severity);
      }
      if (options.path) {
        results = results.filter(r => r.path === options.path);
      }
      if (options.startDate) {
        results = results.filter(r => r.timestamp >= options.startDate!);
      }
      if (options.endDate) {
        results = results.filter(r => r.timestamp <= options.endDate!);
      }
      if (options.limit) {
        results = results.slice(0, options.limit);
      }
    }
    
    return results;
  }
  
  /**
   * Get rejection statistics
   */
  async getStatistics(): RejectionStats {
    const stats: RejectionStats = {
      total: this.rejections.size,
      byType: {} as Record<RejectionType, number>,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      resolved: 0,
      unresolved: 0
    };
    
    // Count rejections
    for (const rejection of this.rejections.values()) {
      // By type
      stats.byType[rejection.type] = (stats.byType[rejection.type] || 0) + 1;
      
      // By severity
      stats.bySeverity[rejection.severity]++;
      
      // By resolution status
      if (rejection.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }
    }
    
    // Calculate average resolution time
    const resolvedRejections = Array.from(this.rejections.values())
      .filter(r => r.resolved && r.resolutionTime);
    
    if (resolvedRejections.length > 0) {
      const totalTime = resolvedRejections.reduce((sum, r) => {
        const time = r.resolutionTime!.getTime() - r.timestamp.getTime();
        return sum + time;
      }, 0);
      stats.averageResolutionTime = totalTime / resolvedRejections.length;
    }
    
    // Find most common type
    if (Object.keys(stats.byType).length > 0) {
      stats.mostCommonType = Object.entries(stats.byType)
        .sort(([, a], [, b]) => b - a)[0][0] as RejectionType;
    }
    
    // Find most common path
    if (this.pathRejectionCount.size > 0) {
      const sortedPaths = Array.from(this.pathRejectionCount.entries())
        .sort(([, a], [, b]) => b - a);
      stats.mostCommonPath = sortedPaths[0][0];
    }
    
    return stats;
  }
  
  /**
   * Clear resolved rejections
   */
  async clearResolved(): number {
    const resolved = Array.from(this.rejections.values())
      .filter(r => r.resolved);
    
    for (const rejection of resolved) {
      this.rejections.delete(rejection.id);
    }
    
    this.logger.logEvent(
      LogEventType.LOG_CLEANUP,
      `Cleared ${resolved.length} resolved rejections`
    );
    
    return resolved.length;
  }
  
  /**
   * Generate report
   */
  async generateReport(): string {
    const stats = this.getStatistics();
    const report: string[] = [
      '# Rejection Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Statistics',
      `- Total Rejections: ${stats.total}`,
      `- Resolved: ${stats.resolved}`,
      `- Unresolved: ${stats.unresolved}`,
      ''
    ];
    
    if (stats.averageResolutionTime) {
      const avgTime = Math.round(stats.averageResolutionTime / 1000);
      report.push(`- Average Resolution Time: ${avgTime} seconds`);
    }
    
    if (stats.mostCommonType) {
      report.push(`- Most Common Type: ${stats.mostCommonType}`);
    }
    
    if (stats.mostCommonPath) {
      report.push(`- Most Common Path: ${stats.mostCommonPath}`);
    }
    
    report.push('', '## By Type');
    for (const [type, count] of Object.entries(stats.byType)) {
      report.push(`- ${type}: ${count}`);
    }
    
    report.push('', '## By Severity');
    for (const [severity, count] of Object.entries(stats.bySeverity)) {
      report.push(`- ${severity}: ${count}`);
    }
    
    report.push('', '## Recent Unresolved Rejections');
    const unresolved = this.getAllRejections({ resolved: false, limit: 10 });
    for (const rejection of unresolved) {
      report.push(`- [${rejection.id}] ${rejection.type}: ${rejection.reason}`);
      if (rejection.path) {
        report.push(`  Path: ${rejection.path}`);
      }
    }
    
    return report.join('\n');
  }
  
  /**
   * Determine severity based on rejection type
   */
  private async determineSeverity(type: RejectionType): Rejection['severity'] {
    switch (type) {
      case RejectionType.FREEZE_VIOLATION:
      case RejectionType.PERMISSION_DENIED:
      case RejectionType.SYSTEM_ERROR:
        return 'critical';
        
      case RejectionType.FILE_VIOLATION:
      case RejectionType.VALIDATION_FAILED:
      case RejectionType.MISSING_REQUIRED:
        return 'high';
        
      case RejectionType.PATTERN_MISMATCH:
      case RejectionType.UNEXPECTED_DIRECTORY:
      case RejectionType.DUPLICATE_FILE:
        return 'medium';
        
      case RejectionType.BACKUP_FILE:
      case RejectionType.QUOTA_EXCEEDED:
      default:
        return 'low';
    }
  }
  
  /**
   * Map rejection type to log type
   */
  private async mapRejectionTypeToLogType(type: RejectionType): 'file_violation' | 'permission_denied' | 'validation_failed' | 'quota_exceeded' {
    switch (type) {
      case RejectionType.FILE_VIOLATION:
      case RejectionType.FREEZE_VIOLATION:
      case RejectionType.PATTERN_MISMATCH:
      case RejectionType.DUPLICATE_FILE:
      case RejectionType.BACKUP_FILE:
      case RejectionType.UNEXPECTED_DIRECTORY:
      case RejectionType.MISSING_REQUIRED:
        return 'file_violation';
        
      case RejectionType.PERMISSION_DENIED:
        return 'permission_denied';
        
      case RejectionType.VALIDATION_FAILED:
        return 'validation_failed';
        
      case RejectionType.QUOTA_EXCEEDED:
        return 'quota_exceeded';
        
      default:
        return 'validation_failed';
    }
  }
  
  /**
   * Map violation type to rejection type
   */
  private async mapViolationTypeToRejectionType(violationType: string): RejectionType {
    switch (violationType) {
      case 'freeze_violation':
        return RejectionType.FREEZE_VIOLATION;
      case 'pattern_violation':
      case 'pattern_mismatch':
        return RejectionType.PATTERN_MISMATCH;
      case 'backup_file':
        return RejectionType.BACKUP_FILE;
      case 'duplicate_mock':
      case 'duplicate_file':
        return RejectionType.DUPLICATE_FILE;
      case 'unexpected_directory':
        return RejectionType.UNEXPECTED_DIRECTORY;
      case 'missing_required':
        return RejectionType.MISSING_REQUIRED;
      default:
        return RejectionType.FILE_VIOLATION;
    }
  }
  
  /**
   * Setup auto-resolve timer
   */
  private async setupAutoResolve(rejection: Rejection): void {
    const timer = setTimeout(() => {
      this.resolveRejection(rejection.id, 'Auto-resolved after timeout');
      this.autoResolveTimers.delete(rejection.id);
    }, this.config.autoResolveTimeout);
    
    this.autoResolveTimers.set(rejection.id, timer);
  }
  
  /**
   * Enforce max rejections limit
   */
  private async enforceMaxRejections(): void {
    if (this.rejections.size > this.config.maxRejections) {
      // Remove oldest resolved rejections first
      const resolved = Array.from(this.rejections.values())
        .filter(r => r.resolved)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const toRemove = Math.min(
        resolved.length,
        this.rejections.size - this.config.maxRejections
      );
      
      for (let i = 0; i < toRemove; i++) {
        this.rejections.delete(resolved[i].id);
      }
      
      // If still over limit, remove oldest unresolved
      if (this.rejections.size > this.config.maxRejections) {
        const unresolved = Array.from(this.rejections.values())
          .filter(r => !r.resolved)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        const toRemove = this.rejections.size - this.config.maxRejections;
        
        for (let i = 0; i < toRemove; i++) {
          this.rejections.delete(unresolved[i].id);
        }
      }
    }
  }
  
  /**
   * Generate rejection ID
   */
  private async generateRejectionId(): string {
    return `REJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Persist rejections to file
   */
  private async persistRejections(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dir = path.dirname(this.config.rejectionFilePath);
      if (!fs.existsSync(dir)) {
        await fileAPI.createDirectory(dir);
      }
      
      const data = {
        timestamp: new Date().toISOString(),
        rejections: Array.from(this.rejections.values()),
        statistics: this.getStatistics()
      };
      
      await fileAPI.createFile(this.config.rejectionFilePath, JSON.stringify(data, { type: FileType.TEMPORARY })
      );
    } catch (error) {
      console.error('Failed to persist rejections:', error);
    }
  }
  
  /**
   * Load persisted rejections
   */
  private async loadPersistedRejections(): void {
    try {
      const fs = require('fs');
      
      if (!fs.existsSync(this.config.rejectionFilePath)) {
        return;
      }
      
      const data = JSON.parse(
        fs.readFileSync(this.config.rejectionFilePath, 'utf8')
      );
      
      if (data.rejections) {
        for (const rejection of data.rejections) {
          // Convert dates
          rejection.timestamp = new Date(rejection.timestamp);
          if (rejection.resolutionTime) {
            rejection.resolutionTime = new Date(rejection.resolutionTime);
          }
          
          this.rejections.set(rejection.id, rejection);
          this.rejectionHistory.push(rejection);
          
          if (rejection.path) {
            const count = this.pathRejectionCount.get(rejection.path) || 0;
            this.pathRejectionCount.set(rejection.path, count + 1);
          }
        }
      }
      
      this.logger.logEvent(
        LogEventType.EVENT_CUSTOM,
        `Loaded ${this.rejections.size} persisted rejections`
      );
    } catch (error) {
      console.error('Failed to load persisted rejections:', error);
    }
  }
  
  /**
   * Setup process hooks
   */
  private async setupProcessHooks(): void {
    // Persist on exit
    process.on('exit', () => {
      if (this.config.persistRejections) {
        this.persistRejections();
      }
    });
    
    // Handle uncaught rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.trackRejection(
        RejectionType.SYSTEM_ERROR,
        'Unhandled promise rejection',
        {
          additionalInfo: {
            reason: reason?.toString(),
            promise: promise?.toString()
          }
        }
      );
    });
  }
  
  /**
   * Close tracker
   */
  async close(): void {
    // Clear all timers
    for (const timer of this.autoResolveTimers.values()) {
      clearTimeout(timer);
    }
    this.autoResolveTimers.clear();
    
    // Persist if enabled
    if (this.config.persistRejections) {
      this.persistRejections();
    }
    
    // Generate final report
    const report = this.generateReport();
    this.logger.logEvent(
      LogEventType.EVENT_CUSTOM,
      'RejectionTracker closing',
      { report }
    );
    
    this.removeAllListeners();
  }
}

export default RejectionTracker;