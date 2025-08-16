/**
 * Python Coverage Analysis Gateway
 * Main entry point for the infra_python-coverage theme
 * Provides comprehensive Python coverage analysis including branch, class-level metrics
 */

import { CoverageAnalyzer } from '../children/CoverageAnalyzer';
import { ClassCoverageTracker } from '../children/ClassCoverageTracker';
import { CoverageAggregator } from '../children/CoverageAggregator';
import { CoverageEnforcer } from '../children/CoverageEnforcer';
import { CoverageReporter } from '../children/CoverageReporter';
import { PythonTestRunner } from '../children/PythonTestRunner';
import {
  CoverageResult,
  ClassMetrics,
  CoverageConfig,
  EnforcementResult,
  CoverageReport,
  CoverageThresholds
} from './types';

export class PythonCoverageGateway {
  private analyzer: CoverageAnalyzer;
  private classTracker: ClassCoverageTracker;
  private aggregator: CoverageAggregator;
  private enforcer: CoverageEnforcer;
  private reporter: CoverageReporter;
  private testRunner: PythonTestRunner;

  constructor(config?: CoverageConfig) {
    this.analyzer = new CoverageAnalyzer(config);
    this.classTracker = new ClassCoverageTracker();
    this.aggregator = new CoverageAggregator();
    this.enforcer = new CoverageEnforcer(config);
    this.reporter = new CoverageReporter();
    this.testRunner = new PythonTestRunner(config);
  }

  /**
   * Run Python tests with coverage analysis
   */
  async runWithCoverage(
    testPath: string,
    sourcePath: string,
    options?: {
      branch?: boolean;
      parallel?: boolean;
      format?: 'json' | 'xml' | 'html';
    }
  ): Promise<CoverageResult> {
    return this.testRunner.runWithCoverage(testPath, sourcePath, options);
  }

  /**
   * Analyze coverage at the class level
   */
  async analyzeClassCoverage(sourcePath: string): Promise<Map<string, ClassMetrics>> {
    return this.classTracker.analyzeClasses(sourcePath);
  }

  /**
   * Aggregate coverage from multiple test runs
   */
  async aggregateCoverage(coverageFiles: string[]): Promise<CoverageResult> {
    for (const file of coverageFiles) {
      await this.aggregator.addCoverage(file);
    }
    return this.aggregator.combine();
  }

  /**
   * Check coverage against configured thresholds
   */
  async checkThresholds(
    coverageFile: string,
    thresholds?: CoverageThresholds
  ): Promise<EnforcementResult> {
    if (thresholds) {
      this.enforcer.setThresholds(thresholds);
    }
    return this.enforcer.checkCoverage(coverageFile);
  }

  /**
   * Generate coverage report in various formats
   */
  async generateReport(
    coverageData: CoverageResult,
    format: 'html' | 'json' | 'xml' | "markdown" | 'console',
    outputPath?: string
  ): Promise<CoverageReport> {
    return this.reporter.generate(coverageData, format, outputPath);
  }

  /**
   * Get uncovered lines for specific files
   */
  async getUncoveredLines(coverageFile: string): Promise<Map<string, number[]>> {
    const result = await this.analyzer.analyze(coverageFile);
    return result.uncoveredLines;
  }

  /**
   * Watch mode for continuous coverage monitoring
   */
  async watch(
    testPath: string,
    sourcePath: string,
    interval: number = 5000,
    callback?: (result: CoverageResult) => void
  ): Promise<void> {
    return this.testRunner.watch(testPath, sourcePath, interval, callback);
  }

  /**
   * Generate coverage badge
   */
  async generateBadge(
    coverage: number,
    outputPath: string,
    options?: {
      label?: string;
      color?: string;
      style?: 'flat' | 'flat-square' | 'plastic';
    }
  ): Promise<void> {
    return this.reporter.generateBadge(coverage, outputPath, options);
  }

  /**
   * Get coverage trends over time
   */
  async getCoverageTrends(
    historyPath: string,
    days?: number
  ): Promise<{
    trend: "improving" | "declining" | 'stable';
    averageChange: number;
    dataPoints: Array<{ date: string; coverage: number }>;
  }> {
    return this.analyzer.analyzeTrends(historyPath, days);
  }

  /**
   * Compare coverage between branches
   */
  async compareCoverage(
    baseCoverage: string,
    headCoverage: string
  ): Promise<{
    change: number;
    newUncovered: string[];
    newlyCovered: string[];
    summary: string;
  }> {
    return this.analyzer.compare(baseCoverage, headCoverage);
  }
}

// Export all types and classes
export {
  CoverageAnalyzer,
  ClassCoverageTracker,
  CoverageAggregator,
  CoverageEnforcer,
  CoverageReporter,
  PythonTestRunner
};

export type {
  CoverageResult,
  ClassMetrics,
  CoverageConfig,
  EnforcementResult,
  CoverageReport,
  CoverageThresholds
};

// Default export for convenience
export default PythonCoverageGateway;