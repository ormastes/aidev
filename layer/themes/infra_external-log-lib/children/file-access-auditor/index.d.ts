/**
 * File Access Auditor
 *
 * Provides auditing and monitoring of all file system operations
 * Integrates with fraud-checker and filesystem-mcp for validation
 */
import { EventEmitter } from 'events';
export interface FileAccessEvent {
    timestamp: Date;
    operation: FileOperation;
    path: string;
    caller: CallerInfo;
    result: OperationResult;
    validation?: ValidationResult;
    metadata?: Record<string, any>;
}
export type FileOperation = 'read' | 'write' | 'append' | 'delete' | 'mkdir' | 'rmdir' | 'rename' | 'chmod' | 'stat' | 'exists' | 'watch';
export interface CallerInfo {
    stack: string;
    module?: string;
    function?: string;
    line?: number;
    column?: number;
    theme?: string;
}
export interface OperationResult {
    success: boolean;
    error?: Error;
    bytesProcessed?: number;
    duration?: number;
}
export interface ValidationResult {
    authorized: boolean;
    platformRequired?: boolean;
    frozenDirectory?: boolean;
    violations?: string[];
    suggestedPath?: string;
}
export interface AuditConfig {
    enabled: boolean;
    logLevel: 'all' | 'violations' | 'errors';
    realTimeMonitoring: boolean;
    persistAuditLog: boolean;
    auditLogPath?: string;
    validateWithMCP: boolean;
    fraudCheckEnabled: boolean;
    allowedPaths?: string[];
    blockedPaths?: string[];
    hooks?: AuditHooks;
}
export interface AuditHooks {
    beforeOperation?: (event: FileAccessEvent) => boolean | Promise<boolean>;
    afterOperation?: (event: FileAccessEvent) => void | Promise<void>;
    onViolation?: (event: FileAccessEvent) => void | Promise<void>;
}
export interface AuditStats {
    totalOperations: number;
    operationCounts: Record<FileOperation, number>;
    violations: number;
    errors: number;
    topAccessedPaths: Array<{
        path: string;
        count: number;
    }>;
    suspiciousPatterns: SuspiciousPattern[];
}
export interface SuspiciousPattern {
    type: 'rapid_access' | 'unauthorized_path' | 'pattern_anomaly' | 'privilege_escalation';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    occurrences: number;
    firstSeen: Date;
    lastSeen: Date;
}
export declare class FileAccessAuditor extends EventEmitter {
    private config;
    private auditLog;
    private stats;
    private accessPatterns;
    private mcpValidator?;
    private fraudChecker?;
    constructor(config?: Partial<AuditConfig>);
    /**
     * Initialize filesystem-mcp validator
     */
    private initializeMCPValidator;
    /**
     * Initialize fraud checker
     */
    private initializeFraudChecker;
    /**
     * Audit a file operation
     */
    audit(operation: FileOperation, filePath: string, metadata?: Record<string, any>): Promise<FileAccessEvent>;
    /**
     * Create an audit event
     */
    private createEvent;
    /**
     * Extract caller information from stack trace
     */
    private extractCallerInfo;
    /**
     * Extract theme name from file path
     */
    private extractThemeFromPath;
    /**
     * Validate with filesystem-mcp
     */
    private validateWithMCP;
    /**
     * Check with fraud detector
     */
    private checkFraud;
    /**
     * Should validate this operation type
     */
    private shouldValidateOperation;
    /**
     * Should check fraud for this operation
     */
    private shouldCheckFraud;
    /**
     * Handle a violation
     */
    private handleViolation;
    /**
     * Detect suspicious patterns
     */
    private detectSuspiciousPatterns;
    /**
     * Add a suspicious pattern
     */
    private addSuspiciousPattern;
    /**
     * Update statistics
     */
    private updateStats;
    /**
     * Update top accessed paths
     */
    private updateTopPaths;
    /**
     * Log an event
     */
    private logEvent;
    /**
     * Persist event to log file
     */
    private persistEvent;
    /**
     * Get audit statistics
     */
    getStats(): AuditStats;
    /**
     * Get audit log
     */
    getAuditLog(filter?: Partial<FileAccessEvent>): FileAccessEvent[];
    /**
     * Clear audit log
     */
    clearAuditLog(): void;
    /**
     * Generate audit report
     */
    generateReport(): Promise<string>;
}
export declare const fileAccessAuditor: FileAccessAuditor;
export default FileAccessAuditor;
//# sourceMappingURL=index.d.ts.map