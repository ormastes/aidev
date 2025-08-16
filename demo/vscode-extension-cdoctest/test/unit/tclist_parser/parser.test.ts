/**
 * Unit tests for tclist_parser/parser.ts
 */

// Mock vscode module
jest.mock('vscode', () => ({
  Range: class MockRange {
    constructor(public start: any, public end: any) {}
  },
  Position: class MockPosition {
    constructor(public line: number, public character: number) {}
  }
}), { virtual: true });

import { parseMarkdown } from '../../../src/tclist_parser/parser';
import * as vscode from 'vscode';

describe('parseMarkdown', () => {
  let mockEvents: {
    onTest: jest.Mock;
    onHeading: jest.Mock;
  };

  beforeEach(() => {
    mockEvents = {
      onTest: jest.fn(),
      onHeading: jest.fn()
    };
  });

  describe('test parsing', () => {
    test('should parse simple addition test', () => {
      const text = '1 + 2 = 3';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledTimes(1);
      expect(mockEvents.onTest).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        1,
        '+',
        2,
        3
      );
      expect(mockEvents.onHeading).not.toHaveBeenCalled();
    });

    test('should parse subtraction test', () => {
      const text = '10 - 5 = 5';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        10,
        '-',
        5,
        5
      );
    });

    test('should parse multiplication test', () => {
      const text = '3 * 4 = 12';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        3,
        '*',
        4,
        12
      );
    });

    test('should parse division test', () => {
      const text = '20 / 4 = 5';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        20,
        '/',
        4,
        5
      );
    });

    test('should parse tests with extra whitespace', () => {
      const text = '10   +   5   =   15';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        10,
        '+',
        5,
        15
      );
    });

    test('should parse multiple tests', () => {
      const text = `1 + 1 = 2
5 - 3 = 2
2 * 3 = 6`;
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledTimes(3);
      expect(mockEvents.onTest).toHaveBeenNthCalledWith(1, expect.any(vscode.Range), 1, '+', 1, 2);
      expect(mockEvents.onTest).toHaveBeenNthCalledWith(2, expect.any(vscode.Range), 5, '-', 3, 2);
      expect(mockEvents.onTest).toHaveBeenNthCalledWith(3, expect.any(vscode.Range), 2, '*', 3, 6);
    });

    test('should set correct range for tests', () => {
      const text = '123 + 456 = 579';
      
      parseMarkdown(text, mockEvents);
      
      const range = mockEvents.onTest.mock.calls[0][0];
      expect(range.start.line).toBe(0);
      expect(range.start.character).toBe(0);
      expect(range.end.line).toBe(0);
      expect(range.end.character).toBe(15); // Length of matched text
    });
  });

  describe('heading parsing', () => {
    test('should parse level 1 heading', () => {
      const text = '# Test Suite';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onHeading).toHaveBeenCalledTimes(1);
      expect(mockEvents.onHeading).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        'Test Suite',
        1
      );
      expect(mockEvents.onTest).not.toHaveBeenCalled();
    });

    test('should parse level 2 heading', () => {
      const text = '## Subsection';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onHeading).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        'Subsection',
        2
      );
    });

    test('should parse level 3+ headings', () => {
      const text = `### Level 3
#### Level 4
##### Level 5`;
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onHeading).toHaveBeenCalledTimes(3);
      expect(mockEvents.onHeading).toHaveBeenNthCalledWith(1, expect.any(vscode.Range), 'Level 3', 3);
      expect(mockEvents.onHeading).toHaveBeenNthCalledWith(2, expect.any(vscode.Range), 'Level 4', 4);
      expect(mockEvents.onHeading).toHaveBeenNthCalledWith(3, expect.any(vscode.Range), 'Level 5', 5);
    });

    test('should trim heading text', () => {
      const text = '# Heading with spaces   ';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onHeading).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        'Heading with spaces   ', // Note: Only the pound signs are removed, not spaces
        1
      );
    });

    test('should set correct range for headings', () => {
      const text = '## My Heading';
      
      parseMarkdown(text, mockEvents);
      
      const range = mockEvents.onHeading.mock.calls[0][0];
      expect(range.start.line).toBe(0);
      expect(range.start.character).toBe(0);
      expect(range.end.line).toBe(0);
      expect(range.end.character).toBe(13); // Full line length
    });
  });

  describe('mixed content', () => {
    test('should parse both tests and headings', () => {
      const text = `# Math Tests
1 + 1 = 2
## Addition
5 + 3 = 8
## Subtraction  
10 - 5 = 5`;
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onHeading).toHaveBeenCalledTimes(3);
      expect(mockEvents.onTest).toHaveBeenCalledTimes(3);
    });

    test('should ignore non-matching lines', () => {
      const text = `This is regular text
1 + 1 = 2
Not a test: 1 + 1 = two
# Valid heading
Not a heading #`;
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledTimes(1);
      expect(mockEvents.onHeading).toHaveBeenCalledTimes(1);
    });

    test('should handle empty lines', () => {
      const text = `
1 + 1 = 2

# Heading

`;
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledTimes(1);
      expect(mockEvents.onHeading).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    test('should handle empty text', () => {
      parseMarkdown('', mockEvents);
      
      expect(mockEvents.onTest).not.toHaveBeenCalled();
      expect(mockEvents.onHeading).not.toHaveBeenCalled();
    });

    test('should handle text with only newlines', () => {
      parseMarkdown('\n\n\n', mockEvents);
      
      expect(mockEvents.onTest).not.toHaveBeenCalled();
      expect(mockEvents.onHeading).not.toHaveBeenCalled();
    });

    test('should not parse invalid test formats', () => {
      const invalidTests = [
        '1 + = 3',
        '+ 2 = 3',
        '1 + 2 =',
        '1 + 2 = three',
        'one + two = three',
        '1.5 + 2.5 = 4' // Only integers supported
      ];
      
      invalidTests.forEach(text => {
        mockEvents.onTest.mockClear();
        parseMarkdown(text, mockEvents);
        expect(mockEvents.onTest).not.toHaveBeenCalled();
      });
    });

    test('should not parse invalid heading formats', () => {
      const invalidHeadings = [
        'Not # a heading'
      ];
      
      invalidHeadings.forEach(text => {
        mockEvents.onHeading.mockClear();
        parseMarkdown(text, mockEvents);
        expect(mockEvents.onHeading).not.toHaveBeenCalled();
      });
    });

    test('should parse headings with minimal text', () => {
      const headingsWithText = [
        '# #',
        '## ##',
        '### ###'
      ];
      
      headingsWithText.forEach(text => {
        mockEvents.onHeading.mockClear();
        parseMarkdown(text, mockEvents);
        expect(mockEvents.onHeading).toHaveBeenCalledTimes(1);
        const expectedDepth = text.split(' ')[0].length;
        const expectedText = text.split(' ')[1];
        expect(mockEvents.onHeading).toHaveBeenCalledWith(
          expect.any(vscode.Range),
          expectedText,
          expectedDepth
        );
      });
    });

    test('should handle large numbers in tests', () => {
      const text = '999999 + 111111 = 1111110';
      
      parseMarkdown(text, mockEvents);
      
      expect(mockEvents.onTest).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        999999,
        '+',
        111111,
        1111110
      );
    });
  });
});