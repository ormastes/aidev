#!/usr/bin/env node
/**
 * Simple fraud check for git commits
 * Only checks files that are staged for commit
 */

const { execSync } = require('child_process');
const fs = require('fs');

try {
  // Get list of staged files - use full path for bun compatibility
  const output = execSync('/usr/bin/git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' });
  const stagedFiles = output
    .trim()
    .split('\n')
    .filter(f => f && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')));

  if (stagedFiles.length === 0) {
    console.log('✅ No TypeScript/JavaScript files staged for commit.');
    console.log('Total violations: 0');
    process.exit(0);
  }

  let totalViolations = 0;

  // Simple patterns to check
  const patterns = {
    hardcodedSecrets: /\b(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    suspiciousPaths: /\b(\/etc\/passwd|\.ssh|\.aws\/credentials)\b/g,
  };

  for (const file of stagedFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for hardcoded secrets (excluding test files and config examples)
      if (!file.includes('/test/') && !file.includes('.test.') && !file.includes('/fixtures/') && !file.includes('/examples/')) {
        const secretMatches = content.match(patterns.hardcodedSecrets);
        if (secretMatches && secretMatches.length > 0) {
          console.log(`🔴 Hardcoded secrets in ${file}: ${secretMatches.length}`);
          totalViolations += secretMatches.length;
        }
      }

      // Check for suspicious file paths
      const pathMatches = content.match(patterns.suspiciousPaths);
      if (pathMatches && pathMatches.length > 0) {
        console.log(`🔴 Suspicious file paths in ${file}: ${pathMatches.length}`);
        totalViolations += pathMatches.length;
      }
    } catch (error) {
      // File might have been deleted, skip it
      continue;
    }
  }

  console.log('\n============================================================');
  console.log('📊 STAGED FILES FRAUD CHECK');
  console.log('============================================================');
  console.log(`📁 Files Checked: ${stagedFiles.length}`);
  console.log(`⚠️  Total violations: ${totalViolations}`);
  console.log('============================================================\n');

  if (totalViolations > 0) {
    console.log('❌ FAILED: Security issues detected in staged files!');
    process.exit(1);
  } else {
    console.log('✅ PASSED: No security issues in staged files.');
    process.exit(0);
  }
} catch (error) {
  console.error('Error running fraud check:', error.message);
  process.exit(1);
}
