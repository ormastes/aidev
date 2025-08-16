import {
  toCamelCase,
  toPascalCase,
  toKebabCase,
  toSnakeCase,
  toConstantCase,
  truncate,
  padString,
  dedent,
  escapeRegex,
  generateRandomString,
  capitalize,
  normalizeWhitespace,
  isValidIdentifier,
  pluralize,
  wrapText
} from '../../children/utils/string-utils';

describe('StringUtils', () => {
  describe('case conversion functions', () => {
    describe('toCamelCase', () => {
      it('should convert hyphenated string to camelCase', () => {
        expect(toCamelCase('hello-world')).toBe('helloWorld');
        expect(toCamelCase('test-case-conversion')).toBe('testCaseConversion');
      });

      it('should convert snake_case to camelCase', () => {
        expect(toCamelCase('hello_world')).toBe('helloWorld');
        expect(toCamelCase('test_case_conversion')).toBe('testCaseConversion');
      });

      it('should convert space-separated string to camelCase', () => {
        expect(toCamelCase('hello world')).toBe('helloWorld');
        expect(toCamelCase('test case conversion')).toBe('testCaseConversion');
      });

      it('should handle already camelCase strings', () => {
        expect(toCamelCase('helloWorld')).toBe('helloWorld');
        expect(toCamelCase('testCaseConversion')).toBe('testCaseConversion');
      });

      it('should handle mixed separators', () => {
        expect(toCamelCase('hello-world_test case')).toBe('helloWorldTestCase');
      });

      it('should handle numbers in strings', () => {
        expect(toCamelCase('test-123-case')).toBe('test123Case');
        expect(toCamelCase('version_2_beta')).toBe('version2Beta');
      });

      it('should handle empty strings', () => {
        expect(toCamelCase('')).toBe('');
      });

      it('should handle single characters', () => {
        expect(toCamelCase('a')).toBe('a');
        expect(toCamelCase('A')).toBe('a');
      });
    });

    describe('toPascalCase', () => {
      it('should convert hyphenated string to PascalCase', () => {
        expect(toPascalCase('hello-world')).toBe('HelloWorld');
        expect(toPascalCase('test-case-conversion')).toBe('TestCaseConversion');
      });

      it('should convert snake_case to PascalCase', () => {
        expect(toPascalCase('hello_world')).toBe('HelloWorld');
        expect(toPascalCase('test_case_conversion')).toBe('TestCaseConversion');
      });

      it('should convert camelCase to PascalCase', () => {
        expect(toPascalCase('helloWorld')).toBe('HelloWorld');
        expect(toPascalCase('testCaseConversion')).toBe('TestCaseConversion');
      });

      it('should handle already PascalCase strings', () => {
        expect(toPascalCase('HelloWorld')).toBe('HelloWorld');
        expect(toPascalCase('TestCaseConversion')).toBe('TestCaseConversion');
      });

      it('should handle single word', () => {
        expect(toPascalCase('hello')).toBe('Hello');
        expect(toPascalCase('test')).toBe('Test');
      });
    });

    describe('toKebabCase', () => {
      it('should convert camelCase to kebab-case', () => {
        expect(toKebabCase('helloWorld')).toBe('hello-world');
        expect(toKebabCase('testCaseConversion')).toBe('test-case-conversion');
      });

      it('should convert PascalCase to kebab-case', () => {
        expect(toKebabCase('HelloWorld')).toBe('hello-world');
        expect(toKebabCase('TestCaseConversion')).toBe('test-case-conversion');
      });

      it('should convert snake_case to kebab-case', () => {
        expect(toKebabCase('hello_world')).toBe('hello-world');
        expect(toKebabCase('test_case_conversion')).toBe('test-case-conversion');
      });

      it('should handle already kebab-case strings', () => {
        expect(toKebabCase('hello-world')).toBe('hello-world');
        expect(toKebabCase('test-case-conversion')).toBe('test-case-conversion');
      });

      it('should handle numbers', () => {
        expect(toKebabCase('version2Beta')).toBe('version2-beta');
        expect(toKebabCase('test123Case')).toBe('test123-case');
      });
    });

    describe('toSnakeCase', () => {
      it('should convert camelCase to snake_case', () => {
        expect(toSnakeCase('helloWorld')).toBe('hello_world');
        expect(toSnakeCase('testCaseConversion')).toBe('test_case_conversion');
      });

      it('should convert PascalCase to snake_case', () => {
        expect(toSnakeCase('HelloWorld')).toBe('hello_world');
        expect(toSnakeCase('TestCaseConversion')).toBe('test_case_conversion');
      });

      it('should convert kebab-case to snake_case', () => {
        expect(toSnakeCase('hello-world')).toBe('hello_world');
        expect(toSnakeCase('test-case-conversion')).toBe('test_case_conversion');
      });

      it('should handle already snake_case strings', () => {
        expect(toSnakeCase('hello_world')).toBe('hello_world');
        expect(toSnakeCase('test_case_conversion')).toBe('test_case_conversion');
      });
    });

    describe('toConstantCase', () => {
      it('should convert to CONSTANT_CASE', () => {
        expect(toConstantCase('helloWorld')).toBe('HELLO_WORLD');
        expect(toConstantCase('test-case')).toBe('TEST_CASE');
      });
    });
  });

  describe('text manipulation functions', () => {
    describe('truncate', () => {
      it('should truncate long strings', () => {
        expect(truncate('This is a very long string', 10)).toBe('This is...');
        expect(truncate('Hello World', 5)).toBe('He...');
      });

      it('should not truncate short strings', () => {
        expect(truncate('Short', 10)).toBe('Short');
        expect(truncate('Hello', 5)).toBe('Hello');
      });

      it('should handle custom suffix', () => {
        expect(truncate('Long string', 4, '***')).toBe('L***');
        expect(truncate('Another test', 7, ' [more]')).toBe(' [more]');
      });

      it('should handle empty strings', () => {
        expect(truncate('', 10)).toBe('');
      });

      it('should handle zero length', () => {
        expect(truncate('Hello', 0)).toBe('...');
      });
    });

    describe('padString', () => {
      it('should pad string to the end by default', () => {
        expect(padString('hello', 10)).toBe('hello     ');
        expect(padString('test', 8, '0')).toBe('test0000');
      });

      it('should pad string to the start', () => {
        expect(padString('hello', 10, ' ', 'start')).toBe('     hello');
        expect(padString('test', 8, '0', 'start')).toBe('0000test');
      });

      it('should pad string on both sides', () => {
        expect(padString('hi', 6, '-', 'both')).toBe('--hi--');
        expect(padString('test', 8, '0', 'both')).toBe('00test00');
      });

      it('should not pad if string is already long enough', () => {
        expect(padString('hello', 3)).toBe('hello');
        expect(padString('hello', 5)).toBe('hello');
      });
    });

    describe('dedent', () => {
      it('should remove common indentation', () => {
        const input = `
    line 1
    line 2
        nested line
    line 3`;
        const expected = `
line 1
line 2
    nested line
line 3`;
        expect(dedent(input)).toBe(expected);
      });

      it('should handle strings with no indentation', () => {
        const input = 'line 1\nline 2\nline 3';
        expect(dedent(input)).toBe(input);
      });

      it('should handle empty lines', () => {
        const input = `
    line 1

    line 2`;
        const expected = `
line 1

line 2`;
        expect(dedent(input)).toBe(expected);
      });
    });

    describe('wrapText', () => {
      it('should wrap text to specified width', () => {
        const text = 'This is a long line that should be wrapped';
        const wrapped = wrapText(text, 20);
        const lines = wrapped.split('\n');
        
        expect(lines.length).toBeGreaterThan(1);
        lines.forEach(line => {
          expect(line.length).toBeLessThanOrEqual(20);
        });
      });

      it('should handle text shorter than width', () => {
        expect(wrapText('Short text', 50)).toBe('Short text');
      });

      it('should handle single long word', () => {
        const longWord = 'verylongwordthatcannotbewrapped';
        const wrapped = wrapText(longWord, 10);
        expect(wrapped).toBe(longWord);
      });
    });
  });

  describe('utility functions', () => {
    describe('capitalize', () => {
      it('should capitalize first letter', () => {
        expect(capitalize('hello')).toBe('Hello');
        expect(capitalize('world')).toBe('World');
      });

      it('should handle already capitalized strings', () => {
        expect(capitalize('Hello')).toBe('Hello');
        expect(capitalize('World')).toBe('World');
      });

      it('should handle empty strings', () => {
        expect(capitalize('')).toBe('');
      });

      it('should handle single characters', () => {
        expect(capitalize('a')).toBe('A');
        expect(capitalize('z')).toBe('Z');
      });

      it('should handle numbers and special characters', () => {
        expect(capitalize('123test')).toBe('123test');
        expect(capitalize('!hello')).toBe('!hello');
      });
    });

    describe('normalizeWhitespace', () => {
      it('should normalize multiple spaces', () => {
        expect(normalizeWhitespace('hello    world')).toBe('hello world');
        expect(normalizeWhitespace('  test  case  ')).toBe('test case');
      });

      it('should handle tabs and newlines', () => {
        expect(normalizeWhitespace('hello\t\tworld')).toBe('hello world');
        expect(normalizeWhitespace('hello\n\nworld')).toBe('hello world');
      });

      it('should trim leading and trailing spaces', () => {
        expect(normalizeWhitespace('  hello world  ')).toBe('hello world');
      });
    });

    describe('isValidIdentifier', () => {
      it('should validate correct identifiers', () => {
        expect(isValidIdentifier('validName')).toBe(true);
        expect(isValidIdentifier('_private')).toBe(true);
        expect(isValidIdentifier('$variable')).toBe(true);
        expect(isValidIdentifier('name123')).toBe(true);
      });

      it('should reject invalid identifiers', () => {
        expect(isValidIdentifier('123invalid')).toBe(false);
        expect(isValidIdentifier('with-hyphen')).toBe(false);
        expect(isValidIdentifier('with space')).toBe(false);
        expect(isValidIdentifier('')).toBe(false);
      });
    });

    describe('pluralize', () => {
      it('should not pluralize singular count', () => {
        expect(pluralize('cat', 1)).toBe('cat');
        expect(pluralize('dog', 1)).toBe('dog');
      });

      it('should pluralize with simple s', () => {
        expect(pluralize('cat', 2)).toBe('cats');
        expect(pluralize('dog', 0)).toBe('dogs');
      });

      it('should handle words ending in y', () => {
        expect(pluralize('city', 2)).toBe('cities');
        expect(pluralize('baby', 3)).toBe('babies');
      });

      it('should handle words ending in s, x, z, ch, sh', () => {
        expect(pluralize('class', 2)).toBe('classes');
        expect(pluralize('box', 2)).toBe('boxes');
        expect(pluralize('buzz', 2)).toBe('buzzes');
        expect(pluralize('church', 2)).toBe('churches');
        expect(pluralize('dish', 2)).toBe('dishes');
      });

      it('should not pluralize words ending in vowel + y', () => {
        expect(pluralize('day', 2)).toBe('days');
        expect(pluralize('key', 2)).toBe('keys');
      });
    });

    describe('generateRandomString', () => {
      it('should generate string of specified length', () => {
        const result = generateRandomString(10);
        expect(result).toHaveLength(10);
        expect(typeof result).toBe('string');
      });

      it('should generate different strings on multiple calls', () => {
        const result1 = generateRandomString(8);
        const result2 = generateRandomString(8);
        expect(result1).not.toBe(result2);
      });

      it('should handle zero length', () => {
        expect(generateRandomString(0)).toBe('');
      });

      it('should use custom character set', () => {
        const result = generateRandomString(10, '01');
        expect(result).toMatch(/^[01]+$/);
        expect(result).toHaveLength(10);
      });
    });

    describe('escapeRegex', () => {
      it('should escape special regex characters', () => {
        expect(escapeRegex('hello.world')).toBe('hello\\.world');
        expect(escapeRegex('test*case')).toBe('test\\*case');
        expect(escapeRegex('pattern+match')).toBe('pattern\\+match');
        expect(escapeRegex('query?')).toBe('query\\?');
        expect(escapeRegex('[abc]')).toBe('\\[abc\\]');
        expect(escapeRegex('(group)')).toBe('\\(group\\)');
      });

      it('should handle strings without special characters', () => {
        expect(escapeRegex('hello world')).toBe('hello world');
        expect(escapeRegex('abc123')).toBe('abc123');
      });

      it('should handle empty strings', () => {
        expect(escapeRegex('')).toBe('');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      expect(toCamelCase(longString)).toBe(longString);
      expect(capitalize(longString)).toBe('A' + 'a'.repeat(9999));
    });

    it('should handle Unicode characters', () => {
      expect(toCamelCase('hello-世界')).toBe('hello世界');
      expect(capitalize('世界')).toBe('世界');
    });

    it('should handle null and undefined gracefully', () => {
      expect(() => toCamelCase(null as any)).toThrow();
      expect(() => toCamelCase(undefined as any)).toThrow();
    });

    it('should handle numbers as strings', () => {
      expect(toCamelCase('123-456')).toBe('123456');
      expect(toKebabCase('test123Case')).toBe('test123-case');
    });
  });
});