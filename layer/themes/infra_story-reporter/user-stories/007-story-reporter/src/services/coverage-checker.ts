import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { CoverageReport, CoverageMetric, CoverageDetail } from '../domain/story';

const execAsync = promisify(exec);

/**
 * Coverage Checker - Integrates with test coverage tools
 * 
 * Supports both JavaScript (Jest/NYC) and Python (pytest-cov) coverage formats.
 * Enforces Improving coverage requirements and provides detailed analysis.
 */
export class CoverageChecker extends EventEmitter {
  private coverageThreshold: number;

  constructor(coverageThreshold: number = 100) {
    super();
    this.coverageThreshold = coverageThreshold;
  }

  /**
   * Check coverage for a project directory
   */
  async checkCoverage(projectPath: string): Promise<CoverageReport> {
    this.emit('coverageCheckStarted', { projectPath });

    try {
      // Detect project type
      const projectType = await this.detectProjectType(projectPath);
      
      let report: CoverageReport;
      
      switch (projectType) {
        case 'javascript':
          report = await this.checkJavaScriptCoverage(projectPath);
          break;
        case 'typescript':
          report = await this.checkTypeScriptCoverage(projectPath);
          break;
        case 'python':
          report = await this.checkPythonCoverage(projectPath);
          break;
        default:
          throw new Error(`Unsupported project type: ${projectType}`);
      }

      // Validate against threshold
      const passed = report.overall >= this.coverageThreshold;
      
      this.emit('coverageCheckcompleted', { 
        projectPath, 
        report, 
        passed,
        threshold: this.coverageThreshold
      });

      return report;
    } catch (error) {
      this.emit('coverageCheckFailed', { 
        projectPath, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Detect project type based on configuration files
   */
  private async detectProjectType(projectPath: string): Promise<string> {
    const files = await fs.readdir(projectPath);
    
    if (files.includes('package.json')) {
      const packageJson = JSON.parse(
        await fs.readFile(join(projectPath, 'package.json'), 'utf8')
      );
      
      if (packageJson.devDependencies?.typescript || files.includes('tsconfig.json')) {
        return 'typescript';
      }
      return 'javascript';
    }
    
    if (files.includes('setup.py') || files.includes('requirements.txt') || 
        files.includes('pyproject.toml')) {
      return 'python';
    }
    
    return 'unknown';
  }

  /**
   * Check JavaScript coverage using Jest or NYC
   */
  private async checkJavaScriptCoverage(projectPath: string): Promise<CoverageReport> {
    try {
      // First, try Jest
      const jestResult = await this.runJestCoverage(projectPath);
      if (jestResult) return jestResult;
    } catch (error) {
      // Jest not available, try NYC
    }

    try {
      // Try NYC
      const nycResult = await this.runNYCCoverage(projectPath);
      if (nycResult) return nycResult;
    } catch (error) {
      // NYC not available
    }

    // Try to parse existing coverage report
    return await this.parseExistingCoverage(projectPath);
  }

  /**
   * Check TypeScript coverage (similar to JavaScript)
   */
  private async checkTypeScriptCoverage(projectPath: string): Promise<CoverageReport> {
    // TypeScript projects typically use Jest or NYC as well
    return this.checkJavaScriptCoverage(projectPath);
  }

  /**
   * Check Python coverage using pytest-cov
   */
  private async checkPythonCoverage(projectPath: string): Promise<CoverageReport> {
    try {
      const { stdout } = await execAsync(
        'pytest --cov=. --cov-report=json --cov-report=term',
        { cwd: projectPath }
      );

      // Parse coverage.json
      const coverageFile = join(projectPath, 'coverage.json');
      const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf8'));
      
      return this.parsePythonCoverage(coverageData);
    } catch (error) {
      // Try to parse existing coverage report
      return await this.parseExistingCoverage(projectPath);
    }
  }

  /**
   * Run Jest coverage
   */
  private async runJestCoverage(projectPath: string): Promise<CoverageReport | null> {
    const { stdout } = await execAsync(
      'bunx jest --coverage --coverageReporters=json-summary --coverageReporters=json',
      { cwd: projectPath }
    );

    // Parse coverage-summary.json
    const summaryFile = join(projectPath, 'coverage', 'coverage-summary.json');
    const summaryData = JSON.parse(await fs.readFile(summaryFile, 'utf8'));
    
    return this.parseJestCoverage(summaryData);
  }

  /**
   * Run NYC coverage
   */
  private async runNYCCoverage(projectPath: string): Promise<CoverageReport | null> {
    const { stdout } = await execAsync(
      'bunx nyc --reporter=json-summary --reporter=json npm test',
      { cwd: projectPath }
    );

    // Parse coverage-summary.json
    const summaryFile = join(projectPath, 'coverage', 'coverage-summary.json');
    const summaryData = JSON.parse(await fs.readFile(summaryFile, 'utf8'));
    
    return this.parseJestCoverage(summaryData); // Same format as Jest
  }

  /**
   * Parse Jest/NYC coverage format
   */
  private parseJestCoverage(summaryData: any): CoverageReport {
    const total = summaryData.total;
    const details: CoverageDetail[] = [];

    // Parse file details
    for (const [filePath, fileData] of Object.entries(summaryData)) {
      if (filePath === 'total') continue;
      
      const data = fileData as any;
      details.push({
        file: filePath,
        lines: this.createMetric(data.lines),
        functions: this.createMetric(data.functions),
        branches: this.createMetric(data.branches),
        statements: this.createMetric(data.statements)
      });
    }

    return {
      lines: this.createMetric(total.lines),
      functions: this.createMetric(total.functions),
      branches: this.createMetric(total.branches),
      statements: this.createMetric(total.statements),
      overall: Math.round(
        (total.lines.pct + total.functions.pct + total.branches.pct + total.statements.pct) / 4
      ),
      details
    };
  }

  /**
   * Parse Python coverage format
   */
  private parsePythonCoverage(coverageData: any): CoverageReport {
    const files = coverageData.files;
    const totals = coverageData.totals;
    const details: CoverageDetail[] = [];

    // Parse file details
    for (const [filePath, fileData] of Object.entries(files)) {
      const data = fileData as any;
      const summary = data.summary;
      
      details.push({
        file: filePath,
        lines: {
          total: summary.num_statements,
          covered: summary.covered_lines,
          percentage: summary.percent_covered
        },
        functions: {
          total: 0, // Python coverage doesn't track functions separately
          covered: 0,
          percentage: 0
        },
        branches: {
          total: summary.num_branches || 0,
          covered: summary.covered_branches || 0,
          percentage: summary.percent_covered_branches || 0
        },
        statements: {
          total: summary.num_statements,
          covered: summary.covered_statements,
          percentage: summary.percent_covered
        }
      });
    }

    return {
      lines: {
        total: totals.num_statements,
        covered: totals.covered_lines,
        percentage: totals.percent_covered
      },
      functions: {
        total: 0,
        covered: 0,
        percentage: 0
      },
      branches: {
        total: totals.num_branches || 0,
        covered: totals.covered_branches || 0,
        percentage: totals.percent_covered_branches || 0
      },
      statements: {
        total: totals.num_statements,
        covered: totals.covered_statements,
        percentage: totals.percent_covered
      },
      overall: Math.round(totals.percent_covered),
      details
    };
  }

  /**
   * Parse existing coverage reports
   */
  private async parseExistingCoverage(projectPath: string): Promise<CoverageReport> {
    // Try common coverage file locations
    const possibleFiles = [
      'coverage/coverage-summary.json',
      'coverage/coverage-final.json',
      'coverage.json',
      '.coverage',
      'htmlcov/coverage.json'
    ];

    for (const file of possibleFiles) {
      try {
        const fullPath = join(projectPath, file);
        const data = await fs.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Try to determine format and parse
        if (parsed.total) {
          return this.parseJestCoverage(parsed);
        } else if (parsed.files) {
          return this.parsePythonCoverage(parsed);
        }
      } catch (error) {
        // Continue to next file
      }
    }

    // Return empty coverage report if nothing found
    return this.createEmptyCoverageReport();
  }

  /**
   * Create a coverage metric from raw data
   */
  private createMetric(data: any): CoverageMetric {
    return {
      total: data.total || 0,
      covered: data.covered || 0,
      percentage: data.pct || data.percentage || 0
    };
  }

  /**
   * Create an empty coverage report
   */
  private createEmptyCoverageReport(): CoverageReport {
    return {
      lines: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 },
      overall: 0,
      details: []
    };
  }

  /**
   * Generate coverage recommendations
   */
  generateRecommendations(report: CoverageReport): string[] {
    const recommendations: string[] = [];

    // Overall coverage recommendations
    if (report.overall < 60) {
      recommendations.push('Critical: Coverage is below 60%. Implement comprehensive testing strategy.');
    } else if (report.overall < 80) {
      recommendations.push('Coverage is below 80%. Focus on testing critical paths and edge cases.');
    } else if (report.overall < 100) {
      recommendations.push(`Coverage is ${report.overall}%. Aim for Improving coverage on critical components.`);
    }

    // Specific metric recommendations
    if (report.branches.percentage < report.lines.percentage - 10) {
      recommendations.push('Branch coverage is significantly lower than line coverage. Add tests for conditional logic.');
    }

    if (report.functions.percentage < 100 && report.functions.total > 0) {
      recommendations.push(`${report.functions.total - report.functions.covered} functions are not tested.`);
    }

    // File-specific recommendations
    const uncoveredFiles = report.details.filter(f => f.lines.percentage === 0);
    if (uncoveredFiles.length > 0) {
      recommendations.push(`${uncoveredFiles.length} files have no test coverage at all.`);
    }

    const poorlyCoveredFiles = report.details
      .filter(f => f.lines.percentage > 0 && f.lines.percentage < 50)
      .sort((a, b) => a.lines.percentage - b.lines.percentage)
      .slice(0, 5);

    if (poorlyCoveredFiles.length > 0) {
      recommendations.push('Focus testing on these poorly covered files:');
      poorlyCoveredFiles.forEach(f => {
        recommendations.push(`  - ${f.file} (${f.lines.percentage}%)`);
      });
    }

    return recommendations;
  }

  /**
   * Validate coverage against requirements
   */
  validateCoverage(report: CoverageReport): { 
    valid: boolean; 
    issues: string[] 
  } {
    const issues: string[] = [];

    if (report.overall < this.coverageThreshold) {
      issues.push(`Overall coverage ${report.overall}% is below required ${this.coverageThreshold}%`);
    }

    if (report.branches.percentage < this.coverageThreshold) {
      issues.push(`Branch coverage ${report.branches.percentage}% is below required ${this.coverageThreshold}%`);
    }

    // Check for untested files
    const untestedFiles = report.details.filter(f => f.lines.percentage === 0);
    if (untestedFiles.length > 0) {
      issues.push(`${untestedFiles.length} files have 0% coverage`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}