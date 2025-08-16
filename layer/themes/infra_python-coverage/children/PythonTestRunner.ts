import { fileAPI } from '../utils/file-api';
/**
 * Run Python tests with coverage analysis
 */

import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';
import { spawn, execSync } from 'child_process';
import {
  CoverageResult,
  TestRunOptions,
  PythonEnvironment,
  CoverageSession,
  CoverageConfig
} from '../pipe/types';

export class PythonTestRunner {
  private config: CoverageConfig;
  private pythonPath: string;
  private sessions: Map<string, CoverageSession>;
  private watchIntervals: Map<string, NodeJS.Timeout>;

  constructor(config?: CoverageConfig) {
    this.config = config || {};
    this.pythonPath = this.config.pythonPath || 'python';
    this.sessions = new Map();
    this.watchIntervals = new Map();
  }

  /**
   * Run tests with coverage
   */
  async runWithCoverage(
    testPath: string,
    sourcePath: string,
    options?: Partial<TestRunOptions>
  ): Promise<CoverageResult> {
    const sessionId = this.generateSessionId();
    const session: CoverageSession = {
      id: sessionId,
      startTime: new Date(),
      status: 'running',
      command: '',
      environment: await this.getPythonEnvironment()
    };

    this.sessions.set(sessionId, session);

    try {
      // Prepare coverage command
      const coverageFile = path.join(process.cwd(), `.coverage.${sessionId}`);
      const outputDir = options?.outputDir || path.join(process.cwd(), 'htmlcov');
      const format = options?.format || 'json';

      // Build coverage command
      const commands: string[] = [];
      
      // Run tests with coverage
      let testCommand = `coverage run --data-file=${coverageFile}`;
      
      if (options?.branch) {
        testCommand += ' --branch';
      }
      
      if (options?.parallel) {
        testCommand += ' --parallel-mode';
      }
      
      if (this.config.omitPatterns && this.config.omitPatterns.length > 0) {
        testCommand += ` --omit="${this.config.omitPatterns.join(',')}"`;
      }
      
      testCommand += ` -m pytest ${testPath}`;
      
      if (options?.markers && options.markers.length > 0) {
        testCommand += ` -m "${options.markers.join(' or ')}"`;
      }
      
      if (options?.verbose) {
        testCommand += ' -v';
      }
      
      commands.push(testCommand);
      
      // Combine if parallel
      if (options?.parallel) {
        commands.push(`coverage combine --data-file=${coverageFile}`);
      }
      
      // Generate report
      if (format === 'json') {
        commands.push(`coverage json --data-file=${coverageFile} -o coverage_${sessionId}.json`);
      } else if (format === 'xml') {
        commands.push(`coverage xml --data-file=${coverageFile} -o coverage_${sessionId}.xml`);
      } else if (format === 'html') {
        commands.push(`coverage html --data-file=${coverageFile} -d ${outputDir}`);
      }

      session.command = commands.join(' && ');

      // Execute commands
      const startTime = Date.now();
      
      for (const command of commands) {
        try {
          execSync(command, {
            encoding: 'utf-8',
            stdio: options?.verbose ? 'inherit' : 'pipe',
            cwd: process.cwd()
          });
        } catch (error: any) {
          // Coverage might still generate reports even if tests fail
          if (!command.includes("coverage") || !fs.existsSync(`coverage_${sessionId}.json`)) {
            throw error;
          }
        }
      }

      const endTime = Date.now();
      const testDuration = (endTime - startTime) / 1000;

      // Read coverage results
      const resultFile = `coverage_${sessionId}.${format}`;
      let coverageData: any;

      if (format === 'json') {
        coverageData = await fs.readJson(resultFile);
      } else {
        // For XML or HTML, try to get JSON data as well
        try {
          execSync(`coverage json --data-file=${coverageFile} -o ${resultFile}.json`, {
            encoding: 'utf-8',
            stdio: 'pipe'
          });
          coverageData = await fs.readJson(`${resultFile}.json`);
        } catch {
          coverageData = {};
        }
      }

      // Parse results
      const result = this.parseCoverageResults(coverageData, sourcePath, testDuration);
      
      session.endTime = new Date();
      session.status = "completed";
      session.result = result;

      // Cleanup temp files
      await this.cleanup(sessionId);

      return result;

    } catch (error: any) {
      session.endTime = new Date();
      session.status = 'failed';
      session.error = error.message;
      
      throw new Error(`Test execution failed: ${error.message}`);
    }
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
    const watchId = `watch_${Date.now()}`;
    
    const runTests = async () => {
      try {
        const result = await this.runWithCoverage(testPath, sourcePath, {
          branch: true,
          format: 'json'
        });
        
        if (callback) {
          callback(result);
        }
        
        console.log(`Coverage: ${result.lineCoverage.toFixed(1)}% (${new Date().toLocaleTimeString()})`);
      } catch (error: any) {
        console.error(`Watch error: ${error.message}`);
      }
    };

    // Initial run
    await runTests();

    // Set up interval
    const intervalId = setInterval(runTests, interval);
    this.watchIntervals.set(watchId, intervalId);

    // Handle process termination
    process.on('SIGINT', () => {
      this.stopWatch(watchId);
      process.exit(0);
    });
  }

