#!/usr/bin/env node

/**
 * Direct File Access Detector
 * 
 * Scans all source code to find direct file system access
 * that bypasses the audited file system from external-log-lib
 */

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
const glob = require('glob');
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


interface DirectFileAccess {
  file: string;
  line: number;
  column: number;
  code: string;
  type: string;
  method: string;
  severity: 'low' | 'medium' | 'high' | "critical";
  recommendation: string;
}

interface ScanResult {
  totalFiles: number;
  filesWithDirectAccess: number;
  violations: DirectFileAccess[];
  byTheme: Map<string, DirectFileAccess[]>;
  bySeverity: Map<string, DirectFileAccess[]>;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

class DirectFileAccessScanner {
  private rootPath: string;
  private violations: DirectFileAccess[] = [];
  
  // Patterns to detect direct file access
  private patterns = [
    // Node.js fs module direct usage
    {
      pattern: /require\(['"]fs['"]\)/g,
      type: 'fs-require',
      severity: 'high' as const,
      description: 'Direct fs module import'
    },
    {
      pattern: /import\s+(?:\*\s+as\s+)?fs\s+from\s+['"]fs['"]/g,
      type: 'fs-import',
      severity: 'high' as const,
      description: 'Direct fs module import (ES6)'
    },
    {
      pattern: /import\s+\{[^}]*\}\s+from\s+['"]fs['"]/g,
      type: 'fs-import-destructured',
      severity: 'high' as const,
      description: 'Direct fs module import with destructuring'
    },
    {
      pattern: /from\s+['"]fs\/promises['"]/g,
      type: 'fs-promises-import',
      severity: 'high' as const,
      description: 'Direct fs/promises import'
    },
    
    // Direct fs method calls
    {
      pattern: /fs\.(readFile|writeFile|appendFile|unlink|mkdir|rmdir|readdir|stat|access|chmod|rename|copyFile)\s*\(/g,
      type: 'fs-method-call',
      severity: "critical" as const,
      description: 'Direct fs method call'
    },
    {
      pattern: /fs\.(readFileSync|writeFileSync|appendFileSync|unlinkSync|mkdirSync|rmdirSync|readdirSync|statSync|accessSync|chmodSync|renameSync|copyFileSync)\s*\(/g,
      type: 'fs-sync-method-call',
      severity: "critical" as const,
      description: 'Direct fs synchronous method call'
    },
    {
      pattern: /fsPromises\.(readFile|writeFile|appendFile|unlink|mkdir|rmdir|readdir|stat|access|chmod|rename|copyFile)\s*\(/g,
      type: 'fs-promises-method-call',
      severity: "critical" as const,
      description: 'Direct fs promises method call'
    },
    {
      pattern: /fs\.promises\.(readFile|writeFile|appendFile|unlink|mkdir|rmdir|readdir|stat|access|chmod|rename|copyFile)\s*\(/g,
      type: 'fs-promises-method-call',
      severity: "critical" as const,
      description: 'Direct fs.promises method call'
    },
    
    // Stream creation
    {
      pattern: /fs\.(createReadStream|createWriteStream)\s*\(/g,
      type: 'fs-stream-creation',
      severity: 'high' as const,
      description: 'Direct fs stream creation'
    },
    
    // Watch operations
    {
      pattern: /fs\.(watch|watchFile|unwatchFile)\s*\(/g,
      type: 'fs-watch',
      severity: 'medium' as const,
      description: 'Direct fs watch operation'
    },
    
    // Path operations that might involve file access
    {
      pattern: /require\(['"]path['"]\)/g,
      type: 'path-require',
      severity: 'low' as const,
      description: 'Path module usage (might be legitimate)'
    },
    
    // Child process that might access files
    {
      pattern: /child_process\.(exec|execSync|spawn|spawnSync)\s*\(/g,
      type: 'child-process',
      severity: 'medium' as const,
      description: 'Child process execution (might access files)'
    },
    
    // Shell commands that access files
    {
      pattern: /\b(cat|head|tail|grep|sed|awk|cp|mv|rm|mkdir|touch|chmod)\b/g,
      type: 'shell-command',
      severity: 'medium' as const,
      description: 'Shell command that accesses files'
    }
  ];
  
  // Files/directories to exclude from scanning
  private excludePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/*.map',
    // Exclude our own auditing files
    '**/file-access-auditor/**',
    '**/audited-fs/**',
    '**/file-access-fraud-detector.ts',
    '**/detect-direct-file-access.ts'
  ];
  
  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }
  
  /**
   * Scan all source files for direct file access
   */
  async scan(): Promise<ScanResult> {
    console.log('🔍 Scanning for direct file access...\n');
    
    // Find all source files
    const files = await this.findSourceFiles();
    console.log(`Found ${files.length} source files to scan\n`);
    
    // Scan each file
    for (const file of files) {
      await this.scanFile(file);
    }
    
    // Organize results
    const result = this.organizeResults(files.length);
    
    return result;
  }
  
  /**
   * Find all source files to scan
   */
  private async findSourceFiles(): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.mjs',
      '**/*.cjs'
    ];
    
    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matched = glob.sync(pattern, {
        ignore: this.excludePatterns,
        absolute: true,
        cwd: this.rootPath
      });
      files.push(...matched);
    }
    
    return files;
  }
  
  /**
   * Scan a single file for direct file access
   */
  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(this.rootPath, filePath);
      
      // Check if this is a test file (might have legitimate reasons for direct access)
      const isTestFile = /\.(test|spec|mock)\.(ts|js|tsx|jsx)$/.test(filePath) ||
                        filePath.includes('/tests/') ||
                        filePath.includes('/test/') ||
                        filePath.includes('/__tests__/');
      
      // Check each pattern
      for (const { pattern, type, severity } of this.patterns) {
        const regex = new RegExp(pattern);
        let match;
        
        // Reset regex for each file
        regex.lastIndex = 0;
        const searchContent = content;
        
        while ((match = regex.exec(searchContent)) !== null) {
          const position = match.index;
          const { line, column } = this.getLineAndColumn(content, position);
          const codeLine = lines[line - 1] || '';
          
          // Skip comments
          if (this.isInComment(codeLine, column)) {
            continue;
          }
          
          // Determine actual severity based on context
          let actualSeverity = severity;
          if (isTestFile) {
            // Lower severity for test files
            actualSeverity = severity === "critical" ? 'medium' :
                           severity === 'high' ? 'low' : 'low';
          }
          
          // Extract theme from path
          const theme = this.extractTheme(relativePath);
          
          this.violations.push({
            file: relativePath,
            line,
            column,
            code: codeLine.trim(),
            type,
            method: match[1] || match[0],
            severity: actualSeverity,
            recommendation: this.getRecommendation(type, theme)
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
    }
  }
  
  /**
   * Get line and column from position
   */
  private async getLineAndColumn(content: string, position: number): { line: number; column: number } {
    const lines = content.substring(0, position).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }
  
  /**
   * Check if position is in a comment
   */
  private async isInComment(line: string, column: number): boolean {
    // Check for single-line comment
    const commentIndex = line.indexOf('//');
    if (commentIndex !== -1 && commentIndex < column) {
      return true;
    }
    
    // Simple check for multi-line comment (not perfect but good enough)
    if (line.includes('/*') || line.includes('*/')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Extract theme name from file path
   */
  private async extractTheme(filePath: string): string {
    const match = filePath.match(/layer\/themes\/([^\/]+)/);
    if (match) {
      return match[1];
    }
    
    if (filePath.startsWith('common/')) {
      return 'common';
    }
    
    if (filePath.startsWith('scripts/')) {
      return 'scripts';
    }
    
    return 'root';
  }
  
  /**
   * Get recommendation based on violation type
   */
  private async getRecommendation(type: string, _theme: string): string {
    const base = `Use auditedFS from 'infra_external-log-lib/pipe' instead`;
    
    switch (type) {
      case 'fs-require':
      case 'fs-import':
      case 'fs-import-destructured':
      case 'fs-promises-import':
        return `${base}. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';`;
      
      case 'fs-method-call':
      case 'fs-sync-method-call':
      case 'fs-promises-method-call':
        return `${base}. Replace fs.methodName with auditedFS.methodName`;
      
      case 'fs-stream-creation':
        return `${base}. Use auditedFS.createReadStream() or auditedFS.createWriteStream()`;
      
      case 'fs-watch':
        return `${base}. Use auditedFS.watch() for monitored file watching`;
      
      case 'child-process':
        return `Consider if file access in child process should be audited`;
      
      case 'shell-command':
        return `Shell commands bypass auditing. Consider using auditedFS methods instead`;
      
      default:
        return base;
    }
  }
  
  /**
   * Organize scan results
   */
  private async organizeResults(totalFiles: number): ScanResult {
    const byTheme = new Map<string, DirectFileAccess[]>();
    const bySeverity = new Map<string, DirectFileAccess[]>();
    const filesWithViolations = new Set<string>();
    
    for (const violation of this.violations) {
      // By theme
      const theme = this.extractTheme(violation.file);
      if (!byTheme.has(theme)) {
        byTheme.set(theme, []);
      }
      byTheme.get(theme)!.push(violation);
      
      // By severity
      if (!bySeverity.has(violation.severity)) {
        bySeverity.set(violation.severity, []);
      }
      bySeverity.get(violation.severity)!.push(violation);
      
      // Track files
      filesWithViolations.add(violation.file);
    }
    
    return {
      totalFiles,
      filesWithDirectAccess: filesWithViolations.size,
      violations: this.violations,
      byTheme,
      bySeverity,
      summary: {
        critical: bySeverity.get("critical")?.length || 0,
        high: bySeverity.get('high')?.length || 0,
        medium: bySeverity.get('medium')?.length || 0,
        low: bySeverity.get('low')?.length || 0
      }
    };
  }
  
  /**
   * Generate report
   */
  async generateReport(result: ScanResult): string {
    let report = '# Direct File Access Detection Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += '## Summary\n\n';
    report += `- Total Files Scanned: ${result.totalFiles}\n`;
    report += `- Files with Direct Access: ${result.filesWithDirectAccess}\n`;
    report += `- Total Violations: ${result.violations.length}\n\n`;
    
    report += '### Violations by Severity\n\n';
    report += `- 🔴 Critical: ${result.summary.critical}\n`;
    report += `- 🟠 High: ${result.summary.high}\n`;
    report += `- 🟡 Medium: ${result.summary.medium}\n`;
    report += `- 🟢 Low: ${result.summary.low}\n\n`;
    
    if (result.byTheme.size > 0) {
      report += '## Violations by Theme\n\n';
      
      // Sort themes by violation count
      const sortedThemes = Array.from(result.byTheme.entries())
        .sort((a, b) => b[1].length - a[1].length);
      
      for (const [theme, violations] of sortedThemes) {
        report += `### ${theme} (${violations.length} violations)\n\n`;
        
        // Group by file
        const byFile = new Map<string, DirectFileAccess[]>();
        for (const v of violations) {
          if (!byFile.has(v.file)) {
            byFile.set(v.file, []);
          }
          byFile.get(v.file)!.push(v);
        }
        
        for (const [file, fileViolations] of byFile) {
          report += `#### ${file}\n\n`;
          for (const v of fileViolations.slice(0, 5)) {
            report += `- Line ${v.line}: \`${v.code.substring(0, 80)}${v.code.length > 80 ? '...' : ''}\`\n`;
            report += `  - Type: ${v.type} (${v.severity})\n`;
            report += `  - Recommendation: ${v.recommendation}\n`;
          }
          if (fileViolations.length > 5) {
            report += `- ... and ${fileViolations.length - 5} more violations\n`;
          }
          report += '\n';
        }
      }
    }
    
    if (result.bySeverity.get("critical")?.length) {
      report += '## Critical Violations (Immediate Action Required)\n\n';
      
      const critical = result.bySeverity.get("critical")!.slice(0, 20);
      for (const v of critical) {
        report += `- **${v.file}:${v.line}**\n`;
        report += `  - Code: \`${v.code.substring(0, 100)}${v.code.length > 100 ? '...' : ''}\`\n`;
        report += `  - Method: ${v.method}\n`;
        report += `  - Fix: ${v.recommendation}\n\n`;
      }
      
      if (result.bySeverity.get("critical")!.length > 20) {
        report += `... and ${result.bySeverity.get("critical")!.length - 20} more critical violations\n\n`;
      }
    }
    
    report += '## Recommendations\n\n';
    report += '1. **Replace all direct fs imports** with `auditedFS` from `infra_external-log-lib/pipe`\n';
    report += '2. **Update all file operations** to use the audited methods\n';
    report += '3. **Test files** may keep direct access but should document why\n';
    report += '4. **Shell commands** should be replaced with programmatic file operations\n';
    report += '5. **Child processes** accessing files should be reviewed for audit requirements\n\n';
    
    report += '## Migration Guide\n\n';
    report += '### Before (Direct Access):\n';
    report += '```typescript\n';
    report += 'import * as fs from \'fs\';\n';
    report += 'const data = fileAPI.readFileSync(\'file.txt\', \'utf8\');\n';
    report += 'await fileAPI.createFile(\'output.txt\', data, { type: FileType.TEMPORARY });\n';
    report += '```\n\n';
    
    report += '### After (Audited Access):\n';
    report += '```typescript\n';
    report += 'import { auditedFS } from \'../../infra_external-log-lib/pipe\';\n';
    report += 'const data = await auditedFS.readFile(\'file.txt\', \'utf8\');\n';
    report += 'await auditedFS.writeFile(\'output.txt\', data);\n';
    report += '```\n\n';
    
    report += '## Next Steps\n\n';
    if (result.summary.critical > 0) {
      report += '⚠️ **URGENT**: Fix all critical violations immediately\n';
    }
    if (result.summary.high > 0) {
      report += '🔶 **HIGH PRIORITY**: Address high severity violations\n';
    }
    report += '📋 Review and update all themes to use audited file access\n';
    report += '✅ Enable file access auditing in production\n';
    
    return report;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const outputFormat = args[0] || 'console';
  
  const scanner = new DirectFileAccessScanner();
  
  console.log('🚨 Direct File Access Detection\n');
  console.log('=' .repeat(50) + '\n');
  
  const result = await scanner.scan();
  
  // Display summary
  console.log('📊 Scan Complete!\n');
  console.log(`Total Violations: ${result.violations.length}`);
  console.log(`Critical: ${result.summary.critical}`);
  console.log(`High: ${result.summary.high}`);
  console.log(`Medium: ${result.summary.medium}`);
  console.log(`Low: ${result.summary.low}\n`);
  
  // Show top violating themes
  if (result.byTheme.size > 0) {
    console.log('Top Violating Themes:');
    const sortedThemes = Array.from(result.byTheme.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
    
    for (const [theme, violations] of sortedThemes) {
      console.log(`  - ${theme}: ${violations.length} violations`);
    }
    console.log();
  }
  
  // Show critical violations
  const criticalViolations = result.bySeverity.get("critical") || [];
  if (criticalViolations.length > 0) {
    console.log('⚠️  Critical Violations (showing first 10):');
    for (const v of criticalViolations.slice(0, 10)) {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`    ${v.code.substring(0, 60)}...`);
    }
    if (criticalViolations.length > 10) {
      console.log(`  ... and ${criticalViolations.length - 10} more\n`);
    }
  }
  
  // Generate and save report
  const report = scanner.generateReport(result);
  
  if (outputFormat === 'json') {
    // Output JSON
    const jsonPath = path.join('gen/doc', 'direct-file-access-violations.json');
    await fileAPI.createDirectory(path.dirname(jsonPath), { recursive: true });
    await fileAPI.createFile(jsonPath, JSON.stringify(result, { type: FileType.TEMPORARY }));
    console.log(`\n📄 JSON report saved to: ${jsonPath}`);
  } else {
    // Output Markdown
    const reportPath = path.join('gen/doc', 'direct-file-access-report.md');
    await fileAPI.createDirectory(path.dirname(reportPath), { recursive: true });
    await fileAPI.createFile(reportPath, report, { type: FileType.TEMPORARY });
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
  
  // Exit with error if critical violations found
  if (result.summary.critical > 0) {
    console.log('\n❌ Critical violations found! Fix immediately.');
    process.exit(1);
  } else if (result.summary.high > 0) {
    console.log('\n⚠️  High severity violations found. Please address soon.');
    process.exit(0);
  } else {
    console.log('\n✅ No critical violations found.');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { DirectFileAccessScanner };