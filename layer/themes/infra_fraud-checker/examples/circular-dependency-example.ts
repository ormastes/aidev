#!/usr/bin/env node

/**
 * Example script demonstrating circular dependency detection
 * using the fraud checker with story reporter integration
 */

import { CircularDependencyDetector } from '../src/detectors/circular-dependency-detector';
import { ComprehensiveFraudAnalyzer } from '../src/services/comprehensive-fraud-analyzer';
import * as path from 'node:path';

async function main() {
  console.log('🔍 Circular Dependency Detection Example\n');
  console.log('========================================\n');

  // Get project path from command line or use current directory
  const projectPath = process.argv[2] || process.cwd();
  console.log(`Analyzing project: ${projectPath}\n`);

  // Create detector instance
  const detector = new CircularDependencyDetector();
  
  // Detect circular dependencies
  console.log('1. Detecting circular dependencies...\n');
  const issues = await detector.detectFraud(projectPath);
  
  if (issues.length === 0) {
    console.log('✅ No circular dependency fraud detected!\n');
  } else {
    console.log(`⚠️ Found ${issues.length} circular dependency issues:\n`);
    
    // Group by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const info = issues.filter(i => i.severity === 'info');
    
    if (errors.length > 0) {
      console.log(`🔴 Critical Issues (${errors.length}):`);
      errors.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.file}`);
        console.log(`     Cycle: ${issue.cycle.join(' → ')}`);
      });
      console.log();
    }
    
    if (warnings.length > 0) {
      console.log(`🟡 Warnings (${warnings.length}):`);
      warnings.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.file}`);
        console.log(`     Cycle: ${issue.cycle.join(' → ')}`);
      });
      console.log();
    }
    
    if (info.length > 0) {
      console.log(`🔵 Information (${info.length}):`);
      info.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.file}`);
      });
      console.log();
    }
  }

  // Generate detailed report
  console.log('2. Generating detailed report...\n');
  const report = await detector.generateDetailedReport(projectPath);
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'circular-dependency-report.md');
  const fs = await import('fs');
  await fileAPI.createFile(reportPath, report, { type: FileType.TEMPORARY });
  console.log(`   Report saved to: ${reportPath}\n`);

  // Comprehensive fraud analysis
  console.log('3. Running comprehensive fraud analysis...\n');
  const analyzer = new ComprehensiveFraudAnalyzer();
  const comprehensiveReport = await analyzer.analyzeProject(projectPath);
  
  console.log('   Summary:');
  console.log(`   - Total Issues: ${comprehensiveReport.summary.totalIssues}`);
  console.log(`   - Critical Issues: ${comprehensiveReport.summary.criticalIssues}`);
  console.log(`   - Warnings: ${comprehensiveReport.summary.warnings}`);
  console.log(`   - Circular Dependencies: ${comprehensiveReport.summary.circularDependencies}`);
  console.log(`   - Direct Imports: ${comprehensiveReport.summary.directImports}`);
  console.log(`   - Unauthorized Files: ${comprehensiveReport.summary.unauthorizedFiles}\n`);

  // Print recommendations
  if (comprehensiveReport.recommendations.length > 0) {
    console.log('📋 Recommendations:');
    comprehensiveReport.recommendations.forEach((rec, idx) => {
      console.log(`   ${idx + 1}. ${rec}`);
    });
    console.log();
  }

  console.log('✅ Analysis complete!\n');
}

// Run the example
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});