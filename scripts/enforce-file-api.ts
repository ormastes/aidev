#!/usr/bin/env ts-node

/**
 * File API Enforcement CLI
 * Scans project for direct file operations and optionally fixes them
 */

import { fs } from '../layer/themes/infra_external-log-lib/dist';
import { path } from '../layer/themes/infra_external-log-lib/dist';
import * as glob from 'glob';
import { FileCreationFraudChecker } from '../layer/themes/infra_external-log-lib/src/fraud-detector/FileCreationFraudChecker';
import { getEnforcementPolicy, applyEnforcementRules } from '../layer/themes/infra_external-log-lib/src/config/enforcement.config';
import { getFileAPI, FileType } from '../layer/themes/infra_external-log-lib/pipe';

const fileAPI = getFileAPI();

interface EnforceOptions {
  scan?: boolean;
  fix?: boolean;
  report?: boolean;
  directory?: string;
  pattern?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

class FileAPIEnforcer {
  private fraudChecker: FileCreationFraudChecker;
  private policy = getEnforcementPolicy();
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.fraudChecker = new FileCreationFraudChecker(basePath);
  }

  async enforce(options: EnforceOptions): Promise<void> {
    console.log('🔒 File API Enforcement Tool\n');
    console.log(`Policy: ${this.policy.mode}`);
    console.log(`Rules: ${this.policy.rules.length}`);
    console.log(`Exemptions: ${this.policy.exemptions.length}\n`);

    const directory = options.directory || this.basePath;

    if (options.scan || (!options.fix && !options.report)) {
      await this.scan(directory, options);
    }

    if (options.fix) {
      await this.fix(directory, options);
    }

    if (options.report) {
      await this.generateReport(directory, options);
    }
  }

