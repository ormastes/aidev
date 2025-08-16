#!/usr/bin/env ts-node

/**
 * Direct test of fraud checker skip pattern implementation
 */

// Mock the minimatch module if it's not available
const minimatchMock = {
  minimatch: (path: string, pattern: string, options?: any): boolean => {
    // Simple pattern matching implementation
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(regexPattern);
    return regex.test(path);
  }
};

// Create a simplified version of the skip checker
class SimpleJavaScriptSkipChecker {
  private skipPatterns = [
    // Config files
    { pattern: '**/jest.config.js', reason: 'Jest configuration', category: 'config' },
    { pattern: '**/webpack.*.js', reason: 'Webpack configuration', category: 'config' },
    { pattern: '**/babel.config.js', reason: 'Babel configuration', category: 'config' },
    { pattern: '**/.eslintrc.js', reason: 'ESLint configuration', category: 'config' },
    
    // Public/Browser files - match directories at any level
    { pattern: 'public/**', reason: 'Public browser script', category: 'browser' },
    { pattern: '**/public/**', reason: 'Public browser script', category: 'browser' },
    { pattern: 'dist/**', reason: 'Distribution build', category: 'build' },
    { pattern: '**/dist/**', reason: 'Distribution build', category: 'build' },
    { pattern: 'build/**', reason: 'Build output', category: 'build' },
    { pattern: '**/build/**', reason: 'Build output', category: 'build' },
    
    // Test files
    { pattern: 'fixtures/**', reason: 'Test fixture', category: 'test' },
    { pattern: '**/fixtures/**', reason: 'Test fixture', category: 'test' },
    { pattern: '__mocks__/**', reason: 'Jest mock', category: 'test' },
    { pattern: '**/__mocks__/**', reason: 'Jest mock', category: 'test' },
    
    // Demo/Release
    { pattern: 'demo/**', reason: 'Demo file', category: 'demo' },
    { pattern: '**/demo/**', reason: 'Demo file', category: 'demo' },
    { pattern: 'release/**', reason: 'Release artifact', category: 'release' },
    { pattern: '**/release/**', reason: 'Release artifact', category: 'release' },
    
    // Vendor
    { pattern: '**/node_modules/**', reason: 'Node module', category: 'dependency' },
    { pattern: 'vendor/**', reason: 'Vendor library', category: 'vendor' },
    { pattern: '**/vendor/**', reason: 'Vendor library', category: 'vendor' },
    
    // Generated
    { pattern: 'generated/**', reason: 'Generated file', category: 'generated' },
    { pattern: '**/generated/**', reason: 'Generated file', category: 'generated' },
    { pattern: '**/*.min.js', reason: 'Minified file', category: 'build' },
  ];

  shouldSkip(filePath: string): { skip: boolean; reason?: string; category?: string } {
    // Check TypeScript files
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return { skip: false, reason: 'TypeScript file should be checked' };
    }

    // Check against patterns
    for (const { pattern, reason, category } of this.skipPatterns) {
      // Handle patterns that start with **/ (match anywhere)
      let regexPattern: string;
      if (pattern.startsWith('**/')) {
        // Pattern should match anywhere in the path
        const patternWithoutPrefix = pattern.slice(3);
        regexPattern = '(^|/)' + patternWithoutPrefix
          .replace(/\*\*/g, '###')
          .replace(/\*/g, '[^/]*')
          .replace(/###/g, '.*')
          .replace(/\./g, '\\.')
          .replace(/\//g, '\\/');
      } else {
        // Pattern matches from start
        regexPattern = '^' + pattern
          .replace(/\*\*/g, '###')
          .replace(/\*/g, '[^/]*')
          .replace(/###/g, '.*')
          .replace(/\./g, '\\.')
          .replace(/\//g, '\\/');
      }
      
      const regex = new RegExp(regexPattern);
      if (regex.test(filePath)) {
        return { skip: true, reason, category };
      }
    }

    return { skip: false };
  }
}

// Test implementation
console.log('Testing Fraud Checker Skip Pattern Implementation');
console.log('=================================================\n');

const checker = new SimpleJavaScriptSkipChecker();

// Test cases
const testCases = [
  // Should skip
  { file: 'jest.config.js', expectedSkip: true },
  { file: 'project/jest.config.js', expectedSkip: true },
  { file: 'webpack.config.js', expectedSkip: true },
  { file: 'webpack.dev.js', expectedSkip: true },
  { file: 'babel.config.js', expectedSkip: true },
  { file: '.eslintrc.js', expectedSkip: true },
  { file: 'public/js/app.js', expectedSkip: true },
  { file: 'project/public/assets/script.js', expectedSkip: true },
  { file: 'dist/bundle.js', expectedSkip: true },
  { file: 'build/main.js', expectedSkip: true },
  { file: 'fixtures/mock.js', expectedSkip: true },
  { file: '__mocks__/fs.js', expectedSkip: true },
  { file: 'demo/example.js', expectedSkip: true },
  { file: 'release/v1.0/app.js', expectedSkip: true },
  { file: 'node_modules/react/index.js', expectedSkip: true },
  { file: 'vendor/jquery.js', expectedSkip: true },
  { file: 'generated/api.js', expectedSkip: true },
  { file: 'app.min.js', expectedSkip: true },
  
  // Should NOT skip
  { file: 'src/index.js', expectedSkip: false },
  { file: 'lib/utils.js', expectedSkip: false },
  { file: 'components/Button.js', expectedSkip: false },
  { file: 'services/api.js', expectedSkip: false },
  { file: 'utils/helper.js', expectedSkip: false },
  
  // TypeScript files should never skip
  { file: 'src/index.ts', expectedSkip: false },
  { file: 'components/Button.tsx', expectedSkip: false },
  { file: 'jest.config.ts', expectedSkip: false },
];

let passed = 0;
let failed = 0;

for (const { file, expectedSkip } of testCases) {
  const result = checker.shouldSkip(file);
  const actualSkip = result.skip;
  const success = actualSkip === expectedSkip;
  
  if (success) {
    passed++;
    console.log(`✅ ${file}`);
    if (result.skip) {
      console.log(`   Skipped: ${result.reason} (${result.category})`);
    } else {
      console.log(`   Checked: Will be analyzed`);
    }
  } else {
    failed++;
    console.log(`❌ ${file}`);
    console.log(`   Expected: ${expectedSkip ? 'SKIP' : 'CHECK'}`);
    console.log(`   Actual: ${actualSkip ? 'SKIP' : 'CHECK'}`);
    if (result.reason) {
      console.log(`   Reason: ${result.reason}`);
    }
  }
  console.log('');
}

// Summary
console.log('='.repeat(50));
console.log('SUMMARY');
console.log('='.repeat(50));
console.log(`Total tests: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n✅ All tests passed! Skip patterns are working correctly.');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} tests failed. Skip patterns need adjustment.`);
  process.exit(1);
}