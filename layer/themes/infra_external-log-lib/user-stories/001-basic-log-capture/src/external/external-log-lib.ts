import { ChildProcess } from 'child_process';

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'stdout' | 'stderr';
}

export interface LogCapturer {
  start(): void;
  stop(): void;
  getEntries(): LogEntry[];
  clear(): void;
  onLog(callback: (entry: LogEntry) => void): void;
}

export interface ExternalLogLib {
  createCapturer(process: ChildProcess): LogCapturer;
  parseLogLine(line: string, source: 'stdout' | 'stderr'): LogEntry;
}

class LogCapturerImpl implements LogCapturer {
  private entries: LogEntry[] = [];
  private callbacks: ((entry: LogEntry) => void)[] = [];
  private isCapturing = false;
  private stdoutListener?: (data: Buffer) => void;
  private stderrListener?: (data: Buffer) => void;

  constructor(
    private process: ChildProcess,
    private parseLogLine: (line: string, source: 'stdout' | 'stderr') => LogEntry
  ) {}

  start(): void {
    if (this.isCapturing) return;
    
    this.isCapturing = true;

    this.stdoutListener = (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const entry = this.parseLogLine(line, 'stdout');
        this.addEntry(entry);
      });
    };

    this.stderrListener = (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const entry = this.parseLogLine(line, 'stderr');
        this.addEntry(entry);
      });
    };

    if (this.process.stdout) {
      this.process.stdout.on('data', this.stdoutListener);
    }
    
    if (this.process.stderr) {
      this.process.stderr.on('data', this.stderrListener);
    }
  }

  stop(): void {
    if (!this.isCapturing) return;
    
    this.isCapturing = false;

    if (this.process.stdout && this.stdoutListener) {
      this.process.stdout.removeListener('data', this.stdoutListener);
    }
    
    if (this.process.stderr && this.stderrListener) {
      this.process.stderr.removeListener('data', this.stderrListener);
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }

  onLog(callback: (entry: LogEntry) => void): void {
    this.callbacks.push(callback);
  }

  private addEntry(entry: LogEntry): void {
    this.entries.push(entry);
    this.callbacks.forEach(cb => cb(entry));
  }
}

export class ExternalLogLibImpl implements ExternalLogLib {
  createCapturer(process: ChildProcess): LogCapturer {
    return new LogCapturerImpl(process, this.parseLogLine.bind(this));
  }

  parseLogLine(line: string, source: 'stdout' | 'stderr'): LogEntry {
    // Try to parse structured log format
    const structuredMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s*\[(DEBUG|INFO|WARN|ERROR)\]\s*(.*)$/);
    
    if (structuredMatch) {
      return {
        timestamp: new Date(structuredMatch[1]),
        level: structuredMatch[2].toLowerCase() as LogEntry['level'],
        message: structuredMatch[3],
        source
      };
    }

    // Try simple format with just level
    const simpleMatch = line.match(/^\[(DEBUG|INFO|WARN|ERROR)\]\s*(.*)$/);
    
    if (simpleMatch) {
      return {
        timestamp: new Date(),
        level: simpleMatch[1].toLowerCase() as LogEntry['level'],
        message: simpleMatch[2],
        source
      };
    }

    // Default to info level for unstructured logs
    return {
      timestamp: new Date(),
      level: source === 'stderr' ? 'error' : 'info',
      message: line,
      source
    };
  }
}

// Export singleton instance
export const externalLogLib = new ExternalLogLibImpl();