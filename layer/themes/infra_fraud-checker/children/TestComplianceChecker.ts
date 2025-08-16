/**
 * Test Compliance Checker - Fraud Detection Theme
 * Verifies that all system tests properly use test-as-manual theme
 * This theme does NOT get imported by tests - it audits them
 */

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();
import { glob } from 'glob';

export interface ComplianceViolation {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning';
  suggestion: string;
}

export interface ComplianceReport {
  timestamp: Date;
  totalFiles: number;
  compliantFiles: number;
  violations: ComplianceViolation[];
  passed: boolean;
}

export class TestComplianceChecker {
  private violations: ComplianceViolation[] = new Array();
  private testFilePatterns = [
    '**/test/**/*.spec.ts',
    '**/test/**/*.spec.js',
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.spec.js',
    '**/*.test.ts',
    '**/*.test.js'
  ];

  /**
   * Check if a test file properly imports from test-as-manual
   */
  private checkTestFile(filePath: string): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const content = fileAPI.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Check for direct portal_security imports (FORBIDDEN in tests)
    lines.forEach((line, index) => {
      if (line.includes('portal_security') && !line.includes('//')) {
        violations.push({
          file: filePath,
          line: index + 1,
          issue: 'Direct import from portal_security',
          severity: 'error',
          suggestion: 'Tests must import from infra_test-as-manual/pipe instead'
        });
      }
    });

    // Check for TestPortManager import
    const hasTestPortManager = content.includes("TestPortManager");
    if (hasTestPortManager) {
      // Verify it's from the correct source
      const correctImport = content.includes('from \'../infra_test-as-manual/pipe\'') ||
                           content.includes('from "../infra_test-as-manual/pipe"') ||
                           content.includes('from \'../../../../infra_test-as-manual/pipe\'') ||
                           content.includes('from "../../../../../infra_test-as-manual/pipe"');
      
      if (!correctImport) {
        lines.forEach((line, index) => {
          if (line.includes("TestPortManager") && line.includes('import')) {
            violations.push({
              file: filePath,
              line: index + 1,
              issue: 'TestPortManager imported from wrong location',
              severity: 'error',
              suggestion: 'Import from infra_test-as-manual/pipe'
            });
          }
        });
      }
    }

    // Check for hardcoded localhost
    lines.forEach((line, index) => {
      if (line.includes('localhost:') && 
          !line.includes('baseUrl') && 
          !line.includes('//') &&
          !line.includes("TestPortManager")) {
        violations.push({
          file: filePath,
          line: index + 1,
          issue: 'Hardcoded localhost URL',
          severity: 'error',
          suggestion: 'Use baseUrl from TestPortManager allocation'
        });
      }
    });

    // Check for hardcoded ports (34xx range)
    lines.forEach((line, index) => {
      const portMatch = line.match(/34\d{2}/);
      if (portMatch && !line.includes('//') && !line.includes('default')) {
        violations.push({
          file: filePath,
          line: index + 1,
          issue: `Hardcoded port ${portMatch[0]}`,
          severity: 'warning',
          suggestion: 'Use dynamic port from TestPortManager'
        });
      }
    });

    // Check for process.env.PORT or process.env.TEST_PORT usage
    lines.forEach((line, index) => {
      if ((line.includes('process.env.PORT') || line.includes('process.env.TEST_PORT')) &&
          !line.includes('=')) {  // Reading, not setting
        // This is OK if test-as-manual sets it up
        violations.push({
          file: filePath,
          line: index + 1,
          issue: 'Direct process.env port access',
          severity: 'warning',
          suggestion: 'Ensure TestPortManager is imported first to setup environment'
        });
      }
    });

