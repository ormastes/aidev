"use strict";
/**
 * File Access Auditor
 *
 * Provides auditing and monitoring of all file system operations
 * Integrates with fraud-checker and filesystem-mcp for validation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileAccessAuditor = exports.FileAccessAuditor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
const pipe_1 = require("../../pipe");
const fileAPI = (0, pipe_1.getFileAPI)();
class FileAccessAuditor extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.auditLog = [];
        this.accessPatterns = new Map();
        this.config = {
            enabled: true,
            logLevel: 'violations',
            realTimeMonitoring: true,
            persistAuditLog: true,
            auditLogPath: 'gen/logs/file-access-audit.log',
            validateWithMCP: true,
            fraudCheckEnabled: true,
            ...config
        };
        this.stats = {
            totalOperations: 0,
            operationCounts: {},
            violations: 0,
            errors: 0,
            topAccessedPaths: [],
            suspiciousPatterns: []
        };
        if (this.config.validateWithMCP) {
            this.initializeMCPValidator();
        }
        if (this.config.fraudCheckEnabled) {
            this.initializeFraudChecker();
        }
    }
    /**
     * Initialize filesystem-mcp validator
     */
    async initializeMCPValidator() {
        try {
            const { VFFileStructureWrapper } = await Promise.resolve().then(() => __importStar(require('../../infra_filesystem-mcp/pipe')));
            this.mcpValidator = new VFFileStructureWrapper(process.cwd());
            await this.mcpValidator.loadStructure();
        }
        catch (error) {
            console.warn('Could not initialize MCP validator:', error);
        }
    }
    /**
     * Initialize fraud checker
     */
    async initializeFraudChecker() {
        try {
            const { UnauthorizedFileDetector } = await Promise.resolve().then(() => __importStar(require('../../infra_fraud-checker/pipe')));
            this.fraudChecker = new UnauthorizedFileDetector(process.cwd());
        }
        catch (error) {
            console.warn('Could not initialize fraud checker:', error);
        }
    }
    /**
     * Audit a file operation
     */
    async audit(operation, filePath, metadata) {
        if (!this.config.enabled) {
            return this.createEvent(operation, filePath, { success: true }, metadata);
        }
        const event = this.createEvent(operation, filePath, { success: false }, metadata);
        // Pre-operation validation
        if (this.config.hooks?.beforeOperation) {
            const allowed = await this.config.hooks.beforeOperation(event);
            if (!allowed) {
                event.result.success = false;
                event.result.error = new Error('Operation blocked by audit hook');
                this.logEvent(event);
                throw event.result.error;
            }
        }
        // Validate with MCP if enabled
        if (this.mcpValidator && this.shouldValidateOperation(operation)) {
            event.validation = await this.validateWithMCP(filePath, operation);
            if (!event.validation.authorized && operation !== 'read' && operation !== 'exists') {
                event.result.success = false;
                event.result.error = new Error(`Unauthorized operation: ${event.validation.violations?.join(', ')}`);
                this.handleViolation(event);
                throw event.result.error;
            }
        }
        // Check with fraud detector
        if (this.fraudChecker && this.shouldCheckFraud(operation)) {
            const fraudCheck = await this.checkFraud(filePath, operation);
            if (fraudCheck.violations.length > 0) {
                event.validation = {
                    ...event.validation,
                    authorized: false,
                    violations: fraudCheck.violations
                };
                this.handleViolation(event);
            }
        }
        // Update statistics
        this.updateStats(event);
        // Log the event
        this.logEvent(event);
        // Post-operation hook
        if (this.config.hooks?.afterOperation) {
            await this.config.hooks.afterOperation(event);
        }
        return event;
    }
    /**
     * Create an audit event
     */
    async createEvent(operation, filePath, result, metadata) {
        return {
            timestamp: new Date(),
            operation,
            path: filePath,
            caller: this.extractCallerInfo(),
            result,
            metadata
        };
    }
    /**
     * Extract caller information from stack trace
     */
    async extractCallerInfo() {
        const stack = new Error().stack || '';
        const lines = stack.split('\n');
        // Skip first 3 lines (Error message and our own functions)
        const callerLine = lines[3] || '';
        // Parse the caller line
        const match = callerLine.match(/at\s+(?:(.+?)\s+)?\((.+?):(\d+):(\d+)\)/);
        if (match) {
            const [, functionName, filePath, line, column] = match;
            const theme = this.extractThemeFromPath(filePath);
            return {
                stack: stack.slice(0, 500), // Limit stack size
                function: functionName,
                module: path.basename(filePath),
                line: parseInt(line),
                column: parseInt(column),
                theme
            };
        }
        return { stack: stack.slice(0, 500) };
    }
    /**
     * Extract theme name from file path
     */
    async extractThemeFromPath(filePath) {
        const match = filePath.match(/layer\/themes\/([^\/]+)/);
        return match ? match[1] : undefined;
    }
    /**
     * Validate with filesystem-mcp
     */
    async validateWithMCP(filePath, operation) {
        if (!this.mcpValidator) {
            return { authorized: true };
        }
        try {
            const isWrite = ['write', 'append', 'delete', 'mkdir', 'rmdir', 'rename'].includes(operation);
            const validation = isWrite
                ? await this.mcpValidator.validateWrite(filePath, operation === 'mkdir')
                : await this.mcpValidator.validatePath(filePath, operation === 'mkdir');
            return {
                authorized: validation.valid,
                violations: validation.message ? [validation.message] : undefined,
                platformRequired: validation.platformRequired,
                frozenDirectory: validation.frozen
            };
        }
        catch (error) {
            return {
                authorized: true, // Allow on error but log it
                violations: [`MCP validation error: ${error}`]
            };
        }
    }
    /**
     * Check with fraud detector
     */
    async checkFraud(filePath, operation) {
        if (!this.fraudChecker) {
            return { violations: [] };
        }
        try {
            const result = await this.fraudChecker.detect(path.dirname(filePath));
            return {
                violations: result.violations
                    .filter((v) => v.path === filePath || path.dirname(v.path) === path.dirname(filePath))
                    .map((v) => v.reason)
            };
        }
        catch (error) {
            return { violations: [] };
        }
    }
    /**
     * Should validate this operation type
     */
    async shouldValidateOperation(operation) {
        const validateOps = ['write', 'append', 'delete', 'mkdir', 'rmdir', 'rename'];
        return validateOps.includes(operation);
    }
    /**
     * Should check fraud for this operation
     */
    async shouldCheckFraud(operation) {
        const fraudOps = ['write', 'mkdir', 'rename'];
        return fraudOps.includes(operation);
    }
    /**
     * Handle a violation
     */
    async handleViolation(event) {
        this.stats.violations++;
        if (this.config.hooks?.onViolation) {
            this.config.hooks.onViolation(event);
        }
        this.emit('violation', event);
        // Check for suspicious patterns
        this.detectSuspiciousPatterns(event);
    }
    /**
     * Detect suspicious patterns
     */
    async detectSuspiciousPatterns(event) {
        // Rapid access detection
        const accessKey = `${event.operation}:${event.path}`;
        const accessCount = (this.accessPatterns.get(accessKey) || 0) + 1;
        this.accessPatterns.set(accessKey, accessCount);
        if (accessCount > 10) {
            this.addSuspiciousPattern({
                type: 'rapid_access',
                description: `Rapid access to ${event.path} (${accessCount} times)`,
                severity: accessCount > 50 ? 'high' : 'medium',
                occurrences: accessCount,
                firstSeen: new Date(),
                lastSeen: new Date()
            });
        }
        // Unauthorized path access
        if (event.validation && !event.validation.authorized) {
            this.addSuspiciousPattern({
                type: 'unauthorized_path',
                description: `Unauthorized access to ${event.path}`,
                severity: event.validation.frozenDirectory ? 'critical' : 'high',
                occurrences: 1,
                firstSeen: new Date(),
                lastSeen: new Date()
            });
        }
    }
    /**
     * Add a suspicious pattern
     */
    async addSuspiciousPattern(pattern) {
        const existing = this.stats.suspiciousPatterns.find(p => p.type === pattern.type && p.description === pattern.description);
        if (existing) {
            existing.occurrences++;
            existing.lastSeen = new Date();
            if (pattern.severity === 'critical' || (pattern.severity === 'high' && existing.severity !== 'critical')) {
                existing.severity = pattern.severity;
            }
        }
        else {
            this.stats.suspiciousPatterns.push(pattern);
        }
        this.emit('suspicious-pattern', pattern);
    }
    /**
     * Update statistics
     */
    async updateStats(event) {
        this.stats.totalOperations++;
        this.stats.operationCounts[event.operation] = (this.stats.operationCounts[event.operation] || 0) + 1;
        if (!event.result.success) {
            this.stats.errors++;
        }
        // Update top accessed paths
        const pathCount = this.accessPatterns.get(event.path) || 0;
        this.accessPatterns.set(event.path, pathCount + 1);
        // Periodically update top paths
        if (this.stats.totalOperations % 100 === 0) {
            this.updateTopPaths();
        }
    }
    /**
     * Update top accessed paths
     */
    async updateTopPaths() {
        const paths = Array.from(this.accessPatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([path, count]) => ({ path, count }));
        this.stats.topAccessedPaths = paths;
    }
    /**
     * Log an event
     */
    async logEvent(event) {
        if (this.config.logLevel === 'all' ||
            (this.config.logLevel === 'violations' && !event.validation?.authorized) ||
            (this.config.logLevel === 'errors' && !event.result.success)) {
            this.auditLog.push(event);
            if (this.config.realTimeMonitoring) {
                this.emit('file-access', event);
            }
            if (this.config.persistAuditLog && this.config.auditLogPath) {
                this.persistEvent(event);
            }
        }
    }
    /**
     * Persist event to log file
     */
    async persistEvent(event) {
        if (!this.config.auditLogPath)
            return;
        try {
            const logDir = path.dirname(this.config.auditLogPath);
            await fileAPI.createDirectory(logDir);
            const logEntry = JSON.stringify({
                ...event,
                caller: {
                    ...event.caller,
                    stack: event.caller.stack.split('\n').slice(0, 3).join('\n') // Reduce stack size
                }
            }) + '\n';
            await fs.promises.appendFile(this.config.auditLogPath, logEntry);
        }
        catch (error) {
            console.error('Failed to persist audit event:', error);
        }
    }
    /**
     * Get audit statistics
     */
    async getStats() {
        return { ...this.stats };
    }
    /**
     * Get audit log
     */
    async getAuditLog(filter) {
        if (!filter) {
            return [...this.auditLog];
        }
        return this.auditLog.filter(event => {
            return Object.entries(filter).every(([key, value]) => {
                return event[key] === value;
            });
        });
    }
    /**
     * Clear audit log
     */
    async clearAuditLog() {
        this.auditLog = [];
        this.accessPatterns.clear();
        this.stats.suspiciousPatterns = [];
    }
    /**
     * Generate audit report
     */
    async generateReport() {
        const stats = this.getStats();
        let report = '# File Access Audit Report\n\n';
        report += `Generated: ${new Date().toISOString()}\n\n`;
        report += '## Summary\n\n';
        report += `- Total Operations: ${stats.totalOperations}\n`;
        report += `- Violations: ${stats.violations}\n`;
        report += `- Errors: ${stats.errors}\n\n`;
        report += '## Operation Breakdown\n\n';
        for (const [op, count] of Object.entries(stats.operationCounts)) {
            report += `- ${op}: ${count}\n`;
        }
        report += '\n';
        if (stats.topAccessedPaths.length > 0) {
            report += '## Top Accessed Paths\n\n';
            for (const { path, count } of stats.topAccessedPaths) {
                report += `- ${path}: ${count} accesses\n`;
            }
            report += '\n';
        }
        if (stats.suspiciousPatterns.length > 0) {
            report += '## Suspicious Patterns\n\n';
            for (const pattern of stats.suspiciousPatterns) {
                report += `### ${pattern.type}\n`;
                report += `- Description: ${pattern.description}\n`;
                report += `- Severity: ${pattern.severity}\n`;
                report += `- Occurrences: ${pattern.occurrences}\n`;
                report += `- First Seen: ${pattern.firstSeen}\n`;
                report += `- Last Seen: ${pattern.lastSeen}\n\n`;
            }
        }
        return report;
    }
}
exports.FileAccessAuditor = FileAccessAuditor;
// Export singleton instance
exports.fileAccessAuditor = new FileAccessAuditor();
exports.default = FileAccessAuditor;
//# sourceMappingURL=index.js.map