import {
  validateObject,
  validateString,
  validateBoolean,
  validateNumber,
  validateArray,
  validateEnum,
  validateDate,
  validateNestedObject,
  ErrorPrefixes
} from '../../src/common/validation-utils';

describe('Validation Utils', () => {
  describe('validateObject', () => {
    it('should pass for valid objects', () => {
      expect(() => validateObject({})).not.toThrow();
      expect(() => validateObject({ key: 'value' })).not.toThrow();
    });

    it('should throw for null, undefined, and non-objects', () => {
      expect(() => validateObject(null)).toThrow('Invalid configuration: Configuration must be an object');
      expect(() => validateObject(undefined)).toThrow('Invalid configuration: Configuration must be an object');
      expect(() => validateObject('string')).toThrow('Invalid configuration: Configuration must be an object');
      expect(() => validateObject(123)).toThrow('Invalid configuration: Configuration must be an object');
      expect(() => validateObject([])).toThrow('Invalid configuration: Configuration must be an object');
    });

    it('should use custom error prefix and field name', () => {
      expect(() => validateObject(null, { 
        errorPrefix: 'Custom error', 
        fieldName: 'CustomField' 
      })).toThrow('Custom error: CustomField must be an object');
    });
  });

  describe('validateString', () => {
    it('should pass for valid strings', () => {
      expect(() => validateString('valid string')).not.toThrow();
      expect(() => validateString('')).not.toThrow();
    });

    it('should pass for undefined when not required', () => {
      expect(() => validateString(undefined)).not.toThrow();
      expect(() => validateString(null)).not.toThrow();
    });

    it('should throw for non-strings when provided', () => {
      expect(() => validateString(123)).toThrow('Invalid configuration: field must be a string');
      expect(() => validateString(true)).toThrow('Invalid configuration: field must be a string');
      expect(() => validateString({})).toThrow('Invalid configuration: field must be a string');
    });

    it('should throw for empty/invalid strings when required', () => {
      expect(() => validateString(undefined, { required: true })).toThrow('Invalid configuration: field is required and must be a non-empty string');
      expect(() => validateString('', { required: true })).toThrow('Invalid configuration: field is required and must be a non-empty string');
      expect(() => validateString('   ', { required: true })).toThrow('Invalid configuration: field is required and must be a non-empty string');
    });

    it('should use custom field name and error prefix', () => {
      expect(() => validateString(123, { 
        fieldName: 'title', 
        errorPrefix: 'Report error' 
      })).toThrow('Report error: title must be a string');
    });
  });

  describe('validateBoolean', () => {
    it('should pass for valid booleans', () => {
      expect(() => validateBoolean(true)).not.toThrow();
      expect(() => validateBoolean(false)).not.toThrow();
    });

    it('should pass for undefined when not required', () => {
      expect(() => validateBoolean(undefined)).not.toThrow();
    });

    it('should throw for non-booleans', () => {
      expect(() => validateBoolean('true')).toThrow('Invalid configuration: field must be a boolean');
      expect(() => validateBoolean(1)).toThrow('Invalid configuration: field must be a boolean');
      expect(() => validateBoolean({})).toThrow('Invalid configuration: field must be a boolean');
    });

    it('should throw for undefined when required', () => {
      expect(() => validateBoolean(undefined, { required: true })).toThrow('Invalid configuration: field is required');
    });
  });

  describe('validateNumber', () => {
    it('should pass for valid numbers', () => {
      expect(() => validateNumber(42)).not.toThrow();
      expect(() => validateNumber(0)).not.toThrow();
      expect(() => validateNumber(-5)).not.toThrow();
      expect(() => validateNumber(3.14)).not.toThrow();
    });

    it('should pass for undefined when not required', () => {
      expect(() => validateNumber(undefined)).not.toThrow();
      expect(() => validateNumber(null)).not.toThrow();
    });

    it('should throw for non-numbers', () => {
      expect(() => validateNumber('42')).toThrow('Invalid configuration: field must be a number');
      expect(() => validateNumber(true)).toThrow('Invalid configuration: field must be a number');
      expect(() => validateNumber(NaN)).toThrow('Invalid configuration: field must be a number');
    });

    it('should validate min constraints', () => {
      expect(() => validateNumber(5, { min: 10 })).toThrow('Invalid configuration: field must be greater than or equal to 10');
      expect(() => validateNumber(10, { min: 10 })).not.toThrow();
      expect(() => validateNumber(15, { min: 10 })).not.toThrow();
    });

    it('should validate max constraints', () => {
      expect(() => validateNumber(15, { max: 10 })).toThrow('Invalid configuration: field must be less than or equal to 10');
      expect(() => validateNumber(10, { max: 10 })).not.toThrow();
      expect(() => validateNumber(5, { max: 10 })).not.toThrow();
    });

    it('should validate positive numbers', () => {
      expect(() => validateNumber(-5, { min: 1 })).toThrow('Invalid configuration: field must be a positive number');
      expect(() => validateNumber(0, { min: 1 })).toThrow('Invalid configuration: field must be a positive number');
      expect(() => validateNumber(5, { min: 1 })).not.toThrow();
    });

    it('should throw for undefined when required', () => {
      expect(() => validateNumber(undefined, { required: true })).toThrow('Invalid configuration: field is required');
    });
  });

  describe('validateArray', () => {
    it('should pass for valid arrays', () => {
      expect(() => validateArray([])).not.toThrow();
      expect(() => validateArray([1, 2, 3])).not.toThrow();
      expect(() => validateArray(['a', 'b'])).not.toThrow();
    });

    it('should pass for undefined when not required', () => {
      expect(() => validateArray(undefined)).not.toThrow();
      expect(() => validateArray(null)).not.toThrow();
    });

    it('should throw for non-arrays', () => {
      expect(() => validateArray('array')).toThrow('Invalid configuration: field must be an array');
      expect(() => validateArray({})).toThrow('Invalid configuration: field must be an array');
      expect(() => validateArray(123)).toThrow('Invalid configuration: field must be an array');
    });

    it('should throw for empty array when minLength > 0', () => {
      expect(() => validateArray([], { minLength: 1 })).toThrow('Invalid configuration: field must be a non-empty array');
      expect(() => validateArray([1], { minLength: 1 })).not.toThrow();
    });

    it('should throw for undefined when required', () => {
      expect(() => validateArray(undefined, { required: true })).toThrow('Invalid configuration: field is required and must be an array');
    });
  });

  describe('validateEnum', () => {
    const allowedValues = ['option1', 'option2', 'option3'];

    it('should pass for valid enum values', () => {
      expect(() => validateEnum('option1', { allowedValues })).not.toThrow();
      expect(() => validateEnum('option2', { allowedValues })).not.toThrow();
    });

    it('should pass for undefined when not required', () => {
      expect(() => validateEnum(undefined, { allowedValues })).not.toThrow();
      expect(() => validateEnum(null, { allowedValues })).not.toThrow();
    });

    it('should throw for invalid enum values', () => {
      expect(() => validateEnum('invalid', { allowedValues })).toThrow('Invalid configuration: field must be one of: option1, option2, option3');
    });

    it('should throw for undefined when required', () => {
      expect(() => validateEnum(undefined, { allowedValues, required: true })).toThrow('Invalid configuration: field is required');
    });
  });

  describe('validateDate', () => {
    it('should pass for valid Date objects', () => {
      expect(() => validateDate(new Date())).not.toThrow();
      expect(() => validateDate(new Date('2023-01-01'))).not.toThrow();
    });

    it('should pass for undefined when not required', () => {
      expect(() => validateDate(undefined)).not.toThrow();
      expect(() => validateDate(null)).not.toThrow();
    });

    it('should throw for non-Date objects', () => {
      expect(() => validateDate('2023-01-01')).toThrow('Invalid configuration: field must be a Date');
      expect(() => validateDate(1234567890)).toThrow('Invalid configuration: field must be a Date');
      expect(() => validateDate({})).toThrow('Invalid configuration: field must be a Date');
    });

    it('should throw for undefined when required', () => {
      expect(() => validateDate(undefined, { required: true })).toThrow('Invalid configuration: field is required and must be a Date');
    });
  });

  describe('validateNestedObject', () => {
    it('should pass for valid objects', () => {
      expect(() => validateNestedObject({})).not.toThrow();
      expect(() => validateNestedObject({ key: 'value' })).not.toThrow();
    });

    it('should pass for undefined when not required', () => {
      expect(() => validateNestedObject(undefined)).not.toThrow();
      expect(() => validateNestedObject(null)).not.toThrow();
    });

    it('should throw for non-objects', () => {
      expect(() => validateNestedObject('string')).toThrow('Invalid configuration: field must be an object');
      expect(() => validateNestedObject([])).toThrow('Invalid configuration: field must be an object');
      expect(() => validateNestedObject(123)).toThrow('Invalid configuration: field must be an object');
    });

    it('should call custom validator', () => {
      const customValidator = jest.fn();
      const testObject = { key: 'value' };
      
      validateNestedObject(testObject, {}, customValidator);
      
      expect(customValidator).toHaveBeenCalledWith(testObject);
    });

    it('should handle validator errors', () => {
      const customValidator = jest.fn(() => {
        throw new Error('Custom validation failed');
      });
      
      expect(() => validateNestedObject(
        { key: 'value' }, 
        { fieldName: 'config' }, 
        customValidator
      )).toThrow('Invalid configuration: config validation failed - Custom validation failed');
    });

    it('should throw for undefined when required', () => {
      expect(() => validateNestedObject(undefined, { required: true })).toThrow('Invalid configuration: field is required and must be an object');
    });
  });

  describe('ErrorPrefixes', () => {
    it('should have consistent error prefixes', () => {
      expect(ErrorPrefixes.TEST_CONFIGURATION).toBe('Invalid configuration');
      expect(ErrorPrefixes.REPORT_CONFIG).toBe('Invalid report config');
      expect(ErrorPrefixes.TEST_RESULT).toBe('Invalid test result');
    });
  });
});