import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { HierarchicalBuildResult } from '../domain/hierarchical-build-config';
import { TestResult } from '../domain/test-result';

/**
 * Test Result Aggregator
 * 
 * Aggregates test results from distributed child theme/epic builds
 * while maintaining traceability and hierarchical structure.
 */
export class TestResultAggregator extends EventEmitter {
  
  /**
   * Aggregate test results from hierarchical build results
   */
  aggregateResults(
    buildResults: HierarchicalBuildResult,
    options: AggregationOptions = {}
  ): AggregatedTestResult {
    const startTime = new Date();
    
    this.emit('aggregationStart', {
      buildId: buildResults.buildId,
      timestamp: startTime
    });
    
    const aggregated = this.performAggregation(buildResults, options);
    
    const endTime = new Date();
    
    this.emit('aggregationComplete', {
      buildId: buildResults.buildId,
      duration: endTime.getTime() - startTime.getTime(),
      resultCount: aggregated.totalBuilds,
      timestamp: endTime
    });
    
    return aggregated;
  }

  /**
   * Perform the actual aggregation
   */
  private performAggregation(
    buildResult: HierarchicalBuildResult,
    options: AggregationOptions,
    level: number = 0
  ): AggregatedTestResult {
    const result: AggregatedTestResult = {
      buildId: buildResult.buildId,
      buildType: buildResult.buildType,
      level,
      status: buildResult.status,
      startTime: buildResult.startTime,
      endTime: buildResult.endTime,
      duration: buildResult.duration,
      
      // Own test results
      ownResults: buildResult.testResults ? {
        tests: {
          total: buildResult.testResults.total,
          passed: buildResult.testResults.passed,
          failed: buildResult.testResults.failed,
          skipped: buildResult.testResults.skipped
        },
        coverage: buildResult.coverage,
        errors: buildResult.testResults.errors,
        artifacts: buildResult.artifacts
      } : undefined,
      
      // Aggregated totals
      totalBuilds: 1,
      totalTests: buildResult.testResults?.total || 0,
      passedTests: buildResult.testResults?.passed || 0,
      failedTests: buildResult.testResults?.failed || 0,
      skippedTests: buildResult.testResults?.skipped || 0,
      
      // Coverage aggregation
      aggregatedCoverage: buildResult.coverage ? {
        lines: { ...buildResult.coverage.lines },
        branches: { ...buildResult.coverage.branches },
        functions: { ...buildResult.coverage.functions },
        statements: { ...buildResult.coverage.statements }
      } : undefined,
      
      // Child results
      children: [],
      
      // Flattened view for easy access
      allBuilds: [this.createBuildSummary(buildResult)],
      failedBuilds: [],
      
      // Aggregation metadata
      aggregationMethod: options.method || 'hierarchical',
      aggregationTimestamp: new Date()
    };
    
    // Process children
    if (buildResult.children.length > 0) {
      for (const child of buildResult.children) {
        const childAggregated = this.performAggregation(child, options, level + 1);
        result.children.push(childAggregated);
        
        // Aggregate child totals
        result.totalBuilds += childAggregated.totalBuilds;
        result.totalTests += childAggregated.totalTests;
        result.passedTests += childAggregated.passedTests;
        result.failedTests += childAggregated.failedTests;
        result.skippedTests += childAggregated.skippedTests;
        
        // Merge coverage if requested
        if (options.aggregateCoverage && childAggregated.aggregatedCoverage && result.aggregatedCoverage) {
          this.mergeCoverage(result.aggregatedCoverage, childAggregated.aggregatedCoverage);
        }
        
        // Collect all builds for flat view
        result.allBuilds.push(...childAggregated.allBuilds);
        result.failedBuilds.push(...childAggregated.failedBuilds);
      }
    }
    
    // Add to failed builds if this build failed
    if (buildResult.status === 'failed') {
      result.failedBuilds.push(this.createBuildSummary(buildResult));
    }
    
    // Calculate final coverage percentages
    if (result.aggregatedCoverage) {
      this.calculateCoveragePercentages(result.aggregatedCoverage);
    }
    
    // Apply filtering if specified
    if (options.filter) {
      this.applyFilter(result, options.filter);
    }
    
    return result;
  }

  /**
   * Create a build summary for flat view
   */
  private createBuildSummary(buildResult: HierarchicalBuildResult): BuildSummary {
    return {
      buildId: buildResult.buildId,
      buildType: buildResult.buildType,
      status: buildResult.status,
      duration: buildResult.duration,
      tests: buildResult.testResults ? {
        total: buildResult.testResults.total,
        passed: buildResult.testResults.passed,
        failed: buildResult.testResults.failed,
        skipped: buildResult.testResults.skipped
      } : undefined,
      coverage: buildResult.coverage,
      error: buildResult.error,
      path: this.getBuildPath(buildResult)
    };
  }

