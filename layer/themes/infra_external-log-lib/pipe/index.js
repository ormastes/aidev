"use strict";
/**
 * External Log Library - Main Export
 * Gateway for all external access following HEA pattern
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEssentialInfo = exports.extractEssentials = exports.extractRejectionEssentials = exports.extractFileOperationEssentials = exports.extractNameIdEssentials = exports.extractFeatureEssentials = exports.extractTaskEssentials = exports.startComprehensiveLogging = exports.getComprehensiveLogger = exports.ComprehensiveLogger = exports.RejectionType = exports.RejectionTracker = exports.VfJsonWatcher = exports.getEventLogger = exports.LogEventType = exports.EventLogger = exports.getStrictModeConfig = exports.developmentModeConfig = exports.strictModeConfig = exports.defaultStrictModeConfig = exports.isStrictModeEnabled = exports.disableStrictMode = exports.enableStrictMode = exports.wouldViolate = exports.safeRename = exports.safeCopyFile = exports.safeAppendFile = exports.safeMkdirSync = exports.safeMkdir = exports.safeWriteFileSync = exports.safeWriteFile = exports.SafeFileOps = exports.FileViolationError = exports.FileViolationPreventer = exports.auditedFS = exports.AuditedFS = exports.fileAccessAuditor = exports.FileAccessAuditor = exports.FORMATS = exports.LOG_LEVELS = exports.mergeConfigs = exports.formatTimestamp = exports.parseLogLevel = exports.createLogPipeline = exports.StoryReporter = exports.LogAggregator = exports.LogFilter = exports.LogStreamer = exports.LogParser = exports.LogCapture = void 0;
exports.VERSION = exports.getMCPManager = exports.getFileAPI = exports.InterceptMode = exports.FSInterceptor = exports.FileCreationFraudChecker = exports.MCPIntegratedFileManager = exports.FileType = exports.FileCreationAPI = void 0;
// Core modules
var capture_1 = require("../children/capture");
Object.defineProperty(exports, "LogCapture", { enumerable: true, get: function () { return capture_1.LogCapture; } });
var parser_1 = require("../children/parser");
Object.defineProperty(exports, "LogParser", { enumerable: true, get: function () { return parser_1.LogParser; } });
var streamer_1 = require("../children/streamer");
Object.defineProperty(exports, "LogStreamer", { enumerable: true, get: function () { return streamer_1.LogStreamer; } });
var filter_1 = require("../children/filter");
Object.defineProperty(exports, "LogFilter", { enumerable: true, get: function () { return filter_1.LogFilter; } });
var aggregator_1 = require("../children/aggregator");
Object.defineProperty(exports, "LogAggregator", { enumerable: true, get: function () { return aggregator_1.LogAggregator; } });
var reporter_1 = require("../children/reporter");
Object.defineProperty(exports, "StoryReporter", { enumerable: true, get: function () { return reporter_1.StoryReporter; } });
// Utility functions
var utils_1 = require("../utils");
Object.defineProperty(exports, "createLogPipeline", { enumerable: true, get: function () { return utils_1.createLogPipeline; } });
Object.defineProperty(exports, "parseLogLevel", { enumerable: true, get: function () { return utils_1.parseLogLevel; } });
Object.defineProperty(exports, "formatTimestamp", { enumerable: true, get: function () { return utils_1.formatTimestamp; } });
Object.defineProperty(exports, "mergeConfigs", { enumerable: true, get: function () { return utils_1.mergeConfigs; } });
// Constants
exports.LOG_LEVELS = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
};
exports.FORMATS = {
    JSON: 'json',
    PLAIN: 'plain',
    STRUCTURED: 'structured',
    SYSLOG: 'syslog',
    APACHE: 'apache',
    NGINX: 'nginx',
};
// File Access Auditing
var file_access_auditor_1 = require("../children/file-access-auditor");
Object.defineProperty(exports, "FileAccessAuditor", { enumerable: true, get: function () { return file_access_auditor_1.FileAccessAuditor; } });
Object.defineProperty(exports, "fileAccessAuditor", { enumerable: true, get: function () { return file_access_auditor_1.fileAccessAuditor; } });
// Audited File System
var audited_fs_1 = require("../children/audited-fs");
Object.defineProperty(exports, "AuditedFS", { enumerable: true, get: function () { return audited_fs_1.AuditedFS; } });
Object.defineProperty(exports, "auditedFS", { enumerable: true, get: function () { return audited_fs_1.auditedFS; } });
// File Violation Prevention (NEW)
var FileViolationPreventer_1 = require("../src/validators/FileViolationPreventer");
Object.defineProperty(exports, "FileViolationPreventer", { enumerable: true, get: function () { return FileViolationPreventer_1.FileViolationPreventer; } });
Object.defineProperty(exports, "FileViolationError", { enumerable: true, get: function () { return FileViolationPreventer_1.FileViolationError; } });
// Safe File Operations (NEW)
var safe_file_operations_1 = require("../src/utils/safe-file-operations");
Object.defineProperty(exports, "SafeFileOps", { enumerable: true, get: function () { return safe_file_operations_1.SafeFileOps; } });
Object.defineProperty(exports, "safeWriteFile", { enumerable: true, get: function () { return safe_file_operations_1.safeWriteFile; } });
Object.defineProperty(exports, "safeWriteFileSync", { enumerable: true, get: function () { return safe_file_operations_1.safeWriteFileSync; } });
Object.defineProperty(exports, "safeMkdir", { enumerable: true, get: function () { return safe_file_operations_1.safeMkdir; } });
Object.defineProperty(exports, "safeMkdirSync", { enumerable: true, get: function () { return safe_file_operations_1.safeMkdirSync; } });
Object.defineProperty(exports, "safeAppendFile", { enumerable: true, get: function () { return safe_file_operations_1.safeAppendFile; } });
Object.defineProperty(exports, "safeCopyFile", { enumerable: true, get: function () { return safe_file_operations_1.safeCopyFile; } });
Object.defineProperty(exports, "safeRename", { enumerable: true, get: function () { return safe_file_operations_1.safeRename; } });
Object.defineProperty(exports, "wouldViolate", { enumerable: true, get: function () { return safe_file_operations_1.wouldViolate; } });
Object.defineProperty(exports, "enableStrictMode", { enumerable: true, get: function () { return safe_file_operations_1.enableStrictMode; } });
Object.defineProperty(exports, "disableStrictMode", { enumerable: true, get: function () { return safe_file_operations_1.disableStrictMode; } });
Object.defineProperty(exports, "isStrictModeEnabled", { enumerable: true, get: function () { return safe_file_operations_1.isStrictModeEnabled; } });
// Strict Mode Configuration (NEW)
var strict_mode_config_1 = require("../src/config/strict-mode.config");
Object.defineProperty(exports, "defaultStrictModeConfig", { enumerable: true, get: function () { return strict_mode_config_1.defaultStrictModeConfig; } });
Object.defineProperty(exports, "strictModeConfig", { enumerable: true, get: function () { return strict_mode_config_1.strictModeConfig; } });
Object.defineProperty(exports, "developmentModeConfig", { enumerable: true, get: function () { return strict_mode_config_1.developmentModeConfig; } });
Object.defineProperty(exports, "getStrictModeConfig", { enumerable: true, get: function () { return strict_mode_config_1.getStrictModeConfig; } });
// Comprehensive Logging System (NEW)
var EventLogger_1 = require("../src/loggers/EventLogger");
Object.defineProperty(exports, "EventLogger", { enumerable: true, get: function () { return EventLogger_1.EventLogger; } });
Object.defineProperty(exports, "LogEventType", { enumerable: true, get: function () { return EventLogger_1.LogEventType; } });
Object.defineProperty(exports, "getEventLogger", { enumerable: true, get: function () { return EventLogger_1.getEventLogger; } });
var VfJsonWatcher_1 = require("../src/loggers/VfJsonWatcher");
Object.defineProperty(exports, "VfJsonWatcher", { enumerable: true, get: function () { return VfJsonWatcher_1.VfJsonWatcher; } });
var RejectionTracker_1 = require("../src/loggers/RejectionTracker");
Object.defineProperty(exports, "RejectionTracker", { enumerable: true, get: function () { return RejectionTracker_1.RejectionTracker; } });
Object.defineProperty(exports, "RejectionType", { enumerable: true, get: function () { return RejectionTracker_1.RejectionType; } });
var ComprehensiveLogger_1 = require("../src/loggers/ComprehensiveLogger");
Object.defineProperty(exports, "ComprehensiveLogger", { enumerable: true, get: function () { return ComprehensiveLogger_1.ComprehensiveLogger; } });
Object.defineProperty(exports, "getComprehensiveLogger", { enumerable: true, get: function () { return ComprehensiveLogger_1.getComprehensiveLogger; } });
Object.defineProperty(exports, "startComprehensiveLogging", { enumerable: true, get: function () { return ComprehensiveLogger_1.startComprehensiveLogging; } });
// Essential Info Extraction (NEW)
var essential_info_extractor_1 = require("../src/utils/essential-info-extractor");
Object.defineProperty(exports, "extractTaskEssentials", { enumerable: true, get: function () { return essential_info_extractor_1.extractTaskEssentials; } });
Object.defineProperty(exports, "extractFeatureEssentials", { enumerable: true, get: function () { return essential_info_extractor_1.extractFeatureEssentials; } });
Object.defineProperty(exports, "extractNameIdEssentials", { enumerable: true, get: function () { return essential_info_extractor_1.extractNameIdEssentials; } });
Object.defineProperty(exports, "extractFileOperationEssentials", { enumerable: true, get: function () { return essential_info_extractor_1.extractFileOperationEssentials; } });
Object.defineProperty(exports, "extractRejectionEssentials", { enumerable: true, get: function () { return essential_info_extractor_1.extractRejectionEssentials; } });
Object.defineProperty(exports, "extractEssentials", { enumerable: true, get: function () { return essential_info_extractor_1.extractEssentials; } });
Object.defineProperty(exports, "formatEssentialInfo", { enumerable: true, get: function () { return essential_info_extractor_1.formatEssentialInfo; } });
// File Creation API (NEW - Primary Interface)
var FileCreationAPI_1 = require("../src/file-manager/FileCreationAPI");
Object.defineProperty(exports, "FileCreationAPI", { enumerable: true, get: function () { return FileCreationAPI_1.FileCreationAPI; } });
Object.defineProperty(exports, "FileType", { enumerable: true, get: function () { return FileCreationAPI_1.FileType; } });
var MCPIntegratedFileManager_1 = require("../src/file-manager/MCPIntegratedFileManager");
Object.defineProperty(exports, "MCPIntegratedFileManager", { enumerable: true, get: function () { return MCPIntegratedFileManager_1.MCPIntegratedFileManager; } });
// Fraud Detection (NEW)
var FileCreationFraudChecker_1 = require("../src/fraud-detector/FileCreationFraudChecker");
Object.defineProperty(exports, "FileCreationFraudChecker", { enumerable: true, get: function () { return FileCreationFraudChecker_1.FileCreationFraudChecker; } });
// FS Interceptor (NEW)
var fs_interceptor_1 = require("../src/interceptors/fs-interceptor");
Object.defineProperty(exports, "FSInterceptor", { enumerable: true, get: function () { return fs_interceptor_1.FSInterceptor; } });
Object.defineProperty(exports, "InterceptMode", { enumerable: true, get: function () { return fs_interceptor_1.InterceptMode; } });
// Factory functions for file operations
const FileCreationAPI_2 = require("../src/file-manager/FileCreationAPI");
const MCPIntegratedFileManager_2 = require("../src/file-manager/MCPIntegratedFileManager");
let sharedFileAPI = null;
let sharedMCPManager = null;
const getFileAPI = () => {
    if (!sharedFileAPI) {
        sharedFileAPI = new FileCreationAPI_2.FileCreationAPI(process.cwd(), true);
    }
    return sharedFileAPI;
};
exports.getFileAPI = getFileAPI;
const getMCPManager = () => {
    if (!sharedMCPManager) {
        sharedMCPManager = new MCPIntegratedFileManager_2.MCPIntegratedFileManager(process.cwd());
    }
    return sharedMCPManager;
};
exports.getMCPManager = getMCPManager;
// Version
exports.VERSION = '2.0.0'; // Major update with File Creation API
// Default export
const ExternalLogLib = {
    // File Management (Primary)
    FileCreationAPI: FileCreationAPI_2.FileCreationAPI,
    MCPIntegratedFileManager: MCPIntegratedFileManager_2.MCPIntegratedFileManager,
    FileCreationFraudChecker,
    FSInterceptor,
    getFileAPI: exports.getFileAPI,
    getMCPManager: exports.getMCPManager,
    FileType: FileCreationAPI_2.FileType,
    // Logging
    LogCapture,
    LogParser,
    LogStreamer,
    LogFilter,
    LogAggregator,
    StoryReporter,
    FileAccessAuditor: fileAccessAuditor,
    AuditedFS: auditedFS,
    FileViolationPreventer,
    SafeFileOps,
    strictModeConfig,
    ComprehensiveLogger,
    EventLogger,
    VfJsonWatcher,
    RejectionTracker,
    startComprehensiveLogging,
    LOG_LEVELS: exports.LOG_LEVELS,
    FORMATS: exports.FORMATS,
    VERSION: exports.VERSION,
};
exports.default = ExternalLogLib;
//# sourceMappingURL=index.js.map