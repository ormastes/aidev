#!/usr/bin/env node

/**
 * Failure Detection Test for Filesystem MCP
 * This test verifies that the system can detect and report protection failures
 */

const { fs } = require('../infra_external-log-lib/src');
const { path } = require('../infra_external-log-lib/src');
const { spawn } = require('child_process');

const workspaceRoot = path.join(__dirname, '../../..');
const resultsDir = path.join(__dirname, 'docker-test/results');

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

console.log('=====================================');
console.log('Failure Detection Test');
console.log('=====================================\n');

const testResults = {
  timestamp: new Date().toISOString(),
  detectionTests: [],
  summary: {
    total: 0,
    detected: 0,
    missed: 0,
    detectionRate: 0
  }
};

/**
 * Test if system can detect direct file modification
 */
async function testDirectModificationDetection() {
  console.log('1. Testing Direct Modification Detection');
  console.log('----------------------------------------');
  
  const testFile = path.join(workspaceRoot, 'CLAUDE.md');
  const result = {
    test: 'Direct CLAUDE.md modification',
    detected: false,
    method: null,
    details: ''
  };
  
  testResults.summary.total++;
  
  try {
    // Check if file is protected
    const original = fs.readFileSync(testFile, 'utf-8');
    const modified = original + '\n## Test Modification';
    
    // Attempt modification
    let modificationAllowed = false;
    try {
      fs.writeFileSync(testFile, modified);
      fs.writeFileSync(testFile, original); // Restore immediately
      modificationAllowed = true;
    } catch (error) {
      // File is protected
      result.detected = true;
      result.method = 'filesystem_protection';
      result.details = error.message;
    }
    
    if (modificationAllowed) {
      // Check if violation was logged
      const logFiles = fs.readdirSync(resultsDir)
        .filter(f => f.includes('violation') || f.includes('protection'));
      
      if (logFiles.length > 0) {
        result.detected = true;
        result.method = 'violation_log';
        result.details = `Violation logged in ${logFiles[0]}`;
      } else {
        console.log('  ❌ Modification not detected - No protection or logging');
      }
    } else {
      console.log('  ✅ Modification blocked by filesystem protection');
    }
    
  } catch (error) {
    result.detected = true;
    result.method = 'exception';
    result.details = error.message;
  }
  
  if (result.detected) {
    testResults.summary.detected++;
    console.log(`  ✅ DETECTED via ${result.method}`);
  } else {
    testResults.summary.missed++;
    console.log('  ❌ NOT DETECTED');
  }
  
  testResults.detectionTests.push(result);
  console.log('');
}

/**
 * Test if system can detect root file creation
 */
async function testRootFileCreationDetection() {
  console.log('2. Testing Root File Creation Detection');
  console.log('----------------------------------------');
  
  const testFile = path.join(workspaceRoot, 'test-violation-' + Date.now() + '.txt');
  const result = {
    test: 'Root file creation',
    detected: false,
    method: null,
    details: ''
  };
  
  testResults.summary.total++;
  
  try {
    // Attempt to create file
    let creationAllowed = false;
    try {
      fs.writeFileSync(testFile, 'This should not be allowed');
      fs.unlinkSync(testFile); // Delete immediately
      creationAllowed = true;
    } catch (error) {
      result.detected = true;
      result.method = 'filesystem_protection';
      result.details = error.message;
    }
    
    if (creationAllowed) {
      console.log('  ⚠️  Root file creation was allowed');
      
      // Check for violation detection in logs
      const logs = checkViolationLogs('ROOT_FILE_VIOLATION');
      if (logs.found) {
        result.detected = true;
        result.method = 'violation_log';
        result.details = logs.details;
      }
    }
    
  } catch (error) {
    result.detected = true;
    result.method = 'exception';
    result.details = error.message;
  }
  
  if (result.detected) {
    testResults.summary.detected++;
    console.log(`  ✅ DETECTED via ${result.method}`);
  } else {
    testResults.summary.missed++;
    console.log('  ❌ NOT DETECTED');
  }
  
  testResults.detectionTests.push(result);
  console.log('');
}

/**
 * Test if system can detect .vf.json modifications
 */
