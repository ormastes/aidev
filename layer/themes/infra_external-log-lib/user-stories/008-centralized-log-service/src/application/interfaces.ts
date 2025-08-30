import { CentralizedLogEntry, LogQueryFilters, HealthStatus } from '../domain/interfaces';

export interface LogServiceAPIConfig {
  serviceName: string;
  version: string;
  enableAuthentication: boolean;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  enableCORS: boolean;
  maxRequestSize: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
  executionTime: number;
}

export interface LogQueryRequest {
  filters: LogQueryFilters;
  format?: 'json' | 'csv' | 'text';
  includeMetadata?: boolean;
}

export interface LogAddRequest {
  entries: CentralizedLogEntry | CentralizedLogEntry[];
  batch?: boolean;
  validateOnly?: boolean;
}

export interface HealthCheckResponse {
  status: HealthStatus;
  service: {
    name: string;
    version: string;
    uptime: number;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface LogExportRequest {
  filters: LogQueryFilters;
  format: 'json' | 'csv' | 'xml';
  compression?: 'gzip' | 'zip';
  includeHeaders?: boolean;
}

export interface StreamingRequest {
  filters: LogQueryFilters;
  bufferSize?: number;
  flushInterval?: number;
}