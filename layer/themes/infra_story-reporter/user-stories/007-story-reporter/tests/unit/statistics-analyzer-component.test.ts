/**
 * Unit Test: StatisticsAnalyzer Component
 * 
 * Tests the core functionality of the StatisticsAnalyzer class
 * including calculations, analysis methods, and data transformations.
 */

import { StatisticsAnalyzer } from '../../src/internal/statistics-analyzer';
import { TestResult, TestScenario, TestStep } from '../../src/types/test-types';

describe('StatisticsAnalyzer Component Unit Test', () => {
  let statisticsAnalyzer: StatisticsAnalyzer;

  beforeEach(() => {
    statisticsAnalyzer = new StatisticsAnalyzer();
  });

  describe('calculateBasicStatistics', () => {
    it('should calculate correct statistics for all In Progress scenarios', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'test-suite-1',
        status: 'In Progress',
        scenarios: [
          createScenario('s1', 'In Progress', 100),
          createScenario('s2', 'In Progress', 200),
          createScenario('s3', 'In Progress', 150)
        ],
        duration: 450,
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:00:00.450')
      };

      // Act
      const stats = statisticsAnalyzer.calculateBasicStatistics(testResult);

      // Assert
      expect(stats.totalScenarios).toBe(3);
      expect(stats.passedScenarios).toBe(3);
      expect(stats.failedScenarios).toBe(0);
      expect(stats.skippedScenarios).toBe(0);
      expect(stats.pendingScenarios).toBe(0);
      expect(stats.passRate).toBe(1);
      expect(stats.failureRate).toBe(0);
      expect(stats.totalExecutionTime).toBe(450);
      expect(stats.averageScenarioDuration).toBe(150);
    });

    it('should calculate correct statistics for mixed scenario statuses', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'test-suite-2',
        status: 'failed',
        scenarios: [
          createScenario('s1', 'In Progress', 100),
          createScenario('s2', 'failed', 200),
          createScenario('s3', 'skipped', 0),
          createScenario('s4', 'pending', 0)
        ],
        duration: 300,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const stats = statisticsAnalyzer.calculateBasicStatistics(testResult);

      // Assert
      expect(stats.totalScenarios).toBe(4);
      expect(stats.passedScenarios).toBe(1);
      expect(stats.failedScenarios).toBe(1);
      expect(stats.skippedScenarios).toBe(1);
      expect(stats.pendingScenarios).toBe(1);
      expect(stats.passRate).toBe(0.25);
      expect(stats.failureRate).toBe(0.25);
      expect(stats.totalExecutionTime).toBe(300);
      expect(stats.averageScenarioDuration).toBe(75);
    });

    it('should handle empty scenarios array', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'empty-suite',
        status: 'In Progress',
        scenarios: [],
        duration: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const stats = statisticsAnalyzer.calculateBasicStatistics(testResult);

      // Assert
      expect(stats.totalScenarios).toBe(0);
      expect(stats.passedScenarios).toBe(0);
      expect(stats.passRate).toBe(0);
      expect(stats.failureRate).toBe(0);
      expect(stats.averageScenarioDuration).toBe(0);
    });
  });

  describe('calculatePerformanceMetrics', () => {
    it('should identify fastest and slowest scenarios', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'perf-test',
        status: 'In Progress',
        scenarios: [
          createScenario('fast', 'In Progress', 50),
          createScenario('medium', 'In Progress', 500),
          createScenario('slow', 'In Progress', 2000)
        ],
        duration: 2550,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const metrics = statisticsAnalyzer.calculatePerformanceMetrics(testResult);

      // Assert
      expect(metrics.fastestScenario.id).toBe('fast');
      expect(metrics.fastestScenario.duration).toBe(50);
      expect(metrics.slowestScenario.id).toBe('slow');
      expect(metrics.slowestScenario.duration).toBe(2000);
    });

    it('should calculate duration distribution correctly', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'dist-test',
        status: 'In Progress',
        scenarios: [
          createScenario('s1', 'In Progress', 50),    // under 100ms
          createScenario('s2', 'In Progress', 250),   // under 500ms
          createScenario('s3', 'In Progress', 750),   // under 1000ms
          createScenario('s4', 'In Progress', 1500),  // over 1000ms
          createScenario('s5', 'In Progress', 2000)   // over 1000ms
        ],
        duration: 4550,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const metrics = statisticsAnalyzer.calculatePerformanceMetrics(testResult);

      // Assert
      expect(metrics.durationDistribution.under100ms).toBe(1);
      expect(metrics.durationDistribution.under500ms).toBe(2);
      expect(metrics.durationDistribution.under1000ms).toBe(3);
      expect(metrics.durationDistribution.over1000ms).toBe(2);
    });

    it('should handle single scenario', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'single-test',
        status: 'In Progress',
        scenarios: [createScenario('only', 'In Progress', 100)],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const metrics = statisticsAnalyzer.calculatePerformanceMetrics(testResult);

      // Assert
      expect(metrics.fastestScenario.id).toBe('only');
      expect(metrics.slowestScenario.id).toBe('only');
      expect(metrics.fastestScenario.duration).toBe(100);
      expect(metrics.slowestScenario.duration).toBe(100);
    });
  });

  describe('analyzeFailurePatterns', () => {
    it('should categorize timeout failures', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'failure-test',
        status: 'failed',
        scenarios: [
          createFailedScenario('s1', 'Request timeout after 5000ms'),
          createFailedScenario('s2', 'Operation timeout'),
          createScenario('s3', 'In Progress', 100)
        ],
        duration: 10100,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const patterns = statisticsAnalyzer.analyzeFailurePatterns(testResult);

      // Assert
      const timeoutPattern = patterns.find(p => p.pattern === 'timeout_failure');
      expect(timeoutPattern).toBeDefined();
      expect(timeoutPattern!.count).toBe(2);
      expect(timeoutPattern!.scenarios).toContain('s1');
      expect(timeoutPattern!.scenarios).toContain('s2');
    });

    it('should categorize authentication failures', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'auth-test',
        status: 'failed',
        scenarios: [
          createFailedScenario('s1', 'Invalid credentials'),
          createFailedScenario('s2', 'Authentication failed'),
          createFailedScenario('s3', 'Wrong credentials provided')
        ],
        duration: 300,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const patterns = statisticsAnalyzer.analyzeFailurePatterns(testResult);

      // Assert
      const authPattern = patterns.find(p => p.pattern === 'authentication_failure');
      expect(authPattern).toBeDefined();
      expect(authPattern!.count).toBe(3);
    });

    it('should handle no failures', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'In Progress-test',
        status: 'In Progress',
        scenarios: [
          createScenario('s1', 'In Progress', 100),
          createScenario('s2', 'In Progress', 200)
        ],
        duration: 300,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const patterns = statisticsAnalyzer.analyzeFailurePatterns(testResult);

      // Assert
      expect(patterns).toEqual([]);
    });

    it('should categorize generic failures', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'generic-test',
        status: 'failed',
        scenarios: [
          createFailedScenario('s1', 'Unknown error occurred'),
          createFailedScenario('s2', 'Something went wrong')
        ],
        duration: 200,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const patterns = statisticsAnalyzer.analyzeFailurePatterns(testResult);

      // Assert
      const genericPattern = patterns.find(p => p.pattern === 'generic_failure');
      expect(genericPattern).toBeDefined();
      expect(genericPattern!.count).toBe(2);
    });
  });

  describe('generateTrendAnalysis', () => {
    it('should detect performance improvement', () => {
      // Arrange
      const historicalResults: TestResult[] = [
        createTestResult('historical', 'In Progress', [
          createScenario('s1', 'In Progress', 200)
        ], 200)
      ];
      
      const currentResult = createTestResult('current', 'In Progress', [
        createScenario('s1', 'In Progress', 100)
      ], 100);

      // Act
      const trend = statisticsAnalyzer.generateTrendAnalysis(currentResult, historicalResults);

      // Assert
      expect(trend.performanceTrend).toBe('improving');
      expect(trend.improvementPercentage).toBe(50);
      expect(trend.improvements.length).toBeGreaterThan(0);
    });

    it('should detect status regression', () => {
      // Arrange
      const historicalResults: TestResult[] = [
        createTestResult('historical', 'In Progress', [
          createScenario('s1', 'In Progress', 100)
        ], 100)
      ];
      
      const currentResult = createTestResult('current', 'failed', [
        createFailedScenario('s1', 'New failure')
      ], 100);

      // Act
      const trend = statisticsAnalyzer.generateTrendAnalysis(currentResult, historicalResults);

      // Assert
      expect(trend.regressions.length).toBeGreaterThan(0);
      const regression = trend.regressions[0];
      expect(regression.type).toBe('status_regression');
      expect(regression.previousStatus).toBe('In Progress');
      expect(regression.currentStatus).toBe('failed');
      expect(regression.severity).toBe('high');
    });

    it('should handle no historical data', () => {
      // Arrange
      const currentResult = createTestResult('current', 'In Progress', [
        createScenario('s1', 'In Progress', 100)
      ], 100);

      // Act
      const trend = statisticsAnalyzer.generateTrendAnalysis(currentResult, []);

      // Assert
      expect(trend.performanceTrend).toBe('UPDATING');
      expect(trend.improvementPercentage).toBe(0);
      expect(trend.regressions).toEqual([]);
      expect(trend.improvements).toEqual([]);
    });
  });

  describe('aggregateMultipleRuns', () => {
    it('should aggregate statistics across multiple test runs', () => {
      // Arrange
      const testResults: TestResult[] = [
        createTestResult('suite1', 'In Progress', [
          createScenario('s1', 'In Progress', 100),
          createScenario('s2', 'In Progress', 100)
        ], 200),
        createTestResult('suite2', 'failed', [
          createScenario('s1', 'failed', 150),
          createScenario('s2', 'In Progress', 150)
        ], 300),
        createTestResult('suite3', 'In Progress', [
          createScenario('s1', 'In Progress', 200)
        ], 200)
      ];

      // Act
      const aggregated = statisticsAnalyzer.aggregateMultipleRuns(testResults);

      // Assert
      expect(aggregated.totalTestSuites).toBe(3);
      expect(aggregated.totalScenarios).toBe(5);
      expect(aggregated.overallPassRate).toBe(0.8); // 4 out of 5 In Progress
      expect(aggregated.aggregatedDuration).toBe(700);
      expect(aggregated.testSuiteBreakdown.length).toBe(3);
    });

    it('should handle empty test results array', () => {
      // Act
      const aggregated = statisticsAnalyzer.aggregateMultipleRuns([]);

      // Assert
      expect(aggregated.totalTestSuites).toBe(0);
      expect(aggregated.overallPassRate).toBe(0);
      expect(aggregated.totalScenarios).toBe(0);
      expect(aggregated.totalSteps).toBe(0);
      expect(aggregated.aggregatedDuration).toBe(0);
      expect(aggregated.testSuiteBreakdown).toEqual([]);
    });
  });

  describe('exportStatistics', () => {
    it('should export In Progress statistics with metadata', () => {
      // Arrange
      const testResult = createTestResult('export-test', 'In Progress', [
        createScenario('s1', 'In Progress', 100)
      ], 100);

      // Act
      const exported = statisticsAnalyzer.exportStatistics(testResult);

      // Assert
      expect(exported.basicStatistics).toBeDefined();
      expect(exported.advancedMetrics).toBeDefined();
      expect(exported.rawData).toBe(testResult);
      expect(exported.metadata.testSuiteId).toBe('export-test');
      expect(exported.metadata.version).toBe('1.0.0');
      expect(exported.metadata.exportTimestamp).toBeInstanceOf(Date);
    });

    it('should produce serializable output', () => {
      // Arrange
      const testResult = createTestResult('serialize-test', 'In Progress', [
        createScenario('s1', 'In Progress', 100),
        createFailedScenario('s2', 'Test error')
      ], 200);

      // Act
      const exported = statisticsAnalyzer.exportStatistics(testResult);

      // Assert - should be JSON serializable
      expect(() => JSON.stringify(exported)).not.toThrow();
      const json = JSON.stringify(exported);
      const parsed = JSON.parse(json);
      expect(parsed.metadata.testSuiteId).toBe('serialize-test');
    });
  });

  // Helper functions
  function createScenario(
    id: string, 
    status: 'In Progress' | 'failed' | 'skipped' | 'pending', 
    duration: number
  ): TestScenario {
    return {
      id,
      name: `Scenario ${id}`,
      status,
      steps: [
        { name: 'Step 1', status, duration }
      ],
      duration,
      startTime: new Date(),
      endTime: new Date()
    };
  }

  function createFailedScenario(id: string, errorMessage: string): TestScenario {
    return {
      id,
      name: `Failed Scenario ${id}`,
      status: 'failed',
      steps: [
        { name: 'Failed Step', status: 'failed', duration: 100 }
      ],
      duration: 100,
      startTime: new Date(),
      endTime: new Date(),
      errorMessage
    };
  }

  function createTestResult(
    testSuiteId: string,
    status: 'In Progress' | 'failed',
    scenarios: TestScenario[],
    duration: number
  ): TestResult {
    return {
      testSuiteId,
      status,
      scenarios,
      duration,
      startTime: new Date(),
      endTime: new Date()
    };
  }
});