#!/usr/bin/env node

/**
 * Auto-fix script to migrate direct file operations to FileCreationAPI
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class FileAPIAutoFixer {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
    this.fixedFiles = [];
    this.failedFiles = [];
    
    this.replacements = [
      // fs.writeFileSync
      {
        pattern: /fs\.writeFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/g,
        replacement: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })',
        async: true
      },
      // fs.writeFile with callback
      {
        pattern: /fs\.writeFile\s*\(\s*([^,]+),\s*([^,]+),\s*([^,)]+)\s*\)/g,
        replacement: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })',
        async: true
      },
      // fs.promises.writeFile
      {
        pattern: /fs\.promises\.writeFile\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/g,
        replacement: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })',
        async: false
      },
      // fs.mkdirSync
      {
        pattern: /fs\.mkdirSync\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/g,
        replacement: 'await fileAPI.createDirectory($1)',
        async: true
      },
      // fs.mkdir with callback
      {
        pattern: /fs\.mkdir\s*\(\s*([^,]+),\s*([^,)]+)\s*\)/g,
        replacement: 'await fileAPI.createDirectory($1)',
        async: true
      },
      // fs.promises.mkdir
      {
        pattern: /fs\.promises\.mkdir\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/g,
        replacement: 'await fileAPI.createDirectory($1)',
        async: false
      },
      // fs.appendFileSync
      {
        pattern: /fs\.appendFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/g,
        replacement: 'await fileAPI.writeFile($1, $2, { append: true })',
        async: true
      },
      // fs.appendFile
      {
        pattern: /fs\.appendFile\s*\(\s*([^,]+),\s*([^,)]+),\s*([^,)]+)\s*\)/g,
        replacement: 'await fileAPI.writeFile($1, $2, { append: true })',
        async: true
      }
    ];
    
    this.excludePaths = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.jj/**',
      '**/release/**',
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/test/**',
      '**/tests/**',
      '**/demo/**',
      'layer/themes/infra_external-log-lib/src/file-manager/**',
      'layer/themes/infra_external-log-lib/src/fraud-detector/**',
      'layer/themes/infra_external-log-lib/src/interceptors/**',
      'scripts/scan-*.js',
      'scripts/*file-api*'
    ];
  }

  async fixFile(filePath, dryRun = false) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let modified = false;
      let madeAsync = false;
      
      // Apply replacements
      for (const { pattern, replacement, async } of this.replacements) {
        const before = content;
        content = content.replace(pattern, replacement);
        
        if (before !== content) {
          modified = true;
          if (async) madeAsync = true;
        }
      }
      
      if (!modified) {
        return { fixed: false, reason: 'No violations found' };
      }
      
      // Add import if not present
      const hasFileAPIImport = content.includes('FileCreationAPI') || 
                               content.includes('fileAPI') ||
                               content.includes('@external-log-lib/pipe');
      
      if (!hasFileAPIImport) {
        // Determine import path based on file location
        const relativePath = path.relative(filePath, 
          path.join(this.basePath, 'layer/themes/infra_external-log-lib/pipe'));
        
        const importStatement = filePath.endsWith('.ts') || filePath.endsWith('.tsx') ?
          `import { getFileAPI, FileType } from '${relativePath}';\n\nconst fileAPI = getFileAPI();\n` :
          `const { getFileAPI, FileType } = require('${relativePath}');\n\nconst fileAPI = getFileAPI();\n`;
        
        // Find where to insert import
        const lines = content.split('\n');
        let insertIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ') || lines[i].includes('require(')) {
            insertIndex = i + 1;
          } else if (insertIndex > 0) {
            break;
          }
        }
        
        lines.splice(insertIndex, 0, importStatement);
        content = lines.join('\n');
      }
      
      // Make functions async if needed
      if (madeAsync) {
        // Simple async conversion for common patterns
        content = content.replace(
          /^(\s*)(function\s+\w+\s*\([^)]*\))/gm,
          '$1async $2'
        );
        content = content.replace(
          /^(\s*)(\w+\s*\([^)]*\)\s*=>)/gm,
          '$1async $2'
        );
        content = content.replace(
          /^(\s*)(\w+\s*:\s*\([^)]*\)\s*=>)/gm,
          '$1$2'
        );
      }
      
      if (!dryRun) {
        // Create backup
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.writeFileSync(backupPath, originalContent);
        
        // Write fixed content
        fs.writeFileSync(filePath, content);
        
        // Remove backup after successful write
        fs.unlinkSync(backupPath);
      }
      
      return { 
        fixed: true, 
        changes: this.countChanges(originalContent, content),
        madeAsync 
      };
      
    } catch (error) {
      return { fixed: false, reason: error.message };
    }
  }
  
  countChanges(original, modified) {
    let changes = 0;
    for (const { pattern } of this.replacements) {
      const originalMatches = (original.match(pattern) || []).length;
      const modifiedMatches = (modified.match(pattern) || []).length;
      changes += originalMatches - modifiedMatches;
    }
    return changes;
  }

  async fixFiles(targetFiles, dryRun = false) {
    console.log(`\n🔧 ${dryRun ? 'DRY RUN - ' : ''}Auto-fixing file API violations...\n`);
    
    const files = targetFiles || glob.sync('**/*.{ts,tsx,js,jsx}', {
      cwd: this.basePath,
      ignore: this.excludePaths,
      absolute: false
    });
    
    console.log(`Processing ${files.length} files...\n`);
    
    let totalFixed = 0;
    let totalChanges = 0;
    
    for (const file of files) {
      const filePath = path.isAbsolute(file) ? file : path.join(this.basePath, file);
      const result = await this.fixFile(filePath, dryRun);
      
      if (result.fixed) {
        totalFixed++;
        totalChanges += result.changes || 0;
        this.fixedFiles.push({ file, changes: result.changes, madeAsync: result.madeAsync });
        
        const icon = dryRun ? '🔍' : '✅';
        console.log(`${icon} ${file}`);
        console.log(`   Changes: ${result.changes}${result.madeAsync ? ' (made async)' : ''}`);
      } else if (result.reason && result.reason !== 'No violations found') {
        this.failedFiles.push({ file, reason: result.reason });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 AUTO-FIX SUMMARY:');
    console.log(`  Files processed: ${files.length}`);
    console.log(`  Files fixed: ${totalFixed}`);
    console.log(`  Total changes: ${totalChanges}`);
    
    if (this.failedFiles.length > 0) {
      console.log(`  Failed fixes: ${this.failedFiles.length}`);
      console.log('\n❌ Failed files:');
      for (const { file, reason } of this.failedFiles.slice(0, 5)) {
        console.log(`  ${file}: ${reason}`);
      }
    }
    
    if (dryRun && totalFixed > 0) {
      console.log('\n💡 Run without --dry-run to apply these fixes');
    }
    
    return { totalFixed, totalChanges };
  }

  async fixPriorityFiles(dryRun = false) {
    // Priority files from the scan
    const priorityFiles = [
      'layer/themes/init_qemu/src/builders/ImageBuilder.ts',
      'layer/themes/init_setup-folder/src/services/EnvironmentSetupService.ts',
      'layer/themes/init_setup-folder/src/services/unified-quality-setup.ts',
      'layer/themes/init_setup-folder/src/services/cpp-duplication-setup.ts',
      'layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/src/services/VFThemeStorageWrapper.ts',
      'layer/themes/init_setup-folder/src/cli/setup-container.ts',
      'layer/themes/init_qemu/src/services/QEMUImageBuilder.ts',
      'layer/themes/init_setup-folder/src/services/cpp-report-setup.ts',
      'layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/examples/demo.ts',
      'layer/themes/portal_security/layer/themes/setup-folder/children/src/setup/release-setup.ts'
    ];
    
    console.log('🎯 Fixing priority files with most violations...\n');
    
    return await this.fixFiles(priorityFiles, dryRun);
  }

  generateReport() {
    const report = [];
    report.push('# File API Auto-Fix Report');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    
    report.push('## Summary');
    report.push(`- Files fixed: ${this.fixedFiles.length}`);
    report.push(`- Total changes: ${this.fixedFiles.reduce((sum, f) => sum + f.changes, 0)}`);
    report.push(`- Failed fixes: ${this.failedFiles.length}\n`);
    
    if (this.fixedFiles.length > 0) {
      report.push('## Fixed Files\n');
      for (const { file, changes, madeAsync } of this.fixedFiles) {
        report.push(`- ${file}: ${changes} changes${madeAsync ? ' (made async)' : ''}`);
      }
    }
    
    if (this.failedFiles.length > 0) {
      report.push('\n## Failed Files\n');
      for (const { file, reason } of this.failedFiles) {
        report.push(`- ${file}: ${reason}`);
      }
    }
    
    const reportPath = path.join(this.basePath, 'gen/doc/file-api-autofix-report.md');
    fs.writeFileSync(reportPath, report.join('\n'));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const priority = args.includes('--priority');
  const report = args.includes('--report');
  
  const fixer = new FileAPIAutoFixer();
  
  if (priority) {
    await fixer.fixPriorityFiles(dryRun);
  } else {
    await fixer.fixFiles(null, dryRun);
  }
  
  if (report) {
    fixer.generateReport();
  }
  
  process.exit(fixer.failedFiles.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}