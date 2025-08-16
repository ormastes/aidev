/**
 * Log Capture Module
 * Captures logs from various sources (files, processes, streams)
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as readline from 'readline';
import { spawn, ChildProcess } from 'child_process';
import { Readable, Transform } from 'stream';

export type LogSource = 
  | { type: 'file'; path: string }
  | { type: 'process'; command: string; args?: string[] }
  | { type: 'stream'; stream: Readable }
  | { type: 'tail'; path: string; follow?: boolean }
  | { type: 'socket'; port: number; host?: string };

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

export class LogCapture extends EventEmitter {
  private config: CaptureConfig;
  private activeCaptures: Map<string, ChildProcess | fs.FSWatcher | readline.Interface>;
  private buffer: LogEntry[];
  private maxBufferSize: number;
  private isCapturing: boolean;

  constructor(config: CaptureConfig) {
    super();
    this.config = config;
    this.activeCaptures = new Map();
    this.buffer = [];
    this.maxBufferSize = config.options?.bufferSize || 10000;
    this.isCapturing = false;
  }

  async start(): Promise<void> {
    if (this.isCapturing) {
      throw new Error('Capture already in progress');
    }

    this.isCapturing = true;
    
    for (const source of this.config.sources) {
      await this.startSource(source);
    }

    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;

    for (const [id, capture] of this.activeCaptures) {
      await this.stopCapture(id, capture);
    }

    this.activeCaptures.clear();
    this.emit('stopped');
  }

  private async startSource(source: LogSource): Promise<void> {
    const sourceId = this.generateSourceId(source);

    switch (source.type) {
      case 'file':
        await this.captureFile(sourceId, source.path);
        break;
      case 'process':
        await this.captureProcess(sourceId, source.command, source.args);
        break;
      case 'stream':
        await this.captureStream(sourceId, source.stream);
        break;
      case 'tail':
        await this.captureTail(sourceId, source.path, source.follow);
        break;
      case 'socket':
        await this.captureSocket(sourceId, source.port, source.host);
        break;
    }
  }

  private async captureFile(sourceId: string, path: string): Promise<void> {
    const stream = fs.createReadStream(path, {
      encoding: this.config.options?.encoding || 'utf8',
    });

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      this.handleLogLine(sourceId, line);
    });

    rl.on('error', (error) => {
      this.emit('error', { source: sourceId, error });
      if (this.config.options?.retryOnError) {
        this.retryCapture(sourceId, () => this.captureFile(sourceId, path));
      }
    });

    this.activeCaptures.set(sourceId, rl);
  }

  private async captureProcess(
    sourceId: string,
    command: string,
    args?: string[]
  ): Promise<void> {
    const proc = spawn(command, args || [], {
      shell: true,
    });

    const handleStream = (stream: Readable, type: 'stdout' | 'stderr') => {
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        this.handleLogLine(sourceId, line, { stream: type });
      });
    };

    if (proc.stdout) handleStream(proc.stdout, 'stdout');
    if (proc.stderr) handleStream(proc.stderr, 'stderr');

    proc.on('error', (error) => {
      this.emit('error', { source: sourceId, error });
    });

    proc.on('exit', (code) => {
      this.emit('processExit', { source: sourceId, code });
    });

    this.activeCaptures.set(sourceId, proc);
  }

  private async captureStream(sourceId: string, stream: Readable): Promise<void> {
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      this.handleLogLine(sourceId, line);
    });

    rl.on('error', (error) => {
      this.emit('error', { source: sourceId, error });
    });

    this.activeCaptures.set(sourceId, rl);
  }

  private async captureTail(
    sourceId: string,
    path: string,
    follow: boolean = true
  ): Promise<void> {
    const args = ['-n', String(this.config.options?.tailLines || 100)];
    if (follow) args.push('-f');
    args.push(path);

    const tail = spawn('tail', args);

    const rl = readline.createInterface({
      input: tail.stdout,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      this.handleLogLine(sourceId, line);
    });

    tail.on('error', (error) => {
      this.emit('error', { source: sourceId, error });
    });

    this.activeCaptures.set(sourceId, tail);
  }

  private async captureSocket(
    sourceId: string,
    port: number,
    host: string = 'localhost'
  ): Promise<void> {
    const net = require('net');
    
    const server = net.createServer((socket: any) => {
      const rl = readline.createInterface({
        input: socket,
        crlfDelay: Infinity,
      });

      rl.on('line', (line: string) => {
        this.handleLogLine(sourceId, line, { 
          remoteAddress: socket.remoteAddress 
        });
      });

      socket.on('error', (error: Error) => {
        this.emit('error', { source: sourceId, error });
      });
    });

    server.listen(port, host, () => {
      this.emit('socketListening', { source: sourceId, port, host });
    });

    server.on('error', (error) => {
      this.emit('error', { source: sourceId, error });
    });

    this.activeCaptures.set(sourceId, server);
  }

  private handleLogLine(
    sourceId: string,
    line: string,
    metadata?: Record<string, any>
  ): void {
    if (this.shouldFilter(line)) {
      return;
    }

    const entry: LogEntry = {
      source: sourceId,
      timestamp: new Date(),
      content: line,
      metadata,
    };

    this.buffer.push(entry);
    
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    this.emit('log', entry);
  }

  private shouldFilter(line: string): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      return false;
    }

    return this.config.filters.some(filter => {
      try {
        const regex = new RegExp(filter);
        return !regex.test(line);
      } catch {
        return !line.includes(filter);
      }
    });
  }

  private async stopCapture(id: string, capture: any): Promise<void> {
    if ('close' in capture && typeof capture.close === 'function') {
      capture.close();
    } else if ('kill' in capture && typeof capture.kill === 'function') {
      capture.kill();
    } else if ('destroy' in capture && typeof capture.destroy === 'function') {
      capture.destroy();
    }
  }

  private generateSourceId(source: LogSource): string {
    const timestamp = Date.now();
    switch (source.type) {
      case 'file':
        return `file_${source.path}_${timestamp}`;
      case 'process':
        return `process_${source.command}_${timestamp}`;
      case 'stream':
        return `stream_${timestamp}`;
      case 'tail':
        return `tail_${source.path}_${timestamp}`;
      case 'socket':
        return `socket_${source.port}_${timestamp}`;
      default:
        return `unknown_${timestamp}`;
    }
  }

  private async retryCapture(
    sourceId: string,
    captureFunc: () => Promise<void>,
    retryCount: number = 0
  ): Promise<void> {
    const maxRetries = this.config.options?.maxRetries || 3;
    const retryDelay = this.config.options?.retryDelay || 1000;

    if (retryCount >= maxRetries) {
      this.emit('maxRetriesReached', { source: sourceId });
      return;
    }

    setTimeout(async () => {
      try {
        await captureFunc();
      } catch (error) {
        this.emit('retryError', { source: sourceId, error, retryCount });
        await this.retryCapture(sourceId, captureFunc, retryCount + 1);
      }
    }, retryDelay * Math.pow(2, retryCount));
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  getActiveCaptures(): string[] {
    return Array.from(this.activeCaptures.keys());
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  createTransformStream(): Transform {
    return new Transform({
      objectMode: true,
      transform(chunk: LogEntry, encoding, callback) {
        this.push(JSON.stringify(chunk) + '\n');
        callback();
      },
    });
  }
}

export default LogCapture;