import { EventEmitter } from 'node:events';
import { fsPromises as fs } from 'fs/promises';
import { join, dirname } from 'node:path';
import { HierarchicalBuildResult } from '../domain/hierarchical-build-config';
import { AggregatedTestResult, TestSummaryReport } from './test-result-aggregator';
import { CollectedArtifacts } from './build-artifact-collector';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


/**
 * Unified Report Generator
 * 
 * Generates consolidated reports across all child builds with
 * drill-down capabilities and multiple output formats.
 */
export class UnifiedReportGenerator extends EventEmitter {
  private reportTemplates: Map<string, ReportTemplate> = new Map();
  private customFormatters: Map<string, ReportFormatter> = new Map();

  constructor() {
    super();
    this.initializeDefaultTemplates();
  }

  /**
   * Generate unified report from build results
   */
  async generateUnifiedReport(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult,
    artifacts: CollectedArtifacts,
    options: ReportGenerationOptions = {}
  ): Promise<UnifiedReport> {
    const startTime = new Date();
    
    this.emit("reportGenerationStart", {
      buildId: buildResults.buildId,
      format: options.format || 'html',
      timestamp: startTime
    });
    
    try {
      // Create unified report structure
      const report: UnifiedReport = {
        metadata: {
          title: options.title || `Unified Build Report - ${buildResults.buildId}`,
          generatedAt: new Date(),
          buildId: buildResults.buildId,
          buildType: buildResults.buildType,
          reportVersion: '1.0.0'
        },
        
        summary: this.generateExecutiveSummary(buildResults, aggregatedResults),
        
        hierarchy: this.generateHierarchicalView(buildResults, aggregatedResults),
        
        testResults: this.generateTestResultsSection(aggregatedResults),
        
        coverage: this.generateCoverageSection(aggregatedResults),
        
        performance: this.generatePerformanceSection(buildResults, aggregatedResults),
        
        artifacts: this.generateArtifactsSection(artifacts),
        
        timeline: this.generateTimelineSection(buildResults),
        
        issues: this.generateIssuesSection(buildResults, aggregatedResults),
        
        recommendations: this.generateRecommendations(buildResults, aggregatedResults)
      };
      
      // Generate output in requested formats
      const outputs: GeneratedOutput[] = [];
      const formats = options.formats || ['html'];
      
      for (const format of formats) {
        const output = await this.generateOutput(report, format, options);
        outputs.push(output);
        
        if (options.outputPath) {
          await this.saveOutput(output, options.outputPath, format);
        }
      }
      
      report.outputs = outputs;
      
      const endTime = new Date();
      
      this.emit("reportGenerationComplete", {
        buildId: buildResults.buildId,
        formats: formats,
        duration: endTime.getTime() - startTime.getTime(),
        timestamp: endTime
      });
      
      return report;
      
    } catch (error) {
      this.emit("reportGenerationError", {
        buildId: buildResults.buildId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Initialize default report templates
   */
  private async initializeDefaultTemplates(): void {
    // HTML Template
    this.reportTemplates.set('html', {
      name: 'Default HTML Template',
      format: 'html',
      sections: ['summary', "hierarchy", "testResults", "coverage", "performance", "artifacts", "timeline", 'issues'],
      styles: this.getDefaultHtmlStyles(),
      scripts: this.getDefaultHtmlScripts()
    });
    
    // Markdown Template
    this.reportTemplates.set("markdown", {
      name: 'Default Markdown Template',
      format: "markdown",
      sections: ['summary', "hierarchy", "testResults", "coverage", 'issues']
    });
    
    // JSON Template
    this.reportTemplates.set('json', {
      name: 'Default JSON Template',
      format: 'json',
      sections: ['all']
    });
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): ExecutiveSummary {
    const summary: ExecutiveSummary = {
      overallStatus: this.determineOverallStatus(buildResults, aggregatedResults),
      
      buildMetrics: {
        totalBuilds: aggregatedResults.totalBuilds,
        successfulBuilds: aggregatedResults.allBuilds.filter(b => b.status === 'passed').length,
        failedBuilds: aggregatedResults.failedBuilds.length,
        skippedBuilds: aggregatedResults.allBuilds.filter(b => b.status === 'skipped').length,
        successRate: this.calculateSuccessRate(aggregatedResults)
      },
      
      testMetrics: {
        totalTests: aggregatedResults.totalTests,
        passedTests: aggregatedResults.passedTests,
        failedTests: aggregatedResults.failedTests,
        skippedTests: aggregatedResults.skippedTests,
        passRate: aggregatedResults.totalTests > 0
          ? ((aggregatedResults.passedTests / aggregatedResults.totalTests) * 100).toFixed(2)
          : '0.00'
      },
      
      coverageMetrics: aggregatedResults.aggregatedCoverage ? {
        lineCoverage: aggregatedResults.aggregatedCoverage.lines.percentage.toFixed(2),
        branchCoverage: aggregatedResults.aggregatedCoverage.branches.percentage.toFixed(2),
        functionCoverage: aggregatedResults.aggregatedCoverage.functions.percentage.toFixed(2),
        statementCoverage: aggregatedResults.aggregatedCoverage.statements.percentage.toFixed(2),
        overallCoverage: this.calculateOverallCoverage(aggregatedResults.aggregatedCoverage).toFixed(2)
      } : undefined,
      
      duration: {
        totalDuration: buildResults.duration || 0,
        startTime: buildResults.startTime,
        endTime: buildResults.endTime
      },
      
      keyFindings: this.generateKeyFindings(buildResults, aggregatedResults),
      
      trendsComparedToPrevious: options => this.generateTrends(buildResults, aggregatedResults)
    };
    
    return summary;
  }

  /**
   * Determine overall status
   */
  private async determineOverallStatus(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): 'success' | 'failure' | 'partial' | 'skipped' {
    if (buildResults.status === 'failed' || aggregatedResults.failedBuilds.length > 0) {
      return 'failure';
    }
    
    if (buildResults.status === 'skipped') {
      return 'skipped';
    }
    
    if (aggregatedResults.failedTests > 0) {
      return 'partial';
    }
    
    return 'success';
  }

  /**
   * Calculate success rate
   */
  private async calculateSuccessRate(aggregatedResults: AggregatedTestResult): string {
    const total = aggregatedResults.allBuilds.length;
    if (total === 0) return '0.00';
    
    const successful = aggregatedResults.allBuilds.filter(b => b.status === 'passed').length;
    return ((successful / total) * 100).toFixed(2);
  }

  /**
   * Calculate overall coverage
   */
  private async calculateOverallCoverage(coverage: any): number {
    const metrics = ['lines', "branches", "functions", "statements"];
    const sum = metrics.reduce((acc, metric) => acc + coverage[metric].percentage, 0);
    return sum / metrics.length;
  }

  /**
   * Generate key findings
   */
  private async generateKeyFindings(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): string[] {
    const findings: string[] = [];
    
    // Check for critical failures
    if (aggregatedResults.failedBuilds.length > 0) {
      findings.push(`⚠️ ${aggregatedResults.failedBuilds.length} build(s) failed during execution`);
    }
    
    // Check test failures
    if (aggregatedResults.failedTests > 0) {
      findings.push(`❌ ${aggregatedResults.failedTests} test(s) failed across all builds`);
    }
    
    // Check coverage thresholds
    if (aggregatedResults.aggregatedCoverage) {
      const overallCoverage = this.calculateOverallCoverage(aggregatedResults.aggregatedCoverage);
      if (overallCoverage < 80) {
        findings.push(`📊 Coverage is below 80% threshold (${overallCoverage.toFixed(2)}%)`);
      }
    }
    
    // Check performance
    const slowBuilds = aggregatedResults.allBuilds.filter(b => 
      b.duration && b.duration > 300000 // 5 minutes
    );
    if (slowBuilds.length > 0) {
      findings.push(`🐌 ${slowBuilds.length} build(s) took longer than 5 minutes`);
    }
    
    // Positive findings
    if (findings.length === 0) {
      findings.push('✅ All builds completed successfully');
      findings.push('✅ All tests passed');
      if (aggregatedResults.aggregatedCoverage) {
        findings.push('✅ Coverage meets threshold requirements');
      }
    }
    
    return findings;
  }

  /**
   * Generate trends (placeholder for now)
   */
  private async generateTrends(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): TrendData | undefined {
    // In a real implementation, this would compare with previous builds
    return undefined;
  }

  /**
   * Generate hierarchical view
   */
  private async generateHierarchicalView(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): HierarchicalView {
    return {
      root: this.buildHierarchyNode(buildResults, aggregatedResults),
      totalDepth: this.calculateMaxDepth(buildResults),
      expandedByDefault: true
    };
  }

  /**
   * Build hierarchy node
   */
  private async buildHierarchyNode(
    buildResult: HierarchicalBuildResult,
    aggregatedResult: AggregatedTestResult
  ): HierarchyNode {
    const node: HierarchyNode = {
      id: buildResult.buildId,
      name: buildResult.buildId,
      type: buildResult.buildType,
      status: buildResult.status,
      metrics: {
        tests: buildResult.testResults || { total: 0, passed: 0, failed: 0, skipped: 0 },
        coverage: buildResult.coverage,
        duration: buildResult.duration
      },
      children: []
    };
    
    // Add children recursively
    for (let i = 0; i < buildResult.children.length; i++) {
      const childBuild = buildResult.children[i];
      const childAggregated = aggregatedResult.children[i];
      node.children.push(this.buildHierarchyNode(childBuild, childAggregated));
    }
    
    return node;
  }

  /**
   * Calculate maximum depth
   */
  private async calculateMaxDepth(buildResult: HierarchicalBuildResult): number {
    if (buildResult.children.length === 0) return 1;
    
    const childDepths = buildResult.children.map(child => this.calculateMaxDepth(child));
    return 1 + Math.max(...childDepths);
  }

  /**
   * Generate test results section
   */
  private async generateTestResultsSection(aggregatedResults: AggregatedTestResult): TestResultsSection {
    return {
      summary: {
        total: aggregatedResults.totalTests,
        passed: aggregatedResults.passedTests,
        failed: aggregatedResults.failedTests,
        skipped: aggregatedResults.skippedTests,
        passRate: aggregatedResults.totalTests > 0
          ? ((aggregatedResults.passedTests / aggregatedResults.totalTests) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      
      byBuildType: this.groupTestResultsByType(aggregatedResults),
      
      failedTests: this.extractFailedTests(aggregatedResults),
      
      slowestTests: this.findSlowestTests(aggregatedResults),
      
      testDistribution: this.calculateTestDistribution(aggregatedResults)
    };
  }

  /**
   * Group test results by build type
   */
  private async groupTestResultsByType(aggregatedResults: AggregatedTestResult): BuildTypeTestResults[] {
    const grouped = new Map<string, BuildTypeTestResults>();
    
    for (const build of aggregatedResults.allBuilds) {
      if (!build.tests) continue;
      
      const existing = grouped.get(build.buildType) || {
        buildType: build.buildType,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };
      
      existing.total += build.tests.total;
      existing.passed += build.tests.passed;
      existing.failed += build.tests.failed;
      existing.skipped += build.tests.skipped;
      
      grouped.set(build.buildType, existing);
    }
    
    return Array.from(grouped.values());
  }

  /**
   * Extract failed tests
   */
  private async extractFailedTests(aggregatedResults: AggregatedTestResult): FailedTest[] {
    const failedTests: FailedTest[] = [];
    
    const extractFromResult = (result: AggregatedTestResult, path: string[] = []) => {
      if (result.ownResults?.errors) {
        for (const error of result.ownResults.errors) {
          failedTests.push({
            testName: error.test,
            buildId: result.buildId,
            buildPath: [...path, result.buildId],
            error: error.error,
            stack: error.stack
          });
        }
      }
      
      for (const child of result.children) {
        extractFromResult(child, [...path, result.buildId]);
      }
    };
    
    extractFromResult(aggregatedResults);
    return failedTests;
  }

  /**
   * Find slowest tests (placeholder)
   */
  private async findSlowestTests(aggregatedResults: AggregatedTestResult): SlowestTest[] {
    // In a real implementation, this would track individual test durations
    return [];
  }

  /**
   * Calculate test distribution
   */
  private async calculateTestDistribution(aggregatedResults: AggregatedTestResult): TestDistribution {
    const distribution: TestDistribution = {
      byStatus: {
        passed: aggregatedResults.passedTests,
        failed: aggregatedResults.failedTests,
        skipped: aggregatedResults.skippedTests
      },
      byBuildType: {}
    };
    
    for (const build of aggregatedResults.allBuilds) {
      if (!build.tests) continue;
      
      if (!distribution.byBuildType[build.buildType]) {
        distribution.byBuildType[build.buildType] = {
          passed: 0,
          failed: 0,
          skipped: 0
        };
      }
      
      distribution.byBuildType[build.buildType].passed += build.tests.passed;
      distribution.byBuildType[build.buildType].failed += build.tests.failed;
      distribution.byBuildType[build.buildType].skipped += build.tests.skipped;
    }
    
    return distribution;
  }

  /**
   * Generate coverage section
   */
  private async generateCoverageSection(aggregatedResults: AggregatedTestResult): CoverageSection | undefined {
    if (!aggregatedResults.aggregatedCoverage) return undefined;
    
    return {
      overall: {
        lines: aggregatedResults.aggregatedCoverage.lines,
        branches: aggregatedResults.aggregatedCoverage.branches,
        functions: aggregatedResults.aggregatedCoverage.functions,
        statements: aggregatedResults.aggregatedCoverage.statements,
        combined: this.calculateOverallCoverage(aggregatedResults.aggregatedCoverage)
      },
      
      byBuildType: this.groupCoverageByType(aggregatedResults),
      
      uncoveredFiles: this.findUncoveredFiles(aggregatedResults),
      
      coverageTrends: this.generateCoverageTrends(aggregatedResults),
      
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80
      }
    };
  }

  /**
   * Group coverage by build type
   */
  private async groupCoverageByType(aggregatedResults: AggregatedTestResult): BuildTypeCoverage[] {
    const grouped = new Map<string, BuildTypeCoverage>();
    
    for (const build of aggregatedResults.allBuilds) {
      if (!build.coverage) continue;
      
      const existing = grouped.get(build.buildType);
      if (!existing) {
        grouped.set(build.buildType, {
          buildType: build.buildType,
          lines: { total: 0, covered: 0, percentage: 0 },
          branches: { total: 0, covered: 0, percentage: 0 },
          functions: { total: 0, covered: 0, percentage: 0 },
          statements: { total: 0, covered: 0, percentage: 0 }
        });
      }
      
      const coverage = grouped.get(build.buildType)!;
      
      // Aggregate coverage metrics
      for (const metric of ['lines', "branches", "functions", "statements"] as const) {
        coverage[metric].total += build.coverage[metric].total;
        coverage[metric].covered += build.coverage[metric].covered;
      }
    }
    
    // Calculate percentages
    for (const coverage of grouped.values()) {
      for (const metric of ['lines', "branches", "functions", "statements"] as const) {
        const { total, covered } = coverage[metric];
        coverage[metric].percentage = total > 0 ? (covered / total) * 100 : 0;
      }
    }
    
    return Array.from(grouped.values());
  }

  /**
   * Find uncovered files (placeholder)
   */
  private async findUncoveredFiles(aggregatedResults: AggregatedTestResult): UncoveredFile[] {
    // In a real implementation, this would analyze coverage data
    return [];
  }

  /**
   * Generate coverage trends (placeholder)
   */
  private async generateCoverageTrends(aggregatedResults: AggregatedTestResult): CoverageTrend[] {
    // In a real implementation, this would compare with historical data
    return [];
  }

  /**
   * Generate performance section
   */
  private async generatePerformanceSection(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): PerformanceSection {
    return {
      buildDurations: {
        total: buildResults.duration || 0,
        average: this.calculateAverageDuration(aggregatedResults.allBuilds),
        min: this.findMinDuration(aggregatedResults.allBuilds),
        max: this.findMaxDuration(aggregatedResults.allBuilds)
      },
      
      parallelization: {
        maxParallelBuilds: this.calculateMaxParallelBuilds(buildResults),
        parallelizationEfficiency: this.calculateParallelizationEfficiency(buildResults)
      },
      
      bottlenecks: this.identifyBottlenecks(buildResults, aggregatedResults),
      
      resourceUsage: {
        // Placeholder - would track actual resource usage
        cpu: { average: 0, peak: 0 },
        memory: { average: 0, peak: 0 },
        disk: { read: 0, write: 0 }
      }
    };
  }

  /**
   * Calculate average duration
   */
  private async calculateAverageDuration(builds: any[]): number {
    const durations = builds.filter(b => b.duration).map(b => b.duration);
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Find minimum duration
   */
  private async findMinDuration(builds: any[]): number {
    const durations = builds.filter(b => b.duration).map(b => b.duration);
    return durations.length > 0 ? Math.min(...durations) : 0;
  }

  /**
   * Find maximum duration
   */
  private async findMaxDuration(builds: any[]): number {
    const durations = builds.filter(b => b.duration).map(b => b.duration);
    return durations.length > 0 ? Math.max(...durations) : 0;
  }

  /**
   * Calculate max parallel builds
   */
  private async calculateMaxParallelBuilds(buildResults: HierarchicalBuildResult): number {
    // Simplified - in reality would analyze execution timeline
    return buildResults.children.length;
  }

  /**
   * Calculate parallelization efficiency
   */
  private async calculateParallelizationEfficiency(buildResults: HierarchicalBuildResult): number {
    if (buildResults.children.length === 0) return 100;
    
    // Simplified calculation
    const totalChildDuration = buildResults.children
      .reduce((sum, child) => sum + (child.duration || 0), 0);
    
    if (totalChildDuration === 0 || !buildResults.duration) return 100;
    
    const efficiency = (totalChildDuration / buildResults.children.length) / buildResults.duration * 100;
    return Math.min(100, efficiency);
  }

  /**
   * Identify bottlenecks
   */
  private async identifyBottlenecks(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    // Find slow builds
    const slowThreshold = this.calculateAverageDuration(aggregatedResults.allBuilds) * 2;
    
    for (const build of aggregatedResults.allBuilds) {
      if (build.duration && build.duration > slowThreshold) {
        bottlenecks.push({
          type: 'slow-build',
          buildId: build.buildId,
          description: `Build took ${build.duration}ms (${(build.duration / 1000).toFixed(2)}s)`,
          impact: 'high',
          suggestion: 'Consider optimizing build configuration or splitting into smaller units'
        });
      }
    }
    
    return bottlenecks;
  }

  /**
   * Generate artifacts section
   */
  private async generateArtifactsSection(artifacts: CollectedArtifacts): ArtifactsSection {
    return {
      summary: {
        totalCount: artifacts.totalCount,
        totalSize: artifacts.totalSize,
        sizeFormatted: this.formatBytes(artifacts.totalSize)
      },
      
      byType: {
        logs: {
          count: artifacts.logs.length,
          size: artifacts.logs.reduce((sum, a) => sum + a.size, 0),
          files: artifacts.logs
        },
        coverage: {
          count: artifacts.coverage.length,
          size: artifacts.coverage.reduce((sum, a) => sum + a.size, 0),
          files: artifacts.coverage
        },
        reports: {
          count: artifacts.reports.length,
          size: artifacts.reports.reduce((sum, a) => sum + a.size, 0),
          files: artifacts.reports
        },
        screenshots: {
          count: artifacts.screenshots.length,
          size: artifacts.screenshots.reduce((sum, a) => sum + a.size, 0),
          files: artifacts.screenshots
        },
        custom: {
          count: artifacts.custom.length,
          size: artifacts.custom.reduce((sum, a) => sum + a.size, 0),
          files: artifacts.custom
        }
      },
      
      compressionSavings: this.calculateCompressionSavings(artifacts)
    };
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Calculate compression savings
   */
  private async calculateCompressionSavings(artifacts: CollectedArtifacts): number {
    // Estimate based on compressed artifacts
    const compressedCount = [
      ...artifacts.logs,
      ...artifacts.coverage,
      ...artifacts.reports,
      ...artifacts.custom
    ].filter(a => a.compressed).length;
    
    // Assume 70% compression ratio for text files
    return compressedCount > 0 ? 70 : 0;
  }

  /**
   * Generate timeline section
   */
  private async generateTimelineSection(buildResults: HierarchicalBuildResult): TimelineSection {
    const events: TimelineEvent[] = [];
    
    // Add build events recursively
    this.collectTimelineEvents(buildResults, events);
    
    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return {
      events,
      duration: buildResults.duration || 0,
      startTime: buildResults.startTime,
      endTime: buildResults.endTime
    };
  }

  /**
   * Collect timeline events
   */
  private async collectTimelineEvents(
    buildResult: HierarchicalBuildResult,
    events: TimelineEvent[]
  ): void {
    // Add start event
    if (buildResult.startTime) {
      events.push({
        timestamp: buildResult.startTime,
        type: 'build-start',
        buildId: buildResult.buildId,
        description: `${buildResult.buildType} build started`
      });
    }
    
    // Add end event
    if (buildResult.endTime) {
      events.push({
        timestamp: buildResult.endTime,
        type: 'build-end',
        buildId: buildResult.buildId,
        description: `${buildResult.buildType} build ${buildResult.status}`,
        status: buildResult.status
      });
    }
    
    // Add error events
    if (buildResult.error) {
      events.push({
        timestamp: buildResult.endTime || new Date(),
        type: 'error',
        buildId: buildResult.buildId,
        description: buildResult.error.message,
        severity: 'high'
      });
    }
    
    // Process children
    for (const child of buildResult.children) {
      this.collectTimelineEvents(child, events);
    }
  }

  /**
   * Generate issues section
   */
  private async generateIssuesSection(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): IssuesSection {
    const issues: Issue[] = [];
    
    // Collect build failures
    for (const failedBuild of aggregatedResults.failedBuilds) {
      issues.push({
        id: `build-failure-${failedBuild.buildId}`,
        type: 'build-failure',
        severity: "critical",
        buildId: failedBuild.buildId,
        title: `Build Failed: ${failedBuild.buildId}`,
        description: failedBuild.error?.message || 'Build failed with unknown error',
        suggestion: 'Check build logs for detailed error information',
        timestamp: new Date()
      });
    }
    
    // Collect test failures
    const failedTests = this.extractFailedTests(aggregatedResults);
    for (const test of failedTests) {
      issues.push({
        id: `test-failure-${test.testName}`,
        type: 'test-failure',
        severity: 'high',
        buildId: test.buildId,
        title: `Test Failed: ${test.testName}`,
        description: test.error,
        stackTrace: test.stack,
        suggestion: 'Review test implementation and fix the failing assertion',
        timestamp: new Date()
      });
    }
    
    // Check coverage thresholds
    if (aggregatedResults.aggregatedCoverage) {
      const coverage = aggregatedResults.aggregatedCoverage;
      const threshold = 80;
      
      for (const metric of ['lines', "branches", "functions", "statements"] as const) {
        if (coverage[metric].percentage < threshold) {
          issues.push({
            id: `coverage-${metric}`,
            type: 'coverage-threshold',
            severity: 'medium',
            title: `${metric} coverage below threshold`,
            description: `${metric} coverage is ${coverage[metric].percentage.toFixed(2)}%, below the ${threshold}% threshold`,
            suggestion: 'Add more tests to improve coverage',
            timestamp: new Date()
          });
        }
      }
    }
    
    return {
      critical: issues.filter(i => i.severity === "critical"),
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low'),
      total: issues.length
    };
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    buildResults: HierarchicalBuildResult,
    aggregatedResults: AggregatedTestResult
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Performance recommendations
    const avgDuration = this.calculateAverageDuration(aggregatedResults.allBuilds);
    if (avgDuration > 120000) { // 2 minutes
      recommendations.push({
        category: "performance",
        priority: 'high',
        title: 'Optimize Build Performance',
        description: 'Average build duration exceeds 2 minutes',
        actions: [
          'Enable parallel test execution',
          'Optimize test setup and teardown',
          'Consider splitting large test suites',
          'Review and optimize build configurations'
        ]
      });
    }
    
    // Coverage recommendations
    if (aggregatedResults.aggregatedCoverage) {
      const overallCoverage = this.calculateOverallCoverage(aggregatedResults.aggregatedCoverage);
      if (overallCoverage < 80) {
        recommendations.push({
          category: 'quality',
          priority: 'high',
          title: 'Improve Test Coverage',
          description: `Overall coverage is ${overallCoverage.toFixed(2)}%, below recommended 80%`,
          actions: [
            'Identify uncovered code paths',
            'Add unit tests for critical functions',
            'Implement integration tests for key workflows',
            'Set up coverage monitoring in CI/CD'
          ]
        });
      }
    }
    
    // Stability recommendations
    if (aggregatedResults.failedBuilds.length > 0) {
      recommendations.push({
        category: "stability",
        priority: "critical",
        title: 'Fix Build Failures',
        description: `${aggregatedResults.failedBuilds.length} builds are failing`,
        actions: [
          'Review build error logs',
          'Fix compilation or configuration issues',
          'Ensure all dependencies are properly installed',
          'Verify environment configurations'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * Generate output in specified format
   */
  private async generateOutput(
    report: UnifiedReport,
    format: string,
    options: ReportGenerationOptions
  ): Promise<GeneratedOutput> {
    let content: string;
    
    switch (format) {
      case 'html':
        content = await this.generateHtmlOutput(report, options);
        break;
        
      case "markdown":
        content = await this.generateMarkdownOutput(report, options);
        break;
        
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
        
      case 'pdf':
        // Would use a PDF generation library
        content = await this.generatePdfOutput(report, options);
        break;
        
      default:
        // Check for custom formatter
        const customFormatter = this.customFormatters.get(format);
        if (customFormatter) {
          content = await customFormatter(report, options);
        } else {
          throw new Error(`Unsupported output format: ${format}`);
        }
    }
    
    return {
      format,
      content,
      size: Buffer.byteLength(content, 'utf8'),
      generated: new Date()
    };
  }

  /**
   * Generate HTML output
   */
  private async generateHtmlOutput(
    report: UnifiedReport,
    options: ReportGenerationOptions
  ): Promise<string> {
    const template = this.reportTemplates.get('html')!;
    
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.metadata.title}</title>
  <style>${template.styles}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${report.metadata.title}</h1>
      <div class="metadata">
        <span>Generated: ${report.metadata.generatedAt.toLocaleString()}</span>
        <span>Build Type: ${report.metadata.buildType}</span>
        <span>Report Version: ${report.metadata.reportVersion}</span>
      </div>
    </header>
    
    <nav>
      <ul>
        <li><a href="#summary">Summary</a></li>
        <li><a href="#hierarchy">Build Hierarchy</a></li>
        <li><a href="#tests">Test Results</a></li>
        <li><a href="#coverage">Coverage</a></li>
        <li><a href="#performance">Performance</a></li>
        <li><a href="#artifacts">Artifacts</a></li>
        <li><a href="#timeline">Timeline</a></li>
        <li><a href="#issues">Issues</a></li>
        <li><a href="#recommendations">Recommendations</a></li>
      </ul>
    </nav>
    
    <main>
      ${this.generateHtmlSummarySection(report.summary)}
      ${this.generateHtmlHierarchySection(report.hierarchy)}
      ${this.generateHtmlTestResultsSection(report.testResults)}
      ${report.coverage ? this.generateHtmlCoverageSection(report.coverage) : ''}
      ${this.generateHtmlPerformanceSection(report.performance)}
      ${this.generateHtmlArtifactsSection(report.artifacts)}
      ${this.generateHtmlTimelineSection(report.timeline)}
      ${this.generateHtmlIssuesSection(report.issues)}
      ${this.generateHtmlRecommendationsSection(report.recommendations)}
    </main>
    
    <footer>
      <p>Generated by Unified Report Generator v1.0.0</p>
    </footer>
  </div>
  <script>${template.scripts}</script>
</body>
</html>
    `;
    
    return html;
  }

  /**
   * Generate HTML summary section
   */
  private async generateHtmlSummarySection(summary: ExecutiveSummary): string {
    const statusClass = summary.overallStatus === 'success' ? 'success' : 
                       summary.overallStatus === 'failure' ? 'failure' : 
                       summary.overallStatus === 'partial' ? 'warning' : 'default';
    
    return `
<section id="summary" class="summary">
  <h2>Executive Summary</h2>
  
  <div class="status-banner ${statusClass}">
    <h3>Overall Status: ${summary.overallStatus.toUpperCase()}</h3>
  </div>
  
  <div class="metrics-grid">
    <div class="metric-card">
      <h4>Build Metrics</h4>
      <div class="metric">
        <span class="label">Total Builds:</span>
        <span class="value">${summary.buildMetrics.totalBuilds}</span>
      </div>
      <div class="metric">
        <span class="label">Successful:</span>
        <span class="value success">${summary.buildMetrics.successfulBuilds}</span>
      </div>
      <div class="metric">
        <span class="label">Failed:</span>
        <span class="value failure">${summary.buildMetrics.failedBuilds}</span>
      </div>
      <div class="metric">
        <span class="label">Success Rate:</span>
        <span class="value">${summary.buildMetrics.successRate}%</span>
      </div>
    </div>
    
    <div class="metric-card">
      <h4>Test Metrics</h4>
      <div class="metric">
        <span class="label">Total Tests:</span>
        <span class="value">${summary.testMetrics.totalTests}</span>
      </div>
      <div class="metric">
        <span class="label">Passed:</span>
        <span class="value success">${summary.testMetrics.passedTests}</span>
      </div>
      <div class="metric">
        <span class="label">Failed:</span>
        <span class="value failure">${summary.testMetrics.failedTests}</span>
      </div>
      <div class="metric">
        <span class="label">Pass Rate:</span>
        <span class="value">${summary.testMetrics.passRate}%</span>
      </div>
    </div>
    
    ${summary.coverageMetrics ? `
    <div class="metric-card">
      <h4>Coverage Metrics</h4>
      <div class="metric">
        <span class="label">Lines:</span>
        <span class="value">${summary.coverageMetrics.lineCoverage}%</span>
      </div>
      <div class="metric">
        <span class="label">Branches:</span>
        <span class="value">${summary.coverageMetrics.branchCoverage}%</span>
      </div>
      <div class="metric">
        <span class="label">Functions:</span>
        <span class="value">${summary.coverageMetrics.functionCoverage}%</span>
      </div>
      <div class="metric">
        <span class="label">Overall:</span>
        <span class="value">${summary.coverageMetrics.overallCoverage}%</span>
      </div>
    </div>
    ` : ''}
  </div>
  
  <div class="key-findings">
    <h4>Key Findings</h4>
    <ul>
      ${summary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
    </ul>
  </div>
</section>
    `;
  }

  /**
   * Generate other HTML sections (simplified for brevity)
   */
  private async generateHtmlHierarchySection(hierarchy: HierarchicalView): string {
    return `<section id="hierarchy"><h2>Build Hierarchy</h2><!-- Hierarchy visualization --></section>`;
  }

  private async generateHtmlTestResultsSection(testResults: TestResultsSection): string {
    return `<section id="tests"><h2>Test Results</h2><!-- Test results details --></section>`;
  }

  private async generateHtmlCoverageSection(coverage: CoverageSection): string {
    return `<section id="coverage"><h2>Coverage Report</h2><!-- Coverage details --></section>`;
  }

  private async generateHtmlPerformanceSection(performance: PerformanceSection): string {
    return `<section id="performance"><h2>Performance Analysis</h2><!-- Performance details --></section>`;
  }

  private async generateHtmlArtifactsSection(artifacts: ArtifactsSection): string {
    return `<section id="artifacts"><h2>Build Artifacts</h2><!-- Artifacts list --></section>`;
  }

  private async generateHtmlTimelineSection(timeline: TimelineSection): string {
    return `<section id="timeline"><h2>Execution Timeline</h2><!-- Timeline visualization --></section>`;
  }

  private async generateHtmlIssuesSection(issues: IssuesSection): string {
    return `<section id="issues"><h2>Issues Found</h2><!-- Issues list --></section>`;
  }

  private async generateHtmlRecommendationsSection(recommendations: Recommendation[]): string {
    return `<section id="recommendations"><h2>Recommendations</h2><!-- Recommendations --></section>`;
  }

  /**
   * Generate Markdown output
   */
  private async generateMarkdownOutput(
    report: UnifiedReport,
    options: ReportGenerationOptions
  ): Promise<string> {
    let markdown = `# ${report.metadata.title}\n\n`;
    markdown += `Generated: ${report.metadata.generatedAt.toLocaleString()}\n\n`;
    
    // Add sections
    markdown += this.generateMarkdownSummary(report.summary);
    markdown += this.generateMarkdownTestResults(report.testResults);
    
    if (report.coverage) {
      markdown += this.generateMarkdownCoverage(report.coverage);
    }
    
    markdown += this.generateMarkdownIssues(report.issues);
    markdown += this.generateMarkdownRecommendations(report.recommendations);
    
    return markdown;
  }

  /**
   * Generate Markdown sections
   */
  private async generateMarkdownSummary(summary: ExecutiveSummary): string {
    return `
## Executive Summary

**Overall Status:** ${summary.overallStatus.toUpperCase()}

### Build Metrics
- Total Builds: ${summary.buildMetrics.totalBuilds}
- Successful: ${summary.buildMetrics.successfulBuilds}
- Failed: ${summary.buildMetrics.failedBuilds}
- Success Rate: ${summary.buildMetrics.successRate}%

### Test Metrics
- Total Tests: ${summary.testMetrics.totalTests}
- Passed: ${summary.testMetrics.passedTests}
- Failed: ${summary.testMetrics.failedTests}
- Pass Rate: ${summary.testMetrics.passRate}%

### Key Findings
${summary.keyFindings.map(f => `- ${f}`).join('\n')}

`;
  }

  private async generateMarkdownTestResults(testResults: TestResultsSection): string {
    return `
## Test Results

Total: ${testResults.summary.total} | Passed: ${testResults.summary.passed} | Failed: ${testResults.summary.failed} | Pass Rate: ${testResults.summary.passRate}

`;
  }

  private async generateMarkdownCoverage(coverage: CoverageSection): string {
    return `
## Coverage Report

- Lines: ${coverage.overall.lines.percentage.toFixed(2)}%
- Branches: ${coverage.overall.branches.percentage.toFixed(2)}%
- Functions: ${coverage.overall.functions.percentage.toFixed(2)}%
- Statements: ${coverage.overall.statements.percentage.toFixed(2)}%
- Overall: ${coverage.overall.combined.toFixed(2)}%

`;
  }

  private async generateMarkdownIssues(issues: IssuesSection): string {
    return `
## Issues

- Critical: ${issues.critical.length}
- High: ${issues.high.length}
- Medium: ${issues.medium.length}
- Low: ${issues.low.length}

`;
  }

  private async generateMarkdownRecommendations(recommendations: Recommendation[]): string {
    if (recommendations.length === 0) return '';
    
    return `
## Recommendations

${recommendations.map(r => `
### ${r.title}
**Priority:** ${r.priority}
${r.description}

Actions:
${r.actions.map(a => `- ${a}`).join('\n')}
`).join('\n')}
`;
  }

  /**
   * Generate PDF output (placeholder)
   */
  private async generatePdfOutput(
    report: UnifiedReport,
    options: ReportGenerationOptions
  ): Promise<string> {
    // In a real implementation, would use a PDF library
    const html = await this.generateHtmlOutput(report, options);
    return `PDF Generation not implemented. HTML content length: ${html.length}`;
  }

  /**
   * Save output to file
   */
  private async saveOutput(
    output: GeneratedOutput,
    outputPath: string,
    format: string
  ): Promise<void> {
    const extension = format === 'html' ? '.html' :
                     format === "markdown" ? '.md' :
                     format === 'json' ? '.json' :
                     format === 'pdf' ? '.pdf' : `.${format}`;
    
    const fileName = `unified-report-${new Date().toISOString().split('T')[0]}${extension}`;
    const filePath = join(outputPath, fileName);
    
    await fileAPI.createDirectory(dirname(filePath));
    await fileAPI.createFile(filePath, output.content);
    
    this.emit("reportSaved", { type: FileType.TEMPORARY })
    });
  }

  /**
   * Get default HTML styles
   */
  private async getDefaultHtmlStyles(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background: #f5f5f5;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      header {
        background: #2c3e50;
        color: white;
        padding: 2rem;
      }
      header h1 {
        margin: 0;
        font-size: 2rem;
      }
      .metadata {
        margin-top: 1rem;
        opacity: 0.8;
      }
      .metadata span {
        margin-right: 2rem;
      }
      nav {
        background: #34495e;
        padding: 0;
      }
      nav ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
      }
      nav li {
        flex: 1;
      }
      nav a {
        display: block;
        padding: 1rem;
        color: white;
        text-decoration: none;
        text-align: center;
        transition: background 0.3s;
      }
      nav a:hover {
        background: #2c3e50;
      }
      main {
        padding: 2rem;
      }
      section {
        margin-bottom: 3rem;
      }
      h2 {
        color: #2c3e50;
        border-bottom: 2px solid #ecf0f1;
        padding-bottom: 0.5rem;
      }
      .status-banner {
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 2rem;
      }
      .status-banner.success {
        background: #27ae60;
        color: white;
      }
      .status-banner.failure {
        background: #e74c3c;
        color: white;
      }
      .status-banner.warning {
        background: #f39c12;
        color: white;
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        margin-bottom: 2rem;
      }
      .metric-card {
        background: #ecf0f1;
        padding: 1.5rem;
        border-radius: 8px;
      }
      .metric-card h4 {
        margin-top: 0;
        color: #2c3e50;
      }
      .metric {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
      }
      .metric .value {
        font-weight: bold;
      }
      .metric .value.success {
        color: #27ae60;
      }
      .metric .value.failure {
        color: #e74c3c;
      }
      .key-findings {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        border-left: 4px solid #3498db;
      }
      .key-findings ul {
        margin: 0;
        padding-left: 1.5rem;
      }
      footer {
        background: #2c3e50;
        color: white;
        text-align: center;
        padding: 1rem;
      }
    `;
  }

  /**
   * Get default HTML scripts
   */
  private async getDefaultHtmlScripts(): string {
    return `
      // Add interactive features
      document.addEventListener("DOMContentLoaded", function() {
        // Smooth scrolling for navigation
        document.querySelectorAll('nav a').forEach(anchor => {
          anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          });
        });
        
        // Collapsible sections
        document.querySelectorAll('section h2').forEach(header => {
          header.style.cursor = 'pointer';
          header.addEventListener('click', function() {
            const content = this.parentElement.querySelector('*:not(h2)');
            if (content) {
              content.style.display = content.style.display === 'none' ? '' : 'none';
            }
          });
        });
      });
    `;
  }

  /**
   * Register custom formatter
   */
  async registerFormatter(name: string, formatter: ReportFormatter): void {
    this.customFormatters.set(name, formatter);
  }

  /**
   * Register custom template
   */
  async registerTemplate(name: string, template: ReportTemplate): void {
    this.reportTemplates.set(name, template);
  }
}

// Type definitions

interface ReportGenerationOptions {
  title?: string;
  format?: string;
  formats?: string[];
  outputPath?: string;
  includeScreenshots?: boolean;
  includeDetailedLogs?: boolean;
  template?: string;
}

interface UnifiedReport {
  metadata: ReportMetadata;
  summary: ExecutiveSummary;
  hierarchy: HierarchicalView;
  testResults: TestResultsSection;
  coverage?: CoverageSection;
  performance: PerformanceSection;
  artifacts: ArtifactsSection;
  timeline: TimelineSection;
  issues: IssuesSection;
  recommendations: Recommendation[];
  outputs?: GeneratedOutput[];
}

interface ReportMetadata {
  title: string;
  generatedAt: Date;
  buildId: string;
  buildType: string;
  reportVersion: string;
}

interface ExecutiveSummary {
  overallStatus: 'success' | 'failure' | 'partial' | 'skipped';
  buildMetrics: {
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    skippedBuilds: number;
    successRate: string;
  };
  testMetrics: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    passRate: string;
  };
  coverageMetrics?: {
    lineCoverage: string;
    branchCoverage: string;
    functionCoverage: string;
    statementCoverage: string;
    overallCoverage: string;
  };
  duration: {
    totalDuration: number;
    startTime?: Date;
    endTime?: Date;
  };
  keyFindings: string[];
  trendsComparedToPrevious: (options: any) => TrendData | undefined;
}

interface HierarchicalView {
  root: HierarchyNode;
  totalDepth: number;
  expandedByDefault: boolean;
}

interface HierarchyNode {
  id: string;
  name: string;
  type: string;
  status: string;
  metrics: {
    tests?: any;
    coverage?: any;
    duration?: number;
  };
  children: HierarchyNode[];
}

interface TestResultsSection {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: string;
  };
  byBuildType: BuildTypeTestResults[];
  failedTests: FailedTest[];
  slowestTests: SlowestTest[];
  testDistribution: TestDistribution;
}

interface BuildTypeTestResults {
  buildType: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface FailedTest {
  testName: string;
  buildId: string;
  buildPath: string[];
  error: string;
  stack?: string;
}

interface SlowestTest {
  testName: string;
  buildId: string;
  duration: number;
}

interface TestDistribution {
  byStatus: {
    passed: number;
    failed: number;
    skipped: number;
  };
  byBuildType: Record<string, {
    passed: number;
    failed: number;
    skipped: number;
  }>;
}

interface CoverageSection {
  overall: {
    lines: any;
    branches: any;
    functions: any;
    statements: any;
    combined: number;
  };
  byBuildType: BuildTypeCoverage[];
  uncoveredFiles: UncoveredFile[];
  coverageTrends: CoverageTrend[];
  thresholds: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
}

interface BuildTypeCoverage {
  buildType: string;
  lines: any;
  branches: any;
  functions: any;
  statements: any;
}

interface UncoveredFile {
  path: string;
  lines: number;
  uncoveredLines: number[];
}

interface CoverageTrend {
  date: Date;
  coverage: number;
}

interface PerformanceSection {
  buildDurations: {
    total: number;
    average: number;
    min: number;
    max: number;
  };
  parallelization: {
    maxParallelBuilds: number;
    parallelizationEfficiency: number;
  };
  bottlenecks: Bottleneck[];
  resourceUsage: {
    cpu: { average: number; peak: number };
    memory: { average: number; peak: number };
    disk: { read: number; write: number };
  };
}

interface Bottleneck {
  type: string;
  buildId: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

interface ArtifactsSection {
  summary: {
    totalCount: number;
    totalSize: number;
    sizeFormatted: string;
  };
  byType: Record<string, {
    count: number;
    size: number;
    files: any[];
  }>;
  compressionSavings: number;
}

interface TimelineSection {
  events: TimelineEvent[];
  duration: number;
  startTime?: Date;
  endTime?: Date;
}

interface TimelineEvent {
  timestamp: Date;
  type: string;
  buildId: string;
  description: string;
  status?: string;
  severity?: string;
}

interface IssuesSection {
  critical: Issue[];
  high: Issue[];
  medium: Issue[];
  low: Issue[];
  total: number;
}

interface Issue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | "critical";
  buildId?: string;
  title: string;
  description: string;
  stackTrace?: string;
  suggestion: string;
  timestamp: Date;
}

interface Recommendation {
  category: string;
  priority: string;
  title: string;
  description: string;
  actions: string[];
}

interface GeneratedOutput {
  format: string;
  content: string;
  size: number;
  generated: Date;
}

interface ReportTemplate {
  name: string;
  format: string;
  sections: string[];
  styles?: string;
  scripts?: string;
}

interface TrendData {
  // Placeholder for trend data
}

type ReportFormatter = (report: UnifiedReport, options: ReportGenerationOptions) => Promise<string>;

export {
  UnifiedReportGenerator,
  ReportGenerationOptions,
  UnifiedReport
};