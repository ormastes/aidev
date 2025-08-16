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
import { EventEmitter } from 'events';
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
export declare enum LogEventType {
    TASK_QUEUE_CREATED = "task_queue.created",
    TASK_QUEUE_UPDATED = "task_queue.updated",
    TASK_QUEUE_COMPLETED = "task_queue.completed",
    TASK_QUEUE_DELETED = "task_queue.deleted",
    FEATURE_CREATED = "feature.created",
    FEATURE_UPDATED = "feature.updated",
    FEATURE_COMPLETED = "feature.completed",
    FEATURE_DELETED = "feature.deleted",
    NAME_ID_CREATED = "name_id.created",
    NAME_ID_UPDATED = "name_id.updated",
    NAME_ID_DELETED = "name_id.deleted",
    EVENT_SYSTEM_START = "event.system_start",
    EVENT_SYSTEM_STOP = "event.system_stop",
    EVENT_ERROR = "event.error",
    EVENT_WARNING = "event.warning",
    EVENT_CUSTOM = "event.custom",
    REJECTION_FILE_VIOLATION = "rejection.file_violation",
    REJECTION_PERMISSION_DENIED = "rejection.permission_denied",
    REJECTION_VALIDATION_FAILED = "rejection.validation_failed",
    REJECTION_QUOTA_EXCEEDED = "rejection.quota_exceeded",
    FILE_CREATED = "file.created",
    FILE_MODIFIED = "file.modified",
    FILE_DELETED = "file.deleted",
    FILE_MOVED = "file.moved",
    LOG_ROTATION = "log.rotation",
    LOG_CLEANUP = "log.cleanup",
    LOG_ERROR = "log.error"
}
export interface EventLoggerConfig {
    logDir?: string;
    maxFileSize?: number;
    maxFiles?: number;
    rotationInterval?: 'daily' | 'hourly' | 'size';
    format?: 'json' | 'text';
    enableConsole?: boolean;
    sessionId?: string;
    metadata?: Partial<LogMetadata>;
    detail?: boolean;
}
export declare class EventLogger extends EventEmitter {
    private config;
    private currentLogPath;
    private logStream;
    private rotationTimer;
    private buffer;
    private bufferSize;
    private flushInterval;
    private flushTimer;
    constructor(config?: EventLoggerConfig);
    /**
     * Log a task queue change
     */
    logTaskQueueChange(action: 'created' | 'updated' | 'completed' | 'deleted', taskId: string, taskData?: any): void;
    /**
     * Log a feature change
     */
    logFeatureChange(action: 'created' | 'updated' | 'completed' | 'deleted', featureId: string, featureData?: any): void;
    /**
     * Log a name ID change
     */
    logNameIdChange(action: 'created' | 'updated' | 'deleted', nameId: string, entityData?: any): void;
    /**
     * Log a system event
     */
    logEvent(type: LogEventType, message: string, data?: any): void;
    /**
     * Log a rejection
     */
    logRejection(type: 'file_violation' | 'permission_denied' | 'validation_failed' | 'quota_exceeded', message: string, details?: any): void;
    /**
     * Log a file operation
     */
    logFileOperation(operation: 'created' | 'modified' | 'deleted' | 'moved', filePath: string, details?: any): void;
    /**
     * Core logging method
     */
    private log;
    /**
     * Flush buffer to file
     */
    private flush;
    /**
     * Format log entry based on configuration
     */
    private formatLogEntry;
    /**
     * Log to console
     */
    private logToConsole;
    /**
     * Get log level for event type
     */
    private getLogLevelForEventType;
    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory;
    /**
     * Get log file name
     */
    private getLogFileName;
    /**
     * Initialize log stream
     */
    private initializeLogStream;
    /**
     * Setup log rotation
     */
    private setupRotation;
    /**
     * Setup buffer flush timer
     */
    private setupBufferFlush;
    /**
     * Rotate log file
     */
    private rotate;
    /**
     * Check if size-based rotation is needed
     */
    private checkSizeRotation;
    /**
     * Cleanup old log files
     */
    private cleanupOldLogs;
    /**
     * Generate session ID
     */
    private generateSessionId;
    /**
     * Generate correlation ID
     */
    private generateCorrelationId;
    /**
     * Query logs
     */
    query(options: {
        startDate?: Date;
        endDate?: Date;
        type?: LogEventType | LogEventType[];
        level?: LogEntry['level'] | LogEntry['level'][];
        category?: string;
        search?: string;
        limit?: number;
    }): Promise<LogEntry[]>;
    /**
     * Get current log file path
     */
    getCurrentLogPath(): string;
    /**
     * Get log directory
     */
    getLogDirectory(): string;
    /**
     * Set detail mode
     */
    setDetailMode(enabled: boolean): void;
    /**
     * Get detail mode status
     */
    isDetailMode(): boolean;
    /**
     * Close logger
     */
    close(): void;
}
/**
 * Get or create logger instance
 */
export declare function getEventLogger(config?: EventLoggerConfig): EventLogger;
export default EventLogger;
//# sourceMappingURL=EventLogger.d.ts.map