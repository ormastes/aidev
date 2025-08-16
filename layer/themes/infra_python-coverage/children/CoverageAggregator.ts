/**
 * Aggregate coverage from multiple test runs and sources
 */

import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';
import { execSync } from 'child_process';
import { CoverageResult, FileCoverage } from '../pipe/types';

export class CoverageAggregator {
  private coverageSources: Map<string, any>;
  private tempDir: string;

  constructor() {
    this.coverageSources = new Map();
    this.tempDir = path.join(process.cwd(), '.coverage-temp');
  }

  /**
   * Add coverage data from a file
   */
  async addCoverage(coverageFile: string, source?: string): Promise<void> {
    const coverageData = await fs.readJson(coverageFile);
    const sourceName = source || path.basename(coverageFile, '.json');
    this.coverageSources.set(sourceName, coverageData);
  }

  /**
   * Combine all coverage sources into a single result
   */
  async combine(): Promise<CoverageResult> {
    if (this.coverageSources.size === 0) {
      throw new Error('No coverage sources to combine');
    }

    // Ensure temp directory exists
    await fs.ensureDir(this.tempDir);

    // Write all coverage files to temp directory
    const coverageFiles: string[] = [];
    for (const [source, data] of this.coverageSources) {
      const tempFile = path.join(this.tempDir, `coverage_${source}.json`);
      await fs.writeJson(tempFile, data);
      coverageFiles.push(tempFile);
    }

    // Use coverage.py to combine the files
    const combinedFile = path.join(this.tempDir, 'coverage_combined.json');
    
    try {
      // Convert JSON files to .coverage format and combine
      for (const file of coverageFiles) {
        const coverageDbFile = file.replace('.json', '.coverage');
        execSync(
          `coverage json --data-file=${coverageDbFile} -o ${file}`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }

      // Combine all .coverage files
      const coverageDbFiles = coverageFiles.map(f => f.replace('.json', '.coverage'));
      execSync(
        `coverage combine ${coverageDbFiles.join(' ')}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );

      // Export combined coverage to JSON
      execSync(
        `coverage json -o ${combinedFile}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );

      // Read and parse combined coverage
      const combinedData = await fs.readJson(combinedFile);
      return this.parseCombinedCoverage(combinedData);

    } catch (error) {
      // Fallback to manual combination if coverage.py fails
      return this.manuallyCombineCoverage();
    } finally {
      // Clean up temp files
      await this.cleanup();
    }
  }

  /**
   * Get lines that are uncovered across all sources
   */
  async getUncoveredLines(): Promise<Map<string, number[]>> {
    const combined = await this.combine();
    return combined.uncoveredLines;
  }

  /**
   * Get coverage gap analysis
   */
  async getGapAnalysis(): Promise<{
    commonUncovered: Map<string, number[]>;
    partialCoverage: Map<string, { sources: string[]; lines: number[] }>;
    fullyCovered: string[];
  }> {
    const commonUncovered = new Map<string, number[]>();
    const partialCoverage = new Map<string, { sources: string[]; lines: number[] }>();
    const fullyCovered: string[] = [];

    // Analyze coverage across all sources
    const filesCoverage = new Map<string, Map<string, Set<number>>>();

    for (const [source, data] of this.coverageSources) {
      const files = data.files || {};
      
      for (const [file, fileData] of Object.entries(files)) {
        if (!filesCoverage.has(file)) {
          filesCoverage.set(file, new Map());
        }
        
        const fileCovMap = filesCoverage.get(file)!;
        const missingLines = new Set(fileData.missing_lines || []);
        fileCovMap.set(source, missingLines);
      }
    }

    // Analyze each file
    for (const [file, sourcesMap] of filesCoverage) {
      const allSources = Array.from(sourcesMap.keys());
      const allMissingLines = Array.from(sourcesMap.values());
      
      // Find common uncovered lines (uncovered in all sources)
      if (allMissingLines.length > 0) {
        const commonLines = Array.from(allMissingLines[0]);
        for (let i = 1; i < allMissingLines.length; i++) {
          const filtered = commonLines.filter(line => 
            allMissingLines[i].has(line)
          );
          commonLines.length = 0;
          commonLines.push(...filtered);
        }
        
        if (commonLines.length > 0) {
          commonUncovered.set(file, commonLines);
        }
      }
      
      // Find partially covered files
      const hasAnyCoverage = allMissingLines.some(lines => lines.size === 0);
      const hasAnyUncovered = allMissingLines.some(lines => lines.size > 0);
      
      if (hasAnyCoverage && hasAnyUncovered) {
        const sourcesWithCoverage = allSources.filter((source, idx) => 
          allMissingLines[idx].size === 0
        );
        
        const allUncoveredLines = new Set<number>();
        allMissingLines.forEach(lines => {
          lines.forEach(line => allUncoveredLines.add(line));
        });
        
        partialCoverage.set(file, {
          sources: sourcesWithCoverage,
          lines: Array.from(allUncoveredLines)
        });
      }
      
      // Find fully covered files
      const isFullyCovered = allMissingLines.every(lines => lines.size === 0);
      if (isFullyCovered) {
        fullyCovered.push(file);
      }
    }

    return {
      commonUncovered,
      partialCoverage,
      fullyCovered
    };
  }

  /**
   * Parse combined coverage data
   */
  private parseCombinedCoverage(data: any): CoverageResult {
    const files = data.files || {};
    const filesCoverage: FileCoverage[] = [];
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const [filePath, fileData] of Object.entries(files)) {
      const fd = fileData as any;
      const summary = fd.summary || {};
      
      const fileCoverage: FileCoverage = {
        path: filePath,
        lineCoverage: summary.percent_covered || 0,
        branchCoverage: summary.percent_covered_branches || 100,
        totalLines: summary.num_statements || 0,
        coveredLines: summary.covered_lines || 0,
        totalBranches: summary.num_branches || 0,
        coveredBranches: summary.covered_branches || 0,
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
      classCoverage: 0,
      methodCoverage: 0,
      totalLines,
      coveredLines,
      totalBranches,
      coveredBranches,
      uncoveredLines,
      files: filesCoverage,
      timestamp: new Date(),
      testDuration: 0
    };
  }

  /**
   * Manually combine coverage when coverage.py is not available
   */
  private async manuallyCombineCoverage(): Promise<CoverageResult> {
    const combinedFiles = new Map<string, any>();
    
    for (const [source, data] of this.coverageSources) {
      const files = data.files || {};
      
      for (const [file, fileData] of Object.entries(files)) {
        if (!combinedFiles.has(file)) {
          combinedFiles.set(file, {
            executed_lines: new Set(),
            missing_lines: new Set(),
            summary: {
              num_statements: 0,
              covered_lines: 0,
              num_branches: 0,
              covered_branches: 0
            }
          });
        }
        
        const combined = combinedFiles.get(file);
        const fd = fileData as any;
        
        // Merge executed lines
        if (fd.executed_lines) {
          fd.executed_lines.forEach((line: number) => 
            combined.executed_lines.add(line)
          );
        }
        
        // Update summary
        combined.summary.num_statements = Math.max(
          combined.summary.num_statements,
          fd.summary?.num_statements || 0
        );
        
        combined.summary.num_branches = Math.max(
          combined.summary.num_branches,
          fd.summary?.num_branches || 0
        );
      }
    }
    
    // Calculate final metrics
    const files: FileCoverage[] = [];
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    
    for (const [file, data] of combinedFiles) {
      const executedLines = data.executed_lines.size;
      const totalFileLines = data.summary.num_statements;
      const missingLines = [];
      
      for (let i = 1; i <= totalFileLines; i++) {
        if (!data.executed_lines.has(i)) {
          missingLines.push(i);
        }
      }
      
      const fileCoverage: FileCoverage = {
        path: file,
        lineCoverage: totalFileLines > 0 ? (executedLines / totalFileLines) * 100 : 0,
        branchCoverage: 100, // Default when not available
        totalLines: totalFileLines,
        coveredLines: executedLines,
        totalBranches: data.summary.num_branches,
        coveredBranches: data.summary.covered_branches || 0,
        uncoveredLines: missingLines
      };
      
      files.push(fileCoverage);
      totalLines += totalFileLines;
      coveredLines += executedLines;
      totalBranches += data.summary.num_branches;
      coveredBranches += data.summary.covered_branches || 0;
    }
    
    const uncoveredLines = new Map<string, number[]>();
    files.forEach(fc => {
      if (fc.uncoveredLines.length > 0) {
        uncoveredLines.set(fc.path, fc.uncoveredLines);
      }
    });
    
    return {
      lineCoverage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      branchCoverage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
      classCoverage: 0,
      methodCoverage: 0,
      totalLines,
      coveredLines,
      totalBranches,
      coveredBranches,
      uncoveredLines,
      files,
      timestamp: new Date(),
      testDuration: 0
    };
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(): Promise<void> {
    try {
      await fs.remove(this.tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Reset aggregator
   */
  reset(): void {
    this.coverageSources.clear();
  }
}