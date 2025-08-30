/**
 * Domain Interfaces for Log Analysis Dashboard
 * Defines core business logic interfaces and types
 */

// Core domain types - temporarily defining types until pipe module is available
export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogFormat = 'json' | 'plain' | 'structured' | 'syslog' | 'apache' | 'nginx';
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string;
  theme: string;
  userStory?: string;
  processId?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface LogQueryFilters {
  levels?: LogLevel[];
  sources?: string[];
  themes?: string[];
  userStories?: string[];
  processIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  textSearch?: string;
  useRegex?: boolean;
}

export interface LogQueryRequest {
  filters: LogQueryFilters;
  pagination: {
    offset: number;
    limit: number;
  };
  sorting: {
    field: keyof LogEntry;
    order: 'asc' | 'desc';
  };
  format?: LogFormat;
}

export interface LogQueryResult {
  logs: LogEntry[];
  totalCount: number;
  hasMore: boolean;
  aggregations?: LogAggregations;
}

export interface LogAggregations {
  levelCounts: Record<LogLevel, number>;
  sourceCounts: Record<string, number>;
  themeCounts: Record<string, number>;
  errorRate: number;
  logsPerHour: number[];
}

export interface StreamingSubscription {
  id: string;
  clientId: string;
  filters: LogQueryFilters;
  callback: (logs: LogEntry[]) => void;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface DashboardConfig {
  port: number;
  host: string;
  enableStreaming: boolean;
  refreshInterval: number;
  maxQueryLimit: number;
  streamingBufferSize: number;
  theme: 'light' | 'dark';
  enableExports: boolean;
  exportFormats: LogFormat[];
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    logService: boolean;
    streaming: boolean;
    database: boolean;
  };
  metrics: {
    activeStreams: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
}

export interface AnalyticsData {
  errorRates: {
    timestamp: Date;
    rate: number;
  }[];
  logVolume: {
    timestamp: Date;
    count: number;
  }[];
  severityDistribution: {
    level: LogLevel;
    count: number;
    percentage: number;
  }[];
  performanceMetrics: {
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    throughputPerSecond: number;
  };
  topSources: {
    source: string;
    count: number;
    errorCount: number;
  }[];
  topThemes: {
    theme: string;
    count: number;
    errorCount: number;
  }[];
}

export interface ExportRequest {
  filters: LogQueryFilters;
  format: 'json' | 'csv' | 'pdf';
  includeMetadata: boolean;
  maxRecords?: number;
  compression?: boolean;
  email?: string;
}

export interface ExportResult {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Service interfaces
export interface IDashboardService {
  initialize(config: DashboardConfig): Promise<void>;
  getHealth(): Promise<HealthStatus>;
  updateConfig(config: Partial<DashboardConfig>): Promise<void>;
  shutdown(): Promise<void>;
}

export interface ILogQueryService {
  queryLogs(request: LogQueryRequest): Promise<LogQueryResult>;
  searchLogs(query: string, filters?: LogQueryFilters): Promise<LogEntry[]>;
  filterLogs(filters: LogQueryFilters): Promise<LogEntry[]>;
  getLogSummary(filters?: LogQueryFilters): Promise<LogAggregations>;
  getLogById(id: string): Promise<LogEntry | null>;
}

export interface IStreamingService {
  subscribe(filters: LogQueryFilters, callback: (logs: LogEntry[]) => void): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
  broadcast(logs: LogEntry[], targetFilters?: LogQueryFilters): Promise<void>;
  getActiveSubscriptions(): StreamingSubscription[];
  getSubscriptionCount(): number;
}

export interface IAnalyticsService {
  getErrorRates(timeRange?: { start: Date; end: Date }): Promise<AnalyticsData['errorRates']>;
  getLogVolume(timeRange?: { start: Date; end: Date }): Promise<AnalyticsData['logVolume']>;
  getSeverityDistribution(filters?: LogQueryFilters): Promise<AnalyticsData['severityDistribution']>;
  getPerformanceMetrics(): Promise<AnalyticsData['performanceMetrics']>;
  getTopSources(limit?: number): Promise<AnalyticsData['topSources']>;
  getTopThemes(limit?: number): Promise<AnalyticsData['topThemes']>;
  getFullAnalytics(filters?: LogQueryFilters): Promise<AnalyticsData>;
}

export interface IExportService {
  createExport(request: ExportRequest): Promise<string>;
  getExportStatus(exportId: string): Promise<ExportResult>;
  downloadExport(exportId: string): Promise<Buffer>;
  cancelExport(exportId: string): Promise<boolean>;
  cleanupExpiredExports(): Promise<void>;
}

// Event types for real-time communication
export interface DashboardEvents {
  'logs:new': LogEntry[];
  'logs:update': LogEntry;
  'analytics:update': Partial<AnalyticsData>;
  'health:status': HealthStatus;
  'export:progress': ExportResult;
  'connection:status': { connected: boolean; clientCount: number };
}

export type DashboardEventType = keyof DashboardEvents;
export type DashboardEventData<T extends DashboardEventType> = DashboardEvents[T];

// Error types
export class DashboardError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'DashboardError';
  }
}

export class LogQueryError extends DashboardError {
  constructor(message: string, details?: any) {
    super(message, 'LOG_QUERY_ERROR', 400, details);
    this.name = 'LogQueryError';
  }
}

export class StreamingError extends DashboardError {
  constructor(message: string, details?: any) {
    super(message, 'STREAMING_ERROR', 500, details);
    this.name = 'StreamingError';
  }
}

export class ExportError extends DashboardError {
  constructor(message: string, details?: any) {
    super(message, 'EXPORT_ERROR', 500, details);
    this.name = 'ExportError';
  }
}