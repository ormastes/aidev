/**
 * Enforce coverage thresholds and quality gates
 */

import * as fs from 'fs-extra';
import {
  CoverageConfig,
  CoverageThresholds,
  EnforcementResult,
  ThresholdViolation,
  CoverageResult
} from '../pipe/types';

export class CoverageEnforcer {
  private config: CoverageConfig;
  private thresholds: CoverageThresholds;

  constructor(config?: CoverageConfig) {
    this.config = config || {};
    this.thresholds = config?.thresholds || {
      line: 80,
      branch: 70,
      class: 80,
      method: 80,
      function: 80
    };
  }

  /**
   * Set coverage thresholds
   */
  setThresholds(thresholds: CoverageThresholds): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Check coverage against thresholds
   */
  async checkCoverage(coverageFile: string): Promise<EnforcementResult> {
    const coverageData = await fs.readJson(coverageFile);
    const result = this.parseCoverageResult(coverageData);
    
    const violations: ThresholdViolation[] = [];
    const actualCoverage: CoverageThresholds = {
      line: result.lineCoverage,
      branch: result.branchCoverage,
      class: result.classCoverage,
      method: result.methodCoverage,
      function: result.methodCoverage // Using method as function proxy
    };

    // Check line coverage
    if (this.thresholds.line && result.lineCoverage < this.thresholds.line) {
      violations.push({
        type: 'line',
        required: this.thresholds.line,
        actual: result.lineCoverage,
        difference: this.thresholds.line - result.lineCoverage,
        files: this.findLowCoverageFiles(result, 'line', this.thresholds.line)
      });
    }

    // Check branch coverage
    if (this.thresholds.branch && result.branchCoverage < this.thresholds.branch) {
      violations.push({
        type: 'branch',
        required: this.thresholds.branch,
        actual: result.branchCoverage,
        difference: this.thresholds.branch - result.branchCoverage,
        files: this.findLowCoverageFiles(result, 'branch', this.thresholds.branch)
      });
    }

    // Check class coverage
    if (this.thresholds.class && result.classCoverage < this.thresholds.class) {
      violations.push({
        type: 'class',
        required: this.thresholds.class,
        actual: result.classCoverage,
        difference: this.thresholds.class - result.classCoverage
      });
    }

    // Check method coverage
    if (this.thresholds.method && result.methodCoverage < this.thresholds.method) {
      violations.push({
        type: 'method',
        required: this.thresholds.method,
        actual: result.methodCoverage,
        difference: this.thresholds.method - result.methodCoverage
      });
    }

    const passed = violations.length === 0;
    const message = passed
      ? 'All coverage thresholds met'
      : `Coverage thresholds not met: ${violations.length} violation(s)`;

    return {
      passed,
      violations,
      actualCoverage,
      requiredCoverage: this.thresholds,
      message
    };
  }

  /**
   * Check if coverage has decreased from baseline
   */
  async checkRegression(
    currentFile: string,
    baselineFile: string,
    tolerance: number = 0.5
  ): Promise<EnforcementResult> {
    const current = await fs.readJson(currentFile);
    const baseline = await fs.readJson(baselineFile);
    
    const currentResult = this.parseCoverageResult(current);
    const baselineResult = this.parseCoverageResult(baseline);
    
    const violations: ThresholdViolation[] = [];

    // Check for line coverage regression
    if (currentResult.lineCoverage < baselineResult.lineCoverage - tolerance) {
      violations.push({
        type: 'line',
        required: baselineResult.lineCoverage,
        actual: currentResult.lineCoverage,
        difference: baselineResult.lineCoverage - currentResult.lineCoverage,
        files: this.findRegressedFiles(currentResult, baselineResult, 'line')
      });
    }

    // Check for branch coverage regression
    if (currentResult.branchCoverage < baselineResult.branchCoverage - tolerance) {
      violations.push({
        type: 'branch',
        required: baselineResult.branchCoverage,
        actual: currentResult.branchCoverage,
        difference: baselineResult.branchCoverage - currentResult.branchCoverage,
        files: this.findRegressedFiles(currentResult, baselineResult, 'branch')
      });
    }

    const passed = violations.length === 0;
    const message = passed
      ? 'No coverage regression detected'
      : `Coverage regression detected: ${violations.length} metric(s) decreased`;

    return {
      passed,
      violations,
      actualCoverage: {
        line: currentResult.lineCoverage,
        branch: currentResult.branchCoverage,
        class: currentResult.classCoverage,
        method: currentResult.methodCoverage
      },
      requiredCoverage: {
        line: baselineResult.lineCoverage,
        branch: baselineResult.branchCoverage,
        class: baselineResult.classCoverage,
        method: baselineResult.methodCoverage
      },
      message
    };
  }

