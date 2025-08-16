import { describe, test, expect } from '@jest/globals';
import {
  validateNonEmptyString,
  validateRange,
  validateEmail,
  validateArrayLength,
  validateUrl,
  validatePort,
  validateFilePath,
  validateRequiredFields,
} from '../utils/validation';

describe('Validation Utilities', () => {
  describe('validateNonEmptyString', () => {
    test('should validate non-empty strings', () => {
      const result = validateNonEmptyString('test', 'Name');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject empty strings', () => {
      const result = validateNonEmptyString('', 'Name');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    test('should reject whitespace-only strings', () => {
      const result = validateNonEmptyString('   ', 'Name');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('whitespace only');
    });

    test('should reject non-string values', () => {
      const result = validateNonEmptyString(123, 'Name');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a non-empty string');
    });

    test('should reject null and undefined', () => {
      expect(validateNonEmptyString(null, 'Name').isValid).toBe(false);
      expect(validateNonEmptyString(undefined, 'Name').isValid).toBe(false);
    });
  });

  describe('validateRange', () => {
    test('should validate numbers within range', () => {
      const result = validateRange(50, 0, 100, 'Score');
      expect(result.isValid).toBe(true);
    });

    test('should accept boundary values', () => {
      expect(validateRange(0, 0, 100, 'Score').isValid).toBe(true);
      expect(validateRange(100, 0, 100, 'Score').isValid).toBe(true);
    });

    test('should reject numbers outside range', () => {
      const result = validateRange(150, 0, 100, 'Score');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between 0 and 100');
    });

    test('should reject non-numeric values', () => {
      const result = validateRange('50' as any, 0, 100, 'Score');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a valid number');
    });

    test('should reject NaN', () => {
      const result = validateRange(NaN, 0, 100, 'Score');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+tag@company.org',
        'test123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email).isValid).toBe(true);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test @example.com',
        'test@example',
        'test..test@example.com',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email).isValid).toBe(false);
      });
    });

    test('should reject non-string values', () => {
      expect(validateEmail(123 as any).isValid).toBe(false);
      expect(validateEmail(null as any).isValid).toBe(false);
    });
  });

  describe('validateArrayLength', () => {
    test('should validate arrays within length bounds', () => {
      const result = validateArrayLength([1, 2, 3], 1, 5, 'Items');
      expect(result.isValid).toBe(true);
    });

    test('should accept empty arrays when min is 0', () => {
      const result = validateArrayLength([], 0, 5, 'Items');
      expect(result.isValid).toBe(true);
    });

    test('should reject arrays below minimum length', () => {
      const result = validateArrayLength([1], 2, 5, 'Items');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 2');
    });

    test('should reject arrays above maximum length', () => {
      const result = validateArrayLength([1, 2, 3, 4, 5, 6], 1, 5, 'Items');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot have more than 5');
    });

    test('should reject non-array values', () => {
      const result = validateArrayLength('not an array' as any, 1, 5, 'Items');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be an array');
    });
  });

  describe('validateUrl', () => {
    test('should validate correct URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://www.example.com',
        'https://example.com/path',
        'http://localhost:3000',
        'https://example.com?query=value',
      ];

      validUrls.forEach(url => {
        expect(validateUrl(url).isValid).toBe(true);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'not a url',
        'http://',
        'example.com',
        '//example.com',
        'ftp:/example.com',
      ];

      invalidUrls.forEach(url => {
        expect(validateUrl(url).isValid).toBe(false);
      });
    });
  });

  describe('validatePort', () => {
    test('should validate valid port numbers', () => {
      expect(validatePort(80).isValid).toBe(true);
      expect(validatePort(443).isValid).toBe(true);
      expect(validatePort(3000).isValid).toBe(true);
      expect(validatePort(65535).isValid).toBe(true);
    });

    test('should reject invalid port numbers', () => {
      expect(validatePort(0).isValid).toBe(false);
      expect(validatePort(65536).isValid).toBe(false);
      expect(validatePort(-1).isValid).toBe(false);
    });
  });

  describe('validateFilePath', () => {
    test('should validate valid file paths', () => {
      const validPaths = [
        '/home/user/file.txt',
        'C:\\Users\\file.txt',
        './relative/path.js',
        '../parent/file.md',
        'simple.txt',
      ];

      validPaths.forEach(path => {
        expect(validateFilePath(path).isValid).toBe(true);
      });
    });

    test('should reject paths with invalid characters', () => {
      const invalidPaths = [
        'file<name>.txt',
        'file>name.txt',
        'file:name.txt',
        'file"name.txt',
        'file|name.txt',
        'file?name.txt',
        'file*name.txt',
      ];

      invalidPaths.forEach(path => {
        expect(validateFilePath(path).isValid).toBe(false);
      });
    });

    test('should reject non-string values', () => {
      expect(validateFilePath(null as any).isValid).toBe(false);
      expect(validateFilePath(123 as any).isValid).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    test('should validate objects with all required fields', () => {
      const obj = { name: 'Test', age: 25, email: 'test@example.com' };
      const result = validateRequiredFields(obj, ['name', 'age', 'email']);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toBeUndefined();
    });

    test('should detect missing fields', () => {
      const obj = { name: 'Test', age: 25 };
      const result = validateRequiredFields(obj, ['name', 'age', 'email']);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['email']);
    });

    test('should detect multiple missing fields', () => {
      const obj = { name: 'Test' };
      const result = validateRequiredFields(obj, ['name', 'age', 'email', 'phone']);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['age', 'email', 'phone']);
    });

    test('should handle empty objects', () => {
      const result = validateRequiredFields({}, ['name', 'age']);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['name', 'age']);
    });

    test('should handle no required fields', () => {
      const result = validateRequiredFields({ any: 'value' }, []);
      expect(result.isValid).toBe(true);
    });
  });
});