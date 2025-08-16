#!/usr/bin/env node

/**
 * Check for unauthorized files and directories
 * 
 * This script uses the UnauthorizedFileDetector to scan for violations
 * and integrates with filesystem-mcp for platform requirement validation
 */

import { UnauthorizedFileDetector } from '../src/detectors/unauthorized-file-detector';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'detect';
  const targetPath = args[1] || process.cwd();
  
  console.log('🔍 Unauthorized File/Folder Detection');
  console.log('=====================================\n');
  
  const detector = new UnauthorizedFileDetector(targetPath);
  
  switch (command) {
    case 'detect':
      await runDetection(detector);
      break;
      
    case 'report':
      await generateReport(detector);
      break;
      
    case 'watch':
      await watchMode(detector);
      break;
      
    default:
      showHelp();
  }
}

async function runDetection(detector: UnauthorizedFileDetector) {
  console.log('Running detection...\n');
  
  const result = await detector.detect();
  
  if (result.valid) {
    console.log('✅ No unauthorized files or directories found!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${result.totalViolations} violations (${result.criticalViolations} critical)\n`);
    
    // Group by type
    const byType: Record<string, any[]> = {};
    for (const violation of result.violations) {
      if (!byType[violation.type]) {
        byType[violation.type] = [];
      }
      byType[violation.type].push(violation);
    }
    
    // Display violations by type
    for (const [type, violations] of Object.entries(byType)) {
      console.log(`\n${type.replace(/_/g, ' ').toUpperCase()}: ${violations.length} violations`);
      console.log('─'.repeat(50));
      
      for (const violation of violations.slice(0, 5)) {
        console.log(`\n📁 ${violation.path}`);
        console.log(`   Reason: ${violation.reason}`);
        console.log(`   Severity: ${violation.severity === 'error' ? '🔴' : '🟡'} ${violation.severity}`);
        
        if (violation.suggestedLocation) {
          console.log(`   Suggested: ${violation.suggestedLocation}`);
        }
        
        if (violation.createdBy && violation.createdBy.length > 0) {
          console.log(`   Created by:`);
          for (const creator of violation.createdBy.slice(0, 3)) {
            console.log(`     - ${creator}`);
          }
          if (violation.createdBy.length > 3) {
            console.log(`     ... and ${violation.createdBy.length - 3} more`);
          }
        }
      }
      
      if (violations.length > 5) {
        console.log(`\n   ... and ${violations.length - 5} more ${type} violations`);
      }
    }
    
    console.log('\n' + '─'.repeat(50));
    console.log('\n💡 Run with "report" command to generate full report');
    console.log('   Example: npm run check-unauthorized report\n');
    
    process.exit(1);
  }
}

async function generateReport(detector: UnauthorizedFileDetector) {
  console.log('Generating report...\n');
  
  const result = await detector.detect();
  const report = await detector.generateReport(result);
  
  // Save report
  const reportPath = path.join(
    process.cwd(),
    'gen/doc/unauthorized-files-report.md'
  );
  
  // Ensure directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    await fileAPI.createDirectory(reportDir);
  }
  
  await fileAPI.createFile(reportPath, report, { type: FileType.TEMPORARY });
  
  console.log(`📄 Report saved to: ${reportPath}`);
  console.log(`\nSummary:`);
  console.log(`  Total Violations: ${result.totalViolations}`);
  console.log(`  Critical: ${result.criticalViolations}`);
  console.log(`  Status: ${result.valid ? '✅ PASS' : '❌ FAIL'}`);
  
  process.exit(result.valid ? 0 : 1);
}

async function watchMode(detector: UnauthorizedFileDetector) {
  console.log('👁️  Watch mode activated...\n');
  console.log('Monitoring for unauthorized file/folder creation\n');
  console.log('Press Ctrl+C to exit\n');
  
  const checkInterval = 5000; // Check every 5 seconds
  let lastCheck = Date.now();
  
  const runCheck = async () => {
    const result = await detector.detect();
    
    if (!result.valid) {
      console.log(`\n⚠️  [${new Date().toISOString()}] Violations detected!`);
      
      // Show only new violations (created in last interval)
      const recentViolations = result.violations.filter(v => {
        if (!v.createdBy || v.createdBy.length === 0) return false;
        
        // Check if any creator file was modified recently
        for (const creator of v.createdBy) {
          try {
            const stats = fs.statSync(path.join(process.cwd(), creator));
            if (stats.mtime.getTime() > lastCheck) {
              return true;
            }
          } catch (error) {
            // File might not exist
          }
        }
        return false;
      });
      
      if (recentViolations.length > 0) {
        console.log(`Found ${recentViolations.length} new violations:`);
        for (const violation of recentViolations) {
          console.log(`  - ${violation.path}: ${violation.reason}`);
        }
      }
    }
    
    lastCheck = Date.now();
  };
  
  // Initial check
  await runCheck();
  
  // Set up interval
  setInterval(runCheck, checkInterval);
  
  // Keep process alive
  process.stdin.resume();
}

async function showHelp() {
  console.log(`
Usage: check-unauthorized-files [command] [path]

Commands:
  detect    - Detect unauthorized files and directories (default)
  report    - Generate detailed markdown report
  watch     - Watch mode for real-time detection

Examples:
  npm run check-unauthorized
  npm run check-unauthorized detect ./layer/themes
  npm run check-unauthorized report
  npm run check-unauthorized watch

Integration with filesystem-mcp:
  This tool integrates with the filesystem-mcp theme to validate
  platform requirements and frozen directory status.
`);
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});