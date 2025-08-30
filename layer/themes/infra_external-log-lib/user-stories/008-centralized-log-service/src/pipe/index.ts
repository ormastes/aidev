/**
 * Centralized Log Service - Pipe Interface
 * Gateway for cross-layer access following HEA pattern
 */

// Core service
export { CentralizedLogService } from '../domain/centralized-log-service';

// Interfaces and types
export type { 
  ICentralizedLogService,
  CentralizedLogEntry,
  LogQueryFilters,
  LogQueryResult,
  AggregationStatistics,
  CentralizedLogServiceConfig,
  HealthStatus,
  CleanupOptions,
  LogStreamSubscription,
  StreamingConfig,
  RetentionPolicy
} from '../domain/interfaces';

// Application layer services
export { LogServiceAPI } from '../application/log-service-api';
export type { 
  LogServiceAPIConfig,
  APIResponse,
  LogQueryRequest,
  LogAddRequest,
  HealthCheckResponse
} from '../application/interfaces';

// External integrations
export { LogServiceHTTPAdapter } from '../external/http-adapter';
export type { 
  HTTPAdapterConfig,
  HTTPResponse,
  HTTPError
} from '../external/interfaces';

// Utility functions
export { 
  createCentralizedLogService,
  createLogServiceAPI,
  validateLogEntry,
  normalizeFilters,
  formatLogOutput
} from '../utils/service-factory';

// Constants
export const SERVICE_DEFAULTS = {
  RETENTION_DAYS: 30,
  MAX_LOG_SIZE: 10000000,
  STREAMING_BUFFER_SIZE: 100,
  STREAMING_FLUSH_INTERVAL: 1000,
  MAX_QUERY_LIMIT: 1000,
  DEFAULT_LOG_LEVEL: 'INFO',
} as const;

export const LOG_SOURCES = {
  STDOUT: 'stdout',
  STDERR: 'stderr',  
  FILE: 'file',
  NETWORK: 'network',
  SYSTEM: 'system',
} as const;

// Re-export LogLevel from parent pipe for convenience
export type { LogLevel, LogFormat } from '../../../pipe';