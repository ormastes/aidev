/**
 * Shared validation utilities for all themes
 */

/**
 * Validates if a string is not empty after trimming
 */
export function validateNonEmptyString(value: any, fieldName: string): { isValid: boolean; error?: string } {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} must be a non-empty string` };
  }
  
  if (value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty or whitespace only` };
  }
  
  return { isValid: true };
}

/**
 * Validates if a value is within a numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (value < min || value > max) {
    return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  
  return { isValid: true };
}

/**
 * Validates an email address format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (typeof email !== 'string') {
    return { isValid: false, error: 'Email must be a string' };
  }
  
  if (!email) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  // Check for consecutive dots
  if (email.includes('..')) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  // More strict email regex that requires a domain extension, with unicode support
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9\u0080-\uFFFF](?:[a-zA-Z0-9\u0080-\uFFFF-]{0,61}[a-zA-Z0-9\u0080-\uFFFF])?(?:\.[a-zA-Z0-9\u0080-\uFFFF](?:[a-zA-Z0-9\u0080-\uFFFF-]{0,61}[a-zA-Z0-9\u0080-\uFFFF])?)+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true };
}

/**
 * Validates if an array has required length
 */
export function validateArrayLength(
  array: any[],
  minLength: number,
  maxLength: number,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (!Array.isArray(array)) {
    return { isValid: false, error: `${fieldName} must be an array` };
  }
  
  if (array.length < minLength) {
    return { isValid: false, error: `${fieldName} must have at least ${minLength} item(s)` };
  }
  
  if (array.length > maxLength) {
    return { isValid: false, error: `${fieldName} cannot have more than ${maxLength} items` };
  }
  
  return { isValid: true };
}

/**
 * Validates a URL format
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    // Allow file:// URLs and URLs with proper hostnames
    if (urlObj.protocol === 'file:') {
      return { isValid: true };
    }
    // Ensure the URL has a proper host with domain extension
    if (!urlObj.hostname.includes('.') && !urlObj.hostname.match(/^localhost$|^127\.0\.0\.1$|^\[.*\]$/)) {
      return { isValid: false, error: 'Invalid URL format' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates if a port number is valid
 */
export function validatePort(port: number): { isValid: boolean; error?: string } {
  return validateRange(port, 1, 65535, 'Port');
}

/**
 * Validates a file path format
 */
export function validateFilePath(path: string): { isValid: boolean; error?: string } {
  if (!path || typeof path !== 'string') {
    return { isValid: false, error: 'File path must be a string' };
  }
  
  // Windows drive letter pattern C:\, D:\, etc.
  const windowsDrivePattern = /^[a-zA-Z]:\\/;
  const isWindowsPath = windowsDrivePattern.test(path);
  
  // Different invalid chars for Windows vs Unix paths
  const invalidChars = isWindowsPath ? /[\0<>"|?*]/ : /[\0<>:"|?*]/;
  
  if (invalidChars.test(path)) {
    return { isValid: false, error: 'File path contains invalid characters' };
  }
  
  return { isValid: true };
}

/**
 * Validates object has required fields
 */
export function validateRequiredFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields?: string[] } {
  const missingFields = requiredFields.filter(field => {
    const value = obj[field];
    // Treat falsy values as missing, including empty arrays
    if (!value) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  });
  
  if (missingFields.length > 0) {
    return { 
      isValid: false, 
      missingFields: missingFields.map(f => String(f))
    };
  }
  
  return { isValid: true };
}