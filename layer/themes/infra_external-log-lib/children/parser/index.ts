/**
 * Log Parser Module
 * Parses and structures various log formats
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogFormat = 
  | 'json'
  | 'plain'
  | "structured"
  | 'syslog'
  | 'apache'
  | 'nginx'
  | 'python'
  | 'java'
  | 'custom';

export interface StructuredData {
  [key: string]: string | number | boolean | StructuredData | StructuredData[];
}

export interface ParsedLog {
  timestamp?: Date;
  level?: LogLevel;
  message: string;
  source?: string;
  category?: string;
  fields?: StructuredData;
  raw: string;
  format: LogFormat;
  metadata?: Record<string, any>;
}

export interface ParserConfig {
  format: LogFormat;
  customPattern?: RegExp;
  timestampFormat?: string;
  levelMapping?: Record<string, LogLevel>;
  fieldExtractors?: Array<{
    pattern: RegExp;
    fields: string[];
  }>;
  multiline?: {
    startPattern: RegExp;
    endPattern?: RegExp;
  };
}

export class LogParser {
  private config: ParserConfig;
  private multilineBuffer: string[] = [];
  private isMultiline: boolean = false;

  // Common log patterns
  private static readonly PATTERNS = {
    json: /^{.*}$/,
    syslog: /^(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+(\S+)(?:\[(\d+)\])?:\s+(.*)$/,
    apache: /^(\S+)\s+\S+\s+(\S+)\s+\[([\w:/]+\s[+\-]\d{4})\]\s+"(.+?)"\s+(\d{3})\s+(\d+|-)/,
    nginx: /^(\S+)\s+-\s+(\S+)\s+\[([\w:/]+\s[+\-]\d{4})\]\s+"(.+?)"\s+(\d{3})\s+(\d+)\s+"(.+?)"\s+"(.+?)"/,
    python: /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+-\s+(\w+)\s+-\s+(.*)$/,
    java: /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\w+)\s+\[([^\]]+)\]\s+(\S+)\s+-\s+(.*)$/,
  };

  // Level mappings
  private static readonly LEVEL_MAPS: Record<string, Record<string, LogLevel>> = {
    default: {
      TRACE: 'trace',
      DEBUG: 'debug',
      INFO: 'info',
      WARN: 'warn',
      WARNING: 'warn',
      ERROR: 'error',
      FATAL: 'fatal',
      CRITICAL: 'fatal',
    },
    numeric: {
      '0': 'trace',
      '1': 'debug',
      '2': 'info',
      '3': 'warn',
      '4': 'error',
      '5': 'fatal',
    },
  };

  constructor(config: ParserConfig) {
    this.config = config;
  }

  parse(line: string): ParsedLog | null {
    // Handle multiline logs
    if (this.config.multiline) {
      const result = this.handleMultiline(line);
      if (!result) return null;
      line = result;
    }

    // Parse based on format
    switch (this.config.format) {
      case 'json':
        return this.parseJSON(line);
      case 'syslog':
        return this.parseSyslog(line);
      case 'apache':
        return this.parseApache(line);
      case 'nginx':
        return this.parseNginx(line);
      case 'python':
        return this.parsePython(line);
      case 'java':
        return this.parseJava(line);
      case "structured":
        return this.parseStructured(line);
      case 'custom':
        return this.parseCustom(line);
      default:
        return this.parsePlain(line);
    }
  }

  private handleMultiline(line: string): string | null {
    const { startPattern, endPattern } = this.config.multiline!;

    if (startPattern.test(line)) {
      if (this.isMultiline && this.multilineBuffer.length > 0) {
        // New multiline log starts, return previous buffer
        const result = this.multilineBuffer.join('\n');
        this.multilineBuffer = [line];
        return result;
      }
      this.isMultiline = true;
      this.multilineBuffer = [line];
      return null;
    }

    if (this.isMultiline) {
      this.multilineBuffer.push(line);
      
      if (endPattern && endPattern.test(line)) {
        const result = this.multilineBuffer.join('\n');
        this.multilineBuffer = [];
        this.isMultiline = false;
        return result;
      }
      
      return null;
    }

    return line;
  }

  private parseJSON(line: string): ParsedLog | null {
    try {
      const data = JSON.parse(line);
      
      return {
        timestamp: this.extractTimestamp(data),
        level: this.extractLevel(data),
        message: data.message || data.msg || JSON.stringify(data),
        source: data.source || data.logger,
        category: data.category || data.module,
        fields: this.extractFields(data),
        raw: line,
        format: 'json',
        metadata: data.metadata,
      };
    } catch (error) {
      return this.parsePlain(line);
    }
  }

  private parseSyslog(line: string): ParsedLog | null {
    const match = line.match(LogParser.PATTERNS.syslog);
    if (!match) return this.parsePlain(line);

    const [, timestamp, host, program, pid, message] = match;
    
    return {
      timestamp: this.parseTimestamp(timestamp),
      message,
      source: program,
      fields: {
        host,
        pid: pid ? parseInt(pid, 10) : undefined,
      },
      raw: line,
      format: 'syslog',
    };
  }

  private parseApache(line: string): ParsedLog | null {
    const match = line.match(LogParser.PATTERNS.apache);
    if (!match) return this.parsePlain(line);

    const [, ip, user, timestamp, request, status, size] = match;
    
    return {
      timestamp: this.parseTimestamp(timestamp),
      level: this.getLogLevelFromStatus(parseInt(status, 10)),
      message: request,
      fields: {
        ip,
        user,
        status: parseInt(status, 10),
        size: size === '-' ? 0 : parseInt(size, 10),
      },
      raw: line,
      format: 'apache',
    };
  }

  private parseNginx(line: string): ParsedLog | null {
    const match = line.match(LogParser.PATTERNS.nginx);
    if (!match) return this.parsePlain(line);

    const [, ip, user, timestamp, request, status, size, referer, userAgent] = match;
    
    return {
      timestamp: this.parseTimestamp(timestamp),
      level: this.getLogLevelFromStatus(parseInt(status, 10)),
      message: request,
      fields: {
        ip,
        user,
        status: parseInt(status, 10),
        size: parseInt(size, 10),
        referer,
        userAgent,
      },
      raw: line,
      format: 'nginx',
    };
  }

  private parsePython(line: string): ParsedLog | null {
    const match = line.match(LogParser.PATTERNS.python);
    if (!match) return this.parsePlain(line);

    const [, timestamp, level, message] = match;
    
    return {
      timestamp: this.parseTimestamp(timestamp),
      level: this.normalizeLevel(level),
      message,
      raw: line,
      format: 'python',
    };
  }

  private parseJava(line: string): ParsedLog | null {
    const match = line.match(LogParser.PATTERNS.java);
    if (!match) return this.parsePlain(line);

    const [, timestamp, level, thread, logger, message] = match;
    
    return {
      timestamp: this.parseTimestamp(timestamp),
      level: this.normalizeLevel(level),
      message,
      source: logger,
      fields: {
        thread,
      },
      raw: line,
      format: 'java',
    };
  }

  private parseStructured(line: string): ParsedLog {
    const fields: StructuredData = {};
    const parts = line.split(/\s+/);
    
    let message = '';
    for (const part of parts) {
      const kvMatch = part.match(/^(\w+)=(.+)$/);
      if (kvMatch) {
        const [, key, value] = kvMatch;
        fields[key] = this.parseValue(value);
      } else {
        message += (message ? ' ' : '') + part;
      }
    }

    return {
      message: message || line,
      fields,
      raw: line,
      format: "structured",
    };
  }

  private parseCustom(line: string): ParsedLog | null {
    if (!this.config.customPattern) {
      return this.parsePlain(line);
    }

    const match = line.match(this.config.customPattern);
    if (!match) return this.parsePlain(line);

    const fields: StructuredData = {};
    
    if (this.config.fieldExtractors) {
      for (const extractor of this.config.fieldExtractors) {
        const fieldMatch = line.match(extractor.pattern);
        if (fieldMatch) {
          extractor.fields.forEach((field, index) => {
            if (fieldMatch[index + 1]) {
              fields[field] = this.parseValue(fieldMatch[index + 1]);
            }
          });
        }
      }
    }

    return {
      message: match[0],
      fields,
      raw: line,
      format: 'custom',
    };
  }

  private parsePlain(line: string): ParsedLog {
    // Try to extract common patterns
    const levelMatch = line.match(/\b(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\b/i);
    const timestampMatch = line.match(/\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/);

    return {
      timestamp: timestampMatch ? this.parseTimestamp(timestampMatch[0]) : undefined,
      level: levelMatch ? this.normalizeLevel(levelMatch[1]) : undefined,
      message: line,
      raw: line,
      format: 'plain',
    };
  }

  private extractTimestamp(data: any): Date | undefined {
    const fields = ["timestamp", 'time', '@timestamp', 'date', "datetime"];
    
    for (const field of fields) {
      if (data[field]) {
        return this.parseTimestamp(data[field]);
      }
    }
    
    return undefined;
  }

  private extractLevel(data: any): LogLevel | undefined {
    const fields = ['level', "severity", "priority"];
    
    for (const field of fields) {
      if (data[field]) {
        return this.normalizeLevel(data[field]);
      }
    }
    
    return undefined;
  }

  private extractFields(data: any): StructuredData {
    const excludeFields = ["timestamp", 'time', '@timestamp', 'level', "severity", 
                          'message', 'msg', 'source', 'logger', "category", 'module'];
    
    const fields: StructuredData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (!excludeFields.includes(key)) {
        fields[key] = value as any;
      }
    }
    
    return fields;
  }

  private parseTimestamp(timestamp: string): Date {
    // Try multiple timestamp formats
    const date = new Date(timestamp);
    
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try Unix timestamp
    const unixTimestamp = parseInt(timestamp, 10);
    if (!isNaN(unixTimestamp)) {
      return new Date(unixTimestamp * (timestamp.length <= 10 ? 1000 : 1));
    }
    
    return new Date();
  }

  private normalizeLevel(level: string): LogLevel {
    const upperLevel = level.toUpperCase();
    
    // Check custom mapping
    if (this.config.levelMapping && this.config.levelMapping[upperLevel]) {
      return this.config.levelMapping[upperLevel];
    }
    
    // Check default mapping
    if (LogParser.LEVEL_MAPS.default[upperLevel]) {
      return LogParser.LEVEL_MAPS.default[upperLevel];
    }
    
    // Check numeric mapping
    if (LogParser.LEVEL_MAPS.numeric[level]) {
      return LogParser.LEVEL_MAPS.numeric[level];
    }
    
    return 'info';
  }

  private getLogLevelFromStatus(status: number): LogLevel {
    if (status >= 500) return 'error';
    if (status >= 400) return 'warn';
    if (status >= 300) return 'info';
    return 'debug';
  }

  private parseValue(value: string): string | number | boolean {
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    return value;
  }

  reset(): void {
    this.multilineBuffer = [];
    this.isMultiline = false;
  }
}

export default LogParser;