  /**
   * Generate enforcement report
   */
  async generateReport(
    result: EnforcementResult,
    format: 'console' | 'json' | 'markdown' = 'console'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      
      case 'markdown':
        return this.generateMarkdownReport(result);
      
      case 'console':
      default:
        return this.generateConsoleReport(result);
    }
  }

  /**
   * Parse coverage data into CoverageResult
   */
  private parseCoverageResult(data: any): CoverageResult {
    const files = data.files || {};
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const fileData of Object.values(files)) {
      const fd = fileData as any;
      const summary = fd.summary || {};
      
      totalLines += summary.num_statements || 0;
      coveredLines += summary.covered_lines || 0;
      totalBranches += summary.num_branches || 0;
      coveredBranches += summary.covered_branches || 0;
    }

    return {
      lineCoverage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      branchCoverage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
      classCoverage: data.totals?.class_coverage || 0,
      methodCoverage: data.totals?.method_coverage || 0,
      totalLines,
      coveredLines,
      totalBranches,
      coveredBranches,
      uncoveredLines: new Map(),
      files: [],
      timestamp: new Date(),
      testDuration: 0
    };
  }

  /**
   * Find files with low coverage
   */
  private findLowCoverageFiles(
    result: CoverageResult,
    type: 'line' | 'branch',
    threshold: number
  ): string[] {
    const lowCoverageFiles: string[] = [];
    
    for (const file of result.files) {
      const coverage = type === 'line' ? file.lineCoverage : file.branchCoverage;
      if (coverage < threshold) {
        lowCoverageFiles.push(file.path);
      }
    }
    
    return lowCoverageFiles;
  }

  /**
   * Find files with regressed coverage
   */
  private findRegressedFiles(
    current: CoverageResult,
    baseline: CoverageResult,
    type: 'line' | 'branch'
  ): string[] {
    const regressedFiles: string[] = [];
    
    for (const currentFile of current.files) {
      const baselineFile = baseline.files.find(f => f.path === currentFile.path);
      
      if (baselineFile) {
        const currentCoverage = type === 'line' 
          ? currentFile.lineCoverage 
          : currentFile.branchCoverage;
        const baselineCoverage = type === 'line'
          ? baselineFile.lineCoverage
          : baselineFile.branchCoverage;
        
        if (currentCoverage < baselineCoverage) {
          regressedFiles.push(currentFile.path);
        }
      }
    }
    
    return regressedFiles;
  }

  /**
   * Generate console report
   */
  private generateConsoleReport(result: EnforcementResult): string {
    const lines: string[] = [];
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    
    lines.push(`Coverage Enforcement: ${status}`);
    lines.push('=' .repeat(50));
    lines.push('');
    
    lines.push('Actual Coverage:');
    if (result.actualCoverage.line !== undefined) {
      lines.push(`  Line:     ${result.actualCoverage.line.toFixed(2)}%`);
    }
    if (result.actualCoverage.branch !== undefined) {
      lines.push(`  Branch:   ${result.actualCoverage.branch.toFixed(2)}%`);
    }
    if (result.actualCoverage.class !== undefined) {
      lines.push(`  Class:    ${result.actualCoverage.class.toFixed(2)}%`);
    }
    if (result.actualCoverage.method !== undefined) {
      lines.push(`  Method:   ${result.actualCoverage.method.toFixed(2)}%`);
    }
    
    lines.push('');
    lines.push('Required Coverage:');
    if (result.requiredCoverage.line !== undefined) {
      lines.push(`  Line:     ${result.requiredCoverage.line.toFixed(2)}%`);
    }
    if (result.requiredCoverage.branch !== undefined) {
      lines.push(`  Branch:   ${result.requiredCoverage.branch.toFixed(2)}%`);
    }
    if (result.requiredCoverage.class !== undefined) {
      lines.push(`  Class:    ${result.requiredCoverage.class.toFixed(2)}%`);
    }
    if (result.requiredCoverage.method !== undefined) {
      lines.push(`  Method:   ${result.requiredCoverage.method.toFixed(2)}%`);
    }
    
    if (result.violations.length > 0) {
      lines.push('');
      lines.push('Violations:');
      for (const violation of result.violations) {
        lines.push(`  - ${violation.type}: ${violation.actual.toFixed(2)}% < ${violation.required.toFixed(2)}% (diff: -${violation.difference.toFixed(2)}%)`);
        if (violation.files && violation.files.length > 0) {
          lines.push(`    Files: ${violation.files.slice(0, 3).join(', ')}${violation.files.length > 3 ? '...' : ''}`);
        }
      }
    }
    
    lines.push('');
    lines.push(result.message);
    
    return lines.join('\n');
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(result: EnforcementResult): string {
    const lines: string[] = [];
    const status = result.passed ? '✅ **PASSED**' : '❌ **FAILED**';
    
    lines.push('# Coverage Enforcement Report');
    lines.push('');
    lines.push(`Status: ${status}`);
    lines.push('');
    
    lines.push('## Coverage Summary');
    lines.push('');
    lines.push('| Metric | Actual | Required | Status |');
    lines.push('|--------|--------|----------|--------|');
    
    const metrics = ['line', 'branch', 'class', 'method'] as const;
    for (const metric of metrics) {
      const actual = result.actualCoverage[metric];
      const required = result.requiredCoverage[metric];
      
      if (actual !== undefined && required !== undefined) {
        const status = actual >= required ? '✅' : '❌';
        lines.push(`| ${metric.charAt(0).toUpperCase() + metric.slice(1)} | ${actual.toFixed(2)}% | ${required.toFixed(2)}% | ${status} |`);
      }
    }
    
    if (result.violations.length > 0) {
      lines.push('');
      lines.push('## Violations');
      lines.push('');
      
      for (const violation of result.violations) {
        lines.push(`### ${violation.type.charAt(0).toUpperCase() + violation.type.slice(1)} Coverage`);
        lines.push('');
        lines.push(`- **Required**: ${violation.required.toFixed(2)}%`);
        lines.push(`- **Actual**: ${violation.actual.toFixed(2)}%`);
        lines.push(`- **Difference**: -${violation.difference.toFixed(2)}%`);
        
        if (violation.files && violation.files.length > 0) {
          lines.push('');
          lines.push('**Affected Files:**');
          for (const file of violation.files.slice(0, 10)) {
            lines.push(`- \`${file}\``);
          }
          if (violation.files.length > 10) {
            lines.push(`- ... and ${violation.files.length - 10} more`);
          }
        }
        lines.push('');
      }
    }
    
    lines.push('---');
    lines.push('');
    lines.push(`*${result.message}*`);
    
    return lines.join('\n');
  }
}