import { validateEmail, validatePort } from '../../children/utils/validation';
import { toCamelCase, toKebabCase, capitalize } from '../../children/utils/string-utils';
import { isPortAvailable } from '../../children/utils/port-management';

describe('Simple Coverage Tests', () => {
  describe('Validation Utils', () => {
    it('should validate email addresses', () => {
      expect(validateEmail('test@example.com').isValid).toBe(true);
      expect(validateEmail('invalid').isValid).toBe(false);
    });

    it('should validate port numbers', () => {
      expect(validatePort(3000).isValid).toBe(true);
      expect(validatePort(80).isValid).toBe(true);
      expect(validatePort(0).isValid).toBe(false);
      expect(validatePort(70000).isValid).toBe(false);
    });
  });

  describe('String Utils', () => {
    it('should convert to camel case', () => {
      expect(toCamelCase('hello-world')).toBe("helloWorld");
      expect(toCamelCase('test_case_string')).toBe("testCaseString");
    });

    it('should convert to kebab case', () => {
      expect(toKebabCase("HelloWorld")).toBe('hello-world');
      expect(toKebabCase("testCase")).toBe('test-case');
    });

    it('should capitalize strings', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
    });
  });

  describe('Port Management', () => {
    it('should check if port is available', async () => {
      const isAvailable = await isPortAvailable(3000);
      expect(typeof isAvailable).toBe('boolean');
    });
  });
});