async function testVfJsonModificationDetection() {
  console.log('3. Testing .vf.json Modification Detection');
  console.log('-------------------------------------------');
  
  const vfFiles = ['TASK_QUEUE.vf.json', 'FEATURE.vf.json'];
  
  for (const vfFile of vfFiles) {
    const testFile = path.join(workspaceRoot, vfFile);
    
    if (!fs.existsSync(testFile)) {
      console.log(`  ⚠️  ${vfFile} not found, skipping`);
      continue;
    }
    
    const result = {
      test: `${vfFile} modification`,
      detected: false,
      method: null,
      details: ''
    };
    
    testResults.summary.total++;
    
    try {
      const original = fs.readFileSync(testFile, 'utf-8');
      const data = JSON.parse(original);
      data.__violation_test__ = Date.now();
      
      let modificationAllowed = false;
      try {
        fs.writeFileSync(testFile, JSON.stringify(data, null, 2));
        fs.writeFileSync(testFile, original); // Restore
        modificationAllowed = true;
      } catch (error) {
        result.detected = true;
        result.method = 'filesystem_protection';
        result.details = error.message;
      }
      
      if (modificationAllowed) {
        // Check for detection in other ways
        const logs = checkViolationLogs('VF_JSON_VIOLATION');
        if (logs.found) {
          result.detected = true;
          result.method = 'violation_log';
          result.details = logs.details;
        }
      }
      
    } catch (error) {
      result.detected = true;
      result.method = 'exception';
      result.details = error.message;
    }
    
    if (result.detected) {
      testResults.summary.detected++;
      console.log(`  ✅ ${vfFile}: DETECTED via ${result.method}`);
    } else {
      testResults.summary.missed++;
      console.log(`  ❌ ${vfFile}: NOT DETECTED`);
    }
    
    testResults.detectionTests.push(result);
  }
  
  console.log('');
}

/**
 * Test if MCP server detects violations
 */
async function testMCPServerDetection() {
  console.log('4. Testing MCP Server Violation Detection');
  console.log('------------------------------------------');
  
  const result = {
    test: 'MCP server violation detection',
    detected: false,
    method: null,
    details: ''
  };
  
  testResults.summary.total++;
  
  // Check if MCP server is running
  const mcpRunning = await checkMCPServer();
  
  if (!mcpRunning) {
    console.log('  ⚠️  MCP server not running, skipping');
    result.details = 'MCP server not available';
  } else {
    // Send test violation via MCP protocol
    const violation = await sendMCPViolation();
    
    if (violation.blocked) {
      result.detected = true;
      result.method = 'mcp_protocol';
      result.details = violation.response;
      console.log('  ✅ MCP server blocked violation');
    } else {
      console.log('  ❌ MCP server did not block violation');
    }
  }
  
  if (result.detected) {
    testResults.summary.detected++;
  } else {
    testResults.summary.missed++;
  }
  
  testResults.detectionTests.push(result);
  console.log('');
}

/**
 * Check violation logs
 */
function checkViolationLogs(violationType) {
  try {
    const logFiles = fs.readdirSync(resultsDir)
      .filter(f => f.includes('violation') || f.includes('protection'))
      .sort()
      .reverse();
    
    for (const logFile of logFiles) {
      const content = fs.readFileSync(path.join(resultsDir, logFile), 'utf-8');
      if (content.includes(violationType)) {
        return {
          found: true,
          details: `Found in ${logFile}`
        };
      }
    }
  } catch (error) {
    // No logs found
  }
  
  return { found: false, details: 'No violation logs found' };
}

/**
 * Check if MCP server is running
 */
async function checkMCPServer() {
  return new Promise((resolve) => {
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.on('open', () => {
        ws.close();
        resolve(true);
      });
      
      ws.on('error', () => {
        resolve(false);
      });
      
      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 2000);
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Send violation via MCP protocol
 */
async function sendMCPViolation() {
  return new Promise((resolve) => {
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.on('open', () => {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'create_file',
            arguments: {
              path: 'violation-test.md',
              content: 'This should be blocked',
              purpose: 'Testing violation detection'
            }
          }
        };
        
        ws.send(JSON.stringify(request));
      });
      
      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        ws.close();
        
        if (response.error || (response.result && !response.result.success)) {
          resolve({
            blocked: true,
            response: response.error?.message || 'Blocked by MCP'
          });
        } else {
          resolve({
            blocked: false,
            response: 'Not blocked'
          });
        }
      });
      
      ws.on('error', () => {
        resolve({
          blocked: false,
          response: 'Connection error'
        });
      });
      
      setTimeout(() => {
        ws.close();
        resolve({
          blocked: false,
          response: 'Timeout'
        });
      }, 3000);
      
    } catch (error) {
      resolve({
        blocked: false,
        response: error.message
      });
    }
  });
}