  /**
   * Get the hierarchical path to a build
   */
  private getBuildPath(buildResult: HierarchicalBuildResult): string[] {
    // In a real implementation, this would traverse up the parent chain
    return [buildResult.buildId];
  }

  /**
   * Merge coverage data
   */
  private mergeCoverage(
    target: CoverageData,
    source: CoverageData
  ): void {
    for (const metric of ['lines', 'branches', 'functions', 'statements'] as const) {
      target[metric].total += source[metric].total;
      target[metric].covered += source[metric].covered;
    }
  }

  /**
   * Calculate coverage percentages
   */
  private calculateCoveragePercentages(coverage: CoverageData): void {
    for (const metric of ['lines', 'branches', 'functions', 'statements'] as const) {
      const { total, covered } = coverage[metric];
      coverage[metric].percentage = total > 0 ? (covered / total) * 100 : 0;
    }
  }

  /**
   * Apply filtering to results
   */
  private applyFilter(
    result: AggregatedTestResult,
    filter: ResultFilter
  ): void {
    if (filter.status) {
      result.allBuilds = result.allBuilds.filter(b => b.status === filter.status);
      result.failedBuilds = result.failedBuilds.filter(b => b.status === filter.status);
    }
    
    if (filter.buildType) {
      result.allBuilds = result.allBuilds.filter(b => b.buildType === filter.buildType);
      result.failedBuilds = result.failedBuilds.filter(b => b.buildType === filter.buildType);
    }
    
    if (filter.minDuration !== undefined) {
      result.allBuilds = result.allBuilds.filter(b => (b.duration || 0) >= filter.minDuration!);
      result.failedBuilds = result.failedBuilds.filter(b => (b.duration || 0) >= filter.minDuration!);
    }
  }

  /**
   * Generate test result summary report
   */
  generateSummaryReport(aggregated: AggregatedTestResult): TestSummaryReport {
    const report: TestSummaryReport = {
      title: `Test Results Summary - ${aggregated.buildId}`,
      buildType: aggregated.buildType,
      timestamp: new Date(),
      
      overview: {
        totalBuilds: aggregated.totalBuilds,
        totalTests: aggregated.totalTests,
        passedTests: aggregated.passedTests,
        failedTests: aggregated.failedTests,
        skippedTests: aggregated.skippedTests,
        passRate: aggregated.totalTests > 0 
          ? (aggregated.passedTests / aggregated.totalTests * 100).toFixed(2) + '%'
          : 'N/A',
        status: aggregated.status
      },
      
      coverage: aggregated.aggregatedCoverage ? {
        lines: `${aggregated.aggregatedCoverage.lines.percentage.toFixed(2)}%`,
        branches: `${aggregated.aggregatedCoverage.branches.percentage.toFixed(2)}%`,
        functions: `${aggregated.aggregatedCoverage.functions.percentage.toFixed(2)}%`,
        statements: `${aggregated.aggregatedCoverage.statements.percentage.toFixed(2)}%`,
        overall: this.calculateOverallCoverage(aggregated.aggregatedCoverage).toFixed(2) + '%'
      } : undefined,
      
      buildBreakdown: this.generateBuildBreakdown(aggregated),
      
      failedBuilds: aggregated.failedBuilds.map(build => ({
        buildId: build.buildId,
        buildType: build.buildType,
        error: build.error?.message || 'Unknown error',
        failedTests: build.tests?.failed || 0
      })),
      
      testErrors: this.collectAllTestErrors(aggregated),
      
      performanceMetrics: {
        totalDuration: aggregated.duration || 0,
        averageBuildDuration: this.calculateAverageDuration(aggregated.allBuilds),
        slowestBuild: this.findSlowestBuild(aggregated.allBuilds),
        fastestBuild: this.findFastestBuild(aggregated.allBuilds)
      }
    };
    
    this.emit('summaryGenerated', {
      buildId: aggregated.buildId,
      report,
      timestamp: new Date()
    });
    
    return report;
  }

  /**
   * Calculate overall coverage percentage
   */
  private calculateOverallCoverage(coverage: CoverageData): number {
    const metrics = ['lines', 'branches', 'functions', 'statements'] as const;
    const sum = metrics.reduce((acc, metric) => acc + coverage[metric].percentage, 0);
    return sum / metrics.length;
  }

