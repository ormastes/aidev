/**
 * Log Streamer Module
 * Real-time streaming and buffering of logs
 */

import { EventEmitter } from 'events';
import { Transform, Writable, PassThrough } from 'stream';
import { fs, path } from '../../src';


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

export class LogStreamer extends EventEmitter {
  private config: StreamConfig;
  private buffer: any[];
  private maxBufferSize: number;
  private flushTimer?: NodeJS.Timeout;
  private streams: Map<string, Writable>;
  private isStreaming: boolean;
  private stats: StreamStats;
  private backpressure: boolean;

  constructor(config: StreamConfig) {
    super();
    this.config = config;
    this.buffer = [];
    this.maxBufferSize = config.options?.bufferSize || 1000;
    this.streams = new Map();
    this.isStreaming = false;
    this.backpressure = false;
    this.stats = {
      totalLogs: 0,
      droppedLogs: 0,
      bytesStreamed: 0,
      startTime: new Date(),
    };

    this.setupFlushInterval();
  }

  start(): void {
    if (this.isStreaming) {
      throw new Error('Streamer already running');
    }

    this.isStreaming = true;
    this.initializeDestinations();
    this.emit('started');
  }

  stop(): void {
    if (!this.isStreaming) {
      return;
    }

    this.isStreaming = false;
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flush();
    this.closeStreams();
    this.emit('stopped', this.stats);
  }

  stream(log: any): boolean {
    if (!this.isStreaming) {
      return false;
    }

    this.stats.totalLogs++;

    // Apply transformers
    let transformedLog = log;
    if (this.config.transformers) {
      for (const transformer of this.config.transformers) {
        try {
          transformedLog = transformer.transform(transformedLog);
        } catch (error) {
          this.emit('transformError', { transformer: transformer.name, error });
        }
      }
    }

    // Handle backpressure
    if (this.backpressure) {
      switch (this.config.options?.backpressureStrategy) {
        case 'drop':
          this.stats.droppedLogs++;
          return false;
        case 'pause':
          this.emit('backpressure', { action: 'pause' });
          return false;
        case 'buffer':
        default:
          // Continue to buffer
          break;
      }
    }

    // Add to buffer
    this.buffer.push(transformedLog);

    // Check buffer size
    if (this.buffer.length >= (this.config.options?.batchSize || 100)) {
      this.flush();
    }

    return true;
  }

