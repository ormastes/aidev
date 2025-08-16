/**
 * Utility functions for External Log Library
 */

import { LogCapture, CaptureConfig } from '../children/capture';
import { LogParser, ParserConfig, LogLevel } from '../children/parser';
import { LogStreamer, StreamConfig } from '../children/streamer';
import { LogFilter, FilterConfig } from '../children/filter';
import { LogAggregator, AggregationConfig } from '../children/aggregator';
import { StoryReporter } from '../children/reporter';

export interface PipelineConfig {
  capture: CaptureConfig;
  parser: ParserConfig;
  stream?: StreamConfig;
  filter?: FilterConfig;
  aggregation?: AggregationConfig;
  reporting?: boolean;
}

/**
 * Creates a complete log processing pipeline
 */
export function createLogPipeline(config: PipelineConfig) {
  const capture = new LogCapture(config.capture);
  const parser = new LogParser(config.parser);
  const filter = config.filter ? new LogFilter(config.filter) : null;
  const streamer = config.stream ? new LogStreamer(config.stream) : null;
  const aggregator = config.aggregation ? new LogAggregator(config.aggregation) : null;
  const reporter = config.reporting ? new StoryReporter() : null;

  // Connect components
  capture.on('log', (log) => {
    // Parse the log
    const parsed = parser.parse(log.content);
    if (!parsed) return;

    // Apply filters
    if (filter && !filter.filter(parsed)) return;

    // Stream if configured
    if (streamer) {
      streamer.stream(parsed);
    }

    // Aggregate if configured
    if (aggregator) {
      aggregator.addLog(log.source, parsed);
    }

    // Report if configured
    if (reporter && reporter['currentStory']) {
      reporter.addEvent({
        timestamp: parsed.timestamp || new Date(),
        type: parsed.level === 'error' ? 'error' : 'action',
        title: parsed.message.substring(0, 50),
        description: parsed.message,
        metadata: parsed.fields,
      });
    }
  });

  return {
    capture,
    parser,
    filter,
    streamer,
    aggregator,
    reporter,
    
    async start() {
      await capture.start();
      if (streamer) streamer.start();
      if (reporter) reporter.startStory('pipeline', 'Log Pipeline Session');
    },
    
    async stop() {
      await capture.stop();
      if (streamer) streamer.stop();
      if (aggregator) aggregator.stop();
      if (reporter) reporter.endStory();
    },
  };
}

/**
 * Parse log level from string
 */
export function parseLogLevel(level: string): LogLevel {
  const normalized = level.toLowerCase().trim();
  
  const levelMap: Record<string, LogLevel> = {
    trace: 'trace',
    debug: 'debug',
    info: 'info',
    information: 'info',
    warn: 'warn',
    warning: 'warn',
    error: 'error',
    err: 'error',
    fatal: 'fatal',
    critical: 'fatal',
  };

  return levelMap[normalized] || 'info';
}

/**
 * Format timestamp in various formats
 */
export function formatTimestamp(
  date: Date,
  format: 'iso' | 'unix' | 'human' | 'relative' = 'iso'
): string {
  switch (format) {
    case 'unix':
      return String(Math.floor(date.getTime() / 1000));
    
    case 'human':
      return date.toLocaleString();
    
    case 'relative':
      return formatRelativeTime(date);
    
    case 'iso':
    default:
      return date.toISOString();
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHour < 24) return `${diffHour} hours ago`;
  return `${diffDay} days ago`;
}

/**
 * Merge multiple configurations with defaults
 */
export function mergeConfigs<T extends Record<string, any>>(
  ...configs: Partial<T>[]
): T {
  return configs.reduce((merged, config) => {
    return deepMerge(merged, config);
  }, {} as T);
}

/**
 * Deep merge objects
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (Array.isArray(sourceValue)) {
        result[key] = [...sourceValue] as any;
      } else {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * Check if value is a plain object
 */
function isObject(value: any): value is Record<string, any> {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) &&
         !(value instanceof Date) &&
         !(value instanceof RegExp);
}

/**
 * Create a log level filter
 */
export function createLevelFilter(minLevel: LogLevel) {
  const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  const minIndex = levels.indexOf(minLevel);

  return (log: any) => {
    const logLevel = parseLogLevel(log.level || 'info');
    const logIndex = levels.indexOf(logLevel);
    return logIndex >= minIndex;
  };
}

/**
 * Create a time range filter
 */
export function createTimeRangeFilter(start: Date, end: Date) {
  return (log: any) => {
    if (!log.timestamp) return true;
    
    const timestamp = new Date(log.timestamp);
    return timestamp >= start && timestamp <= end;
  };
}

/**
 * Create a keyword search filter
 */
export function createKeywordFilter(keywords: string[], matchAll: boolean = false) {
  return (log: any) => {
    const text = JSON.stringify(log).toLowerCase();
    const lowerKeywords = keywords.map(k => k.toLowerCase());

    if (matchAll) {
      return lowerKeywords.every(keyword => text.includes(keyword));
    } else {
      return lowerKeywords.some(keyword => text.includes(keyword));
    }
  };
}

/**
 * Batch process logs
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await processor(batch);
    results.push(result);
  }

  return results;
}

/**
 * Rate limit function calls
 */
export function rateLimit<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
  interval: number
): T {
  const calls: number[] = [];

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    // Remove old calls outside the interval
    while (calls.length > 0 && calls[0] < now - interval) {
      calls.shift();
    }

    // Check if we've exceeded the limit
    if (calls.length >= limit) {
      throw new Error(`Rate limit exceeded: ${limit} calls per ${interval}ms`);
    }

    calls.push(now);
    return fn(...args);
  }) as T;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(fn(...args));
        timeoutId = null;
      }, delay);
    });
  }) as T;
}

/**
 * Sanitize log content for safe display
 */
export function sanitizeLog(log: any): any {
  const sensitivePatterns = [
    /password["\s]*[:=]["\s]*["'][^"']+["']/gi,
    /api[_-]?key["\s]*[:=]["\s]*["'][^"']+["']/gi,
    /token["\s]*[:=]["\s]*["'][^"']+["']/gi,
    /secret["\s]*[:=]["\s]*["'][^"']+["']/gi,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
  ];

  let sanitized = JSON.stringify(log);
  
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return JSON.parse(sanitized);
}

export default {
  createLogPipeline,
  parseLogLevel,
  formatTimestamp,
  mergeConfigs,
  createLevelFilter,
  createTimeRangeFilter,
  createKeywordFilter,
  batchProcess,
  rateLimit,
  debounce,
  sanitizeLog,
};