/**
 * Log Capture Module
 * Captures logs from various sources (files, processes, streams)
 */
import { EventEmitter } from 'events';
import { Readable, Transform } from 'stream';
export type LogSource = {
    type: 'file';
    path: string;
} | {
    type: 'process';
    command: string;
    args?: string[];
} | {
    type: 'stream';
    stream: Readable;
} | {
    type: 'tail';
    path: string;
    follow?: boolean;
} | {
    type: 'socket';
    port: number;
    host?: string;
};
export interface CaptureOptions {
    bufferSize?: number;
    encoding?: BufferEncoding;
    tailLines?: number;
    followSymlinks?: boolean;
    retryOnError?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}
export interface CaptureConfig {
    sources: LogSource[];
    options?: CaptureOptions;
    filters?: string[];
    timestampFormat?: string;
}
interface LogEntry {
    source: string;
    timestamp: Date;
    content: string;
    metadata?: Record<string, any>;
}
export declare class LogCapture extends EventEmitter {
    private config;
    private activeCaptures;
    private buffer;
    private maxBufferSize;
    private isCapturing;
    constructor(config: CaptureConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private startSource;
    private captureFile;
    private captureProcess;
    private captureStream;
    private captureTail;
    private captureSocket;
    private handleLogLine;
    private shouldFilter;
    private stopCapture;
    private generateSourceId;
    private retryCapture;
    getBuffer(): LogEntry[];
    clearBuffer(): void;
    getActiveCaptures(): string[];
    isActive(): boolean;
    createTransformStream(): Transform;
}
export default LogCapture;
//# sourceMappingURL=index.d.ts.map