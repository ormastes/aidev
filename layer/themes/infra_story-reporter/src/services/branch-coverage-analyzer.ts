import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

interface BranchCoverageResult {
  percentage: number;
  covered: number;
  total: number;
  details: BranchDetail[];
}

interface BranchDetail {
  file: string;
  branches: number;
  covered: number;
  percentage: number;
  uncoveredLines: number[];
}

export class BranchCoverageAnalyzer {
  async analyze(targetPath: string, mode: string): Promise<BranchCoverageResult> {
    const coverageFiles = await this.findCoverageFiles(targetPath, mode);
    const branchDetails: BranchDetail[] = [];
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const coverageFile of coverageFiles) {
      try {
        const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf8'));
        const detail = this.extractBranchInfo(coverageFile, coverageData);
        branchDetails.push(detail);
        totalBranches += detail.branches;
        coveredBranches += detail.covered;
      } catch (error) {
        console.warn(`Warning: Could not parse coverage file ${coverageFile}:`, error);
      }
    }

    const percentage = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;

    return {
      percentage: Math.round(percentage * 100) / 100,
      covered: coveredBranches,
      total: totalBranches,
      details: branchDetails
    };
  }

  private extractBranchInfo(filePath: string, coverageData: any): BranchDetail {
    let branches = 0;
    let covered = 0;
    const uncoveredLines: number[] = [];

    // Handle different coverage formats
    if (coverageData.branches) {
      for (const [, branchData] of Object.entries(coverageData.branches)) {
        if (Array.isArray(branchData)) {
          branches += branchData.length;
          covered += branchData.filter((hit: number) => hit > 0).length;
        }
      }
    } else if (coverageData.BRF && coverageData.BRH) {
      branches = coverageData.BRF;
      covered = coverageData.BRH;
    }

    const percentage = branches > 0 ? (covered / branches) * 100 : 0;

    return {
      file: filePath,
      branches,
      covered,
      percentage: Math.round(percentage * 100) / 100,
      uncoveredLines
    };
  }

  private async findCoverageFiles(targetPath: string, mode: string): Promise<string[]> {
    const patterns = this.getCoveragePatterns(targetPath, mode);
    const files: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await this.findFilesByPattern(pattern);
        files.push(...matches);
      } catch (error) {
        console.warn(`Warning: Could not find pattern ${pattern}:`, error);
      }
    }

    return files;
  }

  private async findFilesByPattern(pattern: string): Promise<string[]> {
    const files: string[] = [];
    const fileName = pattern.replace(/.*[\\/]/, '').replace(/\*\*/g, '');
    const baseDir = pattern.substring(0, pattern.lastIndexOf('/'));
    
    try {
      await this.searchDirectory(baseDir, fileName, files);
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  private async searchDirectory(dir: string, fileName: string, files: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name === 'node_modules') continue;
        
        if (entry.isDirectory()) {
          await this.searchDirectory(fullPath, fileName, files);
        } else if (entry.name === fileName || entry.name.endsWith(fileName.replace('*', ''))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private getCoveragePatterns(targetPath: string, mode: string): string[] {
    switch (mode) {
      case 'app':
        return [
          path.join(targetPath, '**/coverage/coverage-final.json'),
          path.join(targetPath, '**/coverage/lcov.info')
        ];
      case 'epic':
        return [
          path.join(targetPath, 'apps/*/coverage/coverage-final.json'),
          path.join(targetPath, 'layers/*/coverage/coverage-final.json')
        ];
      case 'theme':
        return [
          path.join(targetPath, 'coverage/coverage-final.json'),
          path.join(targetPath, 'tests/coverage/coverage-final.json')
        ];
      case 'story':
        return [
          path.join(targetPath, 'coverage/coverage-final.json'),
          path.join(targetPath, 'user-stories/*/coverage/coverage-final.json')
        ];
      default:
        return [
          path.join(targetPath, '**/coverage/coverage-final.json')
        ];
    }
  }
}