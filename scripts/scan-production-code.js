#!/usr/bin/env node

/**
 * Scan production code for direct file system access
 * Excludes test files and node_modules
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class ProductionCodeScanner {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
    this.violations = new Map();
    this.patterns = [
      // Direct fs write operations
      { regex: /fs\.writeFileSync\s*\(/g, name: 'fs.writeFileSync', severity: 'high' },
      { regex: /fs\.writeFile\s*\(/g, name: 'fs.writeFile', severity: 'high' },
      { regex: /fs\.promises\.writeFile\s*\(/g, name: 'fs.promises.writeFile', severity: 'high' },
      { regex: /fs\.appendFileSync\s*\(/g, name: 'fs.appendFileSync', severity: 'medium' },
      { regex: /fs\.appendFile\s*\(/g, name: 'fs.appendFile', severity: 'medium' },
      { regex: /fs\.createWriteStream\s*\(/g, name: 'fs.createWriteStream', severity: 'medium' },
      
      // Directory operations
      { regex: /fs\.mkdirSync\s*\(/g, name: 'fs.mkdirSync', severity: 'medium' },
      { regex: /fs\.mkdir\s*\(/g, name: 'fs.mkdir', severity: 'medium' },
      { regex: /fs\.promises\.mkdir\s*\(/g, name: 'fs.promises.mkdir', severity: 'medium' },
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
      '**/*.stest.ts',
      '**/*.itest.ts',
      '**/*.etest.ts',
      '**/*.envtest.ts',
      '**/test/**',
      '**/tests/**',
      '**/demo/**',
      '**/*.min.js',
      '**/*.map',
      '**/package-lock.json',
      // Exclude our File API implementation
      'layer/themes/infra_external-log-lib/src/file-manager/**',
      'layer/themes/infra_external-log-lib/src/fraud-detector/**',
      'layer/themes/infra_external-log-lib/src/interceptors/**',
      'scripts/scan-*.js',
      'scripts/*file-api*'
    ];
  }

  async scan() {
    console.log('🔍 Scanning PRODUCTION CODE for direct file system access...\n');
    console.log('Excluding: test files, demos, node_modules\n');
    
    // Find production source files only
    const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
      cwd: this.basePath,
      ignore: this.excludePaths,
      absolute: false
    });
    
    console.log(`Found ${files.length} production files to scan\n`);
    
    let totalViolations = 0;
    
    for (const file of files) {
      const filePath = path.join(this.basePath, file);
      const violations = await this.scanFile(filePath);
      
      if (violations.length > 0) {
        this.violations.set(file, violations);
        totalViolations += violations.length;
      }
    }
    
    this.displayResults(totalViolations);
  }

  async scanFile(filePath) {
    const violations = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }
        
        for (const pattern of this.patterns) {
          pattern.regex.lastIndex = 0; // Reset regex
          
          if (pattern.regex.test(line)) {
            violations.push({
              line: lineNum + 1,
              pattern: pattern.name,
              severity: pattern.severity,
              code: line.trim()
            });
          }
        }
      }
    } catch (error) {
      // Ignore read errors
    }
    
    return violations;
  }

  displayResults(totalViolations) {
    if (this.violations.size === 0) {
      console.log('✅ No direct file system access violations in production code!\n');
      return;
    }
    
    console.log(`⚠️  Found ${totalViolations} violations in ${this.violations.size} production files:\n`);
    
    // Group by component/theme
    const byComponent = {};
    for (const [file, violations] of this.violations) {
      let component = 'root';
      
      if (file.startsWith('layer/themes/')) {
        const match = file.match(/layer\/themes\/([^/]+)/);
        if (match) component = `theme:${match[1]}`;
      } else if (file.startsWith('layer/epics/')) {
        const match = file.match(/layer\/epics\/([^/]+)/);
        if (match) component = `epic:${match[1]}`;
      } else if (file.startsWith('scripts/')) {
        component = 'scripts';
      } else if (file.startsWith('common/')) {
        component = 'common';
      }
      
      if (!byComponent[component]) {
        byComponent[component] = { files: [], violations: 0 };
      }
      
      byComponent[component].files.push({ file, violations });
      byComponent[component].violations += violations.length;
    }
    
    // Sort components by violation count
    const sortedComponents = Object.entries(byComponent)
      .sort((a, b) => b[1].violations - a[1].violations);
    
    console.log('📊 VIOLATIONS BY COMPONENT:\n');
    for (const [component, data] of sortedComponents) {
      console.log(`${component} (${data.violations} violations in ${data.files.length} files)`);
      
      // Show top files in component
      const topFiles = data.files
        .sort((a, b) => b.violations.length - a.violations.length)
        .slice(0, 3);
      
      for (const { file, violations } of topFiles) {
        const shortPath = file.replace(/^layer\/themes\/|^layer\/epics\//, '');
        console.log(`  📄 ${shortPath}`);
        
        // Show sample violations
        for (const v of violations.slice(0, 2)) {
          console.log(`     Line ${v.line}: ${v.pattern}`);
        }
        if (violations.length > 2) {
          console.log(`     ... and ${violations.length - 2} more`);
        }
      }
      
      if (data.files.length > 3) {
        console.log(`  ... and ${data.files.length - 3} more files`);
      }
      console.log();
    }
    
    // Summary
    console.log('='.repeat(50));
    console.log('📊 PRODUCTION CODE SUMMARY:');
    console.log(`  Total violations: ${totalViolations}`);
    console.log(`  Files affected: ${this.violations.size}`);
    console.log(`  Components affected: ${Object.keys(byComponent).length}`);
    
    // Pattern distribution
    const patternCounts = {};
    for (const [, violations] of this.violations) {
      for (const v of violations) {
        patternCounts[v.pattern] = (patternCounts[v.pattern] || 0) + 1;
      }
    }
    
    console.log('\n📈 Pattern distribution:');
    for (const [pattern, count] of Object.entries(patternCounts)) {
      const percent = ((count / totalViolations) * 100).toFixed(1);
      console.log(`  ${pattern}: ${count} (${percent}%)`);
    }
    
    // Priority files to fix
    console.log('\n🎯 PRIORITY FILES TO FIX:');
    const allFiles = [];
    for (const [file, violations] of this.violations) {
      allFiles.push({ file, count: violations.length });
    }
    
    const priorityFiles = allFiles
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    for (const { file, count } of priorityFiles) {
      console.log(`  ${count} violations: ${file}`);
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('  1. Start with high-violation files listed above');
    console.log('  2. Use FileCreationAPI from @external-log-lib/pipe');
    console.log('  3. Run: npm run file-api:fix for auto-fixes');
    console.log('  4. Enable enforcement after migration');
  }
  
  async generateReport(outputPath) {
    const report = [];
    report.push('# Production Code File Access Violations');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    report.push('*Excludes: test files, demos, node_modules*\n');
    
    report.push('## Summary');
    report.push(`- Production files scanned: ${glob.sync('**/*.{ts,js,tsx,jsx}', { ignore: this.excludePaths }).length}`);
    report.push(`- Files with violations: ${this.violations.size}`);
    report.push(`- Total violations: ${Array.from(this.violations.values()).flat().length}\n`);
    
    // Group by component
    const byComponent = {};
    for (const [file, violations] of this.violations) {
      let component = 'root';
      
      if (file.startsWith('layer/themes/')) {
        const match = file.match(/layer\/themes\/([^/]+)/);
        if (match) component = match[1];
      } else if (file.startsWith('scripts/')) {
        component = 'scripts';
      }
      
      if (!byComponent[component]) {
        byComponent[component] = [];
      }
      
      byComponent[component].push({ file, violations });
    }
    
    report.push('## Violations by Component\n');
    
    for (const [component, files] of Object.entries(byComponent)) {
      report.push(`### ${component}`);
      report.push(`Files: ${files.length} | Violations: ${files.reduce((sum, f) => sum + f.violations.length, 0)}\n`);
      
      for (const { file, violations } of files) {
        report.push(`#### ${file}`);
        for (const v of violations) {
          report.push(`- Line ${v.line}: \`${v.pattern}\``);
        }
        report.push('');
      }
    }
    
    fs.writeFileSync(outputPath, report.join('\n'));
    console.log(`\n📄 Report saved to: ${outputPath}`);
  }
}

// Main execution
async function main() {
  const scanner = new ProductionCodeScanner();
  await scanner.scan();
  
  // Generate detailed report if requested
  if (process.argv.includes('--report')) {
    await scanner.generateReport('gen/doc/production-code-violations.md');
  }
}

main().catch(console.error);