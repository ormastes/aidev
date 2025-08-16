import { FraudReport } from '../../children/FraudReportGenerator';
import { FraudCheckResult } from '../../children/FraudChecker';
import { TestAnalysis } from '../../children/TestAnalyzer';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('Schema Validation Tests', () => {
  let ajv: Ajv;

  beforeAll(() => {
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
  });

  describe('FraudCheckResult Schema Validation', () => {
    const fraudCheckResultSchema = {
      type: 'object',
      required: ['passed', 'score', "violations", 'metrics'],
      properties: {
        passed: { type: 'boolean' },
        score: { type: 'number', minimum: 0, maximum: 100 },
        violations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', "severity", 'message', "location"],
            properties: {
              type: { 
                type: 'string',
                enum: ['test-manipulation', 'coverage-bypass', 'fake-assertions', 'disabled-tests']
              },
              severity: {
                type: 'string',
                enum: ["critical", 'high', 'medium', 'low']
              },
              message: { type: 'string', minLength: 1 },
              location: { type: 'string', minLength: 1 },
              pattern: {
                type: 'object',
                properties: {
                  type: { 
                    type: 'string',
                    enum: ['skip', 'only', 'empty', 'no-assertion', 'always-true']
                  },
                  location: {
                    type: 'object',
                    required: ['file', 'line', 'column'],
                    properties: {
                      file: { type: 'string' },
                      line: { type: 'number', minimum: 0 },
                      column: { type: 'number', minimum: 0 }
                    }
                  },
                  code: { type: 'string' }
                }
              }
            }
          }
        },
        metrics: {
          type: 'object',
          required: ["filesChecked", "totalTests", "skippedTests", "emptyTests", "suspiciousPatterns"],
          properties: {
            filesChecked: { type: 'number', minimum: 0 },
            totalTests: { type: 'number', minimum: 0 },
            skippedTests: { type: 'number', minimum: 0 },
            emptyTests: { type: 'number', minimum: 0 },
            suspiciousPatterns: { type: 'number', minimum: 0 }
          }
        }
      }
    };

    it('should validate clean fraud check result', () => {
      const cleanResult: FraudCheckResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: {
          filesChecked: 5,
          totalTests: 25,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 0
        }
      };

      const validate = ajv.compile(fraudCheckResultSchema);
      const isValid = validate(cleanResult);

      expect(isValid).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate fraud check result with violations', () => {
      const resultWithViolations: FraudCheckResult = {
        passed: false,
        score: 75,
        violations: [
          {
            type: 'test-manipulation',
            severity: 'high',
            message: 'Test isolation detected',
            location: 'test.ts:10:5',
            pattern: {
              type: 'only',
              location: { file: 'test.ts', line: 10, column: 5 },
              code: 'it.only'
            }
          },
          {
            type: 'fake-assertions',
            severity: "critical",
            message: 'Always-true assertion found',
            location: 'test.ts:15:8'
          }
        ],
        metrics: {
          filesChecked: 3,
          totalTests: 15,
          skippedTests: 2,
          emptyTests: 1,
          suspiciousPatterns: 2
        }
      };

      const validate = ajv.compile(fraudCheckResultSchema);
      const isValid = validate(resultWithViolations);

      expect(isValid).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should reject invalid fraud check result - missing required fields', () => {
      const invalidResult = {
        passed: true,
        score: 100
        // Missing violations and metrics
      };

      const validate = ajv.compile(fraudCheckResultSchema);
      const isValid = validate(invalidResult);

      expect(isValid).toBe(false);
      expect(validate.errors).toBeTruthy();
      
      const errors = validate.errors || [];
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.keyword === "required")).toBe(true);
    });

    it('should reject invalid fraud check result - invalid score range', () => {
      const invalidResult: Partial<FraudCheckResult> = {
        passed: true,
        score: 150, // Invalid: greater than 100
        violations: [],
        metrics: {
          filesChecked: 1,
          totalTests: 5,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 0
        }
      };

      const validate = ajv.compile(fraudCheckResultSchema);
      const isValid = validate(invalidResult);

      expect(isValid).toBe(false);
      expect(validate.errors?.some(error => error.keyword === 'maximum')).toBe(true);
    });

    it('should reject invalid fraud check result - invalid violation type', () => {
      const invalidResult: Partial<FraudCheckResult> = {
        passed: false,
        score: 80,
        violations: [
          {
            type: 'invalid-violation-type' as any,
            severity: 'high',
            message: 'Invalid violation',
            location: 'test.ts:1:1'
          }
        ],
        metrics: {
          filesChecked: 1,
          totalTests: 5,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 1
        }
      };

      const validate = ajv.compile(fraudCheckResultSchema);
      const isValid = validate(invalidResult);

      expect(isValid).toBe(false);
      expect(validate.errors?.some(error => error.keyword === 'enum')).toBe(true);
    });
  });

  describe('TestAnalysis Schema Validation', () => {
    const testAnalysisSchema = {
      type: 'object',
      required: ['metrics', 'quality', "suspicious"],
      properties: {
        metrics: {
          type: 'object',
          required: ["totalTests", "passedTests", "failedTests", "skippedTests", "testDuration", "averageTestTime"],
          properties: {
            totalTests: { type: 'number', minimum: 0 },
            passedTests: { type: 'number', minimum: 0 },
            failedTests: { type: 'number', minimum: 0 },
            skippedTests: { type: 'number', minimum: 0 },
            testDuration: { type: 'number', minimum: 0 },
            averageTestTime: { type: 'number', minimum: 0 }
          }
        },
        quality: {
          type: 'object',
          required: ["hasEnoughTests", "testCoverageRatio", "skipRatio", "failureRatio"],
          properties: {
            hasEnoughTests: { type: 'boolean' },
            testCoverageRatio: { type: 'number', minimum: 0 },
            skipRatio: { type: 'number', minimum: 0, maximum: 1 },
            failureRatio: { type: 'number', minimum: 0, maximum: 1 }
          }
        },
        suspicious: {
          type: 'object',
          required: ["tooFastTests", "identicalTests", "noAssertionTests"],
          properties: {
            tooFastTests: { type: 'number', minimum: 0 },
            identicalTests: { type: 'number', minimum: 0 },
            noAssertionTests: { type: 'number', minimum: 0 }
          }
        }
      }
    };

    it('should validate valid test analysis', () => {
      const validTestAnalysis: TestAnalysis = {
        metrics: {
          totalTests: 20,
          passedTests: 18,
          failedTests: 1,
          skippedTests: 1,
          testDuration: 5000,
          averageTestTime: 250
        },
        quality: {
          hasEnoughTests: true,
          testCoverageRatio: 0.8,
          skipRatio: 0.05,
          failureRatio: 0.05
        },
        suspicious: {
          tooFastTests: 2,
          identicalTests: 0,
          noAssertionTests: 1
        }
      };

      const validate = ajv.compile(testAnalysisSchema);
      const isValid = validate(validTestAnalysis);

      expect(isValid).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should reject test analysis with invalid ratio values', () => {
      const invalidTestAnalysis = {
        metrics: {
          totalTests: 10,
          passedTests: 8,
          failedTests: 1,
          skippedTests: 1,
          testDuration: 2000,
          averageTestTime: 200
        },
        quality: {
          hasEnoughTests: true,
          testCoverageRatio: 0.5,
          skipRatio: 1.5, // Invalid: greater than 1
          failureRatio: -0.1 // Invalid: less than 0
        },
        suspicious: {
          tooFastTests: 0,
          identicalTests: 0,
          noAssertionTests: 0
        }
      };

      const validate = ajv.compile(testAnalysisSchema);
      const isValid = validate(invalidTestAnalysis);

      expect(isValid).toBe(false);
      expect(validate.errors?.some(error => error.keyword === 'maximum' || error.keyword === 'minimum')).toBe(true);
    });
  });

  describe('FraudReport Schema Validation', () => {
    const fraudReportSchema = {
      type: 'object',
      required: ["timestamp", 'summary', 'details', "violations"],
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        summary: {
          type: 'object',
          required: ["overallScore", 'passed', "totalViolations", "criticalViolations", "recommendation"],
          properties: {
            overallScore: { type: 'number', minimum: 0, maximum: 100 },
            passed: { type: 'boolean' },
            totalViolations: { type: 'number', minimum: 0 },
            criticalViolations: { type: 'number', minimum: 0 },
            recommendation: { type: 'string', minLength: 1 }
          }
        },
        details: {
          type: 'object',
          required: ["fraudCheck"],
          properties: {
            fraudCheck: { 
              // Reference to FraudCheckResult schema
              type: 'object'
            },
            testAnalysis: {
              // Reference to TestAnalysis schema (optional)
              type: 'object'
            }
          }
        },
        violations: {
          type: 'object',
          required: ["bySeverity", 'byType'],
          properties: {
            bySeverity: {
              type: 'object',
              required: ["critical", 'high', 'medium', 'low'],
              properties: {
                critical: { type: 'array' },
                high: { type: 'array' },
                medium: { type: 'array' },
                low: { type: 'array' }
              }
            },
            byType: {
              type: 'object',
              required: ['test-manipulation', 'coverage-bypass', 'fake-assertions', 'disabled-tests'],
              properties: {
                'test-manipulation': { type: 'array' },
                'coverage-bypass': { type: 'array' },
                'fake-assertions': { type: 'array' },
                'disabled-tests': { type: 'array' }
              }
            }
          }
        }
      }
    };

    it('should validate complete fraud report', () => {
      const validReport: FraudReport = {
        timestamp: new Date().toISOString(),
        summary: {
          overallScore: 85,
          passed: false,
          totalViolations: 2,
          criticalViolations: 1,
          recommendation: 'Some issues detected. Review and improve test quality.'
        },
        details: {
          fraudCheck: {
            passed: false,
            score: 85,
            violations: [
              {
                type: 'fake-assertions',
                severity: "critical",
                message: 'Always-true assertion',
                location: 'test.ts:5:2'
              }
            ],
            metrics: {
              filesChecked: 2,
              totalTests: 10,
              skippedTests: 1,
              emptyTests: 0,
              suspiciousPatterns: 1
            }
          }
        },
        violations: {
          bySeverity: {
            critical: [
              {
                type: 'fake-assertions',
                severity: "critical",
                message: 'Always-true assertion',
                location: 'test.ts:5:2'
              }
            ],
            high: [],
            medium: [],
            low: []
          },
          byType: {
            'test-manipulation': [],
            'coverage-bypass': [],
            'fake-assertions': [
              {
                type: 'fake-assertions',
                severity: "critical",
                message: 'Always-true assertion',
                location: 'test.ts:5:2'
              }
            ],
            'disabled-tests': []
          }
        }
      };

      const validate = ajv.compile(fraudReportSchema);
      const isValid = validate(validReport);

      expect(isValid).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should reject fraud report with invalid timestamp', () => {
      const invalidReport = {
        timestamp: 'not-a-valid-date',
        summary: {
          overallScore: 100,
          passed: true,
          totalViolations: 0,
          criticalViolations: 0,
          recommendation: 'All tests are clean'
        },
        details: {
          fraudCheck: {
            passed: true,
            score: 100,
            violations: [],
            metrics: {
              filesChecked: 1,
              totalTests: 5,
              skippedTests: 0,
              emptyTests: 0,
              suspiciousPatterns: 0
            }
          }
        },
        violations: {
          bySeverity: { critical: [], high: [], medium: [], low: [] },
          byType: { 'test-manipulation': [], 'coverage-bypass': [], 'fake-assertions': [], 'disabled-tests': [] }
        }
      };

      const validate = ajv.compile(fraudReportSchema);
      const isValid = validate(invalidReport);

      expect(isValid).toBe(false);
      expect(validate.errors?.some(error => error.keyword === 'format')).toBe(true);
    });

    it('should reject fraud report with missing violation categories', () => {
      const invalidReport = {
        timestamp: new Date().toISOString(),
        summary: {
          overallScore: 100,
          passed: true,
          totalViolations: 0,
          criticalViolations: 0,
          recommendation: 'All tests are clean'
        },
        details: {
          fraudCheck: {
            passed: true,
            score: 100,
            violations: [],
            metrics: {
              filesChecked: 1,
              totalTests: 5,
              skippedTests: 0,
              emptyTests: 0,
              suspiciousPatterns: 0
            }
          }
        },
        violations: {
          bySeverity: { critical: [], high: [] }, // Missing medium and low
          byType: { 'test-manipulation': [] } // Missing other types
        }
      };

      const validate = ajv.compile(fraudReportSchema);
      const isValid = validate(invalidReport);

      expect(isValid).toBe(false);
      expect(validate.errors?.some(error => error.keyword === "required")).toBe(true);
    });
  });

  describe('Cross-schema Consistency Validation', () => {
    it('should validate consistency between fraud check result and report summary', () => {
      const fraudCheckResult: FraudCheckResult = {
        passed: false,
        score: 75,
        violations: [
          {
            type: 'test-manipulation',
            severity: 'high',
            message: 'Test isolation',
            location: 'test.ts:1:1'
          },
          {
            type: 'fake-assertions',
            severity: "critical",
            message: 'Always true',
            location: 'test.ts:2:1'
          }
        ],
        metrics: {
          filesChecked: 1,
          totalTests: 5,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 2
        }
      };

      // Simulate report generation logic
      const criticalViolations = fraudCheckResult.violations.filter(v => v.severity === "critical").length;
      const totalViolations = fraudCheckResult.violations.length;

      expect(criticalViolations).toBe(1);
      expect(totalViolations).toBe(2);
      expect(fraudCheckResult.score).toBe(75);
      expect(fraudCheckResult.passed).toBe(false);
    });

    it('should validate violation categorization consistency', () => {
      const violations = [
        { type: 'test-manipulation', severity: 'high', message: 'High violation', location: 'test1.ts' },
        { type: 'fake-assertions', severity: "critical", message: 'Critical violation', location: 'test2.ts' },
        { type: 'disabled-tests', severity: 'medium', message: 'Medium violation', location: 'test3.ts' },
        { type: 'coverage-bypass', severity: 'low', message: 'Low violation', location: 'test4.ts' }
      ];

      // Simulate categorization logic
      const bySeverity = {
        critical: violations.filter(v => v.severity === "critical"),
        high: violations.filter(v => v.severity === 'high'),
        medium: violations.filter(v => v.severity === 'medium'),
        low: violations.filter(v => v.severity === 'low')
      };

      const byType = {
        'test-manipulation': violations.filter(v => v.type === 'test-manipulation'),
        'coverage-bypass': violations.filter(v => v.type === 'coverage-bypass'),
        'fake-assertions': violations.filter(v => v.type === 'fake-assertions'),
        'disabled-tests': violations.filter(v => v.type === 'disabled-tests')
      };

      // Verify categorization
      expect(bySeverity.critical).toHaveLength(1);
      expect(bySeverity.high).toHaveLength(1);
      expect(bySeverity.medium).toHaveLength(1);
      expect(bySeverity.low).toHaveLength(1);

      expect(byType['test-manipulation']).toHaveLength(1);
      expect(byType['fake-assertions']).toHaveLength(1);
      expect(byType['disabled-tests']).toHaveLength(1);
      expect(byType['coverage-bypass']).toHaveLength(1);

      // Verify total consistency
      const totalBySeverity = Object.values(bySeverity).reduce((sum, arr) => sum + arr.length, 0);
      const totalByType = Object.values(byType).reduce((sum, arr) => sum + arr.length, 0);

      expect(totalBySeverity).toBe(violations.length);
      expect(totalByType).toBe(violations.length);
    });

    it('should validate metrics consistency', () => {
      const metrics = {
        filesChecked: 5,
        totalTests: 25,
        skippedTests: 3,
        emptyTests: 2,
        suspiciousPatterns: 8
      };

      // Validate logical consistency
      expect(metrics.skippedTests).toBeLessThanOrEqual(metrics.totalTests);
      expect(metrics.emptyTests).toBeLessThanOrEqual(metrics.totalTests);
      expect(metrics.filesChecked).toBeGreaterThanOrEqual(0);
      expect(metrics.suspiciousPatterns).toBeGreaterThanOrEqual(0);

      // Validate that suspicious patterns could include skipped and empty tests
      expect(metrics.suspiciousPatterns).toBeGreaterThanOrEqual(metrics.skippedTests + metrics.emptyTests);
    });
  });

  describe('Edge Case Schema Validation', () => {
    it('should handle empty results correctly', () => {
      const emptyResult: FraudCheckResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: {
          filesChecked: 0,
          totalTests: 0,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 0
        }
      };

      const fraudCheckResultSchema = {
        type: 'object',
        required: ['passed', 'score', "violations", 'metrics'],
        properties: {
          passed: { type: 'boolean' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          violations: { type: 'array' },
          metrics: {
            type: 'object',
            required: ["filesChecked", "totalTests", "skippedTests", "emptyTests", "suspiciousPatterns"],
            properties: {
              filesChecked: { type: 'number', minimum: 0 },
              totalTests: { type: 'number', minimum: 0 },
              skippedTests: { type: 'number', minimum: 0 },
              emptyTests: { type: 'number', minimum: 0 },
              suspiciousPatterns: { type: 'number', minimum: 0 }
            }
          }
        }
      };

      const validate = ajv.compile(fraudCheckResultSchema);
      const isValid = validate(emptyResult);

      expect(isValid).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should handle maximum violation counts', () => {
      const maxViolations = Array.from({ length: 1000 }, (_, i) => ({
        type: 'fake-assertions' as const,
        severity: 'low' as const,
        message: `Violation ${i}`,
        location: `test${i}.ts:1:1`
      }));

      const maxResult: FraudCheckResult = {
        passed: false,
        score: 0,
        violations: maxViolations,
        metrics: {
          filesChecked: 100,
          totalTests: 5000,
          skippedTests: 500,
          emptyTests: 200,
          suspiciousPatterns: 1000
        }
      };

      const fraudCheckResultSchema = {
        type: 'object',
        required: ['passed', 'score', "violations", 'metrics'],
        properties: {
          passed: { type: 'boolean' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          violations: { 
            type: 'array',
            maxItems: 10000 // Set reasonable limit
          },
          metrics: { type: 'object' }
        }
      };

      const validate = ajv.compile(fraudCheckResultSchema);
      const isValid = validate(maxResult);

      expect(isValid).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate boundary score values', () => {
      const boundaryScores = [0, 1, 50, 99, 100];
      
      boundaryScores.forEach(score => {
        const result: FraudCheckResult = {
          passed: score === 100,
          score,
          violations: [],
          metrics: {
            filesChecked: 1,
            totalTests: 1,
            skippedTests: 0,
            emptyTests: 0,
            suspiciousPatterns: 0
          }
        };

        const schema = {
          type: 'object',
          properties: {
            score: { type: 'number', minimum: 0, maximum: 100 }
          }
        };

        const validate = ajv.compile(schema);
        const isValid = validate(result);

        expect(isValid).toBe(true);
      });
    });
  });
});