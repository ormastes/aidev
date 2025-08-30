/**
 * Dashboard Data Models
 * Cross-layer data models for the log analysis dashboard
 */

import type { 
  LogLevel, 
  LogFormat,
  LogEntry,
  DashboardConfig,
  HealthStatus,
  AnalyticsData 
} from '../domain/interfaces';

// Request/Response models
export interface DashboardConfigRequest {
  port?: number;
  host?: string;
  enableStreaming?: boolean;
  refreshInterval?: number;
  maxQueryLimit?: number;
  streamingBufferSize?: number;
  theme?: 'light' | 'dark';
  enableExports?: boolean;
  exportFormats?: LogFormat[];
}

export interface DashboardConfigResponse {
  config: DashboardConfig;
  status: 'success' | 'error';
  message?: string;
  validationErrors?: string[];
}

export interface LogQueryRequestModel {
  filters: {
    levels?: LogLevel[];
    sources?: string[];
    themes?: string[];
    userStories?: string[];
    processIds?: string[];
    dateRange?: {
      start: string; // ISO string
      end: string;   // ISO string
    };
    textSearch?: string;
    useRegex?: boolean;
  };
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

export interface LogQueryResponseModel {
  logs: LogEntry[];
  totalCount: number;
  hasMore: boolean;
  status: 'success' | 'error';
  message?: string;
  aggregations?: {
    levelCounts: Record<LogLevel, number>;
    sourceCounts: Record<string, number>;
    themeCounts: Record<string, number>;
    errorRate: number;
    logsPerHour: number[];
  };
}

export interface StreamingSubscriptionModel {
  id: string;
  clientId: string;
  filters: LogQueryRequestModel['filters'];
  isActive: boolean;
  createdAt: string; // ISO string
  lastActivity: string; // ISO string
}

export interface HealthStatusModel {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string; // ISO string
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
  uptime: number; // seconds
  version: string;
}

export interface AnalyticsRequestModel {
  filters?: LogQueryRequestModel['filters'];
  timeRange?: {
    start: string; // ISO string
    end: string;   // ISO string
  };
  granularity?: 'minute' | 'hour' | 'day';
  metrics?: ('errorRates' | 'logVolume' | 'severityDistribution' | 'performance' | 'topSources' | 'topThemes')[];
}

export interface AnalyticsResponseModel {
  data: AnalyticsData;
  status: 'success' | 'error';
  message?: string;
  generatedAt: string; // ISO string
  timeRange: {
    start: string;
    end: string;
  };
}

export interface ExportRequestModel {
  filters: LogQueryRequestModel['filters'];
  format: 'json' | 'csv' | 'pdf';
  includeMetadata: boolean;
  maxRecords?: number;
  compression?: boolean;
  email?: string;
}

export interface ExportResponseModel {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
}

// WebSocket message models
export interface WebSocketMessageModel<T = any> {
  type: string;
  payload: T;
  timestamp: string; // ISO string
  messageId: string;
}

export interface LogStreamMessageModel {
  type: 'logs:new' | 'logs:update';
  payload: {
    logs: LogEntry[];
    subscriptionId: string;
  };
  timestamp: string;
  messageId: string;
}

export interface AnalyticsUpdateMessageModel {
  type: 'analytics:update';
  payload: {
    analytics: Partial<AnalyticsData>;
  };
  timestamp: string;
  messageId: string;
}

export interface HealthUpdateMessageModel {
  type: 'health:status';
  payload: {
    health: HealthStatusModel;
  };
  timestamp: string;
  messageId: string;
}

export interface ExportProgressMessageModel {
  type: 'export:progress';
  payload: {
    exportResult: ExportResponseModel;
  };
  timestamp: string;
  messageId: string;
}

export interface ConnectionStatusMessageModel {
  type: 'connection:status';
  payload: {
    connected: boolean;
    clientCount: number;
    totalStreams: number;
  };
  timestamp: string;
  messageId: string;
}

// Error models
export interface ErrorResponseModel {
  status: 'error';
  message: string;
  code: string;
  details?: any;
  timestamp: string; // ISO string
  requestId?: string;
}

export interface ValidationErrorModel {
  field: string;
  message: string;
  value?: any;
}

// Pagination models
export interface PaginationModel {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

// Filter models
export interface FilterOptionModel {
  value: string;
  label: string;
  count?: number;
  selected?: boolean;
}

export interface FilterGroupModel {
  name: string;
  label: string;
  options: FilterOptionModel[];
  multiSelect: boolean;
  searchable?: boolean;
}

// Chart data models
export interface ChartDataPointModel {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartDatasetModel {
  label: string;
  data: ChartDataPointModel[];
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface ChartConfigModel {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  datasets: ChartDatasetModel[];
  options?: any; // Chart.js options
}

// Dashboard layout models
export interface WidgetConfigModel {
  id: string;
  type: 'log-stream' | 'analytics-chart' | 'health-status' | 'filter-controls';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: any;
  visible: boolean;
}

export interface DashboardLayoutModel {
  id: string;
  name: string;
  widgets: WidgetConfigModel[];
  createdAt: string;
  updatedAt: string;
}

// User preference models
export interface UserPreferencesModel {
  theme: 'light' | 'dark';
  refreshInterval: number;
  defaultFilters: LogQueryRequestModel['filters'];
  savedQueries: SavedQueryModel[];
  dashboardLayouts: DashboardLayoutModel[];
}

export interface SavedQueryModel {
  id: string;
  name: string;
  description?: string;
  filters: LogQueryRequestModel['filters'];
  createdAt: string;
  lastUsed?: string;
}

// Performance monitoring models
export interface PerformanceMetricModel {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
  timestamp: string;
}

export interface PerformanceReportModel {
  metrics: PerformanceMetricModel[];
  overallStatus: 'good' | 'warning' | 'critical';
  generatedAt: string;
  timeRange: {
    start: string;
    end: string;
  };
}