    return violations;
  }

  /**
   * Run compliance check on all test files
   */
  async checkCompliance(rootDir: string): Promise<ComplianceReport> {
    console.log('🔍 Fraud Checker: Starting Test Compliance Audit...');
    
    const testFiles: string[] = [];
    
    // Find all test files
    for (const pattern of this.testFilePatterns) {
      const files = await glob(pattern, { 
        cwd: rootDir,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });
      testFiles.push(...files);
    }

    console.log(`📋 Found ${testFiles.length} test files to audit`);

    // Check each file
    let compliantCount = 0;
    for (const file of testFiles) {
      const fileViolations = this.checkTestFile(file);
      if (fileViolations.length === 0) {
        compliantCount++;
      } else {
        this.violations.push(...fileViolations);
      }
    }

    // Generate report
    const report: ComplianceReport = {
      timestamp: new Date(),
      totalFiles: testFiles.length,
      compliantFiles: compliantCount,
      violations: this.violations,
      passed: this.violations.filter(v => v.severity === 'error').length === 0
    };

    // Log summary
    console.log('\n📊 Compliance Summary:');
    console.log(`   Total test files: ${report.totalFiles}`);
    console.log(`   Compliant files: ${report.compliantFiles}`);
    console.log(`   Violations: ${report.violations.length}`);
    
    if (report.passed) {
      console.log('   ✅ All tests properly use test-as-manual theme');
    } else {
      console.log('   ❌ Critical violations found - tests bypassing test-as-manual');
    }

    return report;
  }

  /**
   * Generate detailed violation report
   */
  generateViolationReport(report: ComplianceReport): string {
    let output = '# Test Compliance Violation Report\n\n';
    output += `Generated: ${report.timestamp.toISOString()}\n\n`;
    
    if (report.violations.length === 0) {
      output += '✅ **No violations found!** All tests properly use test-as-manual theme.\n';
      return output;
    }

    // Group violations by file
    const byFile = new Map<string, ComplianceViolation[]>();
    for (const violation of report.violations) {
      if (!byFile.has(violation.file)) {
        byFile.set(violation.file, []);
      }
      byFile.get(violation.file)!.push(violation);
    }

    // Generate report
    output += `## Found ${report.violations.length} violations in ${byFile.size} files\n\n`;
    
    for (const [file, violations] of byFile) {
      output += `### ${path.basename(file)}\n`;
      output += `Path: \`${file}\`\n\n`;
      
      for (const v of violations) {
        const icon = v.severity === 'error' ? '❌' : '⚠️';
        output += `${icon} **Line ${v.line}**: ${v.issue}\n`;
        output += `   💡 ${v.suggestion}\n\n`;
      }
    }

    return output;
  }

  /**
   * Auto-fix common violations
   */
  async autoFix(rootDir: string): Promise<number> {
    console.log('🔧 Attempting auto-fix of violations...');
    let fixCount = 0;

    const testFiles = await glob('**/test/**/*.spec.ts', {
      cwd: rootDir,
      absolute: true,
      ignore: ['**/node_modules/**']
    });

    for (const file of testFiles) {
      let content = fileAPI.readFileSync(file, 'utf-8');
      let modified = false;

      // Fix wrong TestPortManager imports
      if (content.includes("TestPortManager")) {
        const wrongImportRegex = /from ['"].*portal_security.*['"]/g;
        if (wrongImportRegex.test(content)) {
          content = content.replace(wrongImportRegex, 'from \'../infra_test-as-manual/pipe\'');
          modified = true;
          fixCount++;
        }
      }

      // Fix hardcoded localhost URLs
      content = content.replace(
        /PORTAL_URL = `http:\/\/localhost:\${testPort}`/g,
        'PORTAL_URL = testAllocation.baseUrl'
      );
      if (content.includes('testAllocation.baseUrl')) {
        modified = true;
        fixCount++;
      }

      if (modified) {
        // Use FileAPI for writing fixed content
        await fileAPI.writeFile(file, content, {
          type: FileType.TEST,
          backup: true
        });
        console.log(`   Fixed: ${path.basename(file)}`);
      }
    }

    console.log(`✅ Auto-fixed ${fixCount} violations`);
    return fixCount;
  }
}

// Export singleton
export const fraudChecker = new TestComplianceChecker();