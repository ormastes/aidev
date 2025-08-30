import { 
  ICentralizedLogService,
  CentralizedLogEntry,
  LogQueryFilters,
  LogQueryResult,
  AggregationStatistics,
  CentralizedLogServiceConfig,
  HealthStatus,
  CleanupOptions,
  LogStreamSubscription
} from './interfaces';
import { LogLevel } from '../../../pipe';

export class CentralizedLogService implements ICentralizedLogService {
  private readonly config: Required<CentralizedLogServiceConfig>;
  private readonly startTime: Date;
  private streamingEnabled: boolean = false;
  private streamSubscriptions: Map<string, LogStreamSubscription> = new Map();
  private logCounter: number = 0;
  private errorCounter: number = 0;

  constructor(config: CentralizedLogServiceConfig = {}) {
    this.config = {
      logAggregator: config.logAggregator || null,
      comprehensiveLogger: config.comprehensiveLogger || null,
      eventLogger: config.eventLogger || null,
      retentionDays: config.retentionDays || 30,
      maxLogSize: config.maxLogSize || 10000000, // 10MB default
      enableRealTimeStreaming: config.enableRealTimeStreaming || false,
      streamingConfig: config.streamingConfig || {
        bufferSize: 100,
        flushInterval: 1000,
        enableCompression: false,
      },
      retentionPolicy: config.retentionPolicy || {
        retentionDays: 30,
        maxLogSize: 10000000,
        archiveOldLogs: true,
        compressionLevel: 6,
      },
    };

    this.startTime = new Date();
    this.streamingEnabled = this.config.enableRealTimeStreaming;

    // Validate dependencies
    this.validateDependencies();
  }

  private validateDependencies(): void {
    if (!this.config.logAggregator) {
      throw new Error('LogAggregator is required for CentralizedLogService');
    }
    if (!this.config.comprehensiveLogger) {
      throw new Error('ComprehensiveLogger is required for CentralizedLogService');
    }
    if (!this.config.eventLogger) {
      throw new Error('EventLogger is required for CentralizedLogService');
    }
  }

