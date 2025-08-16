import { 
  validateConfiguration,
  validateString,
  validateArray,
  validateNumber,
  validateEnum,
  validateBoolean,
  validateObject
} from '../../s../utils/validation-utils';

describe('ValidationUtils Edge Cases Coverage Tests', () => {
  describe('validateConfiguration Function Coverage (Lines 244-245)', () => {
    it('should execute all validation functions in array', () => {
      const config = { test: 'value' };
      const validation1Spy = jest.fn();
      const validation2Spy = jest.fn();
      const validation3Spy = jest.fn();
      
      const validations = [validation1Spy, validation2Spy, validation3Spy];
      
      // This should iterate through lines 244-245 and call each validation
      validateConfiguration(config, validations);
      
      expect(validation1Spy).toHaveBeenCalledTimes(1);
      expect(validation2Spy).toHaveBeenCalledTimes(1);  
      expect(validation3Spy).toHaveBeenCalledTimes(1);
    });

    it('should handle empty validations array', () => {
      const config = { test: 'value' };
      const emptyValidations: Array<() => void> = [];
      
      // Should not throw with empty array
      expect(() => {
        validateConfiguration(config, emptyValidations);
      }).not.toThrow();
    });

    it('should handle single validation function', () => {
      const config = { test: 'value' };
      const validationSpy = jest.fn();
      
      validateConfiguration(config, [validationSpy]);
      
      expect(validationSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from validation functions', () => {
      const config = { test: 'value' };
      const throwingValidation = jest.fn(() => {
        throw new Error('Validation failed');
      });
      
      expect(() => {
        validateConfiguration(config, [throwingValidation]);
      }).toThrow('Validation failed');
      
      expect(throwingValidation).toHaveBeenCalledTimes(1);
    });

    it('should execute validations in order and stop on first error', () => {
      const config = { test: 'value' };
      const validation1Spy = jest.fn();
      const throwingValidation = jest.fn(() => {
        throw new Error('Second validation failed');
      });
      const validation3Spy = jest.fn();
      
      expect(() => {
        validateConfiguration(config, [validation1Spy, throwingValidation, validation3Spy]);
      }).toThrow('Second validation failed');
      
      expect(validation1Spy).toHaveBeenCalledTimes(1);
      expect(throwingValidation).toHaveBeenCalledTimes(1);
      expect(validation3Spy).not.toHaveBeenCalled(); // Should not reach this
    });

    it('should handle complex validation scenarios', () => {
      const config = {
        name: 'test-config',
        value: 42,
        enabled: true,
        items: ['a', 'b', 'c']
      };
      
      const complexValidations = [
        () => validateString(config.name, { errorPrefix: 'Configuration', fieldName: 'name' }),
        () => validateNumber(config.value, { errorPrefix: 'Configuration', fieldName: 'value' }),
        () => validateBoolean(config.enabled, { errorPrefix: 'Configuration', fieldName: 'enabled' }),
        () => validateArray(config.items, { errorPrefix: 'Configuration', fieldName: 'items' })
      ];
      
      // All validations should pass
      expect(() => {
        validateConfiguration(config, complexValidations);
      }).not.toThrow();
    });

    it('should handle a large number of validations efficiently', () => {
      const config = { test: 'value' };
      const manyValidations: Array<() => void> = [];
      
      // Create 100 validation functions
      for (let i = 0; i < 100; i++) {
        manyValidations.push(jest.fn());
      }
      
      // Should handle large arrays efficiently
      expect(() => {
        validateConfiguration(config, manyValidations);
      }).not.toThrow();
      
      // Verify all were called
      manyValidations.forEach(validation => {
        expect(validation).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases for Other Validation Functions', () => {
    it('should handle validateEnum with edge case values', () => {
      // Test edge cases that might not be covered elsewhere
      expect(() => {
        validateEnum(null, { allowedValues: ['a', 'b', 'c'] });
      }).not.toThrow(); // null should be allowed
      
      expect(() => {
        validateEnum(undefined, { allowedValues: ['a', 'b', 'c'] });
      }).not.toThrow(); // undefined should be allowed
      
      expect(() => {
        validateEnum('', { 
          allowedValues: ['a', 'b', 'c'],
          errorPrefix: 'Test',
          fieldName: 'field'
        });
      }).toThrow('Test: field must be one of: a, b, c');
    });

    it('should handle validateString with edge cases', () => {
      expect(() => {
        validateString(123, { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be a string');
      
      expect(() => {
        validateString([], { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be a string');
      
      expect(() => {
        validateString({}, { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be a string');
      
      expect(() => {
        validateString('', { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow(); // empty string should be valid
      
      expect(() => {
        validateString('', { errorPrefix: 'Test', fieldName: 'field', required: true });
      }).toThrow('Test: field is required and must be a non-empty string');
    });

    it('should handle validateArray with edge cases', () => {
      expect(() => {
        validateArray('not-array', { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be an array');
      
      expect(() => {
        validateArray(null, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow(); // null should be allowed when not required
      
      expect(() => {
        validateArray(null, { errorPrefix: 'Test', fieldName: 'field', required: true });
      }).toThrow('Test: field is required and must be an array');
      
      expect(() => {
        validateArray([], { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow(); // empty array should be valid
      
      expect(() => {
        validateArray([1, 2], { errorPrefix: 'Test', fieldName: 'field', minLength: 3 });
      }).toThrow('Test: field must be a non-empty array');
    });

    it('should handle validateNumber with edge cases', () => {
      expect(() => {
        validateNumber('123', { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be a number');
      
      expect(() => {
        validateNumber(NaN, { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be a number');
      
      expect(() => {
        validateNumber(Infinity, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow(); // Infinity is a valid number in JavaScript
      
      expect(() => {
        validateNumber(-Infinity, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow(); // -Infinity is a valid number in JavaScript
      
      expect(() => {
        validateNumber(0, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow(); // 0 should be valid
      
      expect(() => {
        validateNumber(-1, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow(); // negative numbers should be valid
      
      expect(() => {
        validateNumber(5, { errorPrefix: 'Test', fieldName: 'field', min: 10 });
      }).toThrow('Test: field must be greater than or equal to 10');
      
      expect(() => {
        validateNumber(15, { errorPrefix: 'Test', fieldName: 'field', max: 10 });
      }).toThrow('Test: field must be less than or equal to 10');
    });

    it('should handle validateBoolean with edge cases', () => {
      expect(() => {
        validateBoolean('true', { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be a boolean');
      
      expect(() => {
        validateBoolean(1, { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be a boolean');
      
      expect(() => {
        validateBoolean(0, { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be a boolean');
      
      expect(() => {
        validateBoolean(true, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow();
      
      expect(() => {
        validateBoolean(false, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow();
    });

    it('should handle validateObject with edge cases', () => {
      expect(() => {
        validateObject(null, { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be an object');
      
      expect(() => {
        validateObject([], { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be an object');
      
      expect(() => {
        validateObject('object', { errorPrefix: 'Test', fieldName: 'field' });
      }).toThrow('Test: field must be an object');
      
      expect(() => {
        validateObject({}, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow(); // empty object should be valid
      
      expect(() => {
        validateObject({ key: 'value' }, { errorPrefix: 'Test', fieldName: 'field' });
      }).not.toThrow();
    });
  });

  describe('Default Options Edge Cases', () => {
    it('should use default options when none provided', () => {
      expect(() => {
        validateString('valid string');
      }).not.toThrow();
      
      expect(() => {
        validateNumber(42);
      }).not.toThrow();
      
      expect(() => {
        validateBoolean(true);
      }).not.toThrow();
      
      expect(() => {
        validateArray([1, 2, 3]);
      }).not.toThrow();
      
      expect(() => {
        validateObject({ key: 'value' });
      }).not.toThrow();
    });

    it('should handle partial options objects', () => {
      expect(() => {
        validateString('test', { fieldName: 'testField' });
      }).not.toThrow();
      
      expect(() => {
        validateNumber(42, { errorPrefix: 'Custom Error' });
      }).not.toThrow();
      
      expect(() => {
        validateArray([1, 2], { minLength: 1 });
      }).not.toThrow();
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle complex nested validation scenarios', () => {
      const complexConfig = {
        database: {
          host: 'localhost',
          port: 5432,
          enabled: true,
          options: ['ssl', 'compression']
        },
        features: {
          authentication: true,
          logging: false,
          debugLevel: 'info'
        }
      };
      
      const nestedValidations = [
        // Database validations
        () => validateObject(complexConfig.database, { errorPrefix: 'Config', fieldName: 'database' }),
        () => validateString(complexConfig.database.host, { errorPrefix: 'Database', fieldName: 'host' }),
        () => validateNumber(complexConfig.database.port, { errorPrefix: 'Database', fieldName: 'port' }),
        () => validateBoolean(complexConfig.database.enabled, { errorPrefix: 'Database', fieldName: 'enabled' }),
        () => validateArray(complexConfig.database.options, { errorPrefix: 'Database', fieldName: 'options' }),
        
        // Features validations
        () => validateObject(complexConfig.features, { errorPrefix: 'Config', fieldName: 'features' }),
        () => validateBoolean(complexConfig.features.authentication, { errorPrefix: 'Features', fieldName: 'authentication' }),
        () => validateBoolean(complexConfig.features.logging, { errorPrefix: 'Features', fieldName: 'logging' }),
        () => validateEnum(complexConfig.features.debugLevel, { 
          errorPrefix: 'Features', 
          fieldName: 'debugLevel', 
          allowedValues: ['trace', 'debug', 'info', 'warn', 'error'] 
        })
      ];
      
      expect(() => {
        validateConfiguration(complexConfig, nestedValidations);
      }).not.toThrow();
    });

    it('should handle validation failure in nested scenario', () => {
      const invalidConfig = {
        database: {
          host: 123, // Invalid: should be string
          port: 'invalid', // Invalid: should be number
          enabled: 'yes' // Invalid: should be boolean
        }
      };
      
      const failingValidations = [
        () => validateObject(invalidConfig.database, { errorPrefix: 'Config', fieldName: 'database' }),
        () => validateString(invalidConfig.database.host, { errorPrefix: 'Database', fieldName: 'host' }), // This should fail
        () => validateNumber(invalidConfig.database.port, { errorPrefix: 'Database', fieldName: 'port' }),
        () => validateBoolean(invalidConfig.database.enabled, { errorPrefix: 'Database', fieldName: 'enabled' })
      ];
      
      expect(() => {
        validateConfiguration(invalidConfig, failingValidations);
      }).toThrow('Database: host must be a string');
    });

    it('should handle validation functions that depend on each other', () => {
      const config = {
        type: 'database',
        connection: {
          host: 'localhost',
          port: 5432
        }
      };
      
      // Create validations where later ones depend on earlier ones
      const dependentValidations = [
        () => validateString(config.type, { errorPrefix: 'Config', fieldName: 'type' }),
        () => validateEnum(config.type, { 
          errorPrefix: 'Config', 
          fieldName: 'type', 
          allowedValues: ['database', 'cache', 'queue'] 
        }),
        () => {
          // This validation depends on the type being 'database'
          if (config.type === 'database') {
            validateObject(config.connection, { errorPrefix: 'Config', fieldName: 'connection' });
            validateString(config.connection.host, { errorPrefix: 'Connection', fieldName: 'host' });
            validateNumber(config.connection.port, { errorPrefix: 'Connection', fieldName: 'port' });
          }
        }
      ];
      
      expect(() => {
        validateConfiguration(config, dependentValidations);
      }).not.toThrow();
    });
  });
});