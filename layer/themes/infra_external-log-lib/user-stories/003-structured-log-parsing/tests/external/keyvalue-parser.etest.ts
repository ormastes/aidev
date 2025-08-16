import { KeyValueLogParser } from '../../src/external/keyvalue-log-parser';

describe('Key-Value Log Parser External Test', () => {
  let parser: KeyValueLogParser;

  beforeEach(() => {
    parser = new KeyValueLogParser();
  });

  describe('parseKeyValueLog', () => {
    it('should parse basic key-value pairs', () => {
      const line = 'timestamp=2025-01-15T10:00:00Z level=info message="Server started" port=3000';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result).toEqual({
        timestamp: new Date('2025-01-15T10:00:00Z'),
        level: 'info',
        message: 'Server started',
        source: 'stdout',
        metadata: {
          port: 3000
        }
      });
    });

    it('should handle quoted values with spaces', () => {
      const line = 'level=error message="Database connection failed" error="Connection refused" host="db.example.com"';
      
      const result = parser.parseKeyValueLog(line, 'stderr');
      
      expect(result.message).toBe('Database connection failed');
      expect(result.metadata?.error).toBe('Connection refused');
      expect(result.metadata?.host).toBe('db.example.com');
    });

    it('should handle escaped quotes in values', () => {
      const line = 'level=info message="User said \\"Hello, world!\\"" action="quote_test"';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.message).toBe('User said "Hello, world!"');
      expect(result.metadata?.action).toBe('quote_test');
    });

    it('should handle numeric values', () => {
      const line = 'level=debug message="Metrics" count=42 rate=3.14 percentage=95.5 negative=-10';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.metadata?.count).toBe(42);
      expect(result.metadata?.rate).toBe(3.14);
      expect(result.metadata?.percentage).toBe(95.5);
      expect(result.metadata?.negative).toBe(-10);
    });

    it('should handle boolean values', () => {
      const line = 'level=info message="Config" debug=true production=false enabled=TRUE disabled=FALSE';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.metadata?.debug).toBe(true);
      expect(result.metadata?.production).toBe(false);
      expect(result.metadata?.enabled).toBe(true);
      expect(result.metadata?.disabled).toBe(false);
    });

    it('should handle null values', () => {
      const line = 'level=info message="Test" optional=null empty=NULL';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.metadata?.optional).toBe(null);
      expect(result.metadata?.empty).toBe(null);
    });

    it('should handle equals sign in quoted values', () => {
      const line = 'level=debug message="Testing" formula="a=b+c" equation="E=mc²"';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.metadata?.formula).toBe('a=b+c');
      expect(result.metadata?.equation).toBe('E=mc²');
    });

    it('should handle special characters in keys', () => {
      const line = 'user.id=123 request-id=abc-123 @timestamp=2025-01-15T10:00:00Z level=info message="Test"';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.metadata?.['user.id']).toBe(123);
      expect(result.metadata?.['request-id']).toBe('abc-123');
      expect(result.metadata?.['@timestamp']).toBe('2025-01-15T10:00:00Z');
    });

    it('should handle empty values', () => {
      const line = 'level=info message="" empty= quoted=""';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.message).toBe('');
      expect(result.metadata?.empty).toBe('');
      expect(result.metadata?.quoted).toBe('');
    });

    it('should handle missing standard fields', () => {
      const line = 'custom=value';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.level).toBe('info'); // Default for stdout
      expect(result.message).toBe('');
      expect(result.metadata?.custom).toBe('value');
    });

    it('should handle malformed pairs', () => {
      const line = 'level=info valid=yes invalid malformed= =nokey another=ok';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.level).toBe('info');
      expect(result.metadata?.valid).toBe('yes');
      expect(result.metadata?.another).toBe('ok');
      expect(result.metadata?.invalid).toBeUndefined();
      expect(result.metadata?.malformed).toBe('');
    });

    it('should handle unicode in values', () => {
      const line = 'level=info message="Hello 世界 🌍" user="José García"';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.message).toBe('Hello 世界 🌍');
      expect(result.metadata?.user).toBe('José García');
    });

    it('should normalize timestamp formats', () => {
      const testCases = [
        { line: 'timestamp=2025-01-15T10:00:00.000Z level=info message=test', expected: '2025-01-15T10:00:00.000Z' },
        { line: 'timestamp=2025-01-15T10:00:00Z level=info message=test', expected: '2025-01-15T10:00:00.000Z' },
        { line: 'timestamp="2025-01-15 10:00:00" level=info message=test', expected: '2025-01-15T10:00:00.000Z' },
        { line: 'timestamp=1736920800000 level=info message=test', expected: '2025-01-15T06:00:00.000Z' }, // Unix ms
        { line: 'timestamp=1736920800 level=info message=test', expected: '2025-01-15T06:00:00.000Z' } // Unix seconds
      ];

      testCases.forEach(({ line, expected }) => {
        const result = parser.parseKeyValueLog(line, 'stdout');
        expect(result.timestamp.toISOString()).toBe(expected);
      });
    });

    it('should handle very long values', () => {
      const longValue = 'A'.repeat(1000);
      const line = `level=info message="${longValue}"`;
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.message).toBe(longValue);
    });

    it('should preserve value types correctly', () => {
      const line = 'level=info int=42 float=3.14 string="42" bool=true null=null';
      
      const result = parser.parseKeyValueLog(line, 'stdout');
      
      expect(result.metadata?.int).toBe(42);
      expect(result.metadata?.float).toBe(3.14);
      expect(result.metadata?.string).toBe('42'); // Quoted should remain string
      expect(result.metadata?.bool).toBe(true);
      expect(result.metadata?.null).toBe(null);
    });

    it('should handle empty input', () => {
      const result = parser.parseKeyValueLog('', 'stderr');
      
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.level).toBe('error'); // Default for stderr
      expect(result.message).toBe('');
      expect(result.metadata).toEqual({});
    });

    it('should handle whitespace-only input', () => {
      const result = parser.parseKeyValueLog('   \t  ', 'stdout');
      
      expect(result.message).toBe('');
      expect(result.metadata).toEqual({});
    });
  });

  describe('isKeyValueFormat', () => {
    it('should detect valid key-value format', () => {
      expect(parser.isKeyValueFormat('key=value')).toBe(true);
      expect(parser.isKeyValueFormat('key1=value1 key2=value2')).toBe(true);
      expect(parser.isKeyValueFormat('level=info message="test"')).toBe(true);
    });

    it('should detect invalid formats', () => {
      expect(parser.isKeyValueFormat('not key value')).toBe(false);
      expect(parser.isKeyValueFormat('{"json": "format"}')).toBe(false);
      expect(parser.isKeyValueFormat('')).toBe(false);
      expect(parser.isKeyValueFormat('=nokey')).toBe(false);
    });
  });

  describe('parseValue', () => {
    it('should parse different value types correctly', () => {
      expect(parser.parseValue('42')).toBe(42);
      expect(parser.parseValue('3.14')).toBe(3.14);
      expect(parser.parseValue('true')).toBe(true);
      expect(parser.parseValue('false')).toBe(false);
      expect(parser.parseValue('null')).toBe(null);
      expect(parser.parseValue('"quoted"')).toBe('quoted');
      expect(parser.parseValue('unquoted')).toBe('unquoted');
      expect(parser.parseValue('')).toBe('');
    });
  });
});