import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { spawn, ChildProcess } from 'child_process';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import {
  HierarchicalBuildConfig,
  HierarchicalBuildResult,
  validateHierarchicalBuildConfig
} from '../domain/hierarchical-build-config';

/**
 * Distributed Build Executor
 * 
 * Executes builds for child themes/epics in isolation while
 * maintaining result aggregation and coordination.
 */
export class DistributedBuildExecutor extends EventEmitter {
  private activeBuilds: Map<string, ChildProcess> = new Map();
  private buildResults: Map<string, HierarchicalBuildResult> = new Map();
  private cancelled: boolean = false;

  constructor() {
    super();
  }

  /**
   * Execute a hierarchical build configuration
   */
  async executeBuild(config: HierarchicalBuildConfig): Promise<HierarchicalBuildResult> {
    validateHierarchicalBuildConfig(config);
    
    this.cancelled = false;
    const result = await this.executeHierarchicalBuild(config);
    
    // Aggregate results from children if configured
    if (config.aggregation?.aggregateTests || config.aggregation?.aggregateCoverage) {
      this.aggregateChildResults(result);
    }
    
    return result;
  }

  /**
   * Execute a hierarchical build and its children
   */
  private async executeHierarchicalBuild(
    config: HierarchicalBuildConfig
  ): Promise<HierarchicalBuildResult> {
    const startTime = new Date();
    
    const result: HierarchicalBuildResult = {
      buildId: config.testSuiteId,
      buildType: config.buildType,
      status: 'running',
      startTime,
      children: []
    };
    
    this.buildResults.set(config.testSuiteId, result);
    
    this.emit('buildStart', {
      buildId: config.testSuiteId,
      buildType: config.buildType,
      parentId: config.parentId,
      timestamp: startTime
    });
    
    try {
      // Execute pre-build setup if needed
      if (config.buildSettings?.buildCommand) {
        await this.executeBuildCommand(config, result);
      }
      
      // Execute children based on execution order
      if (config.children.length > 0) {
        result.children = await this.executeChildBuilds(config);
      }
      
      // Execute tests for this build
      if (config.buildSettings?.testCommand) {
        await this.executeTestCommand(config, result);
      }
      
      // Collect artifacts
      if (config.buildSettings?.artifacts) {
        await this.collectArtifacts(config, result);
      }
      
      // Determine final status based on children and own results
      result.status = this.determineBuildStatus(result, config);
      
    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        phase: 'build'
      };
      
      this.emit('buildError', {
        buildId: config.testSuiteId,
        error: result.error,
        timestamp: new Date()
      });
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
      
      this.emit('buildComplete', {
        buildId: config.testSuiteId,
        status: result.status,
        duration: result.duration,
        timestamp: result.endTime
      });
    }
    
