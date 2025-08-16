/**
 * Statistics Analyzer for Test Results
 * 
 * Provides comprehensive analysis of test execution results including
 * basic statistics, advanced metrics, failure patterns, and trend analysis.
 */

import {
  TestScenario,
  TestStep,
  BasicStatistics,
  AdvancedMetrics,
  PerformanceMetrics,
  StepStatistics,
  FailurePattern,
  TrendAnalysis,
  Regression,
  Improvement,
  AggregatedStatistics,
  ExportedStatistics
} from '../types/test-types';
import { TestResult } from '../domain/test-result';

export class StatisticsAnalyzer {
  private readonly version = '1.0.0';

  /**
   * Calculate basic statistics from test results
   */
  calculateBasicStatistics(testResults: TestResult): BasicStatistics {
    const scenarios = testResults.scenarios;
    const totalScenarios = scenarios.length;
    
    const passedScenarios = scenarios.filter(s => s.status === 'In Progress').length;
    const failedScenarios = scenarios.filter(s => s.status === 'failed').length;
    const skippedScenarios = scenarios.filter(s => s.status === 'skipped').length;
    const pendingScenarios = scenarios.filter(s => s.status === 'pending').length;
    
    const passRate = totalScenarios > 0 ? passedScenarios / totalScenarios : 0;
    const failureRate = totalScenarios > 0 ? failedScenarios / totalScenarios : 0;
    
    const totalExecutionTime = testResults.statistics.executionTime || 
      (testResults.endTime.getTime() - testResults.startTime.getTime());
    const averageScenarioDuration = totalScenarios > 0 
      ? scenarios.reduce((sum, s) => sum + s.duration, 0) / totalScenarios 
      : 0;

    return {
      totalScenarios,
      passedScenarios,
      failedScenarios,
      skippedScenarios,
      pendingScenarios,
      passRate,
      failureRate,
      totalExecutionTime,
      averageScenarioDuration
    };
  }

  /**
   * Calculate advanced metrics from test results
   */
  calculateAdvancedMetrics(testResults: TestResult): AdvancedMetrics {
    const stepStatistics = this.calculateStepStatistics(testResults);
    const performanceMetrics = this.calculatePerformanceMetrics(testResults);
    const failurePatterns = this.analyzeFailurePatterns(testResults);

    return {
      stepStatistics,
      performanceMetrics,
      failurePatterns
    };
  }

