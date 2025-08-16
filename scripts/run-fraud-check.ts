#!/usr/bin/env bun
/**
 * Run comprehensive fraud check on the codebase
 * Detects direct external imports, mock usage, and other violations
 */

import { ComprehensiveFraudChecker } from '../layer/themes/infra_fraud-checker/src/comprehensive-checker';
import { path } from '../layer/themes/infra_external-log-lib/dist';

async function main() {
  const args = process.argv.slice(2);
  const autoFix = args.includes('--fix');
  const onlyDirectImports = args.includes('--imports-only');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Fraud Checker - Detect code quality and security issues

Usage: bun scripts/run-fraud-check.ts [options]

Options:
  --fix           Auto-fix direct import issues
  --imports-only  Only check for direct external imports
  --help, -h      Show this help message

Examples:
  bun scripts/run-fraud-check.ts
  bun scripts/run-fraud-check.ts --fix
  bun scripts/run-fraud-check.ts --imports-only --fix
    `);
    process.exit(0);
  }

  console.log('🚀 Starting Comprehensive Fraud Check');
  console.log('=====================================\n');

  const checker = new ComprehensiveFraudChecker({
    projectPath: process.cwd(),
    includeTests: !onlyDirectImports,
    includeDirectImports: true,
    includeWebUI: !onlyDirectImports,
    autoFix: autoFix,
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
    
    // Print detailed report
    checker.printReport(report);
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'gen/doc', `fraud-report-${Date.now()}.json`);
    await checker.saveReport(report, reportPath);
    
    // Create markdown summary
    const markdownReport = generateMarkdownReport(report);
    const mdPath = path.join(process.cwd(), 'gen/doc', 'FRAUD_CHECK_SUMMARY.md');
    const fs = require('fs').promises;
    await fs.writeFile(mdPath, markdownReport);
    console.log(`\n📝 Markdown report saved to: ${mdPath}`);
    
    // Exit with appropriate code
    if (report.summary.criticalIssues > 0) {
      console.log('\n❌ Critical issues found. Please fix them before proceeding.');
      process.exit(1);
    } else if (report.summary.highIssues > 0 && !autoFix) {
      console.log('\n⚠️  High severity issues found. Consider running with --fix flag.');
      process.exit(1);
    } else if (report.summary.totalIssues === 0) {
      console.log('\n✅ All checks passed! No issues found.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some issues found but none are critical.');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error running fraud check:', error);
    process.exit(1);
  }
}

function generateMarkdownReport(report: any): string {
  const now = new Date().toISOString();
  
  let md = `# Fraud Check Report

Generated: ${now}

## Summary

| Severity | Count |
|----------|-------|
| Critical | ${report.summary.criticalIssues} |
| High | ${report.summary.highIssues} |
| Medium | ${report.summary.mediumIssues} |
| Low | ${report.summary.lowIssues} |
| **Total** | **${report.summary.totalIssues}** |
`;

  if (report.summary.fixedIssues > 0) {
    md += `\n✅ **Auto-fixed**: ${report.summary.fixedIssues} issues\n`;
  }

  // Direct imports section
  if (report.categories.directImports.length > 0) {
    md += `\n## Direct External Imports (${report.categories.directImports.length})\n\n`;
    md += `These files are importing Node.js modules directly instead of using external-log-lib:\n\n`;
    
    const byModule: Record<string, any[]> = {};
    for (const issue of report.categories.directImports) {
      const module = issue.message.match(/'([^']+)'/)?.[1] || 'unknown';
      if (!byModule[module]) byModule[module] = [];
      byModule[module].push(issue);
    }
    
    for (const [module, issues] of Object.entries(byModule)) {
      md += `### Module: ${module} (${issues.length} violations)\n\n`;
      for (const issue of issues.slice(0, 10)) {
        md += `- \`${issue.file}:${issue.line}\`\n`;
        md += `  \`\`\`typescript\n  ${issue.code}\n  \`\`\`\n`;
        if (issue.suggestion) {
          md += `  **Fix**: \`${issue.suggestion}\`\n`;
        }
        md += '\n';
      }
      if (issues.length > 10) {
        md += `_...and ${issues.length - 10} more_\n\n`;
      }
    }
  }

  // Mock usage section
  if (report.categories.mockUsage.length > 0) {
    md += `\n## Mock Usage Violations (${report.categories.mockUsage.length})\n\n`;
    for (const issue of report.categories.mockUsage.slice(0, 10)) {
      md += `- \`${issue.file}:${issue.line}\` - ${issue.message}\n`;
    }
    if (report.categories.mockUsage.length > 10) {
      md += `\n_...and ${report.categories.mockUsage.length - 10} more_\n`;
    }
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    md += `\n## Recommendations\n\n`;
    for (const rec of report.recommendations) {
      md += `- ${rec}\n`;
    }
  }

  md += `\n## Next Steps\n\n`;
  if (report.categories.directImports.length > 0) {
    md += `1. Run the migration script to fix direct imports:\n`;
    md += `   \`\`\`bash\n   bun scripts/run-fraud-check.ts --fix\n   \`\`\`\n\n`;
  }
  
  md += `2. Review and test the changes\n`;
  md += `3. Commit the fixes\n`;
  md += `4. Run the fraud check again to verify\n`;

  return md;
}

// Run the main function
main().catch(console.error);