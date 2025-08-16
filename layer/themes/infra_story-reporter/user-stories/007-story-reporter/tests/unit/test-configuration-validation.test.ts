import { validateTestConfiguration, createDefaultTestConfiguration } from '../../src/domain/test-configuration';
import { ErrorPrefixes } from '../../s../utils/validation-utils';

describe('Test Configuration Validation Unit Tests', () => {
  describe('validateTestConfiguration - Error Paths', () => {
    describe('Invalid Input Types', () => {
      it('should throw error for null configuration', () => {
        expect(() => validateTestConfiguration(null)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: Configuration must be an object`
        );
      });

      it('should throw error for undefined configuration', () => {
        expect(() => validateTestConfiguration(undefined)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: Configuration must be an object`
        );
      });

      it('should throw error for string configuration', () => {
        expect(() => validateTestConfiguration('invalid-config')).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: Configuration must be an object`
        );
      });

      it('should throw error for number configuration', () => {
        expect(() => validateTestConfiguration(12345)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: Configuration must be an object`
        );
      });

      it('should throw error for boolean configuration', () => {
        expect(() => validateTestConfiguration(true)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: Configuration must be an object`
        );
      });

      it('should throw error for array configuration', () => {
        expect(() => validateTestConfiguration(['config'])).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: Configuration must be an object`
        );
      });

      it('should throw error for empty object configuration', () => {
        expect(() => validateTestConfiguration({})).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });
    });

    describe('testSuiteId Validation Errors', () => {
      it('should throw error for missing testSuiteId', () => {
        const config = {
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should throw error for null testSuiteId', () => {
        const config = {
          testSuiteId: null,
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should throw error for undefined testSuiteId', () => {
        const config = {
          testSuiteId: undefined,
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should throw error for empty string testSuiteId', () => {
        const config = {
          testSuiteId: '',
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should throw error for whitespace-only testSuiteId', () => {
        const config = {
          testSuiteId: '   ',
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should throw error for number testSuiteId', () => {
        const config = {
          testSuiteId: 123,
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should throw error for boolean testSuiteId', () => {
        const config = {
          testSuiteId: true,
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should throw error for object testSuiteId', () => {
        const config = {
          testSuiteId: { id: 'test' },
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });
    });

    describe('featureFiles Validation Errors', () => {
      it('should throw error for missing featureFiles', () => {
        const config = {
          testSuiteId: 'test-suite',
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles is required and must be an array`
        );
      });

      it('should throw error for null featureFiles', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: null,
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles is required and must be an array`
        );
      });

      it('should throw error for undefined featureFiles', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: undefined,
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles is required and must be an array`
        );
      });

      it('should throw error for empty featureFiles array', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: [],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles must be a non-empty array`
        );
      });

      it('should throw error for string featureFiles', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: 'test.feature',
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles is required and must be an array`
        );
      });

      it('should throw error for number featureFiles', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: 123,
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles is required and must be an array`
        );
      });

      it('should throw error for boolean featureFiles', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: true,
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles is required and must be an array`
        );
      });

      it('should throw error for object featureFiles', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: { files: ['test.feature'] },
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles is required and must be an array`
        );
      });
    });

    describe('stepDefinitions Validation Errors', () => {
      it('should throw error for missing stepDefinitions', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: stepDefinitions is required and must be an array`
        );
      });

      it('should throw error for null stepDefinitions', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: null
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: stepDefinitions is required and must be an array`
        );
      });

      it('should throw error for undefined stepDefinitions', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: undefined
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: stepDefinitions is required and must be an array`
        );
      });

      it('should throw error for empty stepDefinitions array', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: []
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: stepDefinitions must be a non-empty array`
        );
      });

      it('should throw error for string stepDefinitions', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: 'steps.js'
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: stepDefinitions is required and must be an array`
        );
      });

      it('should throw error for number stepDefinitions', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: 123
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: stepDefinitions is required and must be an array`
        );
      });

      it('should throw error for boolean stepDefinitions', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: true
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: stepDefinitions is required and must be an array`
        );
      });

      it('should throw error for object stepDefinitions', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: { steps: ['steps.js'] }
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: stepDefinitions is required and must be an array`
        );
      });
    });

    describe('Optional Fields Validation Errors', () => {
      describe('outputFormats Validation', () => {
        it('should throw error for invalid outputFormats type', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            outputFormats: 'json'
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: outputFormats must be an array`
          );
        });

        it('should throw error for number outputFormats', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            outputFormats: 123
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: outputFormats must be an array`
          );
        });

        it('should throw error for boolean outputFormats', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            outputFormats: true
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: outputFormats must be an array`
          );
        });

        it('should throw error for object outputFormats', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            outputFormats: { formats: ['json'] }
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: outputFormats must be an array`
          );
        });
      });

      describe('logLevel Validation', () => {
        it('should throw error for invalid logLevel value', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            logLevel: 'invalid'
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: logLevel must be one of: trace, debug, info, warn, error`
          );
        });

        it('should throw error for number logLevel', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            logLevel: 123
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: logLevel must be one of: trace, debug, info, warn, error`
          );
        });

        it('should throw error for boolean logLevel', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            logLevel: true
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: logLevel must be one of: trace, debug, info, warn, error`
          );
        });

        it('should throw error for object logLevel', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            logLevel: { level: 'info' }
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: logLevel must be one of: trace, debug, info, warn, error`
          );
        });

        it('should throw error for array logLevel', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            logLevel: ['info']
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: logLevel must be one of: trace, debug, info, warn, error`
          );
        });

        it('should throw error for empty string logLevel', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            logLevel: ''
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: logLevel must be one of: trace, debug, info, warn, error`
          );
        });

        it('should throw error for case-sensitive logLevel', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            logLevel: 'INFO'
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: logLevel must be one of: trace, debug, info, warn, error`
          );
        });
      });

      describe('timeout Validation', () => {
        it('should throw error for zero timeout', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            timeout: 0
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: timeout must be a positive number`
          );
        });

        it('should throw error for negative timeout', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            timeout: -1000
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: timeout must be a positive number`
          );
        });

        it('should throw error for string timeout', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            timeout: '30000'
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: timeout must be a number`
          );
        });

        it('should throw error for boolean timeout', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            timeout: true
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: timeout must be a number`
          );
        });

        it('should throw error for object timeout', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            timeout: { value: 30000 }
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: timeout must be a number`
          );
        });

        it('should throw error for array timeout', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            timeout: [30000]
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: timeout must be a number`
          );
        });

        it('should throw error for NaN timeout', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            timeout: NaN
          };
          expect(() => validateTestConfiguration(config)).toThrow(
            `${ErrorPrefixes.TEST_CONFIGURATION}: timeout must be a number`
          );
        });

        it('should accept Infinity timeout as valid number', () => {
          const config = {
            testSuiteId: 'test-suite',
            featureFiles: ['test.feature'],
            stepDefinitions: ['steps.js'],
            timeout: Infinity
          };
          expect(() => validateTestConfiguration(config)).not.toThrow();
          // Infinity is a valid number in JavaScript
        });
      });
    });

    describe('Combined Validation Errors', () => {
      it('should throw first validation error encountered with multiple invalid fields', () => {
        const config = {
          testSuiteId: null, // Invalid
          featureFiles: [], // Invalid
          stepDefinitions: 'invalid', // Invalid
          logLevel: 'invalid', // Invalid
          timeout: -1 // Invalid
        };
        // Should fail on first validation error (testSuiteId)
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should prioritize required field errors over optional field errors', () => {
        const config = {
          testSuiteId: 'valid-suite',
          // Missing featureFiles (required)
          stepDefinitions: ['steps.js'],
          logLevel: 'invalid' // Invalid optional field
        };
        // Should fail on required field first
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: featureFiles is required and must be an array`
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle deeply nested invalid configuration', () => {
        const config = {
          testSuiteId: {
            nested: {
              value: 'test-suite'
            }
          },
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js']
        };
        expect(() => validateTestConfiguration(config)).toThrow(
          `${ErrorPrefixes.TEST_CONFIGURATION}: testSuiteId is required and must be a non-empty string`
        );
      });

      it('should handle configuration with prototype pollution attempt', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js'],
          __proto__: { malicious: true }
        };
        // Should not throw error for prototype fields, only validate actual config fields
        expect(() => validateTestConfiguration(config)).not.toThrow();
      });

      it('should handle configuration with Symbol properties', () => {
        const symbolKey = Symbol('test');
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js'],
          [symbolKey]: 'symbol-value'
        };
        // Should not throw error for symbol properties
        expect(() => validateTestConfiguration(config)).not.toThrow();
      });

      it('should handle configuration with function properties', () => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js'],
          maliciousFunction: () => console.log('hacked')
        };
        // Should not throw error for function properties
        expect(() => validateTestConfiguration(config)).not.toThrow();
      });
    });
  });

  describe('createDefaultTestConfiguration - Edge Cases', () => {
    it('should handle empty string testSuiteId in default creation', () => {
      expect(() => {
        createDefaultTestConfiguration('', ['test.feature'], ['steps.js']);
      }).not.toThrow();
      // The function creates the config but validation would catch empty string later
    });

    it('should handle empty arrays in default creation', () => {
      const config = createDefaultTestConfiguration('test-suite', [], []);
      expect(config.featureFiles).toEqual([]);
      expect(config.stepDefinitions).toEqual([]);
      // The function creates the config but validation would catch empty arrays later
    });

    it('should handle null/undefined inputs gracefully in default creation', () => {
      expect(() => {
        createDefaultTestConfiguration(null as any, null as any, null as any);
      }).not.toThrow();
      // The function assigns the values directly without validation
    });

    it('should create consistent default values', () => {
      const config1 = createDefaultTestConfiguration('test1', ['f1.feature'], ['s1.js']);
      const config2 = createDefaultTestConfiguration('test2', ['f2.feature'], ['s2.js']);
      
      // Default values should be consistent across calls
      expect(config1.outputFormats).toEqual(config2.outputFormats);
      expect(config1.outputDirectory).toEqual(config2.outputDirectory);
      expect(config1.logLevel).toEqual(config2.logLevel);
      expect(config1.timeout).toEqual(config2.timeout);
      expect(config1.parallel?.enabled).toEqual(config2.parallel?.enabled);
      expect(config1.retry?.attempts).toEqual(config2.retry?.attempts);
    });

    it('should create default objects with shared array references', () => {
      const config = createDefaultTestConfiguration('test', ['test.feature'], ['steps.js']);
      const originalTagsLength = config.tags?.length || 0;
      
      // Modifying returned config should not affect subsequent calls
      config.tags?.push("modified");
      
      const config2 = createDefaultTestConfiguration('test2', ['test2.feature'], ['steps2.js']);
      expect(config2.tags?.length).toBe(originalTagsLength);
      // Note: The current implementation creates new array instances for each call
    });
  });

  describe('Valid Configuration In Progress Cases', () => {
    it('should not throw error for minimal valid configuration', () => {
      const config = {
        testSuiteId: 'test-suite',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js']
      };
      expect(() => validateTestConfiguration(config)).not.toThrow();
    });

    it('should not throw error for configuration with all valid optional fields', () => {
      const config = {
        testSuiteId: 'test-suite',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js'],
        outputFormats: ['json', 'html'],
        logLevel: 'debug',
        timeout: 60000
      };
      expect(() => validateTestConfiguration(config)).not.toThrow();
    });

    it('should not throw error for configuration with valid enum values', () => {
      const validLogLevels = ['trace', 'debug', 'info', 'warn', 'error'];
      validLogLevels.forEach(logLevel => {
        const config = {
          testSuiteId: 'test-suite',
          featureFiles: ['test.feature'],
          stepDefinitions: ['steps.js'],
          logLevel: logLevel as any
        };
        expect(() => validateTestConfiguration(config)).not.toThrow();
      });
    });

    it('should not throw error for configuration with minimum timeout value', () => {
      const config = {
        testSuiteId: 'test-suite',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js'],
        timeout: 1
      };
      expect(() => validateTestConfiguration(config)).not.toThrow();
    });

    it('should not throw error for configuration with large timeout value', () => {
      const config = {
        testSuiteId: 'test-suite',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js'],
        timeout: Number.MAX_SAFE_INTEGER
      };
      expect(() => validateTestConfiguration(config)).not.toThrow();
    });
  });
});