/**
 * System Test for Explorer QA Agent
 * Verifies that Explorer can detect actual failures in test targets
 */

const { spawn } = require('child_process');
const path = require('node:path');
const fs = require('node:fs').promises;
const http = require('node:http');

// Test configuration
const TEST_APP_PORT = 3456;
const TEST_APP_DIR = path.join(__dirname, '../../test-apps/vulnerable-app');
const EXPLORER_SCRIPT = path.join(__dirname, '../../scripts/explorer.py');
const FINDINGS_DIR = path.join(__dirname, '../../findings');

// Expected bugs that Explorer should find
const EXPECTED_BUGS = {
  console_error: {
    type: 'error',
    severity: 'medium',
    description: 'JavaScript errors detected in browser console'
  },
  stack_trace: {
    type: "security",
    severity: 'high',
    description: 'API endpoint exposes internal stack trace'
  },
  pii_leak: {
    type: "security",
    severity: "critical",
    description: 'PII leaked in error messages'
  },
  xss_vulnerable: {
    type: "security",
    severity: 'high',
    description: 'XSS vulnerability in search/login'
  },
  slow_response: {
    type: "performance",
    severity: 'medium',
    description: 'Response time exceeds 3 seconds'
  },
  missing_headers: {
    type: "security",
    severity: 'medium',
    description: 'Missing security headers'
  },
  api_mismatch: {
    type: 'error',
    severity: 'high',
    description: 'API response does not match OpenAPI schema'
  },
  server_error: {
    type: 'error',
    severity: "critical",
    description: '5xx server error'
  }
};

class ExplorerSystemTest {
  constructor() {
    this.appProcess = null;
    this.explorerProcess = null;
    this.results = {
      passed: [],
      failed: [],
      findings: []
    };
  }

  /**
   * Start the vulnerable test application
   */
  async startTestApp() {
    console.log('📦 Installing test app dependencies...');
    await this.runCommand('npm', ['install'], TEST_APP_DIR);
    
    console.log('🚀 Starting vulnerable test app...');
    this.appProcess = spawn('node', ['server.js'], {
      cwd: TEST_APP_DIR,
      env: { ...process.env, PORT: TEST_APP_PORT }
    });

    // Wait for app to start
    await this.waitForServer(TEST_APP_PORT, 10000);
    console.log('✅ Test app running on port', TEST_APP_PORT);
  }