  private async scan(directory: string, options: EnforceOptions): Promise<void> {
    console.log('📂 Scanning directory:', directory);
    
    const violations = await this.fraudChecker.scanDirectory(directory, {
      excludePaths: ['node_modules', '.git', 'dist', 'coverage'],
      includeSampleApps: false
    });

    if (violations.size === 0) {
      console.log('\n✅ No violations found!');
      return;
    }

    console.log(`\n⚠️  Found violations in ${violations.size} files:\n`);

    let totalViolations = 0;
    const criticalFiles: string[] = [];
    const fixableFiles: string[] = [];

    for (const [filePath, result] of violations) {
      const relativePath = path.relative(this.basePath, filePath);
      totalViolations += result.violations.length;

      if (result.violations.some(v => v.severity === 'critical')) {
        criticalFiles.push(relativePath);
      }

      if (result.canAutoFix) {
        fixableFiles.push(relativePath);
      }

      if (options.verbose) {
        console.log(`📄 ${relativePath}`);
        for (const violation of result.violations) {
          const icon = violation.severity === 'critical' ? '🚨' :
                       violation.severity === 'high' ? '⚠️' :
                       violation.severity === 'medium' ? '📌' : 'ℹ️';
          console.log(`  ${icon} Line ${violation.line}: ${violation.message}`);
        }
        console.log();
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  Total files with violations: ${violations.size}`);
    console.log(`  Total violations: ${totalViolations}`);
    console.log(`  Critical files: ${criticalFiles.length}`);
    console.log(`  Auto-fixable files: ${fixableFiles.length}`);

    if (criticalFiles.length > 0 && !options.verbose) {
      console.log('\n🚨 Critical files (run with --verbose for details):');
      criticalFiles.slice(0, 5).forEach(f => console.log(`  - ${f}`));
      if (criticalFiles.length > 5) {
        console.log(`  ... and ${criticalFiles.length - 5} more`);
      }
    }

    if (fixableFiles.length > 0) {
      console.log('\n💡 Run with --fix to automatically fix violations in:');
      fixableFiles.slice(0, 5).forEach(f => console.log(`  - ${f}`));
      if (fixableFiles.length > 5) {
        console.log(`  ... and ${fixableFiles.length - 5} more`);
      }
    }
  }

  private async fix(directory: string, options: EnforceOptions): Promise<void> {
    if (options.dryRun) {
      console.log('🔍 DRY RUN - No files will be modified\n');
    } else {
      console.log('🔧 Fixing violations...\n');
    }

    const violations = await this.fraudChecker.scanDirectory(directory, {
      excludePaths: ['node_modules', '.git', 'dist', 'coverage']
    });

    let fixedCount = 0;
    let failedCount = 0;

    for (const [filePath, result] of violations) {
      if (!result.canAutoFix) continue;

      const relativePath = path.relative(this.basePath, filePath);

      if (options.verbose) {
        console.log(`Fixing: ${relativePath}`);
      }

      try {
        if (!options.dryRun) {
          const fixed = await this.fraudChecker.autoFix(filePath);
          if (fixed) {
            fixedCount++;
            console.log(`  ✅ Fixed: ${relativePath}`);
          } else {
            failedCount++;
            console.log(`  ❌ Failed to fix: ${relativePath}`);
          }
        } else {
          console.log(`  Would fix: ${relativePath}`);
          fixedCount++;
        }
      } catch (error: any) {
        failedCount++;
        console.error(`  ❌ Error fixing ${relativePath}: ${error.message}`);
      }
    }

    console.log('\n📊 Fix Summary:');
    console.log(`  Files fixed: ${fixedCount}`);
    console.log(`  Files failed: ${failedCount}`);

    if (options.dryRun) {
      console.log('\n💡 Run without --dry-run to apply fixes');
    }
  }

  private async generateReport(directory: string, options: EnforceOptions): Promise<void> {
    console.log('📝 Generating enforcement report...\n');

    await this.fraudChecker.scanDirectory(directory, {
      excludePaths: ['node_modules', '.git', 'dist', 'coverage']
    });

    const reportPath = await this.fraudChecker.generateReport({
      reportPath: 'gen/doc/file-api-enforcement-report.md'
    });

    console.log(`✅ Report generated: ${reportPath}`);

    // Also generate a JSON report
    const jsonPath = await this.fraudChecker.exportViolations(
      'gen/doc/file-api-violations.json'
    );
    console.log(`✅ JSON data exported: ${jsonPath}`);

    // Generate compliance score
    const violations = this.fraudChecker['violations'];
    const totalFiles = glob.sync('**/*.{ts,js,tsx,jsx}', {
      cwd: directory,
      ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    }).length;

    const violatingFiles = violations.size;
    const complianceScore = Math.round((1 - violatingFiles / totalFiles) * 100);

    console.log('\n📊 Compliance Score:');
    console.log(`  ${complianceScore}% of files are compliant`);
    console.log(`  ${violatingFiles} files need migration`);
    console.log(`  ${totalFiles - violatingFiles} files are already compliant`);

    // Create a badge
    const badge = complianceScore >= 90 ? '🟢' :
                  complianceScore >= 70 ? '🟡' :
                  complianceScore >= 50 ? '🟠' : '🔴';

    console.log(`\n${badge} Overall Status: ${
      complianceScore >= 90 ? 'Excellent' :
      complianceScore >= 70 ? 'Good' :
      complianceScore >= 50 ? 'Needs Improvement' : 'Critical'
    }`);
  }
}

// CLI parsing
function parseArgs(args: string[]): EnforceOptions {
  const options: EnforceOptions = {
    scan: true,
    verbose: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--scan':
      case '-s':
        options.scan = true;
        break;
      
      case '--fix':
      case '-f':
        options.fix = true;
        break;
      
      case '--report':
      case '-r':
        options.report = true;
        break;
      
      case '--directory':
      case '-d':
        options.directory = args[++i];
        break;
      
      case '--pattern':
      case '-p':
        options.pattern = args[++i];
        break;
      
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      
      case '--dry-run':
        options.dryRun = true;
        break;
      
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
File API Enforcement Tool

Usage: enforce-file-api [options]

Options:
  --scan, -s          Scan for violations (default)
  --fix, -f           Auto-fix violations where possible
  --report, -r        Generate detailed report
  --directory, -d     Directory to scan (default: current)
  --pattern, -p       File pattern to match
  --verbose, -v       Show detailed output
  --dry-run           Preview fixes without applying
  --help, -h          Show this help

Examples:
  enforce-file-api                    # Scan current directory
  enforce-file-api --fix              # Fix violations
  enforce-file-api --fix --dry-run    # Preview fixes
  enforce-file-api --report           # Generate report
  enforce-file-api -d ./src --fix     # Fix violations in src/
`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const options = parseArgs(args);
  const enforcer = new FileAPIEnforcer();
  
  try {
    await enforcer.enforce(options);
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);