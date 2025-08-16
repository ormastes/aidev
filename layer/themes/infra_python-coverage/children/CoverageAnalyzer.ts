import { fileAPI } from '../utils/file-api';
/**
 * Core coverage analysis functionality for Python projects
 */

import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';
import { execSync } from 'child_process';
import {
  CoverageResult,
  FileCoverage,
  CoverageConfig,
  CoverageDiff,
  CoverageTrend
} from '../pipe/types';

export class CoverageAnalyzer {
  private config: CoverageConfig;
  private pythonPath: string;

  constructor(config?: CoverageConfig) {
    this.config = config || {};
    this.pythonPath = this.config.pythonPath || 'python';
  }

  /**
   * Analyze coverage data from a coverage file
   */
  async analyze(coverageFile: string): Promise<CoverageResult> {
    const coverageData = await fs.readJson(coverageFile);
    const result = this.parseCoverageData(coverageData);
    return result;
  }

  /**
   * Analyze a specific file's coverage
   */
  async analyzeFile(filePath: string, coverageData: any): Promise<FileCoverage> {
    const fileData = coverageData.files[filePath];
    if (!fileData) {
      throw new Error(`No coverage data found for file: ${filePath}`);
    }

    const totalLines = fileData.summary.num_statements;
    const coveredLines = fileData.summary.covered_lines;
    const totalBranches = fileData.summary.num_branches || 0;
    const coveredBranches = fileData.summary.covered_branches || 0;

    return {
      path: filePath,
      lineCoverage: (coveredLines / totalLines) * 100,
      branchCoverage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
      totalLines,
      coveredLines,
      totalBranches,
      coveredBranches,
      uncoveredLines: fileData.missing_lines || []
    };
  }

  /**
   * Analyze a directory's coverage
   */
  async analyzeDirectory(dirPath: string, coverageData: any): Promise<CoverageResult> {
    const files = Object.keys(coverageData.files).filter(file => 
      file.startsWith(dirPath)
    );

    const filesCoverage: FileCoverage[] = [];
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const file of files) {
      const fileCoverage = await this.analyzeFile(file, coverageData);
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
      classCoverage: 0, // Will be calculated by ClassCoverageTracker
      methodCoverage: 0, // Will be calculated by ClassCoverageTracker
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
   * Compare coverage between two coverage files
   */
  async compare(baseCoverageFile: string, headCoverageFile: string): Promise<CoverageDiff> {
    const baseCoverage = await fs.readJson(baseCoverageFile);
    const headCoverage = await fs.readJson(headCoverageFile);

    const baseResult = this.parseCoverageData(baseCoverage);
    const headResult = this.parseCoverageData(headCoverage);

    const change = headResult.lineCoverage - baseResult.lineCoverage;
    const lineChange = headResult.coveredLines - baseResult.coveredLines;
    const branchChange = headResult.branchCoverage - baseResult.branchCoverage;

    // Find newly uncovered and covered lines
    const newUncovered = this.findNewUncoveredLines(baseResult, headResult);
    const newlyCovered = this.findNewlyCoveredLines(baseResult, headResult);
    const modifiedFiles = this.findModifiedFiles(baseResult, headResult);

    return {
      change,
      lineChange,
      branchChange,
      newUncovered,
      newlyCovered,
      modifiedFiles
    };
  }

  /**
   * Analyze coverage trends over time
   */
  async analyzeTrends(historyPath: string, days: number = 30): Promise<{
    trend: "improving" | "declining" | 'stable';
    averageChange: number;
    dataPoints: Array<{ date: string; coverage: number }>;
  }> {
    const historyFiles = await fs.readdir(historyPath);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const dataPoints: Array<{ date: string; coverage: number }> = [];

    for (const file of historyFiles) {
      if (file.endsWith('.json')) {
        const filePath = path.join(historyPath, file);
        const stats = await /* FRAUD_FIX: fs.stat(filePath) */;
        
        if (stats.mtime >= cutoffDate) {
          const data = await fs.readJson(filePath);
          const result = this.parseCoverageData(data);
          dataPoints.push({
            date: stats.mtime.toISOString(),
            coverage: result.lineCoverage
          });
        }
      }
    }

    dataPoints.sort((a, b) => a.date.localeCompare(b.date));

    if (dataPoints.length < 2) {
      return {
        trend: 'stable',
        averageChange: 0,
        dataPoints
      };
    }

    // Calculate trend
    const changes: number[] = [];
    for (let i = 1; i < dataPoints.length; i++) {
      changes.push(dataPoints[i].coverage - dataPoints[i - 1].coverage);
    }

    const averageChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    let trend: "improving" | "declining" | 'stable';

    if (averageChange > 0.5) {
      trend = "improving";
    } else if (averageChange < -0.5) {
      trend = "declining";
    } else {
      trend = 'stable';
    }

    return {
      trend,
      averageChange,
      dataPoints
    };
  }

  /**
   * Parse raw coverage data into CoverageResult
   */
  private parseCoverageData(coverageData: any): CoverageResult {
    const files = coverageData.files || {};
    const filesCoverage: FileCoverage[] = [];
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const [filePath, fileData] of Object.entries(files)) {
      const data = fileData as any;
      const fileCoverage: FileCoverage = {
        path: filePath,
        lineCoverage: data.summary?.percent_covered || 0,
        branchCoverage: data.summary?.percent_covered_branches || 100,
        totalLines: data.summary?.num_statements || 0,
        coveredLines: data.summary?.covered_lines || 0,
        totalBranches: data.summary?.num_branches || 0,
        coveredBranches: data.summary?.covered_branches || 0,
        uncoveredLines: data.missing_lines || []
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
   * Find newly uncovered lines
   */
  private findNewUncoveredLines(base: CoverageResult, head: CoverageResult): any[] {
    const newUncovered: any[] = [];

    head.uncoveredLines.forEach((lines, file) => {
      const baseLines = base.uncoveredLines.get(file) || [];
      const newLines = lines.filter(line => !baseLines.includes(line));
      
      if (newLines.length > 0) {
        newUncovered.push({
          file,
          lines: newLines,
          type: 'added'
        });
      }
    });

    return newUncovered;
  }

  /**
   * Find newly covered lines
   */
  private findNewlyCoveredLines(base: CoverageResult, head: CoverageResult): any[] {
    const newlyCovered: any[] = [];

    base.uncoveredLines.forEach((lines, file) => {
      const headLines = head.uncoveredLines.get(file) || [];
      const coveredLines = lines.filter(line => !headLines.includes(line));
      
      if (coveredLines.length > 0) {
        newlyCovered.push({
          file,
          lines: coveredLines,
          type: 'removed'
        });
      }
    });

    return newlyCovered;
  }

  /**
   * Find modified files between coverage runs
   */
  private findModifiedFiles(base: CoverageResult, head: CoverageResult): string[] {
    const baseFiles = new Set(base.files.map(f => f.path));
    const headFiles = new Set(head.files.map(f => f.path));
    
    const modified: string[] = [];
    
    headFiles.forEach(file => {
      if (baseFiles.has(file)) {
        const baseFile = base.files.find(f => f.path === file);
        const headFile = head.files.find(f => f.path === file);
        
        if (baseFile && headFile && 
            (baseFile.lineCoverage !== headFile.lineCoverage ||
             baseFile.branchCoverage !== headFile.branchCoverage)) {
          modified.push(file);
        }
      }
    });

    return modified;
  }
}