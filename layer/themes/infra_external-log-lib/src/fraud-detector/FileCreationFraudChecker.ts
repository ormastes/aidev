/**
 * FileCreationFraudChecker - Detects and prevents unauthorized file creation patterns
 * 
 * This module scans code for direct file system API usage bypassing the
 * FileCreationAPI and reports violations. It integrates with the fraud-checker
 * theme to provide comprehensive security validation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { FileCreationAPI, FileType } from '../file-manager/FileCreationAPI';
import { isDirectFSAllowed, strictEnforcement } from '../config/enforcement-config';

export interface FraudPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  autoFix?: boolean;
}

export interface FraudDetectionResult {
  filePath: string;
  violations: Violation[];
  suggestions: string[];
  canAutoFix: boolean;
}

export interface Violation {
  line: number;
  column: number;
  code: string;
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface FraudCheckOptions {
  excludePaths?: string[];
  includeSampleApps?: boolean;
  autoFix?: boolean;
  reportPath?: string;
}

export class FileCreationFraudChecker {
  private patterns: FraudPattern[];
  private fileAPI: FileCreationAPI;
  private basePath: string;
  private violations: Map<string, FraudDetectionResult> = new Map();

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.fileAPI = new FileCreationAPI(basePath, false);
    this.patterns = this.initializePatterns();
  }

  private initializePatterns(): FraudPattern[] {
    return [
      // Direct fs module usage
      {
        name: 'direct_fs_writeFile',
        pattern: /fs\.writeFile(?:Sync)?\s*\(/,
        severity: 'high',
        message: 'Direct fs.writeFile usage detected. Use FileCreationAPI instead.',
        autoFix: true
      },
      {
        name: 'direct_fs_promises_writeFile',
        pattern: /fs\.promises\.writeFile\s*\(/,
        severity: 'high',
        message: 'Direct fs.promises.writeFile usage detected. Use FileCreationAPI instead.',
        autoFix: true
      },
      {
        name: 'direct_fs_createWriteStream',
        pattern: /fs\.createWriteStream\s*\(/,
        severity: 'medium',
        message: 'Direct fs.createWriteStream usage detected. Consider using FileCreationAPI for controlled file creation.',
        autoFix: false
      },
      {
        name: 'direct_fs_appendFile',
        pattern: /fs\.appendFile(?:Sync)?\s*\(/,
        severity: 'medium',
        message: 'Direct fs.appendFile usage detected. Use FileCreationAPI.writeFile with append option.',
        autoFix: true
      },
      {
        name: 'direct_fs_mkdir',
        pattern: /fs\.mkdir(?:Sync)?\s*\(/,
        severity: 'medium',
        message: 'Direct fs.mkdir usage detected. Use FileCreationAPI.createDirectory instead.',
        autoFix: true
      },
      
      // Deno file operations
      {
        name: 'deno_writeTextFile',
        pattern: /Deno\.writeTextFile\s*\(/,
        severity: 'high',
        message: 'Deno.writeTextFile detected. Use FileCreationAPI for cross-platform compatibility.',
        autoFix: true
      },
      {
        name: 'deno_writeFile',
        pattern: /Deno\.writeFile\s*\(/,
        severity: 'high',
        message: 'Deno.writeFile detected. Use FileCreationAPI for cross-platform compatibility.',
        autoFix: true
      },

      // Node child_process file operations
      {
        name: 'exec_redirect',
        pattern: /exec(?:Sync)?\s*\([^)]*>\s*['"`][^'"`]+['"`]/,
        severity: 'critical',
        message: 'Shell redirect to file detected. This bypasses all file creation controls.',
        autoFix: false
      },
      {
        name: 'spawn_redirect',
        pattern: /spawn(?:Sync)?\s*\([^)]*>\s*['"`][^'"`]+['"`]/,
        severity: 'critical',
        message: 'Spawn with file redirect detected. Use FileCreationAPI for controlled output.',
        autoFix: false
      },

      // Backup file patterns
      {
        name: 'backup_file_creation',
        pattern: /['"`][^'"`]*\.(bak|backup|old|orig|copy\d*)['"]/,
        severity: 'high',
        message: 'Backup file pattern detected. Use version control instead of backup files.',
        autoFix: false
      },

      // Suspicious file locations
      {
        name: 'root_file_creation',
        pattern: /writeFile[^(]*\(['"`]\/[^'"`]*['"`]/,
        severity: 'critical',
        message: 'Attempting to write to root directory. This violates file structure rules.',
        autoFix: false
      },
      {
        name: 'dotfile_creation',
        pattern: /writeFile[^(]*\(['"`]\.[^/\\]+['"`]/,
        severity: 'medium',
        message: 'Creating hidden/dot files. Ensure this is intentional and documented.',
        autoFix: false
      },

      // Eval and dynamic code execution
      {
        name: 'eval_file_operation',
        pattern: /eval\s*\([^)]*writeFile/,
        severity: 'critical',
        message: 'File operation within eval detected. This is a severe security risk.',
        autoFix: false
      },
      {
        name: 'function_constructor_file',
        pattern: /new\s+Function\s*\([^)]*writeFile/,
        severity: 'critical',
        message: 'File operation in Function constructor. This bypasses static analysis.',
        autoFix: false
      }
    ];
  }

  /**
   * Scan a file for fraud patterns
   */
  async scanFile(filePath: string): Promise<FraudDetectionResult> {
    // Check if file is exempt from enforcement
    const relativePath = path.relative(this.basePath, filePath);
    const isExempt = isDirectFSAllowed(relativePath);
    
    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const violations: Violation[] = [];
    const suggestions: string[] = [];
    
    // Add exemption notice if applicable
    if (isExempt) {
      suggestions.push(`Note: ${relativePath} is EXEMPT (sample/demo theme) - direct fs allowed`);
    }

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const pattern of this.patterns) {
        if (pattern.pattern.test(line)) {
          const match = line.match(pattern.pattern);
          if (match) {
            // Adjust severity for exempt files
            const violationSeverity = isExempt ? 'low' : pattern.severity;
            
            violations.push({
              line: lineNum + 1,
              column: match.index || 0,
              code: line.trim(),
              pattern: pattern.name,
              severity: violationSeverity as any,
              message: isExempt 
                ? `${pattern.message} (EXEMPT - allowed for sample/demo)`
                : pattern.message
            });

            // Add fix suggestion
            if (pattern.autoFix) {
              suggestions.push(this.generateFixSuggestion(pattern.name, line));
            }
          }
        }
      }
    }

    const result: FraudDetectionResult = {
      filePath,
      violations,
      suggestions,
      canAutoFix: violations.some(v => 
        this.patterns.find(p => p.name === v.pattern)?.autoFix || false
      )
    };

    this.violations.set(filePath, result);
    return result;
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(
    dirPath: string,
    options: FraudCheckOptions = {}
  ): Promise<Map<string, FraudDetectionResult>> {
    const results = new Map<string, FraudDetectionResult>();
    const excludePaths = options.excludePaths || ['node_modules', '.git', 'dist', 'coverage'];

    const scanRecursive = async (currentPath: string) => {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(this.basePath, fullPath);

        // Skip excluded paths
        if (excludePaths.some(exclude => relativePath.includes(exclude))) {
          continue;
        }

        // Skip sample apps unless explicitly included
        if (!options.includeSampleApps && relativePath.includes('demo/')) {
          continue;
        }

        if (entry.isDirectory()) {
          await scanRecursive(fullPath);
        } else if (entry.isFile() && this.isSourceFile(entry.name)) {
          const result = await this.scanFile(fullPath);
          if (result.violations.length > 0) {
            results.set(fullPath, result);
          }
        }
      }
    };

    await scanRecursive(dirPath);
    return results;
  }

  /**
   * Check if file is a source file
   */
  private isSourceFile(fileName: string): boolean {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    return extensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Generate fix suggestion
   */
  private generateFixSuggestion(patternName: string, code: string): string {
    switch (patternName) {
      case 'direct_fs_writeFile':
        return code.replace(
          /fs\.writeFile(Sync)?\s*\(/,
          'await fileAPI.createFile('
        );
      
      case 'direct_fs_promises_writeFile':
        return code.replace(
          /fs\.promises\.writeFile\s*\(/,
          'await fileAPI.createFile('
        );
      
      case 'direct_fs_appendFile':
        return code.replace(
          /fs\.appendFile(Sync)?\s*\(/,
          'await fileAPI.writeFile('
        );
      
      case 'direct_fs_mkdir':
        return code.replace(
          /fs\.mkdir(Sync)?\s*\(/,
          'await fileAPI.createDirectory('
        );
      
      case 'deno_writeTextFile':
        return code.replace(
          /Deno\.writeTextFile\s*\(/,
          'await fileAPI.createFile('
        );
      
      default:
        return `// TODO: Replace with FileCreationAPI\n// ${code}`;
    }
  }

  /**
   * Auto-fix violations
   */
  async autoFix(filePath: string): Promise<boolean> {
    const result = this.violations.get(filePath);
    if (!result || !result.canAutoFix) {
      return false;
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    // Apply fixes in reverse order to maintain line numbers
    const sortedViolations = [...result.violations].sort((a, b) => b.line - a.line);

    for (const violation of sortedViolations) {
      const pattern = this.patterns.find(p => p.name === violation.pattern);
      if (pattern?.autoFix) {
        const lineIndex = violation.line - 1;
        const fixedLine = this.generateFixSuggestion(pattern.name, lines[lineIndex]);
        
        if (fixedLine !== lines[lineIndex]) {
          lines[lineIndex] = fixedLine;
          modified = true;
        }
      }
    }

    if (modified) {
      // Add import if not present
      const hasImport = lines.some(line => 
        line.includes('FileCreationAPI') || line.includes('fileAPI')
      );
      
      if (!hasImport) {
        const importStatement = `import { FileCreationAPI } from '@external-log-lib/file-manager';\nconst fileAPI = new FileCreationAPI();\n`;
        lines.unshift(importStatement);
      }

      await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
    }

    return modified;
  }

  /**
   * Generate fraud report
   */
  async generateReport(options: FraudCheckOptions = {}): Promise<string> {
    const reportLines: string[] = [];
    reportLines.push('# File Creation Fraud Detection Report');
    reportLines.push(`Generated: ${new Date().toISOString()}`);
    reportLines.push(`Base Path: ${this.basePath}\n`);

    let totalViolations = 0;
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    // Group violations by severity
    const violationsBySeverity = new Map<string, FraudDetectionResult[]>();
    
    for (const [filePath, result] of this.violations) {
      totalViolations += result.violations.length;
      
      for (const violation of result.violations) {
        severityCounts[violation.severity]++;
        
        const severity = violation.severity;
        if (!violationsBySeverity.has(severity)) {
          violationsBySeverity.set(severity, []);
        }
        
        const existing = violationsBySeverity.get(severity)!.find(r => r.filePath === filePath);
        if (!existing) {
          violationsBySeverity.get(severity)!.push(result);
        }
      }
    }

    // Summary
    reportLines.push('## Summary');
    reportLines.push(`- Total Files Scanned: ${this.violations.size}`);
    reportLines.push(`- Total Violations: ${totalViolations}`);
    reportLines.push(`- Critical: ${severityCounts.critical}`);
    reportLines.push(`- High: ${severityCounts.high}`);
    reportLines.push(`- Medium: ${severityCounts.medium}`);
    reportLines.push(`- Low: ${severityCounts.low}\n`);

    // Critical violations
    if (severityCounts.critical > 0) {
      reportLines.push('## Critical Violations (Immediate Action Required)');
      this.addViolationSection(reportLines, 'critical', violationsBySeverity.get('critical') || []);
    }

    // High severity violations
    if (severityCounts.high > 0) {
      reportLines.push('## High Severity Violations');
      this.addViolationSection(reportLines, 'high', violationsBySeverity.get('high') || []);
    }

    // Medium severity violations
    if (severityCounts.medium > 0) {
      reportLines.push('## Medium Severity Violations');
      this.addViolationSection(reportLines, 'medium', violationsBySeverity.get('medium') || []);
    }

    // Low severity violations
    if (severityCounts.low > 0) {
      reportLines.push('## Low Severity Violations');
      this.addViolationSection(reportLines, 'low', violationsBySeverity.get('low') || []);
    }

    // Recommendations
    reportLines.push('\n## Recommendations');
    reportLines.push('1. Replace all direct file system operations with FileCreationAPI');
    reportLines.push('2. Enable strict mode in FileCreationAPI for production environments');
    reportLines.push('3. Add pre-commit hooks to prevent new violations');
    reportLines.push('4. Review and remove all backup files from the codebase');
    reportLines.push('5. Implement automated scanning in CI/CD pipeline\n');

    // Auto-fix instructions
    if (Array.from(this.violations.values()).some(r => r.canAutoFix)) {
      reportLines.push('## Auto-Fix Available');
      reportLines.push('Some violations can be automatically fixed. Run with --auto-fix flag to apply corrections.');
      reportLines.push('```bash');
      reportLines.push('npm run fraud-check -- --auto-fix');
      reportLines.push('```\n');
    }

    const report = reportLines.join('\n');

    // Save report if path specified
    if (options.reportPath) {
      await this.fileAPI.createFile(options.reportPath, report, {
        type: FileType.REPORT
      });
    }

    return report;
  }

  /**
   * Add violation section to report
   */
  private addViolationSection(
    lines: string[],
    severity: string,
    results: FraudDetectionResult[]
  ): void {
    for (const result of results) {
      const severityViolations = result.violations.filter(v => v.severity === severity);
      if (severityViolations.length === 0) continue;

      const relativePath = path.relative(this.basePath, result.filePath);
      lines.push(`\n### ${relativePath}`);
      
      for (const violation of severityViolations) {
        lines.push(`- **Line ${violation.line}:** ${violation.message}`);
        lines.push(`  - Pattern: \`${violation.pattern}\``);
        lines.push(`  - Code: \`${violation.code}\``);
      }

      if (result.suggestions.length > 0) {
        lines.push('  - **Suggested Fixes:**');
        result.suggestions.forEach(s => lines.push(`    - ${s}`));
      }
    }
    lines.push('');
  }

  /**
   * Export violations as JSON
   */
  async exportViolations(outputPath?: string): Promise<string> {
    const exportPath = outputPath || path.join(this.basePath, 'gen/doc/fraud-violations.json');
    const data = {
      timestamp: new Date().toISOString(),
      basePath: this.basePath,
      violations: Array.from(this.violations.entries()).map(([path, result]) => ({
        path,
        ...result
      }))
    };

    await this.fileAPI.createFile(exportPath, JSON.stringify(data, null, 2), {
      type: FileType.DATA
    });

    return exportPath;
  }

  /**
   * Clear violations
   */
  clearViolations(): void {
    this.violations.clear();
  }
}

export default FileCreationFraudChecker;