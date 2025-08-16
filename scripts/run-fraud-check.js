#!/usr/bin/env node

/**
 * Fraud Check CI/CD Script
 * Runs comprehensive fraud and security checks for CI/CD pipeline
 */

const fs = require('fs');
const path = require('path');

// Import fraud checker
let FraudChecker;
try {
  FraudChecker = require('../fraud-checker/fraud-checker.js').FraudChecker;
} catch (error) {
  console.error('❌ Fraud checker module not found. Please ensure fraud-checker is properly installed.');
  process.exit(1);
}

// Configuration
const config = {
  excludeDirs: ['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache'],
  includeExtensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.env', '.yml', '.yaml'],
  outputFile: 'fraud-check-report.json',
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// Statistics
const stats = {
  filesScanned: 0,
  totalViolations: 0,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  categories: {}
};

// Results storage
const results = [];

// Initialize checker
const checker = new FraudChecker();

/**
 * Scan a directory recursively
 */
function scanDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (!config.excludeDirs.includes(file) && !file.startsWith('.')) {
            scanDirectory(filePath);
          }
        } else if (stat.isFile()) {
          // Check file extension
          const ext = path.extname(file);
          if (config.includeExtensions.includes(ext)) {
            scanFile(filePath);
          }
        }
      } catch (error) {
        if (config.verbose) {
          console.warn(`⚠️ Cannot access ${filePath}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory ${dir}: ${error.message}`);
  }
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    stats.filesScanned++;
    
    if (config.verbose) {
      console.log(`Scanning: ${filePath}`);
    }
    
    // Detect fraud
    const violations = checker.detectFraud({
      content,
      filename: filePath,
      type: determineFileType(filePath)
    });
    
    if (violations.length > 0) {
      // Store results
      results.push({
        file: filePath,
        violations: violations
      });
      
      // Update statistics
      stats.totalViolations += violations.length;
      
      violations.forEach(violation => {
        // Count by severity
        switch (violation.severity) {
          case 'critical':
            stats.criticalCount++;
            break;
          case 'high':
            stats.highCount++;
            break;
          case 'medium':
            stats.mediumCount++;
            break;
          case 'low':
            stats.lowCount++;
            break;
        }
        
        // Count by category
        if (!stats.categories[violation.category]) {
          stats.categories[violation.category] = 0;
        }
        stats.categories[violation.category]++;
        
        // Log critical issues immediately
        if (violation.severity === 'critical') {
          console.error(`🔴 CRITICAL: ${violation.message}`);
          console.error(`   File: ${filePath}`);
          if (violation.location?.line) {
            console.error(`   Line: ${violation.location.line}`);
          }
        }
      });
    }
  } catch (error) {
    if (config.verbose) {
      console.warn(`⚠️ Cannot read ${filePath}: ${error.message}`);
    }
  }
}

/**
 * Determine file type based on extension
 */
function determineFileType(filePath) {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath);
  
  if (basename.includes('.env')) return 'environment';
  if (['.yml', '.yaml'].includes(ext)) return 'configuration';
  if (ext === '.json') return 'configuration';
  if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) return 'source_code';
  
  return 'unknown';
}

/**
 * Generate report
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      filesScanned: stats.filesScanned,
      totalViolations: stats.totalViolations,
      critical: stats.criticalCount,
      high: stats.highCount,
      medium: stats.mediumCount,
      low: stats.lowCount
    },
    categories: stats.categories,
    details: results
  };
  
  // Write JSON report
  fs.writeFileSync(config.outputFile, JSON.stringify(report, null, 2));
  
  return report;
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FRAUD CHECK SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n📁 Files Scanned: ${stats.filesScanned}`);
  console.log(`⚠️  Total Violations: ${stats.totalViolations}`);
  
  console.log('\n🎯 By Severity:');
  console.log(`   🔴 Critical: ${stats.criticalCount}`);
  console.log(`   🟠 High: ${stats.highCount}`);
  console.log(`   🟡 Medium: ${stats.mediumCount}`);
  console.log(`   🟢 Low: ${stats.lowCount}`);
  
  if (Object.keys(stats.categories).length > 0) {
    console.log('\n📋 By Category:');
    Object.entries(stats.categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Final status
  if (stats.criticalCount > 0) {
    console.error('\n❌ FAILED: Critical security issues detected!');
    console.error(`   Found ${stats.criticalCount} critical issue(s) that must be fixed.`);
  } else if (stats.highCount > 0) {
    console.warn('\n⚠️  WARNING: High severity issues detected');
    console.warn(`   Found ${stats.highCount} high severity issue(s) that should be addressed.`);
  } else if (stats.totalViolations > 0) {
    console.log('\n✅ PASSED: No critical issues found');
    console.log(`   ${stats.totalViolations} lower severity issue(s) detected for review.`);
  } else {
    console.log('\n✅ EXCELLENT: No security issues detected!');
  }
  
  console.log(`\n📄 Detailed report saved to: ${config.outputFile}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting Comprehensive Fraud Check...\n');
  
  // Get target directory (default to current directory)
  const targetDir = process.argv[2] || process.cwd();
  
  console.log(`📂 Target Directory: ${targetDir}`);
  console.log(`📝 Excluded: ${config.excludeDirs.join(', ')}`);
  console.log(`📎 File Types: ${config.includeExtensions.join(', ')}\n`);
  
  // Start scanning
  scanDirectory(targetDir);
  
  // Generate report
  generateReport();
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  if (stats.criticalCount > 0) {
    process.exit(1); // Fail CI/CD pipeline
  } else {
    process.exit(0); // Pass
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});

// Run main
main();