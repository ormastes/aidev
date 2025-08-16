import { LogEntry } from '../../../001-basic-log-capture/src/external/external-log-lib';

export interface PythonLogParser {
  parsePythonLogLine(line: string, source: 'stdout' | 'stderr'): LogEntry;
  mapPythonLevel(pythonLevel: string): LogEntry['level'];
}

export class PythonLogParserImpl implements PythonLogParser {
  parsePythonLogLine(line: string, source: 'stdout' | 'stderr'): LogEntry {
    // Try Python logging module format: "2025-01-15 10:30:45,123 - logger.name - LEVEL - message"
    // Also handle format without milliseconds: "2025-01-15 10:30:45 - logger.name - LEVEL - message"
    const pythonLoggingMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:,\d{3})?)\s*-\s*([^\s]+)\s*-\s*(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s*-\s*(.*)$/);
    
    if (pythonLoggingMatch) {
      let timestamp = pythonLoggingMatch[1];
      // Handle comma separator for milliseconds
      if (timestamp.includes(',')) {
        timestamp = timestamp.replace(',', '.');
      }
      // Convert to ISO format
      const isoTimestamp = timestamp.replace(' ', 'T') + (timestamp.includes('.') ? 'Z' : '.000Z');
      
      return {
        timestamp: new Date(isoTimestamp),
        level: this.mapPythonLevel(pythonLoggingMatch[3]),
        message: pythonLoggingMatch[4],
        source
      };
    }

    // Try simpler Python format: "LEVEL: message" or "LEVEL - message"
    const simplePythonMatch = line.match(/^(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s*[-:]?\s*(.*)$/);
    
    if (simplePythonMatch) {
      return {
        timestamp: new Date(),
        level: this.mapPythonLevel(simplePythonMatch[1]),
        message: simplePythonMatch[2],
        source
      };
    }

    // Try to detect Python tracebacks
    if (line.includes('Traceback (most recent call last):') || 
        line.match(/^\s*File "[^"]+", line \d+/) ||
        line.match(/^[A-Za-z]+Error: /)) {
      return {
        timestamp: new Date(),
        level: 'error',
        message: line,
        source
      };
    }

    // Try JSON-like format from Python
    if (line.startsWith('{') && line.includes('"level"')) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.level && parsed.message) {
          return {
            timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
            level: this.mapPythonLevel(parsed.level),
            message: parsed.message,
            source
          };
        }
      } catch {
        // Not valid JSON, fall through
      }
    }

    // Default based on source
    return {
      timestamp: new Date(),
      level: source === 'stderr' ? 'error' : 'info',
      message: line,
      source
    };
  }

  mapPythonLevel(pythonLevel: string): LogEntry['level'] {
    const levelMap: Record<string, LogEntry['level']> = {
      'DEBUG': 'debug',
      'INFO': 'info',
      'WARNING': 'warn',
      'WARN': 'warn',
      'ERROR': 'error',
      'CRITICAL': 'error',
      'FATAL': 'error'
    };

    return levelMap[pythonLevel.toUpperCase()] || 'info';
  }
}

// Export singleton instance
export const pythonLogParser = new PythonLogParserImpl();