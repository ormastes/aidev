import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { LogEntry } from '../../../004-real-time-streaming/src/domain/log-entry';
import { LogFilter } from '../external/log-filter';

/**
 * Enhanced LogStream that integrates with LogFilter for advanced filtering capabilities
 * 
 * This enhanced version replaces the basic filtering in the original LogStream
 * with the more robust LogFilter component that handles edge cases and provides
 * better performance.
 */
export class EnhancedLogStream extends EventEmitter {
  private stdout: Readable;
  private stderr: Readable;
  private recentLogs: LogEntry[] = [];
  private logFilter: LogFilter;
  private buffer: string = '';
  private readonly maxRecentLogs = 50;

  constructor(stdout: Readable, stderr: Readable) {
    super();
    this.stdout = stdout;
    this.stderr = stderr;
    this.logFilter = new LogFilter();
    this.setupStreamListeners();
  }

  setLogLevelFilter(levels: string[]): void {
    this.logFilter.configure(levels);
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

        // Use enhanced LogFilter for filtering
        if (this.shouldEmitLogEntry(logEntry)) {
          this.emit('log-entry', logEntry);
        }
      }
    }
  }

  private parseLogLine(line: string, source: 'stdout' | 'stderr'): LogEntry {
    const timestamp = new Date();
    
    // Enhanced log level detection using regex patterns
    let level = this.detectLogLevel(line, source);

    return {
      timestamp,
      level,
      message: line,
      source,
      processId: '' // Will be set by LogMonitor
    };
  }

  private detectLogLevel(line: string, source: 'stdout' | 'stderr'): string {
    // Enhanced level detection with regex patterns
    const levelPatterns = [
      { pattern: /\[(ERROR|ERR)\]/i, level: 'error' },
      { pattern: /\[(WARN|WARNING)\]/i, level: 'warn' },
      { pattern: /\[(INFO|INFORMATION)\]/i, level: 'info' },
      { pattern: /\[(DEBUG|DBG)\]/i, level: 'debug' },
      { pattern: /\[(TRACE|TRC)\]/i, level: 'trace' },
      { pattern: /\[(FATAL|CRITICAL)\]/i, level: 'fatal' }
    ];

    // Check for explicit level patterns first
    for (const { pattern, level } of levelPatterns) {
      if (pattern.test(line)) {
        return level;
      }
    }

    // Fallback to content-based detection
    const lowerLine = line.toLowerCase();
    if (source === 'stderr' || lowerLine.includes('error') || lowerLine.includes('exception')) {
      return 'error';
    } else if (lowerLine.includes('warn')) {
      return 'warn';
    } else if (lowerLine.includes('debug')) {
      return 'debug';
    }

    // Default level
    return 'info';
  }

  private shouldEmitLogEntry(entry: LogEntry): boolean {
    // Use the advanced LogFilter for filtering decisions
    return this.logFilter.filterLog(entry.level, entry.message);
  }

  private addToRecentLogs(entry: LogEntry): void {
    this.recentLogs.push(entry);
    
    // Keep only the most recent logs
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs.shift();
    }
  }

  /**
   * Get the current filter configuration
   * @returns Array of configured log levels
   */
  getFilterConfiguration(): string[] {
    return this.logFilter.getConfiguredLevels();
  }

  /**
   * Check if filtering is currently active
   * @returns true if filter is configured with specific levels
   */
  isFilterActive(): boolean {
    return this.logFilter.isFilterConfigured();
  }

  /**
   * Clear the current filter (allow all logs)
   */
  clearFilter(): void {
    this.logFilter.clearFilter();
  }
}