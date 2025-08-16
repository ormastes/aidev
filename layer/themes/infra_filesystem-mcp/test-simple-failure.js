#!/usr/bin/env node

/**
 * Simple Failure Detection Tests
 * Verifies that our tests can detect failures
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

class SimpleFailureTest {
  constructor() {
    this.results = [];
  }

  // Simulate test checking for root file blocking
  testRootFileBlocking(serverResponse) {
    const testName = 'Root File Blocking Test';
    
    // This test expects allowed = false for root files
    if (serverResponse.allowed === false) {
      console.log(`${colors.green}✅ PASS:${colors.reset} ${testName}`);
      console.log(`   Root file correctly blocked`);
      return { test: testName, passed: true };
    } else {
      console.log(`${colors.red}❌ FAIL:${colors.reset} ${testName}`);
      console.log(`   Expected: allowed = false`);
      console.log(`   Got: allowed = ${serverResponse.allowed}`);
      return { test: testName, passed: false, reason: 'Root file not blocked' };
    }
  }

  // Simulate test checking for path traversal blocking
  testPathTraversalBlocking(serverResponse) {
    const testName = 'Path Traversal Blocking Test';
    
    // This test expects path traversal to be blocked
    if (serverResponse.allowed === false && 
        serverResponse.issues?.some(i => i.type === 'PATH_TRAVERSAL')) {
      console.log(`${colors.green}✅ PASS:${colors.reset} ${testName}`);
      console.log(`   Path traversal correctly blocked`);
      return { test: testName, passed: true };
    } else {
      console.log(`${colors.red}❌ FAIL:${colors.reset} ${testName}`);
      console.log(`   Path traversal not detected`);
      return { test: testName, passed: false, reason: 'Path traversal not blocked' };
    }
  }

  // Simulate test checking for NAME_ID validation
  testNameIdValidation(serverResponse) {
    const testName = 'NAME_ID Validation Test';
    
    // This test expects success with a valid ID
    if (serverResponse.success === true && serverResponse.id) {
      console.log(`${colors.green}✅ PASS:${colors.reset} ${testName}`);
      console.log(`   File registered with ID: ${serverResponse.id}`);
      return { test: testName, passed: true };
    } else {
      console.log(`${colors.red}❌ FAIL:${colors.reset} ${testName}`);
      console.log(`   NAME_ID validation failed`);
      return { test: testName, passed: false, reason: 'No ID assigned' };
    }
  }

  // Run tests with different server behaviors
  runScenarios() {
    console.log(`${colors.bright}${colors.cyan}TESTING FAILURE DETECTION CAPABILITY${colors.reset}\n`);
    console.log('=' .repeat(60));

    // Scenario 1: Broken server that allows root files
    console.log(`\n${colors.bright}Scenario 1: Server INCORRECTLY allows root files${colors.reset}`);
    console.log('-'.repeat(40));
    const brokenResponse1 = {
      allowed: true,  // WRONG: Should be false
      issues: []
    };
    const result1 = this.testRootFileBlocking(brokenResponse1);
    this.results.push(result1);
    if (!result1.passed) {
      console.log(`   ${colors.green}✓ Test correctly detected the failure${colors.reset}`);
    }

    // Scenario 2: Working server that blocks root files
    console.log(`\n${colors.bright}Scenario 2: Server CORRECTLY blocks root files${colors.reset}`);
    console.log('-'.repeat(40));
    const correctResponse1 = {
      allowed: false,  // CORRECT
      issues: [{ type: 'ROOT_FILE_VIOLATION', message: 'Not allowed' }]
    };
    const result2 = this.testRootFileBlocking(correctResponse1);
    this.results.push(result2);
    if (result2.passed) {
      console.log(`   ${colors.green}✓ Test correctly passed${colors.reset}`);
    }

    // Scenario 3: Broken server that allows path traversal
    console.log(`\n${colors.bright}Scenario 3: Server INCORRECTLY allows path traversal${colors.reset}`);
    console.log('-'.repeat(40));
    const brokenResponse2 = {
      allowed: true,  // WRONG: Should block ../../../etc/passwd
      issues: []
    };
    const result3 = this.testPathTraversalBlocking(brokenResponse2);
    this.results.push(result3);
    if (!result3.passed) {
      console.log(`   ${colors.green}✓ Test correctly detected the failure${colors.reset}`);
    }

    // Scenario 4: Working server that blocks path traversal
    console.log(`\n${colors.bright}Scenario 4: Server CORRECTLY blocks path traversal${colors.reset}`);
    console.log('-'.repeat(40));
    const correctResponse2 = {
      allowed: false,  // CORRECT
      issues: [{ type: 'PATH_TRAVERSAL', message: 'Path traversal detected' }]
    };
    const result4 = this.testPathTraversalBlocking(correctResponse2);
    this.results.push(result4);
    if (result4.passed) {
      console.log(`   ${colors.green}✓ Test correctly passed${colors.reset}`);
    }

    // Scenario 5: Broken server with no NAME_ID validation
    console.log(`\n${colors.bright}Scenario 5: Server with NO NAME_ID validation${colors.reset}`);
    console.log('-'.repeat(40));
    const brokenResponse3 = {
      success: true,
      // WRONG: No ID assigned
      message: 'Created without validation'
    };
    const result5 = this.testNameIdValidation(brokenResponse3);
    this.results.push(result5);
    if (!result5.passed) {
      console.log(`   ${colors.green}✓ Test correctly detected the failure${colors.reset}`);
    }

    // Scenario 6: Working server with NAME_ID validation
    console.log(`\n${colors.bright}Scenario 6: Server with PROPER NAME_ID validation${colors.reset}`);
    console.log('-'.repeat(40));
    const correctResponse3 = {
      success: true,
      id: 'test-001',  // CORRECT: ID assigned
      message: 'Registered in NAME_ID'
    };
    const result6 = this.testNameIdValidation(correctResponse3);
    this.results.push(result6);
    if (result6.passed) {
      console.log(`   ${colors.green}✓ Test correctly passed${colors.reset}`);
    }

    // Scenario 7: Server returns wrong data structure
    console.log(`\n${colors.bright}Scenario 7: Server returns WRONG data structure${colors.reset}`);
    console.log('-'.repeat(40));
    const wrongStructure = {
      status: 'ok',  // WRONG: Missing 'allowed' field
      code: 200
    };
    try {
      const result7 = this.testRootFileBlocking(wrongStructure);
      this.results.push(result7);
      if (!result7.passed) {
        console.log(`   ${colors.green}✓ Test correctly detected wrong structure${colors.reset}`);
      }
    } catch (error) {
      console.log(`   ${colors.green}✓ Test correctly failed on wrong structure${colors.reset}`);
      this.results.push({ test: 'Wrong Structure Test', passed: false });
    }

    this.printSummary();
  }

  printSummary() {
    const total = this.results.length;
    const failuresDetected = this.results.filter(r => !r.passed).length;
    const correctPasses = this.results.filter(r => r.passed).length;

    console.log('\n' + '=' .repeat(60));
    console.log(`${colors.bright}${colors.cyan}FAILURE DETECTION SUMMARY${colors.reset}`);
    console.log('=' .repeat(60));
    console.log(`Total Scenarios: ${total}`);
    console.log(`Failures Correctly Detected: ${failuresDetected}`);
    console.log(`Correct Passes: ${correctPasses}`);
    console.log('=' .repeat(60));

    // Expected: 4 failures detected, 3 correct passes
    const expectedFailures = 4;
    const expectedPasses = 3;

    if (failuresDetected === expectedFailures && correctPasses === expectedPasses) {
      console.log(`\n${colors.bright}${colors.green}✅ PERFECT FAILURE DETECTION${colors.reset}`);
      console.log('All broken server behaviors were correctly detected as failures.');
      console.log('All correct server behaviors passed as expected.');
    } else {
      console.log(`\n${colors.bright}${colors.yellow}⚠️ DETECTION ISSUES${colors.reset}`);
      console.log(`Expected ${expectedFailures} failures detected, got ${failuresDetected}`);
      console.log(`Expected ${expectedPasses} passes, got ${correctPasses}`);
    }

    // Show which scenarios worked correctly
    console.log(`\n${colors.bright}Scenario Results:${colors.reset}`);
    const scenarios = [
      'Broken: Allows root files',
      'Correct: Blocks root files',
      'Broken: Allows path traversal',
      'Correct: Blocks path traversal',
      'Broken: No NAME_ID validation',
      'Correct: NAME_ID validation',
      'Broken: Wrong structure'
    ];

    this.results.forEach((result, index) => {
      const scenario = scenarios[index];
      const expectedFail = scenario.includes('Broken');
      const actualFail = !result.passed;
      const detectedCorrectly = expectedFail === actualFail;
      
      console.log(`  ${scenario}:`);
      console.log(`    Expected: ${expectedFail ? 'FAIL' : 'PASS'}`);
      console.log(`    Actual: ${actualFail ? 'FAIL' : 'PASS'}`);
      console.log(`    Detection: ${detectedCorrectly ? colors.green + '✅ Correct' : colors.red + '❌ Wrong'}${colors.reset}`);
    });
  }
}

// Run the test
const tester = new SimpleFailureTest();
tester.runScenarios();