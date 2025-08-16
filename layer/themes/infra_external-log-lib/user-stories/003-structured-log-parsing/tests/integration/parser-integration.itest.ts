import { StructuredLogParser } from '../../src/external/structured-log-parser';
import { LogSchema } from '../../src/external/schema-validator';

describe('Parser Integration Test - Mixed Formats', () => {
  let parser: StructuredLogParser;

  beforeEach(() => {
    parser = new StructuredLogParser();
  });

  describe('Mixed Format Processing', () => {
    it('should handle alternating JSON and key-value logs correctly', () => {
      const mixedLogs = [
        '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "info", "message": "JSON log 1", "service": "api"}',
        'timestamp=2025-01-15T10:00:01.000Z level=debug message="Key-value log 1" component=auth',
        '{"timestamp": "2025-01-15T10:00:02.000Z", "level": "warn", "message": "JSON log 2", "memory": 85}',
        'timestamp=2025-01-15T10:00:03.000Z level=error message="Key-value log 2" error_code=404',
        'Plain text log without any structure'
      ];

      const results = mixedLogs.map(line => parser.parseLogLine(line, 'stdout'));

      // Verify all logs were parsed
      expect(results).toHaveLength(5);

      // Verify JSON logs
      const jsonLog1 = results[0];
      expect(jsonLog1.message).toBe('JSON log 1');
      expect(jsonLog1.level).toBe('info');
      expect(jsonLog1.metadata?.service).toBe('api');
      expect(jsonLog1.timestamp).toEqual(new Date('2025-01-15T10:00:00.000Z'));

      const jsonLog2 = results[2];
      expect(jsonLog2.message).toBe('JSON log 2');
      expect(jsonLog2.level).toBe('warn');
      expect(jsonLog2.metadata?.memory).toBe(85);

      // Verify key-value logs
      const kvLog1 = results[1];
      expect(kvLog1.message).toBe('Key-value log 1');
      expect(kvLog1.level).toBe('debug');
      expect(kvLog1.metadata?.component).toBe('auth');
      expect(kvLog1.timestamp).toEqual(new Date('2025-01-15T10:00:01.000Z'));

      const kvLog2 = results[3];
      expect(kvLog2.message).toBe('Key-value log 2');
      expect(kvLog2.level).toBe('error');
      expect(kvLog2.metadata?.error_code).toBe(404);

      // Verify plain text fallback
      const plainLog = results[4];
      expect(plainLog.message).toBe('Plain text log without any structure');
      expect(plainLog.level).toBe('info'); // Default for stdout
      expect(Object.keys(plainLog.metadata || {})).toHaveLength(0);
    });

    it('should maintain parser independence with different configurations', () => {
      const jsonOnlyParser = new StructuredLogParser({ format: 'json' });
      const kvOnlyParser = new StructuredLogParser({ format: "keyvalue" });
      const autoParser = new StructuredLogParser({ format: 'auto' });

      const jsonLine = '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "info", "message": "Test"}';
      const kvLine = 'timestamp=2025-01-15T10:00:00.000Z level=info message="Test"';

      // JSON parser should handle JSON correctly but create default entry for KV
      const jsonResult1 = jsonOnlyParser.parseLogLine(jsonLine, 'stdout');
      expect(jsonResult1.message).toBe('Test');
      expect(jsonResult1.timestamp).toEqual(new Date('2025-01-15T10:00:00.000Z'));

      const jsonResult2 = jsonOnlyParser.parseLogLine(kvLine, 'stdout');
      expect(jsonResult2.message).toBe(kvLine); // Falls back to original line as message
      expect(Object.keys(jsonResult2.metadata || {})).toHaveLength(0);

      // KV parser should handle KV correctly but create default entry for JSON
      const kvResult1 = kvOnlyParser.parseLogLine(kvLine, 'stdout');
      expect(kvResult1.message).toBe('Test');
      expect(kvResult1.timestamp).toEqual(new Date('2025-01-15T10:00:00.000Z'));

      const kvResult2 = kvOnlyParser.parseLogLine(jsonLine, 'stdout');
      expect(kvResult2.message).toBe(''); // KV parser extracts empty message when no message= found
      expect(Object.keys(kvResult2.metadata || {})).toHaveLength(0);

      // Auto parser should handle both correctly
      const autoResult1 = autoParser.parseLogLine(jsonLine, 'stdout');
      expect(autoResult1.message).toBe('Test');
      expect(autoResult1.timestamp).toEqual(new Date('2025-01-15T10:00:00.000Z'));

      const autoResult2 = autoParser.parseLogLine(kvLine, 'stdout');
      expect(autoResult2.message).toBe('Test');
      expect(autoResult2.timestamp).toEqual(new Date('2025-01-15T10:00:00.000Z'));
    });

    it('should handle malformed logs gracefully in mixed streams', () => {
      const mixedLogs = [
        '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "info", "message": "Valid JSON"}',
        '{"malformed": json missing quote and brace',
        'level=info message="Valid KV" timestamp=2025-01-15T10:00:01.000Z',
        'malformed=kv=missing=quotes level',
        'Just plain text',
        ''
      ];

      const results = mixedLogs.map(line => parser.parseLogLine(line, 'stdout'));

      expect(results).toHaveLength(6);

      // Valid JSON should parse correctly
      expect(results[0].message).toBe('Valid JSON');
      expect(results[0].level).toBe('info');

      // Malformed JSON should fall back to plain text
      expect(results[1].message).toBe('{"malformed": json missing quote and brace');
      expect(Object.keys(results[1].metadata || {})).toHaveLength(0);

      // Valid KV should parse correctly
      expect(results[2].message).toBe('Valid KV');
      expect(results[2].level).toBe('info');

      // Malformed KV is detected as KV format but produces empty message
      expect(results[3].message).toBe(''); // KV parser extracts empty message when no message= field
      expect(results[3].metadata?.malformed).toBe('kv=missing=quotes'); // Everything after first = is the value

      // Plain text should work
      expect(results[4].message).toBe('Just plain text');

      // Empty line should work
      expect(results[5].message).toBe('');
    });

    it('should integrate schema validation with mixed formats', () => {
      const schema: LogSchema = {
        required: ["timestamp", 'level', 'message'],
        properties: {
          timestamp: { type: 'date' },
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
          message: { type: 'string', minLength: 1 },
          service: { type: 'string' }
        }
      };

      const validatingParser = new StructuredLogParser({ 
        format: 'auto',
        schema,
        validateSchema: true 
      });

      const logs = [
        '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "info", "message": "Valid JSON", "service": "api"}',
        'timestamp=2025-01-15T10:00:01.000Z level=debug message="Valid KV" service=auth',
        '{"timestamp": "2025-01-15T10:00:02.000Z", "level": "info"}', // Missing required message field
        'Plain text log' // No structure, will get default fields
      ];

      const results = logs.map(line => validatingParser.parseLogLine(line, 'stdout'));

      // Valid JSON should pass validation
      expect(results[0].message).toBe('Valid JSON');
      expect((results[0] as any).source).toBe('stdout');

      // Valid KV should pass validation
      expect(results[1].message).toBe('Valid KV');
      expect((results[1] as any).source).toBe('stdout');

      // Invalid JSON should create validation error (missing required message field)
      expect(results[2].level).toBe('error');
      expect(results[2].message).toContain('Invalid log format');
      expect((results[2] as any).source).toBe("validation");

      // Plain text should pass validation since it gets default valid fields
      expect(results[3].message).toBe('Plain text log');
      expect((results[3] as any).source).toBe('stdout');
    });

    it('should preserve source attribution across different formats', () => {
      const logs = [
        '{"level": "info", "message": "JSON stdout"}',
        'level=warn message="KV stdout"',
        'Plain stdout'
      ];

      const stdoutResults = logs.map(line => parser.parseLogLine(line, 'stdout'));
      const stderrResults = logs.map(line => parser.parseLogLine(line, 'stderr'));

      // Verify stdout attribution
      stdoutResults.forEach(result => {
        expect(result.source).toBe('stdout');
      });

      // Verify stderr attribution
      stderrResults.forEach(result => {
        expect(result.source).toBe('stderr');
      });

      // Verify level defaults based on source for plain text
      expect(stdoutResults[2].level).toBe('info'); // stdout default
      expect(stderrResults[2].level).toBe('error'); // stderr default
    });

    it('should handle concurrent parsing with different parsers', () => {
      const parser1 = new StructuredLogParser({ format: 'json' });
      const parser2 = new StructuredLogParser({ format: "keyvalue" });
      const parser3 = new StructuredLogParser({ format: 'auto' });

      const jsonLine = '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "info", "message": "Concurrent test"}';
      const kvLine = 'timestamp=2025-01-15T10:00:00.000Z level=warn message="Concurrent test"';

      // Simulate concurrent parsing
      const results = [
        parser1.parseLogLine(jsonLine, 'stdout'),
        parser2.parseLogLine(kvLine, 'stdout'),
        parser3.parseLogLine(jsonLine, 'stderr'),
        parser3.parseLogLine(kvLine, 'stderr'),
        parser1.parseLogLine(kvLine, 'stdout'), // Should fallback to plain text
        parser2.parseLogLine(jsonLine, 'stdout') // Should fallback to plain text
      ];

      // Verify each parser maintains its own state
      expect(results[0].message).toBe('Concurrent test');
      expect(results[0].level).toBe('info');

      expect(results[1].message).toBe('Concurrent test');
      expect(results[1].level).toBe('warn');

      expect(results[2].message).toBe('Concurrent test');
      expect(results[2].level).toBe('info');
      expect(results[2].source).toBe('stderr');

      expect(results[3].message).toBe('Concurrent test');
      expect(results[3].level).toBe('warn');
      expect(results[3].source).toBe('stderr');

      // JSON parser should treat KV as plain text
      expect(results[4].message).toBe(kvLine);
      expect(Object.keys(results[4].metadata || {})).toHaveLength(0);

      // KV parser should treat JSON as plain text (no message= field found)
      expect(results[5].message).toBe(''); // No message= field extracted
      expect(Object.keys(results[5].metadata || {})).toHaveLength(0);
    });
  });

  describe('Parser Composition and Format Detection', () => {
    it('should detect formats in the correct priority order', () => {
      // Line that could be interpreted as both JSON and key-value
      const ambiguousLine = '{"key": "value", "level": "info"}';
      
      const result = parser.parseLogLine(ambiguousLine, 'stdout');
      
      // JSON should take priority (since it's checked first)
      expect(result.level).toBe('info');
      expect(result.metadata?.key).toBe('value');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle edge cases in format detection', () => {
      const edgeCases = [
        'key=value but also {"json": true}', // Mixed in one line - should detect as KV
        '{"incomplete": json', // Incomplete JSON - should fallback
        'key=', // Empty value in KV
        '{}', // Empty JSON
        'key1=value1 key2=value2 level=info', // KV without message
        '{"level": "info"}' // JSON without message
      ];

      const results = edgeCases.map(line => parser.parseLogLine(line, 'stdout'));

      // Each should be handled gracefully
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.source).toBe('stdout');
        expect(['debug', 'info', 'warn', 'error']).toContain(result.level);
      });

      // Specific checks for edge cases
      expect(results[0].metadata).toBeDefined(); // Should detect KV format
      expect(results[2].metadata).toBeDefined(); // Should handle empty KV value
      expect(results[3].metadata).toBeDefined(); // Should handle empty JSON
    });

    it('should maintain parser state independence', () => {
      const parser1 = new StructuredLogParser({ format: 'auto' });
      const parser2 = new StructuredLogParser({ format: 'auto' });

      const line1 = '{"level": "info", "message": "Test 1"}';
      const line2 = 'level=warn message="Test 2"';

      // Parse with both parsers
      const result1a = parser1.parseLogLine(line1, 'stdout');
      const result2a = parser2.parseLogLine(line2, 'stdout');
      const result1b = parser1.parseLogLine(line2, 'stderr');
      const result2b = parser2.parseLogLine(line1, 'stderr');

      // Verify results are independent
      expect(result1a.message).toBe('Test 1');
      expect(result1a.level).toBe('info');
      expect(result1a.source).toBe('stdout');

      expect(result2a.message).toBe('Test 2');
      expect(result2a.level).toBe('warn');
      expect(result2a.source).toBe('stdout');

      expect(result1b.message).toBe('Test 2');
      expect(result1b.level).toBe('warn');
      expect(result1b.source).toBe('stderr');

      expect(result2b.message).toBe('Test 1');
      expect(result2b.level).toBe('info');
      expect(result2b.source).toBe('stderr');
    });
  });
});