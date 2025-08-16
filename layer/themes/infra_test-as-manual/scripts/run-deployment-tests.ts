#!/usr/bin/env ts-node
/**
 * Deployment Test Runner Script
 * Run comprehensive tests across all deployment environments
 */

import { webAppDeploymentTester } from '../children/WebAppDeploymentTester';
import { deploymentTestManager } from '../children/DeploymentTestManager';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


interface TestRunOptions {
  app?: string;
  environments?: string[];
  parallel?: boolean;
  stopOnFailure?: boolean;
  generateReport?: boolean;
  compareEnvironments?: boolean;
}

/**
 * Main test runner
 */
async function runDeploymentTests(options: TestRunOptions = {}) {
  console.log('🚀 Starting Deployment Test Suite');
  console.log('================================\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const parsedOptions = parseArguments(args);
  const finalOptions = { ...options, ...parsedOptions };
  
  try {
    // Get list of apps to test
    const appsToTest = finalOptions.app 
      ? [finalOptions.app]
      : ['gui-selector', 'ai-dev-portal', 'story-reporter'];
    
    // Get environments to test
    const environments = finalOptions.environments || 
      ['local-dev', 'local-release', 'staging', 'production'];
    
    console.log(`Testing apps: ${appsToTest.join(', ')}`);
    console.log(`Environments: ${environments.join(', ')}\n`);
    
    const allReports = [];
    
    // Run tests for each app
    for (const appId of appsToTest) {
      console.log(`\n📱 Testing ${appId}`);
      console.log('─'.repeat(40));
      
      try {
        const report = await webAppDeploymentTester.runDeploymentTests(
          appId,
          environments
        );
        
        allReports.push(report);
        
        // Print summary
        printReportSummary(report);
        
        // Stop on failure if requested
        if (finalOptions.stopOnFailure && report.summary.failed > 0) {
          console.error('\n❌ Tests failed. Stopping execution.');
          process.exit(1);
        }
      } catch (error) {
        console.error(`\n❌ Error testing ${appId}: ${error.message}`);
        if (finalOptions.stopOnFailure) {
          process.exit(1);
        }
      }
    }
    
    // Compare environments if requested
    if (finalOptions.compareEnvironments && appsToTest.length === 1) {
      console.log('\n📊 Comparing Environments');
      console.log('─'.repeat(40));
      
      const comparisonReport = await deploymentTestManager.compareEnvironments(
        environments,
        appsToTest[0]
      );
      
      printComparisonReport(comparisonReport);
    }
    
    // Generate consolidated report
    if (finalOptions.generateReport) {
      const consolidatedReport = generateConsolidatedReport(allReports);
      saveConsolidatedReport(consolidatedReport);
    }
    
    // Final summary
    printFinalSummary(allReports);
    
    // Exit with appropriate code
    const hasFailures = allReports.some(r => r.summary.failed > 0);
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
async function parseArguments(args: string[]): TestRunOptions {
  const options: TestRunOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--app':
      case '-a':
        options.app = args[++i];
        break;
        
      case '--env':
      case '-e':
        options.environments = args[++i].split(',');
        break;
        
      case '--parallel':
      case '-p':
        options.parallel = true;
        break;
        
      case '--stop-on-failure':
      case '-s':
        options.stopOnFailure = true;
        break;
        
      case '--report':
      case '-r':
        options.generateReport = true;
        break;
        
      case '--compare':
      case '-c':
        options.compareEnvironments = true;
        break;
        
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

/**
 * Print help message
 */
async function printHelp() {
  console.log(`
Deployment Test Runner
======================

Usage: ts-node run-deployment-tests.ts [options]

Options:
  --app, -a <appId>           Test specific app (gui-selector, ai-dev-portal, etc.)
  --env, -e <environments>    Comma-separated list of environments to test
  --parallel, -p              Run tests in parallel (not yet implemented)
  --stop-on-failure, -s       Stop execution on first failure
  --report, -r                Generate HTML report
  --compare, -c               Compare results across environments
  --help, -h                  Show this help message

Examples:
  # Test all apps in all environments
  ts-node run-deployment-tests.ts

  # Test GUI selector in local environments only
  ts-node run-deployment-tests.ts -a gui-selector -e local-dev,local-release

  # Test portal with comparison and report
  ts-node run-deployment-tests.ts -a ai-dev-portal -c -r

  # Test all apps but stop on first failure
  ts-node run-deployment-tests.ts -s
  `);
}

/**
 * Print report summary
 */
async function printReportSummary(report: any) {
  console.log('\n📋 Test Summary');
  console.log(`  Total Tests: ${report.summary.totalTests}`);
  console.log(`  ✅ Passed: ${report.summary.passed}`);
  console.log(`  ❌ Failed: ${report.summary.failed}`);
  console.log(`  ⏭️  Skipped: ${report.summary.skipped}`);
  console.log(`  ⏱️  Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });
  }
}

/**
 * Print comparison report
 */
async function printComparisonReport(report: any) {
  console.log('\nEnvironment Comparison:');
  
  // Print results table
  console.log('\n  Environment    | Passed | Failed | Duration');
  console.log('  ' + '─'.repeat(45));
  
  for (const env of report.environments) {
    const result = report.summary.results[env];
    console.log(
      `  ${env.padEnd(14)} | ${String(result.passed).padEnd(6)} | ` +
      `${String(result.failed).padEnd(6)} | ${(result.duration / 1000).toFixed(2)}s`
    );
  }
  
  // Print differences
  if (report.differences.length > 0) {
    console.log('\n⚠️  Differences Found:');
    report.differences.forEach((diff: any) => {
      console.log(`  • ${diff.details}`);
    });
  }
}

/**
 * Generate consolidated report
 */
async function generateConsolidatedReport(reports: any[]) {
  return {
    timestamp: new Date().toISOString(),
    totalApps: reports.length,
    apps: reports.map(r => ({
      appId: r.appId,
      appName: r.appName,
      summary: r.summary,
      environments: r.environments.map((e: any) => ({
        name: e.environment,
        status: e.status,
        testCount: e.tests.length,
        passed: e.tests.filter((t: any) => t.result.passed).length,
        failed: e.tests.filter((t: any) => !t.result.passed).length
      }))
    })),
    overallSummary: {
      totalTests: reports.reduce((sum, r) => sum + r.summary.totalTests, 0),
      totalPassed: reports.reduce((sum, r) => sum + r.summary.passed, 0),
      totalFailed: reports.reduce((sum, r) => sum + r.summary.failed, 0),
      totalDuration: reports.reduce((sum, r) => sum + r.summary.duration, 0)
    }
  };
}

/**
 * Save consolidated report
 */
async function saveConsolidatedReport(report: any) {
  const reportsDir = path.join(__dirname, '../reports');
  
  if (!fs.existsSync(reportsDir)) {
    await fileAPI.createDirectory(reportsDir);
  }
  
  // Save JSON report
  const jsonFile = path.join(reportsDir, `consolidated-report-${Date.now()}.json`);
  await fileAPI.createFile(jsonFile, JSON.stringify(report, { type: FileType.TEMPORARY }));
  
  // Generate HTML report
  const htmlFile = path.join(reportsDir, `consolidated-report-${Date.now()}.html`);
  const htmlContent = generateHTMLReport(report);
  await fileAPI.createFile(htmlFile, htmlContent, { type: FileType.TEMPORARY });
  
  console.log(`\n📄 Reports saved:`);
  console.log(`  JSON: ${jsonFile}`);
  console.log(`  HTML: ${htmlFile}`);
}

/**
 * Generate HTML report
 */
async function generateHTMLReport(report: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Deployment Test Report - ${new Date(report.timestamp).toLocaleString()}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .summary-card {
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
    }
    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    .warning { color: #f39c12; }
    .app-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    .status-success {
      background: #d4edda;
      color: #155724;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .status-failure {
      background: #f8d7da;
      color: #721c24;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .status-partial {
      background: #fff3cd;
      color: #856404;
      padding: 2px 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Deployment Test Report</h1>
    <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <h3>Total Apps</h3>
      <div class="value">${report.totalApps}</div>
    </div>
    <div class="summary-card">
      <h3>Total Tests</h3>
      <div class="value">${report.overallSummary.totalTests}</div>
    </div>
    <div class="summary-card">
      <h3>Passed</h3>
      <div class="value passed">${report.overallSummary.totalPassed}</div>
    </div>
    <div class="summary-card">
      <h3>Failed</h3>
      <div class="value failed">${report.overallSummary.totalFailed}</div>
    </div>
    <div class="summary-card">
      <h3>Duration</h3>
      <div class="value">${(report.overallSummary.totalDuration / 1000).toFixed(1)}s</div>
    </div>
  </div>
  
  ${report.apps.map((app: any) => `
    <div class="app-section">
      <h2>📱 ${app.appName}</h2>
      <p>App ID: ${app.appId}</p>
      
      <table>
        <thead>
          <tr>
            <th>Environment</th>
            <th>Status</th>
            <th>Tests</th>
            <th>Passed</th>
            <th>Failed</th>
          </tr>
        </thead>
        <tbody>
          ${app.environments.map((env: any) => `
            <tr>
              <td>${env.name}</td>
              <td>
                <span class="status-${env.status}">${env.status}</span>
              </td>
              <td>${env.testCount}</td>
              <td class="passed">${env.passed}</td>
              <td class="failed">${env.failed}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}
</body>
</html>
  `;
}

/**
 * Print final summary
 */
async function printFinalSummary(reports: any[]) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(50));
  
  const totalTests = reports.reduce((sum, r) => sum + r.summary.totalTests, 0);
  const totalPassed = reports.reduce((sum, r) => sum + r.summary.passed, 0);
  const totalFailed = reports.reduce((sum, r) => sum + r.summary.failed, 0);
  const totalDuration = reports.reduce((sum, r) => sum + r.summary.duration, 0);
  
  console.log(`\n  Total Apps Tested: ${reports.length}`);
  console.log(`  Total Tests Run: ${totalTests}`);
  console.log(`  ✅ Total Passed: ${totalPassed}`);
  console.log(`  ❌ Total Failed: ${totalFailed}`);
  console.log(`  ⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  
  if (totalFailed === 0) {
    console.log('\n✅ All tests passed! Ready for deployment.');
  } else {
    console.log(`\n❌ ${totalFailed} tests failed. Please review and fix before deployment.`);
  }
}

// Run if executed directly
if (require.main === module) {
  runDeploymentTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runDeploymentTests };