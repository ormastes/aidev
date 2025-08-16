import { StructuredLogParser, StructuredLogParserConfig } from '../../src/external/structured-log-parser';

describe("StructuredLogParser", () => {
  describe("constructor", () => {
    it('should create parser with default config', () => {
      const parser = new StructuredLogParser();
      expect(parser).toBeDefined();
    });

    it('should create parser with custom config', () => {
      const config: StructuredLogParserConfig = {
        format: 'json',
        validateSchema: true,
        schema: {
          required: ['level', 'message'],
          properties: {
            level: { type: 'string' },
            message: { type: 'string' }
          }
        }
      };

      const parser = new StructuredLogParser(config);
      expect(parser).toBeDefined();
    });
  });

  describe("parseLogLine", () => {
    describe('with auto format detection', () => {
      let parser: StructuredLogParser;

      beforeEach(() => {
        parser = new StructuredLogParser();
      });

      it('should parse JSON format automatically', () => {
        const line = '{"level":"info","message":"Test message","userId":123}';
        const result = parser.parseLogLine(line, 'stdout');

        expect(result.level).toBe('info');
        expect(result.message).toBe('Test message');
        expect(result.metadata?.userId).toBe(123);
      });

      it('should parse key-value format automatically', () => {
        const line = 'level=warn message="Warning message" code=404';
        const result = parser.parseLogLine(line, 'stdout');

        expect(result.level).toBe('warn');
        expect(result.message).toBe('Warning message');
        expect(result.metadata?.code).toBe(404);
      });

      it('should parse plain text as default', () => {
        const line = 'This is just plain text without structure';
        const result = parser.parseLogLine(line, 'stderr');

        expect(result.message).toBe(line);
        expect(result.source).toBe('stderr');
        expect(result.level).toBe('error'); // stderr defaults to error
      });

      it('should handle empty input', () => {
        const result = parser.parseLogLine('', 'stdout');

        expect(result.message).toBe('');
        expect(result.source).toBe('stdout');
        expect(result.level).toBe('info');
      });

      it('should handle null input', () => {
        const result = parser.parseLogLine(null as any, 'stdout');

        expect(result.message).toBe('');
        expect(result.source).toBe('stdout');
      });

      it('should handle whitespace-only input', () => {
        const result = parser.parseLogLine('   \t\n  ', 'stdout');

        expect(result.message).toBe('');
        expect(result.source).toBe('stdout');
      });
    });

    describe('with forced JSON format', () => {
      let parser: StructuredLogParser;

      beforeEach(() => {
        parser = new StructuredLogParser({ format: 'json' });
      });

      it('should parse valid JSON', () => {
        const line = '{"level":"debug","message":"Debug info"}';
        const result = parser.parseLogLine(line, 'stdout');

        expect(result.level).toBe('debug');
        expect(result.message).toBe('Debug info');
      });

      it('should handle invalid JSON as plain text', () => {
        const line = 'level=info message="Not JSON"';
        const result = parser.parseLogLine(line, 'stdout');

        expect(result.message).toBe(line);
        expect(result.level).toBe('info');
      });
    });

    describe('with forced key-value format', () => {
      let parser: StructuredLogParser;

      beforeEach(() => {
        parser = new StructuredLogParser({ format: "keyvalue" });
      });

      it('should parse key-value pairs', () => {
        const line = 'level=error message="Error occurred" stack="trace here"';
        const result = parser.parseLogLine(line, 'stderr');

        expect(result.level).toBe('error');
        expect(result.message).toBe('Error occurred');
        expect(result.metadata?.stack).toBe('trace here');
      });

      it('should handle JSON as plain text in key-value mode', () => {
        const line = '{"level":"info","message":"JSON line"}';
        const result = parser.parseLogLine(line, 'stdout');

        // In key-value mode, JSON is treated as plain text
        expect(result.message).toBe('');
        expect(result.level).toBe('info');
      });
    });

    describe('with schema validation', () => {
      let parser: StructuredLogParser;

      beforeEach(() => {
        parser = new StructuredLogParser({
          validateSchema: true,
          schema: {
            required: ['level', 'message'],
            properties: {
              level: { 
                type: 'string',
                enum: ['debug', 'info', 'warn', 'error']
              },
              message: { type: 'string', minLength: 1 },
              timestamp: { type: 'date' }
            }
          }
        });
      });

      it('should pass validation for valid logs', () => {
        const line = '{"level":"info","message":"Valid log","timestamp":"2024-01-15T10:30:00.000Z"}';
        const result = parser.parseLogLine(line, 'stdout');

        expect(result.level).toBe('info');
        expect(result.message).toBe('Valid log');
        // No validation errors in metadata
        expect(result.metadata?.validationErrors).toBeUndefined();
      });

      it('should include validation errors for invalid logs', () => {
        const line = '{"level":"trace","message":""}'; // trace not in enum, empty message
        const result = parser.parseLogLine(line, 'stdout');

        expect(result.level).toBe('trace');
        expect(result.metadata?.validationErrors).toBeDefined();
        expect(result.metadata?.validationErrors).toContain('Field "level" must be one of: debug, info, warn, error');
        expect(result.metadata?.validationErrors).toContain('Field "message" must have at least 1 characters');
      });

      it('should handle missing required fields', () => {
        const line = '{"level":"info"}'; // missing required message
        const result = parser.parseLogLine(line, 'stdout');

        expect(result.metadata?.validationErrors).toContain('Required field "message" is missing');
      });
    });
  });

  describe('format detection', () => {
    let parser: StructuredLogParser;

    beforeEach(() => {
      parser = new StructuredLogParser();
    });

    it('should prefer JSON over key-value when both formats are present', () => {
      const line = '{"level":"info","message":"key=value inside JSON"}';
      const result = parser.parseLogLine(line, 'stdout');

      expect(result.level).toBe('info');
      expect(result.message).toBe('key=value inside JSON');
      expect(result.metadata?.key).toBeUndefined(); // Should not parse inner key=value
    });

    it('should detect complex JSON structures', () => {
      const line = JSON.stringify({
        level: 'error',
        message: 'Complex error',
        error: {
          code: 'ERR_001',
          details: { line: 42, column: 10 }
        }
      });

      const result = parser.parseLogLine(line, 'stderr');

      expect(result.level).toBe('error');
      expect(result.metadata?.error).toEqual({
        code: 'ERR_001',
        details: { line: 42, column: 10 }
      });
    });

    it('should detect mixed text with key-value pairs', () => {
      const line = '[2024-01-15] level=warn message="Mixed format" user=admin';
      const result = parser.parseLogLine(line, 'stdout');

      expect(result.level).toBe('warn');
      expect(result.message).toBe('Mixed format');
      expect(result.metadata?.user).toBe('admin');
    });
  });

  describe("parseMultipleLines", () => {
    let parser: StructuredLogParser;

    beforeEach(() => {
      parser = new StructuredLogParser();
    });

    it('should parse multiple lines with different formats', () => {
      const lines = [
        '{"level":"info","message":"JSON log"}',
        'level=warn message="Key-value log"',
        'Plain text log',
        ''
      ];

      const results = parser.parseMultipleLines(lines, 'stdout');

      expect(results).toHaveLength(4);
      expect(results[0].level).toBe('info');
      expect(results[1].level).toBe('warn');
      expect(results[2].message).toBe('Plain text log');
      expect(results[3].message).toBe('');
    });

    it('should handle empty array', () => {
      const results = parser.parseMultipleLines([], 'stdout');
      expect(results).toHaveLength(0);
    });

    it('should use provided source for all lines', () => {
      const lines = ['line1', 'line2'];
      const results = parser.parseMultipleLines(lines, 'stderr');

      results.forEach(result => {
        expect(result.source).toBe('stderr');
      });
    });
  });

  describe("formatLogEntry", () => {
    it('should format to JSON when format is json', () => {
      const parser = new StructuredLogParser({ format: 'json' });
      const entry = {
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        level: 'info' as const,
        message: 'Test',
        source: 'stdout' as const,
        metadata: { userId: 123 }
      };

      const result = parser.formatLogEntry(entry);
      const parsed = JSON.parse(result);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test');
      expect(parsed.userId).toBe(123);
    });

    it('should format to key-value when format is keyvalue', () => {
      const parser = new StructuredLogParser({ format: "keyvalue" });
      const entry = {
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        level: 'warn' as const,
        message: 'Warning message',
        source: 'stderr' as const,
        metadata: { code: 404 }
      };

      const result = parser.formatLogEntry(entry);

      expect(result).toContain('level=warn');
      expect(result).toContain('message="Warning message"');
      expect(result).toContain('code=404');
    });

    it('should format to JSON by default in auto mode', () => {
      const parser = new StructuredLogParser({ format: 'auto' });
      const entry = {
        timestamp: new Date(),
        level: 'debug' as const,
        message: 'Debug',
        source: 'stdout' as const
      };

      const result = parser.formatLogEntry(entry);
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('query functionality', () => {
    let parser: StructuredLogParser;

    beforeEach(() => {
      parser = new StructuredLogParser();
    });

    it('should query logs by level', () => {
      const logs = [
        parser.parseLogLine('{"level":"info","message":"Info 1"}', 'stdout'),
        parser.parseLogLine('{"level":"error","message":"Error 1"}', 'stderr'),
        parser.parseLogLine('{"level":"info","message":"Info 2"}', 'stdout'),
        parser.parseLogLine('{"level":"warn","message":"Warning"}', 'stdout')
      ];

      const infoLogs = parser.queryLogs(logs, { level: 'info' });
      expect(infoLogs).toHaveLength(2);
      expect(infoLogs[0].message).toBe('Info 1');
      expect(infoLogs[1].message).toBe('Info 2');
    });

    it('should query logs by metadata', () => {
      const logs = [
        parser.parseLogLine('{"level":"info","message":"User login","userId":123}', 'stdout'),
        parser.parseLogLine('{"level":"info","message":"User action","userId":456}', 'stdout'),
        parser.parseLogLine('{"level":"info","message":"Another login","userId":123}', 'stdout')
      ];

      const userLogs = parser.queryLogs(logs, { metadata: { userId: 123 } });
      expect(userLogs).toHaveLength(2);
      expect(userLogs[0].message).toBe('User login');
      expect(userLogs[1].message).toBe('Another login');
    });

    it('should query logs by time range', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const logs = [
        { ...parser.parseLogLine('{"message":"Old"}', 'stdout'), timestamp: twoHoursAgo },
        { ...parser.parseLogLine('{"message":"Recent"}', 'stdout'), timestamp: new Date(now.getTime() - 30 * 60 * 1000) },
        { ...parser.parseLogLine('{"message":"Current"}', 'stdout'), timestamp: now }
      ];

      const recentLogs = parser.queryLogs(logs, { 
        startTime: hourAgo,
        endTime: now 
      });

      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0].message).toBe('Recent');
      expect(recentLogs[1].message).toBe('Current');
    });

    it('should combine multiple query criteria', () => {
      const logs = [
        parser.parseLogLine('{"level":"error","message":"Error 1","code":500}', 'stderr'),
        parser.parseLogLine('{"level":"error","message":"Error 2","code":404}', 'stderr'),
        parser.parseLogLine('{"level":"warn","message":"Warning","code":404}', 'stdout')
      ];

      const filtered = parser.queryLogs(logs, {
        level: 'error',
        metadata: { code: 404 }
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].message).toBe('Error 2');
    });
  });
});