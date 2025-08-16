/**
 * External Log Library - Main Export
 * Gateway for all external access following HEA pattern
 */
export { LogCapture } from '../children/capture';
export type { CaptureConfig, LogSource, CaptureOptions } from '../children/capture';
export { LogParser } from '../children/parser';
export type { ParsedLog, LogLevel, LogFormat, ParserConfig, StructuredData } from '../children/parser';
export { LogStreamer } from '../children/streamer';
export type { StreamConfig, StreamHandler, StreamOptions, StreamBuffer } from '../children/streamer';
export { LogFilter } from '../children/filter';
export type { FilterRule, FilterConfig, FilterOperator, FilterPreset } from '../children/filter';
export { LogAggregator } from '../children/aggregator';
export type { AggregationConfig, ProcessLog, AggregationStrategy, TimeWindow } from '../children/aggregator';
export { StoryReporter } from '../children/reporter';
export type { StoryReport, ReportFormat, ReportOptions, StoryEvent } from '../children/reporter';
export { createLogPipeline, parseLogLevel, formatTimestamp, mergeConfigs } from '../utils';
export declare const LOG_LEVELS: {
    readonly TRACE: 0;
    readonly DEBUG: 1;
    readonly INFO: 2;
    readonly WARN: 3;
    readonly ERROR: 4;
    readonly FATAL: 5;
};
export declare const FORMATS: {
    readonly JSON: "json";
    readonly PLAIN: "plain";
    readonly STRUCTURED: "structured";
    readonly SYSLOG: "syslog";
    readonly APACHE: "apache";
    readonly NGINX: "nginx";
};
export { FileAccessAuditor, fileAccessAuditor } from '../children/file-access-auditor';
export type { FileAccessEvent, FileOperation, CallerInfo, OperationResult, ValidationResult, AuditConfig, AuditStats, SuspiciousPattern } from '../children/file-access-auditor';
export { AuditedFS, auditedFS } from '../children/audited-fs';
export { FileViolationPreventer, FileViolationError } from '../src/validators/FileViolationPreventer';
export type { StrictModeConfig } from '../src/validators/FileViolationPreventer';
export { SafeFileOps, safeWriteFile, safeWriteFileSync, safeMkdir, safeMkdirSync, safeAppendFile, safeCopyFile, safeRename, wouldViolate, enableStrictMode, disableStrictMode, isStrictModeEnabled } from '../src/utils/safe-file-operations';
export { defaultStrictModeConfig, strictModeConfig, developmentModeConfig, getStrictModeConfig } from '../src/config/strict-mode.config';
export { EventLogger, LogEntry, LogEventType, LogMetadata, EventLoggerConfig, getEventLogger } from '../src/loggers/EventLogger';
export { VfJsonWatcher, VfJsonFile, VfJsonChange, VfJsonWatcherConfig } from '../src/loggers/VfJsonWatcher';
export { RejectionTracker, Rejection, RejectionType, RejectionStats, RejectionTrackerConfig } from '../src/loggers/RejectionTracker';
export { ComprehensiveLogger, ComprehensiveLoggerConfig, LoggingSummary, getComprehensiveLogger, startComprehensiveLogging } from '../src/loggers/ComprehensiveLogger';
export { EssentialInfo, extractTaskEssentials, extractFeatureEssentials, extractNameIdEssentials, extractFileOperationEssentials, extractRejectionEssentials, extractEssentials, formatEssentialInfo } from '../src/utils/essential-info-extractor';
export { FileCreationAPI, FileType, FileCreationOptions, FileCreationResult, FileAuditEntry } from '../src/file-manager/FileCreationAPI';
export { MCPIntegratedFileManager, MCPValidationResult, StructureAwareOptions } from '../src/file-manager/MCPIntegratedFileManager';
export { FileCreationFraudChecker, FraudPattern, FraudDetectionResult, Violation, FraudCheckOptions } from '../src/fraud-detector/FileCreationFraudChecker';
export { FSInterceptor, InterceptMode, InterceptorConfig } from '../src/interceptors/fs-interceptor';
import { FileCreationAPI, FileType } from '../src/file-manager/FileCreationAPI';
import { MCPIntegratedFileManager } from '../src/file-manager/MCPIntegratedFileManager';
export declare const getFileAPI: () => FileCreationAPI;
export declare const getMCPManager: () => MCPIntegratedFileManager;
export declare const VERSION = "2.0.0";
declare const ExternalLogLib: {
    FileCreationAPI: typeof FileCreationAPI;
    MCPIntegratedFileManager: typeof MCPIntegratedFileManager;
    FileCreationFraudChecker: any;
    FSInterceptor: any;
    getFileAPI: () => FileCreationAPI;
    getMCPManager: () => MCPIntegratedFileManager;
    FileType: typeof FileType;
    LogCapture: any;
    LogParser: any;
    LogStreamer: any;
    LogFilter: any;
    LogAggregator: any;
    StoryReporter: any;
    FileAccessAuditor: any;
    AuditedFS: any;
    FileViolationPreventer: any;
    SafeFileOps: any;
    strictModeConfig: any;
    ComprehensiveLogger: any;
    EventLogger: any;
    VfJsonWatcher: any;
    RejectionTracker: any;
    startComprehensiveLogging: any;
    LOG_LEVELS: {
        readonly TRACE: 0;
        readonly DEBUG: 1;
        readonly INFO: 2;
        readonly WARN: 3;
        readonly ERROR: 4;
        readonly FATAL: 5;
    };
    FORMATS: {
        readonly JSON: "json";
        readonly PLAIN: "plain";
        readonly STRUCTURED: "structured";
        readonly SYSLOG: "syslog";
        readonly APACHE: "apache";
        readonly NGINX: "nginx";
    };
    VERSION: string;
};
export default ExternalLogLib;
//# sourceMappingURL=index.d.ts.map