import { fileAPI } from '../utils/file-api';
#!/usr/bin/env bun
/**
 * Main fraud check runner for the infra_fraud-checker theme
 * Consolidates all fraud checking logic in one place
 */

import * as path from 'node:path';
import * as fs from 'fs/promises';
import { ComprehensiveFraudChecker } from '../src/comprehensive-checker';
import DirectFileAccessScanner from '../src/scanners/direct-file-access-scanner';

interface FraudCheckOptions {
  mode?: "comprehensive" | 'direct-access' | 'all';
  autoFix?: boolean;
  onlyDirectImports?: boolean;
  outputFormat?: 'console' | 'json' | "markdown";
  outputPath?: string;
}

class FraudCheckRunner {
  private projectPath: string;
  
  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  async runComprehensiveCheck(options: FraudCheckOptions = {}) {
    console.log('🚀 Starting Comprehensive Fraud Check');
    console.log('=====================================\n');

    const checker = new ComprehensiveFraudChecker({
      projectPath: this.projectPath,
      includeTests: !options.onlyDirectImports,
      includeDirectImports: true,
      includeWebUI: !options.onlyDirectImports,
      autoFix: options.autoFix,
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/.jj/**',
        '**/temp/**',
        '**/coverage/**'
      ]
    });

    try {
      const report = await checker.runComprehensiveCheck();
      
      // Print to console
      if (options.outputFormat !== 'json') {
        checker.printReport(report);
      }
      
      // Save report
      if (options.outputPath) {
        const reportPath = path.join(this.projectPath, options.outputPath);
        await fileAPI.mkdir(path.dirname(reportPath), { recursive: true });
        
        if (options.outputFormat === 'json') {
          await fileAPI.writeFile(reportPath, JSON.stringify(report, null, 2));
        } else if (options.outputFormat === "markdown") {
          const markdownReport = this.generateMarkdownReport(report);
          await fileAPI.writeFile(reportPath, markdownReport);
        }
        
        console.log(`\n📝 Report saved to: ${reportPath}`);
      }
      
      return report;
    } catch (error) {
      console.error('\n❌ Error running comprehensive check:', error);
      throw error;
    }
  }

  async runDirectAccessScan(options: FraudCheckOptions = {}) {
    console.log('🔍 Starting Direct File Access Scan');
    console.log('====================================\n');

    const scanner = new DirectFileAccessScanner(this.projectPath);
    
    try {
      const results = await scanner.scan();
      
      // Print to console
      if (options.outputFormat !== 'json') {
        scanner.printReport(results);
      }
      
      // Save report
      if (options.outputPath) {
        const reportPath = path.join(this.projectPath, options.outputPath);
        await fileAPI.mkdir(path.dirname(reportPath), { recursive: true });
        
        if (options.outputFormat === 'json') {
          await fileAPI.writeFile(reportPath, JSON.stringify(results, null, 2));
        } else if (options.outputFormat === "markdown") {
          const markdownReport = this.generateDirectAccessReport(results);
          await fileAPI.writeFile(reportPath, markdownReport);
        }
        
        console.log(`\n📝 Report saved to: ${reportPath}`);
      }
      
      return results;
    } catch (error) {
      console.error('\n❌ Error running direct access scan:', error);
      throw error;
    }
  }

  async runAllChecks(options: FraudCheckOptions = {}) {
    console.log('🔧 Running All Fraud Checks');
    console.log('===========================\n');

    const results = {
      comprehensive: null as any,
      directAccess: null as any,
      timestamp: new Date().toISOString()
    };

    // Run comprehensive check
    try {
      results.comprehensive = await this.runComprehensiveCheck(options);
    } catch (error) {
      console.error('Failed comprehensive check:', error);
    }

    // Run direct access scan
    try {
      results.directAccess = await this.runDirectAccessScan(options);
    } catch (error) {
      console.error('Failed direct access scan:', error);
    }

    // Generate combined report
    if (options.outputPath) {
      const reportPath = path.join(this.projectPath, options.outputPath);
      const combinedReport = this.generateCombinedReport(results);
      await fileAPI.writeFile(reportPath, combinedReport);
      console.log(`\n📝 Combined report saved to: ${reportPath}`);
    }

    return results;
  }

  private generateMarkdownReport(report: any): string {
    const now = new Date().toISOString();
    
    let md = `# Fraud Check Report\n\n`;
    md += `Generated: ${now}\n\n`;
    md += `## Summary\n\n`;
    md += `| Severity | Count |\n`;
    md += `|----------|-------|\n`;
    md += `| Critical | ${report.summary?.criticalIssues || 0} |\n`;
    md += `| High | ${report.summary?.highIssues || 0} |\n`;
    md += `| Medium | ${report.summary?.mediumIssues || 0} |\n`;
    md += `| Low | ${report.summary?.lowIssues || 0} |\n`;
    md += `| **Total** | **${report.summary?.totalIssues || 0}** |\n\n`;

    if (report.summary?.fixedIssues > 0) {
      md += `✅ **Auto-fixed**: ${report.summary.fixedIssues} issues\n\n`;
    }

    // Add detailed sections
    if (report.categories?.directImports?.length > 0) {
      md += `## Direct External Imports (${report.categories.directImports.length})\n\n`;
      report.categories.directImports.slice(0, 10).forEach((issue: any) => {
        md += `- \`${issue.file}:${issue.line}\`\n`;
        md += `  ${issue.message}\n\n`;
      });
    }

    if (report.categories?.mockUsage?.length > 0) {
      md += `## Mock Usage Violations (${report.categories.mockUsage.length})\n\n`;
      report.categories.mockUsage.slice(0, 10).forEach((issue: any) => {
        md += `- \`${issue.file}:${issue.line}\` - ${issue.message}\n`;
      });
    }

    if (report.recommendations?.length > 0) {
      md += `\n## Recommendations\n\n`;
      report.recommendations.forEach((rec: string) => {
        md += `- ${rec}\n`;
      });
    }

    return md;
  }

  private generateDirectAccessReport(results: any): string {
    const now = new Date().toISOString();
    
    let md = `# Direct File Access Scan Report\n\n`;
    md += `Generated: ${now}\n\n`;
    md += `## Summary\n\n`;
    md += `- Total violations: ${results.totalViolations}\n`;
    md += `- Files affected: ${results.filesAffected}\n\n`;

    if (results.patternCounts && results.patternCounts.size > 0) {
      md += `## Most Common Patterns\n\n`;
      md += `| Pattern | Count |\n`;
      md += `|---------|-------|\n`;
      
      const sortedPatterns = Array.from(results.patternCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      sortedPatterns.forEach(([pattern, count]) => {
        md += `| ${pattern} | ${count} |\n`;
      });
      md += `\n`;
    }

    md += `## Recommendations\n\n`;
    md += `1. Replace direct fs operations with FileCreationAPI\n`;
    md += `2. Enable enforcement: export ENFORCE_FILE_API=true\n`;
    md += `3. Review critical violations immediately\n`;

    return md;
  }

  private generateCombinedReport(results: any): string {
    const now = new Date().toISOString();
    
    let md = `# Combined Fraud Check Report\n\n`;
    md += `Generated: ${now}\n\n`;
    
    if (results.comprehensive) {
      md += `## Comprehensive Check Results\n\n`;
      md += this.generateMarkdownReport(results.comprehensive);
      md += `\n---\n\n`;
    }
    
    if (results.directAccess) {
      md += `## Direct Access Scan Results\n\n`;
      md += this.generateDirectAccessReport(results.directAccess);
    }
    
    return md;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log(`
Fraud Checker - Comprehensive code quality and security scanner

Usage: bun run-fraud-check.ts [options]

Options:
  --mode <type>      Check mode: comprehensive, direct-access, all (default: all)
  --fix              Auto-fix issues where possible
  --imports-only     Only check for direct external imports
  --format <type>    Output format: console, json, markdown (default: console)
  --output <path>    Save report to file
  --help, -h         Show this help message

Examples:
  # Run all checks and display in console
  bun run-fraud-check.ts
  
  # Run comprehensive check with auto-fix
  bun run-fraud-check.ts --mode comprehensive --fix
  
  # Run direct access scan and save as JSON
  bun run-fraud-check.ts --mode direct-access --format json --output report.json
  
  # Run all checks and save markdown report
  bun run-fraud-check.ts --format markdown --output gen/doc/fraud-report.md
    `);
    process.exit(0);
  }

  // Parse options
  const options: FraudCheckOptions = {
    mode: 'all',
    autoFix: args.includes('--fix'),
    onlyDirectImports: args.includes('--imports-only'),
    outputFormat: 'console',
    outputPath: undefined
  };

  const modeIndex = args.indexOf('--mode');
  if (modeIndex !== -1 && args[modeIndex + 1]) {
    options.mode = args[modeIndex + 1] as any;
  }

  const formatIndex = args.indexOf('--format');
  if (formatIndex !== -1 && args[formatIndex + 1]) {
    options.outputFormat = args[formatIndex + 1] as any;
  }

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputPath = args[outputIndex + 1];
  }

  // Run checks
  const runner = new FraudCheckRunner();
  
  try {
    let exitCode = 0;
    
    switch (options.mode) {
      case "comprehensive":
        const compReport = await runner.runComprehensiveCheck(options);
        if (compReport.summary?.criticalIssues > 0) exitCode = 1;
        break;
        
      case 'direct-access':
        const scanResults = await runner.runDirectAccessScan(options);
        if (scanResults.totalViolations > 0) exitCode = 1;
        break;
        
      case 'all':
      default:
        const allResults = await runner.runAllChecks(options);
        if (allResults.comprehensive?.summary?.criticalIssues > 0 || 
            allResults.directAccess?.totalViolations > 0) {
          exitCode = 1;
        }
        break;
    }
    
    process.exit(exitCode);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module || process.argv[1] === import.meta.url) {
  main().catch(console.error);
}

export { FraudCheckRunner, FraudCheckOptions };