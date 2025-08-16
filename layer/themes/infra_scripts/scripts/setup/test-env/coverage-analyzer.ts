import { CoverageMetrics, MetricDetail } from './index';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';

export class CoverageAnalyzer {
  async analyze(testResults: any): Promise<CoverageMetrics> {
    const coverageData = await this.loadCoverageData(testResults);
    
    return {
      class: this.calculateClassCoverage(coverageData),
      branch: this.calculateBranchCoverage(coverageData),
      line: this.calculateLineCoverage(coverageData),
      method: this.calculateMethodCoverage(coverageData)
    };
  }

  private async loadCoverageData(testResults: any): Promise<any> {
    if (testResults.coverageMap) {
      return testResults.coverageMap;
    }

    const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-final.json');
    try {
      const data = await fs.readFile(coverageFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Coverage file not found, using test results');
      return testResults;
    }
  }

  private calculateClassCoverage(coverageData: any): MetricDetail {
    let totalClasses = 0;
    let coveredClasses = 0;

    Object.values(coverageData).forEach((file: any) => {
      const classes = this.extractClasses(file);
      totalClasses += classes.total;
      coveredClasses += classes.covered;
    });

    return {
      percentage: totalClasses > 0 ? (coveredClasses / totalClasses) * 100 : 0,
      covered: coveredClasses,
      total: totalClasses
    };
  }

  private calculateBranchCoverage(coverageData: any): MetricDetail {
    let totalBranches = 0;
    let coveredBranches = 0;

    Object.values(coverageData).forEach((file: any) => {
      if (file.b) {
        Object.values(file.b).forEach((branch: any) => {
          if (Array.isArray(branch)) {
            totalBranches += branch.length;
            coveredBranches += branch.filter((b: number) => b > 0).length;
          }
        });
      }
    });

    return {
      percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
      covered: coveredBranches,
      total: totalBranches
    };
  }

  private calculateLineCoverage(coverageData: any): MetricDetail {
    let totalLines = 0;
    let coveredLines = 0;

    Object.values(coverageData).forEach((file: any) => {
      if (file.l) {
        const lines = Object.values(file.l) as number[];
        totalLines += lines.length;
        coveredLines += lines.filter(count => count > 0).length;
      }
    });

    return {
      percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      covered: coveredLines,
      total: totalLines
    };
  }

  private calculateMethodCoverage(coverageData: any): MetricDetail {
    let totalMethods = 0;
    let coveredMethods = 0;

    Object.values(coverageData).forEach((file: any) => {
      if (file.f) {
        const methods = Object.values(file.f) as number[];
        totalMethods += methods.length;
        coveredMethods += methods.filter(count => count > 0).length;
      }
    });

    return {
      percentage: totalMethods > 0 ? (coveredMethods / totalMethods) * 100 : 0,
      covered: coveredMethods,
      total: totalMethods
    };
  }

  private extractClasses(file: any): { total: number; covered: number } {
    const classPattern = /class\s+\w+/g;
    const sourceCode = file.code || '';
    const classes = sourceCode.match(classPattern) || [];
    
    let coveredClasses = 0;
    classes.forEach((className: string) => {
      const classNameClean = className.replace('class ', '');
      const hasTestedMethods = this.isClassTested(file, classNameClean);
      if (hasTestedMethods) {
        coveredClasses++;
      }
    });

    return {
      total: classes.length,
      covered: coveredClasses
    };
  }

  private isClassTested(file: any, className: string): boolean {
    if (!file.fnMap) return false;
    
    for (const fnData of Object.values(file.fnMap) as any[]) {
      if (fnData.name && fnData.name.includes(className)) {
        const fnCoverage = file.f[fnData.name];
        if (fnCoverage && fnCoverage > 0) {
          return true;
        }
      }
    }
    
    return false;
  }
}