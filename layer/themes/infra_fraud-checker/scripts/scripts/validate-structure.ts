#!/usr/bin/env node
/**
 * CLI script for on-demand file structure validation
 * Usage: npm run validate:structure [path]
 */
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { FileStructureValidator } from '../src/validators/FileStructureValidator';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

interface ValidationReport {
  complianceScore: number;
  totalChecks: number;
  violations: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    suggestion?: string;
  }>;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const fileAPI = getFileAPI();

async function main(): Promise<void> {
  console.log('🔍 File Structure Validation');
  console.log('============================\n');

  const args = process.argv.slice(2);
  const targetPath: string = args[0] || process.cwd();

  console.log(`📁 Validating: ${targetPath}`);
  console.log(`📋 Against: FILE_STRUCTURE.vf.json\n`);

  const validator = new FileStructureValidator(targetPath);

  try {
    // Load structure definition
    console.log('Loading structure definition...');
    await validator.loadFileStructure();

    // Run validation
    console.log('Running validation...\n');
    const report: ValidationReport = await validator.validate();

    // Display summary
    console.log('📊 Validation Results:');
    console.log(`   Compliance Score: ${report.complianceScore}%`);
    console.log(`   Total Checks: ${report.totalChecks}`);
    console.log(`   Violations: ${report.violations.length}`);
    console.log('');

    console.log('📈 Violations by Severity:');
    console.log(`   🔴 Critical: ${report.summary.critical}`);
    console.log(`   🟠 High: ${report.summary.high}`);
    console.log(`   🟡 Medium: ${report.summary.medium}`);
    console.log(`   🟢 Low: ${report.summary.low}`);
    console.log('');

    // Generate reports
    const outputDir = path.join(targetPath, 'gen', 'doc');
    if (!fs.existsSync(outputDir)) {
      await fileAPI.createDirectory(outputDir);
    }

    // Save JSON report
    const jsonPath = path.join(outputDir, 'file-structure-validation.json');
    await fileAPI.createFile(jsonPath, JSON.stringify(report), { type: FileType.TEMPORARY });
    console.log(`✅ JSON report saved: ${jsonPath}`);

    // Save Markdown report
    const markdownPath = path.join(outputDir, 'file-structure-validation.md');
    const markdownReport = validator.generateMarkdownReport(report);
    await fileAPI.createFile(markdownPath, markdownReport, { type: FileType.TEMPORARY });
    console.log(`✅ Markdown report saved: ${markdownPath}`);

    // Display critical violations
    const criticalViolations = report.violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      console.log('\n⚠️  CRITICAL VIOLATIONS:');
      criticalViolations.forEach(v => {
        console.log(`   - ${v.message}`);
        if (v.suggestion) {
          console.log(`     → ${v.suggestion}`);
        }
      });
    }

    // Display high priority violations
    const highViolations = report.violations.filter(v => v.severity === 'high');
    if (highViolations.length > 0) {
      console.log('\n⚠️  HIGH PRIORITY VIOLATIONS:');
      highViolations.slice(0, 5).forEach(v => {
        console.log(`   - ${v.message}`);
      });
      if (highViolations.length > 5) {
        console.log(`   ... and ${highViolations.length - 5} more`);
      }
    }

    // Exit code based on compliance
    if (report.complianceScore === 100) {
      console.log('\n✅ Perfect compliance with FILE_STRUCTURE.vf.json!');
      process.exit(0);
    } else if (report.complianceScore >= 80) {
      console.log('\n⚠️  Good compliance with minor issues');
      process.exit(0);
    } else {
      console.log('\n❌ Poor compliance - please review the report');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default main;