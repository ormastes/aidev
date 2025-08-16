#!/usr/bin/env ts-node

/**
 * Comprehensive Fraud Checker for All Themes
 * Runs multiple fraud detection checks across all themes
 */

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { FraudChecker } from '../children/FraudChecker';
import { FraudPatternDetector } from '../children/FraudPatternDetector';
import { TestAnalyzer } from '../children/TestAnalyzer';
import { FraudReportGenerator } from '../children/FraudReportGenerator';
import { ExternalLibraryDetector } from '../children/ExternalLibraryDetector';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


// Import additional fraud detectors from services
import { MockDetectionService } from '../src/services/mock-detection-service';
import { TestCoverageFraudDetector } from '../src/services/test-coverage-fraud-detector';
import { DependencyFraudDetector } from '../src/services/dependency-fraud-detector';
import { CodeSmellDetector } from '../src/services/code-smell-detector';
import { SecurityVulnerabilityDetector } from '../src/services/security-vulnerability-detector';

interface ThemeFraudReport {
  themeName: string;
  themePath: string;
  fraudChecks: {
    testFraud: any;
    externalLibraryViolations: any[];
    mockViolations: any[];
    coverageIssues: any[];
    dependencyIssues: any[];
    codeSmells: any[];
    securityVulnerabilities: any[];
  };
  summary: {
    totalViolations: number;
    criticalIssues: number;
    score: number;
    passed: boolean;
  };
}

interface ComprehensiveFraudReport {
  timestamp: string;
  themesChecked: number;
  totalViolations: number;
  themes: ThemeFraudReport[];
  summary: {
    overallScore: number;
    themesWithIssues: number;
    criticalThemes: string[];
    recommendations: string[];
  };
}

class ComprehensiveFraudChecker {
  private themesPath: string;
  private externalLibDetector: ExternalLibraryDetector;
  private mockDetector: MockDetectionService;
  private coverageDetector: TestCoverageFraudDetector;
  private dependencyDetector: DependencyFraudDetector;
  private codeSmellDetector: CodeSmellDetector;
  private securityDetector: SecurityVulnerabilityDetector;

  constructor() {
    this.themesPath = path.join(process.cwd(), 'layer', 'themes');
    this.externalLibDetector = new ExternalLibraryDetector();
    this.// FRAUD_FIX: mockDetector = new MockDetectionService();
    this.coverageDetector = new TestCoverageFraudDetector();
    this.dependencyDetector = new DependencyFraudDetector();
    this.codeSmellDetector = new CodeSmellDetector();
    this.securityDetector = new SecurityVulnerabilityDetector();
  }

  /**
   * Get all theme directories
   */
  private async getThemes(): string[] {
    try {
      const entries = fs.readdirSync(this.themesPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => !name.startsWith('.') && name !== 'temp')
        .sort();
    } catch (error) {
      console.error('Error reading themes directory:', error);
      return [];
    }
  }

