/**
 * External Log Library - Main Export
 * Gateway for all external access following HEA pattern
 */

// Core modules
export { LogCapture } from '../children/capture';
export type { CaptureConfig, LogSource, CaptureOptions } from '../children/capture';

export { LogParser } from '../children/parser';
export type { 
  ParsedLog, 
  LogLevel, 
  LogFormat, 
  ParserConfig,
  StructuredData 
} from '../children/parser';

export { LogStreamer } from '../children/streamer';
export type { 
  StreamConfig, 
  StreamHandler, 
  StreamOptions,
  StreamBuffer 
} from '../children/streamer';

export { LogFilter } from '../children/filter';
export type { 
  FilterRule, 
  FilterConfig, 
  FilterOperator,
  FilterPreset 
} from '../children/filter';

export { LogAggregator } from '../children/aggregator';
export type { 
  AggregationConfig, 
  ProcessLog, 
  AggregationStrategy,
  TimeWindow 
} from '../children/aggregator';

export { StoryReporter } from '../children/reporter';
export type { 
  StoryReport, 
  ReportFormat, 
  ReportOptions,
  StoryEvent 
} from '../children/reporter';

// Utility functions
export { 
  createLogPipeline,
  parseLogLevel,
  formatTimestamp,
  mergeConfigs 
} from '../utils';

// Constants
export const LOG_LEVELS = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
} as const;

export const FORMATS = {
  JSON: 'json',
  PLAIN: 'plain',
  STRUCTURED: "structured",
  SYSLOG: 'syslog',
  APACHE: 'apache',
  NGINX: 'nginx',
} as const;

// File Access Auditing
export { FileAccessAuditor, fileAccessAuditor } from '../children/file-access-auditor';
export type { 
  FileAccessEvent,
  FileOperation,
  CallerInfo,
  OperationResult,
  ValidationResult,
  AuditConfig,
  AuditStats,
  SuspiciousPattern 
} from '../children/file-access-auditor';

// Audited File System
export { AuditedFS, auditedFS } from '../children/audited-fs';

// File Violation Prevention (NEW)
export { FileViolationPreventer, FileViolationError } from '../src/validators/FileViolationPreventer';
export type { StrictModeConfig } from '../src/validators/FileViolationPreventer';

// Safe File Operations (NEW)
export { 
  SafeFileOps,
  safeWriteFile,
  safeWriteFileSync,
  safeMkdir,
  safeMkdirSync,
  safeAppendFile,
  safeCopyFile,
  safeRename,
  wouldViolate,
  enableStrictMode,
  disableStrictMode,
  isStrictModeEnabled
} from '../src/utils/safe-file-operations';

// Strict Mode Configuration (NEW)
export {
  defaultStrictModeConfig,
  strictModeConfig,
  developmentModeConfig,
  getStrictModeConfig
} from '../src/config/strict-mode.config';

// Comprehensive Logging System (NEW)
export {
  EventLogger,
  LogEntry,
  LogEventType,
  LogMetadata,
  EventLoggerConfig,
  getEventLogger
} from '../src/loggers/EventLogger';

export {
  VfJsonWatcher,
  VfJsonFile,
  VfJsonChange,
  VfJsonWatcherConfig
} from '../src/loggers/VfJsonWatcher';

export {
  RejectionTracker,
  Rejection,
  RejectionType,
  RejectionStats,
  RejectionTrackerConfig
} from '../src/loggers/RejectionTracker';

export {
  ComprehensiveLogger,
  ComprehensiveLoggerConfig,
  LoggingSummary,
  getComprehensiveLogger,
  startComprehensiveLogging
} from '../src/loggers/ComprehensiveLogger';

// Essential Info Extraction (NEW)
export {
  EssentialInfo,
  extractTaskEssentials,
  extractFeatureEssentials,
  extractNameIdEssentials,
  extractFileOperationEssentials,
  extractRejectionEssentials,
  extractEssentials,
  formatEssentialInfo
} from '../src/utils/essential-info-extractor';

// File Creation API (NEW - Primary Interface)
export { 
  FileCreationAPI, 
  FileType, 
  FileCreationOptions, 
  FileCreationResult,
  FileAuditEntry 
} from '../src/file-manager/FileCreationAPI';

export { 
  MCPIntegratedFileManager,
  MCPValidationResult,
  StructureAwareOptions 
} from '../src/file-manager/MCPIntegratedFileManager';

// Fraud Detection (NEW)
export { 
  FileCreationFraudChecker,
  FraudPattern,
  FraudDetectionResult,
  Violation,
  FraudCheckOptions 
} from '../src/fraud-detector/FileCreationFraudChecker';

// FS Interceptor (NEW)
export { 
  FSInterceptor,
  InterceptMode,
  InterceptorConfig 
} from '../src/interceptors/fs-interceptor';

// Export Facades for ESM/Bun compatibility
export { fsFacade } from '../src/facades/fs-facade';
export { pathFacade } from '../src/facades/path-facade';
export { childProcessFacade } from '../src/facades/child-process-facade';

// Factory functions for file operations
import { FileCreationAPI, FileType } from '../src/file-manager/FileCreationAPI';
import { MCPIntegratedFileManager } from '../src/file-manager/MCPIntegratedFileManager';

// Import facades for ESM/Bun compatibility
import { fsFacade } from '../src/facades/fs-facade';
import { pathFacade } from '../src/facades/path-facade';
import { childProcessFacade } from '../src/facades/child-process-facade';

let sharedFileAPI: FileCreationAPI | null = null;
let sharedMCPManager: MCPIntegratedFileManager | null = null;

export const getFileAPI = (): FileCreationAPI => {
  if (!sharedFileAPI) {
    sharedFileAPI = new FileCreationAPI(process.cwd(), true);
  }
  return sharedFileAPI;
};

export const getMCPManager = (): MCPIntegratedFileManager => {
  if (!sharedMCPManager) {
    sharedMCPManager = new MCPIntegratedFileManager(process.cwd());
  }
  return sharedMCPManager;
};

// Version
export const VERSION = '2.0.0'; // Major update with File Creation API

// Default export
const ExternalLogLib = {
  // File Management (Primary)
  FileCreationAPI,
  MCPIntegratedFileManager,
  FileCreationFraudChecker,
  FSInterceptor,
  getFileAPI,
  getMCPManager,
  FileType,
  
  // ESM/Bun Compatible Facades
  fsFacade,
  pathFacade,
  childProcessFacade,
  
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
  LOG_LEVELS,
  FORMATS,
  VERSION,
};

export default ExternalLogLib;