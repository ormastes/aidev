import { JSONLogParser } from '../../src/external/json-log-parser';

describe('JSON Log Parser External Test', () => {
  let parser: JSONLogParser;

  beforeEach(() => {
    parser = new JSONLogParser();
  });

  describe('parseJSONLog', () => {
    it('should parse valid JSON log with all standard fields', () => {
      const jsonLine = '{"timestamp":"2025-01-15T10:00:00.000Z","level":"info","message":"Server started","port":3000}';
      
      const result = parser.parseJSONLog(jsonLine, 'stdout');
      
      expect(result).toEqual({
        timestamp: new Date('2025-01-15T10:00:00.000Z'),
        level: 'info',
        message: 'Server started',
        source: 'stdout',
        metadata: {
          port: 3000
        }
      });
    });

    it('should handle different log levels', () => {
      const testCases = [
        { json: '{"level":"INFO","message":"test"}', expected: 'info' },
        { json: '{"level":"DEBUG","message":"test"}', expected: 'debug' },
        { json: '{"level":"WARN","message":"test"}', expected: 'warn' },
        { json: '{"level":"WARNING","message":"test"}', expected: 'warn' },
        { json: '{"level":"ERROR","message":"test"}', expected: 'error' },
        { json: '{"level":"CRITICAL","message":"test"}', expected: 'error' },
        { json: '{"level":"FATAL","message":"test"}', expected: 'error' },
        { json: '{"level":"trace","message":"test"}', expected: 'debug' },
      ];

      testCases.forEach(({ json, expected }) => {
        const result = parser.parseJSONLog(json, 'stderr');
        expect(result.level).toBe(expected);
      });
    });

    it('should extract metadata from additional fields', () => {
      const jsonLine = JSON.stringify({
        timestamp: '2025-01-15T10:00:00.000Z',
        level: 'error',
        message: 'Database connection failed',
        errorCode: 'DB_CONN_001',
        retryCount: 3,
        userId: 12345,
        tags: ['database', 'critical'],
        nested: {
          server: 'db-01',
          region: 'us-east-1'
        }
      });

      const result = parser.parseJSONLog(jsonLine, 'stderr');

      expect(result.message).toBe('Database connection failed');
      expect(result.metadata).toEqual({
        errorCode: 'DB_CONN_001',
        retryCount: 3,
        userId: 12345,
        tags: ['database', 'critical'],
        nested: {
          server: 'db-01',
          region: 'us-east-1'
        }
      });
    });

    it('should handle missing timestamp', () => {
      const jsonLine = '{"level":"info","message":"No timestamp"}';
      
      const before = Date.now();
      const result = parser.parseJSONLog(jsonLine, 'stdout');
      const after = Date.now();
      
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('should handle missing level', () => {
      const jsonLine = '{"timestamp":"2025-01-15T10:00:00.000Z","message":"No level"}';
      
      const result = parser.parseJSONLog(jsonLine, 'stdout');
      expect(result.level).toBe('info'); // Default for stdout
      
      const result2 = parser.parseJSONLog(jsonLine, 'stderr');
      expect(result2.level).toBe('error'); // Default for stderr
    });

    it('should handle missing message', () => {
      const jsonLine = '{"timestamp":"2025-01-15T10:00:00.000Z","level":"info"}';
      
      const result = parser.parseJSONLog(jsonLine, 'stdout');
      expect(result.message).toBe(''); // Empty message
    });

    it('should handle invalid JSON', () => {
      const invalidJson = '{"level":"info","message":"Unclosed';
      
      const result = parser.parseJSONLog(invalidJson, 'stderr');
      
      expect(result).toEqual({
        timestamp: expect.any(Date),
        level: 'error',
        message: invalidJson,
        source: 'stderr',
        metadata: {}
      });
    });

    it('should handle empty string', () => {
      const result = parser.parseJSONLog('', 'stdout');
      
      expect(result).toEqual({
        timestamp: expect.any(Date),
        level: 'info',
        message: '',
        source: 'stdout',
        metadata: {}
      });
    });

    it('should handle non-object JSON (arrays, primitives)', () => {
      const arrayJson = '["item1", "item2"]';
      const result1 = parser.parseJSONLog(arrayJson, 'stdout');
      expect(result1.message).toBe(arrayJson);
      
      const stringJson = '"just a string"';
      const result2 = parser.parseJSONLog(stringJson, 'stdout');
      expect(result2.message).toBe(stringJson);
      
      const numberJson = '42';
      const result3 = parser.parseJSONLog(numberJson, 'stdout');
      expect(result3.message).toBe(numberJson);
    });

    it('should normalize timestamp formats', () => {
      const testCases = [
        '2025-01-15T10:00:00.000Z',
        '2025-01-15T10:00:00Z',
        '2025-01-15 10:00:00',
        '2025-01-15T10:00:00+00:00',
        '2025-01-15T10:00:00-05:00',
        1736920800000, // Unix timestamp in milliseconds
        '1736920800' // Unix timestamp as string
      ];

      testCases.forEach(timestamp => {
        const json = JSON.stringify({ timestamp, level: 'info', message: 'test' });
        const result = parser.parseJSONLog(json, 'stdout');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(isNaN(result.timestamp.getTime())).toBe(false);
      });
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Line 1\nLine 2\tTabbed\r\nWindows line\u0000Null char';
      const json = JSON.stringify({
        level: 'info',
        message: specialMessage
      });

      const result = parser.parseJSONLog(json, 'stdout');
      expect(result.message).toBe(specialMessage);
    });

    it('should preserve numeric types in metadata', () => {
      const json = JSON.stringify({
        level: 'info',
        message: 'Metrics',
        intValue: 42,
        floatValue: 3.14,
        bigNumber: 9007199254740991, // MAX_SAFE_INTEGER
        scientificNotation: 1.23e10,
        negativeNumber: -100
      });

      const result = parser.parseJSONLog(json, 'stdout');
      
      expect(result.metadata?.intValue).toBe(42);
      expect(result.metadata?.floatValue).toBe(3.14);
      expect(result.metadata?.bigNumber).toBe(9007199254740991);
      expect(result.metadata?.scientificNotation).toBe(1.23e10);
      expect(result.metadata?.negativeNumber).toBe(-100);
    });

    it('should handle boolean and null values in metadata', () => {
      const json = JSON.stringify({
        level: 'info',
        message: 'Test',
        isActive: true,
        isDeleted: false,
        optional: null,
        undefined: undefined // Will be omitted in JSON
      });

      const result = parser.parseJSONLog(json, 'stdout');
      
      expect(result.metadata?.isActive).toBe(true);
      expect(result.metadata?.isDeleted).toBe(false);
      expect(result.metadata?.optional).toBe(null);
      expect(result.metadata?.undefined).toBeUndefined();
    });
  });

  describe('isValidJSON', () => {
    it('should detect valid JSON', () => {
      expect(parser.isValidJSON('{"key":"value"}')).toBe(true);
      expect(parser.isValidJSON('[]')).toBe(true);
      expect(parser.isValidJSON('"string"')).toBe(true);
      expect(parser.isValidJSON('123')).toBe(true);
      expect(parser.isValidJSON('true')).toBe(true);
      expect(parser.isValidJSON('null')).toBe(true);
    });

    it('should detect invalid JSON', () => {
      expect(parser.isValidJSON('{')).toBe(false);
      expect(parser.isValidJSON('not json')).toBe(false);
      expect(parser.isValidJSON('')).toBe(false);
      expect(parser.isValidJSON('undefined')).toBe(false);
    });
  });

  describe('extractMetadata', () => {
    it('should extract all non-standard fields as metadata', () => {
      const logObject = {
        timestamp: '2025-01-15T10:00:00.000Z',
        level: 'info',
        message: 'Test',
        source: 'stdout',
        // These should be extracted as metadata
        customField: 'value',
        requestId: '123',
        duration: 100
      };

      const metadata = parser.extractMetadata(logObject);
      
      expect(metadata).toEqual({
        customField: 'value',
        requestId: '123',
        duration: 100
      });
      
      // Standard fields should not be in metadata
      expect(metadata.timestamp).toBeUndefined();
      expect(metadata.level).toBeUndefined();
      expect(metadata.message).toBeUndefined();
      expect(metadata.source).toBeUndefined();
    });

    it('should return empty object for logs with only standard fields', () => {
      const logObject = {
        timestamp: '2025-01-15T10:00:00.000Z',
        level: 'info',
        message: 'Test',
        source: 'stdout'
      };

      const metadata = parser.extractMetadata(logObject);
      expect(metadata).toEqual({});
    });
  });
});