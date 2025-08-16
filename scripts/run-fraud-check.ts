#!/usr/bin/env bun
/**
 * DEPRECATED: This script is now a wrapper that delegates to the fraud-checker theme
 * All fraud checking logic has been consolidated in layer/themes/infra_fraud-checker
 * 
 * @deprecated Use layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts instead
 */

import { FraudCheckRunner } from '../layer/themes/infra_fraud-checker/scripts/run-fraud-check';

async function main() {
  console.log('⚠️  This script location is deprecated.');
  console.log('   Please use: bun layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts');
  console.log('   Redirecting to the new location...\n');
  
  // Create runner and delegate to theme
  const runner = new FraudCheckRunner();
  const args = process.argv.slice(2);
  
  // Parse basic options for compatibility
  const options = {
    mode: 'comprehensive' as const,
    autoFix: args.includes('--fix'),
    onlyDirectImports: args.includes('--imports-only'),
    outputFormat: 'console' as const
  };

  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Use: bun layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts --help');
    process.exit(0);
  }

  try {
    const report = await runner.runComprehensiveCheck(options);
    
    // Exit with appropriate code based on results
    if (report.summary?.criticalIssues > 0) {
      process.exit(1);
    } else if (report.summary?.highIssues > 0 && !options.autoFix) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error running fraud check:', error);
    process.exit(1);
  }
}

// Markdown generation is now handled in the theme
// This function is kept for backward compatibility only

// Run the main function
main().catch(console.error);