import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

interface StructuredLogParser {
  parseJsonLog(line: string): LogEntry | null;
  parseSyslog(line: string): LogEntry | null;
  parseCustomFormat(line: string, format: string): LogEntry | null;
  extractMetadata(message: string): Record<string, any>;
}

test.describe('Structured Log Parsing System Tests', () => {
  let tempDir: string;
  let parser: StructuredLogParser;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `parse-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Mock implementation of structured log parser
    parser = {
      parseJsonLog: (line: string): LogEntry | null => {
        try {
          const parsed = JSON.parse(line);
          return {
            timestamp: parsed.timestamp || new Date().toISOString(),
            level: parsed.level || 'INFO',
            message: parsed.message || '',
            metadata: parsed.metadata || {}
          };
        } catch {
          return null;
        }
      },

      parseSyslog: (line: string): LogEntry | null => {
        // Parse syslog format: <priority>timestamp hostname tag: message
        const syslogRegex = /^<(\d+)>(\S+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+(\S+):\s*(.*)$/;
        const match = line.match(syslogRegex);
        
        if (!match) return null;

        return {
          timestamp: match[2],
          level: this.priorityToLevel(parseInt(match[1])),
          message: match[5],
          metadata: {
            hostname: match[3],
            tag: match[4],
            priority: parseInt(match[1])
          }
        };
      },

      parseCustomFormat: (line: string, format: string): LogEntry | null => {
        // Simple custom format parser for demonstration
        if (format === 'timestamp|level|component|message') {
          const parts = line.split('|');
          if (parts.length >= 4) {
            return {
              timestamp: parts[0],
              level: parts[1],
              message: parts.slice(3).join('|'),
              metadata: { component: parts[2] }
            };
          }
        }
        return null;
      },

      extractMetadata: (message: string): Record<string, any> => {
        const metadata: Record<string, any> = {};
        
        // Extract key=value pairs
        const keyValueRegex = /(\w+)=([^\s]+)/g;
        let match;
        while ((match = keyValueRegex.exec(message)) !== null) {
          metadata[match[1]] = match[2];
        }

        // Extract JSON objects
        const jsonRegex = /\{[^}]+\}/g;
        const jsonMatches = message.match(jsonRegex);
        if (jsonMatches) {
          jsonMatches.forEach((jsonStr, index) => {
            try {
              metadata[`json_${index}`] = JSON.parse(jsonStr);
            } catch {
              // Ignore invalid JSON
            }
          });
        }

        return metadata;
      },

      priorityToLevel: (priority: number): string => {
        const level = priority & 7; // Extract severity level
        const levels = ['EMERG', 'ALERT', 'CRIT', 'ERROR', 'WARN', 'NOTICE', 'INFO', 'DEBUG'];
        return levels[level] || 'INFO';
      }
    };
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should parse JSON structured logs correctly', async () => {
    const jsonLogs = [
      '{"timestamp":"2025-08-28T10:00:00Z","level":"INFO","message":"User login successful","metadata":{"userId":12345,"ip":"192.168.1.1"}}',
      '{"timestamp":"2025-08-28T10:01:00Z","level":"ERROR","message":"Database connection failed","metadata":{"database":"postgres","retries":3}}',
      '{"timestamp":"2025-08-28T10:02:00Z","level":"WARN","message":"High memory usage","metadata":{"memory":"85%","threshold":"80%"}}'
    ];

    const logFile = path.join(tempDir, 'json_logs.log');
    await fs.writeFile(logFile, jsonLogs.join('\n'));

    const content = await fs.readFile(logFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const parsedLogs = lines.map(line => parser.parseJsonLog(line)).filter(Boolean);

    expect(parsedLogs).toHaveLength(3);
    expect(parsedLogs[0]).toMatchObject({
      level: 'INFO',
      message: 'User login successful',
      metadata: { userId: 12345, ip: '192.168.1.1' }
    });
    expect(parsedLogs[1]).toMatchObject({
      level: 'ERROR',
      message: 'Database connection failed'
    });
    expect(parsedLogs[2]).toMatchObject({
      level: 'WARN',
      message: 'High memory usage'
    });
  });

  test('should parse syslog format correctly', async () => {
    const syslogEntries = [
      '<34>Aug 28 10:00:00 webserver nginx: GET /api/users - 200',
      '<35>Aug 28 10:01:00 dbserver postgres: Connection established',
      '<131>Aug 28 10:02:00 appserver myapp: Processing request id=abc123'
    ];

    const logFile = path.join(tempDir, 'syslog.log');
    await fs.writeFile(logFile, syslogEntries.join('\n'));

    const content = await fs.readFile(logFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const parsedLogs = lines.map(line => parser.parseSyslog(line)).filter(Boolean);

    expect(parsedLogs).toHaveLength(3);
    expect(parsedLogs[0]).toMatchObject({
      level: 'CRIT',
      message: 'GET /api/users - 200',
      metadata: {
        hostname: 'webserver',
        tag: 'nginx',
        priority: 34
      }
    });
  });

  test('should parse custom log formats', async () => {
    const customLogs = [
      '2025-08-28T10:00:00Z|INFO|auth|User authentication successful',
      '2025-08-28T10:01:00Z|ERROR|database|Connection timeout after 30s',
      '2025-08-28T10:02:00Z|DEBUG|cache|Cache hit for key user:123'
    ];

    const format = 'timestamp|level|component|message';
    const parsedLogs = customLogs
      .map(line => parser.parseCustomFormat(line, format))
      .filter(Boolean);

    expect(parsedLogs).toHaveLength(3);
    expect(parsedLogs[0]).toMatchObject({
      timestamp: '2025-08-28T10:00:00Z',
      level: 'INFO',
      message: 'User authentication successful',
      metadata: { component: 'auth' }
    });
    expect(parsedLogs[1]).toMatchObject({
      level: 'ERROR',
      metadata: { component: 'database' }
    });
  });

  test('should extract metadata from log messages', async () => {
    const messages = [
      'Request processed successfully duration=150ms status=200 userId=12345',
      'Memory usage alert {"current": "85%", "threshold": "80%", "available": "2GB"}',
      'Database query executed table=users operation=SELECT rows=1500 time=45ms'
    ];

    const extractedMetadata = messages.map(msg => parser.extractMetadata(msg));

    // Test key=value extraction
    expect(extractedMetadata[0]).toMatchObject({
      duration: '150ms',
      status: '200',
      userId: '12345'
    });

    // Test JSON extraction
    expect(extractedMetadata[1]).toHaveProperty('json_0');
    expect(extractedMetadata[1].json_0).toMatchObject({
      current: '85%',
      threshold: '80%',
      available: '2GB'
    });

    // Test multiple key=value pairs
    expect(extractedMetadata[2]).toMatchObject({
      table: 'users',
      operation: 'SELECT',
      rows: '1500',
      time: '45ms'
    });
  });

  test('should handle malformed log entries gracefully', async () => {
    const malformedLogs = [
      '{"incomplete": json',
      '<invalid>syslog format',
      'random text without structure',
      '{"valid":"json","entry":"here"}',
      '<134>Aug 28 10:00:00 host app: valid syslog'
    ];

    const logFile = path.join(tempDir, 'mixed_logs.log');
    await fs.writeFile(logFile, malformedLogs.join('\n'));

    const content = await fs.readFile(logFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // Try parsing with JSON parser
    const jsonParsed = lines.map(line => parser.parseJsonLog(line));
    const validJsonEntries = jsonParsed.filter(entry => entry !== null);
    expect(validJsonEntries).toHaveLength(1);

    // Try parsing with syslog parser
    const syslogParsed = lines.map(line => parser.parseSyslog(line));
    const validSyslogEntries = syslogParsed.filter(entry => entry !== null);
    expect(validSyslogEntries).toHaveLength(1);
  });

  test('should process large log files efficiently', async () => {
    // Generate a large log file with mixed formats
    const logEntries = [];
    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
      const timestamp = new Date(startTime + i * 1000).toISOString();
      logEntries.push(JSON.stringify({
        timestamp,
        level: ['INFO', 'WARN', 'ERROR'][i % 3],
        message: `Log entry ${i}`,
        metadata: {
          requestId: `req-${i}`,
          duration: Math.floor(Math.random() * 1000)
        }
      }));
    }

    const logFile = path.join(tempDir, 'large_log.log');
    await fs.writeFile(logFile, logEntries.join('\n'));

    const parseStart = Date.now();
    const content = await fs.readFile(logFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const parsedLogs = lines.map(line => parser.parseJsonLog(line)).filter(Boolean);
    const parseEnd = Date.now();

    expect(parsedLogs).toHaveLength(1000);
    expect(parseEnd - parseStart).toBeLessThan(5000); // Should parse in under 5 seconds

    // Verify data integrity
    expect(parsedLogs[0].message).toBe('Log entry 0');
    expect(parsedLogs[999].message).toBe('Log entry 999');
  });

  test('should handle streaming log parsing', async () => {
    const logFile = path.join(tempDir, 'streaming_log.log');
    
    // Simulate streaming logs being written
    const writeInterval = setInterval(async () => {
      const timestamp = new Date().toISOString();
      const logEntry = JSON.stringify({
        timestamp,
        level: 'INFO',
        message: `Streaming entry at ${timestamp}`
      }) + '\n';
      
      await fs.appendFile(logFile, logEntry);
    }, 100);

    // Let it run for 1 second (10 entries)
    await new Promise(resolve => setTimeout(resolve, 1000));
    clearInterval(writeInterval);

    // Parse the accumulated log
    const content = await fs.readFile(logFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const parsedLogs = lines.map(line => parser.parseJsonLog(line)).filter(Boolean);

    expect(parsedLogs.length).toBeGreaterThanOrEqual(8); // Allow for timing variations
    expect(parsedLogs.length).toBeLessThanOrEqual(12);

    // Verify all entries are parsed correctly
    parsedLogs.forEach(entry => {
      expect(entry.level).toBe('INFO');
      expect(entry.message).toMatch(/^Streaming entry at \d{4}-\d{2}-\d{2}T/);
    });
  });

  test('should parse logs with complex nested metadata', async () => {
    const complexLog = JSON.stringify({
      timestamp: '2025-08-28T10:00:00Z',
      level: 'INFO',
      message: 'Complex operation completed',
      metadata: {
        operation: {
          name: 'data_processing',
          id: 'op-12345',
          parameters: {
            input_size: 1000,
            filters: ['active', 'verified'],
            settings: {
              timeout: 30,
              retries: 3,
              compression: true
            }
          }
        },
        performance: {
          duration_ms: 2500,
          memory_mb: 156,
          cpu_percent: 45.2
        },
        result: {
          processed_items: 950,
          skipped_items: 50,
          errors: []
        }
      }
    });

    const parsed = parser.parseJsonLog(complexLog);
    expect(parsed).toBeDefined();
    expect(parsed!.metadata.operation.name).toBe('data_processing');
    expect(parsed!.metadata.operation.parameters.filters).toEqual(['active', 'verified']);
    expect(parsed!.metadata.performance.duration_ms).toBe(2500);
    expect(parsed!.metadata.result.processed_items).toBe(950);
  });
});