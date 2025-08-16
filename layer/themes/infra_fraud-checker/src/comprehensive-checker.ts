/**
 * Comprehensive Fraud Checker
 * Detects various code quality and security issues including direct external imports
 */

import { SystemTestDetector } from './detectors/system-test-detector';
import { ExternalTestDetector } from './detectors/external-test-detector';
import { EnvironmentTestDetector } from './detectors/environment-test-detector';
import { DirectExternalImportDetector } from './detectors/direct-external-import-detector';
import { WebUITestDetector } from './detectors/web-ui-test-detector';
import { FraudReportGenerator } from './reporters/fraud-report-generator';
import { DetectionResult, Severity } from './types';

export interface ComprehensiveCheckConfig {
  projectPath: string;
  includeTests?: boolean;
  includeDirectImports?: boolean;
  includeWebUI?: boolean;
  excludePatterns?: string[];
  autoFix?: boolean;
}

export interface ComprehensiveReport {
  timestamp: string;
  projectPath: string;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    fixedIssues: number;
  };
  categories: {
    mockUsage: DetectionResult[];
    directImports: DetectionResult[];
    webUIIssues: DetectionResult[];
    otherIssues: DetectionResult[];
  };
  recommendations: string[];
}

export class ComprehensiveFraudChecker {
  private config: ComprehensiveCheckConfig;
  private detectors: Map<string, any>;
  private reportGenerator: FraudReportGenerator;

  constructor(config: Partial<ComprehensiveCheckConfig> = {}) {
    this.config = {
      projectPath: config.projectPath || process.cwd(),
      includeTests: config.includeTests !== false,
      includeDirectImports: config.includeDirectImports !== false,
      includeWebUI: config.includeWebUI !== false,
      excludePatterns: config.excludePatterns || ['**/node_modules/**', '**/dist/**', '**/build/**'],
      autoFix: config.autoFix || false
    };

    this.reportGenerator = new FraudReportGenerator();
    this.initializeDetectors();
  }

  private initializeDetectors(): void {
    this.detectors = new Map();

    if (this.config.includeTests) {
      this.detectors.set('systemTest', new SystemTestDetector());
      this.detectors.set('externalTest', new ExternalTestDetector());
      this.detectors.set('environmentTest', new EnvironmentTestDetector());
    }

    if (this.config.includeDirectImports) {
      this.detectors.set('directImport', new DirectExternalImportDetector());
    }

    if (this.config.includeWebUI) {
      this.detectors.set('webUI', new WebUITestDetector());
    }
  }

