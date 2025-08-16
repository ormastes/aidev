#!/usr/bin/env bun
/**
 * Bulk Migration Script - Migrates ALL shell scripts to TypeScript and Python
 * This will process all 203 identified shell scripts
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, basename, dirname, relative } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

interface MigrationStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Map<string, string>;
  timeTaken: number;
}

class BulkMigrator {
  private stats: MigrationStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: new Map(),
    timeTaken: 0
  };

  private baseDir = '/home/ormastes/dev/aidev';
  private outputBaseDir = join(this.baseDir, 'scripts/migrated');

  async migrateAll() {
    const startTime = Date.now();
    
    console.log('🚀 Starting Bulk Migration of ALL Shell Scripts');
    console.log('=' .repeat(60));
    
    // Read the analysis report
    const reportPath = join(this.baseDir, 'gen/doc/shell-scripts-analysis.json');
    const report = JSON.parse(await readFile(reportPath, 'utf-8'));
    
    this.stats.total = report.scripts.length;
    
    // Create output directories
    await this.createOutputDirectories();
    
    // Process by complexity
    console.log('\n📋 Migration Plan:');
    console.log(`  • Simple scripts: ${report.summary.simple}`);
    console.log(`  • Medium scripts: ${report.summary.medium}`);
    console.log(`  • Complex scripts: ${report.summary.complex}`);
    console.log(`  • Total: ${this.stats.total}`);
    console.log('');
    
    // Migrate in batches by complexity
    const simpleScripts = report.scripts.filter((s: any) => s.complexity === 'simple');
    const mediumScripts = report.scripts.filter((s: any) => s.complexity === 'medium');
    const complexScripts = report.scripts.filter((s: any) => s.complexity === 'complex');
    
    console.log('\n🔄 Phase 1: Simple Scripts');
    console.log('-'.repeat(40));
    await this.migrateBatch(simpleScripts, 'simple');
    
    console.log('\n🔄 Phase 2: Medium Scripts');
    console.log('-'.repeat(40));
    await this.migrateBatch(mediumScripts, 'medium');
    
    console.log('\n🔄 Phase 3: Complex Scripts');
    console.log('-'.repeat(40));
    await this.migrateBatch(complexScripts, 'complex');
    
    this.stats.timeTaken = Date.now() - startTime;
    
    // Generate final report
    await this.generateFinalReport();
  }

  private async createOutputDirectories() {
    const dirs = [
      'typescript/simple',
      'typescript/medium', 
      'typescript/complex',
      'python/simple',
      'python/medium',
      'python/complex'
    ];
    
    for (const dir of dirs) {
      await mkdir(join(this.outputBaseDir, dir), { recursive: true });
    }
  }

  private async migrateBatch(scripts: any[], complexity: string) {
    let count = 0;
    const total = scripts.length;
    
    for (const scriptInfo of scripts) {
      count++;
      const scriptPath = join(this.baseDir, scriptInfo.path);
      const scriptName = basename(scriptPath);
      
      // Progress indicator
      if (count % 10 === 0 || count === total) {
        console.log(`  Progress: ${count}/${total} (${((count/total)*100).toFixed(1)}%)`);
      }
      
      // Check if file exists
      if (!existsSync(scriptPath)) {
        this.stats.skipped++;
        continue;
      }
      
      try {
        // Migrate to TypeScript
        const tsSuccess = await this.migrateToTypeScript(scriptPath, complexity);
        
        // Migrate to Python
        const pySuccess = await this.migrateToPython(scriptPath, complexity);
        
        if (tsSuccess || pySuccess) {
          this.stats.successful++;
        } else {
          this.stats.failed++;
        }
      } catch (error: any) {
        this.stats.failed++;
        this.stats.errors.set(scriptName, error.message);
      }
    }
  }

  private async migrateToTypeScript(scriptPath: string, complexity: string): Promise<boolean> {
    try {
      const content = await readFile(scriptPath, 'utf-8');
      const scriptName = basename(scriptPath, '.sh');
      const outputPath = join(this.outputBaseDir, 'typescript', complexity, `${scriptName}.ts`);
      
      // Convert script
      const tsCode = this.convertToTypeScript(content, basename(scriptPath));
      
      // Save migrated script
      await writeFile(outputPath, tsCode);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  private async migrateToPython(scriptPath: string, complexity: string): Promise<boolean> {
    try {
      const content = await readFile(scriptPath, 'utf-8');
      const scriptName = basename(scriptPath, '.sh');
      const outputPath = join(this.outputBaseDir, 'python', complexity, `${scriptName}.py`);
      
      // Convert script
      const pyCode = this.convertToPython(content, basename(scriptPath));
      
      // Save migrated script
      await writeFile(outputPath, pyCode);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  private convertToTypeScript(content: string, filename: string): string {
    const lines = content.split('\n');
    const output: string[] = [];
    
    // Header
    output.push('#!/usr/bin/env bun');
    output.push('/**');
    output.push(` * Migrated from: ${filename}`);
    output.push(` * Auto-generated TypeScript - ${new Date().toISOString()}`);
    output.push(' */');
    output.push('');
    output.push("import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';");
    output.push("import { join, dirname, basename, resolve } from 'path';");
    output.push("import { existsSync } from 'fs';");
    output.push("import { $ } from 'bun';");
    output.push('');
    output.push('async function main() {');
    
    let inFunction = false;
    let inHereDoc = false;
    let hereDocDelimiter = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip shebang
      if (trimmed.startsWith('#!')) continue;
      
      // Handle comments
      if (trimmed.startsWith('#')) {
        output.push(`  // ${trimmed.substring(1).trim()}`);
        continue;
      }
      
      // Handle here documents
      if (inHereDoc) {
        if (trimmed === hereDocDelimiter) {
          output.push('  `;');
          inHereDoc = false;
          hereDocDelimiter = '';
        } else {
          output.push(line);
        }
        continue;
      }
      
      // Check for here document start
      const hereDocMatch = line.match(/cat\s*<<\s*(\w+)/);
      if (hereDocMatch) {
        hereDocDelimiter = hereDocMatch[1];
        inHereDoc = true;
        output.push('  const heredoc = `');
        continue;
      }
      
      // Convert common patterns
      const converted = this.convertLineTS(trimmed);
      if (converted) {
        output.push('  ' + converted);
      }
    }
    
    output.push('}');
    output.push('');
    output.push('// Run main');
    output.push('if (import.meta.main) {');
    output.push('  main().catch(console.error);');
    output.push('}');
    
    return output.join('\n');
  }

  private convertToPython(content: string, filename: string): string {
    const lines = content.split('\n');
    const output: string[] = [];
    
    // Header
    output.push('#!/usr/bin/env python3');
    output.push('"""');
    output.push(`Migrated from: ${filename}`);
    output.push(`Auto-generated Python - ${new Date().toISOString()}`);
    output.push('"""');
    output.push('');
    output.push('import os');
    output.push('import sys');
    output.push('import subprocess');
    output.push('import shutil');
    output.push('import glob');
    output.push('from pathlib import Path');
    output.push('');
    output.push('def main():');
    
    let inFunction = false;
    let inHereDoc = false;
    let hereDocDelimiter = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip shebang
      if (trimmed.startsWith('#!')) continue;
      
      // Handle comments
      if (trimmed.startsWith('#')) {
        output.push(`    # ${trimmed.substring(1).trim()}`);
        continue;
      }
      
      // Handle here documents
      if (inHereDoc) {
        if (trimmed === hereDocDelimiter) {
          output.push('    """');
          inHereDoc = false;
          hereDocDelimiter = '';
        } else {
          output.push('    ' + line);
        }
        continue;
      }
      
      // Check for here document start
      const hereDocMatch = line.match(/cat\s*<<\s*(\w+)/);
      if (hereDocMatch) {
        hereDocDelimiter = hereDocMatch[1];
        inHereDoc = true;
        output.push('    heredoc = """');
        continue;
      }
      
      // Convert common patterns
      const converted = this.convertLinePython(trimmed);
      if (converted) {
        output.push('    ' + converted);
      }
    }
    
    if (output[output.length - 1] === 'def main():') {
      output.push('    pass');
    }
    
    output.push('');
    output.push('if __name__ == "__main__":');
    output.push('    main()');
    
    return output.join('\n');
  }

  private convertLineTS(line: string): string {
    if (!line) return '';
    
    // Common shell to TypeScript conversions
    const conversions: [RegExp, string][] = [
      [/^echo\s+"?([^"]*)"?/, 'console.log("$1");'],
      [/^cd\s+(.+)/, 'process.chdir("$1");'],
      [/^mkdir\s+-p\s+(.+)/, 'await mkdir("$1", { recursive: true });'],
      [/^rm\s+-rf\s+(.+)/, 'await rm("$1", { recursive: true, force: true });'],
      [/^cp\s+(.+)\s+(.+)/, 'await copyFile("$1", "$2");'],
      [/^mv\s+(.+)\s+(.+)/, 'await rename("$1", "$2");'],
      [/^export\s+([^=]+)=(.+)/, 'process.env.$1 = "$2";'],
      [/^if\s+\[\s*(.+)\s*\]/, 'if ($1) {'],
      [/^fi$/, '}'],
      [/^else$/, '} else {'],
      [/^then$/, '// then'],
      [/^done$/, '}'],
      [/^do$/, '{'],
      [/^for\s+(\w+)\s+in\s+(.+)/, 'for (const $1 of [$2]) {'],
      [/^while\s+(.+)/, 'while ($1) {'],
      [/^exit\s+(\d+)/, 'process.exit($1);'],
      [/^sleep\s+(\d+)/, 'await Bun.sleep($1 * 1000);'],
    ];
    
    for (const [pattern, replacement] of conversions) {
      if (pattern.test(line)) {
        return line.replace(pattern, replacement);
      }
    }
    
    // Default: shell command
    if (line && !line.startsWith('//')) {
      return `await $\`${line}\`;`;
    }
    
    return line;
  }

  private convertLinePython(line: string): string {
    if (!line) return '';
    
    // Common shell to Python conversions
    const conversions: [RegExp, string][] = [
      [/^echo\s+"?([^"]*)"?/, 'print("$1")'],
      [/^cd\s+(.+)/, 'os.chdir("$1")'],
      [/^mkdir\s+-p\s+(.+)/, 'Path("$1").mkdir(parents=True, exist_ok=True)'],
      [/^rm\s+-rf\s+(.+)/, 'shutil.rmtree("$1", ignore_errors=True)'],
      [/^cp\s+(.+)\s+(.+)/, 'shutil.copy2("$1", "$2")'],
      [/^mv\s+(.+)\s+(.+)/, 'shutil.move("$1", "$2")'],
      [/^export\s+([^=]+)=(.+)/, 'os.environ["$1"] = "$2"'],
      [/^if\s+\[\s*(.+)\s*\]/, 'if $1:'],
      [/^fi$/, ''],
      [/^else$/, 'else:'],
      [/^elif\s+\[\s*(.+)\s*\]/, 'elif $1:'],
      [/^then$/, ''],
      [/^done$/, ''],
      [/^do$/, ''],
      [/^for\s+(\w+)\s+in\s+(.+)/, 'for $1 in [$2]:'],
      [/^while\s+(.+)/, 'while $1:'],
      [/^exit\s+(\d+)/, 'sys.exit($1)'],
      [/^sleep\s+(\d+)/, 'time.sleep($1)'],
    ];
    
    for (const [pattern, replacement] of conversions) {
      if (pattern.test(line)) {
        const result = line.replace(pattern, replacement);
        return result || '';
      }
    }
    
    // Default: shell command via subprocess
    if (line && !line.startsWith('#')) {
      return `subprocess.run("${line}", shell=True)`;
    }
    
    return '';
  }

  private async generateFinalReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: {
        total: this.stats.total,
        successful: this.stats.successful,
        failed: this.stats.failed,
        skipped: this.stats.skipped,
        successRate: ((this.stats.successful / this.stats.total) * 100).toFixed(2) + '%',
        timeTaken: `${(this.stats.timeTaken / 1000).toFixed(2)} seconds`
      },
      errors: Array.from(this.stats.errors.entries()).map(([file, error]) => ({ file, error })),
      outputDirectories: {
        typescript: join(this.outputBaseDir, 'typescript'),
        python: join(this.outputBaseDir, 'python')
      }
    };
    
    // Save report
    const reportPath = join(this.baseDir, 'gen/doc/bulk-migration-report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${this.stats.successful}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`📈 Success Rate: ${report.stats.successRate}`);
    console.log(`⏱️  Time Taken: ${report.stats.timeTaken}`);
    console.log('');
    console.log('📁 Output Directories:');
    console.log(`   TypeScript: ${report.outputDirectories.typescript}`);
    console.log(`   Python: ${report.outputDirectories.python}`);
    console.log('');
    console.log(`📄 Full report: ${reportPath}`);
    
    if (this.stats.errors.size > 0) {
      console.log('\n⚠️  Errors encountered:');
      let errorCount = 0;
      for (const [file, error] of this.stats.errors) {
        console.log(`   ${file}: ${error}`);
        if (++errorCount >= 5) {
          console.log(`   ... and ${this.stats.errors.size - 5} more`);
          break;
        }
      }
    }
  }
}

// Execute bulk migration
async function main() {
  const migrator = new BulkMigrator();
  await migrator.migrateAll();
}

if (import.meta.main) {
  main().catch(console.error);
}