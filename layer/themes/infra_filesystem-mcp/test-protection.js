#!/usr/bin/env node

/**
 * Local Filesystem MCP Protection Test
 * Tests if CLAUDE.md and .vf.json files are protected
 */

const { fs } = require('../infra_external-log-lib/src');
const { path } = require('../infra_external-log-lib/src');

const workspaceRoot = path.join(__dirname, '../../..');
const resultsDir = path.join(__dirname, 'docker-test/results');

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    protected: 0,
    unprotected: 0
  }
};

console.log('=====================================');
console.log('Filesystem MCP Protection Test');
console.log('=====================================\n');

/**
 * Test if a file is protected from modification
 */
function testFileProtection(filePath, fileName) {
  const fullPath = path.join(workspaceRoot, filePath);
  
  console.log(`Testing ${fileName}...`);
  results.summary.total++;
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  SKIPPED (file not found)`);
    results.tests.push({
      file: fileName,
      status: 'skipped',
      reason: 'File not found'
    });
    return;
  }
  
  // Read original content
  const original = fs.readFileSync(fullPath, 'utf-8');
  
  // Try to modify
  const testContent = original + '\n\n## TEST MODIFICATION - Should be blocked\n';
  
  try {
    // Attempt to write
    fs.writeFileSync(fullPath, testContent);
    
    // If successful, immediately restore
    fs.writeFileSync(fullPath, original);
    
    console.log(`  ❌ NOT PROTECTED - Direct modification allowed`);
    results.summary.unprotected++;
    results.tests.push({
      file: fileName,
      status: 'unprotected',
      violation: 'Direct modification allowed'
    });
    
  } catch (error) {
    console.log(`  ✅ PROTECTED - ${error.message}`);
    results.summary.protected++;
    results.tests.push({
      file: fileName,
      status: 'protected',
      error: error.message
    });
  }
}

/**
 * Test root file creation
 */
function testRootFileCreation() {
  console.log('Testing root file creation...');
  results.summary.total++;
  
  const testFile = path.join(workspaceRoot, 'test-violation.txt');
  
  try {
    fs.writeFileSync(testFile, 'This should not be allowed');
    fs.unlinkSync(testFile);
    
    console.log('  ❌ NOT PROTECTED - Root file creation allowed');
    results.summary.unprotected++;
    results.tests.push({
      file: 'root file creation',
      status: 'unprotected',
      violation: 'Root file creation allowed'
    });
    
  } catch (error) {
    console.log(`  ✅ PROTECTED - ${error.message}`);
    results.summary.protected++;
    results.tests.push({
      file: 'root file creation',
      status: 'protected',
      error: error.message
    });
  }
}

/**
 * Test .vf.json modification
 */
function testVfJsonModification(filePath, fileName) {
  const fullPath = path.join(workspaceRoot, filePath);
  
  console.log(`Testing ${fileName} JSON structure...`);
  results.summary.total++;
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  SKIPPED (file not found)`);
    results.tests.push({
      file: `${fileName} JSON`,
      status: 'skipped',
      reason: 'File not found'
    });
    return;
  }
  
  // Read original content
  const original = fs.readFileSync(fullPath, 'utf-8');
  
  try {
    const data = JSON.parse(original);
    
    // Add test modification
    data.__test_modification__ = 'This should not be allowed';
    data.metadata = data.metadata || {};
    data.metadata.__test_timestamp__ = new Date().toISOString();
    
    // Try to write modified JSON
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    
    // If successful, restore original
    fs.writeFileSync(fullPath, original);
    
    console.log(`  ❌ NOT PROTECTED - JSON modification allowed`);
    results.summary.unprotected++;
    results.tests.push({
      file: `${fileName} JSON`,
      status: 'unprotected',
      violation: 'JSON structure modification allowed'
    });
    
  } catch (error) {
    console.log(`  ✅ PROTECTED - ${error.message}`);
    results.summary.protected++;
    results.tests.push({
      file: `${fileName} JSON`,
      status: 'protected',
      error: error.message
    });
  }
}

// Run tests
console.log('1. Testing Direct File Protection');
console.log('----------------------------------');
testFileProtection('CLAUDE.md', 'CLAUDE.md');
testFileProtection('README.md', 'README.md');

console.log('\n2. Testing .vf.json Files');
console.log('-------------------------');
testVfJsonModification('TASK_QUEUE.vf.json', 'TASK_QUEUE.vf.json');
testVfJsonModification('FEATURE.vf.json', 'FEATURE.vf.json');
testVfJsonModification('NAME_ID.vf.json', 'NAME_ID.vf.json');
testVfJsonModification('FILE_STRUCTURE.vf.json', 'FILE_STRUCTURE.vf.json');

console.log('\n3. Testing Root File Creation');
console.log('-----------------------------');
testRootFileCreation();

// Calculate protection rate
results.summary.protection_rate = results.summary.total > 0
  ? Math.round((results.summary.protected / results.summary.total) * 100)
  : 0;

// Save results
const reportPath = path.join(resultsDir, `protection-test-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

// Display summary
console.log('\n=====================================');
console.log('Test Summary');
console.log('=====================================');
console.log(`Total Tests: ${results.summary.total}`);
console.log(`Protected: ${results.summary.protected} ✅`);
console.log(`Unprotected: ${results.summary.unprotected} ❌`);
console.log(`Protection Rate: ${results.summary.protection_rate}%`);

console.log(`\nReport saved to: ${reportPath}`);

// Generate markdown report
const mdReport = `# Filesystem MCP Protection Test Report

Generated: ${results.timestamp}

## Summary

- **Total Tests**: ${results.summary.total}
- **Protected**: ${results.summary.protected} ✅
- **Unprotected**: ${results.summary.unprotected} ❌
- **Protection Rate**: ${results.summary.protection_rate}%

## Test Results

| File | Status | Details |
|------|--------|---------|
${results.tests.map(t => 
  `| ${t.file} | ${t.status === 'protected' ? '✅ Protected' : 
                   t.status === 'unprotected' ? '❌ Not Protected' : 
                   '⚠️ Skipped'} | ${t.violation || t.error || t.reason || '-'} |`
).join('\n')}

## Recommendations

${results.summary.unprotected > 0 ? `
⚠️ **Warning**: ${results.summary.unprotected} file(s) are not properly protected.

To enable protection:
1. Start the MCP server in strict or enhanced mode
2. Configure file system permissions appropriately
3. Use MCP protocol for all file modifications
` : '✅ All files are properly protected!'}
`;

const mdPath = path.join(resultsDir, `protection-test-${Date.now()}.md`);
fs.writeFileSync(mdPath, mdReport);
console.log(`Markdown report: ${mdPath}`);

// Exit with error if files are unprotected
if (results.summary.unprotected > 0) {
  console.log(`\n❌ ERROR: ${results.summary.unprotected} files are not protected!`);
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: All files are properly protected!');
  process.exit(0);
}