  /**
   * Run comprehensive fraud detection
   */
  async runComprehensiveCheck(): Promise<ComprehensiveReport> {
    console.log('🔍 Running comprehensive fraud check...');
    
    const allResults: DetectionResult[] = [];
    const categories = {
      mockUsage: [] as DetectionResult[],
      directImports: [] as DetectionResult[],
      webUIIssues: [] as DetectionResult[],
      otherIssues: [] as DetectionResult[]
    };

    // Run all detectors
    for (const [name, detector] of this.detectors) {
      console.log(`  Checking ${name}...`);
      try {
        const results = await detector.detect(this.config.projectPath);
        allResults.push(...results);

        // Categorize results
        for (const result of results) {
          if (result.type === 'DirectExternalImport') {
            categories.directImports.push(result);
          } else if (result.type.includes('Mock')) {
            categories.mockUsage.push(result);
          } else if (result.type.includes('WebUI')) {
            categories.webUIIssues.push(result);
          } else {
            categories.otherIssues.push(result);
          }
        }
      } catch (error) {
        console.error(`  Error in ${name} detector:`, error);
      }
    }

    // Auto-fix if enabled
    let fixedCount = 0;
    if (this.config.autoFix && categories.directImports.length > 0) {
      console.log('\n🔧 Attempting to auto-fix direct imports...');
      const directImportDetector = this.detectors.get('directImport') as DirectExternalImportDetector;
      
      for (const issue of categories.directImports) {
        if (issue.suggestion && issue.file && issue.line) {
          const fixed = await directImportDetector.fix(issue.file, issue.line, issue.suggestion);
          if (fixed) {
            fixedCount++;
            console.log(`  ✅ Fixed: ${issue.file}:${issue.line}`);
          }
        }
      }
    }

    // Generate report
    const report: ComprehensiveReport = {
      timestamp: new Date().toISOString(),
      projectPath: this.config.projectPath,
      summary: {
        totalIssues: allResults.length,
        criticalIssues: allResults.filter(r => r.severity === Severity.CRITICAL).length,
        highIssues: allResults.filter(r => r.severity === Severity.HIGH).length,
        mediumIssues: allResults.filter(r => r.severity === Severity.MEDIUM).length,
        lowIssues: allResults.filter(r => r.severity === Severity.LOW).length,
        fixedIssues: fixedCount
      },
      categories,
      recommendations: this.generateRecommendations(categories)
    };

    return report;
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(categories: ComprehensiveReport['categories']): string[] {
    const recommendations: string[] = [];

    if (categories.directImports.length > 0) {
      recommendations.push(
        `Found ${categories.directImports.length} direct external imports.`,
        'Run migration script: bun scripts/migrate-to-external-modules.ts',
        'All Node.js modules should be imported from infra_external-log-lib for proper interception.'
      );
    }

    if (categories.mockUsage.length > 0) {
      recommendations.push(
        `Found ${categories.mockUsage.length} mock usage violations.`,
        'System, external, and environment tests should not use mocks.',
        'Consider using real implementations or test doubles.'
      );
    }

    if (categories.webUIIssues.length > 0) {
      recommendations.push(
        `Found ${categories.webUIIssues.length} web UI test issues.`,
        'Ensure Playwright is used for all browser automation.',
        'Tests should interact with real UI elements.'
      );
    }

    if (allIssuesCount === 0) {
      recommendations.push('✅ No issues found! Code is compliant with all fraud checks.');
    }

    return recommendations;
  }

  /**
   * Save report to file
   */
  async saveReport(report: ComprehensiveReport, outputPath?: string): Promise<void> {
    const path = outputPath || `fraud-report-${Date.now()}.json`;
    const fs = require('fs').promises;
    await fs.writeFile(path, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${path}`);
  }

  /**
   * Print report to console
   */
  printReport(report: ComprehensiveReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE FRAUD CHECK REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📊 Summary:');
    console.log(`  Total Issues: ${report.summary.totalIssues}`);
    console.log(`  Critical: ${report.summary.criticalIssues}`);
    console.log(`  High: ${report.summary.highIssues}`);
    console.log(`  Medium: ${report.summary.mediumIssues}`);
    console.log(`  Low: ${report.summary.lowIssues}`);
    
    if (report.summary.fixedIssues > 0) {
      console.log(`  ✅ Auto-fixed: ${report.summary.fixedIssues}`);
    }

    if (report.categories.directImports.length > 0) {
      console.log('\n🚫 Direct External Imports:');
      for (const issue of report.categories.directImports.slice(0, 5)) {
        console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      }
      if (report.categories.directImports.length > 5) {
        console.log(`  ... and ${report.categories.directImports.length - 5} more`);
      }
    }

    if (report.categories.mockUsage.length > 0) {
      console.log('\n🎭 Mock Usage Violations:');
      for (const issue of report.categories.mockUsage.slice(0, 5)) {
        console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      }
      if (report.categories.mockUsage.length > 5) {
        console.log(`  ... and ${report.categories.mockUsage.length - 5} more`);
      }
    }

    console.log('\n💡 Recommendations:');
    for (const rec of report.recommendations) {
      console.log(`  • ${rec}`);
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Export for CLI usage
export async function runFraudCheck(options: Partial<ComprehensiveCheckConfig> = {}): Promise<void> {
  const checker = new ComprehensiveFraudChecker(options);
  const report = await checker.runComprehensiveCheck();
  
  checker.printReport(report);
  
  if (options.autoFix) {
    await checker.saveReport(report);
  }
  
  // Exit with error code if critical issues found
  if (report.summary.criticalIssues > 0) {
    process.exit(1);
  }
}