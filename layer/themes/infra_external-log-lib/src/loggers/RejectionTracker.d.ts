/**
 * RejectionTracker
 *
 * Tracks and logs file operation rejections and violations
 * Integrates with FileViolationPreventer to capture all rejections
 */
import { EventEmitter } from 'events';
import { EventLogger } from './EventLogger';
import { FileViolationError } from '../validators/FileViolationPreventer';
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
export declare enum RejectionType {
    FILE_VIOLATION = "file_violation",
    PERMISSION_DENIED = "permission_denied",
    VALIDATION_FAILED = "validation_failed",
    QUOTA_EXCEEDED = "quota_exceeded",
    FREEZE_VIOLATION = "freeze_violation",
    PATTERN_MISMATCH = "pattern_mismatch",
    DUPLICATE_FILE = "duplicate_file",
    BACKUP_FILE = "backup_file",
    UNEXPECTED_DIRECTORY = "unexpected_directory",
    MISSING_REQUIRED = "missing_required",
    SYSTEM_ERROR = "system_error"
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
    autoResolveTimeout?: number;
    persistRejections?: boolean;
    rejectionFilePath?: string;
}
export declare class RejectionTracker extends EventEmitter {
    private config;
    private logger;
    private rejections;
    private rejectionHistory;
    private pathRejectionCount;
    private autoResolveTimers;
    constructor(config?: RejectionTrackerConfig);
    /**
     * Track a rejection
     */
    trackRejection(type: RejectionType, reason: string, details?: {
        path?: string;
        operation?: string;
        error?: Error | FileViolationError;
        additionalInfo?: any;
    }): Rejection;
    /**
     * Track a file violation error
     */
    trackFileViolation(error: FileViolationError, operation?: string): Rejection;
    /**
     * Resolve a rejection
     */
    resolveRejection(id: string, notes?: string): boolean;
    /**
     * Get rejection by ID
     */
    getRejection(id: string): Rejection | undefined;
    /**
     * Get all rejections
     */
    getAllRejections(options?: {
        resolved?: boolean;
        type?: RejectionType;
        severity?: string;
        path?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Rejection[];
    /**
     * Get rejection statistics
     */
    getStatistics(): RejectionStats;
    /**
     * Clear resolved rejections
     */
    clearResolved(): number;
    /**
     * Generate report
     */
    generateReport(): string;
    /**
     * Determine severity based on rejection type
     */
    private determineSeverity;
    /**
     * Map rejection type to log type
     */
    private mapRejectionTypeToLogType;
    /**
     * Map violation type to rejection type
     */
    private mapViolationTypeToRejectionType;
    /**
     * Setup auto-resolve timer
     */
    private setupAutoResolve;
    /**
     * Enforce max rejections limit
     */
    private enforceMaxRejections;
    /**
     * Generate rejection ID
     */
    private generateRejectionId;
    /**
     * Persist rejections to file
     */
    private persistRejections;
    /**
     * Load persisted rejections
     */
    private loadPersistedRejections;
    /**
     * Setup process hooks
     */
    private setupProcessHooks;
    /**
     * Close tracker
     */
    close(): void;
}
export default RejectionTracker;
//# sourceMappingURL=RejectionTracker.d.ts.map