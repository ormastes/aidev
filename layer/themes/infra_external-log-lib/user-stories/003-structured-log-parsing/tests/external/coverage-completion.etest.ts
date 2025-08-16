import { JSONLogParser } from '../../src/external/json-log-parser';
import { KeyValueLogParser } from '../../src/external/keyvalue-log-parser';
import { LogSchemaValidator, LogSchema } from '../../src/external/schema-validator';

describe('Coverage Completion Tests', () => {
  describe('JSON Log Parser Edge Cases', () => {
    it('should fallback to current time for completely invalid timestamp', () => {
      const parser = new JSONLogParser();
      const beforeTest = new Date();
      
      // This will trigger the final fallback case in parseTimestamp
      const result = parser.parseJSONLog('{"timestamp": {"invalid": "object"}, "level": "info", "message": "test"}', 'stdout');
      
      const afterTest = new Date();
      
      // Should fallback to current time (line 105)
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });
  });

  describe('Key-Value Log Parser Edge Cases', () => {
    it('should fallback to current time for invalid timestamp', () => {
      const parser = new KeyValueLogParser();
      const beforeTest = new Date();
      
      // This will trigger the final fallback case in parseTimestamp (line 123)
      const result = parser.parseKeyValueLog('timestamp=completely_invalid_timestamp level=info message="test"', 'stdout');
      
      const afterTest = new Date();
      
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    it('should use default level fallback for unknown level strings', () => {
      const parser = new KeyValueLogParser();
      
      // Test unknown level with stdout (should default to 'info')
      const stdoutResult = parser.parseKeyValueLog('level=unknown_level message="test"', 'stdout');
      expect(stdoutResult.level).toBe('info'); // Line 148 stdout default
      
      // Test unknown level with stderr (should default to 'error')
      const stderrResult = parser.parseKeyValueLog('level=unknown_level message="test"', 'stderr');
      expect(stderrResult.level).toBe('error'); // Line 148 stderr default
    });
  });

  describe('Schema Validator Edge Cases', () => {
    it('should return valid when no schema is defined', () => {
      const validator = new LogSchemaValidator();
      
      // Line 44: validate without schema should return valid
      const result = validator.validate({ anything: 'goes' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle unknown property types in validation', () => {
      const validator = new LogSchemaValidator();
      
      const schema: LogSchema = {
        properties: {
          field: { type: 'unknown_type' as any } // Force unknown type
        }
      };
      
      validator.defineSchema(schema);
      
      // Line 161: validateType default case should return false
      const result = validator.validate({ field: 'any_value' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "field" must be of type unknown_type');
    });

    it('should validate string maxLength constraint', () => {
      const validator = new LogSchemaValidator();
      
      const schema: LogSchema = {
        properties: {
          shortField: { type: 'string', maxLength: 5 }
        }
      };
      
      validator.defineSchema(schema);
      
      // Line 175: maxLength validation
      const result = validator.validate({ shortField: 'this_is_too_long' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "shortField" must have at most 5 characters');
    });

    it('should validate array maxItems constraint', () => {
      const validator = new LogSchemaValidator();
      
      const schema: LogSchema = {
        properties: {
          smallArray: { type: 'array', maxItems: 2, items: { type: 'string' } }
        }
      };
      
      validator.defineSchema(schema);
      
      // Line 206: maxItems validation
      const result = validator.validate({ smallArray: ['one', 'two', 'three'] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "smallArray" must have at most 2 items');
    });
  });

  describe('Branch Coverage Completion', () => {
    it('should cover remaining JSON parser branches', () => {
      const parser = new JSONLogParser();
      
      // Test with invalid Date value that triggers Date validation
      const result1 = parser.parseJSONLog('{"timestamp": "not-a-valid-date-format", "level": "info", "message": "test"}', 'stdout');
      expect(result1.timestamp).toBeInstanceOf(Date);
      
      // Test with numeric timestamp that needs conversion
      const result2 = parser.parseJSONLog('{"timestamp": 1640995200, "level": "info", "message": "test"}', 'stdout');
      expect(result2.timestamp).toBeInstanceOf(Date);
      
      // Test with millisecond timestamp
      const result3 = parser.parseJSONLog('{"timestamp": 1640995200000, "level": "info", "message": "test"}', 'stdout');
      expect(result3.timestamp).toBeInstanceOf(Date);
    });

    it('should cover remaining key-value parser branches', () => {
      const parser = new KeyValueLogParser();
      
      // Test various timestamp formats to cover all branches
      const result1 = parser.parseKeyValueLog('timestamp=1640995200 level=info message="test"', 'stdout');
      expect(result1.timestamp).toBeInstanceOf(Date);
      
      // Test string numeric timestamp
      const result2 = parser.parseKeyValueLog('timestamp="1640995200" level=info message="test"', 'stdout');
      expect(result2.timestamp).toBeInstanceOf(Date);
      
      // Test various level mappings
      const result3 = parser.parseKeyValueLog('level=trace message="test"', 'stdout');
      expect(result3.level).toBe('debug');
      
      const result4 = parser.parseKeyValueLog('level=critical message="test"', 'stdout');
      expect(result4.level).toBe('error');
      
      const result5 = parser.parseKeyValueLog('level=information message="test"', 'stdout');
      expect(result5.level).toBe('info');
    });

    it('should cover schema validator complex validation branches', () => {
      const validator = new LogSchemaValidator();
      
      const schema: LogSchema = {
        required: ['field1'],
        properties: {
          field1: { type: 'object', required: ['nested'], properties: { nested: { type: 'string' } } },
          field2: { type: 'array', items: { type: 'object', properties: { prop: { type: 'number', min: 10, max: 20 } } } }
        }
      };
      
      validator.defineSchema(schema);
      
      // Complex validation with nested objects and arrays
      const result = validator.validate({
        field1: { nested: 'valid' },
        field2: [{ prop: 15 }, { prop: 25 }] // Second item violates max constraint
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "field2[1].prop" must be at most 20');
    });
  });
});