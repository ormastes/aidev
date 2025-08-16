import { fileAPI } from '../utils/file-api';
import { execa } from 'execa';
import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';
import { UVEnvironmentManager } from './UVEnvironmentManager';

export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage?: CoverageReport;
  failures?: TestFailure[];
  output: string;
}

export interface TestFailure {
  testName: string;
  fileName: string;
  lineNumber: number;
  errorMessage: string;
  stackTrace: string;
}

export interface CoverageReport {
  totalStatements: number;
  coveredStatements: number;
  totalBranches: number;
  coveredBranches: number;
  totalFunctions: number;
  coveredFunctions: number;
  totalLines: number;
  coveredLines: number;
  percentage: number;
  files: FileCoverage[];
}

export interface FileCoverage {
  path: string;
  statements: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  lines: { total: number; covered: number; percentage: number };
}

export interface TestOptions {
  coverage?: boolean;
  verbose?: boolean;
  watch?: boolean;
  parallel?: boolean;
  markers?: string[];
  patterns?: string[];
  failFast?: boolean;
  maxFail?: number;
  outputFormat?: 'json' | 'junit' | 'html' | "terminal";
}

export class PythonTestRunner {
  private envManager: UVEnvironmentManager;

  constructor(envManager?: UVEnvironmentManager) {
    this.envManager = envManager || new UVEnvironmentManager();
  }

  /**
   * Run tests for a project
   */
  async runTests(projectName: string, projectPath: string, options: TestOptions = {}): Promise<TestResult> {
    console.log(`Running tests for project '${projectName}'...`);
    
    const args = this.buildPytestArgs(projectPath, options);
    
    try {
      const result = await this.envManager.runCommand(projectName, 'pytest', args);
      return this.parseTestOutput(result.stdout, options);
    } catch (error: any) {
      // Pytest exits with non-zero on test failures
      return this.parseTestOutput(error.stdout || error.message, options);
    }
  }

  /**
   * Run tests with coverage
   */
  async runWithCoverage(projectName: string, projectPath: string, options: TestOptions = {}): Promise<TestResult> {
    console.log(`Running tests with coverage for project '${projectName}'...`);
    
    const coverageOptions = { ...options, coverage: true };
    const args = this.buildPytestArgs(projectPath, coverageOptions);
    
    try {
      const result = await this.envManager.runCommand(projectName, 'pytest', args);
      const testResult = this.parseTestOutput(result.stdout, coverageOptions);
      
      // Parse coverage report
      if (await fs.pathExists('.coverage')) {
        testResult.coverage = await this.parseCoverageReport(projectName);
      }
      
      return testResult;
    } catch (error: any) {
      const testResult = this.parseTestOutput(error.stdout || error.message, coverageOptions);
      
      // Try to parse coverage even on test failure
      if (await fs.pathExists('.coverage')) {
        testResult.coverage = await this.parseCoverageReport(projectName);
      }
      
      return testResult;
    }
  }

  /**
   * Run tests in watch mode
   */
  async watchTests(projectName: string, projectPath: string, options: TestOptions = {}): Promise<void> {
    console.log(`Starting test watcher for project '${projectName}'...`);
    
    const watchOptions = { ...options, watch: true };
    const args = this.buildPytestArgs(projectPath, watchOptions);
    
    // pytest-watch needs to be installed
    await this.envManager.installPackages(projectName, ['pytest-watch']);
    
    // Run ptw (pytest-watch) instead of pytest
    const child = await this.envManager.runCommand(projectName, 'ptw', args);
    
    // This will run until interrupted
    console.log('Test watcher started. Press Ctrl+C to stop.');
  }

  /**
   * Run specific test file or directory
   */
  async runSpecificTests(
    projectName: string,
    testPath: string,
    options: TestOptions = {}
  ): Promise<TestResult> {
    console.log(`Running specific tests: ${testPath}`);
    
    const args = this.buildPytestArgs(testPath, options);
    
    try {
      const result = await this.envManager.runCommand(projectName, 'pytest', args);
      return this.parseTestOutput(result.stdout, options);
    } catch (error: any) {
      return this.parseTestOutput(error.stdout || error.message, options);
    }
  }

