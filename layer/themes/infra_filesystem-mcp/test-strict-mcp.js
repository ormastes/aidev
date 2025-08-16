#!/usr/bin/env node

/**
 * Test script for strict MCP server validation
 * Tests root file prevention and NAME_ID validation
 */

const { spawn } = require('child_process');
const { path } = require('../infra_external-log-lib/src');

const VF_BASE_PATH = '/home/ormastes/dev/aidev';

// Helper to send commands to MCP server
async function sendCommand(command) {
  return new Promise((resolve, reject) => {
    const mcp = spawn('node', [path.join(__dirname, 'mcp-server-strict.js')], {
      env: {
        ...process.env,
        VF_BASE_PATH
      }
    });

    let response = '';
    let error = '';

    mcp.stdout.on('data', (data) => {
      response += data.toString();
    });

    mcp.stderr.on('data', (data) => {
      error += data.toString();
    });

    mcp.on('close', (code) => {
      if (response) {
        try {
          // Parse JSON-RPC response
          const lines = response.split('\n').filter(line => line.trim());
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          resolve(result);
        } catch (e) {
          resolve({ response, error });
        }
      } else {
        reject(new Error(error || 'No response'));
      }
    });

    // Send command
    mcp.stdin.write(JSON.stringify(command) + '\n');
    mcp.stdin.end();
  });
}

// Test cases
async function runTests() {
  console.log('🧪 Testing Strict MCP Server Validation\n');
  console.log('=' .repeat(50));

  const tests = [
    {
      name: 'Test 1: Check if root file creation is blocked',
      command: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: 'test-file.js',
            purpose: 'Test file in root directory'
          }
        },
        id: 1
      },
      expected: 'should block root file creation'
    },
    {
      name: 'Test 2: Check if allowed root file passes',
      command: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: 'README.md',
            purpose: 'Main project documentation'
          }
        },
        id: 2
      },
      expected: 'should allow README.md in root'
    },
    {
      name: 'Test 3: Check file in allowed directory',
      command: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: 'gen/doc/test-report.md',
            purpose: 'Test coverage report'
          }
        },
        id: 3
      },
      expected: 'should allow file in gen/doc'
    },
    {
      name: 'Test 4: Check duplicate purpose detection',
      command: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_duplicate_purpose',
          arguments: {
            purpose: 'Main project documentation',
            threshold: 0.7
          }
        },
        id: 4
      },
      expected: 'should find README.md as duplicate'
    },
    {
      name: 'Test 5: List similar files',
      command: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_similar_files',
          arguments: {
            purpose: 'error handling',
            limit: 3
          }
        },
        id: 5
      },
      expected: 'should find error-handler.ts'
    },
    {
      name: 'Test 6: Validate project structure',
      command: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'validate_project_structure',
          arguments: {
            fix: false
          }
        },
        id: 6
      },
      expected: 'should analyze project structure'
    }
  ];

  for (const test of tests) {
    console.log(`\n📝 ${test.name}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await sendCommand(test.command);
      
      if (result.result) {
        // Parse the content from the result
        const content = result.result.content?.[0]?.text;
        if (content) {
          const parsed = JSON.parse(content);
          
          console.log(`✅ Result: ${test.expected}`);
          
          // Print key details based on test type
          if (test.name.includes('root file')) {
            console.log(`   Allowed: ${parsed.allowed}`);
            if (parsed.issues?.length > 0) {
              console.log(`   Issues: ${parsed.issues[0].message}`);
            }
          } else if (test.name.includes('duplicate')) {
            console.log(`   Has Duplicates: ${parsed.hasDuplicates}`);
            if (parsed.duplicates?.length > 0) {
              console.log(`   Found: ${parsed.duplicates[0].path} (${parsed.duplicates[0].similarity}% similar)`);
            }
          } else if (test.name.includes('similar')) {
            console.log(`   Matches Found: ${parsed.matches?.length || 0}`);
            if (parsed.matches?.length > 0) {
              console.log(`   Top Match: ${parsed.matches[0].path} (${parsed.matches[0].similarity}% similar)`);
            }
          } else if (test.name.includes('structure')) {
            console.log(`   Valid: ${parsed.valid}`);
            console.log(`   Total Issues: ${parsed.summary?.totalIssues || 0}`);
            if (parsed.summary?.rootFileViolations > 0) {
              console.log(`   Root File Violations: ${parsed.summary.rootFileViolations}`);
            }
          }
        }
      } else if (result.error) {
        console.log(`❌ Error: ${result.error.message || result.error}`);
      }
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ Test suite completed!\n');
}

// Run tests
runTests().catch(console.error);