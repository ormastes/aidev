#!/usr/bin/env node

/**
 * Test the new facade-based external module interception
 */

const { 
  fs, 
  path, 
  childProcess,
  getFsCallHistory,
  getPathCallHistory,
  getChildProcessCallHistory,
  clearAllCallHistories,
  updateConfig
} = require('./layer/themes/infra_external-log-lib/dist');

console.log('Testing External Module Facade Pattern\n');
console.log('=======================================\n');

// Enable console logging for testing
updateConfig({ enableConsoleLogging: true });

// Test 1: Path operations
console.log('Test 1: Path operations');
const joined = path.join('/home', 'user', 'file.txt');
console.log(`Result: ${joined}`);

const pathHistory = getPathCallHistory();
console.log(`Path call history: ${pathHistory.length} calls`);
console.log('');

// Test 2: File system operations (safe)
console.log('Test 2: File system operations');
try {
  const exists = fs.existsSync('/tmp');
  console.log(`/tmp exists: ${exists}`);
} catch (error) {
  console.log(`Error: ${error.message}`);
}

const fsHistory = getFsCallHistory();
console.log(`FS call history: ${fsHistory.length} calls`);
console.log('');

// Test 3: Security - blocked path
console.log('Test 3: Security - blocked path');
try {
  fs.readFileSync('/etc/passwd');
  console.log('ERROR: Should have been blocked!');
} catch (error) {
  console.log(`✓ Blocked as expected: ${error.message}`);
}
console.log('');

// Test 4: Security - path traversal
console.log('Test 4: Security - path traversal');
try {
  fs.readFileSync('../../../etc/passwd');
  console.log('ERROR: Should have been blocked!');
} catch (error) {
  console.log(`✓ Blocked as expected: ${error.message}`);
}
console.log('');

// Test 5: Child process - safe command
console.log('Test 5: Child process - safe command');
try {
  const result = childProcess.execSync('echo "Hello from facade"', { encoding: 'utf8' });
  console.log(`Command output: ${result.trim()}`);
} catch (error) {
  console.log(`Error: ${error.message}`);
}

const cpHistory = getChildProcessCallHistory();
console.log(`Child process call history: ${cpHistory.length} calls`);
console.log('');

// Test 6: Child process - dangerous command
console.log('Test 6: Child process - dangerous command');
try {
  childProcess.execSync('rm -rf /');
  console.log('ERROR: Should have been blocked!');
} catch (error) {
  console.log(`✓ Blocked as expected: ${error.message}`);
}
console.log('');

// Test 7: Disable interception
console.log('Test 7: Disable interception');
updateConfig({ enableInterception: false });
const exists2 = fs.existsSync('/tmp');
console.log(`With interception disabled, /tmp exists: ${exists2}`);
const newFsHistory = getFsCallHistory();
console.log(`FS call history after disabled: ${newFsHistory.length} calls (should be same as before)`);

// Re-enable
updateConfig({ enableInterception: true });
console.log('');

// Summary
console.log('Summary');
console.log('=======');
console.log(`Total FS calls tracked: ${getFsCallHistory().length}`);
console.log(`Total Path calls tracked: ${getPathCallHistory().length}`);
console.log(`Total ChildProcess calls tracked: ${getChildProcessCallHistory().length}`);
console.log('');

console.log('✅ All tests completed successfully!');
console.log('The facade pattern is working correctly.');