  /**
   * Run tests with specific markers
   */
  async runMarkedTests(
    projectName: string,
    projectPath: string,
    markers: string[],
    options: TestOptions = {}
  ): Promise<TestResult> {
    console.log(`Running tests with markers: ${markers.join(', ')}`);
    
    const markerOptions = { ...options, markers };
    const args = this.buildPytestArgs(projectPath, markerOptions);
    
    try {
      const result = await this.envManager.runCommand(projectName, 'pytest', args);
      return this.parseTestOutput(result.stdout, markerOptions);
    } catch (error: any) {
      return this.parseTestOutput(error.stdout || error.message, markerOptions);
    }
  }

  /**
   * Generate test report
   */
  async generateReport(
    projectName: string,
    projectPath: string,
    format: 'html' | 'junit' | 'json',
    outputPath: string
  ): Promise<void> {
    console.log(`Generating ${format} test report...`);
    
    const options: TestOptions = { outputFormat: format };
    const args = this.buildPytestArgs(projectPath, options);
    
    // Add output file based on format
    switch (format) {
      case 'html':
        args.push('--html', outputPath, '--self-contained-html');
        await this.envManager.installPackages(projectName, ['pytest-html']);
        break;
      case 'junit':
        args.push('--junit-xml', outputPath);
        break;
      case 'json':
        args.push('--json-report', '--json-report-file', outputPath);
        await this.envManager.installPackages(projectName, ['pytest-json-report']);
        break;
    }
    
    try {
      await this.envManager.runCommand(projectName, 'pytest', args);
    } catch {
      // Tests might fail, but report should still be generated
    }
    
    console.log(`Report generated: ${outputPath}`);
  }

  /**
   * List available tests
   */
  async listTests(projectName: string, projectPath: string): Promise<string[]> {
    console.log('Collecting tests...');
    
    const args = ['--collect-only', '-q', projectPath];
    
    try {
      const result = await this.envManager.runCommand(projectName, 'pytest', args);
      return this.parseCollectedTests(result.stdout);
    } catch (error: any) {
      return this.parseCollectedTests(error.stdout || '');
    }
  }

