#!/usr/bin/env node

/**
 * Scan for direct file system access patterns
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class DirectFileAccessScanner {
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
      
      // Deno operations
      { regex: /Deno\.writeTextFile\s*\(/g, name: 'Deno.writeTextFile', severity: 'high' },
      { regex: /Deno\.writeFile\s*\(/g, name: 'Deno.writeFile', severity: 'high' },
      
      // Dangerous patterns
      { regex: /exec[^(]*>\s*['"`][^'"`]+['"`]/g, name: 'shell redirect', severity: 'critical' },
      { regex: /\.bak['"`]/g, name: 'backup file', severity: 'high' },
      { regex: /\.backup['"`]/g, name: 'backup file', severity: 'high' }
    ];
    
    this.excludePaths = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.jj',
      'release',
      '*.min.js',
      '*.map',
      'package-lock.json',
      'layer/themes/infra_external-log-lib/src/file-manager',
      'layer/themes/infra_external-log-lib/src/fraud-detector',
      'layer/themes/infra_external-log-lib/src/interceptors'
    ];
  }

  async scan() {
    console.log('🔍 Scanning for direct file system access...\n');
    
    // Find all source files
    const files = glob.sync('**/*.{ts,tsx,js,jsx,mjs,cjs}', {
      cwd: this.basePath,
      ignore: this.excludePaths,
      absolute: false
    });
    
    console.log(`Found ${files.length} files to scan\n`);
    
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
      console.log('✅ No direct file system access violations found!\n');
      return;
    }
    
    console.log(`⚠️  Found ${totalViolations} violations in ${this.violations.size} files:\n`);
    
    // Group by severity
    const bySeverity = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    for (const [file, violations] of this.violations) {
      for (const violation of violations) {
        bySeverity[violation.severity].push({ file, ...violation });
      }
    }
    
    // Display critical violations
    if (bySeverity.critical.length > 0) {
      console.log('🚨 CRITICAL VIOLATIONS (immediate action required):');
      console.log('─'.repeat(50));
      for (const v of bySeverity.critical.slice(0, 10)) {
        console.log(`  ${v.file}:${v.line}`);
        console.log(`    Pattern: ${v.pattern}`);
        console.log(`    Code: ${v.code.substring(0, 80)}`);
      }
      if (bySeverity.critical.length > 10) {
        console.log(`  ... and ${bySeverity.critical.length - 10} more\n`);
      }
    }
    
    // Display high severity
    if (bySeverity.high.length > 0) {
      console.log('\n⚠️  HIGH SEVERITY VIOLATIONS:');
      console.log('─'.repeat(50));
      const grouped = this.groupByFile(bySeverity.high);
      const topFiles = Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 15);
      
      for (const [file, violations] of topFiles) {
        console.log(`  ${file} (${violations.length} violations)`);
        for (const v of violations.slice(0, 3)) {
          console.log(`    Line ${v.line}: ${v.pattern}`);
        }
        if (violations.length > 3) {
          console.log(`    ... and ${violations.length - 3} more`);
        }
      }
      
      if (Object.keys(grouped).length > 15) {
        console.log(`  ... and ${Object.keys(grouped).length - 15} more files`);
      }
    }
    
    // Display medium severity count
    if (bySeverity.medium.length > 0) {
      console.log(`\n📌 MEDIUM SEVERITY: ${bySeverity.medium.length} violations`);
      const mediumFiles = [...new Set(bySeverity.medium.map(v => v.file))];
      console.log(`   Affected files: ${mediumFiles.length}`);
      console.log(`   Top files:`);
      const grouped = this.groupByFile(bySeverity.medium);
      const topFiles = Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5);
      
      for (const [file, violations] of topFiles) {
        console.log(`     - ${file} (${violations.length} violations)`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`  Total violations: ${totalViolations}`);
    console.log(`  Files affected: ${this.violations.size}`);
    console.log(`  Critical: ${bySeverity.critical.length}`);
    console.log(`  High: ${bySeverity.high.length}`);
    console.log(`  Medium: ${bySeverity.medium.length}`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('  1. Replace direct fs operations with FileCreationAPI');
    console.log('  2. Run: npm run file-api:fix to auto-fix some violations');
    console.log('  3. Enable enforcement: export ENFORCE_FILE_API=true');
    console.log('  4. Review critical violations immediately');
    
    // Most common patterns
    const patternCounts = {};
    for (const [, violations] of this.violations) {
      for (const v of violations) {
        patternCounts[v.pattern] = (patternCounts[v.pattern] || 0) + 1;
      }
    }
    
    const topPatterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log('\n📈 Most common patterns:');
    for (const [pattern, count] of topPatterns) {
      console.log(`  ${pattern}: ${count} occurrences`);
    }
  }
  
  groupByFile(violations) {
    const grouped = {};
    for (const v of violations) {
      if (!grouped[v.file]) {
        grouped[v.file] = [];
      }
      grouped[v.file].push(v);
    }
    return grouped;
  }
  
  async generateReport(outputPath) {
    const report = [];
    report.push('# Direct File System Access Report');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    
    report.push('## Summary');
    report.push(`- Files scanned: ${glob.sync('**/*.{ts,js,tsx,jsx}', { ignore: this.excludePaths }).length}`);
    report.push(`- Files with violations: ${this.violations.size}`);
    report.push(`- Total violations: ${Array.from(this.violations.values()).flat().length}\n`);
    
    report.push('## Violations by File\n');
    
    for (const [file, violations] of this.violations) {
      report.push(`### ${file}`);
      report.push(`Violations: ${violations.length}\n`);
      
      for (const v of violations) {
        report.push(`- **Line ${v.line}** [${v.severity}]: \`${v.pattern}\``);
        report.push(`  \`\`\`javascript`);
        report.push(`  ${v.code}`);
        report.push(`  \`\`\``);
      }
      report.push('');
    }
    
    fs.writeFileSync(outputPath, report.join('\n'));
    console.log(`\n📄 Report saved to: ${outputPath}`);
  }
}

// Main execution
async function main() {
  const scanner = new DirectFileAccessScanner();
  await scanner.scan();
  
  // Generate detailed report if requested
  if (process.argv.includes('--report')) {
    await scanner.generateReport('gen/doc/direct-file-access-scan.md');
  }
  
  // Exit with error code if violations found
  if (scanner.violations.size > 0) {
    process.exit(1);
  }
}

main().catch(console.error);