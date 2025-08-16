/**
 * Log Aggregator Module
 * Aggregates logs from multiple processes and sources
 */
import { EventEmitter } from 'events';
export type AggregationStrategy = 'merge' | 'group' | 'correlate' | 'window' | 'sample';
export interface TimeWindow {
    size: number;
    unit: 'ms' | 's' | 'm' | 'h';
    overlap?: number;
}
export interface ProcessLog {
    processId: string;
    processName?: string;
    pid?: number;
    startTime: Date;
    logs: any[];
    metadata?: Record<string, any>;
}
export interface AggregationConfig {
    strategy: AggregationStrategy;
    window?: TimeWindow;
    correlationField?: string;
    sampleRate?: number;
    maxProcesses?: number;
    bufferTimeout?: number;
    sortField?: string;
    deduplication?: boolean;
}
export interface AggregatedResult {
    strategy: AggregationStrategy;
    timestamp: Date;
    count: number;
    processes: number;
    data: any;
    metadata?: Record<string, any>;
}
export declare class LogAggregator extends EventEmitter {
    private config;
    private processes;
    private correlationMap;
    private windowBuffer;
    private stats;
    private aggregationTimer?;
    constructor(config: AggregationConfig);
    addProcess(processId: string, metadata?: Record<string, any>): void;
    removeProcess(processId: string): void;
    addLog(processId: string, log: any): void;
    aggregate(): AggregatedResult;
    private aggregateMerge;
    private aggregateGroup;
    private aggregateCorrelate;
    private aggregateWindow;
    private aggregateSample;
    private handleCorrelation;
    private handleWindowing;
    private getWindowSizeMs;
    private getFieldValue;
    private deduplicateLogs;
    private getDeduplicationKey;
    private setupAggregationTimer;
    clearProcessLogs(): void;
    clear(): void;
    stop(): void;
    getStats(): AggregationStats & {
        uptime: number;
    };
    getProcesses(): ProcessLog[];
    getProcessById(processId: string): ProcessLog | undefined;
}
interface AggregationStats {
    totalLogs: number;
    totalProcesses: number;
    aggregations: number;
    startTime: Date;
    averageLogsPerProcess?: number;
}
export default LogAggregator;
//# sourceMappingURL=index.d.ts.map