#!/usr/bin/env node
/**
 * Test the secure app to verify all security fixes
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('node:path');

const PORT = 3461;
const BASE_URL = `http://localhost:${PORT}`;

class SecurityTester {
  constructor() {
    this.results = [];
    this.server = null;
  }

  log(message, status = 'INFO') {
    const symbols = { PASS: '✅', FAIL: '❌', INFO: 'ℹ️', WARN: '⚠️' };
    console.log(`${symbols[status] || '•'} ${message}`);
  }

  test(name, condition, details = '') {
    const status = condition ? 'PASS' : 'FAIL';
    this.log(`${name}: ${details || 'Tested'}`, status);
    this.results.push({ name, passed: condition, details });
    return condition;
  }

  async startServer() {
    this.log('Starting Secure Test App...', 'INFO');
    
    // Start the secure app
    const serverPath = path.join(__dirname, '../test-apps/secure-app');
    
    this.server = spawn('node', ['server.js'], {
      cwd: serverPath,
      env: { ...process.env, PORT, JWT_ACCESS_secret: process.env.SECRET || "PLACEHOLDER" }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await axios.get(`${BASE_URL}/`);
      this.log('Secure server started successfully', 'PASS');
      return true;
    } catch (error) {
      this.log('Server failed to start', 'FAIL');
      return false;
    }
  }

  stopServer() {
    if (this.server) {
      this.server.kill();
      this.log('Server stopped', 'INFO');
    }
  }

  async testSecurityHeaders() {
    try {
      const response = await axios.get(`${BASE_URL}/api/users`);
      const headers = response.headers;
      
      const tests = [
        this.test('X-Content-Type-Options', 
          headers['x-content-type-options'] === 'nosniff',
          headers['x-content-type-options'] || 'Missing'),
        
        this.test('X-Frame-Options',
          headers['x-frame-options'] === 'DENY',
          headers['x-frame-options'] || 'Missing'),
        
        this.test('Content-Security-Policy',
          !!headers['content-security-policy'],
          headers['content-security-policy'] ? 'Present' : 'Missing'),
        
        this.test('Strict-Transport-Security',
          !!headers['strict-transport-security'],
          headers['strict-transport-security'] ? 'Present' : 'Missing')
      ];
      
      return tests.every(t => t);
    } catch (error) {
      return this.test('Security Headers', false, error.message);
    }
  }

  async testCSRFProtection() {
    try {
      // Get CSRF token
      const csrfRes = await axios.get(`${BASE_URL}/api/auth/csrf`);
      const token = csrfRes.data.token;
      
      // Try login without CSRF
      try {
        await axios.post(`${BASE_URL}/login`, {
          email: 'test@test.com',
          password: "PLACEHOLDER"
        });
        return this.test('CSRF Protection', false, 'Login succeeded without token');
      } catch (error) {
        // Should fail without CSRF
        const hasCSRF = error.response?.status === 403 &&
                       error.response?.data?.error === 'Invalid CSRF token';
        return this.test('CSRF Protection', hasCSRF, 
          hasCSRF ? 'CSRF validation working' : 'Wrong error');
      }
    } catch (error) {
      return this.test('CSRF Protection', false, error.message);
    }
  }

  async testRateLimiting() {
    try {
      // Make many requests quickly
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(axios.get(`${BASE_URL}/api/users`).catch(e => e));
      }
      
      const results = await Promise.all(requests);
      const rateLimited = results.some(r => 
        r.response?.status === 429
      );
      
      return this.test('Rate Limiting', rateLimited,
        rateLimited ? 'Rate limit enforced' : 'No rate limiting detected');
    } catch (error) {
      return this.test('Rate Limiting', false, error.message);
    }
  }

  async testNoDefaultCredentials() {
    try {
      const csrfRes = await axios.get(`${BASE_URL}/api/auth/csrf`);
      const token = csrfRes.data.token;
      
      // Try default passwords
      const defaults = ['admin', "password", 'test'];
      
      for (const pass of defaults) {
        try {
          await axios.post(`${BASE_URL}/login`, {
            email: 'admin@test.com',
            password: pass,
            _csrf: token
          }, {
            headers: { 'X-CSRF-Token': token }
          });
          
          return this.test('No Default Credentials', false, 
            `Default password "${pass}" accepted`);
        } catch (error) {
          // Should reject default passwords
          if (error.response?.data?.error === 'Default passwords are not allowed') {
            continue;
          }
        }
      }
      
      return this.test('No Default Credentials', true, 'Default passwords blocked');
    } catch (error) {
      return this.test('No Default Credentials', false, error.message);
    }
  }

  async testXSSProtection() {
    try {
      // Try XSS in search
      const response = await axios.get(`${BASE_URL}/search`, {
        params: { q: '<script>alert(1)</script>' }
      });
      
      const hasXSS = response.data.includes('<script>');
      const escaped = response.data.includes('&lt;script&gt;');
      
      return this.test('XSS Protection', !hasXSS && escaped,
        escaped ? 'Input properly escaped' : 'XSS vulnerability present');
    } catch (error) {
      return this.test('XSS Protection', false, error.message);
    }
  }

  async testErrorHandling() {
    try {
      // Trigger an error
      const response = await axios.get(`${BASE_URL}/api/error`);
      return this.test('Error Handling', false, 'Error endpoint should fail');
    } catch (error) {
      const data = error.response?.data;
      
      // Check for no stack trace
      const hasStack = JSON.stringify(data).includes('.js:') ||
                      JSON.stringify(data).includes('at ');
      
      // Check for request ID
      const hasRequestId = !!data?.requestId;
      
      return this.test('Safe Error Handling', 
        !hasStack && hasRequestId,
        `No stack: ${!hasStack}, RequestId: ${hasRequestId}`);
    }
  }

  async testSensitiveFiles() {
    const blocked = [];
    const paths = ['/.env', '/.git/config', '/config.json', '/package.json'];
    
    for (const path of paths) {
      try {
        await axios.get(`${BASE_URL}${path}`);
        blocked.push(false);
      } catch (error) {
        blocked.push(error.response?.status === 404);
      }
    }
    
    const allBlocked = blocked.every(b => b);
    return this.test('Sensitive File Protection', allBlocked,
      `${blocked.filter(b => b).length}/${paths.length} paths blocked`);
  }

  async testCORS() {
    try {
      const response = await axios.get(`${BASE_URL}/api/users`, {
        headers: { 'Origin': 'http://evil.com' }
      });
      
      const origin = response.headers['access-control-allow-origin'];
      const isSecure = origin !== '*' && origin !== 'http://evil.com';
      
      return this.test('CORS Configuration', isSecure,
        `Origin: ${origin || 'Not set'}`);
    } catch (error) {
      // CORS rejection is good
      return this.test('CORS Configuration', true, 'CORS blocked evil origin');
    }
  }

  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURE APP VERIFICATION TEST');
    console.log('='.repeat(60) + '\n');

    if (!await this.startServer()) {
      console.log('❌ Could not start server');
      return 1;
    }

    console.log('\n📋 Running Security Tests:\n');

    await this.testSecurityHeaders();
    await this.testCSRFProtection();
    await this.testRateLimiting();
    await this.testNoDefaultCredentials();
    await this.testXSSProtection();
    await this.testErrorHandling();
    await this.testSensitiveFiles();
    await this.testCORS();

    this.stopServer();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    console.log(`Tests Passed: ${passed}/${total}`);
    console.log(`Success Rate: ${(passed/total * 100).toFixed(1)}%\n`);

    if (passed === total) {
      console.log('✅ All security fixes verified in secure app!');
      console.log('\n🎉 The security middleware successfully protects against all vulnerabilities!');
    } else {
      console.log('⚠️ Some tests failed. Review the results above.');
    }

    return passed === total ? 0 : 1;
  }
}

// Run tests
const tester = new SecurityTester();
tester.runAllTests().then(code => process.exit(code));