  /**
   * Generate build breakdown by type
   */
  private generateBuildBreakdown(aggregated: AggregatedTestResult): BuildBreakdown[] {
    const breakdown = new Map<string, BuildBreakdown>();
    
    for (const build of aggregated.allBuilds) {
      const existing = breakdown.get(build.buildType) || {
        buildType: build.buildType,
        count: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        totalTests: 0
      };
      
      existing.count++;
      if (build.status === 'passed') existing.passed++;
      else if (build.status === 'failed') existing.failed++;
      else if (build.status === 'skipped') existing.skipped++;
      
      if (build.tests) {
        existing.totalTests += build.tests.total;
      }
      
      breakdown.set(build.buildType, existing);
    }
    
    return Array.from(breakdown.values());
  }

  /**
   * Collect all test errors across builds
   */
  private collectAllTestErrors(aggregated: AggregatedTestResult): TestError[] {
    const errors: TestError[] = [];
    
    const collectFromResult = (result: AggregatedTestResult) => {
      if (result.ownResults?.errors) {
        for (const error of result.ownResults.errors) {
          errors.push({
            buildId: result.buildId,
            buildType: result.buildType,
            test: error.test,
            error: error.error,
            stack: error.stack
          });
        }
      }
      
      for (const child of result.children) {
        collectFromResult(child);
      }
    };
    
    collectFromResult(aggregated);
    return errors;
  }

