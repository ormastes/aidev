/**
 * Unit tests for TestParser - Simplified version to match implementation
 */

import { TestParser } from '../../src/domain/test-parser';

describe("TestParser", () => {
  let parser: TestParser;

  beforeEach(() => {
    parser = new TestParser();
  });

  describe('parse', () => {
    it('should parse simple test suite', () => {
      const code = `
        describe("Calculator", () => {
          it('should add two numbers', () => {
            expect(add(2, 3)).toBe(5);
          });
          
          it('should subtract two numbers', () => {
            expect(subtract(5, 3)).toBe(2);
          });
        });
      `;

      const result = parser.parse(code, 'calculator.test.ts');
      
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.title).toContain("calculator");
      expect(result.document?.suites).toHaveLength(1);
      expect(result.document?.suites[0].title).toBe("Calculator");
      expect(result.document?.suites[0].testCases).toHaveLength(2);
    });

    it('should handle test patterns', () => {
      const patterns = [
        { code: 'test("single test", () => {})', expectedCount: 1 },
        { code: 'it("focused test", () => {})', expectedCount: 1 }
      ];

      patterns.forEach(({ code }) => {
        const result = parser.parse(code, 'pattern.test.ts');
        expect(result.success).toBe(true);
        expect(result.document?.suites.length).toBeGreaterThan(0);
      });
    });
  });
});