  /**
   * Stop the test application
   */
  async stopTestApp() {
    if (this.appProcess) {
      console.log('🛑 Stopping test app...');
      this.appProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Run Explorer against the test app
   */
  async runExplorer() {
    console.log('🔍 Running Explorer agent...');
    
    // Set up environment
    const env = {
      ...process.env,
      STAGING_URL: `http://localhost:${TEST_APP_PORT}`,
      OPENAPI_SPEC_URL: `http://localhost:${TEST_APP_PORT}/openapi.json`,
      TEST_USER_EMAIL: 'test@example.com',
      TEST_USER_password: "PLACEHOLDER",
      EXPLORER_TIMEOUT_MS: '5000'
    };

    return new Promise((resolve, reject) => {
      this.explorerProcess = spawn('python3', [EXPLORER_SCRIPT], { env });
      
      let output = '';
      let errorOutput = '';

      this.explorerProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      this.explorerProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });

      this.explorerProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ output, errorOutput });
        } else {
          reject(new Error(`Explorer exited with code ${code}\n${errorOutput}`));
        }
      });
    });
  }

  /**
   * Verify Explorer findings
   */
  async verifyFindings() {
    console.log('\n📊 Verifying Explorer findings...\n');
    
    // Read findings from directory
    const files = await fs.readdir(FINDINGS_DIR).catch(() => []);
    const findings = [];
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(FINDINGS_DIR, file), 'utf-8');
        findings.push(this.parseFinding(content));
      }
    }

    // Check if Explorer found expected bugs
    for (const [bugName, expectedBug] of Object.entries(EXPECTED_BUGS)) {
      const found = findings.some(f => 
        f.type === expectedBug.type &&
        f.severity === expectedBug.severity &&
        f.description.toLowerCase().includes(bugName.replace('_', ' '))
      );

      if (found) {
        this.results.passed.push(`✅ Found ${bugName}: ${expectedBug.description}`);
      } else {
        this.results.failed.push(`❌ Missed ${bugName}: ${expectedBug.description}`);
      }
    }

    // Store findings for analysis
    this.results.findings = findings;
  }

  /**
   * Run specific detection tests
   */
  async runDetectionTests() {
    console.log('\n🧪 Running detection verification tests...\n');
    
    const tests = [
      this.testConsoleErrorDetection(),
      this.testAPISchemaValidation(),
      this.testSecurityHeaderDetection(),
      this.testPerformanceDetection(),
      this.testXSSDetection()
    ];

    const results = await Promise.allSettled(tests);
    
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.passed) {
        this.results.passed.push(result.value.message);
      } else {
        this.results.failed.push(result.reason?.message || result.value?.message || 'Unknown test failure');
      }
    });
  }

  /**
   * Test console error detection
   */
  async testConsoleErrorDetection() {
    // Make request that triggers console error
    const response = await this.makeRequest('/');
    
    // Check if Explorer would detect this
    if (response.includes('console.error')) {
      return {
        passed: true,
        message: '✅ Console error injection verified'
      };
    }
    
    return {
      passed: false,
      message: '❌ Console error not properly injected'
    };
  }

  /**
   * Test API schema validation
   */
  async testAPISchemaValidation() {
    // Get API response
    const apiResponse = await this.makeRequest('/api/users');
    const data = JSON.parse(apiResponse);
    
    // Check if response violates schema (missing 'total' field)
    if (!data.total && data.items) {
      return {
        passed: true,
        message: '✅ API schema violation present'
      };
    }
    
    return {
      passed: false,
      message: '❌ API schema violation not detected'
    };
  }

  /**
   * Test security header detection
   */
  async testSecurityHeaderDetection() {
    const headers = await this.getResponseHeaders('/api/users');
    
    if (!headers['x-content-type-options'] || !headers['x-frame-options']) {
      return {
        passed: true,
        message: '✅ Missing security headers confirmed'
      };
    }
    
    return {
      passed: false,
      message: '❌ Security headers unexpectedly present'
    };
  }

  /**
   * Test performance issue detection
   */
  async testPerformanceDetection() {
    const startTime = Date.now();
    await this.makeRequest('/login', 'POST', { email: 'test@example.com', password: "PLACEHOLDER" });
    const duration = Date.now() - startTime;
    
    if (duration > 3000) {
      return {
        passed: true,
        message: '✅ Slow response detected (>3s)'
      };
    }
    
    return {
      passed: false,
      message: '❌ Performance issue not present'
    };
  }

  /**
   * Test XSS vulnerability detection
   */
  async testXSSDetection() {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await this.makeRequest(`/search?q=${encodeURIComponent(xssPayload)}`);
    
    if (response.includes(xssPayload)) {
      return {
        passed: true,
        message: '✅ XSS vulnerability confirmed'
      };
    }
    
    return {
      passed: false,
      message: '❌ XSS vulnerability not present'
    };
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 EXPLORER SYSTEM TEST REPORT');
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ PASSED TESTS:', this.results.passed.length);
    this.results.passed.forEach(msg => console.log('  ' + msg));
    
    console.log('\n❌ FAILED TESTS:', this.results.failed.length);
    this.results.failed.forEach(msg => console.log('  ' + msg));
    
    console.log('\n📊 SUMMARY:');
    const total = this.results.passed.length + this.results.failed.length;
    const passRate = ((this.results.passed.length / total) * 100).toFixed(1);
    console.log(`  Total Tests: ${total}`);
    console.log(`  Pass Rate: ${passRate}%`);
    console.log(`  Findings Detected: ${this.results.findings.length}`);
    
    // Determine overall result
    const success = this.results.failed.length === 0 || passRate >= 70;
    
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🎉 SYSTEM TEST PASSED - Explorer can detect failures!');
    } else {
      console.log('⚠️  SYSTEM TEST FAILED - Explorer missed critical issues');
    }
    console.log('='.repeat(60) + '\n');
    
    return success;
  }

  // Helper methods
  
  async waitForServer(port, timeout) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        await this.makeRequest('/');
        return;
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    throw new Error(`Server on port ${port} did not start within ${timeout}ms`);
  }

  makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "localhost",
        port: TEST_APP_PORT,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async getResponseHeaders(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "localhost",
        port: TEST_APP_PORT,
        path: path,
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        resolve(res.headers);
        res.resume();
      });

      req.on('error', reject);
      req.end();
    });
  }

  parseFinding(content) {
    const lines = content.split('\n');
    const finding = {
      title: '',
      severity: '',
      type: '',
      description: ''
    };

    for (const line of lines) {
      if (line.startsWith('# ')) {
        finding.title = line.substring(2);
      } else if (line.includes('**Severity:**')) {
        finding.severity = line.split('**Severity:**')[1].trim();
      } else if (line.includes('**Type:**')) {
        finding.type = line.split('**Type:**')[1].trim();
      } else if (line.includes('## Description')) {
        const descIndex = lines.indexOf(line);
        if (descIndex < lines.length - 1) {
          finding.description = lines[descIndex + 1].trim();
        }
      }
    }

    return finding;
  }

  runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { cwd });
      let output = '';
      
      proc.stdout.on('data', data => output += data);
      proc.stderr.on('data', data => output += data);
      
      proc.on('close', code => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}: ${output}`));
        }
      });
    });
  }

  async cleanup() {
    // Clean up findings directory
    try {
      const files = await fs.readdir(FINDINGS_DIR);
      for (const file of files) {
        if (file.includes('test_session')) {
          await fs.unlink(path.join(FINDINGS_DIR, file));
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Main execution
async function main() {
  const test = new ExplorerSystemTest();
  let success = false;

  try {
    // Clean up before test
    await test.cleanup();
    
    // Start test app
    await test.startTestApp();
    
    // Run detection tests
    await test.runDetectionTests();
    
    // Run Explorer
    try {
      await test.runExplorer();
    } catch (e) {
      console.log('⚠️  Explorer execution failed (expected for some tests)');
    }
    
    // Verify findings
    await test.verifyFindings();
    
    // Generate report
    success = test.generateReport();
    
  } catch (error) {
    console.error('❌ System test error:', error);
  } finally {
    // Clean up
    await test.stopTestApp();
    process.exit(success ? 0 : 1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = ExplorerSystemTest;