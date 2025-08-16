#!/usr/bin/env ts-node

/**
 * Migration script to convert direct file operations to FileCreationAPI
 */

import { fs } from '../layer/themes/infra_external-log-lib/dist';
import { path } from '../layer/themes/infra_external-log-lib/dist';
import * as glob from 'glob';

interface FileOperation {
  file: string;
  line: number;
  column: number;
  type: string;
  code: string;
  canAutoFix: boolean;
}

class FileAPIMigrator {
  private operations: FileOperation[] = [];
  private basePath: string;
  private excludePaths = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.jj',
    'release',
    'package-lock.json',
    '*.min.js',
    '*.map'
  ];

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private patterns = [
    {
      name: 'fs.writeFileSync',
      regex: /fs\.writeFileSync\s*\(/g,
      replacement: 'await fileAPI.createFile(',
      canAutoFix: true
    },
    {
      name: 'fs.writeFile',
      regex: /fs\.writeFile\s*\(/g,
      replacement: 'await fileAPI.createFile(',
      canAutoFix: true
    },
    {
      name: 'fs.promises.writeFile',
      regex: /fs\.promises\.writeFile\s*\(/g,
      replacement: 'await fileAPI.createFile(',
      canAutoFix: true
    },
    {
      name: 'fs.appendFileSync',
      regex: /fs\.appendFileSync\s*\(/g,
      replacement: 'await fileAPI.writeFile(',
      canAutoFix: true
    },
    {
      name: 'fs.appendFile',
      regex: /fs\.appendFile\s*\(/g,
      replacement: 'await fileAPI.writeFile(',
      canAutoFix: true
    },
    {
      name: 'fs.mkdirSync',
      regex: /fs\.mkdirSync\s*\(/g,
      replacement: 'await fileAPI.createDirectory(',
      canAutoFix: true
    },
    {
      name: 'fs.mkdir',
      regex: /fs\.mkdir\s*\(/g,
      replacement: 'await fileAPI.createDirectory(',
      canAutoFix: true
    },
    {
      name: 'Deno.writeTextFile',
      regex: /Deno\.writeTextFile\s*\(/g,
      replacement: 'await fileAPI.createFile(',
      canAutoFix: true
    },
    {
      name: 'Deno.writeFile',
      regex: /Deno\.writeFile\s*\(/g,
      replacement: 'await fileAPI.createFile(',
      canAutoFix: true
    }
  ];

  async scanProject(): Promise<void> {
    console.log('Scanning project for direct file operations...\n');
    
    const files = glob.sync('**/*.{ts,tsx,js,jsx,mjs,cjs}', {
      cwd: this.basePath,
      ignore: this.excludePaths,
      absolute: true
    });

    console.log(`Found ${files.length} source files to scan\n`);

    for (const file of files) {
      await this.scanFile(file);
    }

    this.generateReport();
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(this.basePath, filePath);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const pattern of this.patterns) {
          if (pattern.regex.test(line)) {
            this.operations.push({
              file: relativePath,
              line: i + 1,
              column: line.search(pattern.regex) + 1,
              type: pattern.name,
              code: line.trim(),
              canAutoFix: pattern.canAutoFix
            });
          }
          // Reset regex
          pattern.regex.lastIndex = 0;
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  private generateReport(): void {
    if (this.operations.length === 0) {
      console.log('✅ No direct file operations found!');
      return;
    }

    console.log(`Found ${this.operations.length} direct file operations:\n`);

    // Group by file
    const byFile = new Map<string, FileOperation[]>();
    for (const op of this.operations) {
      if (!byFile.has(op.file)) {
        byFile.set(op.file, []);
      }
      byFile.get(op.file)!.push(op);
    }

    // Sort files by path
    const sortedFiles = Array.from(byFile.keys()).sort();

    for (const file of sortedFiles) {
      const ops = byFile.get(file)!;
      console.log(`\n📁 ${file} (${ops.length} operations)`);
      
      for (const op of ops) {
        console.log(`  Line ${op.line}: ${op.type}`);
        console.log(`    ${op.code}`);
        if (op.canAutoFix) {
          console.log(`    ✓ Can auto-fix`);
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`  Total files affected: ${byFile.size}`);
    console.log(`  Total operations: ${this.operations.length}`);
    
    const autoFixable = this.operations.filter(op => op.canAutoFix).length;
    console.log(`  Auto-fixable: ${autoFixable}`);
    console.log(`  Manual fix required: ${this.operations.length - autoFixable}`);

    // Priority files (high occurrence)
    const priorityFiles = Array.from(byFile.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    if (priorityFiles.length > 0) {
      console.log('\nTop 10 files to fix first:');
      for (const [file, ops] of priorityFiles) {
        console.log(`  ${ops.length} operations: ${file}`);
      }
    }
  }

  async autoFix(dryRun: boolean = true): Promise<void> {
    console.log(`\n${dryRun ? 'DRY RUN: ' : ''}Auto-fixing direct file operations...\n`);

    const byFile = new Map<string, FileOperation[]>();
    for (const op of this.operations.filter(o => o.canAutoFix)) {
      if (!byFile.has(op.file)) {
        byFile.set(op.file, []);
      }
      byFile.get(op.file)!.push(op);
    }

    for (const [file, ops] of byFile) {
      const filePath = path.join(this.basePath, file);
      
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let modified = false;

        // Sort operations by line number in reverse to maintain positions
        const sortedOps = ops.sort((a, b) => b.line - a.line);

        for (const op of sortedOps) {
          const lineIndex = op.line - 1;
          const originalLine = lines[lineIndex];
          let newLine = originalLine;

          // Apply fix
          const pattern = this.patterns.find(p => p.name === op.type);
          if (pattern) {
            newLine = originalLine.replace(pattern.regex, pattern.replacement);
            
            if (newLine !== originalLine) {
              lines[lineIndex] = newLine;
              modified = true;
              console.log(`  Fixed: ${file}:${op.line}`);
            }
          }
        }

        if (modified && !dryRun) {
          // Add import if not present
          const hasImport = lines.some(line => 
            line.includes('FileCreationAPI') || 
            line.includes('fileAPI')
          );

          if (!hasImport) {
            // Find the right place to add import (after other imports)
            let importIndex = 0;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].startsWith('import ')) {
                importIndex = i + 1;
              } else if (importIndex > 0) {
                break;
              }
            }

            const importStatement = `import { FileCreationAPI, FileType } from '../../layer/themes/infra_external-log-lib/src/file-manager/FileCreationAPI';\nconst fileAPI = new FileCreationAPI();`;
            lines.splice(importIndex, 0, importStatement);
          }

          fs.writeFileSync(filePath, lines.join('\n'));
          console.log(`    ✓ Saved changes to ${file}`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${file}: ${error}`);
      }
    }

    if (dryRun) {
      console.log('\n⚠️  This was a dry run. Use --fix to apply changes.');
    }
  }

  async generateMigrationReport(): Promise<void> {
    const reportPath = path.join(this.basePath, 'gen/doc/file-api-migration-report.md');
    
    const report: string[] = [];
    report.push('# File API Migration Report');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    
    report.push('## Summary');
    report.push(`- Total files scanned: ${glob.sync('**/*.{ts,tsx,js,jsx}', { ignore: this.excludePaths }).length}`);
    report.push(`- Files with direct operations: ${new Set(this.operations.map(o => o.file)).size}`);
    report.push(`- Total operations found: ${this.operations.length}`);
    report.push(`- Auto-fixable: ${this.operations.filter(o => o.canAutoFix).length}`);
    
    report.push('\n## Files Requiring Migration');
    
    const byFile = new Map<string, FileOperation[]>();
    for (const op of this.operations) {
      if (!byFile.has(op.file)) {
        byFile.set(op.file, []);
      }
      byFile.get(op.file)!.push(op);
    }

    for (const [file, ops] of byFile) {
      report.push(`\n### ${file}`);
      report.push(`Operations: ${ops.length}`);
      
      for (const op of ops) {
        report.push(`- Line ${op.line}: \`${op.type}\` ${op.canAutoFix ? '✓' : '⚠️ Manual'}`);
      }
    }

    report.push('\n## Migration Instructions');
    report.push('1. Run `npm run migrate-file-api --fix` to auto-fix compatible operations');
    report.push('2. Manually update remaining operations');
    report.push('3. Run fraud checker to verify: `npm run fraud-check`');
    report.push('4. Update imports to use relative paths to FileCreationAPI');

    fs.writeFileSync(reportPath, report.join('\n'));
    console.log(`\n📄 Migration report saved to: ${reportPath}`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const migrator = new FileAPIMigrator();

  await migrator.scanProject();

  if (args.includes('--fix')) {
    await migrator.autoFix(false);
  } else if (args.includes('--dry-run')) {
    await migrator.autoFix(true);
  }

  if (args.includes('--report')) {
    await migrator.generateMigrationReport();
  }
}

main().catch(console.error);