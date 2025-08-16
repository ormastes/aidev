/**
 * Log Streamer Module
 * Real-time streaming and buffering of logs
 */
import { EventEmitter } from 'events';
import { Transform } from 'stream';
export interface StreamOptions {
    bufferSize?: number;
    flushInterval?: number;
    highWaterMark?: number;
    encoding?: BufferEncoding;
    batchSize?: number;
    backpressureStrategy?: 'drop' | 'buffer' | 'pause';
}
export interface StreamConfig {
    destinations: StreamDestination[];
    options?: StreamOptions;
    transformers?: StreamTransformer[];
}
export interface StreamDestination {
    type: 'console' | 'file' | 'http' | 'websocket' | 'custom';
    config: any;
}
export interface StreamTransformer {
    name: string;
    transform: (log: any) => any;
}
export interface StreamBuffer {
    size: number;
    count: number;
    oldest: Date;
    newest: Date;
    data: any[];
}
export type StreamHandler = (log: any) => void | Promise<void>;
export declare class LogStreamer extends EventEmitter {
    private config;
    private buffer;
    private maxBufferSize;
    private flushTimer?;
    private streams;
    private isStreaming;
    private stats;
    private backpressure;
    constructor(config: StreamConfig);
    start(): void;
    stop(): void;
    stream(log: any): boolean;
    private setupFlushInterval;
    private flush;
    private writeBatch;
    private formatLog;
    private formatConsoleLog;
    private getLevelColor;
    private initializeDestinations;
    private createDestinationStream;
    private createConsoleStream;
    private createFileStream;
    private createHttpStream;
    private createWebSocketStream;
    private getDestinationId;
    private closeStreams;
    createTransform(): Transform;
    getStats(): StreamStats;
    getBuffer(): StreamBuffer;
    clearBuffer(): void;
}
interface StreamStats {
    totalLogs: number;
    droppedLogs: number;
    bytesStreamed: number;
    startTime: Date;
    uptime?: number;
    throughput?: number;
}
export default LogStreamer;
//# sourceMappingURL=index.d.ts.map