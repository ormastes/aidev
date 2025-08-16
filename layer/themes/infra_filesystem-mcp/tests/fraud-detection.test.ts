import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryReportValidator } from '../children/StoryReportValidator';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('Fraud Detection Unit Tests', () => {
  let validator: StoryReportValidator;

  const baseReport = {
    metadata: {
      reportGenerated: '2025-07-23T10:00:00Z',
      reportGenerator: 'Mock Free Test Oriented Development Story Reporter',
      version: '1.0.0',
      format: 'json'
    },
    coverage: {
      systemTest: {
        class: { percentage: 95, covered: 95, total: 100 },
        branch: { percentage: 95, covered: 95, total: 100 }
      }
    },
    duplication: { percentage: 5, duplicatedLines: 50, totalLines: 1000 },
    setupConfig: { testFramework: 'jest', environment: 'test', testTimeout: 5000 }
  };

  beforeEach(() => {
    validator = new StoryReportValidator();
    
    vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
      if (path.includes('schema')) {
        return JSON.stringify({ type: 'object' });
      }
      throw new Error('Unknown file');
    });
  });

  describe('Skipped Test Detection', () => {
    it('should not penalize a few skipped steps', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 1000,
          totalTests: 10,
          passedTests: 9,
          failedTests: 0,
          scenarios: [
            {
              name: 'Scenario 1',
              status: 'passed',
              duration: 100,
              steps: [
                { name: 'Step 1', status: 'passed' },
                { name: 'Step 2', status: 'skipped' } // 1 skipped step
              ]
            }
          ]
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBe(95); // -5 for one skipped step
      expect(result.criteria.fraudCheck.passed).toBe(true);
    });

    it('should heavily penalize many skipped steps', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 1000,
          totalTests: 10,
          passedTests: 5,
          failedTests: 0,
          scenarios: Array(5).fill(null).map((_, i) => ({
            name: `Scenario ${i}`,
            status: 'passed',
            duration: 100,
            steps: [
              { name: 'Step 1', status: 'skipped' },
              { name: 'Step 2', status: 'skipped' }
            ]
          }))
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBeLessThan(50); // Many skipped steps
      expect(result.criteria.fraudCheck.passed).toBe(false);
    });

    it('should detect high skip ratio in scenarios', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 1000,
          totalTests: 5,
          passedTests: 3,
          failedTests: 0,
          scenarios: [
            { name: 'Scenario 1', status: 'passed', duration: 100 },
            { name: 'Scenario 2', status: 'passed', duration: 100 },
            { name: 'Scenario 3', status: 'skipped', duration: 0 },
            { name: 'Scenario 4', status: 'skipped', duration: 0 },
            { name: 'Scenario 5', status: 'passed', duration: 100 }
          ]
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      // 40% skipped (2/5) > 20% threshold, so -15 penalty
      expect(result.criteria.fraudCheck.actual).toBe(85);
      expect(result.criteria.fraudCheck.passed).toBe(false);
      expect(result.suggestions.some(s => s.includes('High ratio of skipped tests'))).toBe(true);
    });

    it('should handle edge case of exactly 20% skipped', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 1000,
          totalTests: 10,
          passedTests: 8,
          failedTests: 0,
          scenarios: [
            { name: 'Scenario 1', status: 'passed', duration: 100 },
            { name: 'Scenario 2', status: 'passed', duration: 100 },
            { name: 'Scenario 3', status: 'passed', duration: 100 },
            { name: 'Scenario 4', status: 'passed', duration: 100 },
            { name: 'Scenario 5', status: 'passed', duration: 100 },
            { name: 'Scenario 6', status: 'passed', duration: 100 },
            { name: 'Scenario 7', status: 'passed', duration: 100 },
            { name: 'Scenario 8', status: 'passed', duration: 100 },
            { name: 'Scenario 9', status: 'skipped', duration: 0 },
            { name: 'Scenario 10', status: 'skipped', duration: 0 }
          ]
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      // Exactly 20% skipped - no high ratio penalty
      expect(result.criteria.fraudCheck.actual).toBe(100);
      expect(result.criteria.fraudCheck.passed).toBe(true);
    });
  });

  describe('Coverage Manipulation Detection', () => {
    it('should detect suspiciously high coverage with very few tests', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          totalTests: 3, // Very few tests
          passedTests: 3,
          failedTests: 0,
          scenarios: [
            { name: 'Test 1', status: 'passed', duration: 30 },
            { name: 'Test 2', status: 'passed', duration: 30 },
            { name: 'Test 3', status: 'passed', duration: 40 }
          ]
        },
        coverage: {
          systemTest: {
            class: { percentage: 95, covered: 95, total: 100 }, // Suspiciously high
            branch: { percentage: 95, covered: 95, total: 100 }
          }
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBe(80); // -20 for suspicious coverage
      expect(result.criteria.fraudCheck.passed).toBe(false);
      expect(result.suggestions.some(s => s.includes('Suspiciously high coverage'))).toBe(true);
    });

    it('should allow high coverage with sufficient tests', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 1000,
          totalTests: 50, // Many tests
          passedTests: 50,
          failedTests: 0,
          scenarios: Array(50).fill(null).map((_, i) => ({
            name: `Test ${i}`,
            status: 'passed',
            duration: 20
          }))
        },
        coverage: {
          systemTest: {
            class: { percentage: 98, covered: 98, total: 100 }, // High but justified
            branch: { percentage: 97, covered: 97, total: 100 }
          }
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBe(100); // No penalty
      expect(result.criteria.fraudCheck.passed).toBe(true);
    });

    it('should not penalize low coverage regardless of test count', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          totalTests: 2, // Few tests
          passedTests: 2,
          failedTests: 0,
          scenarios: [
            { name: 'Test 1', status: 'passed', duration: 50 },
            { name: 'Test 2', status: 'passed', duration: 50 }
          ]
        },
        coverage: {
          systemTest: {
            class: { percentage: 50, covered: 50, total: 100 }, // Low coverage
            branch: { percentage: 45, covered: 45, total: 100 }
          }
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 40,
        branchCoverage: 40,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBe(100); // No fraud penalty
      expect(result.criteria.fraudCheck.passed).toBe(true);
    });
  });

  describe('Combined Fraud Scenarios', () => {
    it('should accumulate penalties for multiple violations', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          totalTests: 4, // Few tests (triggers suspicious coverage)
          passedTests: 2,
          failedTests: 0,
          scenarios: [
            { name: 'Test 1', status: 'passed', duration: 25 },
            { name: 'Test 2', status: 'passed', duration: 25 },
            { name: 'Test 3', status: 'skipped', duration: 0 }, // Skip penalty
            { 
              name: 'Test 4', 
              status: 'passed', 
              duration: 50,
              steps: [
                { name: 'Step 1', status: 'skipped' }, // Additional skip
                { name: 'Step 2', status: 'passed' }
              ]
            }
          ]
        },
        coverage: {
          systemTest: {
            class: { percentage: 92, covered: 92, total: 100 }, // High with few tests
            branch: { percentage: 91, covered: 91, total: 100 }
          }
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      // Penalties: -5 (skipped step) -15 (high skip ratio) -20 (suspicious coverage) = 60
      expect(result.criteria.fraudCheck.actual).toBe(60);
      expect(result.criteria.fraudCheck.passed).toBe(false);
      expect(result.errors.some(e => e.includes('Fraud check score'))).toBe(true);
    });

    it('should cap fraud score at 0 minimum', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'failed',
          duration: 0,
          totalTests: 1,
          passedTests: 0,
          failedTests: 0,
          scenarios: Array(20).fill(null).map((_, i) => ({
            name: `Test ${i}`,
            status: 'skipped',
            duration: 0,
            steps: Array(5).fill(null).map((_, j) => ({
              name: `Step ${j}`,
              status: 'skipped'
            }))
          }))
        },
        coverage: {
          systemTest: {
            class: { percentage: 99, covered: 99, total: 100 },
            branch: { percentage: 99, covered: 99, total: 100 }
          }
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBe(0); // Capped at 0
      expect(result.criteria.fraudCheck.passed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty test results', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 0,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          scenarios: []
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBe(100); // No violations
      expect(result.criteria.fraudCheck.passed).toBe(true);
    });

    it('should handle missing scenarios array', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          totalTests: 5,
          passedTests: 5,
          failedTests: 0
          // No scenarios property
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBe(100);
      expect(result.criteria.fraudCheck.passed).toBe(true);
    });

    it('should handle scenarios without steps', async () => {
      const report = {
        ...baseReport,
        testResults: {
          testSuiteId: 'test',
          status: 'passed',
          duration: 100,
          totalTests: 3,
          passedTests: 3,
          failedTests: 0,
          scenarios: [
            { name: 'Test 1', status: 'passed', duration: 30 },
            { name: 'Test 2', status: 'passed', duration: 30 }, // No steps
            { name: 'Test 3', status: 'passed', duration: 40 }
          ]
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));

      const result = await validator.validate('/tmp/report.json', {
        systemTestClassCoverage: 90,
        branchCoverage: 90,
        duplication: 10,
        fraudCheckMinScore: 90
      });

      expect(result.criteria.fraudCheck.actual).toBeGreaterThanOrEqual(80);
    });
  });
});