  async addLog(entry: CentralizedLogEntry): Promise<void> {
    try {
      this.logCounter++;

      // Add to log aggregator
      await this.addToAggregator(entry);

      // Log to event logger
      await this.logToEventLogger(entry);

      // Stream to real-time subscribers if enabled
      if (this.streamingEnabled) {
        await this.streamToSubscribers(entry);
      }
    } catch (error) {
      this.errorCounter++;
      throw new Error(`Failed to add log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async addToAggregator(entry: CentralizedLogEntry): Promise<void> {
    this.config.logAggregator.addLog(entry.processId, {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      source: entry.source,
    });
  }

  private async logToEventLogger(entry: CentralizedLogEntry): Promise<void> {
    this.config.eventLogger.log({
      type: 'LOG_ADDED',
      data: entry,
      timestamp: new Date(),
    });
  }

  private async streamToSubscribers(entry: CentralizedLogEntry): Promise<void> {
    for (const [subscriptionId, subscription] of this.streamSubscriptions) {
      try {
        if (this.matchesFilters(entry, subscription.filters)) {
          subscription.callback([entry]);
          subscription.lastActivity = new Date();
        }
      } catch (error) {
        console.error(`Error streaming to subscription ${subscriptionId}:`, error);
      }
    }
  }

  private matchesFilters(entry: CentralizedLogEntry, filters: LogQueryFilters): boolean {
    if (filters.processIds && !filters.processIds.includes(entry.processId)) {
      return false;
    }
    if (filters.levels && !filters.levels.includes(entry.level)) {
      return false;
    }
    if (filters.themes && entry.theme && !filters.themes.includes(entry.theme)) {
      return false;
    }
    if (filters.userStories && entry.userStory && !filters.userStories.includes(entry.userStory)) {
      return false;
    }
    if (filters.startTime && entry.timestamp < filters.startTime) {
      return false;
    }
    if (filters.endTime && entry.timestamp > filters.endTime) {
      return false;
    }
    if (filters.searchText && !entry.message.toLowerCase().includes(filters.searchText.toLowerCase())) {
      return false;
    }
    return true;
  }

  async queryLogs(filters: LogQueryFilters): Promise<LogQueryResult> {
    const startTime = Date.now();

    try {
      // Convert filters to aggregator format
      const aggregatorFilters = {
        processIds: filters.processIds,
        levels: filters.levels,
        startTime: filters.startTime,
        endTime: filters.endTime,
        limit: filters.limit,
        offset: filters.offset,
      };

      const aggregatedLogs = this.config.logAggregator.getAggregatedLogs(aggregatorFilters);

      // Convert to centralized log format and apply additional filters
      let logs: CentralizedLogEntry[] = aggregatedLogs.map((log: any) => ({
        processId: log.processId,
        timestamp: log.timestamp,
        level: log.level as LogLevel,
        message: log.message,
        source: log.source,
        metadata: {},
      }));

      // Apply text search filter if present
      if (filters.searchText) {
        logs = logs.filter(log => 
          log.message.toLowerCase().includes(filters.searchText!.toLowerCase())
        );
      }

      // Apply theme and user story filters
      if (filters.themes || filters.userStories) {
        logs = logs.filter(log => {
          if (filters.themes && log.theme && !filters.themes.includes(log.theme)) {
            return false;
          }
          if (filters.userStories && log.userStory && !filters.userStories.includes(log.userStory)) {
            return false;
          }
          return true;
        });
      }

      const totalCount = logs.length;
      const hasMore = filters.limit ? totalCount > filters.limit : false;

      return {
        logs,
        totalCount,
        hasMore,
        query: filters,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.errorCounter++;
      throw new Error(`Failed to query logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAggregationStats(): Promise<AggregationStatistics> {
    const baseStats = this.config.logAggregator.getStatistics();
    
    // TODO: Enhance with additional statistics from comprehensive and event loggers
    return {
      ...baseStats,
      logsByLevel: this.calculateLogsByLevel(),
      logsByTheme: this.calculateLogsByTheme(),
      logsBySource: this.calculateLogsBySource(),
      timeRange: this.calculateTimeRange(),
    };
  }

  private calculateLogsByLevel(): Record<LogLevel, number> {
    // This would be implemented by querying the aggregator for level-specific counts
    return {
      'TRACE': 0,
      'DEBUG': 0,
      'INFO': 0,
      'WARN': 0,
      'ERROR': 0,
      'FATAL': 0,
    };
  }

  private calculateLogsByTheme(): Record<string, number> {
    // This would be implemented by analyzing log metadata
    return {};
  }

  private calculateLogsBySource(): Record<string, number> {
    // This would be implemented by querying the aggregator
    return {
      'stdout': 0,
      'stderr': 0,
      'file': 0,
      'network': 0,
      'system': 0,
    };
  }

  private calculateTimeRange(): { earliest: Date | null; latest: Date | null } {
    // This would be implemented by querying the aggregator
    return {
      earliest: null,
      latest: null,
    };
  }

  async startRealTimeStreaming(): Promise<void> {
    this.streamingEnabled = true;
  }

  async stopRealTimeStreaming(): Promise<void> {
    this.streamingEnabled = false;
    this.streamSubscriptions.clear();
  }

  async subscribeToStream(
    filters: LogQueryFilters, 
    callback: (logs: CentralizedLogEntry[]) => void
  ): Promise<string> {
    const subscriptionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: LogStreamSubscription = {
      id: subscriptionId,
      filters,
      callback,
      created: new Date(),
      lastActivity: new Date(),
    };

    this.streamSubscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  async unsubscribeFromStream(subscriptionId: string): Promise<void> {
    this.streamSubscriptions.delete(subscriptionId);
  }

  isStreamingEnabled(): boolean {
    return this.streamingEnabled;
  }

  async cleanup(options: CleanupOptions = {}): Promise<void> {
    if (options.clearLogs) {
      this.config.logAggregator.clear();
    }

    if (options.applyRetention) {
      await this.applyRetentionPolicy();
    }

    // Stop comprehensive logger if requested
    if (this.config.comprehensiveLogger && this.config.comprehensiveLogger.stop) {
      this.config.comprehensiveLogger.stop();
    }

    // Clear stream subscriptions
    if (options.clearLogs) {
      this.streamSubscriptions.clear();
    }
  }

  async applyRetentionPolicy(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPolicy.retentionDays);

    // This would implement actual retention logic
    console.log(`Would apply retention policy for logs older than ${cutoffDate}`);
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const uptime = Date.now() - this.startTime.getTime();
    const logStats = this.config.logAggregator.getStatistics();

    return {
      status: this.determineHealthStatus(),
      uptime,
      logStats: {
        totalLogs: logStats.totalLogs || this.logCounter,
        logsPerSecond: this.calculateLogsPerSecond(uptime),
        errorRate: this.calculateErrorRate(),
      },
      streamingStatus: {
        enabled: this.streamingEnabled,
        activeStreams: this.streamSubscriptions.size,
      },
      storage: {
        usedSpace: 0, // Would calculate actual storage usage
        availableSpace: 0, // Would calculate available storage
        retentionCompliance: true, // Would check retention compliance
      },
      dependencies: {
        aggregator: this.config.logAggregator ? 'connected' : 'disconnected',
        comprehensiveLogger: this.config.comprehensiveLogger ? 'connected' : 'disconnected',
        eventLogger: this.config.eventLogger ? 'connected' : 'disconnected',
      },
    };
  }

  private determineHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const errorRate = this.calculateErrorRate();
    if (errorRate > 0.1) return 'unhealthy'; // >10% error rate
    if (errorRate > 0.05) return 'degraded'; // >5% error rate
    return 'healthy';
  }

  private calculateLogsPerSecond(uptime: number): number {
    if (uptime === 0) return 0;
    return (this.logCounter / uptime) * 1000;
  }

  private calculateErrorRate(): number {
    if (this.logCounter === 0) return 0;
    return this.errorCounter / this.logCounter;
  }
}