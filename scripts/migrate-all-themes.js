#!/usr/bin/env node

/**
 * Batch migration script for all themes to use FileCreationAPI
 * This will migrate all remaining themes with direct file access
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class ThemeMigrator {
  constructor() {
    this.basePath = process.cwd();
    this.stats = {
      themes: [],
      totalFiles: 0,
      totalChanges: 0,
      failures: []
    };
    
    // Priority themes with high violations
    this.priorityThemes = [
      'infra_test-as-manual',
      'infra_filesystem-mcp', 
      'init_setup-folder',
      'portal_security',
      'infra_story-reporter',
      'init_qemu',
      'infra_fraud-checker',
      'infra_external-log-lib'
    ];
  }

  async migrateTheme(themeName) {
    console.log(`\n📦 Migrating theme: ${themeName}`);
    console.log('=' .repeat(50));
    
    const themePath = path.join(this.basePath, 'layer/themes', themeName);
    if (!fs.existsSync(themePath)) {
      console.log(`⚠️  Theme path not found: ${themePath}`);
      return { theme: themeName, files: 0, changes: 0, error: 'Path not found' };
    }
    
    // Find all source files in theme
    const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
      cwd: themePath,
      ignore: [
        '**/node_modules/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**',
        '**/tests/**',
        '**/*.d.ts'
      ]
    });
    
    console.log(`Found ${files.length} files to process`);
    
    let themeChanges = 0;
    let filesModified = 0;
    
    for (const file of files) {
      const filePath = path.join(themePath, file);
      const changes = await this.migrateFile(filePath);
      
      if (changes > 0) {
        filesModified++;
        themeChanges += changes;
        console.log(`  ✅ ${file}: ${changes} changes`);
      }
    }
    
    const result = {
      theme: themeName,
      files: filesModified,
      changes: themeChanges
    };
    
    this.stats.themes.push(result);
    this.stats.totalFiles += filesModified;
    this.stats.totalChanges += themeChanges;
    
    console.log(`\n✅ Theme migration complete: ${filesModified} files, ${themeChanges} changes`);
    
    return result;
  }

  async migrateFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let changeCount = 0;
      
      // Skip if already using FileCreationAPI
      if (content.includes('FileCreationAPI') || content.includes('fileAPI')) {
        return 0;
      }
      
      // Skip if it's a test file (double check)
      if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('/test/')) {
        return 0;
      }
      
      // Patterns to replace
      const replacements = [
        // fs.writeFileSync
        {
          from: /fs\.writeFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          to: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
        },
        // fs.writeFile with callback
        {
          from: /fs\.writeFile\s*\(\s*([^,]+),\s*([^,]+),\s*(?:[^,]+,\s*)?([^)]+)\s*\)/g,
          to: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
        },
        // fs.promises.writeFile
        {
          from: /fs\.promises\.writeFile\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          to: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
        },
        // fs.mkdirSync
        {
          from: /fs\.mkdirSync\s*\(\s*([^,)]+)(?:,\s*\{[^}]*\})?\s*\)/g,
          to: 'await fileAPI.createDirectory($1)'
        },
        // fs.mkdir with callback
        {
          from: /fs\.mkdir\s*\(\s*([^,]+),\s*(?:\{[^}]*\},\s*)?([^)]+)\s*\)/g,
          to: 'await fileAPI.createDirectory($1)'
        },
        // fs.promises.mkdir
        {
          from: /fs\.promises\.mkdir\s*\(\s*([^,)]+)(?:,\s*\{[^}]*\})?\s*\)/g,
          to: 'await fileAPI.createDirectory($1)'
        },
        // fs.appendFileSync
        {
          from: /fs\.appendFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          to: 'await fileAPI.writeFile($1, $2, { append: true })'
        },
        // fs.appendFile
        {
          from: /fs\.appendFile\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g,
          to: 'await fileAPI.writeFile($1, $2, { append: true })'
        },
        // fs.createWriteStream
        {
          from: /fs\.createWriteStream\s*\(\s*([^)]+)\s*\)/g,
          to: 'fileAPI.createWriteStream($1)'
        }
      ];
      
      // Apply replacements
      for (const { from, to } of replacements) {
        const matches = content.match(from);
        if (matches) {
          content = content.replace(from, to);
          changeCount += matches.length;
        }
      }
      
      if (changeCount === 0) {
        return 0;
      }
      
      // Add import statement
      const importPath = this.getImportPath(filePath);
      const importStatement = filePath.endsWith('.ts') || filePath.endsWith('.tsx') ?
        `import { getFileAPI, FileType } from '${importPath}';\n\nconst fileAPI = getFileAPI();\n` :
        `const { getFileAPI, FileType } = require('${importPath}');\n\nconst fileAPI = getFileAPI();\n`;
      
      // Find insertion point
      const lines = content.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import ') || lines[i].includes('require(')) {
          insertIndex = i + 1;
        } else if (insertIndex > 0 && !lines[i].trim().startsWith('import') && !lines[i].includes('require(')) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, importStatement);
      content = lines.join('\n');
      
      // Make functions async if needed
      if (content.includes('await fileAPI')) {
        content = this.makeAsync(content);
      }
      
      // Write the file
      await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
      
      return changeCount;
      
    } catch (error) {
      this.stats.failures.push({ file: filePath, error: error.message });
      return 0;
    }
  }

  getImportPath(filePath) {
    // Calculate relative path to external-log-lib
    const fromDir = path.dirname(filePath);
    const toDir = path.join(this.basePath, 'layer/themes/infra_external-log-lib/pipe');
    let relativePath = path.relative(fromDir, toDir);
    
    // Ensure path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath.replace(/\\/g, '/');
  }

  makeAsync(content) {
    // Make common function patterns async
    const patterns = [
      // Regular functions
      { from: /^(\s*)(function\s+\w+\s*\([^)]*\))/gm, to: '$1async $2' },
      // Arrow functions
      { from: /^(\s*)(\w+\s*=\s*\([^)]*\)\s*=>)/gm, to: '$1$2' },
      // Method definitions
      { from: /^(\s*)((?:public|private|protected)?\s*)(\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/gm, to: '$1$2async $3' },
      // Constructor methods (don't make async)
      { from: /async\s+constructor/g, to: 'constructor' }
    ];
    
    for (const { from, to } of patterns) {
      // Only add async if not already present
      content = content.replace(from, (match, ...groups) => {
        if (match.includes('async')) {
          return match;
        }
        return to.replace(/\$(\d)/g, (_, n) => groups[n - 1]);
      });
    }
    
    return content;
  }

  async migrateAllThemes() {
    console.log('🚀 Starting batch theme migration to FileCreationAPI\n');
    console.log('Themes to migrate:', this.priorityThemes.join(', '));
    console.log('=' .repeat(70) + '\n');
    
    for (const theme of this.priorityThemes) {
      await this.migrateTheme(theme);
    }
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '=' .repeat(70));
    console.log('📊 MIGRATION SUMMARY\n');
    
    console.log('Themes Migrated:');
    for (const { theme, files, changes } of this.stats.themes) {
      if (changes > 0) {
        console.log(`  ✅ ${theme}: ${files} files, ${changes} changes`);
      } else {
        console.log(`  ⏭️  ${theme}: No changes needed`);
      }
    }
    
    console.log(`\nTotal Statistics:`);
    console.log(`  Files Modified: ${this.stats.totalFiles}`);
    console.log(`  Total Changes: ${this.stats.totalChanges}`);
    
    if (this.stats.failures.length > 0) {
      console.log(`\n⚠️  Failures: ${this.stats.failures.length}`);
      for (const { file, error } of this.stats.failures.slice(0, 5)) {
        console.log(`  - ${file}: ${error}`);
      }
    }
    
    // Save detailed report
    const report = [];
    report.push('# Theme Migration Report');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    
    report.push('## Migration Summary\n');
    report.push(`- Themes Processed: ${this.stats.themes.length}`);
    report.push(`- Files Modified: ${this.stats.totalFiles}`);
    report.push(`- Total Changes: ${this.stats.totalChanges}`);
    report.push(`- Failures: ${this.stats.failures.length}\n`);
    
    report.push('## Theme Details\n');
    for (const { theme, files, changes, error } of this.stats.themes) {
      report.push(`### ${theme}`);
      if (error) {
        report.push(`- Error: ${error}`);
      } else {
        report.push(`- Files Modified: ${files}`);
        report.push(`- Changes Made: ${changes}`);
      }
      report.push('');
    }
    
    if (this.stats.failures.length > 0) {
      report.push('## Failed Files\n');
      for (const { file, error } of this.stats.failures) {
        report.push(`- ${file}`);
        report.push(`  Error: ${error}`);
      }
    }
    
    const reportPath = path.join(this.basePath, 'gen/doc/theme-migration-report.md');
    await fileAPI.createFile(reportPath, report.join('\n', { type: FileType.TEMPORARY }));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const migrator = new ThemeMigrator();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--theme')) {
    // Migrate specific theme
    const themeIndex = args.indexOf('--theme');
    const themeName = args[themeIndex + 1];
    
    if (!themeName) {
      console.error('Please specify a theme name after --theme');
      process.exit(1);
    }
    
    await migrator.migrateTheme(themeName);
    migrator.generateReport();
  } else {
    // Migrate all priority themes
    await migrator.migrateAllThemes();
  }
  
  console.log('\n✅ Migration complete!');
  console.log('💡 Next steps:');
  console.log('  1. Review the changes in each theme');
  console.log('  2. Run tests to ensure functionality');
  console.log('  3. Run fraud checker: npm run file-api:fraud');
  console.log('  4. Enable enforcement: export ENFORCE_FILE_API=true');
}

if (require.main === module) {
  main().catch(console.error);
}