import { describe, it, expect } from '@jest/globals';
import {
  levenshteinDistance,
  findBestMatch,
  toKebabCase,
  toCamelCase,
  toPascalCase,
  wordWrap,
  center,
  truncate
} from '../../src/utils/string.js';

describe('String Utilities', () => {
  describe("levenshteinDistance", () => {
    it('should calculate distance between strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('hello', 'help')).toBe(2);
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', 'world')).toBe(5);
    });
  });

  describe("findBestMatch", () => {
    const candidates = ['deploy', 'destroy', 'delete', 'develop', 'debug'];

    it('should find similar commands', () => {
      expect(findBestMatch('deplyo', candidates)).toContain('deploy');
      expect(findBestMatch('delet', candidates)).toContain('delete');
      expect(findBestMatch('debg', candidates)).toContain('debug');
    });

    it('should limit suggestions', () => {
      const matches = findBestMatch('depl', candidates, 2);
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should filter by threshold', () => {
      const matches = findBestMatch('xyz', candidates);
      expect(matches).toHaveLength(0);
    });

    it('should handle empty input', () => {
      expect(findBestMatch('', candidates)).toEqual([]);
      expect(findBestMatch('test', [])).toEqual([]);
    });
  });

  describe('case conversions', () => {
    it('should convert to kebab-case', () => {
      expect(toKebabCase("helloWorld")).toBe('hello-world');
      expect(toKebabCase("HelloWorld")).toBe('hello-world');
      expect(toKebabCase('hello_world')).toBe('hello-world');
      expect(toKebabCase('hello world')).toBe('hello-world');
      expect(toKebabCase('HELLO_WORLD')).toBe('hello-world');
    });

    it('should convert to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe("helloWorld");
      expect(toCamelCase('hello_world')).toBe("helloWorld");
      expect(toCamelCase('hello world')).toBe("helloWorld");
      expect(toCamelCase('Hello-World')).toBe("helloWorld");
    });

    it('should convert to PascalCase', () => {
      expect(toPascalCase('hello-world')).toBe("HelloWorld");
      expect(toPascalCase('hello_world')).toBe("HelloWorld");
      expect(toPascalCase('hello world')).toBe("HelloWorld");
      expect(toPascalCase("helloWorld")).toBe("HelloWorld");
    });
  });

  describe("wordWrap", () => {
    it('should wrap text to specified width', () => {
      const text = 'This is a long sentence that needs to be wrapped';
      const wrapped = wordWrap(text, 20);
      
      expect(wrapped).toEqual([
        'This is a long',
        'sentence that needs',
        'to be wrapped'
      ]);
    });

    it('should handle single words longer than width', () => {
      const wrapped = wordWrap("supercalifragilisticexpialidocious", 10);
      expect(wrapped).toEqual(["supercalifragilisticexpialidocious"]);
    });

    it('should handle empty text', () => {
      expect(wordWrap('', 10)).toEqual([]);
    });
  });

  describe('center', () => {
    it('should center text', () => {
      expect(center('hello', 10)).toBe('  hello   ');
      expect(center('hi', 10)).toBe('    hi    ');
      expect(center('test', 10, '-')).toBe('---test---');
    });

    it('should handle text longer than width', () => {
      expect(center('hello world', 5)).toBe('hello world');
    });
  });

  describe("truncate", () => {
    it('should truncate long text', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
      expect(truncate('hello world', 20)).toBe('hello world');
    });

    it('should use custom suffix', () => {
      expect(truncate('hello world', 8, '…')).toBe('hello w…');
    });

    it('should handle edge cases', () => {
      expect(truncate('hi', 5)).toBe('hi');
      expect(truncate('hello', 5)).toBe('hello'); // 5 chars, no truncation needed
      expect(truncate('hello world', 8)).toBe('hello...');
    });
  });
});