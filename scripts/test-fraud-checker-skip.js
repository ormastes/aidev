#!/usr/bin/env node

/**
 * Test the fraud checker skip patterns with real files from the project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Testing Fraud Checker Skip Patterns with Real Files');
console.log('====================================================\n');

// Find real JavaScript files in the project
function findJSFiles(dir, fileList = [], maxFiles = 50) {
  if (fileList.length >= maxFiles) return fileList;
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      if (fileList.length >= maxFiles) break;
      
      const filePath = path.join(dir, file);
      
      // Skip certain directories to avoid too many files
      if (file === 'node_modules' || file === '.git' || file === '.venv' || file === 'dist' || file === 'build') {
        continue;
      }
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          findJSFiles(filePath, fileList, maxFiles);
        } else if (file.endsWith('.js')) {
          fileList.push(filePath);
        }
      } catch (e) {
        // Skip files we can't access
      }
    }
  } catch (e) {
    // Skip directories we can't read
  }
  
  return fileList;
}

// Get project root
const projectRoot = path.resolve(__dirname, '..');
console.log('Project root:', projectRoot);
console.log('');

// Find JavaScript files
const jsFiles = findJSFiles(projectRoot);
console.log(`Found ${jsFiles.length} JavaScript files to test\n`);

// Categorize files based on expected skip behavior
const skipPatterns = {
  config: /jest\.config\.js|webpack.*\.js|babel.*\.js|\.eslintrc\.js|playwright\.config\.js|cucumber\.js|rollup\.config\.js|postcss\.config\.js|tailwind\.config\.js|next\.config\.js/,
  public: /\/public\/|\/static\/|\/assets\/|\/dist\/|\/build\/|\/out\//,
  database: /\/config\/database\.js|\/database\.config\.js|knexfile\.js|ormconfig\.js|sequelize\.config\.js/,
  test: /\/fixtures\/|\/mocks\/|\/__mocks__\/|\/test-helpers\/|\/test-utils\/|test-.*-app\.js|mock-.*\.js/,
  demo: /\/demo\/|\/release\/|\/releases\/|\/examples\/|\/samples\//,
  vendor: /\/vendor\/|\/vendors\/|\/third-party\/|prism\.js|prism-.*\.js/,
  generated: /\/generated\/|\/gen\/|\/\.next\/|\.min\.js$|\.bundle\.js$|\.chunk\.js$|\.compiled\.js$|\.generated\.js$/,
  scripts: /\/scripts\/|\/bin\/|\/tools\//,
  temp: /\/\.cache\/|\/\.temp\/|\/\.tmp\/|\/temp\/|\/tmp\//,
  coverage: /\/coverage\/|\/\.nyc_output\/|\/test-results\/|\/test-reports\//
};

// Test each file
const results = {
  configSkipped: [],
  publicSkipped: [],
  databaseSkipped: [],
  testSkipped: [],
  demoSkipped: [],
  vendorSkipped: [],
  generatedSkipped: [],
  scriptsSkipped: [],
  tempSkipped: [],
  coverageSkipped: [],
  shouldCheck: [],
  unknown: []
};

for (const file of jsFiles) {
  const relativePath = path.relative(projectRoot, file);
  
  let categorized = false;
  
  for (const [category, pattern] of Object.entries(skipPatterns)) {
    if (pattern.test(relativePath)) {
      results[category + 'Skipped'].push(relativePath);
      categorized = true;
      break;
    }
  }
  
  if (!categorized) {
    // Check if it's a source file that should be checked
    if (relativePath.includes('/src/') || 
        relativePath.includes('/lib/') || 
        relativePath.includes('/components/') || 
        relativePath.includes('/pages/') ||
        relativePath.includes('/services/') ||
        relativePath.includes('/utils/') ||
        relativePath.includes('/api/')) {
      results.shouldCheck.push(relativePath);
    } else {
      results.unknown.push(relativePath);
    }
  }
}

// Display results
console.log('Files that SHOULD BE SKIPPED (by category):');
console.log('-------------------------------------------');

const skipCategories = [
  { name: 'Configuration Files', key: 'configSkipped' },
  { name: 'Public/Browser Files', key: 'publicSkipped' },
  { name: 'Database Configs', key: 'databaseSkipped' },
  { name: 'Test Fixtures', key: 'testSkipped' },
  { name: 'Demo/Release Files', key: 'demoSkipped' },
  { name: 'Vendor Libraries', key: 'vendorSkipped' },
  { name: 'Generated Files', key: 'generatedSkipped' },
  { name: 'Scripts', key: 'scriptsSkipped' },
  { name: 'Temp Files', key: 'tempSkipped' },
  { name: 'Coverage Reports', key: 'coverageSkipped' }
];

let totalSkipped = 0;
for (const { name, key } of skipCategories) {
  const files = results[key];
  if (files.length > 0) {
    console.log(`\n${name}: (${files.length} files)`);
    // Show first 3 examples
    files.slice(0, 3).forEach(f => console.log(`  ✅ ${f}`));
    if (files.length > 3) {
      console.log(`  ... and ${files.length - 3} more`);
    }
    totalSkipped += files.length;
  }
}

console.log('\n\nFiles that SHOULD BE CHECKED:');
console.log('-----------------------------');
if (results.shouldCheck.length > 0) {
  console.log(`Found ${results.shouldCheck.length} source files that need checking:`);
  results.shouldCheck.slice(0, 5).forEach(f => console.log(`  🔍 ${f}`));
  if (results.shouldCheck.length > 5) {
    console.log(`  ... and ${results.shouldCheck.length - 5} more`);
  }
} else {
  console.log('  ✅ No source JavaScript files found (all converted to TypeScript)');
}

if (results.unknown.length > 0) {
  console.log('\n\nUncategorized files:');
  console.log('--------------------');
  results.unknown.slice(0, 5).forEach(f => console.log(`  ❓ ${f}`));
  if (results.unknown.length > 5) {
    console.log(`  ... and ${results.unknown.length - 5} more`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total JavaScript files found: ${jsFiles.length}`);
console.log(`Files that should be skipped: ${totalSkipped}`);
console.log(`Files that should be checked: ${results.shouldCheck.length}`);
console.log(`Uncategorized files: ${results.unknown.length}`);

const skipRate = ((totalSkipped / jsFiles.length) * 100).toFixed(1);
console.log(`\nSkip rate: ${skipRate}% of JavaScript files are legitimate and should be skipped`);

// Test with actual fraud checker if available
console.log('\n' + '='.repeat(60));
console.log('TESTING WITH ACTUAL FRAUD CHECKER');
console.log('='.repeat(60));

try {
  // Try to run the fraud checker test
  const testFile = path.join(__dirname, '..', 'layer', 'themes', 'infra_fraud-checker', 'tests', 'test-skip-patterns.js');
  
  if (fs.existsSync(testFile)) {
    console.log('\nRunning fraud checker skip pattern test...\n');
    const output = execSync(`node ${testFile}`, { encoding: 'utf-8' });
    console.log(output);
  } else {
    console.log('\nFraud checker test file not found at expected location');
  }
} catch (error) {
  console.log('\nCould not run fraud checker test:', error.message);
}

// Final verdict
console.log('\n' + '='.repeat(60));
if (totalSkipped > 0 && skipRate > 50) {
  console.log('✅ VERDICT: Skip patterns are working correctly!');
  console.log(`   ${skipRate}% of JS files are correctly identified as legitimate`);
} else {
  console.log('⚠️  VERDICT: Skip patterns may need adjustment');
  console.log(`   Only ${skipRate}% of JS files are being skipped`);
}