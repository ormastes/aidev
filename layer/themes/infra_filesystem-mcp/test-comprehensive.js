#!/usr/bin/env node

/**
 * Comprehensive MCP Test Suite
 * Tests all aspects of the strict MCP server
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const { path } = require('../infra_external-log-lib/src');

class MCPTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  // Send command to MCP server
  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      const mcp = spawn('node', ['mcp-server-strict.js'], {
        env: {
          ...process.env,
          VF_BASE_PATH: '/home/ormastes/dev/aidev'
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

      mcp.stdin.write(JSON.stringify(command) + '\n');
      mcp.stdin.end();
    });
  }

  // Run a single test
  async runTest(name, command, validator) {
    console.log(`\n📝 ${name}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await this.sendCommand(command);
      const passed = await validator(result);
      
      if (passed) {
        console.log('✅ PASS');
        this.results.passed++;
      } else {
        console.log('❌ FAIL');
        this.results.failed++;
      }
      
      this.results.tests.push({
        name,
        passed,
        result
      });
      
      return passed;
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({
        name,
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  // Parse result content
  parseContent(result) {
    if (result?.result?.content?.[0]?.text) {
      try {
        return JSON.parse(result.result.content[0].text);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 COMPREHENSIVE MCP TEST SUITE');
    console.log('=' .repeat(50));

    // Test 1: Block root file
    await this.runTest(
      'Block unauthorized root file',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: 'test.js',
            purpose: 'Test file'
          }
        },
        id: 1
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Allowed: ${parsed?.allowed}`);
        console.log(`   Issues: ${parsed?.issues?.length || 0}`);
        if (parsed?.issues?.[0]) {
          console.log(`   Message: ${parsed.issues[0].message}`);
        }
        return parsed?.allowed === false && parsed?.issues?.length > 0;
      }
    );

    // Test 2: Allow README.md
    await this.runTest(
      'Allow README.md in root',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: 'README.md',
            purpose: 'Documentation'
          }
        },
        id: 2
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Allowed: ${parsed?.allowed}`);
        return parsed?.allowed === true;
      }
    );

    // Test 3: Allow file in gen/doc
    await this.runTest(
      'Allow file in gen/doc',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: 'gen/doc/test.md',
            purpose: 'Test documentation'
          }
        },
        id: 3
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Allowed: ${parsed?.allowed}`);
        return parsed?.allowed === true;
      }
    );

    // Test 4: Detect duplicate purpose
    await this.runTest(
      'Detect duplicate purpose',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_duplicate_purpose',
          arguments: {
            purpose: 'Centralized error handling',
            threshold: 0.5
          }
        },
        id: 4
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Has Duplicates: ${parsed?.hasDuplicates}`);
        if (parsed?.duplicates?.length > 0) {
          console.log(`   Found: ${parsed.duplicates[0].path}`);
          console.log(`   Similarity: ${parsed.duplicates[0].similarity}%`);
        }
        return parsed?.success === true;
      }
    );

    // Test 5: List similar files
    await this.runTest(
      'List similar files',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_similar_files',
          arguments: {
            purpose: 'error',
            limit: 3
          }
        },
        id: 5
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Matches: ${parsed?.matches?.length || 0}`);
        if (parsed?.matches?.[0]) {
          console.log(`   Top Match: ${parsed.matches[0].path}`);
        }
        return parsed?.success === true;
      }
    );

    // Test 6: Register file in NAME_ID
    await this.runTest(
      'Register file in NAME_ID',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'register_file',
          arguments: {
            path: 'test/example.ts',
            purpose: 'Example test file',
            category: 'tests',
            tags: ['test', 'example']
          }
        },
        id: 6
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Success: ${parsed?.success}`);
        if (parsed?.id) {
          console.log(`   ID: ${parsed.id}`);
        }
        return parsed?.success === true;
      }
    );

    // Test 7: Block write to root
    await this.runTest(
      'Block write to root',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'write_file_with_validation',
          arguments: {
            path: 'blocked.js',
            content: '// Should fail',
            purpose: 'Test',
            category: 'utilities'
          }
        },
        id: 7
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Success: ${parsed?.success}`);
        console.log(`   Error: ${parsed?.error || 'None'}`);
        return parsed?.success === false;
      }
    );

    // Test 8: Force override
    await this.runTest(
      'Force override with justification',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'write_file_with_validation',
          arguments: {
            path: 'emergency.js',
            content: '// Emergency',
            purpose: 'Emergency fix',
            category: 'utilities',
            force: true,
            justification: 'Critical bug #123'
          }
        },
        id: 8
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Success: ${parsed?.success}`);
        console.log(`   Message: ${parsed?.message || 'None'}`);
        return parsed?.success === true;
      }
    );

    // Test 9: Validate project structure
    await this.runTest(
      'Validate project structure',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'validate_project_structure',
          arguments: {
            fix: false
          }
        },
        id: 9
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Success: ${parsed?.success}`);
        console.log(`   Total Issues: ${parsed?.summary?.totalIssues || 0}`);
        if (parsed?.summary?.rootFileViolations > 0) {
          console.log(`   Root Violations: ${parsed.summary.rootFileViolations}`);
        }
        return parsed?.success === true;
      }
    );

    // Test 10: Path traversal protection
    await this.runTest(
      'Block path traversal',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: '../../../etc/passwd',
            purpose: 'Malicious'
          }
        },
        id: 10
      },
      (result) => {
        const parsed = this.parseContent(result);
        console.log(`   Allowed: ${parsed?.allowed}`);
        const hasPathIssue = parsed?.issues?.some(i => 
          i.message?.includes('outside') || 
          i.message?.includes('traversal')
        );
        return parsed?.allowed === false;
      }
    );

    // Cleanup test files
    try {
      await fs.unlink('/home/ormastes/dev/aidev/emergency.js').catch(() => {});
    } catch {}

    this.printSummary();
  }

  // Print summary
  printSummary() {
    const total = this.results.passed + this.results.failed;
    const passRate = total > 0 ? Math.round(this.results.passed / total * 100) : 0;

    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('=' .repeat(50));

    if (this.results.failed > 0) {
      console.log('\nFailed Tests:');
      this.results.tests
        .filter(t => !t.passed)
        .forEach(t => {
          console.log(`  ❌ ${t.name}`);
        });
    }

    console.log('\n✨ Test suite complete!');
  }
}

// Run tests
const tester = new MCPTester();
tester.runAllTests().then(() => {
  process.exit(tester.results.failed === 0 ? 0 : 1);
}).catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});