  private setupFlushInterval(): void {
    const interval = this.config.options?.flushInterval || 1000;
    
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, interval);
  }

  private flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const batch = this.buffer.splice(0, this.buffer.length);
    
    for (const [id, stream] of this.streams) {
      this.writeBatch(id, stream, batch);
    }

    this.emit('flushed', { count: batch.length });
  }

  private writeBatch(id: string, stream: Writable, batch: any[]): void {
    try {
      for (const log of batch) {
        const data = this.formatLog(log, id);
        const written = stream.write(data);
        
        this.stats.bytesStreamed += Buffer.byteLength(data);
        
        if (!written) {
          this.backpressure = true;
          stream.once('drain', () => {
            this.backpressure = false;
            this.emit('backpressure', { action: 'resume' });
          });
        }
      }
    } catch (error) {
      this.emit('writeError', { destination: id, error });
    }
  }

  private formatLog(log: any, destinationId: string): string {
    const destination = this.config.destinations.find(d => 
      this.getDestinationId(d) === destinationId
    );

    if (!destination) {
      return JSON.stringify(log) + '\n';
    }

    switch (destination.type) {
      case 'console':
        return this.formatConsoleLog(log);
      case 'file':
        return JSON.stringify(log) + '\n';
      case 'http':
      case 'websocket':
        return JSON.stringify(log);
      default:
        return JSON.stringify(log) + '\n';
    }
  }

  private formatConsoleLog(log: any): string {
    const timestamp = log.timestamp || new Date().toISOString();
    const level = (log.level || 'info').toUpperCase();
    const message = log.message || JSON.stringify(log);
    
    const color = this.getLevelColor(level);
    return `${color}[${timestamp}] ${level}: ${message}\x1b[0m\n`;
  }

  private getLevelColor(level: string): string {
    const colors: Record<string, string> = {
      TRACE: '\x1b[90m',    // Gray
      DEBUG: '\x1b[36m',    // Cyan
      INFO: '\x1b[32m',     // Green
      WARN: '\x1b[33m',     // Yellow
      ERROR: '\x1b[31m',    // Red
      FATAL: '\x1b[35m',    // Magenta
    };
    
    return colors[level] || '\x1b[0m';
  }

  private initializeDestinations(): void {
    for (const destination of this.config.destinations) {
      const stream = this.createDestinationStream(destination);
      const id = this.getDestinationId(destination);
      this.streams.set(id, stream);
    }
  }

  private createDestinationStream(destination: StreamDestination): Writable {
    switch (destination.type) {
      case 'console':
        return this.createConsoleStream(destination.config);
      case 'file':
        return this.createFileStream(destination.config);
      case 'http':
        return this.createHttpStream(destination.config);
      case 'websocket':
        return this.createWebSocketStream(destination.config);
      case 'custom':
        return destination.config.stream;
      default:
        throw new Error(`Unknown destination type: ${destination.type}`);
    }
  }

  private createConsoleStream(config: any): Writable {
    const useStderr = config.useStderr || false;
    return useStderr ? process.stderr : process.stdout;
  }

  private createFileStream(config: any): Writable {
    return fs.createWriteStream(config.path, {
      flags: config.append !== false ? 'a' : 'w',
      encoding: config.encoding || 'utf8',
    });
  }

  private createHttpStream(config: any): Writable {
    const stream = new PassThrough();
    const https = require(config.secure ? 'https' : 'http');
    
    stream.on('data', async (chunk) => {
      const options = {
        hostname: config.host,
        port: config.port,
        path: config.path || '/',
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      };

      const req = https.request(options, (res: any) => {
        if (res.statusCode >= 400) {
          this.emit('httpError', { 
            statusCode: res.statusCode,
            config 
          });
        }
      });

      req.on('error', (error: Error) => {
        this.emit('httpError', { error, config });
      });

      req.write(chunk);
      req.end();
    });

    return stream;
  }

  private createWebSocketStream(config: any): Writable {
    const stream = new PassThrough();
    const WebSocket = require('ws');
    
    const ws = new WebSocket(config.url);
    
    ws.on('open', () => {
      this.emit('websocketConnected', { url: config.url });
    });

    ws.on('error', (error: Error) => {
      this.emit('websocketError', { error, config });
    });

    stream.on('data', (chunk) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      }
    });

    return stream;
  }

  private getDestinationId(destination: StreamDestination): string {
    const timestamp = Date.now();
    return `${destination.type}_${timestamp}`;
  }

  private closeStreams(): void {
    for (const [id, stream] of this.streams) {
      if (stream && typeof stream.end === 'function') {
        stream.end();
      }
    }
    this.streams.clear();
  }

  createTransform(): Transform {
    return new Transform({
      objectMode: true,
      transform: (chunk, encoding, callback) => {
        const success = this.stream(chunk);
        callback(null, success ? chunk : null);
      },
    });
  }

  getStats(): StreamStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime.getTime(),
      throughput: this.stats.totalLogs / 
                  ((Date.now() - this.stats.startTime.getTime()) / 1000),
    };
  }

  getBuffer(): StreamBuffer {
    return {
      size: this.buffer.length,
      count: this.buffer.length,
      oldest: this.buffer[0]?.timestamp || new Date(),
      newest: this.buffer[this.buffer.length - 1]?.timestamp || new Date(),
      data: [...this.buffer],
    };
  }

  clearBuffer(): void {
    this.buffer = [];
  }
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