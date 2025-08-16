import { KeyValueLogParser } from '../../src/external/keyvalue-log-parser';

describe("KeyValueLogParser", () => {
  let parser: KeyValueLogParser;

  beforeEach(() => {
    parser = new KeyValueLogParser();
  });

  describe("parseKeyValueLog", () => {
    it('should parse basic key-value pairs', () => {
      const line = 'timestamp=2024-01-15T10:30:00.000Z level=info message="Test message"';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.level).toBe('info');
      expect(result.message).toBe('Test message');
      expect(result.source).toBe('stdout');
    });

    it('should handle empty string input', () => {
      const result = parser.parseKeyValueLog('', 'stdout');

      expect(result.message).toBe('');
      expect(result.source).toBe('stdout');
      expect(result.level).toBe('info');
    });

    it('should handle null input', () => {
      const result = parser.parseKeyValueLog(null as any, 'stderr');

      expect(result.message).toBe('');
      expect(result.source).toBe('stderr');
      expect(result.level).toBe('error');
    });

    it('should handle whitespace-only input', () => {
      const result = parser.parseKeyValueLog('   \t\n  ', 'stdout');

      expect(result.message).toBe('');
      expect(result.source).toBe('stdout');
      expect(result.level).toBe('info');
    });

    it('should extract custom metadata fields', () => {
      const line = 'level=info message="Login" userId=123 action=login status=success';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.metadata).toEqual({
        userId: 123,
        action: 'login',
        status: 'success'
      });
    });

    it('should handle quoted values with spaces', () => {
      const line = 'message="This is a long message with spaces" status="in progress"';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.message).toBe('This is a long message with spaces');
      expect(result.metadata?.status).toBe('in progress');
    });

    it('should handle single-quoted values', () => {
      const line = "message='Single quoted message' type='test'";
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.message).toBe('Single quoted message');
      expect(result.metadata?.type).toBe('test');
    });

    it('should handle escaped quotes in values', () => {
      const line = 'message="Message with \\"escaped\\" quotes" data="It\'s working"';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.message).toBe('Message with "escaped" quotes');
      expect(result.metadata?.data).toBe("It's working");
    });

    it('should parse numeric values', () => {
      const line = 'count=42 price=99.99 valid=true invalid=false';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.metadata?.count).toBe(42);
      expect(result.metadata?.price).toBe(99.99);
      expect(result.metadata?.valid).toBe(true);
      expect(result.metadata?.invalid).toBe(false);
    });

    it('should handle keys with underscores and hyphens', () => {
      const line = 'user_id=123 request-id=abc-def log_level=debug';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.metadata?.user_id).toBe(123);
      expect(result.metadata?.['request-id']).toBe('abc-def');
      expect(result.metadata?.log_level).toBe('debug');
    });

    it('should handle mixed format with plain text', () => {
      const line = 'Some prefix text level=warn message="Warning" suffix text';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.level).toBe('warn');
      expect(result.message).toBe('Warning');
    });

    it('should normalize various log levels', () => {
      const levels = [
        { input: 'WARNING', expected: 'warn' },
        { input: 'ERROR', expected: 'error' },
        { input: 'DEBUG', expected: 'debug' },
        { input: 'TRACE', expected: 'trace' },
        { input: 'FATAL', expected: 'fatal' },
        { input: "CRITICAL", expected: 'fatal' }
      ];

      levels.forEach(({ input, expected }) => {
        const line = `level=${input} message=test`;
        const result = parser.parseKeyValueLog(line, 'stdout');
        expect(result.level).toBe(expected);
      });
    });

    it('should use default level based on source when level is missing', () => {
      const line = 'message="No level specified"';
      
      const stdoutResult = parser.parseKeyValueLog(line, 'stdout');
      expect(stdoutResult.level).toBe('info');

      const stderrResult = parser.parseKeyValueLog(line, 'stderr');
      expect(stderrResult.level).toBe('error');
    });

    it('should parse various timestamp formats', () => {
      const timestamps = [
        'timestamp=2024-01-15T10:30:00.000Z',
        'timestamp="2024-01-15 10:30:00"',
        'timestamp=1705315800000',
        'timestamp=1705315800'
      ];

      timestamps.forEach(ts => {
        const line = `${ts} message=test`;
        const result = parser.parseKeyValueLog(line, 'stdout');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.getTime()).toBeGreaterThan(0);
      });
    });

    it('should handle invalid timestamp gracefully', () => {
      const line = 'timestamp=invalid-date message=test';
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle equals signs in values', () => {
      const line = 'equation="a=b+c" url="https://example.com?param=value"';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.metadata?.equation).toBe('a=b+c');
      expect(result.metadata?.url).toBe('https://example.com?param=value');
    });

    it('should handle empty values', () => {
      const line = 'field1= field2="" field3=\'\' message=test';
      const result = parser.parseKeyValueLog(line, 'stdout');

      expect(result.metadata?.field1).toBe('');
      expect(result.metadata?.field2).toBe('');
      expect(result.metadata?.field3).toBe('');
      expect(result.message).toBe('test');
    });
  });

  describe("isKeyValueFormat", () => {
    it('should detect valid key-value format', () => {
      expect(parser.isKeyValueFormat('key=value')).toBe(true);
      expect(parser.isKeyValueFormat('multiple=keys level=info')).toBe(true);
      expect(parser.isKeyValueFormat('with="quoted values"')).toBe(true);
      expect(parser.isKeyValueFormat('mixed text key=value more text')).toBe(true);
    });

    it('should return false for non-key-value format', () => {
      expect(parser.isKeyValueFormat('')).toBe(false);
      expect(parser.isKeyValueFormat('   ')).toBe(false);
      expect(parser.isKeyValueFormat('just plain text')).toBe(false);
      expect(parser.isKeyValueFormat('no equals sign here')).toBe(false);
      expect(parser.isKeyValueFormat(null as any)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(parser.isKeyValueFormat('=')).toBe(false); // No key
      expect(parser.isKeyValueFormat('=value')).toBe(false); // No key
      expect(parser.isKeyValueFormat('key=')).toBe(true); // Empty value is valid
    });
  });

  describe("formatKeyValueLog", () => {
    it('should format log entry to key-value string', () => {
      const entry = {
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        level: 'info' as const,
        message: 'Test message',
        source: 'stdout' as const,
        metadata: { userId: 123, action: 'login' }
      };

      const result = parser.formatKeyValueLog(entry);
      
      expect(result).toContain('timestamp=2024-01-15T10:30:00.000Z');
      expect(result).toContain('level=info');
      expect(result).toContain('message="Test message"');
      expect(result).toContain('source=stdout');
      expect(result).toContain('userId=123');
      expect(result).toContain('action=login');
    });

    it('should quote values with spaces', () => {
      const entry = {
        timestamp: new Date(),
        level: 'error' as const,
        message: 'Error with spaces',
        source: 'stderr' as const,
        metadata: { description: 'Long description here' }
      };

      const result = parser.formatKeyValueLog(entry);
      
      expect(result).toContain('message="Error with spaces"');
      expect(result).toContain('description="Long description here"');
    });

    it('should handle special characters in values', () => {
      const entry = {
        timestamp: new Date(),
        level: 'warn' as const,
        message: 'Message with "quotes"',
        source: 'stdout' as const,
        metadata: { path: '/path/with=equals' }
      };

      const result = parser.formatKeyValueLog(entry);
      
      expect(result).toContain('message="Message with \\"quotes\\""');
      expect(result).toContain('path="/path/with=equals"');
    });

    it('should handle entry without metadata', () => {
      const entry = {
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        level: 'debug' as const,
        message: 'Debug',
        source: 'stdout' as const
      };

      const result = parser.formatKeyValueLog(entry);
      const pairs = result.split(' ');
      
      expect(pairs).toHaveLength(4); // timestamp, level, message, source
    });
  });

  describe("parseValue", () => {
    it('should parse different value types correctly', () => {
      expect(parser.parseValue('123')).toBe(123);
      expect(parser.parseValue('123.45')).toBe(123.45);
      expect(parser.parseValue('true')).toBe(true);
      expect(parser.parseValue('false')).toBe(false);
      expect(parser.parseValue('null')).toBeNull();
      expect(parser.parseValue("undefined")).toBe("undefined"); // String, not undefined
      expect(parser.parseValue('plain text')).toBe('plain text');
    });

    it('should handle empty and null values', () => {
      expect(parser.parseValue('')).toBe('');
      expect(parser.parseValue(null as any)).toBe('');
      expect(parser.parseValue(undefined as any)).toBe('');
    });
  });
});