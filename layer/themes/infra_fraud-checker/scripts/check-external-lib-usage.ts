#!/usr/bin/env ts-node

/**
 * Script to check all themes for direct external library usage
 * This runs the ExternalLibraryDetector across all theme directories
 */

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { ExternalLibraryDetector, ExternalLibraryViolation } from '../children/ExternalLibraryDetector';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


interface ThemeReport {
  themeName: string;
  violations: ExternalLibraryViolation[];
  filesChecked: number;
}

class ExternalLibraryUsageChecker {
  private detector: ExternalLibraryDetector;
  private themesPath: string;
  
  constructor() {
    this.detector = new ExternalLibraryDetector();
    this.themesPath = path.join(process.cwd(), 'layer', 'themes');
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
        .filter(name => !name.startsWith('.') && name !== 'temp');
    } catch (error) {
      console.error('Error reading themes directory:', error);
      return [];
    }
  }

  /**
   * Recursively find all TypeScript files in a directory
   */
  private async findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules and other irrelevant directories
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'build', 'coverage', '.git'].includes(entry.name)) {
            files.push(...this.findTypeScriptFiles(fullPath));
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * Check a single theme for violations
   */
  private async checkTheme(themeName: string): ThemeReport {
    const themePath = path.join(this.themesPath, themeName);
    const files = this.findTypeScriptFiles(themePath);
    const violations: ExternalLibraryViolation[] = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const fileViolations = this.detector.detectViolations(content, file);
        violations.push(...fileViolations);
      } catch (error) {
        console.error(`Error checking file ${file}:`, error);
      }
    }
    
    return {
      themeName,
      violations,
      filesChecked: files.length
    };
  }

  /**
   * Run the check on all themes
   */
  async runCheck(): Promise<void> {
    console.log('🔍 External Library Usage Checker');
    console.log('=================================\n');
    
    const themes = this.getThemes();
    console.log(`Found ${themes.length} themes to check\n`);
    
    const reports: ThemeReport[] = [];
    let totalViolations = 0;
    let totalFiles = 0;
    
    // Check each theme
    for (const theme of themes) {
      process.stdout.write(`Checking ${theme}...`);
      const report = this.checkTheme(theme);
      reports.push(report);
      totalViolations += report.violations.length;
      totalFiles += report.filesChecked;
      console.log(` ✓ (${report.filesChecked} files, ${report.violations.length} violations)`);
    }
    
    console.log('\n📊 Summary');
    console.log('==========');
    console.log(`Total themes checked: ${themes.length}`);
    console.log(`Total files checked: ${totalFiles}`);
    console.log(`Total violations found: ${totalViolations}\n`);
    
    // Show themes with violations
    const themesWithViolations = reports.filter(r => r.violations.length > 0);
    
    if (themesWithViolations.length > 0) {
      console.log('❌ Themes with violations:');
      console.log('========================\n');
      
      for (const report of themesWithViolations) {
        console.log(`\n📁 ${report.themeName} (${report.violations.length} violations)`);
        console.log('-'.repeat(40));
        
        // Group by file
        const byFile = new Map<string, ExternalLibraryViolation[]>();
        report.violations.forEach(v => {
          const relativePath = path.relative(process.cwd(), v.file);
          const list = byFile.get(relativePath) || [];
          list.push(v);
          byFile.set(relativePath, list);
        });
        
        byFile.forEach((violations, file) => {
          console.log(`\n  📄 ${file}`);
          violations.forEach(v => {
            console.log(`     Line ${v.line}:${v.column} - ${v.library}`);
            console.log(`     ${v.suggestion}`);
          });
        });
      }
      
      // Generate detailed report
      console.log('\n\n📝 Generating detailed report...');
      const reportPath = path.join(process.cwd(), 'gen', 'doc', 'external-lib-usage-report.md');
      this.generateDetailedReport(reports, reportPath);
      console.log(`Report saved to: ${reportPath}`);
      
      // Show fix instructions
      console.log('\n\n🔧 How to fix these violations:');
      console.log('==============================');
      console.log('1. Replace direct imports with wrapped versions from external-log-lib');
      console.log('2. Example replacements:');
      console.log('   - import { fs } from '../../infra_external-log-lib/dist'; → import { fs } from "layer/themes/external-log-lib/pipe"');
      console.log('   - import axios from "axios" → import { axios } from "layer/themes/external-log-lib/pipe"');
      console.log('   - import sqlite3 from "sqlite3" → import { sqlite3 } from "layer/themes/external-log-lib/pipe"');
      console.log('\n3. The wrapped versions maintain the same API but add automatic logging');
      console.log('4. This helps track all external I/O operations for debugging and monitoring\n');
      
    } else {
      console.log('✅ No violations found! All themes are using wrapped external libraries correctly.\n');
    }
  }

  /**
   * Generate a detailed markdown report
   */
  private async generateDetailedReport(reports: ThemeReport[], outputPath: string): void {
    let markdown = '# External Library Usage Report\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Summary
    const totalViolations = reports.reduce((sum, r) => sum + r.violations.length, 0);
    const totalFiles = reports.reduce((sum, r) => sum + r.filesChecked, 0);
    
    markdown += '## Summary\n\n';
    markdown += `- **Themes Checked**: ${reports.length}\n`;
    markdown += `- **Files Checked**: ${totalFiles}\n`;
    markdown += `- **Total Violations**: ${totalViolations}\n`;
    markdown += `- **Themes with Violations**: ${reports.filter(r => r.violations.length > 0).length}\n\n`;
    
    // Violations by library
    markdown += '## Violations by Library\n\n';
    const libCount = new Map<string, number>();
    reports.forEach(r => {
      r.violations.forEach(v => {
        libCount.set(v.library, (libCount.get(v.library) || 0) + 1);
      });
    });
    
    markdown += '| Library | Count | Suggested Import |\n';
    markdown += '|---------|-------|------------------|\n';
    libCount.forEach((count, lib) => {
      const suggestion = this.detector.getSuggestedImport(lib) || 'N/A';
      markdown += `| ${lib} | ${count} | ${suggestion} |\n`;
    });
    
    // Detailed violations by theme
    markdown += '\n## Detailed Violations by Theme\n\n';
    
    for (const report of reports) {
      if (report.violations.length === 0) continue;
      
      markdown += `### ${report.themeName}\n\n`;
      markdown += `Files checked: ${report.filesChecked}, Violations: ${report.violations.length}\n\n`;
      
      // Group by file
      const byFile = new Map<string, ExternalLibraryViolation[]>();
      report.violations.forEach(v => {
        const relativePath = path.relative(process.cwd(), v.file);
        const list = byFile.get(relativePath) || [];
        list.push(v);
        byFile.set(relativePath, list);
      });
      
      byFile.forEach((violations, file) => {
        markdown += `#### ${file}\n\n`;
        violations.forEach(v => {
          markdown += `- **Line ${v.line}:${v.column}** - Direct import of \`${v.library}\`\n`;
          markdown += `  - Statement: \`${v.importStatement}\`\n`;
          markdown += `  - Fix: ${v.suggestion}\n\n`;
        });
      });
    }
    
    // Fix guide
    markdown += '## How to Fix\n\n';
    markdown += '### 1. Update your imports\n\n';
    markdown += 'Replace direct library imports with wrapped versions:\n\n';
    markdown += '```typescript\n';
    markdown += '// ❌ Don\'t use direct imports\n';
    markdown += 'import { fs } from '../../infra_external-log-lib/dist';\n';
    markdown += 'import axios from "axios";\n';
    markdown += 'import sqlite3 from "sqlite3";\n\n';
    markdown += '// ✅ Use wrapped versions\n';
    markdown += 'import { fs } from "layer/themes/external-log-lib/pipe";\n';
    markdown += 'import { axios } from "layer/themes/external-log-lib/pipe";\n';
    markdown += 'import { sqlite3 } from "layer/themes/external-log-lib/pipe";\n';
    markdown += '```\n\n';
    
    markdown += '### 2. The wrapped versions maintain the same API\n\n';
    markdown += 'You can use the wrapped libraries exactly as you would the originals:\n\n';
    markdown += '```typescript\n';
    markdown += '// File operations work the same\n';
    markdown += 'const data = fs.readFileSync("file.txt", "utf-8");\n';
    markdown += 'await fileAPI.createFile("output.txt", data, { type: FileType.TEMPORARY });\n\n';
    markdown += '// HTTP requests work the same\n';
    markdown += 'const response = await axios.get("https://api.example.com");\n\n';
    markdown += '// Database operations work the same\n';
    markdown += 'const db = new sqlite3.Database("app.db");\n';
    markdown += 'db.run("INSERT INTO users VALUES (?)", ["John"]);\n';
    markdown += '```\n\n';
    
    markdown += '### 3. Benefits of using wrapped versions\n\n';
    markdown += '- **Automatic Logging**: All operations are logged for debugging\n';
    markdown += '- **Performance Tracking**: Operation durations are measured\n';
    markdown += '- **Error Tracking**: Failures are logged with context\n';
    markdown += '- **Security**: Sensitive data is sanitized in logs\n';
    markdown += '- **Consistency**: All external I/O follows the same pattern\n';
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }
    
    await fileAPI.createFile(outputPath, markdown, { type: FileType.TEMPORARY });
  }
}

// Run the checker
if (require.main === module) {
  const checker = new ExternalLibraryUsageChecker();
  checker.runCheck().catch(console.error);
}

export { ExternalLibraryUsageChecker };