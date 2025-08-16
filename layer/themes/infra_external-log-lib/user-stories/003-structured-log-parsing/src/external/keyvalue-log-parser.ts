import { StructuredLogEntry } from './json-log-parser';

export class KeyValueLogParser {
  private readonly standardFields = ["timestamp", 'level', 'message', 'source'];
  
  parseKeyValueLog(line: string, source: 'stdout' | 'stderr'): StructuredLogEntry {
    if (!line || !line.trim()) {
      return this.createDefaultEntry('', source);
    }

    const pairs = this.extractKeyValuePairs(line);
    
    // Extract standard fields
    const timestamp = this.parseTimestamp(pairs.timestamp);
    const level = this.normalizeLevel(pairs.level, source);
    const message = pairs.message || '';
    
    // Remove standard fields from pairs to get metadata
    const metadata: Record<string, any> = {};
    Object.keys(pairs).forEach(key => {
      if (!this.standardFields.includes(key)) {
        metadata[key] = pairs[key];
      }
    });

    return {
      timestamp,
      level,
      message,
      source,
      metadata
    };
  }

  isKeyValueFormat(line: string): boolean {
    if (!line || !line.trim()) return false;
    
    // Check if line contains at least one key=value pair
    const kvPattern = /\w+=[^\s]+/;
    return kvPattern.test(line);
  }

  parseValue(value: string): any {
    if (!value) return '';
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    
    // Check for boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Check for null
    if (value.toLowerCase() === 'null') return null;
    
    // Check for number
    if (/^-?\d+$/.test(value)) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) return num;
    }
    
    if (/^-?\d+\.?\d*$/.test(value)) {
      const num = parseFloat(value);
      if (!isNaN(num)) return num;
    }
    
    // Return as string
    return value;
  }

  private extractKeyValuePairs(line: string): Record<string, any> {
    const pairs: Record<string, any> = {};
    
    // Regex to match key=value pairs, handling quoted values and empty values
    const regex = /([a-zA-Z0-9._@-]+)=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s]*)/g;
    
    let match;
    while ((match = regex.exec(line)) !== null) {
      const key = match[1];
      const value = match[2];
      pairs[key] = this.parseValue(value);
    }
    
    return pairs;
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

    // If already parsed as number by parseValue
    if (typeof value === 'number') {
      // Unix timestamp in seconds or milliseconds
      if (value < 10000000000) {
        return new Date(value * 1000); // Convert seconds to milliseconds
      }
      return new Date(value);
    }

    if (typeof value === 'string') {
      // Try to parse as date string
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Fallback to current time
    return new Date();
  }

  private normalizeLevel(level: any, source: 'stdout' | 'stderr'): StructuredLogEntry['level'] {
    if (!level) {
      return source === 'stderr' ? 'error' : 'info';
    }

    const levelStr = String(level).toLowerCase();
    
    switch (levelStr) {
      case 'debug':
      case 'trace':
        return 'debug';
      case 'info':
      case "information":
        return 'info';
      case 'warn':
      case 'warning':
        return 'warn';
      case 'error':
      case "critical":
      case 'fatal':
        return 'error';
      default:
        return source === 'stderr' ? 'error' : 'info';
    }
  }
}