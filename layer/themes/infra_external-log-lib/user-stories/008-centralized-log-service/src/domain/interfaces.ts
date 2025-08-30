import { LogLevel } from '../../../pipe';

export interface CentralizedLogEntry {
  processId: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: 'stdout' | 'stderr' | 'file' | 'network' | 'system';
  metadata?: Record<string, any>;
  theme?: string;
  userStory?: string;
}

export interface LogQueryFilters {
  processIds?: string[];
  levels?: LogLevel[];
  themes?: string[];
  userStories?: string[];
  startTime?: Date;
  endTime?: Date;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface LogQueryResult {
  logs: CentralizedLogEntry[];
  totalCount: number;
  hasMore: boolean;
  query: LogQueryFilters;
  executionTime: number;
}

export interface AggregationStatistics {
  totalLogs: number;
  totalProcesses: number;
  activeProcesses: number;
  passedProcesses: number;
  crashedProcesses: number;
  stoppedProcesses: number;
  logsByLevel: Record<LogLevel, number>;
  logsByTheme: Record<string, number>;
  logsBySource: Record<string, number>;
  timeRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

export interface StreamingConfig {
  bufferSize: number;
  flushInterval: number;
  enableCompression: boolean;
  filters?: LogQueryFilters;
}

export interface RetentionPolicy {
  retentionDays: number;
  maxLogSize: number;
  archiveOldLogs: boolean;
  compressionLevel: number;
}

export interface CentralizedLogServiceConfig {
  logAggregator?: any; // Will be typed properly in implementation
  comprehensiveLogger?: any;
  eventLogger?: any;
  retentionDays?: number;
  maxLogSize?: number;
  enableRealTimeStreaming?: boolean;
  streamingConfig?: StreamingConfig;
  retentionPolicy?: RetentionPolicy;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  logStats: {
    totalLogs: number;
    logsPerSecond: number;
    errorRate: number;
  };
  streamingStatus: {
    enabled: boolean;
    activeStreams: number;
  };
  storage: {
    usedSpace: number;
    availableSpace: number;
    retentionCompliance: boolean;
  };
  dependencies: {
    aggregator: 'connected' | 'disconnected';
    comprehensiveLogger: 'connected' | 'disconnected';
    eventLogger: 'connected' | 'disconnected';
  };
}

export interface CleanupOptions {
  clearLogs?: boolean;
  applyRetention?: boolean;
  compactStorage?: boolean;
}

export interface LogStreamSubscription {
  id: string;
  filters: LogQueryFilters;
  callback: (logs: CentralizedLogEntry[]) => void;
  created: Date;
  lastActivity: Date;
}

export interface ICentralizedLogService {
  // Core logging operations
  addLog(entry: CentralizedLogEntry): Promise<void>;
  queryLogs(filters: LogQueryFilters): Promise<LogQueryResult>;
  
  // Aggregation and statistics
  getAggregationStats(): Promise<AggregationStatistics>;
  
  // Real-time streaming
  startRealTimeStreaming(): Promise<void>;
  stopRealTimeStreaming(): Promise<void>;
  subscribeToStream(filters: LogQueryFilters, callback: (logs: CentralizedLogEntry[]) => void): Promise<string>;
  unsubscribeFromStream(subscriptionId: string): Promise<void>;
  isStreamingEnabled(): boolean;
  
  // Maintenance operations
  cleanup(options?: CleanupOptions): Promise<void>;
  applyRetentionPolicy(): Promise<void>;
  
  // Health and monitoring
  getHealthStatus(): Promise<HealthStatus>;
}