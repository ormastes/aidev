import { validateTestResult, createDefaultTestResult, TestResult } from '../../src/domain/test-result';
import { ErrorPrefixes } from '../../src/common/validation-utils';

describe('Test Result Validation Edge Cases Unit Tests', () => {
  describe('validateTestResult - Input Type Edge Cases', () => {
    it('should throw error for null test result', () => {
      expect(() => validateTestResult(null)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: Result must be an object`
      );
    });

    it('should throw error for undefined test result', () => {
      expect(() => validateTestResult(undefined)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: Result must be an object`
      );
    });

    it('should throw error for string test result', () => {
      expect(() => validateTestResult('invalid-result')).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: Result must be an object`
      );
    });

    it('should throw error for number test result', () => {
      expect(() => validateTestResult(12345)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: Result must be an object`
      );
    });

    it('should throw error for boolean test result', () => {
      expect(() => validateTestResult(true)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: Result must be an object`
      );
    });

    it('should throw error for array test result', () => {
      expect(() => validateTestResult([])).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: Result must be an object`
      );
    });

    it('should throw error for empty object test result', () => {
      expect(() => validateTestResult({})).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: testSuiteId is required and must be a non-empty string`
      );
    });
  });

  describe('testSuiteId Validation Edge Cases', () => {
    it('should throw error for missing testSuiteId', () => {
      const result = {
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      expect(() => validateTestResult(result)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: testSuiteId is required and must be a non-empty string`
      );
    });

    it('should throw error for null testSuiteId', () => {
      const result = {
        testSuiteId: null,
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      expect(() => validateTestResult(result)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: testSuiteId is required and must be a non-empty string`
      );
    });

    it('should throw error for empty string testSuiteId', () => {
      const result = {
        testSuiteId: '',
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      expect(() => validateTestResult(result)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: testSuiteId is required and must be a non-empty string`
      );
    });

    it('should throw error for whitespace-only testSuiteId', () => {
      const result = {
        testSuiteId: '   ',
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      expect(() => validateTestResult(result)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: testSuiteId is required and must be a non-empty string`
      );
    });

    it('should throw error for non-string testSuiteId types', () => {
      const testCases = [
        { testSuiteId: 123 },
        { testSuiteId: true },
        { testSuiteId: { id: 'test' } },
        { testSuiteId: ['test'] }
      ];

      testCases.forEach(testCase => {
        const result = {
          ...testCase,
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: testSuiteId is required and must be a non-empty string`
        );
      });
    });

    it('should accept very long testSuiteId', () => {
      const longId = 'a'.repeat(1000);
      const result = {
        testSuiteId: longId,
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      expect(() => validateTestResult(result)).not.toThrow();
    });

    it('should accept testSuiteId with special characters', () => {
      const specialId = 'test-suite_123@domain.com:8080/path?query=value#fragment';
      const result = {
        testSuiteId: specialId,
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      expect(() => validateTestResult(result)).not.toThrow();
    });

    it('should accept testSuiteId with unicode characters', () => {
      const unicodeId = 'тест-сьют-123-🚀-测试套件';
      const result = {
        testSuiteId: unicodeId,
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      expect(() => validateTestResult(result)).not.toThrow();
    });
  });

  describe('Date Validation Edge Cases', () => {
    describe('startTime validation', () => {
      it('should throw error for missing startTime', () => {
        const result = {
          testSuiteId: 'test-suite',
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: startTime is required and must be a Date`
        );
      });

      it('should throw error for null startTime', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: null,
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: startTime is required and must be a Date`
        );
      });

      it('should throw error for invalid date types', () => {
        const invalidDates = [
          'invalid-date',
          123456789,
          true,
          {},
          []
          // Note: new Date('invalid') creates a Date object (Invalid Date) but still instanceof Date
        ];

        invalidDates.forEach(invalidDate => {
          const result = {
            testSuiteId: 'test-suite',
            startTime: invalidDate,
            endTime: new Date(),
            status: 'pending',
            totalScenarios: 0,
            scenarios: [],
            statistics: {}
          };
          expect(() => validateTestResult(result)).toThrow(
            `${ErrorPrefixes.TEST_RESULT}: startTime is required and must be a Date`
          );
        });
      });

      it('should accept valid Date objects for startTime', () => {
        const validDates = [
          new Date(),
          new Date('2023-01-01T00:00:00.000Z'),
          new Date(Date.now() - 86400000), // Yesterday
          new Date('1970-01-01T00:00:00.000Z'), // Unix epoch
          new Date('2038-01-19T03:14:07.000Z') // Year 2038 problem
        ];

        validDates.forEach(validDate => {
          const result = {
            testSuiteId: 'test-suite',
            startTime: validDate,
            endTime: new Date(),
            status: 'pending',
            totalScenarios: 0,
            scenarios: [],
            statistics: {}
          };
          expect(() => validateTestResult(result)).not.toThrow();
        });
      });
    });

    describe('endTime validation', () => {
      it('should throw error for missing endTime', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: endTime is required and must be a Date`
        );
      });

      it('should throw error for invalid endTime types', () => {
        const invalidDates = [
          'invalid-date',
          123456789,
          false,
          {},
          [],
          undefined
        ];

        invalidDates.forEach(invalidDate => {
          const result = {
            testSuiteId: 'test-suite',
            startTime: new Date(),
            endTime: invalidDate,
            status: 'pending',
            totalScenarios: 0,
            scenarios: [],
            statistics: {}
          };
          expect(() => validateTestResult(result)).toThrow();
        });
      });

      it('should accept endTime before startTime (no temporal validation)', () => {
        const startTime = new Date('2023-01-02T00:00:00.000Z');
        const endTime = new Date('2023-01-01T00:00:00.000Z'); // Before start time
        const result = {
          testSuiteId: 'test-suite',
          startTime,
          endTime,
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        // Validation function doesn't check temporal logic, only data types
        expect(() => validateTestResult(result)).not.toThrow();
      });
    });
  });

  describe('Status Validation Edge Cases', () => {
    it('should throw error for missing status', () => {
      const result = {
        testSuiteId: 'test-suite',
        startTime: new Date(),
        endTime: new Date(),
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      expect(() => validateTestResult(result)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: status is required`
      );
    });

    it('should throw error for invalid status values', () => {
      const requiredErrorStatuses = [null, undefined];
      const invalidValueStatuses = [
        'invalid',
        'passed', // Case sensitive
        'Failed', // Case sensitive
        'passed',
        'error',
        'running',
        'passed',
        '',
        123,
        true,
        {},
        []
      ];

      requiredErrorStatuses.forEach(invalidStatus => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: invalidStatus,
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: status is required`
        );
      });

      invalidValueStatuses.forEach(invalidStatus => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: invalidStatus,
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: status must be one of: In Progress, failed, pending, cancelled`
        );
      });
    });

    it('should accept all valid status values', () => {
      const validStatuses = ['passed', 'failed', 'pending', 'cancelled'];

      validStatuses.forEach(validStatus => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: validStatus,
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).not.toThrow();
      });
    });
  });

  describe('Numeric Fields Validation Edge Cases', () => {
    describe('totalScenarios validation', () => {
      it('should throw error for missing totalScenarios', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: totalScenarios is required`
        );
      });

      it('should throw error for negative totalScenarios', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: -1,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: totalScenarios must be greater than or equal to 0`
        );
      });

      it('should throw error for non-numeric totalScenarios', () => {
        const requiredErrorValues = [null, undefined];
        const typeErrorValues = [
          'invalid',
          true,
          {},
          [],
          NaN
          // Note: Infinity and -Infinity are valid numbers in JavaScript
        ];

        requiredErrorValues.forEach(invalidValue => {
          const result = {
            testSuiteId: 'test-suite',
            startTime: new Date(),
            endTime: new Date(),
            status: 'pending',
            totalScenarios: invalidValue,
            scenarios: [],
            statistics: {}
          };
          expect(() => validateTestResult(result)).toThrow(
            `${ErrorPrefixes.TEST_RESULT}: totalScenarios is required`
          );
        });

        typeErrorValues.forEach(invalidValue => {
          const result = {
            testSuiteId: 'test-suite',
            startTime: new Date(),
            endTime: new Date(),
            status: 'pending',
            totalScenarios: invalidValue,
            scenarios: [],
            statistics: {}
          };
          expect(() => validateTestResult(result)).toThrow(
            `${ErrorPrefixes.TEST_RESULT}: totalScenarios must be a number`
          );
        });
      });

      it('should accept valid totalScenarios values', () => {
        const validValues = [0, 1, 100, 1000, Number.MAX_SAFE_INTEGER];

        validValues.forEach(validValue => {
          const result = {
            testSuiteId: 'test-suite',
            startTime: new Date(),
            endTime: new Date(),
            status: 'pending',
            totalScenarios: validValue,
            scenarios: [],
            statistics: {}
          };
          expect(() => validateTestResult(result)).not.toThrow();
        });
      });

      it('should accept zero totalScenarios', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).not.toThrow();
      });

      it('should accept large totalScenarios values', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: Number.MAX_SAFE_INTEGER,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).not.toThrow();
      });

      it('should accept positive Infinity as valid totalScenarios', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: Infinity,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).not.toThrow();
      });

      it('should reject negative Infinity totalScenarios due to min constraint', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: -Infinity,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: totalScenarios must be greater than or equal to 0`
        );
      });
    });
  });

  describe('Array Fields Validation Edge Cases', () => {
    describe('scenarios validation', () => {
      it('should throw error for missing scenarios', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: scenarios is required and must be an array`
        );
      });

      it('should throw error for null scenarios', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: null,
          statistics: {}
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: scenarios is required and must be an array`
        );
      });

      it('should throw error for non-array scenarios', () => {
        const invalidValues = [
          'invalid',
          123,
          true,
          {},
          undefined
        ];

        invalidValues.forEach(invalidValue => {
          const result = {
            testSuiteId: 'test-suite',
            startTime: new Date(),
            endTime: new Date(),
            status: 'pending',
            totalScenarios: 0,
            scenarios: invalidValue,
            statistics: {}
          };
          expect(() => validateTestResult(result)).toThrow(
            `${ErrorPrefixes.TEST_RESULT}: scenarios is required and must be an array`
          );
        });
      });

      it('should accept empty scenarios array', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).not.toThrow();
      });

      it('should accept scenarios array with any content (no deep validation)', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 2,
          scenarios: [
            { name: 'Scenario 1', status: 'pending' },
            { invalid: 'scenario', data: true },
            'string scenario',
            123,
            null
          ],
          statistics: {}
        };
        // Validation function doesn't validate array contents deeply
        expect(() => validateTestResult(result)).not.toThrow();
      });
    });
  });

  describe('Nested Object Validation Edge Cases', () => {
    describe('statistics validation', () => {
      it('should throw error for missing statistics', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: []
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: statistics is required and must be an object`
        );
      });

      it('should throw error for null statistics', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: null
        };
        expect(() => validateTestResult(result)).toThrow(
          `${ErrorPrefixes.TEST_RESULT}: statistics is required and must be an object`
        );
      });

      it('should throw error for non-object statistics', () => {
        const invalidValues = [
          'invalid',
          123,
          true,
          [],
          undefined
        ];

        invalidValues.forEach(invalidValue => {
          const result = {
            testSuiteId: 'test-suite',
            startTime: new Date(),
            endTime: new Date(),
            status: 'pending',
            totalScenarios: 0,
            scenarios: [],
            statistics: invalidValue
          };
          expect(() => validateTestResult(result)).toThrow(
            `${ErrorPrefixes.TEST_RESULT}: statistics is required and must be an object`
          );
        });
      });

      it('should accept empty statistics object', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {}
        };
        expect(() => validateTestResult(result)).not.toThrow();
      });

      it('should accept statistics with any properties (no deep validation)', () => {
        const result = {
          testSuiteId: 'test-suite',
          startTime: new Date(),
          endTime: new Date(),
          status: 'pending',
          totalScenarios: 0,
          scenarios: [],
          statistics: {
            totalSteps: 10,
            passedSteps: 8,
            invalidField: 'should not cause error',
            nested: {
              deep: {
                structure: true
              }
            },
            array: [1, 2, 3],
            functionProperty: () => 'test'
          }
        };
        expect(() => validateTestResult(result)).not.toThrow();
      });
    });
  });

  describe('createDefaultTestResult Edge Cases', () => {
    it('should handle empty string testSuiteId', () => {
      const result = createDefaultTestResult('', 'passed');
      expect(result.testSuiteId).toBe('');
      expect(result.status).toBe('passed');
      expect(() => validateTestResult(result)).toThrow(); // Should fail validation
    });

    it('should handle null testSuiteId gracefully in creation', () => {
      const result = createDefaultTestResult(null as any, 'failed');
      expect(result.testSuiteId).toBe(null);
      expect(result.status).toBe('failed');
    });

    it('should handle invalid status values in creation', () => {
      const result = createDefaultTestResult('test-suite', 'invalid' as any);
      expect(result.testSuiteId).toBe('test-suite');
      expect(result.status).toBe('invalid');
      expect(() => validateTestResult(result)).toThrow(); // Should fail validation
    });

    it('should create consistent timestamps', () => {
      const beforeCreation = Date.now();
      const result = createDefaultTestResult('test-suite', 'passed');
      const afterCreation = Date.now();
      
      expect(result.startTime.getTime()).toBeGreaterThanOrEqual(beforeCreation);
      expect(result.startTime.getTime()).toBeLessThanOrEqual(afterCreation);
      expect(result.endTime.getTime()).toBe(result.startTime.getTime());
    });

    it('should create default statistics with all required fields', () => {
      const result = createDefaultTestResult('test-suite', 'passed');
      
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalSteps).toBe(0);
      expect(result.statistics.passedSteps).toBe(0);
      expect(result.statistics.failedSteps).toBe(0);
      expect(result.statistics.pendingSteps).toBe(0);
      expect(result.statistics.skippedSteps).toBe(0);
      expect(result.statistics.executionTime).toBe(0);
      expect(result.statistics.averageStepTime).toBe(0);
      expect(result.statistics.successRate).toBe(0);
      expect(result.statistics.performance).toBeDefined();
    });

    it('should create immutable default objects', () => {
      const result1 = createDefaultTestResult('test-1', 'passed');
      const result2 = createDefaultTestResult('test-2', 'failed');
      
      // Modify first result
      result1.scenarios.push({ name: 'test' } as any);
      result1.statistics.totalSteps = 100;
      (result1.metadata as any).modified = true;
      
      // Second result should not be affected
      expect(result2.scenarios).toHaveLength(0);
      expect(result2.statistics.totalSteps).toBe(0);
      expect(result2.metadata).toEqual({});
    });

    it('should handle all valid status values', () => {
      const validStatuses = ['passed', 'failed', 'pending', 'cancelled'] as const;
      
      validStatuses.forEach(status => {
        const result = createDefaultTestResult('test-suite', status);
        expect(result.status).toBe(status);
        expect(() => validateTestResult(result)).not.toThrow();
      });
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate completely valid test result', () => {
      const validResult: TestResult = {
        testSuiteId: 'comprehensive-test-suite',
        startTime: new Date('2023-01-01T10:00:00.000Z'),
        endTime: new Date('2023-01-01T10:30:00.000Z'),
        status: 'pending',
        errorMessage: undefined,
        errorStack: undefined,
        totalScenarios: 5,
        passedScenarios: 4,
        failedScenarios: 1,
        pendingScenarios: 0,
        skippedScenarios: 0,
        scenarios: [],
        statistics: {
          totalSteps: 25,
          passedSteps: 20,
          failedSteps: 5,
          pendingSteps: 0,
          skippedSteps: 0,
          executionTime: 1800000,
          averageStepTime: 72000,
          successRate: 0.8,
          performance: {
            memoryUsage: 512000000,
            cpuUsage: 45.5,
            peakMemory: 768000000
          }
        },
        configuration: {
          testSuiteId: 'comprehensive-test-suite',
          featureFiles: ['features/test.feature'],
          stepDefinitions: ['steps/test-steps.js']
        },
        metadata: {
          environment: 'test',
          browser: 'chrome',
          version: '1.0.0',
          tags: ['regression', 'smoke']
        }
      };
      
      expect(() => validateTestResult(validResult)).not.toThrow();
    });

    it('should fail validation on first invalid field in complex object', () => {
      const invalidResult = {
        testSuiteId: null, // Invalid
        startTime: new Date(),
        endTime: 'invalid-date', // Invalid
        status: 'invalid-status', // Invalid
        totalScenarios: -1, // Invalid
        scenarios: 'not-array', // Invalid
        statistics: 'not-object' // Invalid
      };
      
      // Should fail on first validation error (testSuiteId)
      expect(() => validateTestResult(invalidResult)).toThrow(
        `${ErrorPrefixes.TEST_RESULT}: testSuiteId is required and must be a non-empty string`
      );
    });

    it('should handle edge case combinations', () => {
      // Test result with contradictory but individually valid fields
      const edgeCaseResult = {
        testSuiteId: 'edge-case-test',
        startTime: new Date('2023-12-31T23:59:59.999Z'),
        endTime: new Date('2023-01-01T00:00:00.000Z'), // Before startTime
        status: 'pending',
        totalScenarios: 0, // No scenarios but In Progress
        scenarios: [], // Empty but status is In Progress
        statistics: {} // Empty statistics
      };
      
      // Validation doesn't check logical consistency, only data types
      expect(() => validateTestResult(edgeCaseResult)).not.toThrow();
    });

    it('should handle memory-intensive large objects', () => {
      const largeResult = {
        testSuiteId: 'large-test-suite',
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 10000,
        scenarios: new Array(10000).fill({
          name: 'Large scenario with very long description'.repeat(100),
          status: 'pending',
          steps: [],
          duration: 1000
        }),
        statistics: {
          totalSteps: 100000,
          data: new Array(1000).fill('large data chunk'.repeat(1000))
        }
      };
      
      expect(() => validateTestResult(largeResult)).not.toThrow();
    });

    it('should handle circular reference gracefully', () => {
      const circularResult: any = {
        testSuiteId: 'circular-test',
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        totalScenarios: 0,
        scenarios: [],
        statistics: {}
      };
      
      // Add circular reference
      circularResult.statistics.parent = circularResult;
      
      // Validation should work as it doesn't traverse deeply
      expect(() => validateTestResult(circularResult)).not.toThrow();
    });
  });
});