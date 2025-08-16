"use strict";
/**
 * ComprehensiveLogger
 *
 * Main logging system that combines EventLogger, VfJsonWatcher, and RejectionTracker
 * Provides a unified interface for all logging needs
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
exports.ComprehensiveLogger = void 0;
exports.getComprehensiveLogger = getComprehensiveLogger;
exports.startComprehensiveLogging = startComprehensiveLogging;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const events_1 = require("events");
const EventLogger_1 = require("./EventLogger");
const VfJsonWatcher_1 = require("./VfJsonWatcher");
const RejectionTracker_1 = require("./RejectionTracker");
class ComprehensiveLogger extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.vfJsonWatcher = null;
        this.rejectionTracker = null;
        this.fileViolationPreventer = null;
        this.eventCount = 0;
        this.vfJsonChangeCount = 0;
        this.rejectionCount = 0;
        this.startTime = new Date();
        // Set default configuration
        const baseLogDir = path.join(os.tmpdir(), 'external-log-lib');
        this.config = {
            enabled: true,
            logDir: baseLogDir,
            watchVfJson: true,
            trackRejections: true,
            integrateWithFileViolationPreventer: true,
            detail: false, // Brief mode by default
            eventLoggerConfig: {},
            vfJsonWatcherConfig: {},
            rejectionTrackerConfig: {},
            ...config
        };
        if (!this.config.enabled) {
            return;
        }
        // Initialize EventLogger with detail mode
        this.eventLogger = new EventLogger_1.EventLogger({
            logDir: path.join(this.config.logDir, 'events'),
            detail: this.config.detail, // Pass detail mode to EventLogger
            ...this.config.eventLoggerConfig
        });
        // Initialize VfJsonWatcher if enabled
        if (this.config.watchVfJson) {
            this.vfJsonWatcher = new VfJsonWatcher_1.VfJsonWatcher({
                logger: this.eventLogger,
                ...this.config.vfJsonWatcherConfig
            });
            this.vfJsonWatcher.on('change', this.handleVfJsonChange.bind(this));
        }
        // Initialize RejectionTracker if enabled
        if (this.config.trackRejections) {
            this.rejectionTracker = new RejectionTracker_1.RejectionTracker({
                logger: this.eventLogger,
                rejectionFilePath: path.join(this.config.logDir, 'rejections.json'),
                ...this.config.rejectionTrackerConfig
            });
            this.rejectionTracker.on('rejection', this.handleRejection.bind(this));
            this.rejectionTracker.on('resolved', this.handleRejectionResolved.bind(this));
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
    async start() {
        if (!this.config.enabled)
            return;
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
    stop() {
        if (!this.config.enabled)
            return;
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
    logSystemEvent(type, message, data) {
        if (!this.config.enabled)
            return;
        const eventType = `event.${type}`;
        this.eventLogger.logEvent(eventType, message, data);
    }
    /**
     * Log a custom event
     */
    logEvent(message, level = 'info', data) {
        if (!this.config.enabled)
            return;
        const eventType = level === 'error' ? EventLogger_1.LogEventType.EVENT_ERROR :
            level === 'warn' ? EventLogger_1.LogEventType.EVENT_WARNING :
                EventLogger_1.LogEventType.EVENT_CUSTOM;
        this.eventLogger.logEvent(eventType, message, data);
    }
    /**
     * Log task queue change
     */
    logTaskChange(action, taskId, taskData) {
        if (!this.config.enabled)
            return;
        this.eventLogger.logTaskQueueChange(action, taskId, taskData);
    }
    /**
     * Log feature change
     */
    logFeatureChange(action, featureId, featureData) {
        if (!this.config.enabled)
            return;
        this.eventLogger.logFeatureChange(action, featureId, featureData);
    }
    /**
     * Log name ID change
     */
    logNameIdChange(action, nameId, entityData) {
        if (!this.config.enabled)
            return;
        this.eventLogger.logNameIdChange(action, nameId, entityData);
    }
    /**
     * Log file operation
     */
    logFileOperation(operation, filePath, details) {
        if (!this.config.enabled)
            return;
        this.eventLogger.logFileOperation(operation, filePath, details);
    }
    /**
     * Track a rejection
     */
    trackRejection(type, reason, details) {
        if (!this.config.enabled || !this.rejectionTracker)
            return undefined;
        this.rejectionCount++;
        return this.rejectionTracker.trackRejection(type, reason, details);
    }
    /**
     * Track a file violation
     */
    trackFileViolation(error, operation) {
        if (!this.config.enabled || !this.rejectionTracker)
            return undefined;
        this.rejectionCount++;
        return this.rejectionTracker.trackFileViolation(error, operation);
    }
    /**
     * Query logs
     */
    async queryLogs(options) {
        if (!this.config.enabled)
            return [];
        return this.eventLogger.query(options);
    }
    /**
     * Get rejections
     */
    getRejections(options) {
        if (!this.config.enabled || !this.rejectionTracker)
            return [];
        return this.rejectionTracker.getAllRejections(options);
    }
    /**
     * Get summary
     */
    getSummary() {
        const uptime = Date.now() - this.startTime.getTime();
        const summary = {
            startTime: this.startTime,
            uptime,
            eventsLogged: this.eventCount,
            vfJsonChanges: this.vfJsonChangeCount,
            rejectionsTracked: this.rejectionCount,
            currentLogPath: this.eventLogger.getCurrentLogPath()
        };
        // Try to get log file size
        try {
            const fs = require('fs');
            const stats = fs.statSync(summary.currentLogPath);
            summary.logSizeBytes = stats.size;
        }
        catch (error) {
            // Ignore
        }
        return summary;
    }
    /**
     * Generate report
     */
    generateReport() {
        const summary = this.getSummary();
        const uptimeSeconds = Math.round(summary.uptime / 1000);
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);
        const uptimeHours = Math.floor(uptimeMinutes / 60);
        const report = [
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
            report.push('', '## Rejection Statistics', `- Total: ${rejectionStats.total}`, `- Resolved: ${rejectionStats.resolved}`, `- Unresolved: ${rejectionStats.unresolved}`);
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
            report.push('', '## Watched VF.json Files', `- Total: ${watchedFiles.length}`);
            for (const file of watchedFiles) {
                report.push(`- ${file.type}: ${file.path}`);
            }
        }
        return report.join('\n');
    }
    /**
     * Handle VfJsonChange event
     */
    handleVfJsonChange(change) {
        this.vfJsonChangeCount++;
        this.emit('vfJsonChange', change);
    }
    /**
     * Handle rejection event
     */
    handleRejection(rejection) {
        this.emit('rejection', rejection);
    }
    /**
     * Handle rejection resolved event
     */
    handleRejectionResolved(rejection) {
        this.emit('rejectionResolved', rejection);
    }
    /**
     * Setup FileViolationPreventer integration
     */
    setupFileViolationIntegration() {
        try {
            // Hook into FileViolationPreventer if available
            const originalWriteFile = require('fs').writeFileSync;
            const self = this;
            require('fs').writeFileSync = function (path, ...args) {
                try {
                    // Attempt write
                    return originalWriteFile.call(this, path, ...args);
                }
                catch (error) {
                    // Log if it's a violation
                    if (error && error.name === 'FileViolationError') {
                        self.trackFileViolation(error, 'write');
                    }
                    throw error;
                }
            };
        }
        catch (error) {
            // Ignore integration errors
        }
    }
    /**
     * Get log directory
     */
    getLogDirectory() {
        return this.config.logDir;
    }
    /**
     * Check if enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
    /**
     * Set detail mode
     */
    setDetailMode(enabled) {
        this.config.detail = enabled;
        this.eventLogger.setDetailMode(enabled);
        this.logSystemEvent('config', `Detail mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Get detail mode status
     */
    isDetailMode() {
        return this.config.detail;
    }
    /**
     * Enable detail mode (full logging)
     */
    enableDetailMode() {
        this.setDetailMode(true);
    }
    /**
     * Disable detail mode (brief logging)
     */
    disableDetailMode() {
        this.setDetailMode(false);
    }
}
exports.ComprehensiveLogger = ComprehensiveLogger;
// Singleton instance
let loggerInstance = null;
/**
 * Get or create comprehensive logger instance
 */
function getComprehensiveLogger(config) {
    if (!loggerInstance) {
        loggerInstance = new ComprehensiveLogger(config);
    }
    return loggerInstance;
}
/**
 * Initialize and start comprehensive logging
 */
async function startComprehensiveLogging(config) {
    const logger = getComprehensiveLogger(config);
    await logger.start();
    return logger;
}
exports.default = ComprehensiveLogger;
//# sourceMappingURL=ComprehensiveLogger.js.map