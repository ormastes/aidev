#!/usr/bin/env node

/**
 * MCP Server Integration Test Suite
 * Comprehensive testing of all server functionality with security features
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const fs = require('fs').promises;
const { path } = require('../../../infra_external-log-lib/src');
const assert = require('assert');

// Test configuration
const TEST_CONFIG = {
  serverPath: '../../mcp-server-strict.js',
  wsPort: 8080,
  testWorkspace: '/tmp/mcp-test-workspace',
  timeout: 30000
};

class MCPIntegrationTest {
  constructor() {
    this.server = null;
    this.ws = null;
    this.testResults = [];
    this.messageId = 1;
  }

  /**
   * Setup test environment
   */
  async setup() {
    console.log('🔧 Setting up test environment...');
    
    // Create test workspace
    await fs.mkdir(TEST_CONFIG.testWorkspace, { recursive: true });
    
    // Create NAME_ID.vf.json
    const nameIdContent = {
      metadata: {
        version: '2.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      purposes: {},
      rules: {}
    };
    
    await fs.writeFile(
      path.join(TEST_CONFIG.testWorkspace, 'NAME_ID.vf.json'),
      JSON.stringify(nameIdContent, null, 2)
    );
    
    console.log('✅ Test environment ready\n');
  }

  /**
   * Start MCP server
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting MCP server...');
      
      this.server = spawn('node', [
        path.join(__dirname, TEST_CONFIG.serverPath)
      ], {
        env: {
          ...process.env,
          VF_BASE_PATH: TEST_CONFIG.testWorkspace,
          MCP_PORT: TEST_CONFIG.wsPort,
          TEST_MODE: 'true'
        }
      });

      this.server.stdout.on('data', (data) => {
        console.log(`Server: ${data.toString().trim()}`);
      });

      this.server.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('running')) {
          console.log('✅ Server started\n');
          resolve();
        }
        console.log(`Server: ${message}`);
      });

      this.server.on('error', reject);
      
      // Give server time to start
      setTimeout(resolve, 3000);
    });
  }

  /**
   * Connect WebSocket client
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log('📡 Connecting to MCP server...');
      
      this.ws = new WebSocket(`ws://localhost:${TEST_CONFIG.wsPort}`);
      
      this.ws.on('open', () => {
        console.log('✅ Connected to server\n');
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
    });
  }

  /**
   * Send JSON-RPC request
   */
  async sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id
      };
      
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);
      
      const messageHandler = (data) => {
        const response = JSON.parse(data.toString());
        if (response.id === id) {
          clearTimeout(timeout);
          this.ws.removeListener('message', messageHandler);
          resolve(response);
        }
      };
      
      this.ws.on('message', messageHandler);
      this.ws.send(JSON.stringify(request));
    });
  }

  /**
   * Run a single test
   */
  async runTest(name, testFn) {
    console.log(`📝 ${name}`);
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`   ✅ PASS (${duration}ms)\n`);
      
      this.testResults.push({
        name,
        status: 'pass',
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ FAIL: ${error.message} (${duration}ms)\n`);
      
      this.testResults.push({
        name,
        status: 'fail',
        error: error.message,
        duration
      });
    }
  }

  /**
   * Test Suite: Security
   */
  async testSecurity() {
    console.log('\n🔒 Security Tests\n');
    
    // Test path traversal blocking
    await this.runTest('Path Traversal Prevention', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'check_file_allowed',
        arguments: {
          path: '../../../etc/passwd',
          purpose: 'Malicious access attempt'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.allowed, false, 'Path traversal should be blocked');
      assert(result.issues.some(i => i.type === 'PATH_TRAVERSAL'), 'Should detect path traversal');
    });
    
    // Test script injection blocking
    await this.runTest('Script Injection Prevention', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'write_file_with_validation',
        arguments: {
          path: 'test.html',
          content: '<script>alert("XSS")</script>',
          purpose: 'Test file with script',
          category: 'tests'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.success, false, 'Script injection should be blocked');
    });
    
    // Test SQL injection detection
    await this.runTest('SQL Injection Detection', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'check_file_allowed',
        arguments: {
          path: 'test.sql',
          purpose: "'; DROP TABLE users; --"
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert(result.issues.some(i => i.type === 'SANITIZATION_FAILED'), 'Should detect SQL injection');
    });
    
    // Test command injection prevention
    await this.runTest('Command Injection Prevention', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'check_file_allowed',
        arguments: {
          path: 'test.sh; rm -rf /',
          purpose: 'Command execution attempt'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.allowed, false, 'Command injection should be blocked');
    });
  }

  /**
   * Test Suite: File Operations
   */
  async testFileOperations() {
    console.log('\n📁 File Operation Tests\n');
    
    // Test allowed file creation
    await this.runTest('Create Allowed File', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'write_file_with_validation',
        arguments: {
          path: 'gen/doc/test-api.md',
          content: '# Test API Documentation',
          purpose: 'API documentation for testing',
          category: 'documentation',
          tags: ['test', 'api']
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.success, true, 'Should create file in allowed directory');
      assert(result.id, 'Should return file ID');
    });
    
    // Test root file blocking
    await this.runTest('Block Root File Creation', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'check_file_allowed',
        arguments: {
          path: 'unauthorized.txt',
          purpose: 'Unauthorized root file'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.allowed, false, 'Should block root file creation');
      assert(result.issues.some(i => i.type === 'ROOT_FILE_VIOLATION'), 'Should detect root violation');
    });
    
    // Test duplicate purpose detection
    await this.runTest('Detect Duplicate Purpose', async () => {
      // First create a file
      await this.sendRequest('tools/call', {
        name: 'register_file',
        arguments: {
          path: 'test/first.js',
          purpose: 'Utility for string manipulation',
          category: 'utilities'
        }
      });
      
      // Check for duplicate
      const response = await this.sendRequest('tools/call', {
        name: 'check_duplicate_purpose',
        arguments: {
          purpose: 'Utility for string manipulation',
          threshold: 0.8
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.hasDuplicates, true, 'Should detect duplicate purpose');
    });
    
    // Test forced file creation
    await this.runTest('Force File Creation with Justification', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'write_file_with_validation',
        arguments: {
          path: 'special-case.txt',
          content: 'Special content',
          purpose: 'Special case file',
          category: 'utilities',
          force: true,
          justification: 'Required for legacy compatibility'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.success, true, 'Should allow forced creation with justification');
      assert.strictEqual(result.forced, true, 'Should indicate forced creation');
    });
  }

  /**
   * Test Suite: Concurrency
   */
  async testConcurrency() {
    console.log('\n⚡ Concurrency Tests\n');
    
    // Test concurrent NAME_ID updates
    await this.runTest('Concurrent NAME_ID Updates', async () => {
      const promises = [];
      const fileCount = 10;
      
      for (let i = 0; i < fileCount; i++) {
        promises.push(
          this.sendRequest('tools/call', {
            name: 'register_file',
            arguments: {
              path: `test/concurrent-${i}.js`,
              purpose: `Concurrent test file ${i}`,
              category: 'tests'
            }
          })
        );
      }
      
      const results = await Promise.all(promises);
      const ids = results.map(r => JSON.parse(r.result.content[0].text).id);
      const uniqueIds = new Set(ids);
      
      assert.strictEqual(uniqueIds.size, fileCount, 'All IDs should be unique');
    });
    
    // Test mutex protection
    await this.runTest('Mutex Lock Protection', async () => {
      const operations = [];
      
      for (let i = 0; i < 5; i++) {
        operations.push(
          this.sendRequest('tools/call', {
            name: 'register_file',
            arguments: {
              path: `test/mutex-test-${i}.js`,
              purpose: `Testing mutex protection ${i}`,
              category: 'tests'
            }
          })
        );
      }
      
      const results = await Promise.all(operations);
      const allSuccessful = results.every(r => {
        const parsed = JSON.parse(r.result.content[0].text);
        return parsed.success === true;
      });
      
      assert(allSuccessful, 'All mutex-protected operations should succeed');
    });
  }

  /**
   * Test Suite: Validation
   */
  async testValidation() {
    console.log('\n✅ Validation Tests\n');
    
    // Test file naming validation
    await this.runTest('File Naming Convention', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'check_file_allowed',
        arguments: {
          path: 'test/file with spaces.txt',
          purpose: 'Test invalid naming'
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert(result.warnings.some(w => w.type === 'NAMING_CONVENTION'), 'Should warn about naming');
    });
    
    // Test similar file detection
    await this.runTest('Similar File Detection', async () => {
      // Register a file
      await this.sendRequest('tools/call', {
        name: 'register_file',
        arguments: {
          path: 'test/string-utils.js',
          purpose: 'String processing utilities',
          category: 'utilities'
        }
      });
      
      // Search for similar
      const response = await this.sendRequest('tools/call', {
        name: 'list_similar_files',
        arguments: {
          purpose: 'String manipulation tools',
          limit: 5
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.success, true, 'Should find similar files');
      assert(result.matches.length > 0, 'Should return matches');
    });
    
    // Test project structure validation
    await this.runTest('Project Structure Validation', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'validate_project_structure',
        arguments: {
          fix: false
        }
      });
      
      const result = JSON.parse(response.result.content[0].text);
      assert.strictEqual(result.success, true, 'Should validate project structure');
    });
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 Test Results Summary\n');
    console.log('═══════════════════════════════════════\n');
    
    const passed = this.testResults.filter(t => t.status === 'pass').length;
    const failed = this.testResults.filter(t => t.status === 'fail').length;
    const total = this.testResults.length;
    const totalDuration = this.testResults.reduce((sum, t) => sum + t.duration, 0);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${Math.round(passed/total*100)}%)`);
    console.log(`Failed: ${failed} (${Math.round(failed/total*100)}%)`);
    console.log(`Total Duration: ${totalDuration}ms\n`);
    
    if (failed > 0) {
      console.log('Failed Tests:');
      this.testResults
        .filter(t => t.status === 'fail')
        .forEach(t => console.log(`  ❌ ${t.name}: ${t.error}`));
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        duration: totalDuration,
        passRate: Math.round(passed/total*100)
      },
      tests: this.testResults
    };
    
    return report;
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.server) {
      this.server.kill('SIGTERM');
    }
    
    // Clean test workspace
    try {
      await fs.rm(TEST_CONFIG.testWorkspace, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
    
    console.log('✅ Cleanup complete\n');
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🏁 MCP Integration Test Suite\n');
    console.log('═══════════════════════════════════════\n');
    
    try {
      await this.setup();
      await this.startServer();
      await this.connectWebSocket();
      
      // Initialize session
      await this.sendRequest('initialize', {
        clientInfo: {
          name: 'integration-test',
          version: '1.0.0'
        }
      });
      
      // Run test suites
      await this.testSecurity();
      await this.testFileOperations();
      await this.testConcurrency();
      await this.testValidation();
      
      // Generate report
      const report = this.generateReport();
      
      // Save report to file
      await fs.writeFile(
        'integration-test-report.json',
        JSON.stringify(report, null, 2)
      );
      
      console.log('\n✅ Report saved to integration-test-report.json');
      
      // Exit with appropriate code
      process.exit(report.summary.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('\n❌ Test suite error:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const test = new MCPIntegrationTest();
  test.runAll().catch(console.error);
}

module.exports = MCPIntegrationTest;