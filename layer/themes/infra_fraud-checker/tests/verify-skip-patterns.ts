#!/usr/bin/env ts-node

/**
 * Test script to verify fraud checker respects JavaScript skip patterns
 */

import { EnhancedFraudChecker } from '../src/detectors/enhanced-fraud-detector';

// Test files that should be skipped
const filesToSkip = [
  'jest.config.js',
  'webpack.config.js',
  'babel.config.js',
  'public/js/app.js',
  'node_modules/some-lib/index.js',
  'dist/bundle.js',
  'coverage/lcov-report/index.js',
  'vendor/prism.js',
  'demo/example.js',
  'test-helpers/mock.js',
  'config/database.js',
  '.next/static/chunks/main.js',
  'generated/api-client.js',
  'scripts/build.js',
  'app.min.js',
  'bundle.chunk.js'
];

// Test files that should NOT be skipped
const filesToCheck = [
  'src/services/validator.js',
  'lib/utils/helper.js',
  'components/Button.js',
  'pages/index.js',
  'api/routes.js',
  'models/User.js',
  'controllers/auth.js'
];

// TypeScript files should always be checked
const typescriptFiles = [
  'src/index.ts',
  'components/Button.tsx',
  'utils/helper.ts',
  'types/index.d.ts'
];

console.log('Testing Fraud Checker Skip Patterns');
console.log('====================================\n');

const checker = new EnhancedFraudChecker({
  enableML: false,
  enableThreatIntel: false,
  enableBehaviorAnalysis: false
});

// Test files that should be skipped
console.log('Files that SHOULD be skipped:');
console.log('-----------------------------');
let skippedCorrectly = 0;
let skippedIncorrectly = 0;

for (const file of filesToSkip) {
  const result = checker.checkJavaScriptFile(file);
  if (!result.shouldCheck && result.isLegitimate) {
    console.log(`✅ ${file}`);
    console.log(`   Reason: ${result.reason}`);
    console.log(`   Category: ${result.category}\n`);
    skippedCorrectly++;
  } else {
    console.log(`❌ ${file} - NOT SKIPPED (should be skipped)`);
    skippedIncorrectly++;
  }
}

// Test files that should NOT be skipped
console.log('\nFiles that should NOT be skipped:');
console.log('---------------------------------');
let checkedCorrectly = 0;
let checkedIncorrectly = 0;

for (const file of filesToCheck) {
  const result = checker.checkJavaScriptFile(file);
  if (result.shouldCheck) {
    console.log(`✅ ${file}`);
    console.log(`   Reason: ${result.reason}\n`);
    checkedCorrectly++;
  } else {
    console.log(`❌ ${file} - SKIPPED (should not be skipped)`);
    console.log(`   Reason: ${result.reason}`);
    console.log(`   Category: ${result.category}\n`);
    checkedIncorrectly++;
  }
}

// Test TypeScript files (should always be checked)
console.log('\nTypeScript files (should always be checked):');
console.log('-------------------------------------------');
let tsCheckedCorrectly = 0;

for (const file of typescriptFiles) {
  const result = checker.checkJavaScriptFile(file);
  if (result.shouldCheck) {
    console.log(`✅ ${file}`);
    tsCheckedCorrectly++;
  } else {
    console.log(`❌ ${file} - INCORRECTLY SKIPPED`);
  }
}

// Test with full file paths
console.log('\nTesting with full paths:');
console.log('------------------------');
const testPaths = [
  '/home/user/project/jest.config.js',
  '/home/user/project/src/index.js',
  '/home/user/project/public/js/app.js',
  '/home/user/project/node_modules/react/index.js'
];

for (const fullPath of testPaths) {
  const result = checker.checkJavaScriptFile(fullPath);
  console.log(`${result.shouldCheck ? '🔍' : '⏭️'} ${fullPath}`);
  console.log(`   Should check: ${result.shouldCheck}`);
  console.log(`   Is legitimate: ${result.isLegitimate}`);
  console.log(`   Reason: ${result.reason}\n`);
}

// Print statistics
console.log('\nSkip Pattern Statistics:');
console.log('------------------------');
const stats = checker.getSkipPatternStats();
for (const [category, count] of Object.entries(stats)) {
  console.log(`${category}: ${count} patterns`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('SUMMARY');
console.log('='.repeat(50));
console.log(`Files to skip: ${skippedCorrectly}/${filesToSkip.length} correctly skipped`);
console.log(`Files to check: ${checkedCorrectly}/${filesToCheck.length} correctly checked`);
console.log(`TypeScript files: ${tsCheckedCorrectly}/${typescriptFiles.length} correctly checked`);

const totalTests = filesToSkip.length + filesToCheck.length + typescriptFiles.length;
const totalCorrect = skippedCorrectly + checkedCorrectly + tsCheckedCorrectly;
const successRate = ((totalCorrect / totalTests) * 100).toFixed(1);

console.log(`\nOverall Success Rate: ${successRate}%`);

if (successRate === '100.0') {
  console.log('✅ All tests passed! Skip patterns are working correctly.');
} else {
  console.log(`⚠️ Some tests failed. Success rate: ${successRate}%`);
  process.exit(1);
}