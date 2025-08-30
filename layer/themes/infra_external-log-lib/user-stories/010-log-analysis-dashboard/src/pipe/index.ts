/**
 * Log Analysis Dashboard - Pipe Interface
 * Gateway for cross-layer communication following HEA pattern
 */

// Domain exports
export { DashboardService } from '../domain/dashboard-service';
import { DashboardService } from '../domain/dashboard-service';

// Domain interfaces and types
export type {
  IDashboardService,
  ILogQueryService,
  IStreamingService,
  IAnalyticsService,
  IExportService,
  LogEntry,
  LogQueryFilters,
  LogQueryRequest,
  LogQueryResult,
  LogAggregations,
  StreamingSubscription,
  DashboardConfig,
  HealthStatus,
  AnalyticsData,
  ExportRequest,
  ExportResult,
  LogLevel,
  LogFormat,
  DashboardEvents,
  DashboardEventType,
  DashboardEventData,
  DashboardError,
  LogQueryError,
  StreamingError,
  ExportError
} from '../domain/interfaces';

// Application layer (to be implemented)
// export { LogQueryService } from '../application/log-query-service';
// export { StreamingService } from '../application/streaming-service';
// export { AnalyticsService } from '../application/analytics-service';
// export { ExportService } from '../application/export-service';

// External adapters (to be implemented)
// export { CentralizedLogAdapter } from '../external/centralized-log-adapter';
// export { WebSocketManager } from '../external/websocket-manager';
// export { HTTPServer } from '../external/http-server';

// UI components (to be implemented)
// export { DashboardApp } from '../ui/components/DashboardApp';
// export { LogStreamComponent } from '../ui/components/LogStream';
// export { AnalyticsCharts } from '../ui/components/AnalyticsCharts';

// UI logic hooks (to be implemented)
// export { useWebSocket } from '../ui_logic/hooks/useWebSocket';
// export { useLogQuery } from '../ui_logic/hooks/useLogQuery';
// export { useAnalytics } from '../ui_logic/hooks/useAnalytics';

// Constants and defaults
export const DASHBOARD_DEFAULTS = {
  PORT: 3458,
  HOST: 'localhost',
  REFRESH_INTERVAL: 5000,
  MAX_QUERY_LIMIT: 1000,
  STREAMING_BUFFER_SIZE: 100,
  THEME: 'light' as const,
  ENABLE_STREAMING: true,
  ENABLE_EXPORTS: true,
  EXPORT_FORMATS: ['json', 'csv', 'pdf'] as const
} as const;

export const LOG_LEVELS = {
  TRACE: 'TRACE',
  DEBUG: 'DEBUG', 
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL'
} as const;

export const LOG_FORMATS = {
  JSON: 'json',
  PLAIN: 'plain',
  STRUCTURED: 'structured',
  SYSLOG: 'syslog',
  APACHE: 'apache',
  NGINX: 'nginx'
} as const;

export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  LOGS_NEW: 'logs:new',
  LOGS_UPDATE: 'logs:update',
  ANALYTICS_UPDATE: 'analytics:update',
  HEALTH_STATUS: 'health:status',
  EXPORT_PROGRESS: 'export:progress',
  CONNECTION_STATUS: 'connection:status'
} as const;

// Factory functions
export const createDashboard = (config: Partial<DashboardConfig> = {}): DashboardService => {
  const fullConfig: DashboardConfig = {
    port: DASHBOARD_DEFAULTS.PORT,
    host: DASHBOARD_DEFAULTS.HOST,
    enableStreaming: DASHBOARD_DEFAULTS.ENABLE_STREAMING,
    refreshInterval: DASHBOARD_DEFAULTS.REFRESH_INTERVAL,
    maxQueryLimit: DASHBOARD_DEFAULTS.MAX_QUERY_LIMIT,
    streamingBufferSize: DASHBOARD_DEFAULTS.STREAMING_BUFFER_SIZE,
    theme: DASHBOARD_DEFAULTS.THEME,
    enableExports: DASHBOARD_DEFAULTS.ENABLE_EXPORTS,
    exportFormats: [...DASHBOARD_DEFAULTS.EXPORT_FORMATS],
    ...config
  };
  
  const service = new DashboardService();
  // Note: Service should be initialized with the config, but for now we return uninitialized
  return service;
};

// Utility functions
export const validateLogLevel = (level: string): level is LogLevel => {
  return Object.values(LOG_LEVELS).includes(level as LogLevel);
};

export const validateLogFormat = (format: string): format is LogFormat => {
  return Object.values(LOG_FORMATS).includes(format as LogFormat);
};

export const formatTimestamp = (date: Date): string => {
  return date.toISOString();
};

export const parseLogLevel = (level: string): LogLevel => {
  const upperLevel = level.toUpperCase() as LogLevel;
  if (validateLogLevel(upperLevel)) {
    return upperLevel;
  }
  return 'INFO'; // Default fallback
};

// Health check helper
export const isHealthy = (status: HealthStatus): boolean => {
  return status.status === 'healthy';
};

// Version info
export const VERSION = '1.0.0';
export const API_VERSION = 'v1';