  /**
   * Calculate average build duration
   */
  private calculateAverageDuration(builds: BuildSummary[]): number {
    const durations = builds.filter(b => b.duration).map(b => b.duration!);
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Find slowest build
   */
  private findSlowestBuild(builds: BuildSummary[]): BuildSummary | undefined {
    return builds.reduce((slowest, current) => {
      if (!current.duration) return slowest;
      if (!slowest || !slowest.duration) return current;
      return current.duration > slowest.duration ? current : slowest;
    }, undefined as BuildSummary | undefined);
  }

  /**
   * Find fastest build
   */
  private findFastestBuild(builds: BuildSummary[]): BuildSummary | undefined {
    return builds.reduce((fastest, current) => {
      if (!current.duration) return fastest;
      if (!fastest || !fastest.duration) return current;
      return current.duration < fastest.duration ? current : fastest;
    }, undefined as BuildSummary | undefined);
  }

  /**
   * Export aggregated results to various formats
   */
  async exportResults(
    aggregated: AggregatedTestResult,
    format: 'json' | 'html' | 'markdown' | 'csv'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(aggregated, null, 2);
        
      case 'html':
        return this.generateHtmlReport(aggregated);
        
      case 'markdown':
        return this.generateMarkdownReport(aggregated);
        
      case 'csv':
        return this.generateCsvReport(aggregated);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(aggregated: AggregatedTestResult): string {
    const summary = this.generateSummaryReport(aggregated);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${summary.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .overview { background: #f0f0f0; padding: 15px; border-radius: 5px; }
    .metric { display: inline-block; margin: 10px; }
    .failed { color: #d32f2f; }
    .passed { color: #388e3c; }
    .skipped { color: #f57c00; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${summary.title}</h1>
  <div class="overview">
    <h2>Overview</h2>
    <div class="metric">Total Builds: <strong>${summary.overview.totalBuilds}</strong></div>
    <div class="metric">Total Tests: <strong>${summary.overview.totalTests}</strong></div>
    <div class="metric passed">Passed: <strong>${summary.overview.passedTests}</strong></div>
    <div class="metric failed">Failed: <strong>${summary.overview.failedTests}</strong></div>
    <div class="metric skipped">Skipped: <strong>${summary.overview.skippedTests}</strong></div>
    <div class="metric">Pass Rate: <strong>${summary.overview.passRate}</strong></div>
  </div>
  
  ${summary.coverage ? `
  <h2>Coverage</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Coverage</th>
    </tr>
    <tr><td>Lines</td><td>${summary.coverage.lines}</td></tr>
    <tr><td>Branches</td><td>${summary.coverage.branches}</td></tr>
    <tr><td>Functions</td><td>${summary.coverage.functions}</td></tr>
    <tr><td>Statements</td><td>${summary.coverage.statements}</td></tr>
    <tr><td><strong>Overall</strong></td><td><strong>${summary.coverage.overall}</strong></td></tr>
  </table>
  ` : ''}
  
  ${summary.failedBuilds.length > 0 ? `
  <h2>Failed Builds</h2>
  <table>
    <tr>
      <th>Build ID</th>
      <th>Type</th>
      <th>Error</th>
      <th>Failed Tests</th>
    </tr>
    ${summary.failedBuilds.map(build => `
    <tr>
      <td>${build.buildId}</td>
      <td>${build.buildType}</td>
      <td>${build.error}</td>
      <td>${build.failedTests}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}
</body>
</html>
    `;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(aggregated: AggregatedTestResult): string {
    const summary = this.generateSummaryReport(aggregated);
    
    let markdown = `# ${summary.title}\n\n`;
    markdown += `## Overview\n\n`;
    markdown += `- **Total Builds**: ${summary.overview.totalBuilds}\n`;
    markdown += `- **Total Tests**: ${summary.overview.totalTests}\n`;
    markdown += `- **Passed**: ${summary.overview.passedTests}\n`;
    markdown += `- **Failed**: ${summary.overview.failedTests}\n`;
    markdown += `- **Skipped**: ${summary.overview.skippedTests}\n`;
    markdown += `- **Pass Rate**: ${summary.overview.passRate}\n\n`;
    
    if (summary.coverage) {
      markdown += `## Coverage\n\n`;
      markdown += `| Metric | Coverage |\n`;
      markdown += `|--------|----------|\n`;
      markdown += `| Lines | ${summary.coverage.lines} |\n`;
      markdown += `| Branches | ${summary.coverage.branches} |\n`;
      markdown += `| Functions | ${summary.coverage.functions} |\n`;
      markdown += `| Statements | ${summary.coverage.statements} |\n`;
      markdown += `| **Overall** | **${summary.coverage.overall}** |\n\n`;
    }
    
    if (summary.failedBuilds.length > 0) {
      markdown += `## Failed Builds\n\n`;
      markdown += `| Build ID | Type | Error | Failed Tests |\n`;
      markdown += `|----------|------|-------|-------------|\n`;
      summary.failedBuilds.forEach(build => {
        markdown += `| ${build.buildId} | ${build.buildType} | ${build.error} | ${build.failedTests} |\n`;
      });
    }
    
    return markdown;
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(aggregated: AggregatedTestResult): string {
    const rows: string[] = [];
    
    // Header
    rows.push('Build ID,Build Type,Status,Total Tests,Passed,Failed,Skipped,Duration (ms)');
    
    // Data rows
    for (const build of aggregated.allBuilds) {
      rows.push([
        build.buildId,
        build.buildType,
        build.status,
        build.tests?.total || 0,
        build.tests?.passed || 0,
        build.tests?.failed || 0,
        build.tests?.skipped || 0,
        build.duration || 0
      ].join(','));
    }
    
    return rows.join('\n');
  }
}

// Type definitions

interface AggregationOptions {
  method?: 'hierarchical' | 'flat' | 'grouped';
  aggregateCoverage?: boolean;
  includeArtifacts?: boolean;
  filter?: ResultFilter;
}

interface ResultFilter {
  status?: 'passed' | 'failed' | 'skipped';
  buildType?: 'epic' | 'theme' | 'story';
  minDuration?: number;
}

interface AggregatedTestResult {
  buildId: string;
  buildType: 'epic' | 'theme' | 'story';
  level: number;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  
  // Own results (not from children)
  ownResults?: {
    tests: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
    coverage?: CoverageData;
    errors: Array<{ test: string; error: string; stack?: string }>;
    artifacts?: {
      reports: string[];
      coverage: string[];
      logs: string[];
      other: string[];
    };
  };
  
  // Aggregated totals (including children)
  totalBuilds: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  
  // Aggregated coverage
  aggregatedCoverage?: CoverageData;
  
  // Hierarchical structure
  children: AggregatedTestResult[];
  
  // Flattened views for easy access
  allBuilds: BuildSummary[];
  failedBuilds: BuildSummary[];
  
  // Metadata
  aggregationMethod: 'hierarchical' | 'flat' | 'grouped';
  aggregationTimestamp: Date;
}

interface BuildSummary {
  buildId: string;
  buildType: 'epic' | 'theme' | 'story';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  tests?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  coverage?: CoverageData;
  error?: {
    message: string;
    stack?: string;
    phase?: string;
  };
  path: string[];
}

interface CoverageData {
  lines: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  statements: { total: number; covered: number; percentage: number };
}

interface TestSummaryReport {
  title: string;
  buildType: string;
  timestamp: Date;
  overview: {
    totalBuilds: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    passRate: string;
    status: string;
  };
  coverage?: {
    lines: string;
    branches: string;
    functions: string;
    statements: string;
    overall: string;
  };
  buildBreakdown: BuildBreakdown[];
  failedBuilds: Array<{
    buildId: string;
    buildType: string;
    error: string;
    failedTests: number;
  }>;
  testErrors: TestError[];
  performanceMetrics: {
    totalDuration: number;
    averageBuildDuration: number;
    slowestBuild?: BuildSummary;
    fastestBuild?: BuildSummary;
  };
}

interface BuildBreakdown {
  buildType: string;
  count: number;
  passed: number;
  failed: number;
  skipped: number;
  totalTests: number;
}

interface TestError {
  buildId: string;
  buildType: string;
  test: string;
  error: string;
  stack?: string;
}

export {
  TestResultAggregator,
  AggregationOptions,
  AggregatedTestResult,
  TestSummaryReport
};