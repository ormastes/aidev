import {
  guards,
  createGuard,
  createValidator,
  and,
  or,
  shape,
  optional,
  nullable,
  arrayOf,
  literal,
  union,
  enumGuard,
  schemas
} from '../../src/guards';
import { z } from 'zod';

describe('Type Guards', () => {
  describe('Basic guards', () => {
    it('should check string types', () => {
      expect(guards.isString('hello')).toBe(true);
      expect(guards.isString(123)).toBe(false);
      expect(guards.isString(null)).toBe(false);
    });

    it('should check number types', () => {
      expect(guards.isNumber(123)).toBe(true);
      expect(guards.isNumber(0)).toBe(true);
      expect(guards.isNumber(NaN)).toBe(false);
      expect(guards.isNumber('123')).toBe(false);
    });

    it('should check boolean types', () => {
      expect(guards.isBoolean(true)).toBe(true);
      expect(guards.isBoolean(false)).toBe(true);
      expect(guards.isBoolean(1)).toBe(false);
    });

    it('should check array types', () => {
      expect(guards.isArray([])).toBe(true);
      expect(guards.isArray([1, 2, 3])).toBe(true);
      expect(guards.isArray('array')).toBe(false);
      
      // With item guard
      expect(guards.isArray([1, 2, 3], guards.isNumber)).toBe(true);
      expect(guards.isArray([1, '2', 3], guards.isNumber)).toBe(false);
    });

    it('should check object types', () => {
      expect(guards.isObject({})).toBe(true);
      expect(guards.isObject({ a: 1 })).toBe(true);
      expect(guards.isObject([])).toBe(false);
      expect(guards.isObject(null)).toBe(false);
    });

    it('should check null and undefined', () => {
      expect(guards.isNull(null)).toBe(true);
      expect(guards.isNull(undefined)).toBe(false);
      expect(guards.isUndefined(undefined)).toBe(true);
      expect(guards.isUndefined(null)).toBe(false);
      expect(guards.isNullish(null)).toBe(true);
      expect(guards.isNullish(undefined)).toBe(true);
      expect(guards.isNullish(0)).toBe(false);
    });
  });

  describe('Composite guards', () => {
    it('should combine guards with AND', () => {
      const isPositiveNumber = and(
        guards.isNumber,
        (n): n is number => typeof n === 'number' && n > 0
      );
      
      expect(isPositiveNumber(5)).toBe(true);
      expect(isPositiveNumber(-5)).toBe(false);
      expect(isPositiveNumber('5')).toBe(false);
    });

    it('should combine guards with OR', () => {
      const isStringOrNumber = or<[string, number]>(guards.isString, guards.isNumber);
      
      expect(isStringOrNumber('hello')).toBe(true);
      expect(isStringOrNumber(123)).toBe(true);
      expect(isStringOrNumber(true)).toBe(false);
    });

    it('should create shape guards', () => {
      const isUser = shape({
        id: guards.isNumber,
        name: guards.isString,
        active: guards.isBoolean
      });
      
      expect(isUser({ id: 1, name: 'John', active: true })).toBe(true);
      expect(isUser({ id: '1', name: 'John', active: true })).toBe(false);
      expect(isUser({ id: 1, name: 'John' })).toBe(false);
    });

    it('should handle optional values', () => {
      const isOptionalString = optional(guards.isString);
      
      expect(isOptionalString('hello')).toBe(true);
      expect(isOptionalString(undefined)).toBe(true);
      expect(isOptionalString(null)).toBe(false);
      expect(isOptionalString(123)).toBe(false);
    });

    it('should handle nullable values', () => {
      const isNullableString = nullable(guards.isString);
      
      expect(isNullableString('hello')).toBe(true);
      expect(isNullableString(null)).toBe(true);
      expect(isNullableString(undefined)).toBe(false);
      expect(isNullableString(123)).toBe(false);
    });
  });

  describe('Array guards', () => {
    it('should check array with constraints', () => {
      const isNumberArray = arrayOf(guards.isNumber);
      
      expect(isNumberArray([1, 2, 3])).toBe(true);
      expect(isNumberArray([1, '2', 3])).toBe(false);
      
      const isExactlyTwo = arrayOf(guards.isNumber, { exact: 2 });
      expect(isExactlyTwo([1, 2])).toBe(true);
      expect(isExactlyTwo([1])).toBe(false);
      
      const isMinTwo = arrayOf(guards.isNumber, { min: 2 });
      expect(isMinTwo([1, 2, 3])).toBe(true);
      expect(isMinTwo([1])).toBe(false);
      
      const isMaxTwo = arrayOf(guards.isNumber, { max: 2 });
      expect(isMaxTwo([1])).toBe(true);
      expect(isMaxTwo([1, 2, 3])).toBe(false);
    });
  });

  describe('Literal and union guards', () => {
    it('should check literal values', () => {
      const isHello = literal('hello');
      const isOne = literal(1);
      const isTrue = literal(true);
      
      expect(isHello('hello')).toBe(true);
      expect(isHello('world')).toBe(false);
      expect(isOne(1)).toBe(true);
      expect(isOne(2)).toBe(false);
      expect(isTrue(true)).toBe(true);
      expect(isTrue(false)).toBe(false);
    });

    it('should check union values', () => {
      const isDirection = union('north', 'south', 'east', 'west');
      
      expect(isDirection('north')).toBe(true);
      expect(isDirection('south')).toBe(true);
      expect(isDirection('up')).toBe(false);
    });

    it('should check enum values', () => {
      enum Status {
        Active = 'ACTIVE',
        Inactive = 'INACTIVE',
        Pending = 'PENDING'
      }
      
      const isStatus = enumGuard(Status);
      
      expect(isStatus(Status.Active)).toBe(true);
      expect(isStatus('ACTIVE')).toBe(true);
      expect(isStatus('INVALID')).toBe(false);
    });
  });

  describe('Zod integration', () => {
    it('should create guards from Zod schemas', () => {
      const userSchema = z.object({
        id: z.number(),
        email: z.string().email(),
        age: z.number().min(0).max(150)
      });
      
      const isUser = createGuard(userSchema);
      
      expect(isUser({ id: 1, email: 'test@example.com', age: 25 })).toBe(true);
      expect(isUser({ id: '1', email: 'test@example.com', age: 25 })).toBe(false);
      expect(isUser({ id: 1, email: 'invalid', age: 25 })).toBe(false);
    });

    it('should create validators from Zod schemas', () => {
      const schema = z.string().min(3).max(10);
      const validator = createValidator(schema);
      
      const result1 = validator('hello');
      expect(result1.success).toBe(true);
      expect(result1.data).toBe('hello');
      
      const result2 = validator('hi');
      expect(result2.success).toBe(false);
      expect(result2.errors).toBeDefined();
      
      const result3 = validator('this is too long');
      expect(result3.success).toBe(false);
    });
  });

  describe('Common schemas', () => {
    it('should validate non-empty strings', () => {
      const validator = createValidator(schemas.nonEmptyString);
      
      expect(validator('hello').success).toBe(true);
      expect(validator('').success).toBe(false);
      expect(validator(123).success).toBe(false);
    });

    it('should validate positive numbers', () => {
      const validator = createValidator(schemas.positiveNumber);
      
      expect(validator(5).success).toBe(true);
      expect(validator(0).success).toBe(false);
      expect(validator(-5).success).toBe(false);
    });

    it('should validate email addresses', () => {
      const validator = createValidator(schemas.email);
      
      expect(validator('test@example.com').success).toBe(true);
      expect(validator('invalid-email').success).toBe(false);
    });

    it('should validate URLs', () => {
      const validator = createValidator(schemas.url);
      
      expect(validator('https://example.com').success).toBe(true);
      expect(validator('not-a-url').success).toBe(false);
    });

    it('should validate ports', () => {
      const validator = createValidator(schemas.port);
      
      expect(validator(80).success).toBe(true);
      expect(validator(8080).success).toBe(true);
      expect(validator(0).success).toBe(false);
      expect(validator(70000).success).toBe(false);
    });
  });
});