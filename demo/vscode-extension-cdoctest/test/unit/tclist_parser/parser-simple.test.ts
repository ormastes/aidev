import { describe, test, expect, jest } from '@jest/globals';

// Mock vscode before importing parser
jest.mock('vscode', () => ({
  Range: jest.fn().mockImplementation((startLine: any, startChar: any, endLine: any, endChar: any) => {
    // Handle both constructor signatures
    if (typeof startLine === 'object' && startLine.line !== undefined) {
      // Position objects passed
      return {
        start: startLine,
        end: startChar
      };
    }
    // Numbers passed
    return {
      start: { line: startLine, character: startChar },
      end: { line: endLine, character: endChar }
    };
  }),
  Position: jest.fn((line: number, char: number) => ({
    line,
    character: char
  }))
}));

describe('Parser - Simple', () => {
  let parseMarkdown: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after mocking
    const parserModule = await import('../../../src/tclist_parser/parser');
    parseMarkdown = parserModule.parseMarkdown;
  });

  describe('parseMarkdown', () => {
    test('should parse basic test cases', () => {
      const content = '1 + 1 = 2\n2 + 3 = 5';
      const onTest = jest.fn();
      const onHeading = jest.fn();
      const events = { onTest, onHeading };

      parseMarkdown(content, events);

      expect(onTest).toHaveBeenCalledTimes(2);
      expect(onTest).toHaveBeenCalledWith(
        expect.any(Object), // range
        1, '+', 1, 2
      );
      expect(onTest).toHaveBeenCalledWith(
        expect.any(Object), // range
        2, '+', 3, 5
      );
    });

    test('should parse headings', () => {
      const content = '# Test Suite\n## Subsection';
      const onTest = jest.fn();
      const onHeading = jest.fn();
      const events = { onTest, onHeading };

      parseMarkdown(content, events);

      expect(onHeading).toHaveBeenCalledTimes(2);
      expect(onHeading).toHaveBeenCalledWith(
        expect.any(Object), // range
        'Test Suite',
        1
      );
      expect(onHeading).toHaveBeenCalledWith(
        expect.any(Object), // range
        'Subsection',
        2
      );
    });

    test('should handle mixed content', () => {
      const content = '# Math Tests\n5 * 2 = 10\n## More Tests\n8 / 4 = 2';
      const onTest = jest.fn();
      const onHeading = jest.fn();
      const events = { onTest, onHeading };

      parseMarkdown(content, events);

      expect(onHeading).toHaveBeenCalledTimes(2);
      expect(onTest).toHaveBeenCalledTimes(2);
    });

    test('should handle empty content', () => {
      const content = '';
      const onTest = jest.fn();
      const onHeading = jest.fn();
      const events = { onTest, onHeading };

      parseMarkdown(content, events);

      expect(onTest).not.toHaveBeenCalled();
      expect(onHeading).not.toHaveBeenCalled();
    });

    test('should handle content with no matches', () => {
      const content = 'This is just regular text\nNo test cases here\nJust plain content';
      const onTest = jest.fn();
      const onHeading = jest.fn();
      const events = { onTest, onHeading };

      parseMarkdown(content, events);

      expect(onTest).not.toHaveBeenCalled();
      expect(onHeading).not.toHaveBeenCalled();
    });

    test('should parse different operators', () => {
      const content = '1 + 1 = 2\n4 - 2 = 2\n3 * 2 = 6\n8 / 4 = 2';
      const onTest = jest.fn();
      const onHeading = jest.fn();
      const events = { onTest, onHeading };

      parseMarkdown(content, events);

      expect(onTest).toHaveBeenCalledTimes(4);
      expect(onTest).toHaveBeenCalledWith(expect.any(Object), 1, '+', 1, 2);
      expect(onTest).toHaveBeenCalledWith(expect.any(Object), 4, '-', 2, 2);
      expect(onTest).toHaveBeenCalledWith(expect.any(Object), 3, '*', 2, 6);
      expect(onTest).toHaveBeenCalledWith(expect.any(Object), 8, '/', 4, 2);
    });
  });
});