/**
 * Unit Test: StatisticsAnalyzer Edge Cases
 * 
 * Tests edge cases, boundary conditions, and error handling
 * for the StatisticsAnalyzer component.
 */

import { StatisticsAnalyzer } from '../../src/internal/statistics-analyzer';
import { TestResult, TestScenario } from '../../src/types/test-types';

describe('StatisticsAnalyzer Edge Cases Unit Test', () => {
  let statisticsAnalyzer: StatisticsAnalyzer;

  beforeEach(() => {
    statisticsAnalyzer = new StatisticsAnalyzer();
  });

  describe('Edge cases for calculateBasicStatistics', () => {
    it('should handle test result with no scenarios', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'empty-test',
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
      expect(stats.failedScenarios).toBe(0);
      expect(stats.passRate).toBe(0);
      expect(stats.failureRate).toBe(0);
      expect(stats.averageScenarioDuration).toBe(0);
    });

    it('should handle scenarios with zero duration', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'zero-duration-test',
        status: 'In Progress',
        scenarios: [
          {
            id: 's1',
            name: 'Zero Duration Scenario',
            status: 'In Progress',
            steps: [],
            duration: 0,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const stats = statisticsAnalyzer.calculateBasicStatistics(testResult);

      // Assert
      expect(stats.totalScenarios).toBe(1);
      expect(stats.averageScenarioDuration).toBe(0);
      expect(stats.totalExecutionTime).toBe(0);
    });

    it('should handle very large durations', () => {
      // Arrange
      const largeDuration = Number.MAX_SAFE_INTEGER;
      const testResult: TestResult = {
        testSuiteId: 'large-duration-test',
        status: 'In Progress',
        scenarios: [
          {
            id: 's1',
            name: 'Long Running Scenario',
            status: 'In Progress',
            steps: [{ name: 'Long Step', status: 'In Progress', duration: largeDuration }],
            duration: largeDuration,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: largeDuration,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const stats = statisticsAnalyzer.calculateBasicStatistics(testResult);

      // Assert
      expect(stats.totalExecutionTime).toBe(largeDuration);
      expect(stats.averageScenarioDuration).toBe(largeDuration);
    });

    it('should handle mixed null/undefined scenario statuses gracefully', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'mixed-status-test',
        status: 'failed',
        scenarios: [
          {
            id: 's1',
            name: 'Normal Scenario',
            status: 'In Progress',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date()
          },
          {
            id: 's2',
            name: 'Unknown Status Scenario',
            status: 'unknown' as any, // Invalid status
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 200,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const stats = statisticsAnalyzer.calculateBasicStatistics(testResult);

      // Assert
      expect(stats.totalScenarios).toBe(2);
      expect(stats.passedScenarios).toBe(1);
      expect(stats.failedScenarios).toBe(0);
      expect(stats.skippedScenarios).toBe(0);
      expect(stats.pendingScenarios).toBe(0);
    });
  });

  describe('Edge cases for calculateAdvancedMetrics', () => {
    it('should handle scenarios with no steps', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'no-steps-test',
        status: 'In Progress',
        scenarios: [
          {
            id: 's1',
            name: 'Empty Scenario',
            status: 'In Progress',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const metrics = statisticsAnalyzer.calculateAdvancedMetrics(testResult);

      // Assert
      expect(metrics.stepStatistics.totalSteps).toBe(0);
      expect(metrics.stepStatistics.averageStepDuration).toBe(0);
    });

    it('should handle steps with missing or invalid durations', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'invalid-step-duration-test',
        status: 'In Progress',
        scenarios: [
          {
            id: 's1',
            name: 'Scenario with Invalid Steps',
            status: 'In Progress',
            steps: [
              { name: 'Step 1', status: 'In Progress', duration: 100 },
              { name: 'Step 2', status: 'In Progress', duration: undefined as any },
              { name: 'Step 3', status: 'In Progress', duration: -50 }, // Negative duration
              { name: 'Step 4', status: 'In Progress', duration: NaN },
              { name: 'Step 5', status: 'In Progress', duration: Infinity }
            ],
            duration: 100,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const metrics = statisticsAnalyzer.calculateAdvancedMetrics(testResult);

      // Assert
      expect(metrics.stepStatistics.totalSteps).toBe(5);
      // The average will be NaN due to invalid durations
      expect(Number.isNaN(metrics.stepStatistics.averageStepDuration)).toBe(true);
    });
  });

  describe('Edge cases for analyzeFailurePatterns', () => {
    it('should handle scenarios with null/undefined error messages', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'null-error-test',
        status: 'failed',
        scenarios: [
          {
            id: 's1',
            name: 'Failed without message',
            status: 'failed',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: undefined
          },
          {
            id: 's2',
            name: 'Failed with null',
            status: 'failed',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: null as any
          },
          {
            id: 's3',
            name: 'Failed with empty string',
            status: 'failed',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: ''
          }
        ],
        duration: 300,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const patterns = statisticsAnalyzer.analyzeFailurePatterns(testResult);

      // Assert
      const genericPattern = patterns.find(p => p.pattern === 'generic_failure');
      expect(genericPattern).toBeDefined();
      expect(genericPattern!.count).toBe(3);
    });

    it('should handle very long error messages', () => {
      // Arrange
      const longErrorMessage = 'Error: ' + 'x'.repeat(10000);
      const testResult: TestResult = {
        testSuiteId: 'long-error-test',
        status: 'failed',
        scenarios: [
          {
            id: 's1',
            name: 'Failed with long message',
            status: 'failed',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: longErrorMessage
          }
        ],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const patterns = statisticsAnalyzer.analyzeFailurePatterns(testResult);

      // Assert
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].scenarios).toContain('s1');
    });

    it('should handle special characters in error messages', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'special-char-test',
        status: 'failed',
        scenarios: [
          {
            id: 's1',
            name: 'Failed with regex chars',
            status: 'failed',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: 'Error: Invalid regex pattern [.*+?^${}()|[]\\]'
          },
          {
            id: 's2',
            name: 'Failed with unicode',
            status: 'failed',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: 'Error: 测试失败 🚫 विफल'
          }
        ],
        duration: 200,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const patterns = statisticsAnalyzer.analyzeFailurePatterns(testResult);

      // Assert
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases for generateTrendAnalysis', () => {
    it('should handle comparing against empty historical results', () => {
      // Arrange
      const currentResult: TestResult = {
        testSuiteId: 'current-test',
        status: 'In Progress',
        scenarios: [
          {
            id: 's1',
            name: 'Test Scenario',
            status: 'In Progress',
            steps: [],
            duration: 100,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const trend = statisticsAnalyzer.generateTrendAnalysis(currentResult, []);

      // Assert
      expect(trend.performanceTrend).toBe('UPDATING');
      expect(trend.improvementPercentage).toBe(0);
      expect(trend.regressions).toEqual([]);
      expect(trend.improvements).toEqual([]);
    });

    it('should handle identical current and historical results', () => {
      // Arrange
      const timestamp = new Date();
      const scenarioData = {
        id: 's1',
        name: 'Test Scenario',
        status: 'In Progress' as const,
        steps: [],
        duration: 100,
        startTime: timestamp,
        endTime: timestamp
      };

      const currentResult: TestResult = {
        testSuiteId: 'test-suite',
        status: 'In Progress',
        scenarios: [scenarioData],
        duration: 100,
        startTime: timestamp,
        endTime: timestamp
      };

      const historicalResults: TestResult[] = [
        {
          testSuiteId: 'test-suite',
          status: 'In Progress',
          scenarios: [scenarioData],
          duration: 100,
          startTime: timestamp,
          endTime: timestamp
        }
      ];

      // Act
      const trend = statisticsAnalyzer.generateTrendAnalysis(currentResult, historicalResults);

      // Assert
      expect(trend.performanceTrend).toBe('UPDATING');
      expect(trend.improvementPercentage).toBe(0);
    });

    it('should handle extreme performance differences', () => {
      // Arrange
      const historicalResults: TestResult[] = [
        {
          testSuiteId: 'historical',
          status: 'In Progress',
          scenarios: [
            {
              id: 's1',
              name: 'Slow Scenario',
              status: 'In Progress',
              steps: [],
              duration: 10000,
              startTime: new Date(),
              endTime: new Date()
            }
          ],
          duration: 10000,
          startTime: new Date(),
          endTime: new Date()
        }
      ];

      const currentResult: TestResult = {
        testSuiteId: 'current',
        status: 'In Progress',
        scenarios: [
          {
            id: 's1',
            name: 'Fast Scenario',
            status: 'In Progress',
            steps: [],
            duration: 1,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 1,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const trend = statisticsAnalyzer.generateTrendAnalysis(currentResult, historicalResults);

      // Assert
      expect(trend.performanceTrend).toBe('improving');
      expect(trend.improvementPercentage).toBe(99.99);
    });
  });

  describe('Edge cases for aggregateMultipleRuns', () => {
    it('should handle single test result', () => {
      // Arrange
      const singleResult: TestResult[] = [
        {
          testSuiteId: 'single-test',
          status: 'In Progress',
          scenarios: [
            {
              id: 's1',
              name: 'Test Scenario',
              status: 'In Progress',
              steps: [{ name: 'Step 1', status: 'In Progress', duration: 100 }],
              duration: 100,
              startTime: new Date(),
              endTime: new Date()
            }
          ],
          duration: 100,
          startTime: new Date(),
          endTime: new Date()
        }
      ];

      // Act
      const aggregated = statisticsAnalyzer.aggregateMultipleRuns(singleResult);

      // Assert
      expect(aggregated.totalTestSuites).toBe(1);
      expect(aggregated.totalScenarios).toBe(1);
      expect(aggregated.totalSteps).toBe(1);
      expect(aggregated.overallPassRate).toBe(1);
    });

    it('should handle test results with all failed scenarios', () => {
      // Arrange
      const failedResults: TestResult[] = [
        {
          testSuiteId: 'failed-suite-1',
          status: 'failed',
          scenarios: [
            {
              id: 's1',
              name: 'Failed Scenario 1',
              status: 'failed',
              steps: [],
              duration: 100,
              startTime: new Date(),
              endTime: new Date()
            }
          ],
          duration: 100,
          startTime: new Date(),
          endTime: new Date()
        },
        {
          testSuiteId: 'failed-suite-2',
          status: 'failed',
          scenarios: [
            {
              id: 's2',
              name: 'Failed Scenario 2',
              status: 'failed',
              steps: [],
              duration: 100,
              startTime: new Date(),
              endTime: new Date()
            }
          ],
          duration: 100,
          startTime: new Date(),
          endTime: new Date()
        }
      ];

      // Act
      const aggregated = statisticsAnalyzer.aggregateMultipleRuns(failedResults);

      // Assert
      expect(aggregated.totalTestSuites).toBe(2);
      expect(aggregated.totalScenarios).toBe(2);
      expect(aggregated.overallPassRate).toBe(0);
      expect(aggregated.testSuiteBreakdown.every(suite => suite.status === 'failed')).toBe(true);
    });

    it('should handle very large number of test results', () => {
      // Arrange
      const largeResults: TestResult[] = [];
      for (let i = 0; i < 1000; i++) {
        largeResults.push({
          testSuiteId: `suite-${i}`,
          status: i % 2 === 0 ? 'In Progress' : 'failed',
          scenarios: [
            {
              id: `s${i}`,
              name: `Scenario ${i}`,
              status: i % 2 === 0 ? 'In Progress' : 'failed',
              steps: [],
              duration: 100,
              startTime: new Date(),
              endTime: new Date()
            }
          ],
          duration: 100,
          startTime: new Date(),
          endTime: new Date()
        });
      }

      // Act
      const aggregated = statisticsAnalyzer.aggregateMultipleRuns(largeResults);

      // Assert
      expect(aggregated.totalTestSuites).toBe(1000);
      expect(aggregated.totalScenarios).toBe(1000);
      expect(aggregated.overallPassRate).toBe(0.5);
      expect(aggregated.testSuiteBreakdown.length).toBe(1000);
    });
  });

  describe('Edge cases for exportStatistics', () => {
    it('should handle test result with minimal data', () => {
      // Arrange
      const minimalResult: TestResult = {
        testSuiteId: 'minimal',
        status: 'In Progress',
        scenarios: [],
        duration: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const exported = statisticsAnalyzer.exportStatistics(minimalResult);

      // Assert
      expect(exported).toBeDefined();
      expect(exported.basicStatistics).toBeDefined();
      expect(exported.advancedMetrics).toBeDefined();
      expect(exported.metadata).toBeDefined();
      expect(exported.metadata.version).toBe('1.0.0');
    });

    it('should handle circular references in test result', () => {
      // Arrange
      const circularResult: any = {
        testSuiteId: 'circular',
        status: 'In Progress',
        scenarios: [],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };
      // Create circular reference
      circularResult.self = circularResult;

      // Act & Assert - should not throw
      expect(() => {
        statisticsAnalyzer.exportStatistics(circularResult);
      }).not.toThrow();
    });

    it('should preserve date objects in export', () => {
      // Arrange
      const startTime = new Date('2024-01-01T10:00:00');
      const endTime = new Date('2024-01-01T10:01:00');
      const testResult: TestResult = {
        testSuiteId: 'date-test',
        status: 'In Progress',
        scenarios: [],
        duration: 60000,
        startTime,
        endTime
      };

      // Act
      const exported = statisticsAnalyzer.exportStatistics(testResult);

      // Assert
      expect(exported.rawData.startTime).toEqual(startTime);
      expect(exported.rawData.endTime).toEqual(endTime);
      expect(exported.metadata.exportTimestamp).toBeInstanceOf(Date);
    });
  });

  describe('Performance edge cases', () => {
    it('should handle performance metrics with all scenarios having same duration', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'same-duration-test',
        status: 'In Progress',
        scenarios: [
          createScenario('s1', 'In Progress', 100),
          createScenario('s2', 'In Progress', 100),
          createScenario('s3', 'In Progress', 100)
        ],
        duration: 300,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const metrics = statisticsAnalyzer.calculatePerformanceMetrics(testResult);

      // Assert
      expect(metrics.fastestScenario.duration).toBe(100);
      expect(metrics.slowestScenario.duration).toBe(100);
      expect(metrics.averageScenarioDuration).toBe(100);
    });

    it('should handle fractional pass rates correctly', () => {
      // Arrange
      const testResult: TestResult = {
        testSuiteId: 'fractional-test',
        status: 'failed',
        scenarios: [
          createScenario('s1', 'In Progress', 100),
          createScenario('s2', 'In Progress', 100),
          createScenario('s3', 'failed', 100)
        ],
        duration: 300,
        startTime: new Date(),
        endTime: new Date()
      };

      // Act
      const stats = statisticsAnalyzer.calculateBasicStatistics(testResult);

      // Assert
      expect(stats.passRate).toBeCloseTo(0.6667, 4);
      expect(stats.failureRate).toBeCloseTo(0.3333, 4);
    });
  });

  // Helper function
  function createScenario(
    id: string,
    status: 'In Progress' | 'failed' | 'skipped' | 'pending',
    duration: number
  ): TestScenario {
    return {
      id,
      name: `Scenario ${id}`,
      status,
      steps: [],
      duration,
      startTime: new Date(),
      endTime: new Date()
    };
  }
});