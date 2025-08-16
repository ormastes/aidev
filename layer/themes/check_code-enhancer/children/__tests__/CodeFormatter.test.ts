import { CodeFormatter } from '../CodeFormatter';

describe('CodeFormatter', () => {
  let formatter: CodeFormatter;

  beforeEach(() => {
    formatter = new CodeFormatter();
  });

  describe('format', () => {
    it('should format code with proper indentation', () => {
      const input = `function test() {
const x = 1;
if (x > 0) {
console.log('positive');
}
}`;
      
      const expected = `function test() {
  const x = 1;
  if (x > 0) {
    console.log('positive');
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

    it('should handle empty lines', () => {
      const input = `function test() {

const x = 1;

}`;

      const expected = `function test() {

  const x = 1;

}`;

      expect(formatter.format(input)).toBe(expected);
    });
  });

  describe('removeTrailingWhitespace', () => {
    it('should remove trailing spaces', () => {
      const input = 'const x = 1;   \nconst y = 2;  ';
      const expected = 'const x = 1;\nconst y = 2;';
      
      expect(formatter.removeTrailingWhitespace(input)).toBe(expected);
    });

    it('should handle empty lines with spaces', () => {
      const input = 'line1\n   \nline2';
      const expected = 'line1\n\nline2';
      
      expect(formatter.removeTrailingWhitespace(input)).toBe(expected);
    });
  });

  describe('addSemicolons', () => {
    it('should add missing semicolons', () => {
      const input = `const x = 1
const y = 2
console.log(x)`;
      
      const expected = `const x = 1;
const y = 2;
console.log(x);`;

      expect(formatter.addSemicolons(input)).toBe(expected);
    });

    it('should not add semicolons to braces', () => {
      const input = `function test() {
  const x = 1
}`;
      
      const expected = `function test() {
  const x = 1;
}`;

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
  });

  describe('constructor options', () => {
    it('should use custom indent size', () => {
      const customFormatter = new CodeFormatter(4, true);
      const input = 'if (true) {\nconsole.log("test");\n}';
      const expected = 'if (true) {\n    console.log("test");\n}';
      
      expect(customFormatter.format(input)).toBe(expected);
    });

    it('should use tabs instead of spaces', () => {
      const tabFormatter = new CodeFormatter(2, false);
      const input = 'if (true) {\nconsole.log("test");\n}';
      const expected = 'if (true) {\n\tconsole.log("test");\n}';
      
      expect(tabFormatter.format(input)).toBe(expected);
    });
  });
});