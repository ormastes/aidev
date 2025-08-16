import { JSONLogParser } from '../../src/external/json-log-parser';

describe('JSONLogParser', () => {
  let parser: JSONLogParser;

  beforeEach(() => {
    parser = new JSONLogParser();
  });

  describe('parseJSONLog', () => {
    it('should parse valid JSON log with all fields', () => {
      const line = JSON.stringify({
        timestamp: '2024-01-15T10:30:00.000Z',
        level: 'info',
        message: 'Test message',
        customField: 'custom value'
      });

      const result = parser.parseJSONLog(line, 'stdout');

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.level).toBe('info');
      expect(result.message).toBe('Test message');
      expect(result.source).toBe('stdout');
      expect(result.metadata).toEqual({ customField: 'custom value' });
    });

    it('should handle empty string input', () => {
      const result = parser.parseJSONLog('', 'stdout');

      expect(result.message).toBe('');
      expect(result.source).toBe('stdout');
      expect(result.level).toBe('info');
    });

    it('should handle null input', () => {
      const result = parser.parseJSONLog(null as any, 'stderr');

      expect(result.message).toBe('');
      expect(result.source).toBe('stderr');
      expect(result.level).toBe('error');
    });

    it('should handle non-object JSON (string)', () => {
      const line = '"just a string"';
      const result = parser.parseJSONLog(line, 'stdout');

      expect(result.message).toBe(line);
      expect(result.level).toBe('info');
    });

    it('should handle non-object JSON (number)', () => {
      const line = '42';
      const result = parser.parseJSONLog(line, 'stdout');

      expect(result.message).toBe(line);
      expect(result.level).toBe('info');
    });

    it('should handle non-object JSON (array)', () => {
      const line = '[1, 2, 3]';
      const result = parser.parseJSONLog(line, 'stdout');

      expect(result.message).toBe(line);
      expect(result.level).toBe('info');
    });

    it('should handle null JSON value', () => {
      const line = 'null';
      const result = parser.parseJSONLog(line, 'stdout');

      expect(result.message).toBe(line);
      expect(result.level).toBe('info');
    });

    it('should handle invalid JSON gracefully', () => {
      const line = '{ invalid json }';
      const result = parser.parseJSONLog(line, 'stderr');

      expect(result.message).toBe(line);
      expect(result.source).toBe('stderr');
      expect(result.level).toBe('error');
    });

    it('should parse JSON without message field', () => {
      const line = JSON.stringify({
        timestamp: '2024-01-15T10:30:00.000Z',
        level: 'warn'
      });

      const result = parser.parseJSONLog(line, 'stdout');

      expect(result.message).toBe('');
      expect(result.level).toBe('warn');
    });

    it('should normalize various log levels', () => {
      const levels = [
        { input: 'WARNING', expected: 'warn' },
        { input: 'ERROR', expected: 'error' },
        { input: 'DEBUG', expected: 'debug' },
        { input: 'TRACE', expected: 'trace' },
        { input: 'FATAL', expected: 'fatal' },
        { input: 'CRITICAL', expected: 'fatal' },
        { input: 'unknown', expected: 'info' }
      ];

      levels.forEach(({ input, expected }) => {
        const line = JSON.stringify({ level: input, message: 'test' });
        const result = parser.parseJSONLog(line, 'stdout');
        expect(result.level).toBe(expected);
      });
    });

    it('should extract metadata from non-standard fields', () => {
      const line = JSON.stringify({
        timestamp: '2024-01-15T10:30:00.000Z',
        level: 'info',
        message: 'Test',
        userId: 123,
        action: 'login',
        nested: { key: 'value' }
      });

      const result = parser.parseJSONLog(line, 'stdout');

      expect(result.metadata).toEqual({
        userId: 123,
        action: 'login',
        nested: { key: 'value' }
      });
    });

    it('should parse various timestamp formats', () => {
      const timestamps = [
        '2024-01-15T10:30:00.000Z',
        '2024-01-15 10:30:00',
        '1705315800000', // Unix timestamp in ms
        '1705315800', // Unix timestamp in seconds
        new Date().toISOString()
      ];

      timestamps.forEach(timestamp => {
        const line = JSON.stringify({ timestamp, message: 'test' });
        const result = parser.parseJSONLog(line, 'stdout');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.getTime()).toBeGreaterThan(0);
      });
    });

    it('should handle invalid timestamp gracefully', () => {
      const line = JSON.stringify({
        timestamp: 'invalid-date',
        message: 'test'
      });

      const result = parser.parseJSONLog(line, 'stdout');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should set default level based on source', () => {
      const line = JSON.stringify({ message: 'test' });
      
      const stdoutResult = parser.parseJSONLog(line, 'stdout');
      expect(stdoutResult.level).toBe('info');

      const stderrResult = parser.parseJSONLog(line, 'stderr');
      expect(stderrResult.level).toBe('error');
    });
  });

  describe('isValidJSON', () => {
    it('should return true for valid JSON', () => {
      expect(parser.isValidJSON('{"key": "value"}')).toBe(true);
      expect(parser.isValidJSON('[]')).toBe(true);
      expect(parser.isValidJSON('"string"')).toBe(true);
      expect(parser.isValidJSON('123')).toBe(true);
      expect(parser.isValidJSON('null')).toBe(true);
      expect(parser.isValidJSON('true')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(parser.isValidJSON('')).toBe(false);
      expect(parser.isValidJSON('invalid')).toBe(false);
      expect(parser.isValidJSON('{ invalid }')).toBe(false);
      expect(parser.isValidJSON(undefined as any)).toBe(false);
      expect(parser.isValidJSON(null as any)).toBe(false);
    });
  });

  describe('formatJSONLog', () => {
    it('should format log entry to JSON string', () => {
      const entry = {
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        level: 'info' as const,
        message: 'Test message',
        source: 'stdout' as const,
        metadata: { userId: 123 }
      };

      const result = parser.formatJSONLog(entry);
      const parsed = JSON.parse(result);

      expect(parsed.timestamp).toBe('2024-01-15T10:30:00.000Z');
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.source).toBe('stdout');
      expect(parsed.userId).toBe(123);
    });

    it('should handle entry without metadata', () => {
      const entry = {
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        level: 'error' as const,
        message: 'Error message',
        source: 'stderr' as const
      };

      const result = parser.formatJSONLog(entry);
      const parsed = JSON.parse(result);

      expect(parsed.timestamp).toBe('2024-01-15T10:30:00.000Z');
      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Error message');
      expect(parsed.source).toBe('stderr');
    });

    it('should merge metadata fields with standard fields', () => {
      const entry = {
        timestamp: new Date(),
        level: 'warn' as const,
        message: 'Warning',
        source: 'stdout' as const,
        metadata: {
          action: 'test',
          nested: { data: true }
        }
      };

      const result = parser.formatJSONLog(entry);
      const parsed = JSON.parse(result);

      expect(parsed.action).toBe('test');
      expect(parsed.nested).toEqual({ data: true });
    });
  });
});