/**
 * Generate failure detection report
 */
function generateReport() {
  // Calculate detection rate
  testResults.summary.detectionRate = testResults.summary.total > 0
    ? Math.round((testResults.summary.detected / testResults.summary.total) * 100)
    : 0;
  
  // Save JSON report
  const jsonPath = path.join(resultsDir, `failure-detection-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
  
  // Generate markdown report
  let mdReport = `# Failure Detection Test Report

Generated: ${testResults.timestamp}

## Summary

- **Total Tests**: ${testResults.summary.total}
- **Violations Detected**: ${testResults.summary.detected} ✅
- **Violations Missed**: ${testResults.summary.missed} ❌
- **Detection Rate**: ${testResults.summary.detectionRate}%

## Detection Tests

| Test | Status | Method | Details |
|------|--------|--------|---------|
`;
  
  for (const test of testResults.detectionTests) {
    mdReport += `| ${test.test} | ${test.detected ? '✅ Detected' : '❌ Missed'} | ${test.method || '-'} | ${test.details || '-'} |\n`;
  }
  
  mdReport += `

## Analysis

`;
  
  if (testResults.summary.detectionRate === 100) {
    mdReport += '✅ **Excellent**: All violations were successfully detected!\n\n';
  } else if (testResults.summary.detectionRate >= 75) {
    mdReport += '⚠️ **Good**: Most violations were detected, but some improvements needed.\n\n';
  } else if (testResults.summary.detectionRate >= 50) {
    mdReport += '⚠️ **Fair**: Detection capabilities need improvement.\n\n';
  } else {
    mdReport += '❌ **Poor**: Critical failures in violation detection.\n\n';
  }
  
  mdReport += `### Detection Methods Used

`;
  
  const methods = {};
  for (const test of testResults.detectionTests) {
    if (test.detected && test.method) {
      methods[test.method] = (methods[test.method] || 0) + 1;
    }
  }
  
  for (const [method, count] of Object.entries(methods)) {
    mdReport += `- **${method}**: ${count} detection(s)\n`;
  }
  
  mdReport += `

## Recommendations

`;
  
  if (testResults.summary.missed > 0) {
    mdReport += `1. **Enable MCP Server**: Ensure the MCP server is running in strict or enhanced mode
2. **Configure Logging**: Set up comprehensive violation logging
3. **File Permissions**: Consider using filesystem-level protection
4. **Monitoring**: Implement real-time violation monitoring
`;
  } else {
    mdReport += `1. **Maintain Protection**: Keep current protection mechanisms active
2. **Regular Testing**: Run detection tests regularly
3. **Update Rules**: Keep violation detection rules up to date
`;
  }
  
  const mdPath = path.join(resultsDir, `failure-detection-${Date.now()}.md`);
  fs.writeFileSync(mdPath, mdReport);
  
  console.log(`\nReports saved:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  Markdown: ${mdPath}`);
}

// Main execution
async function main() {
  await testDirectModificationDetection();
  await testRootFileCreationDetection();
  await testVfJsonModificationDetection();
  await testMCPServerDetection();
  
  // Calculate detection rate before generating report
  testResults.summary.detectionRate = testResults.summary.total > 0
    ? Math.round((testResults.summary.detected / testResults.summary.total) * 100)
    : 0;
  
  console.log('=====================================');
  console.log('Test Summary');
  console.log('=====================================');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Detected: ${testResults.summary.detected} ✅`);
  console.log(`Missed: ${testResults.summary.missed} ❌`);
  console.log(`Detection Rate: ${testResults.summary.detectionRate}%`);
  
  generateReport();
  
  // Exit with error if detection rate is too low
  if (testResults.summary.detectionRate < 50) {
    console.log('\n❌ FAILURE: Detection rate below 50%');
    process.exit(1);
  } else if (testResults.summary.detectionRate < 100) {
    console.log('\n⚠️  WARNING: Some violations not detected');
    process.exit(0);
  } else {
    console.log('\n✅ SUCCESS: All violations detected!');
    process.exit(0);
  }
}

// Run tests
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});