  /**
   * Find all TypeScript and JavaScript files in a directory
   */
  private async findSourceFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'build', "coverage", '.git'].includes(entry.name)) {
            files.push(...this.findSourceFiles(fullPath));
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * Check a single theme for all types of fraud
   */
  private async checkTheme(themeName: string): Promise<ThemeFraudReport> {
    const themePath = path.join(this.themesPath, themeName);
    const files = this.findSourceFiles(themePath);
    
    console.log(`\nChecking ${themeName} (${files.length} files)...`);

    // 1. Test Fraud Check
    const fraudChecker = new FraudChecker(themePath);
    const testPattern = /\.(test|spec)\.(ts|js)$/;
    let testFraud;
    try {
      testFraud = await fraudChecker.checkDirectory(themePath, testPattern);
    } catch (error) {
      console.error(`  ❌ Test fraud check failed: ${error}`);
      testFraud = { violations: [], metrics: { filesChecked: 0 } };
    }

    // 2. External Library Violations
    const externalLibViolations: any[] = [];
    for (const file of files) {
      try {
        const content = fileAPI.readFileSync(file, 'utf-8');
        const violations = this.externalLibDetector.detectViolations(content, file);
        externalLibViolations.push(...violations);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // 3. Mock Detection
    const mockViolations: any[] = [];
    const testFiles = files.filter(f => testPattern.test(f));
    for (const file of testFiles) {
      try {
        const content = fileAPI.readFileSync(file, 'utf-8');
        const // FRAUD_FIX: mocks = await this.mockDetector.detectMocks(content, file);
        if (mocks.length > 0) {
          mockViolations.push({ file, mocks });
        }
      } catch (error) {
        // Skip files that can't be analyzed
      }
    }

    // 4. Coverage Issues
    const coverageIssues: any[] = [];
    try {
      const coverageData = await this.coverageDetector.checkCoverage(themePath);
      if (coverageData.issues && coverageData.issues.length > 0) {
        coverageIssues.push(...coverageData.issues);
      }
    } catch (error) {
      // Coverage data might not be available
    }

    // 5. Dependency Issues
    const dependencyIssues: any[] = [];
    try {
      const depIssues = await this.dependencyDetector.checkDependencies(themePath);
      if (depIssues && depIssues.length > 0) {
        dependencyIssues.push(...depIssues);
      }
    } catch (error) {
      // Package.json might not exist
    }

    // 6. Code Smells
    const codeSmells: any[] = [];
    for (const file of files.slice(0, 50)) { // Limit to first 50 files for performance
      try {
        const content = fileAPI.readFileSync(file, 'utf-8');
        const smells = await this.codeSmellDetector.detectSmells(content, file);
        if (smells.length > 0) {
          codeSmells.push({ file: path.relative(themePath, file), smells });
        }
      } catch (error) {
        // Skip files that can't be analyzed
      }
    }

    // 7. Security Vulnerabilities
    const securityVulnerabilities: any[] = [];
    for (const file of files.slice(0, 50)) { // Limit to first 50 files for performance
      try {
        const content = fileAPI.readFileSync(file, 'utf-8');
        const vulns = await this.securityDetector.detectVulnerabilities(content, file);
        if (vulns.length > 0) {
          securityVulnerabilities.push({ file: path.relative(themePath, file), vulnerabilities: vulns });
        }
      } catch (error) {
        // Skip files that can't be analyzed
      }
    }

    // Calculate summary
    const totalViolations = 
      (testFraud.violations?.length || 0) +
      externalLibViolations.length +
      mockViolations.length +
      coverageIssues.length +
      dependencyIssues.length +
      codeSmells.length +
      securityVulnerabilities.length;

    const criticalIssues = 
      (testFraud.violations?.filter((v: any) => v.severity === "critical").length || 0) +
      securityVulnerabilities.length;

    const score = Math.max(0, 100 - (totalViolations * 2) - (criticalIssues * 10));
    const passed = score >= 70 && criticalIssues === 0;

    return {
      themeName,
      themePath,
      fraudChecks: {
        testFraud,
        externalLibraryViolations,
        mockViolations,
        coverageIssues,
        dependencyIssues,
        codeSmells,
        securityVulnerabilities
      },
      summary: {
        totalViolations,
        criticalIssues,
        score,
        passed
      }
    };
  }

  /**
   * Run comprehensive fraud check on all themes
   */
  async runCheck(): Promise<void> {
    console.log('🔍 Comprehensive Fraud Checker');
    console.log('==============================\n');
    
    const themes = this.getThemes();
    console.log(`Found ${themes.length} themes to check\n`);
    
    const report: ComprehensiveFraudReport = {
      timestamp: new Date().toISOString(),
      themesChecked: themes.length,
      totalViolations: 0,
      themes: [],
      summary: {
        overallScore: 0,
        themesWithIssues: 0,
        criticalThemes: [],
        recommendations: []
      }
    };

    // Check each theme
    for (const theme of themes) {
      try {
        const themeReport = await this.checkTheme(theme);
        report.themes.push(themeReport);
        report.totalViolations += themeReport.summary.totalViolations;
        
        if (themeReport.summary.totalViolations > 0) {
          report.summary.themesWithIssues++;
        }
        
        if (themeReport.summary.criticalIssues > 0) {
          report.summary.criticalThemes.push(theme);
        }
        
        // Display progress
        const status = themeReport.summary.passed ? '✅' : '❌';
        console.log(`  ${status} ${theme}: Score ${themeReport.summary.score}/100, ${themeReport.summary.totalViolations} violations`);
        
      } catch (error) {
        console.error(`  ❌ Failed to check ${theme}: ${error}`);
      }
    }

    // Calculate overall score
    const totalScore = report.themes.reduce((sum, t) => sum + t.summary.score, 0);
    report.summary.overallScore = Math.round(totalScore / report.themes.length);

    // Generate recommendations
    this.generateRecommendations(report);

    // Display summary
    console.log('\n📊 Overall Summary');
    console.log('==================');
    console.log(`Themes Checked: ${report.themesChecked}`);
    console.log(`Total Violations: ${report.totalViolations}`);
    console.log(`Themes with Issues: ${report.summary.themesWithIssues}`);
    console.log(`Critical Themes: ${report.summary.criticalThemes.length}`);
    console.log(`Overall Score: ${report.summary.overallScore}/100`);
    
    if (report.summary.criticalThemes.length > 0) {
      console.log('\n⚠️  Critical Themes:');
      report.summary.criticalThemes.forEach(theme => {
        console.log(`  - ${theme}`);
      });
    }

    // Save detailed report
    await this.saveReport(report);
    
    // Display top recommendations
    console.log('\n📋 Top Recommendations:');
    report.summary.recommendations.slice(0, 5).forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  /**
   * Generate recommendations based on findings
   */
  private async generateRecommendations(report: ComprehensiveFraudReport): void {
    const recommendations: string[] = [];

    // External library violations
    const externalLibCount = report.themes.reduce(
      (sum, t) => sum + t.fraudChecks.externalLibraryViolations.length, 0
    );
    if (externalLibCount > 0) {
      recommendations.push(`Replace ${externalLibCount} direct external library imports with wrapped versions from external-log-lib`);
    }

    // Mock violations
    const // FRAUD_FIX: mockCount = report.themes.reduce(
      (sum, t) => sum + t.fraudChecks.mockViolations.length, 0
    );
    if (mockCount > 0) {
      recommendations.push(`Remove ${mockCount} mock usages and implement Mock-Free Test Oriented Development`);
    }

    // Coverage issues
    const coverageThemes = report.themes.filter(
      t => t.fraudChecks.coverageIssues.length > 0
    ).length;
    if (coverageThemes > 0) {
      recommendations.push(`Improve test coverage in ${coverageThemes} themes to meet minimum requirements`);
    }

    // Security vulnerabilities
    const securityCount = report.themes.reduce(
      (sum, t) => sum + t.fraudChecks.securityVulnerabilities.length, 0
    );
    if (securityCount > 0) {
      recommendations.push(`Fix ${securityCount} security vulnerabilities immediately`);
    }

    // Code quality
    const lowScoreThemes = report.themes.filter(t => t.summary.score < 50).length;
    if (lowScoreThemes > 0) {
      recommendations.push(`Refactor ${lowScoreThemes} themes with scores below 50/100`);
    }

    // Test fraud
    const testFraudThemes = report.themes.filter(
      t => t.fraudChecks.testFraud?.violations?.length > 0
    ).length;
    if (testFraudThemes > 0) {
      recommendations.push(`Fix test fraud violations in ${testFraudThemes} themes`);
    }

    report.summary.recommendations = recommendations;
  }

  /**
   * Save the comprehensive report
   */
  private async saveReport(report: ComprehensiveFraudReport): Promise<void> {
    const reportDir = path.join(process.cwd(), 'gen', 'doc', 'fraud-reports');
    
    // Ensure directory exists
    if (!fs.existsSync(reportDir)) {
      await fileAPI.createDirectory(reportDir);
    }

    // Save JSON report
    const jsonPath = path.join(reportDir, 'comprehensive-fraud-report.json');
    await fileAPI.createFile(jsonPath, JSON.stringify(report, { type: FileType.TEMPORARY }));
    console.log(`\n📄 JSON report saved to: ${jsonPath}`);

    // Generate and save markdown report
    const markdown = this.generateMarkdownReport(report);
    const mdPath = path.join(reportDir, 'comprehensive-fraud-report.md');
    await fileAPI.createFile(mdPath, markdown, { type: FileType.TEMPORARY });
    console.log(`📄 Markdown report saved to: ${mdPath}`);

    // Generate theme-specific reports
    for (const theme of report.themes) {
      if (theme.summary.totalViolations > 0) {
        const themeMarkdown = this.generateThemeMarkdown(theme);
        const themePath = path.join(reportDir, `${theme.themeName}-fraud-report.md`);
        await fileAPI.createFile(themePath, themeMarkdown, { type: FileType.TEMPORARY });
      }
    }
  }

  /**
   * Generate markdown report
   */
  private async generateMarkdownReport(report: ComprehensiveFraudReport): string {
    let md = '# Comprehensive Fraud Detection Report\n\n';
    md += `Generated: ${report.timestamp}\n\n`;
    
    // Summary
    md += '## Executive Summary\n\n';
    md += `- **Themes Checked**: ${report.themesChecked}\n`;
    md += `- **Total Violations**: ${report.totalViolations}\n`;
    md += `- **Themes with Issues**: ${report.summary.themesWithIssues}\n`;
    md += `- **Critical Themes**: ${report.summary.criticalThemes.length}\n`;
    md += `- **Overall Score**: ${report.summary.overallScore}/100\n\n`;

    // Recommendations
    md += '## Top Recommendations\n\n';
    report.summary.recommendations.forEach((rec, i) => {
      md += `${i + 1}. ${rec}\n`;
    });
    md += '\n';

    // Violation breakdown
    md += '## Violation Breakdown\n\n';
    md += '| Violation Type | Count | Themes Affected |\n';
    md += '|----------------|-------|------------------|\n';
    
    const violationTypes = [
      { name: 'External Library Direct Usage', key: "externalLibraryViolations" },
      { name: 'Mock Usage', key: "mockViolations" },
      { name: 'Coverage Issues', key: "coverageIssues" },
      { name: 'Dependency Issues', key: "dependencyIssues" },
      { name: 'Code Smells', key: "codeSmells" },
      { name: 'Security Vulnerabilities', key: "securityVulnerabilities" }
    ];

    violationTypes.forEach(type => {
      const count = report.themes.reduce(
        (sum, t) => sum + (t.fraudChecks as any)[type.key].length, 0
      );
      const affected = report.themes.filter(
        t => (t.fraudChecks as any)[type.key].length > 0
      ).length;
      md += `| ${type.name} | ${count} | ${affected} |\n`;
    });

    // Theme scores
    md += '\n## Theme Scores\n\n';
    md += '| Theme | Score | Status | Violations | Critical |\n';
    md += '|-------|-------|--------|------------|----------|\n';
    
    const sortedThemes = [...report.themes].sort((a, b) => a.summary.score - b.summary.score);
    sortedThemes.forEach(theme => {
      const status = theme.summary.passed ? '✅ Pass' : '❌ Fail';
      md += `| ${theme.themeName} | ${theme.summary.score}/100 | ${status} | ${theme.summary.totalViolations} | ${theme.summary.criticalIssues} |\n`;
    });

    // Critical issues
    if (report.summary.criticalThemes.length > 0) {
      md += '\n## Critical Issues Requiring Immediate Attention\n\n';
      report.summary.criticalThemes.forEach(themeName => {
        const theme = report.themes.find(t => t.themeName === themeName);
        if (theme) {
          md += `### ${themeName}\n\n`;
          if (theme.fraudChecks.securityVulnerabilities.length > 0) {
            md += '**Security Vulnerabilities:**\n';
            theme.fraudChecks.securityVulnerabilities.forEach((v: any) => {
              md += `- ${v.file}: ${v.vulnerabilities.length} vulnerabilities\n`;
            });
            md += '\n';
          }
        }
      });
    }

    return md;
  }

  /**
   * Generate theme-specific markdown
   */
  private async generateThemeMarkdown(theme: ThemeFraudReport): string {
    let md = `# Fraud Report: ${theme.themeName}\n\n`;
    md += `Score: ${theme.summary.score}/100\n`;
    md += `Status: ${theme.summary.passed ? 'PASSED' : 'FAILED'}\n`;
    md += `Total Violations: ${theme.summary.totalViolations}\n`;
    md += `Critical Issues: ${theme.summary.criticalIssues}\n\n`;

    // External Library Violations
    if (theme.fraudChecks.externalLibraryViolations.length > 0) {
      md += '## External Library Direct Usage\n\n';
      theme.fraudChecks.externalLibraryViolations.forEach((v: any) => {
        const relPath = path.relative(theme.themePath, v.file);
        md += `- **${relPath}** (Line ${v.line}): ${v.library}\n`;
        md += `  - ${v.suggestion}\n`;
      });
      md += '\n';
    }

    // Mock Violations
    if (theme.fraudChecks.mockViolations.length > 0) {
      md += '## Mock Usage Violations\n\n';
      theme.fraudChecks.mockViolations.forEach((v: any) => {
        const relPath = path.relative(theme.themePath, v.file);
        md += `- **${relPath}**: ${v.mocks.length} mock(s) detected\n`;
      });
      md += '\n';
    }

    // Other violations...
    // (Similar sections for other violation types)

    return md;
  }
}

// Run the comprehensive checker
if (require.main === module) {
  const checker = new ComprehensiveFraudChecker();
  checker.runCheck().catch(console.error);
}

export { ComprehensiveFraudChecker };