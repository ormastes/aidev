import { JSONLogParser, StructuredLogEntry } from './json-log-parser';
import { KeyValueLogParser } from './keyvalue-log-parser';
import { LogSchemaValidator, LogSchema } from './schema-validator';

export type LogFormat = 'json' | "keyvalue" | 'auto';

export interface StructuredLogParserConfig {
  format?: LogFormat;
  schema?: LogSchema;
  validateSchema?: boolean;
}

export class StructuredLogParser {
  private jsonParser: JSONLogParser;
  private keyValueParser: KeyValueLogParser;
  private validator: LogSchemaValidator;
  private config: StructuredLogParserConfig;

  constructor(config: StructuredLogParserConfig = {}) {
    this.jsonParser = new JSONLogParser();
    this.keyValueParser = new KeyValueLogParser();
    this.validator = new LogSchemaValidator();
    this.config = {
      format: 'auto',
      validateSchema: false,
      ...config
    };

    if (this.config.schema) {
      this.validator.defineSchema(this.config.schema);
    }
  }

  parseLogLine(line: string, source: 'stdout' | 'stderr'): StructuredLogEntry {
    if (!line || !line.trim()) {
      return this.createDefaultEntry('', source);
    }

    let result: StructuredLogEntry;

    switch (this.config.format) {
      case 'json':
        result = this.jsonParser.parseJSONLog(line, source);
        break;
      case "keyvalue":
        result = this.keyValueParser.parseKeyValueLog(line, source);
        break;
      case 'auto':
      default:
        result = this.detectAndParse(line, source);
        break;
    }

    // Apply schema validation if enabled
    if (this.config.validateSchema && this.config.schema) {
      const validation = this.validator.validate(result);
      if (!validation.valid) {
        return this.validator.createValidationError(result);
      }
    }

    return result;
  }

  parseMultipleLines(lines: string[], source: 'stdout' | 'stderr'): StructuredLogEntry[] {
    return lines.map(line => this.parseLogLine(line, source));
  }

  formatLogEntry(entry: StructuredLogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const metadata = Object.keys(entry.metadata || {}).length > 0 
      ? ` ${JSON.stringify(entry.metadata)}` 
      : '';
    return `[${timestamp}] ${level} ${entry.message}${metadata}`;
  }

  queryLogs(entries: StructuredLogEntry[], options: {
    level?: string;
    startTime?: Date;
    endTime?: Date;
    search?: string;
  }): StructuredLogEntry[] {
    let filtered = entries;

    if (options.level) {
      filtered = filtered.filter(e => e.level === options.level);
    }

    if (options.startTime) {
      filtered = filtered.filter(e => e.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      filtered = filtered.filter(e => e.timestamp <= options.endTime!);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(e.metadata).toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  private detectAndParse(line: string, source: 'stdout' | 'stderr'): StructuredLogEntry {
    // Try JSON first
    if (this.jsonParser.isValidJSON(line)) {
      return this.jsonParser.parseJSONLog(line, source);
    }

    // Try key-value format
    if (this.keyValueParser.isKeyValueFormat(line)) {
      return this.keyValueParser.parseKeyValueLog(line, source);
    }

    // Fall back to plain text
    return this.createDefaultEntry(line, source);
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

  // Utility methods for querying metadata
  filterByMetadata(logs: StructuredLogEntry[], key: string, value: any): StructuredLogEntry[] {
    return logs.filter(log => 
      log.metadata && log.metadata[key] === value
    );
  }

  extractMetadataField(logs: StructuredLogEntry[], field: string): any[] {
    return logs
      .map(log => log.metadata?.[field])
      .filter(value => value !== undefined);
  }

  groupByMetadata(logs: StructuredLogEntry[], field: string): Record<string, StructuredLogEntry[]> {
    const groups: Record<string, StructuredLogEntry[]> = {};
    
    logs.forEach(log => {
      const value = log.metadata?.[field];
      if (value !== undefined) {
        const key = String(value);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(log);
      }
    });
    
    return groups;
  }

  getStatistics(logs: StructuredLogEntry[]): {
    total: number;
    byLevel: Record<string, number>;
    withMetadata: number;
    uniqueMetadataKeys: string[];
  } {
    const stats = {
      total: logs.length,
      byLevel: {} as Record<string, number>,
      withMetadata: 0,
      uniqueMetadataKeys: [] as string[]
    };

    const metadataKeys = new Set<string>();

    logs.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

      // Count logs with metadata
      if (log.metadata && Object.keys(log.metadata).length > 0) {
        stats.withMetadata++;
        Object.keys(log.metadata).forEach(key => metadataKeys.add(key));
      }
    });

    stats.uniqueMetadataKeys = Array.from(metadataKeys).sort();

    return stats;
  }
}