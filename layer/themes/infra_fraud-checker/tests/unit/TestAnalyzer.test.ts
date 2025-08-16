import { TestAnalyzer, TestAnalysis } from '../../children/TestAnalyzer';

describe("TestAnalyzer", () => {
  let analyzer: TestAnalyzer;

  beforeEach(() => {
    analyzer = new TestAnalyzer();
  });

  describe("analyzeTestResults", () => {
    it('should analyze basic test metrics correctly', () => {
      const testResults = {
        totalTests: 10,
        passedTests: 8,
        failedTests: 1,
        skippedTests: 1,
        duration: 5000,
        codeSize: 1000
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.metrics).toEqual({
        totalTests: 10,
        passedTests: 8,
        failedTests: 1,
        skippedTests: 1,
        testDuration: 5000,
        averageTestTime: 500
      });
    });

    it('should handle missing test counts by calculating from total', () => {
      const testResults = {
        totalTests: 15,
        passedTests: 12,
        failedTests: 2,
        // skippedTests missing - should be calculated as 15 - 12 - 2 = 1
        duration: 3000
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.metrics.skippedTests).toBe(1);
      expect(analysis.metrics.totalTests).toBe(15);
    });

    it('should handle zero test duration correctly', () => {
      const testResults = {
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        skippedTests: 0,
        duration: 0
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.metrics.averageTestTime).toBe(0);
      expect(analysis.metrics.testDuration).toBe(0);
    });

    it('should handle missing duration and counts', () => {
      const testResults = {}; // Empty test results

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.metrics).toEqual({
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        testDuration: 0,
        averageTestTime: 0
      });
    });
  });

  describe('quality assessment', () => {
    it('should assess test coverage ratio correctly', () => {
      const testResults = {
        totalTests: 50,
        passedTests: 45,
        failedTests: 3,
        skippedTests: 2,
        codeSize: 5000 // 50 tests for 5000 LOC = 1 test per 100 LOC
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.quality.testCoverageRatio).toBe(1.0);
      expect(analysis.quality.hasEnoughTests).toBe(true);
    });

    it('should identify insufficient test coverage', () => {
      const testResults = {
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        skippedTests: 0,
        codeSize: 2000 // 5 tests for 2000 LOC = 0.25 tests per 100 LOC
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.quality.testCoverageRatio).toBe(0.25);
      expect(analysis.quality.hasEnoughTests).toBe(false);
    });

    it('should calculate skip ratio correctly', () => {
      const testResults = {
        totalTests: 20,
        passedTests: 14,
        failedTests: 2,
        skippedTests: 4 // 4/20 = 0.2 skip ratio
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.quality.skipRatio).toBe(0.2);
    });

    it('should calculate failure ratio correctly', () => {
      const testResults = {
        totalTests: 25,
        passedTests: 20,
        failedTests: 5,
        skippedTests: 0 // 5/25 = 0.2 failure ratio
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.quality.failureRatio).toBe(0.2);
    });

    it('should handle zero tests for ratio calculations', () => {
      const testResults = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.quality.skipRatio).toBe(0);
      expect(analysis.quality.failureRatio).toBe(0);
    });

    it('should use default code size when not provided', () => {
      const testResults = {
        totalTests: 10,
        passedTests: 10,
        failedTests: 0,
        skippedTests: 0
        // codeSize not provided - should default to 1000
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.quality.testCoverageRatio).toBe(1.0); // 10 tests / (1000/100) = 1.0
      expect(analysis.quality.hasEnoughTests).toBe(true);
    });
  });

  describe('suspicious pattern detection', () => {
    it('should detect suspiciously fast tests', () => {
      const testResults = {
        totalTests: 5,
        scenarios: [
          { name: 'test1', duration: 0.5 }, // Too fast
          { name: 'test2', duration: 2.0 }, // Normal
          { name: 'test3', duration: 0.3 }, // Too fast
          { name: 'test4', duration: 5.0 }, // Normal
          { name: 'test5', duration: 0.8 } // Too fast
        ]
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.suspicious.tooFastTests).toBe(3);
    });

    it('should detect identical tests by signature', () => {
      const testResults = {
        totalTests: 4,
        scenarios: [
          { name: 'test1', steps: [{ name: 'step1' }, { name: 'step2' }] },
          { name: 'test2', steps: [{ name: 'step1' }, { name: 'step2' }] }, // Identical to test1
          { name: 'test3', steps: [{ name: 'step3' }] },
          { name: 'test1', steps: [{ name: 'step1' }, { name: 'step2' }] } // Identical to test1 (exact duplicate)
        ]
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.suspicious.identicalTests).toBe(2); // Two duplicates of the first pattern
    });

    it('should detect tests with no assertions (fast duration)', () => {
      const testResults = {
        totalTests: 3,
        scenarios: [
          { name: 'test1', status: 'passed', duration: 0.3 }, // Suspiciously fast and passed
          { name: 'test2', status: 'passed', duration: 2.0 }, // Normal duration
          { name: 'test3', status: 'failed', duration: 0.2 } // Fast but failed (not suspicious)
        ]
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.suspicious.noAssertionTests).toBe(1);
    });

    it('should detect placeholder tests by name', () => {
      const testResults = {
        totalTests: 5,
        scenarios: [
          { name: 'TODO: implement this test', status: 'passed' },
          { name: 'normal test name', status: 'passed' },
          { name: 'pending implementation', status: 'passed' },
          { name: 'skip this for now', status: 'passed' },
          { name: 'test placeholder', status: 'passed' }
        ]
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.suspicious.noAssertionTests).toBe(4); // All placeholder patterns detected
    });

    it('should handle scenarios without steps', () => {
      const testResults = {
        totalTests: 2,
        scenarios: [
          { name: 'test1' }, // No steps property
          { name: 'test2', steps: [] } // Empty steps array
        ]
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.suspicious.identicalTests).toBe(1); // Both have empty step signatures
    });

    it('should handle missing scenarios array', () => {
      const testResults = {
        totalTests: 5
        // No scenarios property
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.suspicious.tooFastTests).toBe(0);
      expect(analysis.suspicious.identicalTests).toBe(0);
      expect(analysis.suspicious.noAssertionTests).toBe(0);
    });
  });

  describe("compareTestRuns", () => {
    it('should detect improvements when tests are added', () => {
      const previous: TestAnalysis = {
        metrics: { totalTests: 10, passedTests: 8, failedTests: 1, skippedTests: 1, testDuration: 1000, averageTestTime: 100 },
        quality: { hasEnoughTests: false, testCoverageRatio: 0.5, skipRatio: 0.1, failureRatio: 0.1 },
        suspicious: { tooFastTests: 0, identicalTests: 0, noAssertionTests: 0 }
      };

      const current: TestAnalysis = {
        metrics: { totalTests: 15, passedTests: 13, failedTests: 1, skippedTests: 1, testDuration: 1500, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 0.75, skipRatio: 0.067, failureRatio: 0.067 },
        suspicious: { tooFastTests: 0, identicalTests: 0, noAssertionTests: 0 }
      };

      const comparison = analyzer.compareTestRuns(previous, current);

      expect(comparison.improved).toBe(true);
      expect(comparison.changes).toContain('Added 5 new tests');
      expect(comparison.warnings).toHaveLength(0);
    });

    it('should detect regression when tests are removed', () => {
      const previous: TestAnalysis = {
        metrics: { totalTests: 20, passedTests: 18, failedTests: 1, skippedTests: 1, testDuration: 2000, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.05, failureRatio: 0.05 },
        suspicious: { tooFastTests: 0, identicalTests: 0, noAssertionTests: 0 }
      };

      const current: TestAnalysis = {
        metrics: { totalTests: 15, passedTests: 13, failedTests: 1, skippedTests: 1, testDuration: 1500, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 0.75, skipRatio: 0.067, failureRatio: 0.067 },
        suspicious: { tooFastTests: 0, identicalTests: 0, noAssertionTests: 0 }
      };

      const comparison = analyzer.compareTestRuns(previous, current);

      expect(comparison.improved).toBe(false);
      expect(comparison.changes).toHaveLength(0);
      expect(comparison.warnings).toContain('Removed 5 tests');
    });

    it('should detect increased skip ratio as warning', () => {
      const previous: TestAnalysis = {
        metrics: { totalTests: 10, passedTests: 9, failedTests: 0, skippedTests: 1, testDuration: 1000, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.1, failureRatio: 0.0 },
        suspicious: { tooFastTests: 0, identicalTests: 0, noAssertionTests: 0 }
      };

      const current: TestAnalysis = {
        metrics: { totalTests: 10, passedTests: 7, failedTests: 0, skippedTests: 3, testDuration: 700, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.3, failureRatio: 0.0 },
        suspicious: { tooFastTests: 0, identicalTests: 0, noAssertionTests: 0 }
      };

      const comparison = analyzer.compareTestRuns(previous, current);

      expect(comparison.improved).toBe(false);
      expect(comparison.warnings).toContain('Skip ratio increased');
    });

    it('should detect increased suspicious patterns as warnings', () => {
      const previous: TestAnalysis = {
        metrics: { totalTests: 10, passedTests: 10, failedTests: 0, skippedTests: 0, testDuration: 1000, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.0, failureRatio: 0.0 },
        suspicious: { tooFastTests: 1, identicalTests: 0, noAssertionTests: 0 }
      };

      const current: TestAnalysis = {
        metrics: { totalTests: 10, passedTests: 10, failedTests: 0, skippedTests: 0, testDuration: 500, averageTestTime: 50 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.0, failureRatio: 0.0 },
        suspicious: { tooFastTests: 3, identicalTests: 2, noAssertionTests: 1 }
      };

      const comparison = analyzer.compareTestRuns(previous, current);

      expect(comparison.improved).toBe(false);
      expect(comparison.warnings).toContain('More suspiciously fast tests detected');
      expect(comparison.warnings).toContain('More duplicate tests detected');
    });

    it('should mark as improved when no warnings and tests maintained or added', () => {
      const previous: TestAnalysis = {
        metrics: { totalTests: 10, passedTests: 8, failedTests: 2, skippedTests: 0, testDuration: 1000, averageTestTime: 100 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.0, failureRatio: 0.2 },
        suspicious: { tooFastTests: 2, identicalTests: 1, noAssertionTests: 1 }
      };

      const current: TestAnalysis = {
        metrics: { totalTests: 10, passedTests: 9, failedTests: 1, skippedTests: 0, testDuration: 1200, averageTestTime: 120 },
        quality: { hasEnoughTests: true, testCoverageRatio: 1.0, skipRatio: 0.0, failureRatio: 0.1 },
        suspicious: { tooFastTests: 1, identicalTests: 0, noAssertionTests: 0 }
      };

      const comparison = analyzer.compareTestRuns(previous, current);

      expect(comparison.improved).toBe(true);
      expect(comparison.warnings).toHaveLength(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined test results gracefully', () => {
      const analysis = analyzer.analyzeTestResults(undefined as any);

      expect(analysis.metrics.totalTests).toBe(0);
      expect(analysis.quality.skipRatio).toBe(0);
      expect(analysis.suspicious.tooFastTests).toBe(0);
    });

    it('should handle null scenarios array', () => {
      const testResults = {
        totalTests: 5,
        scenarios: null
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.suspicious.tooFastTests).toBe(0);
      expect(analysis.suspicious.identicalTests).toBe(0);
      expect(analysis.suspicious.noAssertionTests).toBe(0);
    });

    it('should handle scenarios with missing properties', () => {
      const testResults = {
        totalTests: 3,
        scenarios: [
          { name: 'test1' }, // Missing duration, status, steps
          { duration: 1.0 }, // Missing name, status, steps
          { status: 'passed', steps: [{ name: 'step1' }] } // Missing name, duration
        ]
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      // Should not crash and provide reasonable defaults
      expect(analysis.suspicious.tooFastTests).toBe(0);
      expect(analysis.suspicious.identicalTests).toBeGreaterThanOrEqual(0);
      expect(analysis.suspicious.noAssertionTests).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative or invalid durations', () => {
      const testResults = {
        totalTests: 3,
        scenarios: [
          { name: 'test1', duration: -1.0 }, // Negative duration
          { name: 'test2', duration: NaN }, // Invalid duration
          { name: 'test3', duration: 0.5 } // Valid but fast
        ]
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      // Should only count the valid fast test
      expect(analysis.suspicious.tooFastTests).toBe(1);
    });

    it('should handle very large test counts', () => {
      const testResults = {
        totalTests: 10000,
        passedTests: 9500,
        failedTests: 300,
        skippedTests: 200,
        duration: 120000, // 2 minutes
        codeSize: 100000 // 100k LOC
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.metrics.totalTests).toBe(10000);
      expect(analysis.metrics.averageTestTime).toBe(12); // 120000ms / 10000 tests
      expect(analysis.quality.testCoverageRatio).toBe(10); // 10000 tests / (100000/100)
      expect(analysis.quality.hasEnoughTests).toBe(true);
    });

    it('should handle extreme skip ratios', () => {
      const testResults = {
        totalTests: 100,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 100 // All tests skipped
      };

      const analysis = analyzer.analyzeTestResults(testResults);

      expect(analysis.quality.skipRatio).toBe(1.0);
      expect(analysis.quality.failureRatio).toBe(0.0);
    });
  });
});