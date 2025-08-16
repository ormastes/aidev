/**
 * Common Validation Utilities
 * 
 * Provides reusable validation functions to eliminate code duplication
 * across domain validation functions.
 */

export interface ValidationOptions {
  /** Custom error message prefix */
  errorPrefix?: string;
  /** Field name for error messages */
  fieldName?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Allowed values for enum validation */
  allowedValues?: string[];
}

/**
 * Validates that a value is an object (not null, array, or primitive)
 * @param value The value to validate
 * @param options Validation options
 * @throws Error if validation fails
 */
export function validateObject(value: any, options: ValidationOptions = {}): void {
  const { errorPrefix = 'Invalid configuration', fieldName = "Configuration" } = options;
  
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${errorPrefix}: ${fieldName} must be an object`);
  }
}

/**
 * Validates that a value is a string
 * @param value The value to validate
 * @param options Validation options
 * @throws Error if validation fails
 */
export function validateString(value: any, options: ValidationOptions = {}): void {
  const { 
    errorPrefix = 'Invalid configuration', 
    fieldName = 'field', 
    required = false 
  } = options;
  
  if (required && (!value || typeof value !== 'string' || value.trim() === '')) {
    throw new Error(`${errorPrefix}: ${fieldName} is required and must be a non-empty string`);
  }
  
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new Error(`${errorPrefix}: ${fieldName} must be a string`);
  }
}

/**
 * Validates that a value is a boolean
 * @param value The value to validate
 * @param options Validation options
 * @throws Error if validation fails
 */
export function validateBoolean(value: any, options: ValidationOptions = {}): void {
  const { 
    errorPrefix = 'Invalid configuration', 
    fieldName = 'field', 
    required = false 
  } = options;
  
  if (required && value === undefined) {
    throw new Error(`${errorPrefix}: ${fieldName} is required`);
  }
  
  if (value !== undefined && typeof value !== 'boolean') {
    throw new Error(`${errorPrefix}: ${fieldName} must be a boolean`);
  }
}

/**
 * Validates that a value is a number
 * @param value The value to validate
 * @param options Validation options with min/max constraints
 * @throws Error if validation fails
 */
export function validateNumber(value: any, options: ValidationOptions & { min?: number; max?: number } = {}): void {
  const { 
    errorPrefix = 'Invalid configuration', 
    fieldName = 'field', 
    required = false,
    min,
    max
  } = options;
  
  if (required && (value === undefined || value === null)) {
    throw new Error(`${errorPrefix}: ${fieldName} is required`);
  }
  
  if (value !== undefined && value !== null) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${errorPrefix}: ${fieldName} must be a number`);
    }
    
    if (min !== undefined && min > 0 && value <= 0) {
      throw new Error(`${errorPrefix}: ${fieldName} must be a positive number`);
    }
    
    if (min !== undefined && value < min) {
      throw new Error(`${errorPrefix}: ${fieldName} must be greater than or equal to ${min}`);
    }
    
    if (max !== undefined && value > max) {
      throw new Error(`${errorPrefix}: ${fieldName} must be less than or equal to ${max}`);
    }
  }
}

/**
 * Validates that a value is an array
 * @param value The value to validate
 * @param options Validation options with minLength constraint
 * @throws Error if validation fails
 */
export function validateArray(value: any, options: ValidationOptions & { minLength?: number } = {}): void {
  const { 
    errorPrefix = 'Invalid configuration', 
    fieldName = 'field', 
    required = false,
    minLength = 0
  } = options;
  
  if (required && (!value || !Array.isArray(value))) {
    throw new Error(`${errorPrefix}: ${fieldName} is required and must be an array`);
  }
  
  if (value !== undefined && value !== null && !Array.isArray(value)) {
    throw new Error(`${errorPrefix}: ${fieldName} must be an array`);
  }
  
  if (Array.isArray(value) && minLength > 0 && value.length < minLength) {
    throw new Error(`${errorPrefix}: ${fieldName} must be a non-empty array`);
  }
}

/**
 * Validates that a value is one of the allowed enum values
 * @param value The value to validate
 * @param options Validation options with allowedValues
 * @throws Error if validation fails
 */
export function validateEnum(value: any, options: ValidationOptions & { allowedValues: string[] }): void {
  const { 
    errorPrefix = 'Invalid configuration', 
    fieldName = 'field', 
    required = false,
    allowedValues
  } = options;
  
  if (required && (value === undefined || value === null)) {
    throw new Error(`${errorPrefix}: ${fieldName} is required`);
  }
  
  if (value !== undefined && value !== null && !allowedValues.includes(value)) {
    throw new Error(`${errorPrefix}: ${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
}

/**
 * Validates that a value is a valid Date instance
 * @param value The value to validate
 * @param options Validation options
 * @throws Error if validation fails
 */
export function validateDate(value: any, options: ValidationOptions = {}): void {
  const { 
    errorPrefix = 'Invalid configuration', 
    fieldName = 'field', 
    required = false 
  } = options;
  
  if (required && (!value || !(value instanceof Date))) {
    throw new Error(`${errorPrefix}: ${fieldName} is required and must be a Date`);
  }
  
  if (value !== undefined && value !== null && !(value instanceof Date)) {
    throw new Error(`${errorPrefix}: ${fieldName} must be a Date`);
  }
}

/**
 * Validates a nested object using a validation function
 * @param value The value to validate
 * @param options Validation options
 * @param validator Custom validation function for the nested object
 * @throws Error if validation fails
 */
export function validateNestedObject(
  value: any, 
  options: ValidationOptions = {},
  validator?: (obj: any) => void
): void {
  const { 
    errorPrefix = 'Invalid configuration', 
    fieldName = 'field', 
    required = false 
  } = options;
  
  if (required && (!value || typeof value !== 'object' || Array.isArray(value))) {
    throw new Error(`${errorPrefix}: ${fieldName} is required and must be an object`);
  }
  
  if (value !== undefined && value !== null) {
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${errorPrefix}: ${fieldName} must be an object`);
    }
    
    if (validator) {
      try {
        validator(value);
      } catch (error) {
        // Re-throw with context about the nested field
        const errorMessage = error instanceof Error ? error.message : 'Validation failed';
        throw new Error(`${errorPrefix}: ${fieldName} validation failed - ${errorMessage}`);
      }
    }
  }
}

/**
 * Utility function to create consistent error prefixes for different domains
 */
export const ErrorPrefixes = {
  TEST_CONFIGURATION: 'Invalid configuration',
  REPORT_CONFIG: 'Invalid report config',
  TEST_RESULT: 'Invalid test result'
} as const;

/**
 * Validates a In Progress configuration object with multiple fields
 * @param _config The configuration object to validate (unused, kept for interface consistency)
 * @param validations Array of validation functions to apply
 */
export function validateConfiguration(
  _config: any, 
  validations: Array<() => void>
): void {
  for (const validation of validations) {
    validation();
  }
}