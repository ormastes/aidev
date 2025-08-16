import { LogSchemaValidator, LogSchema, PropertySchema } from '../../src/external/schema-validator';

describe('LogSchemaValidator', () => {
  let validator: LogSchemaValidator;

  beforeEach(() => {
    validator = new LogSchemaValidator();
  });

  describe('defineSchema and getSchema', () => {
    it('should store and retrieve schema', () => {
      const schema: LogSchema = {
        required: ['message'],
        properties: {
          message: { type: 'string' }
        }
      };

      validator.defineSchema(schema);
      expect(validator.getSchema()).toEqual(schema);
    });

    it('should return undefined when no schema defined', () => {
      expect(validator.getSchema()).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should return valid when no schema is defined', () => {
      const result = validator.validate({ anything: 'goes' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('required fields validation', () => {
      beforeEach(() => {
        validator.defineSchema({
          required: ['level', 'message'],
          properties: {
            level: { type: 'string' },
            message: { type: 'string' }
          }
        });
      });

      it('should validate when all required fields are present', () => {
        const result = validator.validate({
          level: 'info',
          message: 'Test message'
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when required fields are missing', () => {
        const result = validator.validate({
          level: 'info'
          // message is missing
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Required field "message" is missing');
      });

      it('should fail when multiple required fields are missing', () => {
        const result = validator.validate({});

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors).toContain('Required field "level" is missing');
        expect(result.errors).toContain('Required field "message" is missing');
      });
    });

    describe('type validation', () => {
      beforeEach(() => {
        validator.defineSchema({
          properties: {
            stringField: { type: 'string' },
            numberField: { type: 'number' },
            booleanField: { type: 'boolean' },
            dateField: { type: 'date' },
            objectField: { type: 'object' },
            arrayField: { type: 'array' }
          }
        });
      });

      it('should validate correct types', () => {
        const result = validator.validate({
          stringField: 'text',
          numberField: 42,
          booleanField: true,
          dateField: new Date(),
          objectField: { key: 'value' },
          arrayField: [1, 2, 3]
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail on incorrect string type', () => {
        const result = validator.validate({
          stringField: 123
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "stringField" must be of type string');
      });

      it('should fail on incorrect number type', () => {
        const result = validator.validate({
          numberField: 'not a number'
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "numberField" must be of type number');
      });

      it('should validate date strings as dates', () => {
        const result = validator.validate({
          dateField: '2024-01-15T10:30:00.000Z'
        });

        expect(result.valid).toBe(true);
      });

      it('should fail on invalid date', () => {
        const result = validator.validate({
          dateField: 'not a date'
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "dateField" must be a valid date');
      });
    });

    describe('enum validation', () => {
      beforeEach(() => {
        validator.defineSchema({
          properties: {
            level: { 
              type: 'string',
              enum: ['debug', 'info', 'warn', 'error', 'fatal']
            }
          }
        });
      });

      it('should validate values in enum', () => {
        const result = validator.validate({ level: 'info' });
        expect(result.valid).toBe(true);
      });

      it('should fail for values not in enum', () => {
        const result = validator.validate({ level: 'trace' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "level" must be one of: debug, info, warn, error, fatal');
      });
    });

    describe('string constraints', () => {
      beforeEach(() => {
        validator.defineSchema({
          properties: {
            username: { 
              type: 'string',
              minLength: 3,
              maxLength: 20,
              pattern: '^[a-zA-Z0-9_]+$'
            }
          }
        });
      });

      it('should validate string within constraints', () => {
        const result = validator.validate({ username: 'john_doe123' });
        expect(result.valid).toBe(true);
      });

      it('should fail when string is too short', () => {
        const result = validator.validate({ username: 'ab' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "username" must have at least 3 characters');
      });

      it('should fail when string is too long', () => {
        const result = validator.validate({ username: 'a'.repeat(21) });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "username" must have at most 20 characters');
      });

      it('should fail when string does not match pattern', () => {
        const result = validator.validate({ username: 'john-doe!' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "username" does not match pattern ^[a-zA-Z0-9_]+$');
      });
    });

    describe('number constraints', () => {
      beforeEach(() => {
        validator.defineSchema({
          properties: {
            age: { 
              type: 'number',
              min: 0,
              max: 150
            }
          }
        });
      });

      it('should validate number within range', () => {
        const result = validator.validate({ age: 25 });
        expect(result.valid).toBe(true);
      });

      it('should fail when number is below minimum', () => {
        const result = validator.validate({ age: -5 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "age" must be at least 0');
      });

      it('should fail when number is above maximum', () => {
        const result = validator.validate({ age: 200 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "age" must be at most 150');
      });
    });

    describe('nested object validation', () => {
      beforeEach(() => {
        validator.defineSchema({
          properties: {
            user: {
              type: 'object',
              required: ['id', 'name'],
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string', pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$' }
              }
            }
          }
        });
      });

      it('should validate nested objects', () => {
        const result = validator.validate({
          user: {
            id: 123,
            name: 'John Doe',
            email: 'john@example.com'
          }
        });

        expect(result.valid).toBe(true);
      });

      it('should fail when nested required field is missing', () => {
        const result = validator.validate({
          user: {
            id: 123
            // name is missing
          }
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Required field "user.name" is missing');
      });

      it('should fail when nested field has wrong type', () => {
        const result = validator.validate({
          user: {
            id: '123', // should be number
            name: 'John'
          }
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "user.id" must be of type number');
      });
    });

    describe('array validation', () => {
      beforeEach(() => {
        validator.defineSchema({
          properties: {
            tags: {
              type: 'array',
              minItems: 1,
              maxItems: 5,
              items: { type: 'string' }
            }
          }
        });
      });

      it('should validate arrays within constraints', () => {
        const result = validator.validate({
          tags: ['tag1', 'tag2', 'tag3']
        });

        expect(result.valid).toBe(true);
      });

      it('should fail when array is too small', () => {
        const result = validator.validate({
          tags: []
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "tags" must have at least 1 items');
      });

      it('should fail when array is too large', () => {
        const result = validator.validate({
          tags: ['1', '2', '3', '4', '5', '6']
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "tags" must have at most 5 items');
      });

      it('should validate array item types', () => {
        const result = validator.validate({
          tags: ['tag1', 123, 'tag3'] // 123 should be string
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "tags[1]" must be of type string');
      });
    });

    describe('custom validation', () => {
      beforeEach(() => {
        validator.defineSchema({
          properties: {
            password: {
              type: 'string',
              validate: (value) => value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value),
              validationMessage: 'Password must be at least 8 characters with uppercase and number'
            }
          }
        });
      });

      it('should pass custom validation', () => {
        const result = validator.validate({
          password: 'Password123'
        });

        expect(result.valid).toBe(true);
      });

      it('should fail custom validation with custom message', () => {
        const result = validator.validate({
          password: 'weak'
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters with uppercase and number');
      });
    });

    describe('additional properties', () => {
      it('should allow additional properties by default', () => {
        validator.defineSchema({
          properties: {
            known: { type: 'string' }
          }
        });

        const result = validator.validate({
          known: 'value',
          unknown: 'also allowed'
        });

        expect(result.valid).toBe(true);
      });

      it('should reject additional properties when disabled', () => {
        validator.defineSchema({
          properties: {
            known: { type: 'string' }
          },
          additionalProperties: false
        });

        const result = validator.validate({
          known: 'value',
          unknown: 'not allowed'
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Additional property "unknown" is not allowed');
      });
    });
  });

  describe('validateLog', () => {
    it('should validate structured log entries', () => {
      validator.defineSchema({
        required: ['level', 'message'],
        properties: {
          level: { 
            type: 'string',
            enum: ['debug', 'info', 'warn', 'error', 'fatal']
          },
          message: { type: 'string' },
          timestamp: { type: 'date' },
          metadata: { type: 'object' }
        }
      });

      const log = {
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Test log',
        source: 'stdout' as const,
        metadata: { userId: 123 }
      };

      const result = validator.validate(log);
      expect(result.valid).toBe(true);
    });
  });
});