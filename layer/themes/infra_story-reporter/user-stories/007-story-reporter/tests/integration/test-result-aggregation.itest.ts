/**
 * Integration Test: Test Result Aggregation
 * 
 * Tests the integration between TestSuiteManager, StatisticsAnalyzer,
 * and ReportGenerator for comprehensive test result aggregation and analysis.
 */

import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { StatisticsAnalyzer } from '../../src/internal/statistics-analyzer';
import { ReportGenerator } from '../../src/external/report-generator';
import { TestResult, TestConfiguration } from '../../src/types/test-types';
import { TestResult as DomainTestResult } from '../../src/domain/test-result';
import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';

describe('Test Result Aggregation Integration Test', () => {
  let testSuiteManager: TestSuiteManager;
  let statisticsAnalyzer: StatisticsAnalyzer;
  let reportGenerator: ReportGenerator;
  let mockFreeTestRunner: MockFreeTestRunner;

  beforeEach(() => {
    testSuiteManager = new TestSuiteManager();
    statisticsAnalyzer = new StatisticsAnalyzer();
    reportGenerator = new ReportGenerator();
    mockFreeTestRunner = new MockFreeTestRunner();
  });

  afterEach(async () => {
    await testSuiteManager.cleanup();
    await reportGenerator.cleanup();
    await mockFreeTestRunner.cleanup();
  });

  describe('Result Aggregation Flow', () => {
    it('should aggregate test results and calculate statistics', async () => {
      const testConfig: TestConfiguration = {
        testSuiteId: 'aggregation-test',
        featureFiles: ['test.feature'],
        stepDefinitions: ['test.steps.ts'],
        outputDirectory: './test-output',
        outputFormats: ['json', 'html']
      };

      testSuiteManager.configure(testConfig);

      // Mock test execution results
      const mockTestResult: TestResult = {
        testSuiteId: testConfig.testSuiteId,
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Login test',
            status: 'In Progress',
            steps: [
              { name: 'Navigate to login', status: 'In Progress', duration: 100 },
              { name: 'Enter credentials', status: 'In Progress', duration: 200 },
              { name: 'Click login', status: 'In Progress', duration: 150 }
            ],
            duration: 450,
            startTime: new Date(),
            endTime: new Date()
          },
          {
            id: 'scenario-2',
            name: 'Logout test',
            status: 'failed',
            steps: [
              { name: 'Click logout', status: 'failed', duration: 100 }
            ],
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: 'Logout button not found'
          }
        ],
        duration: 550,
        startTime: new Date(),
        endTime: new Date()
      };

      // Calculate statistics
      const basicStats = statisticsAnalyzer.calculateBasicStatistics(mockTestResult);
      
      expect(basicStats.totalScenarios).toBe(2);
      expect(basicStats.passedScenarios).toBe(1);
      expect(basicStats.failedScenarios).toBe(1);
      expect(basicStats.passRate).toBe(0.5);
      expect(basicStats.totalExecutionTime).toBe(550);

      // Calculate advanced metrics
      const advancedMetrics = statisticsAnalyzer.calculateAdvancedMetrics(mockTestResult);
      
      expect(advancedMetrics.stepStatistics.totalSteps).toBe(4);
      expect(advancedMetrics.stepStatistics.passedSteps).toBe(3);
      expect(advancedMetrics.stepStatistics.failedSteps).toBe(1);
      expect(advancedMetrics.performanceMetrics).toBeDefined();
      expect(advancedMetrics.failurePatterns.length).toBeGreaterThan(0);
    });

    it('should integrate statistics into report generation', async () => {
      const testConfig: TestConfiguration = {
        testSuiteId: 'report-integration-test',
        featureFiles: ['test.feature'],
        stepDefinitions: ['test.steps.ts'],
        outputDirectory: './test-output',
        outputFormats: ['json']
      };

      reportGenerator.configure(testConfig);

      const testResult: TestResult = {
        testSuiteId: testConfig.testSuiteId,
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
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };

      // Add statistics to test result metadata
      const statistics = statisticsAnalyzer.exportStatistics(testResult);
      testResult.metadata = {
        ...testResult.metadata,
        statistics: {
          basicStatistics: statistics.basicStatistics,
          advancedMetrics: statistics.advancedMetrics,
          metadata: statistics.metadata
          // Exclude rawData to avoid circular reference
        }
      };

      // No need to mock saveReports as generateAllReports doesn't call it

      // Calculate step statistics
      let totalSteps = 0;
      let passedSteps = 0;
      let failedSteps = 0;
      testResult.scenarios.forEach(scenario => {
        totalSteps += scenario.steps.length;
        passedSteps += scenario.steps.filter(s => s.status === 'In Progress').length;
        failedSteps += scenario.steps.filter(s => s.status === 'failed').length;
      });

      // Convert to domain TestResult format
      const domainTestResult: DomainTestResult = {
        testSuiteId: testResult.testSuiteId,
        startTime: testResult.startTime,
        endTime: testResult.endTime,
        status: testResult.status === 'skipped' ? 'pending' : testResult.status as any,
        totalScenarios: testResult.scenarios.length,
        passedScenarios: testResult.scenarios.filter(s => s.status === 'In Progress').length,
        failedScenarios: testResult.scenarios.filter(s => s.status === 'failed').length,
        pendingScenarios: testResult.scenarios.filter(s => s.status === 'pending').length,
        skippedScenarios: testResult.scenarios.filter(s => s.status === 'skipped').length,
        scenarios: testResult.scenarios.map(scenario => ({
          name: scenario.name,
          status: scenario.status === 'skipped' ? 'pending' : scenario.status as any,
          startTime: scenario.startTime,
          endTime: scenario.endTime,
          duration: scenario.duration,
          steps: scenario.steps.map(step => ({
            name: step.name,
            text: step.name, // Use name as text
            status: step.status === 'skipped' ? 'pending' : step.status as any,
            startTime: new Date(), // Mock start time
            endTime: new Date(), // Mock end time
            duration: step.duration
          })),
          errorMessage: scenario.errorMessage
        })),
        configuration: reportGenerator.getConfiguration(),
        statistics: {
          totalSteps,
          passedSteps,
          failedSteps,
          pendingSteps: 0,
          skippedSteps: 0,
          executionTime: testResult.duration,
          averageStepTime: totalSteps > 0 ? testResult.duration / totalSteps : 0,
          successRate: totalSteps > 0 ? passedSteps / totalSteps : 0
        },
        metadata: testResult.metadata
      };
      
      // Generate reports with statistics
      const reports = await reportGenerator.generateAllReports(domainTestResult);
      
      expect(reports).toBeDefined();
      expect(reports.json).toBeDefined();
      expect(reports.json).toContain(testConfig.testSuiteId);
    });
  });

  describe('Multi-Suite Aggregation', () => {
    it('should aggregate results across multiple test suites', () => {
      const testResults: TestResult[] = [
        {
          testSuiteId: 'suite-1',
          status: 'In Progress',
          scenarios: [
            {
              id: 's1-scenario-1',
              name: 'Suite 1 Test',
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
        },
        {
          testSuiteId: 'suite-2',
          status: 'failed',
          scenarios: [
            {
              id: 's2-scenario-1',
              name: 'Suite 2 Test',
              status: 'failed',
              steps: [{ name: 'Step 1', status: 'failed', duration: 200 }],
              duration: 200,
              startTime: new Date(),
              endTime: new Date(),
              errorMessage: 'Test failure'
            }
          ],
          duration: 200,
          startTime: new Date(),
          endTime: new Date()
        }
      ];

      const aggregatedStats = statisticsAnalyzer.aggregateMultipleRuns(testResults);

      expect(aggregatedStats.totalTestSuites).toBe(2);
      expect(aggregatedStats.totalScenarios).toBe(2);
      expect(aggregatedStats.totalSteps).toBe(2);
      expect(aggregatedStats.overallPassRate).toBe(0.5);
      expect(aggregatedStats.aggregatedDuration).toBe(300);
      expect(aggregatedStats.testSuiteBreakdown.length).toBe(2);
    });
  });

  describe('Failure Pattern Analysis', () => {
    it('should analyze and categorize failure patterns', () => {
      const testResult: TestResult = {
        testSuiteId: 'failure-analysis',
        status: 'failed',
        scenarios: [
          {
            id: 'timeout-scenario',
            name: 'Network timeout test',
            status: 'failed',
            steps: [{ name: 'Make request', status: 'failed', duration: 5000 }],
            duration: 5000,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: 'Request timeout after 5000ms'
          },
          {
            id: 'auth-scenario',
            name: 'Authentication test',
            status: 'failed',
            steps: [{ name: 'Login', status: 'failed', duration: 100 }],
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: 'Invalid credentials provided'
          },
          {
            id: 'permission-scenario',
            name: 'Permission test',
            status: 'failed',
            steps: [{ name: 'Access admin', status: 'failed', duration: 50 }],
            duration: 50,
            startTime: new Date(),
            endTime: new Date(),
            errorMessage: 'Access denied: insufficient permissions'
          }
        ],
        duration: 5150,
        startTime: new Date(),
        endTime: new Date()
      };

      const failurePatterns = statisticsAnalyzer.analyzeFailurePatterns(testResult);

      expect(failurePatterns.length).toBeGreaterThan(0);
      
      const patternTypes = failurePatterns.map(p => p.pattern);
      expect(patternTypes).toContain('timeout_failure');
      expect(patternTypes).toContain('authentication_failure');
      expect(patternTypes).toContain('permission_failure');

      failurePatterns.forEach(pattern => {
        expect(pattern.count).toBeGreaterThan(0);
        expect(pattern.scenarios.length).toBe(pattern.count);
      });
    });
  });

  describe('Performance Metrics Integration', () => {
    it('should calculate detailed performance metrics', () => {
      const testResult: TestResult = {
        testSuiteId: 'performance-test',
        status: 'In Progress',
        scenarios: [
          {
            id: 'fast-scenario',
            name: 'Fast test',
            status: 'In Progress',
            steps: [{ name: 'Quick step', status: 'In Progress', duration: 50 }],
            duration: 50,
            startTime: new Date(),
            endTime: new Date()
          },
          {
            id: 'medium-scenario',
            name: 'Medium test',
            status: 'In Progress',
            steps: [{ name: 'Normal step', status: 'In Progress', duration: 300 }],
            duration: 300,
            startTime: new Date(),
            endTime: new Date()
          },
          {
            id: 'slow-scenario',
            name: 'Slow test',
            status: 'In Progress',
            steps: [{ name: 'Slow step', status: 'In Progress', duration: 1500 }],
            duration: 1500,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 1850,
        startTime: new Date(),
        endTime: new Date()
      };

      const perfMetrics = statisticsAnalyzer.calculatePerformanceMetrics(testResult);

      expect(perfMetrics.totalExecutionTime).toBe(1850);
      expect(perfMetrics.fastestScenario.id).toBe('fast-scenario');
      expect(perfMetrics.fastestScenario.duration).toBe(50);
      expect(perfMetrics.slowestScenario.id).toBe('slow-scenario');
      expect(perfMetrics.slowestScenario.duration).toBe(1500);

      expect(perfMetrics.durationDistribution.under100ms).toBe(1);
      expect(perfMetrics.durationDistribution.under500ms).toBe(2);
      expect(perfMetrics.durationDistribution.over1000ms).toBe(1);
    });
  });

  describe('Report Data Enrichment', () => {
    it('should enrich test results with aggregated statistics', () => {
      const testResult: TestResult = {
        testSuiteId: 'enrichment-test',
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Test',
            status: 'In Progress',
            steps: [{ name: 'Step', status: 'In Progress', duration: 100 }],
            duration: 100,
            startTime: new Date(),
            endTime: new Date()
          }
        ],
        duration: 100,
        startTime: new Date(),
        endTime: new Date()
      };

      // Export comprehensive statistics
      const exportedStats = statisticsAnalyzer.exportStatistics(testResult);

      expect(exportedStats.basicStatistics).toBeDefined();
      expect(exportedStats.advancedMetrics).toBeDefined();
      expect(exportedStats.metadata.testSuiteId).toBe(testResult.testSuiteId);
      expect(exportedStats.metadata.exportTimestamp).toBeInstanceOf(Date);

      // Verify data can be serialized for reports
      const serialized = JSON.stringify(exportedStats);
      expect(() => JSON.parse(serialized)).not.toThrow();
    });
  });

  describe('Historical Trend Analysis', () => {
    it('should perform trend analysis with historical data', () => {
      const historicalResults: TestResult[] = [
        {
          testSuiteId: 'trend-test',
          status: 'In Progress',
          scenarios: [
            {
              id: 'scenario-1',
              name: 'Test',
              status: 'In Progress',
              steps: [{ name: 'Step', status: 'In Progress', duration: 150 }],
              duration: 150,
              startTime: new Date('2024-01-01'),
              endTime: new Date('2024-01-01')
            }
          ],
          duration: 150,
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-01')
        }
      ];

      const currentResult: TestResult = {
        testSuiteId: 'trend-test',
        status: 'In Progress',
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Test',
            status: 'In Progress',
            steps: [{ name: 'Step', status: 'In Progress', duration: 100 }],
            duration: 100,
            startTime: new Date('2024-01-02'),
            endTime: new Date('2024-01-02')
          }
        ],
        duration: 100,
        startTime: new Date('2024-01-02'),
        endTime: new Date('2024-01-02')
      };

      const trendAnalysis = statisticsAnalyzer.generateTrendAnalysis(currentResult, historicalResults);

      expect(trendAnalysis.performanceTrend).toBe('improving');
      expect(trendAnalysis.improvementPercentage).toBeGreaterThan(0);
      expect(trendAnalysis.historicalComparison.averageDurationChange).toBeLessThan(0);
      expect(trendAnalysis.improvements.length).toBeGreaterThan(0);
    });
  });
});