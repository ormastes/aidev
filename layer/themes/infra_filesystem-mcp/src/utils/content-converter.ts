/**
 * Converts content text to a valid step file name
 * Rules:
 * 1. Convert to lowercase
 * 2. Convert < and > to __ (double underscore)
 * 3. Convert other special characters to _ (single underscore)
 * 4. Collapse multiple consecutive single underscores to single underscore
 * 5. Trim leading/trailing single underscores only (preserve __ from < and >)
 * 
 * @param content - The content text to convert
 * @returns The converted filename
 */
export function convertContentToFilename(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Step 1: Convert to lowercase and trim spaces
  let result = content.toLowerCase().trim();

  // Step 2: Convert < and > to __ (double underscore) - do this first
  // Special handling for <gen:...> patterns - convert to __gen_...__ 
  result = result.replace(/<gen:([^>]+)>/g, '__gen_$1__');
  
  // Convert other < and > to __
  result = result.replace(/</g, '__');
  result = result.replace(/>/g, '__');

  // Step 3: Convert other special characters and spaces to _ (single underscore)
  // Keep alphanumeric characters, underscores, and convert everything else
  result = result.replace(/[^a-z0-9_]/g, '_');

  // Step 4: Collapse multiple consecutive underscores, but preserve intentional __ from < and >
  // This is more complex - we need to handle __ separately from other multiple underscores
  
  // Strategy: Replace __ with a placeholder, collapse other underscores, then restore __
  const doubleUnderscoreMarker = "DOUBLEUNDERSCORE";
  result = result.replace(/__/g, doubleUnderscoreMarker);
  
  // Now collapse any remaining multiple underscores to single underscore
  result = result.replace(/_+/g, '_');
  
  // Restore the double underscores
  result = result.replace(new RegExp(doubleUnderscoreMarker, 'g'), '__');

  // Step 5: Clean up leading/trailing single underscores only
  // This should only remove single underscores at start/end, not double underscores
  // Remove leading single underscores (but not if followed by another underscore)
  while (result.startsWith('_') && !result.startsWith('__')) {
    result = result.substring(1);
  }
  
  // Remove trailing single underscores (but not if preceded by another underscore)
  while (result.endsWith('_') && !result.endsWith('__')) {
    result = result.substring(0, result.length - 1);
  }
  
  // Handle edge case where result is only underscores
  if (/^_*$/.test(result)) {
    return '';
  }

  return result;
}