  /**
   * Stop watching
   */
  stopWatch(watchId: string): void {
    const interval = this.watchIntervals.get(watchId);
    if (interval) {
      clearInterval(interval);
      this.watchIntervals.delete(watchId);
    }
  }

  /**
   * Get Python environment information
   */
  private async getPythonEnvironment(): Promise<PythonEnvironment> {
    try {
      const pythonVersion = execSync(`${this.pythonPath} --version`, { encoding: 'utf-8' }).trim();
      const pipVersion = execSync(`${this.pythonPath} -m pip --version`, { encoding: 'utf-8' }).split(' ')[1];
      const coverageVersion = execSync(`${this.pythonPath} -m coverage --version`, { encoding: 'utf-8' }).split(' ')[2];
      
      let pytestVersion: string | undefined;
      try {
        pytestVersion = execSync(`${this.pythonPath} -m pytest --version`, { encoding: 'utf-8' }).split(' ')[1];
      } catch {
        // pytest might not be installed
      }

      let uvVersion: string | undefined;
      if (this.config.uvPath) {
        try {
          uvVersion = execSync(`${this.config.uvPath} --version`, { encoding: 'utf-8' }).trim();
        } catch {
          // uv might not be installed
        }
      }

      const packages = execSync(`${this.pythonPath} -m pip list --format=json`, { encoding: 'utf-8' });
      const installedPackages = JSON.parse(packages).map((pkg: any) => `${pkg.name}==${pkg.version}`);

      return {
        pythonVersion,
        pipVersion,
        uvVersion,
        coverageVersion,
        pytestVersion,
        installedPackages
      };
    } catch (error) {
      return {
        pythonVersion: 'unknown',
        coverageVersion: 'unknown',
        installedPackages: []
      };
    }
  }

  /**
   * Parse coverage results
   */
  private parseCoverageResults(
    coverageData: any,
    sourcePath: string,
    testDuration: number
  ): CoverageResult {
    const files = coverageData.files || {};
    const filesCoverage: any[] = [];
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const [filePath, fileData] of Object.entries(files)) {
      // Only include files from source path
      if (!filePath.startsWith(sourcePath) && sourcePath !== '.') {
        continue;
      }

      const fd = fileData as any;
      const summary = fd.summary || {};
      
      const fileCoverage = {
        path: filePath,
        lineCoverage: summary.percent_covered || 0,
        branchCoverage: summary.percent_covered_branches || 100,
        totalLines: summary.num_statements || 0,
        coveredLines: summary.covered_lines || Math.floor((summary.percent_covered || 0) * (summary.num_statements || 0) / 100),
        totalBranches: summary.num_branches || 0,
        coveredBranches: summary.covered_branches || Math.floor((summary.percent_covered_branches || 0) * (summary.num_branches || 0) / 100),
        uncoveredLines: fd.missing_lines || []
      };

      filesCoverage.push(fileCoverage);
      totalLines += fileCoverage.totalLines;
      coveredLines += fileCoverage.coveredLines;
      totalBranches += fileCoverage.totalBranches;
      coveredBranches += fileCoverage.coveredBranches;
    }

    const uncoveredLines = new Map<string, number[]>();
    filesCoverage.forEach(fc => {
      if (fc.uncoveredLines.length > 0) {
        uncoveredLines.set(fc.path, fc.uncoveredLines);
      }
    });

    return {
      lineCoverage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      branchCoverage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
      classCoverage: 0, // Will be calculated separately if needed
      methodCoverage: 0, // Will be calculated separately if needed
      totalLines,
      coveredLines,
      totalBranches,
      coveredBranches,
      uncoveredLines,
      files: filesCoverage,
      timestamp: new Date(),
      testDuration
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(sessionId: string): Promise<void> {
    const filesToClean = [
      `.coverage.${sessionId}`,
      `coverage_${sessionId}.json`,
      `coverage_${sessionId}.xml`,
      `coverage_${sessionId}.json.json` // Double extension from fallback
    ];

    for (const file of filesToClean) {
      try {
        await fs.remove(file);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): CoverageSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): CoverageSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear completed sessions
   */
  clearCompletedSessions(): void {
    for (const [id, session] of this.sessions) {
      if (session.status === "completed" || session.status === 'failed') {
        this.sessions.delete(id);
      }
    }
  }
}