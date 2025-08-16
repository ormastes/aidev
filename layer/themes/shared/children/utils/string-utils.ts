/**
 * Shared string manipulation utilities for all themes
 */

/**
 * Converts a string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, (char) => char.toLowerCase());
}

/**
 * Converts a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, (char) => char.toUpperCase());
}

/**
 * Converts a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '');
}

/**
 * Converts a string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase()
    .replace(/^_+|_+$/g, '');
}

/**
 * Converts a string to CONSTANT_CASE
 */
export function toConstantCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/**
 * Truncates a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  
  const truncateLength = Math.max(0, maxLength - suffix.length);
  return str.substring(0, truncateLength) + suffix;
}

/**
 * Pads a string to a specific length
 */
export function padString(
  str: string,
  length: number,
  char: string = ' ',
  position: 'start' | 'end' | 'both' = 'end'
): string {
  const padLength = length - str.length;
  
  if (padLength <= 0) {
    return str;
  }
  
  const pad = char.repeat(padLength);
  
  switch (position) {
    case 'start':
      return pad + str;
    case 'end':
      return str + pad;
    case 'both':
      const startPad = char.repeat(Math.floor(padLength / 2));
      const endPad = char.repeat(Math.ceil(padLength / 2));
      return startPad + str + endPad;
  }
}

/**
 * Removes leading indentation from a multiline string
 */
export function dedent(str: string): string {
  const lines = str.split('\n');
  const minIndent = lines
    .filter(line => line.trim().length > 0)
    .reduce((min, line) => {
      const indent = line.match(/^(\s*)/)?.[0].length || 0;
      return Math.min(min, indent);
    }, Infinity);
  
  if (minIndent === Infinity) {
    return str;
  }
  
  return lines
    .map(line => line.substring(minIndent))
    .join('\n');
}

/**
 * Escapes special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates a random alphanumeric string
 */
export function generateRandomString(
  length: number,
  charset: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
): string {
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return result;
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Removes duplicate whitespace from a string
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Checks if a string is a valid identifier (variable name)
 */
export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

/**
 * Pluralizes a word (simple English rules)
 */
export function pluralize(word: string, count: number): string {
  if (count === 1) {
    return word;
  }
  
  // Simple pluralization rules
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
    return word.slice(0, -1) + 'ies';
  }
  
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') ||
      word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  
  return word + 's';
}

/**
 * Wraps text to a specific line width
 */
export function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.join('\n');
}