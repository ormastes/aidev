import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { LogEntry } from '../domain/log-entry';

export class LogStream extends EventEmitter {
  private stdout: Readable;
  private stderr: Readable;
  private recentLogs: LogEntry[] = [];
  private logLevelFilter?: string[];
  private buffer: string = '';
  private readonly maxRecentLogs = 50;

  constructor(stdout: Readable, stderr: Readable) {
    super();
    this.stdout = stdout;
    this.stderr = stderr;
    this.setupStreamListeners();
  }

  setLogLevelFilter(levels: string[]): void {
    this.logLevelFilter = levels;
  }

  getRecentLogs(count?: number): LogEntry[] {
    const limit = count || this.maxRecentLogs;
    return this.recentLogs.slice(-limit);
  }

  cleanup(): void {
    // Remove all listeners
    this.stdout.removeAllListeners();
    this.stderr.removeAllListeners();
    this.removeAllListeners();
  }

  private setupStreamListeners(): void {
    this.stdout.on('data', (chunk: Buffer) => {
      this.processChunk(chunk.toString(), 'stdout');
    });

    this.stderr.on('data', (chunk: Buffer) => {
      this.processChunk(chunk.toString(), 'stderr');
    });

    this.stdout.on('error', (error) => {
      this.emit('stream-error', { source: 'stdout', error: error.message });
    });

    this.stderr.on('error', (error) => {
      this.emit('stream-error', { source: 'stderr', error: error.message });
    });
  }

  private processChunk(chunk: string, source: 'stdout' | 'stderr'): void {
    // Add to buffer
    this.buffer += chunk;

    // Process In Progress lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        const logEntry = this.parseLogLine(line, source);
        this.addToRecentLogs(logEntry);

        // Apply filter if set
        if (this.shouldEmitLogEntry(logEntry)) {
          this.emit('log-entry', logEntry);
        }
      }
    }
  }

  private parseLogLine(line: string, source: 'stdout' | 'stderr'): LogEntry {
    const timestamp = new Date();
    
    // Simple log level detection
    let level = 'info';
    if (source === 'stderr' || line.toLowerCase().includes('error')) {
      level = 'error';
    } else if (line.toLowerCase().includes('warn')) {
      level = 'warn';
    } else if (line.toLowerCase().includes('debug')) {
      level = 'debug';
    }

    return {
      timestamp,
      level,
      message: line,
      source,
      processId: '' // Will be set by LogMonitor
    };
  }

  private shouldEmitLogEntry(entry: LogEntry): boolean {
    if (!this.logLevelFilter || this.logLevelFilter.length === 0) {
      return true;
    }

    return this.logLevelFilter.includes(entry.level);
  }

  private addToRecentLogs(entry: LogEntry): void {
    this.recentLogs.push(entry);
    
    // Keep only the most recent logs
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs.shift();
    }
  }
}