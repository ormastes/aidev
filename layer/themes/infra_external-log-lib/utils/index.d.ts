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
export declare function createLogPipeline(config: PipelineConfig): {
    capture: LogCapture;
    parser: LogParser;
    filter: LogFilter | null;
    streamer: LogStreamer | null;
    aggregator: LogAggregator | null;
    reporter: StoryReporter | null;
    start(): Promise<void>;
    stop(): Promise<void>;
};
/**
 * Parse log level from string
 */
export declare function parseLogLevel(level: string): LogLevel;
/**
 * Format timestamp in various formats
 */
export declare function formatTimestamp(date: Date, format?: 'iso' | 'unix' | 'human' | 'relative'): string;
/**
 * Merge multiple configurations with defaults
 */
export declare function mergeConfigs<T extends Record<string, any>>(...configs: Partial<T>[]): T;
/**
 * Create a log level filter
 */
export declare function createLevelFilter(minLevel: LogLevel): (log: any) => boolean;
/**
 * Create a time range filter
 */
export declare function createTimeRangeFilter(start: Date, end: Date): (log: any) => boolean;
/**
 * Create a keyword search filter
 */
export declare function createKeywordFilter(keywords: string[], matchAll?: boolean): (log: any) => boolean;
/**
 * Batch process logs
 */
export declare function batchProcess<T, R>(items: T[], processor: (batch: T[]) => Promise<R>, batchSize?: number): Promise<R[]>;
/**
 * Rate limit function calls
 */
export declare function rateLimit<T extends (...args: any[]) => any>(fn: T, limit: number, interval: number): T;
/**
 * Debounce function calls
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T;
/**
 * Sanitize log content for safe display
 */
export declare function sanitizeLog(log: any): any;
declare const _default: {
    createLogPipeline: typeof createLogPipeline;
    parseLogLevel: typeof parseLogLevel;
    formatTimestamp: typeof formatTimestamp;
    mergeConfigs: typeof mergeConfigs;
    createLevelFilter: typeof createLevelFilter;
    createTimeRangeFilter: typeof createTimeRangeFilter;
    createKeywordFilter: typeof createKeywordFilter;
    batchProcess: typeof batchProcess;
    rateLimit: typeof rateLimit;
    debounce: typeof debounce;
    sanitizeLog: typeof sanitizeLog;
};
export default _default;
//# sourceMappingURL=index.d.ts.map