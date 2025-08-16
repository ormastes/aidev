#!/usr/bin/env node

/**
 * Basic fraud checker - simplified version
 * Scans for common security and code quality issues
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface Config {
  excludeDirs: string[];
  includeExtensions: string[];
  patterns: {
    directImports: RegExp;
    mockUsage: RegExp;
    fsDirectUsage: RegExp;
    hardcodedSecrets: RegExp;
  };
}

interface Stats {
  filesScanned: number;
  violations: number;
  directImports: number;
  mockUsage: number;
  fsDirectUsage: number;
  hardcodedSecrets: number;
}

const config: Config = {
  excludeDirs: ['.git', '.jj', 'node_modules', 'dist', 'build', "coverage", '.next', '.cache', 'temp', 'release'],
  includeExtensions: ['.js', '.ts', '.jsx', '.tsx'],
  patterns: {
    directImports: /import\s+[\w{},\s]+\s+from\s+['"](?![\.\/]|@?\w+\/)/g,
    mockUsage: /\b(jest\.mock|mock|stub|spy|sinon)\b/gi,
    fsDirectUsage: /\b(fs\.writeFile|fs\.readFile|fs\.mkdir|fs\.unlink)\b/g,
    hardcodedSecrets: /\b(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/gi
  }
};

const stats: Stats = {
  filesScanned: 0,
  violations: 0,
  directImports: 0,
  mockUsage: 0,
  fsDirectUsage: 0,
  hardcodedSecrets: 0
};

function scanDirectory(dir: string): void {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (!config.excludeDirs.includes(file) && !file.startsWith('.')) {
            scanDirectory(filePath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(file);
          if (config.includeExtensions.includes(ext)) {
            scanFile(filePath);
          }
        }
      } catch (err) {
        // Skip files we can't access
      }
    }
  } catch (err: any) {
    console.error(`Error scanning ${dir}: ${err.message}`);
  }
}

function scanFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    stats.filesScanned++;
    
    // Determine if this is a test file
    const isTestFile = filePath.includes('.test.') || 
                       filePath.includes('.spec.') || 
                       filePath.includes('/test/') || 
                       filePath.includes('/tests/') ||
                       filePath.includes('/__tests__/');
    
    // Check for direct external imports (skip in test files and demos)
    if (!isTestFile && !filePath.includes('/demo/')) {
      const directImports = content.match(config.patterns.directImports);
      if (directImports) {
        stats.directImports += directImports.length;
        stats.violations += directImports.length;
        console.log(`⚠️  Direct imports in ${filePath}: ${directImports.length}`);
      }
    }
    
    // Check for mock usage (only report in non-test files)
    if (!isTestFile) {
      const mockUsage = content.match(config.patterns.mockUsage);
      if (mockUsage) {
        stats.mockUsage += mockUsage.length;
        stats.violations += mockUsage.length;
        console.log(`⚠️  Mock usage in ${filePath}: ${mockUsage.length}`);
      }
    }
    
    // Check for direct fs usage (skip in test files)
    if (!isTestFile && !filePath.includes('/demo/')) {
      const fsUsage = content.match(config.patterns.fsDirectUsage);
      if (fsUsage) {
        stats.fsDirectUsage += fsUsage.length;
        stats.violations += fsUsage.length;
        console.log(`⚠️  Direct fs usage in ${filePath}: ${fsUsage.length}`);
      }
    }
    
    // Check for hardcoded secrets
    const secrets = content.match(config.patterns.hardcodedSecrets);
    if (secrets) {
      stats.hardcodedSecrets += secrets.length;
      stats.violations += secrets.length;
      console.log(`🔴 Hardcoded secrets in ${filePath}: ${secrets.length}`);
    }
  } catch (err) {
    // Skip files we can't read
  }
}

function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FRAUD CHECK SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📁 Files Scanned: ${stats.filesScanned}`);
  console.log(`⚠️  Total Violations: ${stats.violations}`);
  
  if (stats.violations > 0) {
    console.log('\n📋 Violations by Type:');
    if (stats.directImports > 0) console.log(`   Direct External Imports: ${stats.directImports}`);
    if (stats.mockUsage > 0) console.log(`   Mock Usage: ${stats.mockUsage}`);
    if (stats.fsDirectUsage > 0) console.log(`   Direct FS Usage: ${stats.fsDirectUsage}`);
    if (stats.hardcodedSecrets > 0) console.log(`   🔴 Hardcoded Secrets: ${stats.hardcodedSecrets}`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (stats.hardcodedSecrets > 0) {
    console.error('\n❌ FAILED: Critical security issues detected!');
    process.exit(1);
  } else if (stats.violations > 0) {
    console.warn('\n⚠️  WARNING: Code quality issues detected');
    process.exit(0);
  } else {
    console.log('\n✅ PASSED: No issues detected!');
    process.exit(0);
  }
}

// Main execution
console.log('🔍 Starting Basic Fraud Check...\n');

const targetDir = process.argv[2] || process.cwd();
console.log(`📂 Scanning: ${targetDir}\n`);

scanDirectory(targetDir);
printSummary();