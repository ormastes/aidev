import {
  validateNonEmptyString,
  validateRange,
  validateEmail,
  validateArrayLength,
  validateUrl,
  validatePort,
  validateFilePath,
  validateRequiredFields
} from '../../children/utils/validation';

describe('Validation Utils', () => {
  describe("validateNonEmptyString", () => {
    it('should validate non-empty string', () => {
      const result = validateNonEmptyString('hello', 'name');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty string', () => {
      const result = validateNonEmptyString('', 'name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('name must be a non-empty string');
    });

    it('should reject whitespace only string', () => {
      const result = validateNonEmptyString('   ', 'name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('name cannot be empty or whitespace only');
    });

    it('should reject null', () => {
      const result = validateNonEmptyString(null, 'name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('name must be a non-empty string');
    });

    it('should reject undefined', () => {
      const result = validateNonEmptyString(undefined, 'name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('name must be a non-empty string');
    });

    it('should reject non-string values', () => {
      expect(validateNonEmptyString(123, 'name').isValid).toBe(false);
      expect(validateNonEmptyString(true, 'name').isValid).toBe(false);
      expect(validateNonEmptyString({}, 'name').isValid).toBe(false);
      expect(validateNonEmptyString([], 'name').isValid).toBe(false);
    });

    it('should accept string with mixed whitespace and content', () => {
      const result = validateNonEmptyString('  hello world  ', 'name');
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateRange", () => {
    it('should validate number within range', () => {
      const result = validateRange(5, 1, 10, 'score');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate number at minimum boundary', () => {
      const result = validateRange(1, 1, 10, 'score');
      expect(result.isValid).toBe(true);
    });

    it('should validate number at maximum boundary', () => {
      const result = validateRange(10, 1, 10, 'score');
      expect(result.isValid).toBe(true);
    });

    it('should reject number below range', () => {
      const result = validateRange(0, 1, 10, 'score');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('score must be between 1 and 10');
    });

    it('should reject number above range', () => {
      const result = validateRange(11, 1, 10, 'score');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('score must be between 1 and 10');
    });

    it('should reject NaN', () => {
      const result = validateRange(NaN, 1, 10, 'score');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('score must be a valid number');
    });

    it('should reject non-number values', () => {
      const result = validateRange('5' as any, 1, 10, 'score');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('score must be a valid number');
    });

    it('should handle negative ranges', () => {
      const result = validateRange(-5, -10, -1, "temperature");
      expect(result.isValid).toBe(true);
    });

    it('should handle decimal numbers', () => {
      const result = validateRange(3.14, 0, 5, 'pi');
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateEmail", () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+test@example.org',
        'test123@test-domain.com',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'test@',
        'test @ example.com',
        'test@.com',
        'test@domain',
        'test..test@example.com',
        ''
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid email format');
      });
    });

    it('should reject non-string values', () => {
      const result = validateEmail(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email must be a string');
    });

    it('should reject undefined', () => {
      const result = validateEmail(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email must be a string');
    });
  });

  describe("validateArrayLength", () => {
    it('should validate array within length bounds', () => {
      const result = validateArrayLength([1, 2, 3], 1, 5, 'items');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate array at minimum length', () => {
      const result = validateArrayLength([1], 1, 5, 'items');
      expect(result.isValid).toBe(true);
    });

    it('should validate array at maximum length', () => {
      const result = validateArrayLength([1, 2, 3, 4, 5], 1, 5, 'items');
      expect(result.isValid).toBe(true);
    });

    it('should reject array below minimum length', () => {
      const result = validateArrayLength([], 1, 5, 'items');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('items must have at least 1 item(s)');
    });

    it('should reject array above maximum length', () => {
      const result = validateArrayLength([1, 2, 3, 4, 5, 6], 1, 5, 'items');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('items cannot have more than 5 items');
    });

    it('should reject non-array values', () => {
      const result = validateArrayLength('not an array' as any, 1, 5, 'items');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('items must be an array');
    });

    it('should handle empty array with 0 minimum', () => {
      const result = validateArrayLength([], 0, 5, 'items');
      expect(result.isValid).toBe(true);
    });

    it('should handle arrays with mixed types', () => {
      const result = validateArrayLength([1, 'two', { three: 3 }, null], 1, 10, 'mixed');
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateUrl", () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org/path',
        'https://sub.domain.com:8080/path?query=1',
        'ftp://files.example.com',
        'file:///path/to/file',
        'https://user:pass@example.com',
        'http://localhost:3000',
        'https://example.com/path#anchor'
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        '//example.com',
        'example.com',
        'http://example',
        ':8080',
        ''
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });
    });

    it('should handle special protocols', () => {
      const result = validateUrl('ws://websocket.example.com');
      expect(result.isValid).toBe(true);
    });
  });

  describe("validatePort", () => {
    it('should validate valid port numbers', () => {
      const validPorts = [80, 443, 3000, 8080, 1, 65535];

      validPorts.forEach(port => {
        const result = validatePort(port);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid port numbers', () => {
      const invalidPorts = [0, -1, 65536, 100000];

      invalidPorts.forEach(port => {
        const result = validatePort(port);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Port must be between 1 and 65535');
      });
    });

    it('should reject non-numeric values', () => {
      const result = validatePort('8080' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Port must be a valid number');
    });
  });

  describe("validateFilePath", () => {
    it('should validate correct file paths', () => {
      const validPaths = [
        '/path/to/file.txt',
        'relative/path/file.js',
        '../parent/file.json',
        './current/file.ts',
        'C:\\Windows\\System32\\file.exe',
        'file.txt',
        '/home/user/documents/my-file_123.pdf'
      ];

      validPaths.forEach(path => {
        const result = validateFilePath(path);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject paths with invalid characters', () => {
      const invalidPaths = [
        'file<name>.txt',
        'file>name.txt',
        'file:name.txt',
        'file"name.txt',
        'file|name.txt',
        'file?name.txt',
        'file*name.txt',
        'file\0name.txt'
      ];

      invalidPaths.forEach(path => {
        const result = validateFilePath(path);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('File path contains invalid characters');
      });
    });

    it('should reject non-string values', () => {
      const result = validateFilePath(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File path must be a string');
    });

    it('should reject empty string', () => {
      const result = validateFilePath('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File path must be a string');
    });

    it('should allow Unix-style paths', () => {
      const result = validateFilePath('/usr/local/bin/script');
      expect(result.isValid).toBe(true);
    });

    it('should allow Windows-style paths without invalid chars', () => {
      const result = validateFilePath('C:\\Users\\Admin\\Documents');
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateRequiredFields", () => {
    it('should validate object with all required fields', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      const result = validateRequiredFields(obj, ['name', 'age', 'email']);
      
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toBeUndefined();
    });

    it('should detect missing fields', () => {
      const obj = { name: 'John', age: 30, email: undefined };
      const result = validateRequiredFields(obj, ['name', 'age', 'email']);
      
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['email']);
    });

    it('should detect multiple missing fields', () => {
      const obj = { name: 'John', age: undefined, email: undefined, phone: undefined };
      const result = validateRequiredFields(obj, ['name', 'age', 'email', 'phone']);
      
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['age', 'email', 'phone']);
    });

    it('should handle empty object', () => {
      const obj: Record<string, any> = {};
      const result = validateRequiredFields(obj, ['name', 'age']);
      
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['name', 'age']);
    });

    it('should handle no required fields', () => {
      const obj = { optional: 'value' };
      const result = validateRequiredFields(obj, []);
      
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toBeUndefined();
    });

    it('should treat falsy values as missing', () => {
      const obj = { name: '', age: 0, active: false, value: null };
      const result = validateRequiredFields(obj, ['name', 'age', 'active', 'value']);
      
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['name', 'age', 'active', 'value']);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: { name: 'John' },
        settings: { theme: 'dark' }
      };
      const result = validateRequiredFields(obj, ['user', "settings"]);
      
      expect(result.isValid).toBe(true);
    });

    it('should work with arrays as field values', () => {
      const obj = {
        items: [1, 2, 3],
        tags: []
      };
      const result = validateRequiredFields(obj, ['items', 'tags']);
      
      expect(result.isValid).toBe(false); // Empty array is falsy
      expect(result.missingFields).toEqual(['tags']);
    });
  });

  describe('edge cases', () => {
    it('should handle very long strings in validateNonEmptyString', () => {
      const longString = 'a'.repeat(10000);
      const result = validateNonEmptyString(longString, "longField");
      expect(result.isValid).toBe(true);
    });

    it('should handle extreme numbers in validateRange', () => {
      const result1 = validateRange(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER, 'big');
      expect(result1.isValid).toBe(true);

      const result2 = validateRange(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0, 'small');
      expect(result2.isValid).toBe(true);
    });

    it('should handle very long arrays in validateArrayLength', () => {
      const bigArray = Array(1000).fill(0);
      const result = validateArrayLength(bigArray, 0, 10000, "bigArray");
      expect(result.isValid).toBe(true);
    });

    it('should handle unicode in email validation', () => {
      const result = validateEmail('user@例え.jp');
      expect(result.isValid).toBe(true); // Modern email standards allow unicode domains
    });

    it('should handle very long URLs', () => {
      const longUrl = `https://example.com/${'a'.repeat(2000)}`;
      const result = validateUrl(longUrl);
      expect(result.isValid).toBe(true);
    });

    it('should handle unicode in file paths', () => {
      const unicodePath = '/path/to/文件.txt';
      const result = validateFilePath(unicodePath);
      expect(result.isValid).toBe(true);
    });
  });
});