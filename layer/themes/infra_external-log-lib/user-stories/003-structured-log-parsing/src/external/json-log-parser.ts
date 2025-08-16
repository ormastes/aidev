import { LogEntry } from '../../../001-basic-log-capture/src/external/external-log-lib';

export interface StructuredLogEntry extends LogEntry {
  metadata?: Record<string, any>;
}

export class JSONLogParser {
  private readonly standardFields = ['timestamp', 'level', 'message', 'source'];

  parseJSONLog(line: string, source: 'stdout' | 'stderr'): StructuredLogEntry {
    if (!line) {
      return this.createDefaultEntry('', source);
    }

    try {
      const parsed = JSON.parse(line);
      
      // If parsed value is not an object, treat as plain message
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return this.createDefaultEntry(line, source);
      }

      // Extract standard fields
      const timestamp = this.parseTimestamp(parsed.timestamp);
      const level = this.normalizeLevel(parsed.level, source);
      const message = parsed.message || '';
      
      // Extract metadata (all non-standard fields)
      const metadata = this.extractMetadata(parsed);

      return {
        timestamp,
        level,
        message,
        source,
        metadata
      };
    } catch (error) {
      // If JSON parsing fails, return as plain text
      return this.createDefaultEntry(line, source);
    }
  }

  isValidJSON(str: string): boolean {
    if (!str) return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  extractMetadata(logObject: Record<string, any>): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    Object.keys(logObject).forEach(key => {
      if (!this.standardFields.includes(key)) {
        metadata[key] = logObject[key];
      }
    });
    
    return metadata;
  }

  private createDefaultEntry(message: string, source: 'stdout' | 'stderr'): StructuredLogEntry {
    return {
      timestamp: new Date(),
      level: source === 'stderr' ? 'error' : 'info',
      message,
      source,
      metadata: {}
    };
  }

  private parseTimestamp(value: any): Date {
    if (!value) {
      return new Date();
    }

    // Handle various timestamp formats
    if (typeof value === 'number') {
      // Unix timestamp in seconds or milliseconds
      if (value < 10000000000) {
        return new Date(value * 1000); // Convert seconds to milliseconds
      }
      return new Date(value);
    }

    if (typeof value === 'string') {
      // Try to parse as number first (string Unix timestamp)
      const numValue = Number(value);
      if (!isNaN(numValue) && value.match(/^\d+$/)) {
        return this.parseTimestamp(numValue);
      }

      // Parse as date string
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Fallback to current time
    return new Date();
  }

  private normalizeLevel(level: any, source: 'stdout' | 'stderr'): LogEntry['level'] {
    if (!level) {
      return source === 'stderr' ? 'error' : 'info';
    }

    const levelStr = String(level).toUpperCase();
    
    const levelMap: Record<string, LogEntry['level']> = {
      'TRACE': 'debug',
      'DEBUG': 'debug',
      'INFO': 'info',
      'INFORMATION': 'info',
      'WARN': 'warn',
      'WARNING': 'warn',
      'ERROR': 'error',
      'CRITICAL': 'error',
      'FATAL': 'error'
    };

    return levelMap[levelStr] || (source === 'stderr' ? 'error' : 'info');
  }
}