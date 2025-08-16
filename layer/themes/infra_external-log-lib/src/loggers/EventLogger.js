"use strict";
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
exports.EventLogger = exports.LogEventType = void 0;
exports.getEventLogger = getEventLogger;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const events_1 = require("events");
const pipe_1 = require("../../pipe");
const essential_info_extractor_1 = require("../utils/essential-info-extractor");
const fileAPI = (0, pipe_1.getFileAPI)();
var LogEventType;
(function (LogEventType) {
    // VF.json changes
    LogEventType["TASK_QUEUE_CREATED"] = "task_queue.created";
    LogEventType["TASK_QUEUE_UPDATED"] = "task_queue.updated";
    LogEventType["TASK_QUEUE_COMPLETED"] = "task_queue.completed";
    LogEventType["TASK_QUEUE_DELETED"] = "task_queue.deleted";
    LogEventType["FEATURE_CREATED"] = "feature.created";
    LogEventType["FEATURE_UPDATED"] = "feature.updated";
    LogEventType["FEATURE_COMPLETED"] = "feature.completed";
    LogEventType["FEATURE_DELETED"] = "feature.deleted";
    LogEventType["NAME_ID_CREATED"] = "name_id.created";
    LogEventType["NAME_ID_UPDATED"] = "name_id.updated";
    LogEventType["NAME_ID_DELETED"] = "name_id.deleted";
    // Events
    LogEventType["EVENT_SYSTEM_START"] = "event.system_start";
    LogEventType["EVENT_SYSTEM_STOP"] = "event.system_stop";
    LogEventType["EVENT_ERROR"] = "event.error";
    LogEventType["EVENT_WARNING"] = "event.warning";
    LogEventType["EVENT_CUSTOM"] = "event.custom";
    // Rejections
    LogEventType["REJECTION_FILE_VIOLATION"] = "rejection.file_violation";
    LogEventType["REJECTION_PERMISSION_DENIED"] = "rejection.permission_denied";
    LogEventType["REJECTION_VALIDATION_FAILED"] = "rejection.validation_failed";
    LogEventType["REJECTION_QUOTA_EXCEEDED"] = "rejection.quota_exceeded";
    // File operations
    LogEventType["FILE_CREATED"] = "file.created";
    LogEventType["FILE_MODIFIED"] = "file.modified";
    LogEventType["FILE_DELETED"] = "file.deleted";
    LogEventType["FILE_MOVED"] = "file.moved";
    // Log management
    LogEventType["LOG_ROTATION"] = "log.rotation";
    LogEventType["LOG_CLEANUP"] = "log.cleanup";
    LogEventType["LOG_ERROR"] = "log.error";
})(LogEventType || (exports.LogEventType = LogEventType = {}));
class EventLogger extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.logStream = null;
        this.rotationTimer = null;
        this.buffer = [];
        this.bufferSize = 100;
        this.flushInterval = 1000; // ms
        this.flushTimer = null;
        // Set default configuration
        this.config = {
            logDir: path.join(os.tmpdir(), 'external-log-lib', 'logs'),
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
            rotationInterval: 'daily',
            format: 'json',
            enableConsole: false,
            sessionId: this.generateSessionId(),
            detail: false, // Brief mode by default
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
    async logTaskQueueChange(action, taskId, taskData) {
        const eventType = `task_queue.${action}`;
        // Extract essential info if not in detail mode
        let logData;
        let message;
        if (this.config.detail) {
            // Full details mode
            logData = { taskId, ...taskData };
            message = `Task ${taskId} ${action}`;
        }
        else {
            // Brief mode - only essential info
            const essentials = (0, essential_info_extractor_1.extractTaskEssentials)({ id: taskId, ...taskData });
            const brief = (0, essential_info_extractor_1.formatEssentialInfo)(essentials);
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
    async logFeatureChange(action, featureId, featureData) {
        const eventType = `feature.${action}`;
        let logData;
        let message;
        if (this.config.detail) {
            // Full details mode
            logData = { featureId, ...featureData };
            message = `Feature ${featureId} ${action}`;
        }
        else {
            // Brief mode - only essential info
            const essentials = (0, essential_info_extractor_1.extractFeatureEssentials)({ id: featureId, ...featureData });
            const brief = (0, essential_info_extractor_1.formatEssentialInfo)(essentials);
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
    async logNameIdChange(action, nameId, entityData) {
        const eventType = `name_id.${action}`;
        let logData;
        let message;
        if (this.config.detail) {
            // Full details mode
            logData = { nameId, ...entityData };
            message = `Name ID ${nameId} ${action}`;
        }
        else {
            // Brief mode - only essential info
            const essentials = (0, essential_info_extractor_1.extractNameIdEssentials)(nameId, entityData);
            const brief = (0, essential_info_extractor_1.formatEssentialInfo)(essentials);
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
    async logEvent(type, message, data) {
        const level = this.getLogLevelForEventType(type);
        this.log(level, type, 'event', message, data);
    }
    /**
     * Log a rejection
     */
    async logRejection(type, message, details) {
        const eventType = `rejection.${type}`;
        this.log('warn', eventType, 'rejection', message, details);
        this.emit('rejection', { type, message, details });
    }
    /**
     * Log a file operation
     */
    async logFileOperation(operation, filePath, details) {
        const eventType = `file.${operation}`;
        this.log('info', eventType, 'file', `File ${operation}: ${filePath}`, {
            filePath,
            ...details
        });
    }
    /**
     * Core logging method
     */
    async log(level, type, category, message, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            type,
            category,
            message,
            data,
            metadata: {
                ...this.config.metadata,
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
    async flush() {
        if (this.buffer.length === 0 || !this.logStream)
            return;
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
    formatLogEntry(entry) {
        if (this.config.format === 'json') {
            return JSON.stringify(entry);
        }
        else {
            // Text format
            const { timestamp, level, type, category, message, data } = entry;
            const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
            return `[${timestamp}] [${level.toUpperCase()}] [${type}] ${message}${dataStr}`;
        }
    }
    /**
     * Log to console
     */
    async logToConsole(entry) {
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
    async getLogLevelForEventType(type) {
        if (type.includes('error') || type.includes('fatal'))
            return 'error';
        if (type.includes('warn') || type.includes('rejection'))
            return 'warn';
        if (type.includes('debug'))
            return 'debug';
        return 'info';
    }
    /**
     * Ensure log directory exists
     */
    async ensureLogDirectory() {
        if (!fs.existsSync(this.config.logDir)) {
            await fileAPI.createDirectory(this.config.logDir);
        }
    }
    /**
     * Get log file name
     */
    async getLogFileName() {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        if (this.config.rotationInterval === 'hourly') {
            const hour = date.getHours().toString().padStart(2, '0');
            return path.join(this.config.logDir, `events-${dateStr}-${hour}.log`);
        }
        else {
            return path.join(this.config.logDir, `events-${dateStr}.log`);
        }
    }
    /**
     * Initialize log stream
     */
    async initializeLogStream() {
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
    async setupRotation() {
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
        }
        else if (this.config.rotationInterval === 'hourly') {
            // Rotate every hour
            this.rotationTimer = setInterval(() => this.rotate(), 60 * 60 * 1000);
        }
        // Also check size-based rotation periodically
        setInterval(() => this.checkSizeRotation(), 60 * 1000); // Check every minute
    }
    /**
     * Setup buffer flush timer
     */
    async setupBufferFlush() {
        this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }
    /**
     * Rotate log file
     */
    async rotate() {
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
    async checkSizeRotation() {
        if (this.config.rotationInterval !== 'size')
            return;
        try {
            const stats = fs.statSync(this.currentLogPath);
            if (stats.size >= this.config.maxFileSize) {
                this.rotate();
            }
        }
        catch (error) {
            // File doesn't exist yet
        }
    }
    /**
     * Cleanup old log files
     */
    async cleanupOldLogs() {
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
    async generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate correlation ID
     */
    async generateCorrelationId() {
        return Math.random().toString(36).substr(2, 9);
    }
    /**
     * Query logs
     */
    async query(options) {
        const results = [];
        const { startDate, endDate, type, level, category, search, limit = 1000 } = options;
        // Get log files to search
        const files = fs.readdirSync(this.config.logDir)
            .filter(file => file.startsWith('events-') && file.endsWith('.log'))
            .map(file => path.join(this.config.logDir, file));
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            for (const line of lines) {
                if (results.length >= limit)
                    break;
                try {
                    const entry = JSON.parse(line);
                    // Apply filters
                    if (startDate && new Date(entry.timestamp) < startDate)
                        continue;
                    if (endDate && new Date(entry.timestamp) > endDate)
                        continue;
                    if (type) {
                        const types = Array.isArray(type) ? type : [type];
                        if (!types.includes(entry.type))
                            continue;
                    }
                    if (level) {
                        const levels = Array.isArray(level) ? level : [level];
                        if (!levels.includes(entry.level))
                            continue;
                    }
                    if (category && entry.category !== category)
                        continue;
                    if (search && !JSON.stringify(entry).includes(search))
                        continue;
                    results.push(entry);
                }
                catch (error) {
                    // Skip malformed lines
                }
            }
            if (results.length >= limit)
                break;
        }
        return results;
    }
    /**
     * Get current log file path
     */
    async getCurrentLogPath() {
        return this.currentLogPath;
    }
    /**
     * Get log directory
     */
    async getLogDirectory() {
        return this.config.logDir;
    }
    /**
     * Set detail mode
     */
    async setDetailMode(enabled) {
        this.config.detail = enabled;
        this.logEvent(LogEventType.EVENT_CUSTOM, `Detail mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Get detail mode status
     */
    async isDetailMode() {
        return this.config.detail;
    }
    /**
     * Close logger
     */
    async close() {
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
exports.EventLogger = EventLogger;
// Singleton instance
let loggerInstance = null;
/**
 * Get or create logger instance
 */
function getEventLogger(config) {
    if (!loggerInstance) {
        loggerInstance = new EventLogger(config);
    }
    return loggerInstance;
}
exports.default = EventLogger;
//# sourceMappingURL=EventLogger.js.map