    return result;
  }

  /**
   * Execute child builds with parallelization support
   */
  private async executeChildBuilds(
    config: HierarchicalBuildConfig
  ): Promise<HierarchicalBuildResult[]> {
    const { maxParallelChildren = 4, parallelizable = true } = config.executionOrder || {};
    
    if (!parallelizable || maxParallelChildren === 1) {
      // Execute sequentially
      const results: HierarchicalBuildResult[] = [];
      for (const child of config.children) {
        if (this.cancelled) break;
        results.push(await this.executeHierarchicalBuild(child));
      }
      return results;
    }
    
    // Execute in parallel with limit
    const results: HierarchicalBuildResult[] = [];
    const queue = [...config.children];
    const inProgress = new Set<Promise<HierarchicalBuildResult>>();
    
    while (queue.length > 0 || inProgress.size > 0) {
      if (this.cancelled) break;
      
      // Start new builds up to the limit
      while (queue.length > 0 && inProgress.size < maxParallelChildren) {
        const child = queue.shift()!;
        const promise = this.executeHierarchicalBuild(child);
        inProgress.add(promise);
        
        promise.then(result => {
          results.push(result);
          inProgress.delete(promise);
        }).catch(error => {
          // Error is handled in executeHierarchicalBuild
          inProgress.delete(promise);
        });
      }
      
      // Wait for at least one to complete
      if (inProgress.size > 0) {
        await Promise.race(inProgress);
      }
    }
    
    // Wait for all remaining builds
    await Promise.all(inProgress);
    
    return results;
  }

  /**
   * Execute build command
   */
  private async executeBuildCommand(
    config: HierarchicalBuildConfig,
    result: HierarchicalBuildResult
  ): Promise<void> {
    const { buildCommand, workingDirectory = './', env = {} } = config.buildSettings!;
    
    this.emit('commandStart', {
      buildId: config.testSuiteId,
      command: buildCommand,
      type: 'build',
      timestamp: new Date()
    });
    
    await this.executeCommand(
      buildCommand!,
      workingDirectory,
      { ...process.env, ...env },
      config.testSuiteId,
      'build'
    );
    
    this.emit('commandComplete', {
      buildId: config.testSuiteId,
      command: buildCommand,
      type: 'build',
      timestamp: new Date()
    });
  }

  /**
   * Execute test command
   */
  private async executeTestCommand(
    config: HierarchicalBuildConfig,
    result: HierarchicalBuildResult
  ): Promise<void> {
    const { testCommand, workingDirectory = './', env = {} } = config.buildSettings!;
    
    this.emit('commandStart', {
      buildId: config.testSuiteId,
      command: testCommand,
      type: 'test',
      timestamp: new Date()
    });
    
    const output = await this.executeCommand(
      testCommand!,
      workingDirectory,
      { ...process.env, ...env },
      config.testSuiteId,
      'test'
    );
    
    // Parse test results from output
    result.testResults = this.parseTestResults(output);
    
    // Parse coverage if available
    result.coverage = this.parseCoverageResults(workingDirectory);
    
    this.emit('commandComplete', {
      buildId: config.testSuiteId,
      command: testCommand,
      type: 'test',
      results: result.testResults,
      timestamp: new Date()
    });
  }

  /**
   * Execute a shell command
   */
  private async executeCommand(
    command: string,
    cwd: string,
    env: Record<string, string | undefined>,
    buildId: string,
    type: 'build' | 'test'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.activeBuilds.set(buildId, child);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        const message = data.toString();
        stdout += message;
        
        this.emit('buildLog', {
          buildId,
          level: 'info',
          message: message.trim(),
          source: type,
          timestamp: new Date()
        });
      });
      
      child.stderr?.on('data', (data) => {
        const message = data.toString();
        stderr += message;
        
        this.emit('buildLog', {
          buildId,
          level: 'error',
          message: message.trim(),
          source: type,
          timestamp: new Date()
        });
      });
      
      child.on('error', (error) => {
        this.activeBuilds.delete(buildId);
        reject(error);
      });
      
      child.on('close', (code) => {
        this.activeBuilds.delete(buildId);
        
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Parse test results from command output
   */
  private parseTestResults(output: string): HierarchicalBuildResult['testResults'] {
    // This is a simplified parser - in real implementation would parse actual test output format
    const lines = output.split('\n');
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ test: string; error: string; stack?: string }>
    };
    
    // Look for common test result patterns
    for (const line of lines) {
      // Jest-style output
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed, (\d+) failed, (\d+) skipped, (\d+) total/);
        if (match) {
          summary.passed = parseInt(match[1]);
          summary.failed = parseInt(match[2]);
          summary.skipped = parseInt(match[3]);
          summary.total = parseInt(match[4]);
        }
      }
      
      // Mocha-style output
      if (line.includes('passing') && line.includes('failing')) {
        const passingMatch = line.match(/(\d+) passing/);
        const failingMatch = line.match(/(\d+) failing/);
        if (passingMatch) summary.passed = parseInt(passingMatch[1]);
        if (failingMatch) summary.failed = parseInt(failingMatch[1]);
        summary.total = summary.passed + summary.failed;
      }
    }
    
    return summary;
  }

  /**
   * Parse coverage results from coverage files
   */
  private parseCoverageResults(workingDirectory: string): HierarchicalBuildResult['coverage'] {
    // This would parse actual coverage files (lcov, json, etc.)
    // For now, return a placeholder
    return {
      lines: { total: 100, covered: 80, percentage: 80 },
      branches: { total: 50, covered: 40, percentage: 80 },
      functions: { total: 20, covered: 18, percentage: 90 },
      statements: { total: 100, covered: 85, percentage: 85 }
    };
  }

  /**
   * Collect build artifacts
   */
  private async collectArtifacts(
    config: HierarchicalBuildConfig,
    result: HierarchicalBuildResult
  ): Promise<void> {
    const { artifacts } = config.buildSettings!;
    if (!artifacts) return;
    
    result.artifacts = {
      reports: [],
      coverage: [],
      logs: [],
      other: []
    };
    
    const { workingDirectory = './' } = config.buildSettings!;
    
    for (const pattern of artifacts.paths) {
      try {
        const files = await this.globFiles(join(workingDirectory, pattern));
        
        for (const file of files) {
          if (file.includes('coverage') && artifacts.includeCoverage) {
            result.artifacts.coverage.push(file);
          } else if (file.includes('report') && artifacts.includeReports) {
            result.artifacts.reports.push(file);
          } else if (file.endsWith('.log') && artifacts.includeLogs) {
            result.artifacts.logs.push(file);
          } else {
            result.artifacts.other.push(file);
          }
        }
      } catch (error) {
        this.emit('warning', {
          buildId: config.testSuiteId,
          message: `Failed to collect artifacts matching ${pattern}: ${error}`,
          timestamp: new Date()
        });
      }
    }
    
    this.emit('artifactsCollected', {
      buildId: config.testSuiteId,
      artifacts: result.artifacts,
      timestamp: new Date()
    });
  }

  /**
   * Simple glob implementation
   */
  private async globFiles(pattern: string): Promise<string[]> {
    // This is a simplified implementation
    // In production, use a proper glob library
    const files: string[] = [];
    
    try {
      if (pattern.includes('*')) {
        // Handle wildcards - simplified
        const dir = pattern.substring(0, pattern.lastIndexOf('/'));
        const filePattern = pattern.substring(pattern.lastIndexOf('/') + 1);
        
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
          if (this.matchesPattern(entry, filePattern)) {
            files.push(join(dir, entry));
          }
        }
      } else {
        // Direct file
        await fs.access(pattern);
        files.push(pattern);
      }
    } catch (error) {
      // File not found is not an error for artifacts
    }
    
    return files;
  }

  /**
   * Simple pattern matching
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Very simplified pattern matching
    if (pattern === '*') return true;
    if (pattern.startsWith('*.')) {
      return filename.endsWith(pattern.substring(1));
    }
    return filename === pattern;
  }

  /**
   * Determine build status based on results and configuration
   */
  private determineBuildStatus(
    result: HierarchicalBuildResult,
    config: HierarchicalBuildConfig
  ): 'passed' | 'failed' | 'skipped' {
    // Check own test results
    if (result.testResults) {
      if (result.testResults.failed > 0) {
        return 'failed';
      }
    }
    
    // Check child results based on failure handling
    const { failureHandling = 'continue' } = config.aggregation || {};
    
    if (failureHandling !== 'ignore-children') {
      const failedChildren = result.children.filter(c => c.status === 'failed');
      if (failedChildren.length > 0) {
        return 'failed';
      }
    }
    
    // If we have test results and no failures
    if (result.testResults && result.testResults.total > 0) {
      return 'passed';
    }
    
    // If all children passed
    if (result.children.length > 0 && result.children.every(c => c.status === 'passed')) {
      return 'passed';
    }
    
    // No tests were run
    return 'skipped';
  }

  /**
   * Aggregate results from child builds
   */
  private aggregateChildResults(result: HierarchicalBuildResult): void {
    if (result.children.length === 0) return;
    
    const aggregated: HierarchicalBuildResult['aggregated'] = {
      testResults: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      coverage: {
        lines: { total: 0, covered: 0, percentage: 0 },
        branches: { total: 0, covered: 0, percentage: 0 },
        functions: { total: 0, covered: 0, percentage: 0 },
        statements: { total: 0, covered: 0, percentage: 0 }
      }
    };
    
    // Aggregate test results
    for (const child of result.children) {
      const childTests = child.aggregated?.testResults || child.testResults;
      if (childTests) {
        aggregated.testResults!.total += childTests.total;
        aggregated.testResults!.passed += childTests.passed;
        aggregated.testResults!.failed += childTests.failed;
        aggregated.testResults!.skipped += childTests.skipped;
      }
    }
    
    // Aggregate coverage
    for (const child of result.children) {
      const childCoverage = child.aggregated?.coverage || child.coverage;
      if (childCoverage) {
        // Sum totals and covered for each metric
        for (const metric of ['lines', 'branches', 'functions', 'statements'] as const) {
          aggregated.coverage![metric].total += childCoverage[metric].total;
          aggregated.coverage![metric].covered += childCoverage[metric].covered;
        }
      }
    }
    
    // Calculate coverage percentages
    for (const metric of ['lines', 'branches', 'functions', 'statements'] as const) {
      const { total, covered } = aggregated.coverage![metric];
      aggregated.coverage![metric].percentage = total > 0 ? (covered / total) * 100 : 0;
    }
    
    result.aggregated = aggregated;
  }

  /**
   * Cancel all active builds
   */
  cancel(): void {
    this.cancelled = true;
    
    for (const [buildId, child] of this.activeBuilds) {
      child.kill('SIGTERM');
      this.emit('buildCancelled', {
        buildId,
        timestamp: new Date()
      });
    }
    
    this.activeBuilds.clear();
  }

  /**
   * Get build result by ID
   */
  getBuildResult(buildId: string): HierarchicalBuildResult | undefined {
    return this.buildResults.get(buildId);
  }

  /**
   * Clear all build results
   */
  clearResults(): void {
    this.buildResults.clear();
  }
}