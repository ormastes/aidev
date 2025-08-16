const {
  capitalize,
  reverse,
  isPalindrome,
  truncate,
  countWords,
  toSnakeCase,
  toCamelCase,
  removeWhitespace,
  extractNumbers,
  replaceAll
} = require('./string');

describe('String Utils', () => {
  describe("capitalize", () => {
    test('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    test('handles empty string', () => {
      expect(capitalize('')).toBe('');
    });

    test('handles null/undefined', () => {
      expect(capitalize(null)).toBe('');
      expect(capitalize(undefined)).toBe('');
    });

    test('handles already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
  });

  describe('reverse', () => {
    test('reverses string', () => {
      expect(reverse('hello')).toBe('olleh');
    });

    test('reverses empty string', () => {
      expect(reverse('')).toBe('');
    });

    test('handles palindrome', () => {
      expect(reverse('racecar')).toBe('racecar');
    });
  });

  describe("isPalindrome", () => {
    test('identifies palindrome', () => {
      expect(isPalindrome('racecar')).toBe(true);
    });

    test('handles case insensitive', () => {
      expect(isPalindrome('RaceCar')).toBe(true);
    });

    test('ignores non-alphanumeric', () => {
      expect(isPalindrome('A man, a plan, a canal: Panama')).toBe(true);
    });

    test('identifies non-palindrome', () => {
      expect(isPalindrome('hello')).toBe(false);
    });
  });

  describe("truncate", () => {
    test('truncates long string', () => {
      expect(truncate('Hello world', 5)).toBe('Hello...');
    });

    test('keeps short string', () => {
      expect(truncate('Hi', 5)).toBe('Hi');
    });

    test('custom suffix', () => {
      expect(truncate('Hello world', 5, '→')).toBe('Hello→');
    });

    test('exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe("countWords", () => {
    test('counts words', () => {
      expect(countWords('Hello world')).toBe(2);
    });

    test('handles multiple spaces', () => {
      expect(countWords('  Hello   world  ')).toBe(2);
    });

    test('handles empty string', () => {
      expect(countWords('')).toBe(0);
    });

    test('handles null/undefined', () => {
      expect(countWords(null)).toBe(0);
      expect(countWords(undefined)).toBe(0);
    });

    test('handles whitespace only', () => {
      expect(countWords('   ')).toBe(0);
    });
  });

  describe("toSnakeCase", () => {
    test('converts camelCase', () => {
      expect(toSnakeCase("helloWorld")).toBe('hello_world');
    });

    test('converts PascalCase', () => {
      expect(toSnakeCase("HelloWorld")).toBe('hello_world');
    });

    test('handles spaces', () => {
      expect(toSnakeCase('hello world')).toBe('hello_world');
    });

    test('handles special characters', () => {
      expect(toSnakeCase('hello-world!')).toBe('hello_world');
    });
  });

  describe("toCamelCase", () => {
    test('converts snake_case', () => {
      expect(toCamelCase('hello_world')).toBe("helloWorld");
    });

    test('converts spaces', () => {
      expect(toCamelCase('hello world')).toBe("helloWorld");
    });

    test('handles single word', () => {
      expect(toCamelCase('hello')).toBe('hello');
    });
  });

  describe("removeWhitespace", () => {
    test('removes spaces', () => {
      expect(removeWhitespace('hello world')).toBe("helloworld");
    });

    test('removes tabs and newlines', () => {
      expect(removeWhitespace('hello\tworld\n')).toBe("helloworld");
    });

    test('handles no whitespace', () => {
      expect(removeWhitespace("helloworld")).toBe("helloworld");
    });
  });

  describe("extractNumbers", () => {
    test('extracts numbers', () => {
      expect(extractNumbers("abc123def456")).toEqual([123, 456]);
    });

    test('handles no numbers', () => {
      expect(extractNumbers('abcdef')).toEqual([]);
    });

    test('handles only numbers', () => {
      expect(extractNumbers('123')).toEqual([123]);
    });

    test('handles mixed content', () => {
      expect(extractNumbers('Price: $42.50')).toEqual([42, 50]);
    });
  });

  describe("replaceAll", () => {
    test('replaces all occurrences', () => {
      expect(replaceAll('hello hello', 'hello', 'hi')).toBe('hi hi');
    });

    test('handles no matches', () => {
      expect(replaceAll('hello world', 'bye', 'hi')).toBe('hello world');
    });

    test('handles empty replacement', () => {
      expect(replaceAll('hello world', 'o', '')).toBe('hell wrld');
    });
  });
});