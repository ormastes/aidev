import { CentralizedLogService } from '../domain/centralized-log-service';
import { LogServiceAPI } from '../application/log-service-api';
import { LogServiceHTTPAdapter } from '../external/http-adapter';
import { 
  CentralizedLogServiceConfig,
  CentralizedLogEntry,
  LogQueryFilters 
} from '../domain/interfaces';
import { LogServiceAPIConfig } from '../application/interfaces';
import { HTTPAdapterConfig } from '../external/interfaces';
import { LogLevel } from '../../../pipe';

// Import existing infrastructure components
import { LogAggregator } from '../../../user-stories/006-multi-process-aggregation/src/internal/log-aggregator';
import { getComprehensiveLogger } from '../../../src/loggers/ComprehensiveLogger';
import { getEventLogger } from '../../../src/loggers/EventLogger';

/**
 * Factory function to create a fully configured CentralizedLogService
 * Integrates with existing infrastructure components
 */
export function createCentralizedLogService(
  config: Partial<CentralizedLogServiceConfig> = {}
): CentralizedLogService {
  // Create or use existing infrastructure components
  const logAggregator = config.logAggregator || new LogAggregator();
  const comprehensiveLogger = config.comprehensiveLogger || getComprehensiveLogger();
  const eventLogger = config.eventLogger || getEventLogger();

  const serviceConfig: CentralizedLogServiceConfig = {
    logAggregator,
    comprehensiveLogger,
    eventLogger,
    retentionDays: config.retentionDays || 30,
    maxLogSize: config.maxLogSize || 10000000,
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

  return new CentralizedLogService(serviceConfig);
}

/**
 * Factory function to create LogServiceAPI with sensible defaults
 */
export function createLogServiceAPI(
  service: CentralizedLogService,
  config: Partial<LogServiceAPIConfig> = {}
): LogServiceAPI {
  return new LogServiceAPI(service, config);
}

/**
 * Factory function to create complete log service stack
 * Returns service, API, and HTTP adapter
 */
export function createLogServiceStack(config: {
  service?: Partial<CentralizedLogServiceConfig>;
  api?: Partial<LogServiceAPIConfig>;
  http?: Partial<HTTPAdapterConfig>;
} = {}) {
  const service = createCentralizedLogService(config.service);
  const api = createLogServiceAPI(service, config.api);
  const httpAdapter = new LogServiceHTTPAdapter(api, config.http);

  return {
    service,
    api,
    httpAdapter,
    async start() {
      await service.startRealTimeStreaming();
      await httpAdapter.start();
    },
    async stop() {
      await httpAdapter.stop();
      await service.stopRealTimeStreaming();
      await service.cleanup();
    },
  };
}

/**
 * Validate log entry according to centralized log service requirements
 */
export function validateLogEntry(entry: CentralizedLogEntry): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!entry.processId || typeof entry.processId !== 'string') {
    errors.push('processId must be a non-empty string');
  }

  if (!entry.timestamp || !(entry.timestamp instanceof Date)) {
    errors.push('timestamp must be a valid Date object');
  }

  if (!entry.level || !isValidLogLevel(entry.level)) {
    errors.push('level must be a valid LogLevel (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)');
  }

  if (!entry.message || typeof entry.message !== 'string') {
    errors.push('message must be a non-empty string');
  }

  if (!entry.source || !isValidLogSource(entry.source)) {
    errors.push('source must be one of: stdout, stderr, file, network, system');
  }

  if (entry.metadata && typeof entry.metadata !== 'object') {
    errors.push('metadata must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize and validate query filters
 */
export function normalizeFilters(filters: LogQueryFilters): LogQueryFilters {
  const normalized: LogQueryFilters = { ...filters };

  // Normalize arrays
  if (normalized.processIds) {
    normalized.processIds = normalized.processIds.filter(id => typeof id === 'string' && id.length > 0);
  }

  if (normalized.levels) {
    normalized.levels = normalized.levels.filter(level => isValidLogLevel(level));
  }

  if (normalized.themes) {
    normalized.themes = normalized.themes.filter(theme => typeof theme === 'string' && theme.length > 0);
  }

  if (normalized.userStories) {
    normalized.userStories = normalized.userStories.filter(story => typeof story === 'string' && story.length > 0);
  }

  // Normalize dates
  if (normalized.startTime && !(normalized.startTime instanceof Date)) {
    try {
      normalized.startTime = new Date(normalized.startTime);
    } catch {
      delete normalized.startTime;
    }
  }

  if (normalized.endTime && !(normalized.endTime instanceof Date)) {
    try {
      normalized.endTime = new Date(normalized.endTime);
    } catch {
      delete normalized.endTime;
    }
  }

  // Normalize pagination
  normalized.limit = Math.max(1, Math.min(normalized.limit || 100, 1000));
  normalized.offset = Math.max(0, normalized.offset || 0);

  // Normalize search text
  if (normalized.searchText) {
    normalized.searchText = normalized.searchText.trim();
    if (normalized.searchText.length === 0) {
      delete normalized.searchText;
    }
  }

  return normalized;
}

/**
 * Format log output for different use cases
 */
export function formatLogOutput(
  logs: CentralizedLogEntry[],
  format: 'json' | 'text' | 'csv' | 'table' = 'json'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(logs, null, 2);

    case 'text':
      return logs.map(log => 
        `[${log.timestamp.toISOString()}] ${log.level.toUpperCase().padEnd(5)} ${log.processId.padEnd(15)} ${log.message}`
      ).join('\n');

    case 'csv':
      const headers = 'Timestamp,Level,ProcessId,Source,Message';
      const rows = logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.processId,
        log.source,
        `"${log.message.replace(/"/g, '""')}"` // Escape quotes for CSV
      ].join(','));
      return [headers, ...rows].join('\n');

    case 'table':
      // Simple table format for console output
      if (logs.length === 0) return 'No logs found';
      
      const maxMessageLength = 50;
      const tableRows = logs.map(log => [
        log.timestamp.toISOString().substring(0, 19),
        log.level.toUpperCase().padEnd(5),
        log.processId.padEnd(15),
        log.source.padEnd(8),
        log.message.length > maxMessageLength 
          ? log.message.substring(0, maxMessageLength - 3) + '...'
          : log.message
      ]);

      const headers = ['Timestamp'.padEnd(19), 'Level'.padEnd(5), 'ProcessId'.padEnd(15), 'Source'.padEnd(8), 'Message'];
      const separator = '-'.repeat(headers.join(' | ').length);
      
      return [
        headers.join(' | '),
        separator,
        ...tableRows.map(row => row.join(' | '))
      ].join('\n');

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Helper function to check if a string is a valid log level
 */
function isValidLogLevel(level: string): level is LogLevel {
  const validLevels: LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  return validLevels.includes(level as LogLevel);
}

/**
 * Helper function to check if a string is a valid log source
 */
function isValidLogSource(source: string): source is 'stdout' | 'stderr' | 'file' | 'network' | 'system' {
  const validSources = ['stdout', 'stderr', 'file', 'network', 'system'];
  return validSources.includes(source);
}

/**
 * Create a sample log entry for testing
 */
export function createSampleLogEntry(overrides: Partial<CentralizedLogEntry> = {}): CentralizedLogEntry {
  return {
    processId: 'sample-process',
    timestamp: new Date(),
    level: 'INFO',
    message: 'Sample log message',
    source: 'stdout',
    metadata: {
      theme: 'infra_external-log-lib',
      userStory: '008-centralized-log-service',
    },
    ...overrides,
  };
}

/**
 * Batch log entry creation helper
 */
export function createSampleLogBatch(
  count: number,
  baseEntry: Partial<CentralizedLogEntry> = {}
): CentralizedLogEntry[] {
  const logs: CentralizedLogEntry[] = [];
  const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const sources = ['stdout', 'stderr', 'file', 'system'] as const;

  for (let i = 0; i < count; i++) {
    logs.push(createSampleLogEntry({
      ...baseEntry,
      processId: baseEntry.processId || `process-${i + 1}`,
      message: baseEntry.message || `Log message ${i + 1}`,
      level: levels[i % levels.length],
      source: sources[i % sources.length],
      timestamp: new Date(Date.now() - (count - i) * 1000), // Spread over time
    }));
  }

  return logs;
}