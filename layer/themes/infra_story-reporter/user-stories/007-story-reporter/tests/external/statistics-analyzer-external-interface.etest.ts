import { StatisticsAnalyzer } from '../../src/internal/statistics-analyzer';
import { TestResult } from '../../src/types/test-types';

describe('Statistics Analyzer External Interface Test (NO MOCKS)', () => {
  let statisticsAnalyzer: StatisticsAnalyzer;

  beforeEach(() => {
    statisticsAnalyzer = new StatisticsAnalyzer();
  });

  describe('External Statistics Calculation Interface', () => {
    it('should validate basic statistics calculation interface', () => {
      // Test external interface without mocks - real statistics calculation behavior
      const testResults: TestResult = {
        testSuiteId: 'stats-test-001',
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Login scenario',
            status: 'In Progress',
            steps: [
              { name: 'Enter username', status: 'In Progress', duration: 100 },
              { name: 'Enter password', status: 'In Progress', duration: 150 },
              { name: 'Click login', status: 'In Progress', duration: 200 }
            ],
            duration: 450,
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:00:00.450')
          },
          {
            id: 'scenario-2', 
            name: 'Logout scenario',
            status: 'failed',
            steps: [
              { name: 'Click logout', status: 'failed', duration: 50 }
            ],
            duration: 50,
            startTime: new Date('2024-01-01T10:01:00'),
            endTime: new Date('2024-01-01T10:01:00.050'),
            errorMessage: 'Logout button not found'
          }
        ],
        duration: 500,
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:01:00.050')
      };

      // Calculate statistics through external interface
      const basicStats = statisticsAnalyzer.calculateBasicStatistics(testResults);

      // Validate external interface returns expected basic statistics
      expect(basicStats.totalScenarios).toBe(2);
      expect(basicStats.passedScenarios).toBe(1);
      expect(basicStats.failedScenarios).toBe(1);
      expect(basicStats.skippedScenarios).toBe(0);
      expect(basicStats.passRate).toBe(0.5);
      expect(basicStats.failureRate).toBe(0.5);
      expect(basicStats.totalExecutionTime).toBe(500);
      expect(basicStats.averageScenarioDuration).toBe(250);
    });

    it('should validate advanced metrics calculation interface', () => {
      const testResults: TestResult = {
        testSuiteId: 'stats-test-002',
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Complex scenario',
            status: 'In Progress',
            steps: [
              { name: 'Step 1', status: 'In Progress', duration: 100 },
              { name: 'Step 2', status: 'In Progress', duration: 200 },
              { name: 'Step 3', status: 'failed', duration: 150 },
              { name: 'Step 4', status: 'skipped', duration: 0 }
            ],
            duration: 450,
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:00:00.450')
          }
        ],
        duration: 450,
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:00:00.450')
      };

      // Calculate advanced metrics through external interface
      const advancedMetrics = statisticsAnalyzer.calculateAdvancedMetrics(testResults);

      // Validate external interface returns comprehensive metrics
      expect(advancedMetrics.stepStatistics.totalSteps).toBe(4);
      expect(advancedMetrics.stepStatistics.passedSteps).toBe(2);
      expect(advancedMetrics.stepStatistics.failedSteps).toBe(1);
      expect(advancedMetrics.stepStatistics.skippedSteps).toBe(1);
      expect(advancedMetrics.stepStatistics.averageStepDuration).toBeGreaterThan(0);

      expect(advancedMetrics.performanceMetrics.totalExecutionTime).toBe(450);
      expect(advancedMetrics.performanceMetrics.averageScenarioDuration).toBe(450);
      expect(advancedMetrics.performanceMetrics.fastestScenario).toBeDefined();
      expect(advancedMetrics.performanceMetrics.slowestScenario).toBeDefined();

      expect(Array.isArray(advancedMetrics.failurePatterns)).toBe(true);
      expect(advancedMetrics.failurePatterns.length).toBeGreaterThan(0);
    });

    it('should validate failure pattern analysis interface', () => {
      const testResults: TestResult = {
        testSuiteId: 'stats-test-003',
        status: 'failed',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Authentication failure',
            status: 'failed',
            steps: [
              { name: 'Enter credentials', status: 'failed', duration: 100 }
            ],
            duration: 100,
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:00:00.100'),
            errorMessage: 'Invalid credentials'
          },
          {
            id: 'scenario-2',
            name: 'Network timeout',
            status: 'failed',
            steps: [
              { name: 'Make request', status: 'failed', duration: 5000 }
            ],
            duration: 5000,
            startTime: new Date('2024-01-01T10:01:00'),
            endTime: new Date('2024-01-01T10:01:05'),
            errorMessage: 'Request timeout'
          }
        ],
        duration: 5100,
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:01:05')
      };

      // Analyze failure patterns through external interface
      const failurePatterns = statisticsAnalyzer.analyzeFailurePatterns(testResults);

      // Validate external interface identifies failure patterns
      expect(Array.isArray(failurePatterns)).toBe(true);
      expect(failurePatterns.length).toBeGreaterThan(0);
      
      const patterns = failurePatterns.map(p => p.pattern);
      expect(patterns).toContain('authentication_failure');
      expect(patterns).toContain('timeout_failure');

      failurePatterns.forEach(pattern => {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('count');
        expect(pattern).toHaveProperty('scenarios');
        expect(typeof pattern.pattern).toBe('string');
        expect(typeof pattern.count).toBe('number');
        expect(Array.isArray(pattern.scenarios)).toBe(true);
      });
    });

    it('should validate performance metrics calculation interface', () => {
      const testResults: TestResult = {
        testSuiteId: 'stats-test-004',
        status: 'In Progress',
        scenarios: [
          {
            id: 'fast-scenario',
            name: 'Fast scenario',
            status: 'In Progress',
            steps: [
              { name: 'Quick step', status: 'In Progress', duration: 50 }
            ],
            duration: 50,
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:00:00.050')
          },
          {
            id: 'slow-scenario',
            name: 'Slow scenario',
            status: 'In Progress',
            steps: [
              { name: 'Slow step', status: 'In Progress', duration: 1000 }
            ],
            duration: 1000,
            startTime: new Date('2024-01-01T10:01:00'),
            endTime: new Date('2024-01-01T10:01:01')
          }
        ],
        duration: 1050,
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:01:01')
      };

      // Calculate performance metrics through external interface
      const performanceMetrics = statisticsAnalyzer.calculatePerformanceMetrics(testResults);

      // Validate external interface returns performance analysis
      expect(performanceMetrics.totalExecutionTime).toBe(1050);
      expect(performanceMetrics.averageScenarioDuration).toBe(525);
      expect(performanceMetrics.fastestScenario.id).toBe('fast-scenario');
      expect(performanceMetrics.fastestScenario.duration).toBe(50);
      expect(performanceMetrics.slowestScenario.id).toBe('slow-scenario');
      expect(performanceMetrics.slowestScenario.duration).toBe(1000);

      expect(performanceMetrics.durationDistribution).toBeDefined();
      expect(performanceMetrics.durationDistribution.under100ms).toBe(1);
      expect(performanceMetrics.durationDistribution.under500ms).toBe(1);
      expect(performanceMetrics.durationDistribution.under1000ms).toBe(1);
      expect(performanceMetrics.durationDistribution.over1000ms).toBe(1);
    });
  });

  describe('External Trend Analysis Interface', () => {
    it('should validate trend analysis interface with historical data', () => {
      const currentResults: TestResult = {
        testSuiteId: 'trend-test-001',
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Test scenario',
            status: 'In Progress',
            steps: [
              { name: 'Test step', status: 'In Progress', duration: 100 }
            ],
            duration: 100,
            startTime: new Date('2024-01-02T10:00:00'),
            endTime: new Date('2024-01-02T10:00:00.100')
          }
        ],
        duration: 100,
        startTime: new Date('2024-01-02T10:00:00'),
        endTime: new Date('2024-01-02T10:00:00.100')
      };

      const historicalResults: TestResult[] = [
        {
          testSuiteId: 'trend-test-001',
          status: 'In Progress',
          scenarios: [
            {
              id: 'scenario-1',
              name: 'Test scenario',
              status: 'In Progress',
              steps: [
                { name: 'Test step', status: 'In Progress', duration: 120 }
              ],
              duration: 120,
              startTime: new Date('2024-01-01T10:00:00'),
              endTime: new Date('2024-01-01T10:00:00.120')
            }
          ],
          duration: 120,
          startTime: new Date('2024-01-01T10:00:00'),
          endTime: new Date('2024-01-01T10:00:00.120')
        }
      ];

      // Generate trend analysis through external interface
      const trendAnalysis = statisticsAnalyzer.generateTrendAnalysis(currentResults, historicalResults);

      // Validate external interface provides trend insights
      expect(trendAnalysis.improvementPercentage).toBeGreaterThan(0);
      expect(trendAnalysis.performanceTrend).toBe('improving');
      expect(trendAnalysis.regressions).toEqual([]);
      expect(Array.isArray(trendAnalysis.improvements)).toBe(true);
      expect(trendAnalysis.improvements.length).toBeGreaterThan(0);

      expect(trendAnalysis.historicalComparison).toBeDefined();
      expect(trendAnalysis.historicalComparison.averageDurationChange).toBeLessThan(0);
      expect(trendAnalysis.historicalComparison.passRateChange).toBe(0);
    });

    it('should validate regression detection interface', () => {
      const currentResults: TestResult = {
        testSuiteId: 'regression-test-001',
        status: 'failed',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Regressed scenario',
            status: 'failed',
            steps: [
              { name: 'Failing step', status: 'failed', duration: 200 }
            ],
            duration: 200,
            startTime: new Date('2024-01-02T10:00:00'),
            endTime: new Date('2024-01-02T10:00:00.200'),
            errorMessage: 'New regression error'
          }
        ],
        duration: 200,
        startTime: new Date('2024-01-02T10:00:00'),
        endTime: new Date('2024-01-02T10:00:00.200')
      };

      const historicalResults: TestResult[] = [
        {
          testSuiteId: 'regression-test-001',
          status: 'In Progress',
          scenarios: [
            {
              id: 'scenario-1',
              name: 'Regressed scenario',
              status: 'In Progress',
              steps: [
                { name: 'Failing step', status: 'In Progress', duration: 100 }
              ],
              duration: 100,
              startTime: new Date('2024-01-01T10:00:00'),
              endTime: new Date('2024-01-01T10:00:00.100')
            }
          ],
          duration: 100,
          startTime: new Date('2024-01-01T10:00:00'),
          endTime: new Date('2024-01-01T10:00:00.100')
        }
      ];

      // Identify regressions through external interface
      const regressions = statisticsAnalyzer.identifyRegressions(currentResults, historicalResults);

      // Validate external interface detects regressions
      expect(Array.isArray(regressions)).toBe(true);
      expect(regressions.length).toBeGreaterThan(0);

      const regression = regressions[0];
      expect(regression.scenarioId).toBe('scenario-1');
      expect(regression.type).toBe('status_regression');
      expect(regression.previousStatus).toBe('In Progress');
      expect(regression.currentStatus).toBe('failed');
      expect(regression.severity).toBe('high');
    });
  });

  describe('External Statistics Export Interface', () => {
    it('should validate statistics data export interface', () => {
      const testResults: TestResult = {
        testSuiteId: 'export-test-001',
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Export test scenario',
            status: 'In Progress',
            steps: [
              { name: 'Test step', status: 'In Progress', duration: 100 }
            ],
            duration: 100,
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:00:00.100')
          }
        ],
        duration: 100,
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:00:00.100')
      };

      // Export statistics through external interface
      const exportedData = statisticsAnalyzer.exportStatistics(testResults);

      // Validate external interface exports structured data
      expect(exportedData).toHaveProperty('basicStatistics');
      expect(exportedData).toHaveProperty('advancedMetrics');
      expect(exportedData).toHaveProperty('rawData');
      expect(exportedData).toHaveProperty('metadata');

      expect(exportedData.metadata.exportTimestamp).toBeInstanceOf(Date);
      expect(exportedData.metadata.testSuiteId).toBe('export-test-001');
      expect(exportedData.metadata.version).toBeDefined();

      // Validate exported data can be serialized
      expect(() => JSON.stringify(exportedData)).not.toThrow();
    });

    it('should validate statistics aggregation interface for multiple test runs', () => {
      const testResults1: TestResult = {
        testSuiteId: 'aggregate-test-001',
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Test scenario 1',
            status: 'In Progress',
            steps: [{ name: 'Step 1', status: 'In Progress', duration: 100 }],
            duration: 100,
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:00:00.100')
          }
        ],
        duration: 100,
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:00:00.100')
      };

      const testResults2: TestResult = {
        testSuiteId: 'aggregate-test-002',
        status: 'failed',
        scenarios: [
          {
            id: 'scenario-2',
            name: 'Test scenario 2',
            status: 'failed',
            steps: [{ name: 'Step 2', status: 'failed', duration: 200 }],
            duration: 200,
            startTime: new Date('2024-01-01T10:01:00'),
            endTime: new Date('2024-01-01T10:01:00.200'),
            errorMessage: 'Test failure'
          }
        ],
        duration: 200,
        startTime: new Date('2024-01-01T10:01:00'),
        endTime: new Date('2024-01-01T10:01:00.200')
      };

      // Aggregate statistics across multiple test runs
      const aggregatedStats = statisticsAnalyzer.aggregateMultipleRuns([testResults1, testResults2]);

      // Validate external interface aggregates across test runs
      expect(aggregatedStats.totalTestSuites).toBe(2);
      expect(aggregatedStats.overallPassRate).toBe(0.5);
      expect(aggregatedStats.totalScenarios).toBe(2);
      expect(aggregatedStats.totalSteps).toBe(2);
      expect(aggregatedStats.aggregatedDuration).toBe(300);

      expect(aggregatedStats.testSuiteBreakdown.length).toBe(2);
      expect(aggregatedStats.testSuiteBreakdown[0].testSuiteId).toBe('aggregate-test-001');
      expect(aggregatedStats.testSuiteBreakdown[1].testSuiteId).toBe('aggregate-test-002');
    });
  });
});