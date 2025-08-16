#!/usr/bin/env node

/**
 * System Test Class Coverage Measurement Script
 * Uses the setup framework's coverage analyzer to measure class coverage specifically for system tests
 * Based on the coverage analyzer found in ../../setup/test-env/coverage-analyzer.ts
 */

import * as fs from 'fs/promises';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { spawn } from 'child_process';

interface CoverageMetrics {
  class: MetricDetail;
  branch: MetricDetail;
  line: MetricDetail;
  method: MetricDetail;
}

interface MetricDetail {
  percentage: number;
  covered: number;
  total: number;
}

class SystemTestCoverageAnalyzer {
  private projectRoot: string;
  private outputDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.outputDir = path.join(this.projectRoot, 'coverage-system');
  }

  async analyze(): Promise<CoverageMetrics> {
    console.log('🔍 Analyzing System Test Class Coverage...\n');
    
    // Step 1: Run system tests with coverage
    console.log('📊 Running system tests with coverage instrumentation...');
    await this.runSystemTestsWithCoverage();
    
    // Step 2: Load and analyze coverage data
    console.log('🧮 Analyzing coverage data...');
    const coverageData = await this.loadCoverageData();
    
    // Step 3: Calculate metrics
    const metrics = {
      class: this.calculateClassCoverage(coverageData),
      branch: this.calculateBranchCoverage(coverageData),
      line: this.calculateLineCoverage(coverageData),
      method: this.calculateMethodCoverage(coverageData)
    };

    // Step 4: Generate report
    await this.generateReport(metrics, coverageData);
    
    return metrics;
  }

  private async runSystemTestsWithCoverage(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create coverage output directory
      fs.mkdir(this.outputDir, { recursive: true }).catch(() => {});

      // Run Playwright system tests with NYC coverage
      const testProcess = spawn('npx', [
        'nyc',
        '--reporter=json',
        '--reporter=html',
        '--report-dir=' + this.outputDir,
        '--include=src/**/*.ts',
        '--exclude=test/**/*',
        '--exclude=**/*.test.ts',
        '--exclude=**/*.spec.ts',
        "playwright",
        'test',
        '--config=playwright.config.ts',
        '--grep=system-test-mockless|ctest-gui-automation'
      ], {
        stdio: 'inherit',
        cwd: this.projectRoot
      });

      testProcess.on('close', (code) => {
        if (code === 0 || code === 1) {
          // Exit code 1 is acceptable (some tests may fail but coverage still collected)
          resolve();
        } else {
          reject(new Error(`Coverage collection failed with code ${code}`));
        }
      });

      testProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async loadCoverageData(): Promise<any> {
    const coverageFile = path.join(this.outputDir, 'coverage-final.json');
    
    try {
      const data = await fs.readFile(coverageFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('⚠️ Coverage file not found, checking alternative locations...');
      
      // Try NYC default location
      const nycCoverageFile = path.join(this.projectRoot, "coverage", 'coverage-final.json');
      try {
        const data = await fs.readFile(nycCoverageFile, 'utf8');
        return JSON.parse(data);
      } catch {
        console.error('❌ No coverage data found. Make sure tests ran successfully.');
        return {};
      }
    }
  }

  private calculateClassCoverage(coverageData: any): MetricDetail {
    let totalClasses = 0;
    let coveredClasses = 0;

    Object.entries(coverageData).forEach(([filePath, file]: [string, any]) => {
      // Only analyze source files, not test files
      if (filePath.includes('/src/') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
        const classes = this.extractClasses(file);
        totalClasses += classes.total;
        coveredClasses += classes.covered;
      }
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

    Object.entries(coverageData).forEach(([filePath, file]: [string, any]) => {
      if (filePath.includes('/src/') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
        if (file.b) {
          Object.values(file.b).forEach((branch: any) => {
            if (Array.isArray(branch)) {
              totalBranches += branch.length;
              coveredBranches += branch.filter((b: number) => b > 0).length;
            }
          });
        }
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

    Object.entries(coverageData).forEach(([filePath, file]: [string, any]) => {
      if (filePath.includes('/src/') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
        if (file.s) {
          const statements = Object.values(file.s) as number[];
          totalLines += statements.length;
          coveredLines += statements.filter(count => count > 0).length;
        }
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

    Object.entries(coverageData).forEach(([filePath, file]: [string, any]) => {
      if (filePath.includes('/src/') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
        if (file.f) {
          const functions = Object.values(file.f) as number[];
          totalMethods += functions.length;
          coveredMethods += functions.filter(count => count > 0).length;
        }
      }
    });

    return {
      percentage: totalMethods > 0 ? (coveredMethods / totalMethods) * 100 : 0,
      covered: coveredMethods,
      total: totalMethods
    };
  }

  private extractClasses(file: any): { total: number; covered: number } {
    if (!file.path) return { total: 0, covered: 0 };
    
    try {
      // Read the actual source file to detect classes
      const sourceCode = require('fs').readFileSync(file.path, 'utf8');
      const classPattern = /(?:export\s+)?class\s+(\w+)/g;
      const classes = [];
      let match;
      
      while ((match = classPattern.exec(sourceCode)) !== null) {
        classes.push(match[1]);
      }
      
      let coveredClasses = 0;
      classes.forEach((className: string) => {
        const hasTestedMethods = this.isClassTested(file, className);
        if (hasTestedMethods) {
          coveredClasses++;
        }
      });

      return {
        total: classes.length,
        covered: coveredClasses
      };
    } catch (error) {
      return { total: 0, covered: 0 };
    }
  }

  private isClassTested(file: any, className: string): boolean {
    if (!file.f || !file.fnMap) return false;
    
    // Check if any methods of this class were executed
    for (const [fnKey, fnData] of Object.entries(file.fnMap) as [string, any][]) {
      if (fnData.name && (fnData.name.includes(className) || fnData.name.includes(`${className}.`))) {
        const fnCoverage = file.f[fnKey];
        if (fnCoverage && fnCoverage > 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  private async generateReport(metrics: CoverageMetrics, coverageData: any): Promise<void> {
    const reportPath = path.join(this.outputDir, 'system-test-coverage-report.md');
    const timestamp = new Date().toISOString();
    
    // Analyze individual classes
    const classDetails = await this.analyzeIndividualClasses(coverageData);
    
    const report = `# System Test Class Coverage Report

**Generated:** ${timestamp}
**Test Types:** E2E System Tests (Playwright with real VSCode interactions)

## 📊 Overall Coverage Metrics

| Metric | Covered | Total | Percentage |
|--------|---------|-------|------------|
| **Classes** | ${metrics.class.covered} | ${metrics.class.total} | **${metrics.class.percentage.toFixed(2)}%** |
| Methods | ${metrics.method.covered} | ${metrics.method.total} | ${metrics.method.percentage.toFixed(2)}% |
| Lines | ${metrics.line.covered} | ${metrics.line.total} | ${metrics.line.percentage.toFixed(2)}% |
| Branches | ${metrics.branch.covered} | ${metrics.branch.total} | ${metrics.branch.percentage.toFixed(2)}% |

## 🎯 Class Coverage Analysis

### ✅ **Classes Covered by System Tests**
${classDetails.covered.map(cls => `- **${cls.name}** (${cls.file}) - ${cls.methods} methods tested`).join('\n')}

### ❌ **Classes NOT Covered by System Tests**  
${classDetails.uncovered.map(cls => `- **${cls.name}** (${cls.file}) - ${cls.methods} methods available`).join('\n')}

## 📈 Coverage Quality Assessment

${this.generateQualityAssessment(metrics)}

## 🔧 Recommendations

${this.generateRecommendations(metrics, classDetails)}

## 📋 System Test Coverage Details

- **Test Framework:** Playwright E2E Tests
- **Test Types:** Mock-free system tests with real VSCode extension interactions
- **Coverage Tool:** NYC (Istanbul)
- **Target Files:** src/**/*.ts (excluding tests)
- **Key Tests:** 
  - system-test-mockless.test.ts
  - ctest-gui-automation.test.ts

---
*This report measures how much of the codebase is exercised by real E2E system tests that launch VSCode and perform actual user interactions.*
`;

    await fs.writeFile(reportPath, report);
    console.log(`📄 Report generated: ${reportPath}`);
  }

  private async analyzeIndividualClasses(coverageData: any): Promise<{
    covered: Array<{name: string, file: string, methods: number}>,
    uncovered: Array<{name: string, file: string, methods: number}>
  }> {
    const covered: Array<{name: string, file: string, methods: number}> = [];
    const uncovered: Array<{name: string, file: string, methods: number}> = [];

    for (const [filePath, file] of Object.entries(coverageData) as [string, any][]) {
      if (!filePath.includes('/src/') || filePath.includes('.test.') || filePath.includes('.spec.')) {
        continue;
      }

      try {
        const sourceCode = require('fs').readFileSync(filePath, 'utf8');
        const classPattern = /(?:export\s+)?class\s+(\w+)/g;
        let match;
        
        while ((match = classPattern.exec(sourceCode)) !== null) {
          const className = match[1];
          const methodCount = this.countClassMethods(sourceCode, className);
          const isTested = this.isClassTested(file, className);
          
          const classInfo = {
            name: className,
            file: path.relative(this.projectRoot, filePath),
            methods: methodCount
          };
          
          if (isTested) {
            covered.push(classInfo);
          } else {
            uncovered.push(classInfo);
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return { covered, uncovered };
  }

  private countClassMethods(sourceCode: string, className: string): number {
    // Simple method counting - could be improved with AST parsing
    const classStartRegex = new RegExp(`class\\s+${className}[^{]*{`);
    const match = sourceCode.match(classStartRegex);
    if (!match) return 0;

    const classStart = match.index! + match[0].length;
    let braceCount = 1;
    let classEnd = classStart;
    
    for (let i = classStart; i < sourceCode.length && braceCount > 0; i++) {
      if (sourceCode[i] === '{') braceCount++;
      else if (sourceCode[i] === '}') braceCount--;
      classEnd = i;
    }
    
    const classBody = sourceCode.substring(classStart, classEnd);
    const methodPattern = /(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*\w+\s*\([^)]*\)\s*[:{]/g;
    return (classBody.match(methodPattern) || []).length;
  }

  private generateQualityAssessment(metrics: CoverageMetrics): string {
    const classPercentage = metrics.class.percentage;
    
    if (classPercentage >= 90) {
      return `🟢 **EXCELLENT** - System tests provide comprehensive class coverage (${classPercentage.toFixed(1)}%)`;
    } else if (classPercentage >= 70) {
      return `🟡 **GOOD** - System tests cover most classes (${classPercentage.toFixed(1)}%) but some gaps remain`;
    } else if (classPercentage >= 50) {
      return `🟠 **MODERATE** - System tests cover half the classes (${classPercentage.toFixed(1)}%) - improvement needed`;
    } else {
      return `🔴 **POOR** - System tests cover few classes (${classPercentage.toFixed(1)}%) - significant gaps exist`;
    }
  }

  private generateRecommendations(metrics: CoverageMetrics, classDetails: any): string {
    const recommendations = [];
    
    if (metrics.class.percentage < 80) {
      recommendations.push('- **Add E2E tests** for uncovered classes, especially core functionality');
      recommendations.push('- **Focus on user workflows** that exercise more classes through real interactions');
    }
    
    if (classDetails.uncovered.length > 0) {
      const priorityClasses = classDetails.uncovered
        .filter((cls: any) => cls.file.includes("controller") || cls.file.includes('config') || cls.file.includes('handler'))
        .slice(0, 3);
      
      if (priorityClasses.length > 0) {
        recommendations.push(`- **High Priority Classes:** ${priorityClasses.map((cls: any) => cls.name).join(', ')}`);
      }
    }
    
    if (metrics.branch.percentage < 60) {
      recommendations.push('- **Improve branch coverage** by testing error scenarios and edge cases in E2E tests');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- **Maintain excellence** - Current coverage is comprehensive');
    }
    
    return recommendations.join('\n');
  }
}

// CLI execution
async function main() {
  try {
    const analyzer = new SystemTestCoverageAnalyzer();
    const metrics = await analyzer.analyze();
    
    console.log('\n✅ System Test Coverage Analysis Complete!');
    console.log('\n📊 Summary:');
    console.log(`   Classes: ${metrics.class.covered}/${metrics.class.total} (${metrics.class.percentage.toFixed(1)}%)`);
    console.log(`   Methods: ${metrics.method.covered}/${metrics.method.total} (${metrics.method.percentage.toFixed(1)}%)`);
    console.log(`   Lines: ${metrics.line.covered}/${metrics.line.total} (${metrics.line.percentage.toFixed(1)}%)`);
    console.log(`   Branches: ${metrics.branch.covered}/${metrics.branch.total} (${metrics.branch.percentage.toFixed(1)}%)`);
    
    // Exit with appropriate code based on coverage
    if (metrics.class.percentage >= 70) {
      console.log('\n🎉 Good system test coverage achieved!');
      process.exit(0);
    } else {
      console.log('\n⚠️ System test coverage below target (70%)');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Coverage analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SystemTestCoverageAnalyzer };