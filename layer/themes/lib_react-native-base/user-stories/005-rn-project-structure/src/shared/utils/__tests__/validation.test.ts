import { describe, test, expect } from '@jest/globals';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validatePhoneNumber,
  validateURL,
} from '../validation';

describe('React Native Validation Utilities', () => {
  describe('validateEmail', () => {
    test('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'admin+tag@company.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test @example.com',
        'test@.com',
        'test@domain',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    test('should validate strong passwords', () => {
      const result = validatePassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject short passwords', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should require uppercase letters', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    test('should require lowercase letters', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    test('should require numbers', () => {
      const result = validatePassword('NoNumbers!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should require special characters', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    test('should return multiple errors for weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('validateUsername', () => {
    test('should validate correct usernames', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'admin',
        'user_name_123',
      ];

      validUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(true);
      });
    });

    test('should reject invalid usernames', () => {
      const invalidUsernames = [
        'ab',  // too short
        'thisusernameiswaytoolong',  // too long
        'user@name',  // invalid character
        'user-name',  // invalid character
        'user name',  // space
        '123',  // minimum length
      ];

      invalidUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(false);
      });
    });

    test('should accept usernames with exact length boundaries', () => {
      expect(validateUsername('abc')).toBe(true);  // 3 chars - minimum
      expect(validateUsername('a'.repeat(20))).toBe(true);  // 20 chars - maximum
    });
  });

  describe('validatePhoneNumber', () => {
    test('should validate various phone number formats', () => {
      const validNumbers = [
        '1234567890',
        '123-456-7890',
        '(123) 456-7890',
        '(123)456-7890',
        '+1234567890',
        '123.456.7890',
        '123 456 7890',
      ];

      validNumbers.forEach(phone => {
        expect(validatePhoneNumber(phone)).toBe(true);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '123',  // too short
        'abc-def-ghij',  // letters
        '12-34-56',  // wrong format
        '123456789012345',  // too long
      ];

      invalidNumbers.forEach(phone => {
        expect(validatePhoneNumber(phone)).toBe(false);
      });
    });
  });

  describe('validateURL', () => {
    test('should validate correct URLs', () => {
      const validURLs = [
        'http://example.com',
        'https://www.example.com',
        'https://example.com/path',
        'http://localhost:3000',
        'https://example.com?query=value',
        'ftp://files.example.com',
      ];

      validURLs.forEach(url => {
        expect(validateURL(url)).toBe(true);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidURLs = [
        'not a url',
        'http://',
        'example.com',  // missing protocol
        '//example.com',  // missing protocol
        'ht!tp://example.com',  // invalid protocol
      ];

      invalidURLs.forEach(url => {
        expect(validateURL(url)).toBe(false);
      });
    });
  });
});