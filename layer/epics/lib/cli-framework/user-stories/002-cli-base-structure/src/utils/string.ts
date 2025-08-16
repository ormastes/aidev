/**
 * String utility functions
 */

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length]![a.length]!;
}

/**
 * Find best matching strings based on similarity
 */
export function findBestMatch(
  input: string, 
  candidates: string[], 
  maxSuggestions: number = 3
): string[] {
  if (!input || candidates.length === 0) {
    return [];
  }
  
  // Calculate distances
  const distances = candidates.map(candidate => ({
    candidate,
    distance: levenshteinDistance(input.toLowerCase(), candidate.toLowerCase())
  }));
  
  // Sort by distance
  distances.sort((a, b) => a.distance - b.distance);
  
  // Filter reasonable suggestions (distance less than half the input length)
  const threshold = Math.max(3, Math.floor(input.length / 2));
  const suggestions = distances
    .filter(d => d.distance <= threshold)
    .slice(0, maxSuggestions)
    .map(d => d.candidate);
  
  return suggestions;
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^./, char => char.toLowerCase());
}

/**
 * Convert string to PascalCase
 */
export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Wrap text to specified width
 */
export function wordWrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
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
  
  return lines;
}

/**
 * Pad string to center within specified width
 */
export function center(text: string, width: number, fillChar: string = ' '): string {
  const padding = Math.max(0, width - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  
  return fillChar.repeat(leftPad) + text + fillChar.repeat(rightPad);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  if (maxLength <= suffix.length) {
    return text.slice(0, maxLength);
  }
  
  return text.slice(0, maxLength - suffix.length) + suffix;
}