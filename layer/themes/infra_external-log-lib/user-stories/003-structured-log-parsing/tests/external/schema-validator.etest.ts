import { LogSchemaValidator, LogSchema } from '../../src/external/schema-validator';
import { StructuredLogEntry } from '../../src/external/json-log-parser';

describe('Log Schema Validator External Test', () => {
  let validator: LogSchemaValidator;

  beforeEach(() => {
    validator = new LogSchemaValidator();
  });

  describe('defineSchema', () => {
    it('should define a basic schema', () => {
      const schema: LogSchema = {
        required: ['timestamp', 'level', 'message'],
        properties: {
          timestamp: { type: 'date' },
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
          message: { type: 'string', minLength: 1 }
        }
      };

      validator.defineSchema(schema);
      expect(validator.getSchema()).toEqual(schema);
    });

    it('should define schema with nested properties', () => {
      const schema: LogSchema = {
        required: ['timestamp', 'level'],
        properties: {
          timestamp: { type: 'date' },
          level: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              email: { type: 'string', pattern: '^[^@]+@[^@]+$' }
            }
          }
        }
      };

      validator.defineSchema(schema);
      expect(validator.getSchema()).toEqual(schema);
    });
  });

  describe('validate', () => {
    it('should validate a log entry against schema', () => {
      const schema: LogSchema = {
        required: ['timestamp', 'level', 'message'],
        properties: {
          timestamp: { type: 'date' },
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
          message: { type: 'string' }
        }
      };

      validator.defineSchema(schema);

      const validLog: StructuredLogEntry = {
        timestamp: new Date(),
        level: 'info',
        message: 'Test message',
        source: 'stdout'
      };

      const result = validator.validate(validLog);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const schema: LogSchema = {
        required: ['timestamp', 'level', 'message'],
        properties: {
          timestamp: { type: 'date' },
          level: { type: 'string' },
          message: { type: 'string' }
        }
      };

      validator.defineSchema(schema);

      const invalidLog: any = {
        timestamp: new Date(),
        level: 'info'
        // missing message
      };

      const result = validator.validate(invalidLog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: message');
    });

    it('should validate type constraints', () => {
      const schema: LogSchema = {
        properties: {
          timestamp: { type: 'date' },
          level: { type: 'string' },
          count: { type: 'number' },
          active: { type: 'boolean' }
        }
      };

      validator.defineSchema(schema);

      const invalidLog: any = {
        timestamp: 'not a date',
        level: 123, // should be string
        count: 'not a number',
        active: 'yes' // should be boolean
      };

      const result = validator.validate(invalidLog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "timestamp" must be a valid date');
      expect(result.errors).toContain('Field "level" must be of type string');
      expect(result.errors).toContain('Field "count" must be of type number');
      expect(result.errors).toContain('Field "active" must be of type boolean');
    });

    it('should validate enum constraints', () => {
      const schema: LogSchema = {
        properties: {
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
          environment: { type: 'string', enum: ['dev', 'staging', 'prod'] }
        }
      };

      validator.defineSchema(schema);

      const invalidLog: any = {
        level: 'trace', // not in enum
        environment: 'test' // not in enum
      };

      const result = validator.validate(invalidLog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "level" must be one of: debug, info, warn, error');
      expect(result.errors).toContain('Field "environment" must be one of: dev, staging, prod');
    });

    it('should validate string constraints', () => {
      const schema: LogSchema = {
        properties: {
          message: { type: 'string', minLength: 5, maxLength: 100 },
          code: { type: 'string', pattern: '^[A-Z]{3}-\\d{3}$' }
        }
      };

      validator.defineSchema(schema);

      const invalidLog: any = {
        message: 'Hi', // too short
        code: 'ABC123' // doesn't match pattern
      };

      const result = validator.validate(invalidLog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "message" must have at least 5 characters');
      expect(result.errors).toContain('Field "code" does not match pattern: ^[A-Z]{3}-\\d{3}$');
    });

    it('should validate number constraints', () => {
      const schema: LogSchema = {
        properties: {
          port: { type: 'number', min: 1, max: 65535 },
          percentage: { type: 'number', min: 0, max: 100 }
        }
      };

      validator.defineSchema(schema);

      const invalidLog: any = {
        port: 70000, // too high
        percentage: -10 // too low
      };

      const result = validator.validate(invalidLog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "port" must be at most 65535');
      expect(result.errors).toContain('Field "percentage" must be at least 0');
    });

    it('should validate nested objects', () => {
      const schema: LogSchema = {
        properties: {
          metadata: {
            type: 'object',
            required: ['version'],
            properties: {
              version: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      };

      validator.defineSchema(schema);

      const invalidLog: any = {
        metadata: {
          // missing required version
          tags: ['tag1', 123] // invalid item type
        }
      };

      const result = validator.validate(invalidLog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field in metadata: version');
      expect(result.errors).toContain('Field "metadata.tags[1]" must be of type string');
    });

    it('should validate arrays', () => {
      const schema: LogSchema = {
        properties: {
          tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
          scores: { type: 'array', items: { type: 'number', min: 0, max: 100 } }
        }
      };

      validator.defineSchema(schema);

      const invalidLog: any = {
        tags: [], // too few items
        scores: [95, 105, -5] // values out of range
      };

      const result = validator.validate(invalidLog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "tags" must have at least 1 items');
      expect(result.errors).toContain('Field "scores[1]" must be at most 100');
      expect(result.errors).toContain('Field "scores[2]" must be at least 0');
    });

    it('should handle optional fields', () => {
      const schema: LogSchema = {
        required: ['level'],
        properties: {
          level: { type: 'string' },
          optional: { type: 'string' }
        }
      };

      validator.defineSchema(schema);

      const validLog: any = {
        level: 'info'
        // optional field not present
      };

      const result = validator.validate(validLog);
      expect(result.valid).toBe(true);
    });

    it('should allow additional properties by default', () => {
      const schema: LogSchema = {
        properties: {
          level: { type: 'string' }
        }
      };

      validator.defineSchema(schema);

      const logWithExtra: any = {
        level: 'info',
        extra: 'additional field'
      };

      const result = validator.validate(logWithExtra);
      expect(result.valid).toBe(true);
    });

    it('should reject additional properties when specified', () => {
      const schema: LogSchema = {
        additionalProperties: false,
        properties: {
          level: { type: 'string' }
        }
      };

      validator.defineSchema(schema);

      const logWithExtra: any = {
        level: 'info',
        extra: 'additional field'
      };

      const result = validator.validate(logWithExtra);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Additional property "extra" is not allowed');
    });

    it('should validate custom validation functions', () => {
      const schema: LogSchema = {
        properties: {
          timestamp: {
            type: 'date',
            validate: (value: Date) => {
              const now = new Date();
              const hourAgo = new Date(now.getTime() - 3600000);
              return value >= hourAgo && value <= now;
            },
            validationMessage: 'Timestamp must be within the last hour'
          }
        }
      };

      validator.defineSchema(schema);

      const oldTimestamp = new Date('2020-01-01');
      const invalidLog: any = {
        timestamp: oldTimestamp
      };

      const result = validator.validate(invalidLog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timestamp must be within the last hour');
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple log entries', () => {
      const schema: LogSchema = {
        required: ['level'],
        properties: {
          level: { type: 'string', enum: ['info', 'error'] }
        }
      };

      validator.defineSchema(schema);

      const logs = [
        { level: 'info', message: 'Valid 1' },
        { level: 'debug', message: 'Invalid level' },
        { message: 'Missing level' },
        { level: 'error', message: 'Valid 2' }
      ];

      const results = validator.validateBatch(logs);
      
      expect(results.length).toBe(4);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(false);
      expect(results[3].valid).toBe(true);
    });
  });

  describe('createValidationError', () => {
    it('should create formatted validation error for invalid log', () => {
      const schema: LogSchema = {
        required: ['timestamp', 'level', 'message'],
        properties: {
          timestamp: { type: 'date' },
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
          message: { type: 'string', minLength: 1 }
        }
      };

      validator.defineSchema(schema);

      const invalidLog: any = {
        timestamp: 'invalid',
        level: 'trace',
        // missing message
      };

      const error = validator.createValidationError(invalidLog);
      
      expect(error).toEqual({
        timestamp: expect.any(Date),
        level: 'error',
        message: expect.stringContaining('Invalid log format:'),
        source: 'validation' as any,
        metadata: {
          validationErrors: expect.arrayContaining([
            'Field "timestamp" must be a valid date',
            'Field "level" must be one of: debug, info, warn, error',
            'Missing required field: message'
          ]),
          originalLog: invalidLog
        }
      });
    });
  });
});