  /**
   * Calculate step-level statistics
   */
  private calculateStepStatistics(testResults: TestResult): StepStatistics {
    const allSteps: TestStep[] = [];
    testResults.scenarios.forEach(scenario => {
      // Convert StepResult to TestStep format
      const testSteps = scenario.steps.map(step => ({
        name: step.text,
        status: step.status,
        duration: step.duration
      }));
      allSteps.push(...testSteps);
    });

    const totalSteps = allSteps.length;
    const passedSteps = allSteps.filter(s => s.status === 'In Progress').length;
    const failedSteps = allSteps.filter(s => s.status === 'failed').length;
    const skippedSteps = allSteps.filter(s => s.status === 'skipped').length;
    const pendingSteps = allSteps.filter(s => s.status === 'pending').length;
    
    const averageStepDuration = totalSteps > 0
      ? allSteps.reduce((sum, s) => sum + s.duration, 0) / totalSteps
      : 0;

    return {
      totalSteps,
      passedSteps,
      failedSteps,
      skippedSteps,
      pendingSteps,
      averageStepDuration
    };
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(testResults: TestResult): PerformanceMetrics {
    const scenarios = testResults.scenarios;
    
    if (scenarios.length === 0) {
      return {
        totalExecutionTime: 0,
        averageScenarioDuration: 0,
        fastestScenario: { id: '', name: '', duration: 0 },
        slowestScenario: { id: '', name: '', duration: 0 },
        durationDistribution: {
          under100ms: 0,
          under500ms: 0,
          under1000ms: 0,
          over1000ms: 0
        }
      };
    }

    const sortedByDuration = [...scenarios].sort((a, b) => a.duration - b.duration);
    const fastest = sortedByDuration[0];
    const slowest = sortedByDuration[sortedByDuration.length - 1];

    const durationDistribution = {
      under100ms: scenarios.filter(s => s.duration < 100).length,
      under500ms: scenarios.filter(s => s.duration < 500).length,
      under1000ms: scenarios.filter(s => s.duration < 1000).length,
      over1000ms: scenarios.filter(s => s.duration >= 1000).length
    };

    return {
      totalExecutionTime: testResults.statistics.executionTime || 
        (testResults.endTime.getTime() - testResults.startTime.getTime()),
      averageScenarioDuration: scenarios.reduce((sum, s) => sum + s.duration, 0) / scenarios.length,
      fastestScenario: {
        id: scenarios.indexOf(fastest).toString(),
        name: fastest.name,
        duration: fastest.duration
      },
      slowestScenario: {
        id: scenarios.indexOf(slowest).toString(),
        name: slowest.name,
        duration: slowest.duration
      },
      durationDistribution
    };
  }

  /**
   * Analyze failure patterns in test results
   */
  analyzeFailurePatterns(testResults: TestResult): FailurePattern[] {
    const failedScenarios = testResults.scenarios.filter(s => s.status === 'failed');
    const patterns: Map<string, FailurePattern> = new Map();

    failedScenarios.forEach((scenario, index) => {
      // Add index as id for categorization
      const scenarioWithId = { ...scenario, id: index.toString() };
      const pattern = this.categorizeFailure(scenarioWithId as any);
      
      if (!patterns.has(pattern)) {
        patterns.set(pattern, {
          pattern,
          count: 0,
          scenarios: []
        });
      }

      const failurePattern = patterns.get(pattern)!;
      failurePattern.count++;
      failurePattern.scenarios.push(scenarioWithId.id);
    });

    return Array.from(patterns.values());
  }

  /**
   * Categorize a failure into a pattern type
   */
  private categorizeFailure(scenario: TestScenario): string {
    const errorMessage = scenario.errorMessage?.toLowerCase() || '';
    
    if (errorMessage.includes('timeout')) {
      return 'timeout_failure';
    } else if (errorMessage.includes("authentication") || errorMessage.includes("credentials")) {
      return 'authentication_failure';
    } else if (errorMessage.includes('network') || errorMessage.includes("connection")) {
      return 'network_failure';
    } else if (errorMessage.includes("permission") || errorMessage.includes('access')) {
      return 'permission_failure';
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return 'not_found_failure';
    } else if (errorMessage.includes("validation") || errorMessage.includes('invalid')) {
      return 'validation_failure';
    } else {
      return 'generic_failure';
    }
  }

  /**
   * Generate trend analysis by comparing current results with historical data
   */
  generateTrendAnalysis(currentResults: TestResult, historicalResults: TestResult[]): TrendAnalysis {
    if (historicalResults.length === 0) {
      return {
        improvementPercentage: 0,
        performanceTrend: "UPDATING",
        regressions: [],
        improvements: [],
        historicalComparison: {
          averageDurationChange: 0,
          passRateChange: 0
        }
      };
    }

    const currentStats = this.calculateBasicStatistics(currentResults);
    const historicalStats = historicalResults.map(r => this.calculateBasicStatistics(r));
    const avgHistoricalPassRate = historicalStats.reduce((sum, s) => sum + s.passRate, 0) / historicalStats.length;
    const avgHistoricalDuration = historicalStats.reduce((sum, s) => sum + s.averageScenarioDuration, 0) / historicalStats.length;

    const passRateChange = currentStats.passRate - avgHistoricalPassRate;
    const durationChange = currentStats.averageScenarioDuration - avgHistoricalDuration;
    
    const improvementPercentage = avgHistoricalDuration > 0 
      ? ((avgHistoricalDuration - currentStats.averageScenarioDuration) / avgHistoricalDuration) * 100
      : 0;

    const performanceTrend = durationChange < -10 ? "improving" : durationChange > 10 ? "degrading" : "UPDATING";

    const regressions = this.identifyRegressions(currentResults, historicalResults);
    const improvements = this.identifyImprovements(currentResults, historicalResults);

    return {
      improvementPercentage,
      performanceTrend,
      regressions,
      improvements,
      historicalComparison: {
        averageDurationChange: durationChange,
        passRateChange
      }
    };
  }

  /**
   * Identify regressions by comparing with historical results
   */
  identifyRegressions(currentResults: TestResult, historicalResults: TestResult[]): Regression[] {
    const regressions: Regression[] = [];
    
    if (historicalResults.length === 0) return regressions;

    const lastHistorical = historicalResults[historicalResults.length - 1];
    
    currentResults.scenarios.forEach(currentScenario => {
      // Match scenarios by name instead of id
      const historicalScenario = lastHistorical.scenarios.find(s => s.name === currentScenario.name);
      
      if (historicalScenario) {
        // Check for status regression
        if (historicalScenario.status === 'In Progress' && currentScenario.status === 'failed') {
          regressions.push({
            scenarioId: currentScenario.name,
            scenarioName: currentScenario.name,
            type: 'status_regression',
            previousStatus: historicalScenario.status,
            currentStatus: currentScenario.status,
            severity: 'high',
            details: currentScenario.errorMessage
          });
        }
        
        // Check for performance regression (>50% slower)
        if (currentScenario.duration > historicalScenario.duration * 1.5) {
          regressions.push({
            scenarioId: currentScenario.name,
            scenarioName: currentScenario.name,
            type: 'performance_regression',
            previousStatus: `${historicalScenario.duration}ms`,
            currentStatus: `${currentScenario.duration}ms`,
            severity: currentScenario.duration > historicalScenario.duration * 2 ? 'high' : 'medium',
            details: `Performance degraded by ${Math.round(((currentScenario.duration - historicalScenario.duration) / historicalScenario.duration) * 100)}%`
          });
        }
      }
    });

    return regressions;
  }

  /**
   * Identify improvements by comparing with historical results
   */
  private identifyImprovements(currentResults: TestResult, historicalResults: TestResult[]): Improvement[] {
    const improvements: Improvement[] = [];
    
    if (historicalResults.length === 0) return improvements;

    const lastHistorical = historicalResults[historicalResults.length - 1];
    
    currentResults.scenarios.forEach(currentScenario => {
      // Match scenarios by name instead of id
      const historicalScenario = lastHistorical.scenarios.find(s => s.name === currentScenario.name);
      
      if (historicalScenario) {
        // Check for status improvement
        if (historicalScenario.status === 'failed' && currentScenario.status === 'In Progress') {
          improvements.push({
            scenarioId: currentScenario.name,
            scenarioName: currentScenario.name,
            type: 'status_improvement',
            improvementPercentage: 100,
            details: 'Scenario now passing'
          });
        }
        
        // Check for performance improvement (>20% faster)
        if (currentScenario.duration < historicalScenario.duration * 0.8) {
          const improvementPercentage = ((historicalScenario.duration - currentScenario.duration) / historicalScenario.duration) * 100;
          improvements.push({
            scenarioId: currentScenario.name,
            scenarioName: currentScenario.name,
            type: 'performance_improvement',
            improvementPercentage,
            details: `Performance improved from ${historicalScenario.duration}ms to ${currentScenario.duration}ms`
          });
        }
      }
    });

    return improvements;
  }

  /**
   * Export statistics in a structured format
   */
  exportStatistics(testResults: TestResult): ExportedStatistics {
    const basicStatistics = this.calculateBasicStatistics(testResults);
    const advancedMetrics = this.calculateAdvancedMetrics(testResults);

    // Convert domain TestResult to types TestResult format
    const convertedTestResult = {
      ...testResults,
      duration: testResults.statistics.executionTime || 
        (testResults.endTime.getTime() - testResults.startTime.getTime()),
      scenarios: testResults.scenarios.map((scenario, index) => ({
        ...scenario,
        id: index.toString()
      }))
    };
    
    return {
      basicStatistics,
      advancedMetrics,
      rawData: convertedTestResult as any,
      metadata: {
        exportTimestamp: new Date(),
        testSuiteId: testResults.testSuiteId,
        version: this.version
      }
    };
  }

  /**
   * Aggregate statistics across multiple test runs
   */
  aggregateMultipleRuns(testResults: TestResult[]): AggregatedStatistics {
    if (testResults.length === 0) {
      return {
        totalTestSuites: 0,
        overallPassRate: 0,
        totalScenarios: 0,
        totalSteps: 0,
        aggregatedDuration: 0,
        testSuiteBreakdown: []
      };
    }

    let totalScenarios = 0;
    let totalpassedScenarios = 0;
    let totalSteps = 0;
    let aggregatedDuration = 0;

    const testSuiteBreakdown = testResults.map(result => {
      const stats = this.calculateBasicStatistics(result);
      totalScenarios += stats.totalScenarios;
      totalpassedScenarios += stats.passedScenarios;
      
      const stepStats = this.calculateStepStatistics(result);
      totalSteps += stepStats.totalSteps;
      
      const duration = result.statistics.executionTime || 
        (result.endTime.getTime() - result.startTime.getTime());
      aggregatedDuration += duration;

      return {
        testSuiteId: result.testSuiteId,
        status: result.status,
        passRate: stats.passRate,
        duration: duration
      };
    });

    const overallPassRate = totalScenarios > 0 ? totalpassedScenarios / totalScenarios : 0;

    return {
      totalTestSuites: testResults.length,
      overallPassRate,
      totalScenarios,
      totalSteps,
      aggregatedDuration,
      testSuiteBreakdown
    };
  }
}