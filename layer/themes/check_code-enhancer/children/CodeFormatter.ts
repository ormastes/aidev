/**
 * Code formatting utilities
 */

export class CodeFormatter {
  private indentSize: number;
  private useSpaces: boolean;

  constructor(indentSize: number = 2, useSpaces: boolean = true) {
    this.indentSize = indentSize;
    this.useSpaces = useSpaces;
  }

  /**
   * Format code with proper indentation
   */
  format(code: string): string {
    const lines = code.split('\n');
    let indentLevel = 0;
    const formatted: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Decrease indent for closing braces
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Add formatted line
      if (trimmed) {
        formatted.push(this.getIndent(indentLevel) + trimmed);
      } else {
        formatted.push('');
      }

      // Increase indent for opening braces
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
        indentLevel++;
      }
    }

    return formatted.join('\n');
  }

  /**
   * Get indentation string
   */
  private getIndent(level: number): string {
    const char = this.useSpaces ? ' ' : '\t';
    const size = this.useSpaces ? this.indentSize : 1;
    return char.repeat(size * level);
  }

  /**
   * Remove trailing whitespace
   */
  removeTrailingWhitespace(code: string): string {
    return code.split('\n')
      .map(line => line.trimEnd())
      .join('\n');
  }

  /**
   * Add missing semicolons (simple implementation)
   */
  addSemicolons(code: string): string {
    return code.split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed && 
            !trimmed.endsWith(';') && 
            !trimmed.endsWith('{') && 
            !trimmed.endsWith('}') &&
            !trimmed.startsWith('//') &&
            !trimmed.startsWith('*') &&
            !trimmed.startsWith('/*')) {
          return line + ';';
        }
        return line;
      })
      .join('\n');
  }
}