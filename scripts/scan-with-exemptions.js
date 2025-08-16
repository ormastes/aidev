#!/usr/bin/env node

/**
 * Scan for file API violations with exemption rules
 * Only sample/demo themes are exempt from using FileCreationAPI
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Import enforcement config
const EXEMPT_PATTERNS = [
  'mate_dealer',
  'sample_*',
  'demo_*',
  'example_*',
  '**/demo/**',
  '**/demos/**',
  '**/examples/**',
  '**/samples/**',
  '**/fixtures/**',
  '**/mocks/**',
  'layer/apps/mate_dealer/**',
  'layer/demos/**',
  'layer/samples/**'
];

class ExemptionAwareScanner {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
    this.violations = new Map();
    this.exemptFiles = new Set();
    
    this.patterns = [
      { regex: /fs\.writeFileSync\s*\(/g, name: 'fs.writeFileSync' },
      { regex: /fs\.writeFile\s*\(/g, name: 'fs.writeFile' },
      { regex: /fs\.promises\.writeFile\s*\(/g, name: 'fs.promises.writeFile' },
      { regex: /fs\.mkdirSync\s*\(/g, name: 'fs.mkdirSync' },
      { regex: /fs\.mkdir\s*\(/g, name: 'fs.mkdir' },
      { regex: /fs\.promises\.mkdir\s*\(/g, name: 'fs.promises.mkdir' },
      { regex: /fs\.appendFileSync\s*\(/g, name: 'fs.appendFileSync' },
      { regex: /fs\.appendFile\s*\(/g, name: 'fs.appendFile' },
      { regex: /fs\.createWriteStream\s*\(/g, name: 'fs.createWriteStream' }
    ];
  }

  isExempt(filePath) {
    const relativePath = path.relative(this.basePath, filePath);
    
    // Check against exempt patterns
    for (const pattern of EXEMPT_PATTERNS) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }
    
    // Check theme name
    const themeMatch = relativePath.match(/layer\/themes\/([^\/]+)/);
    if (themeMatch) {
      const themeName = themeMatch[1];
      if (themeName.startsWith('sample_') || 
          themeName.startsWith('demo_') ||
          themeName.startsWith('example_') ||
          themeName === 'mate_dealer') {
        return true;
      }
    }
    
    return false;
  }

  matchesPattern(path, pattern) {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  async scan() {
    console.log('🔍 Scanning for File API violations with exemption rules...\n');
    console.log('Exempt patterns: sample/demo themes only\n');
    
    // Find all source files
    const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
      cwd: this.basePath,
      ignore: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/test/**',
        '**/tests/**',
        // Don't exclude our File API implementation
        '!layer/themes/infra_external-log-lib/src/**'
      ],
      absolute: false
    });
    
    console.log(`Found ${files.length} files to scan\n`);
    
    let totalViolations = 0;
    let exemptViolations = 0;
    let requiredViolations = 0;
    
    for (const file of files) {
      const filePath = path.join(this.basePath, file);
      const isExempt = this.isExempt(filePath);
      
      if (isExempt) {
        this.exemptFiles.add(file);
      }
      
      const violations = await this.scanFile(filePath);
      
      if (violations.length > 0) {
        this.violations.set(file, {
          violations,
          isExempt,
          count: violations.length
        });
        
        totalViolations += violations.length;
        if (isExempt) {
          exemptViolations += violations.length;
        } else {
          requiredViolations += violations.length;
        }
      }
    }
    
    this.displayResults(totalViolations, exemptViolations, requiredViolations);
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

  displayResults(totalViolations, exemptViolations, requiredViolations) {
    console.log('=' .repeat(70));
    console.log('📊 SCAN RESULTS WITH EXEMPTION RULES\n');
    
    if (totalViolations === 0) {
      console.log('✅ No violations found!\n');
      return;
    }
    
    console.log(`Total violations: ${totalViolations}`);
    console.log(`├── Required to fix: ${requiredViolations} (must use FileCreationAPI)`);
    console.log(`└── Exempt: ${exemptViolations} (sample/demo themes - allowed)\n`);
    
    // Show required violations (non-exempt)
    if (requiredViolations > 0) {
      console.log('❌ REQUIRED FIXES (non-exempt themes):\n');
      
      const requiredFiles = [];
      for (const [file, data] of this.violations) {
        if (!data.isExempt) {
          requiredFiles.push({ file, count: data.count });
        }
      }
      
      // Sort by violation count
      requiredFiles.sort((a, b) => b.count - a.count);
      
      // Show top 10
      for (const { file, count } of requiredFiles.slice(0, 10)) {
        console.log(`  ${count} violations: ${file}`);
        
        // Show sample violations
        const data = this.violations.get(file);
        for (const v of data.violations.slice(0, 2)) {
          console.log(`    Line ${v.line}: ${v.pattern}`);
        }
        if (data.violations.length > 2) {
          console.log(`    ... and ${data.violations.length - 2} more`);
        }
      }
      
      if (requiredFiles.length > 10) {
        console.log(`\n  ... and ${requiredFiles.length - 10} more files`);
      }
    }
    
    // Show exempt violations
    if (exemptViolations > 0) {
      console.log('\n✅ EXEMPT (sample/demo themes - allowed):\n');
      
      const exemptThemes = new Set();
      for (const [file, data] of this.violations) {
        if (data.isExempt) {
          const themeMatch = file.match(/layer\/themes\/([^\/]+)/);
          if (themeMatch) {
            exemptThemes.add(themeMatch[1]);
          } else if (file.includes('demo')) {
            exemptThemes.add('demo files');
          } else if (file.includes('example')) {
            exemptThemes.add('example files');
          }
        }
      }
      
      console.log(`  Exempt themes/categories: ${Array.from(exemptThemes).join(', ')}`);
      console.log(`  Total exempt violations: ${exemptViolations} (no action needed)`);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📋 COMPLIANCE SUMMARY:\n');
    
    const complianceRate = ((files.length - requiredFiles.length) / files.length * 100).toFixed(1);
    
    console.log(`  Files scanned: ${files.length}`);
    console.log(`  Files needing fixes: ${requiredFiles.length}`);
    console.log(`  Exempt files: ${this.exemptFiles.size}`);
    console.log(`  Compliance rate: ${complianceRate}%`);
    
    if (requiredViolations > 0) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log(`  ${requiredViolations} violations in non-exempt themes must be fixed`);
      console.log('  Run: npm run file-api:fix to auto-fix these violations');
    } else {
      console.log('\n✅ FULL COMPLIANCE ACHIEVED!');
      console.log('  All non-exempt themes are using FileCreationAPI');
    }
  }
}

// Main execution
async function main() {
  const scanner = new ExemptionAwareScanner();
  await scanner.scan();
}

main().catch(console.error);