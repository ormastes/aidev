/**
 * ComprehensiveLogger
 *
 * Main logging system that combines EventLogger, VfJsonWatcher, and RejectionTracker
 * Provides a unified interface for all logging needs
 */
import { EventEmitter } from 'events';
import { LogEventType, LogEntry, EventLoggerConfig } from './EventLogger';
import { VfJsonWatcherConfig } from './VfJsonWatcher';
import { Rejection, RejectionType, RejectionTrackerConfig } from './RejectionTracker';
import { FileViolationError } from '../validators/FileViolationPreventer';
export interface ComprehensiveLoggerConfig {
    enabled?: boolean;
    logDir?: string;
    watchVfJson?: boolean;
    trackRejections?: boolean;
    integrateWithFileViolationPreventer?: boolean;
    detail?: boolean;
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
export declare class ComprehensiveLogger extends EventEmitter {
    private config;
    private eventLogger;
    private vfJsonWatcher;
    private rejectionTracker;
    private fileViolationPreventer;
    private startTime;
    private eventCount;
    private vfJsonChangeCount;
    private rejectionCount;
    constructor(config?: ComprehensiveLoggerConfig);
    /**
     * Start logging (begins watching)
     */
    start(): Promise<void>;
    /**
     * Stop logging
     */
    stop(): void;
    /**
     * Log a system event
     */
    logSystemEvent(type: string, message: string, data?: any): void;
    /**
     * Log a custom event
     */
    logEvent(message: string, level?: 'info' | 'warn' | 'error', data?: any): void;
    /**
     * Log task queue change
     */
    logTaskChange(action: 'created' | 'updated' | 'completed' | 'deleted', taskId: string, taskData?: any): void;
    /**
     * Log feature change
     */
    logFeatureChange(action: 'created' | 'updated' | 'completed' | 'deleted', featureId: string, featureData?: any): void;
    /**
     * Log name ID change
     */
    logNameIdChange(action: 'created' | 'updated' | 'deleted', nameId: string, entityData?: any): void;
    /**
     * Log file operation
     */
    logFileOperation(operation: 'created' | 'modified' | 'deleted' | 'moved', filePath: string, details?: any): void;
    /**
     * Track a rejection
     */
    trackRejection(type: RejectionType, reason: string, details?: any): Rejection | undefined;
    /**
     * Track a file violation
     */
    trackFileViolation(error: FileViolationError, operation?: string): Rejection | undefined;
    /**
     * Query logs
     */
    queryLogs(options: {
        startDate?: Date;
        endDate?: Date;
        type?: LogEventType | LogEventType[];
        level?: LogEntry['level'] | LogEntry['level'][];
        category?: string;
        search?: string;
        limit?: number;
    }): Promise<LogEntry[]>;
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
    }): Rejection[];
    /**
     * Get summary
     */
    getSummary(): LoggingSummary;
    /**
     * Generate report
     */
    generateReport(): string;
    /**
     * Handle VfJsonChange event
     */
    private handleVfJsonChange;
    /**
     * Handle rejection event
     */
    private handleRejection;
    /**
     * Handle rejection resolved event
     */
    private handleRejectionResolved;
    /**
     * Setup FileViolationPreventer integration
     */
    private setupFileViolationIntegration;
    /**
     * Get log directory
     */
    getLogDirectory(): string;
    /**
     * Check if enabled
     */
    isEnabled(): boolean;
    /**
     * Set detail mode
     */
    setDetailMode(enabled: boolean): void;
    /**
     * Get detail mode status
     */
    isDetailMode(): boolean;
    /**
     * Enable detail mode (full logging)
     */
    enableDetailMode(): void;
    /**
     * Disable detail mode (brief logging)
     */
    disableDetailMode(): void;
}
/**
 * Get or create comprehensive logger instance
 */
export declare function getComprehensiveLogger(config?: ComprehensiveLoggerConfig): ComprehensiveLogger;
/**
 * Initialize and start comprehensive logging
 */
export declare function startComprehensiveLogging(config?: ComprehensiveLoggerConfig): Promise<ComprehensiveLogger>;
export default ComprehensiveLogger;
//# sourceMappingURL=ComprehensiveLogger.d.ts.map