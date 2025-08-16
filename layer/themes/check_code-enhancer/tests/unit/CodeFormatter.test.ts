import { CodeFormatter } from '../../children/CodeFormatter';

describe("CodeFormatter", () => {
  let formatter: CodeFormatter;

  beforeEach(() => {
    formatter = new CodeFormatter();
  });

  describe("constructor", () => {
    it('should create formatter with default settings', () => {
      expect(formatter).toBeInstanceOf(CodeFormatter);
    });

    it('should create formatter with custom indent size', () => {
      const customFormatter = new CodeFormatter(4, true);
      expect(customFormatter).toBeInstanceOf(CodeFormatter);
    });

    it('should create formatter with tabs', () => {
      const tabFormatter = new CodeFormatter(1, false);
      expect(tabFormatter).toBeInstanceOf(CodeFormatter);
    });
  });

  describe('format', () => {
    it('should format code with proper indentation', () => {
      const input = `function test() {
const x = 1;
if (x > 0) {
console.log("positive");
}
}`;

      const expected = `function test() {
  const x = 1;
  if (x > 0) {
    console.log("positive");
  }
}`;

      expect(formatter.format(input)).toBe(expected);
    });

    it('should handle nested structures', () => {
      const input = `const obj = {
a: {
b: {
c: 1
}
}
};`;

      const expected = `const obj = {
  a: {
    b: {
      c: 1
    }
  }
};`;

      expect(formatter.format(input)).toBe(expected);
    });

    it('should handle arrays', () => {
      const input = `const arr = [
1,
[
2,
3
],
4
];`;

      const expected = `const arr = [
  1,
  [
    2,
    3
  ],
  4
];`;

      expect(formatter.format(input)).toBe(expected);
    });

    it('should preserve empty lines', () => {
      const input = `function test() {
const x = 1;

const y = 2;
}`;

      const expected = `function test() {
  const x = 1;

  const y = 2;
}`;

      expect(formatter.format(input)).toBe(expected);
    });

    it('should handle parentheses', () => {
      const input = `function test(
param1,
param2
) {
return param1 + param2;
}`;

      const expected = `function test(
  param1,
  param2
) {
  return param1 + param2;
}`;

      expect(formatter.format(input)).toBe(expected);
    });

    it('should format with custom indent size', () => {
      const customFormatter = new CodeFormatter(4, true);
      const input = `function test() {
const x = 1;
}`;

      const expected = `function test() {
    const x = 1;
}`;

      expect(customFormatter.format(input)).toBe(expected);
    });

    it('should format with tabs', () => {
      const tabFormatter = new CodeFormatter(1, false);
      const input = `function test() {
const x = 1;
}`;

      const expected = `function test() {
\tconst x = 1;
}`;

      expect(tabFormatter.format(input)).toBe(expected);
    });

    it('should handle closing braces at start of line', () => {
      const input = `const obj = {
a: 1
}
const x = 2;`;

      const expected = `const obj = {
  a: 1
}
const x = 2;`;

      expect(formatter.format(input)).toBe(expected);
    });

    it('should not go negative on indent level', () => {
      const input = `}
}
const x = 1;`;

      const expected = `}
}
const x = 1;`;

      expect(formatter.format(input)).toBe(expected);
    });
  });

  describe("removeTrailingWhitespace", () => {
    it('should remove trailing spaces', () => {
      const input = 'const x = 1;   \nconst y = 2;  ';
      const expected = 'const x = 1;\nconst y = 2;';

      expect(formatter.removeTrailingWhitespace(input)).toBe(expected);
    });

    it('should remove trailing tabs', () => {
      const input = 'const x = 1;\t\t\nconst y = 2;\t';
      const expected = 'const x = 1;\nconst y = 2;';

      expect(formatter.removeTrailingWhitespace(input)).toBe(expected);
    });

    it('should preserve internal whitespace', () => {
      const input = 'const x = 1;   // comment   \nconst y = 2;';
      const expected = 'const x = 1;   // comment\nconst y = 2;';

      expect(formatter.removeTrailingWhitespace(input)).toBe(expected);
    });

    it('should handle empty lines', () => {
      const input = '   \n\t\t\n   ';
      const expected = '\n\n';

      expect(formatter.removeTrailingWhitespace(input)).toBe(expected);
    });
  });

  describe("addSemicolons", () => {
    it('should add missing semicolons', () => {
      const input = `const x = 1
const y = 2
console.log(x + y)`;

      const expected = `const x = 1;
const y = 2;
console.log(x + y);`;

      expect(formatter.addSemicolons(input)).toBe(expected);
    });

    it('should not add semicolons to lines ending with {', () => {
      const input = `function test() {
  const x = 1
}`;

      const expected = `function test() {
  const x = 1;
}`;

      expect(formatter.addSemicolons(input)).toBe(expected);
    });

    it('should not add semicolons to lines ending with }', () => {
      const input = `const obj = {
  a: 1
}
const x = 2`;

      const expected = `const obj = {
  a: 1;
}
const x = 2;`;

      expect(formatter.addSemicolons(input)).toBe(expected);
    });

    it('should not add semicolons to comments', () => {
      const input = `// This is a comment
/* Multi-line
 * comment */
const x = 1`;

      const expected = `// This is a comment
/* Multi-line
 * comment */
const x = 1;`;

      expect(formatter.addSemicolons(input)).toBe(expected);
    });

    it('should not add semicolons to lines already ending with ;', () => {
      const input = `const x = 1;
const y = 2;`;

      expect(formatter.addSemicolons(input)).toBe(input);
    });

    it('should handle empty lines', () => {
      const input = `const x = 1

const y = 2`;

      const expected = `const x = 1;

const y = 2;`;

      expect(formatter.addSemicolons(input)).toBe(expected);
    });

    it('should handle indented lines', () => {
      const input = `function test() {
  const x = 1
  return x
}`;

      const expected = `function test() {
  const x = 1;
  return x;
}`;

      expect(formatter.addSemicolons(input)).toBe(expected);
    });
  });

  describe('combined operations', () => {
    it('should format and clean code', () => {
      const input = `function test() {   
const x = 1  
if (x > 0) {
console.log("positive")  
}   
}`;

      let result = formatter.format(input);
      result = formatter.removeTrailingWhitespace(result);
      result = formatter.addSemicolons(result);

      const expected = `function test() {
  const x = 1;
  if (x > 0) {
    console.log("positive");
  }
}`;

      expect(result).toBe(expected);
    });
  });
});