  /**
   * Check if pytest is installed
   */
  async isPytestInstalled(projectName: string): Promise<boolean> {
    try {
      await this.envManager.runCommand(projectName, 'pytest', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install test dependencies
   */
  async installTestDependencies(projectName: string): Promise<void> {
    console.log('Installing test dependencies...');
    
    const dependencies = [
      'pytest>=7.4.0',
      'pytest-cov>=4.1.0',
      'pytest-xdist>=3.3.0',  // For parallel execution
      'pytest-timeout>=2.1.0', // For test timeouts
      'pytest-mock>=3.11.0',   // For mocking
      'pytest-asyncio>=0.21.0' // For async tests
    ];
    
    await this.envManager.installPackages(projectName, dependencies);
  }

  /**
   * Build pytest arguments
   */
  private buildPytestArgs(testPath: string, options: TestOptions): string[] {
    const args: string[] = [testPath];
    
    if (options.verbose) {
      args.push('-vv');
    } else {
      args.push('-v');
    }
    
    if (options.coverage) {
      args.push('--cov', path.dirname(testPath));
      args.push('--cov-report', 'term-missing');
      args.push('--cov-report', 'json');
    }
    
    if (options.parallel) {
      args.push('-n', 'auto');
    }
    
    if (options.markers && options.markers.length > 0) {
      const markerExpression = options.markers.join(' or ');
      args.push('-m', markerExpression);
    }
    
    if (options.patterns && options.patterns.length > 0) {
      for (const pattern of options.patterns) {
        args.push('-k', pattern);
      }
    }
    
    if (options.failFast) {
      args.push('-x');
    }
    
    if (options.maxFail) {
      args.push('--maxfail', options.maxFail.toString());
    }
    
    // Add color output
    args.push('--color', 'yes');
    
    // Add traceback style
    args.push('--tb', 'short');
    
    return args;
  }

  /**
   * Parse pytest output
   */
  private parseTestOutput(output: string, options: TestOptions): TestResult {
    const result: TestResult = {
      passed: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      output
    };
    
    // Parse summary line (e.g., "===== 5 passed, 2 failed, 1 skipped in 0.42s =====")
    const summaryMatch = output.match(/=+ (.*?) in ([\d.]+)s =+/);
    if (summaryMatch) {
      const summary = summaryMatch[1];
      const duration = parseFloat(summaryMatch[2]);
      result.duration = duration;
      
      // Parse passed
      const passedMatch = summary.match(/(\d+) passed/);
      if (passedMatch) {
        result.passedTests = parseInt(passedMatch[1]);
      }
      
      // Parse failed
      const failedMatch = summary.match(/(\d+) failed/);
      if (failedMatch) {
        result.failedTests = parseInt(failedMatch[1]);
      }
      
      // Parse skipped
      const skippedMatch = summary.match(/(\d+) skipped/);
      if (skippedMatch) {
        result.skippedTests = parseInt(skippedMatch[1]);
      }
      
      result.totalTests = result.passedTests + result.failedTests + result.skippedTests;
      result.passed = result.failedTests === 0;
    }
    
    // Parse failures if present
    if (result.failedTests > 0) {
      result.failures = this.parseFailures(output);
    }
    
    return result;
  }

  /**
   * Parse test failures from output
   */
  private parseFailures(output: string): TestFailure[] {
    const failures: TestFailure[] = [];
    
    // Match FAILED test lines
    const failureMatches = output.matchAll(/FAILED (.*?)::(.+?) - (.+)/g);
    
    for (const match of failureMatches) {
      const [, filePath, testName, errorMessage] = match;
      
      failures.push({
        testName,
        fileName: filePath,
        lineNumber: 0, // Would need more parsing to get exact line
        errorMessage,
        stackTrace: '' // Would need to extract from full output
      });
    }
    
    return failures;
  }

  /**
   * Parse coverage report
   */
  private async parseCoverageReport(projectName: string): Promise<CoverageReport> {
    // Read JSON coverage report
    const coverageJsonPath = 'coverage.json';
    
    if (!await fs.pathExists(coverageJsonPath)) {
      // Generate JSON report
      await this.envManager.runCommand(projectName, "coverage", ['json']);
    }
    
    const coverageData = await fs.readJson(coverageJsonPath);
    
    const report: CoverageReport = {
      totalStatements: 0,
      coveredStatements: 0,
      totalBranches: 0,
      coveredBranches: 0,
      totalFunctions: 0,
      coveredFunctions: 0,
      totalLines: 0,
      coveredLines: 0,
      percentage: 0,
      files: []
    };
    
    // Parse totals
    if (coverageData.totals) {
      const totals = coverageData.totals;
      report.totalStatements = totals.num_statements || 0;
      report.coveredStatements = totals.covered_statements || 0;
      report.totalBranches = totals.num_branches || 0;
      report.coveredBranches = totals.covered_branches || 0;
      report.totalLines = totals.num_statements || 0;
      report.coveredLines = totals.covered_lines || 0;
      report.percentage = totals.percent_covered || 0;
    }
    
    // Parse file coverage
    if (coverageData.files) {
      for (const [filePath, fileData] of Object.entries(coverageData.files)) {
        const fileCoverage: FileCoverage = {
          path: filePath,
          statements: {
            total: fileData.summary?.num_statements || 0,
            covered: fileData.summary?.covered_statements || 0,
            percentage: fileData.summary?.percent_covered || 0
          },
          branches: {
            total: fileData.summary?.num_branches || 0,
            covered: fileData.summary?.covered_branches || 0,
            percentage: fileData.summary?.percent_covered_branches || 0
          },
          functions: {
            total: 0,
            covered: 0,
            percentage: 0
          },
          lines: {
            total: fileData.summary?.num_statements || 0,
            covered: fileData.summary?.covered_lines || 0,
            percentage: fileData.summary?.percent_covered || 0
          }
        };
        
        report.files.push(fileCoverage);
      }
    }
    
    return report;
  }

  /**
   * Parse collected tests
   */
  private parseCollectedTests(output: string): string[] {
    const tests: string[] = [];
    
    // Match test function lines
    const lines = output.split('\n');
    for (const line of lines) {
      // Match lines like "tests/test_main.py::test_example"
      const match = line.match(/^(.+\.py)::(test_\w+)/);
      if (match) {
        tests.push(`${match[1]}::${match[2]}`);
      }
    }
    
    return tests;
  }
}