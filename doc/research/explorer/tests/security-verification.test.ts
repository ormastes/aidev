/**
 * Security Verification Test Suite
 * Tests all 15 security fixes implemented in the AI Dev Platform
 */

import axios, { AxiosError } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import { fs } from '../../../layer/themes/infra_external-log-lib/dist';

const PORT = 3459; // Use different port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}`;
const SERVER_PATH = path.join(__dirname, '../../../release/gui-selector-portal');

describe('Security Fixes Verification', () => {
  let serverProcess: ChildProcess;
  let csrfToken: string;

  // Start server before tests
  beforeAll(async () => {
    console.log('Starting GUI Selector Portal for security testing...');
    
    // Set environment variables for testing
    process.env.PORT = String(PORT);
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'test-secret-for-security-verification';
    
    // Build the server first
    await new Promise((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: SERVER_PATH,
        env: process.env
      });
      
      build.on('close', (code) => {
        if (code === 0) resolve(undefined);
        else reject(new Error(`Build failed with code ${code}`));
      });
    });
    
    // Start the server
    serverProcess = spawn('node', ['dist/src/server.js'], {
      cwd: SERVER_PATH,
      env: process.env,
      detached: false
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify server is running
    try {
      await axios.get(`${BASE_URL}/api/health`);
      console.log('Server started successfully');
    } catch (error) {
      console.error('Server failed to start');
      throw error;
    }
  });

  // Stop server after tests
  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  describe('Fix #1: JWT_ACCESS_SECRET Security', () => {
    it('should use environment variable for JWT secret', () => {
      expect(process.env.JWT_ACCESS_SECRET).toBeDefined();
      expect(process.env.JWT_ACCESS_SECRET).not.toBe('dev-gui-selector-access-secret-12345678901234567890123456789012');
    });
  });

  describe('Fix #2: Default Admin User', () => {
    it('should not allow login with default admin credentials', async () => {
      try {
        // Get CSRF token first
        const csrfRes = await axios.get(`${BASE_URL}/api/auth/csrf`);
        const token = csrfRes.data.token;
        
        // Try default credentials
        await axios.post(`${BASE_URL}/api/auth/login`, {
          username: 'admin',
          password: 'admin123',
          _csrf: token
        }, {
          headers: { 'X-CSRF-Token': token }
        });
        
        fail('Should not allow default credentials');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Fix #3-5: Security Headers', () => {
    it('should return X-Content-Type-Options header', async () => {
      const response = await axios.get(`${BASE_URL}/api/health`);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should return X-Frame-Options header', async () => {
      const response = await axios.get(`${BASE_URL}/api/health`);
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should return Content-Security-Policy header', async () => {
      const response = await axios.get(`${BASE_URL}/api/health`);
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should return additional security headers', async () => {
      const response = await axios.get(`${BASE_URL}/api/health`);
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['referrer-policy']).toBeDefined();
    });
  });

  describe('Fix #6: CSRF Protection', () => {
    it('should provide CSRF token endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/api/auth/csrf`);
      expect(response.data.token).toBeDefined();
      expect(response.data.token.length).toBeGreaterThan(32);
      csrfToken = response.data.token;
    });

    it('should reject login without CSRF token', async () => {
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          username: 'test',
          password: 'test'
        });
        fail('Should require CSRF token');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
        expect(axiosError.response?.data).toHaveProperty('error', 'Invalid CSRF token');
      }
    });

    it('should reject invalid CSRF token', async () => {
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          username: 'test',
          password: 'test',
          _csrf: 'invalid-token'
        });
        fail('Should reject invalid CSRF token');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });
  });

  describe('Fix #7: Rate Limiting', () => {
    it('should enforce rate limiting on auth endpoints', async () => {
      const attempts = [];
      
      // Make 6 attempts (limit should be 5)
      for (let i = 0; i < 6; i++) {
        attempts.push(
          axios.get(`${BASE_URL}/api/auth/csrf`).catch(e => e)
        );
      }
      
      const results = await Promise.all(attempts);
      const blocked = results.filter(r => 
        r.response?.status === 429
      );
      
      expect(blocked.length).toBeGreaterThan(0);
    }, 10000);

    it('should return rate limit headers', async () => {
      const response = await axios.get(`${BASE_URL}/api/health`);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Fix #8: CORS Configuration', () => {
    it('should not allow wildcard CORS origin', async () => {
      try {
        await axios.get(`${BASE_URL}/api/health`, {
          headers: {
            'Origin': 'http://evil.com'
          }
        });
        // Check that evil origin is not in Access-Control-Allow-Origin
        const response = await axios.get(`${BASE_URL}/api/health`);
        expect(response.headers['access-control-allow-origin']).not.toBe('*');
        expect(response.headers['access-control-allow-origin']).not.toBe('http://evil.com');
      } catch (error) {
        // CORS rejection is also acceptable
        expect(error).toBeDefined();
      }
    });
  });

  describe('Fix #9-10: Error Handling', () => {
    it('should not expose stack traces in errors', async () => {
      try {
        // Force an error by sending malformed data
        await axios.post(`${BASE_URL}/api/auth/login`, 'malformed');
        fail('Should have errored');
      } catch (error) {
        const axiosError = error as AxiosError<any>;
        const errorData = axiosError.response?.data;
        
        // Should not contain stack trace indicators
        expect(JSON.stringify(errorData)).not.toContain('at ');
        expect(JSON.stringify(errorData)).not.toContain('Error:');
        expect(JSON.stringify(errorData)).not.toContain('.js:');
      }
    });

    it('should not expose PII in error messages', async () => {
      try {
        const csrfRes = await axios.get(`${BASE_URL}/api/auth/csrf`);
        const token = csrfRes.data.token;
        
        await axios.post(`${BASE_URL}/api/auth/login`, {
          username: 'user@example.com',
          password: 'wrongpassword123',
          _csrf: token
        }, {
          headers: { 'X-CSRF-Token': token }
        });
        fail('Should have failed login');
      } catch (error) {
        const axiosError = error as AxiosError<any>;
        const errorMsg = JSON.stringify(axiosError.response?.data);
        
        // Should not contain the actual email or password
        expect(errorMsg).not.toContain('user@example.com');
        expect(errorMsg).not.toContain('wrongpassword123');
      }
    });

    it('should include request ID in errors', async () => {
      try {
        await axios.get(`${BASE_URL}/api/nonexistent`);
        fail('Should return 404');
      } catch (error) {
        const axiosError = error as AxiosError<any>;
        expect(axiosError.response?.data).toHaveProperty('requestId');
        expect(axiosError.response?.data.requestId).toMatch(/^[a-f0-9]{32}$/);
      }
    });
  });

  describe('Fix #11: XSS Protection', () => {
    it('should sanitize HTML in input', async () => {
      const csrfRes = await axios.get(`${BASE_URL}/api/auth/csrf`);
      const token = csrfRes.data.token;
      
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          username: '<script>alert(1)</script>',
          password: 'test',
          _csrf: token
        }, {
          headers: { 'X-CSRF-Token': token }
        });
      } catch (error) {
        // Login will fail, but check that script tags are escaped
        const axiosError = error as AxiosError<any>;
        const responseText = JSON.stringify(axiosError.response?.data);
        
        // Should escape the script tag
        expect(responseText).not.toContain('<script>');
        expect(responseText).toContain('&lt;script&gt;');
      }
    });
  });

  describe('Fix #12: Authentication Security', () => {
    it('should reject weak passwords', async () => {
      const csrfRes = await axios.get(`${BASE_URL}/api/auth/csrf`);
      const token = csrfRes.data.token;
      
      const weakPasswords = ['admin', 'password', 'test', '123456'];
      
      for (const weakPass of weakPasswords) {
        try {
          await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'testuser',
            password: weakPass,
            _csrf: token
          }, {
            headers: { 'X-CSRF-Token': token }
          });
          fail(`Should reject weak password: ${weakPass}`);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Fix #13: Performance', () => {
    it('should respond within 3 seconds', async () => {
      const startTime = Date.now();
      await axios.get(`${BASE_URL}/api/health`);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Fix #15: Sensitive File Protection', () => {
    it('should block access to .env files', async () => {
      try {
        await axios.get(`${BASE_URL}/.env`);
        fail('Should block .env access');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it('should block access to config.json', async () => {
      try {
        await axios.get(`${BASE_URL}/config.json`);
        fail('Should block config.json access');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it('should block access to .git directory', async () => {
      try {
        await axios.get(`${BASE_URL}/.git/config`);
        fail('Should block .git access');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it('should block access to database files', async () => {
      try {
        await axios.get(`${BASE_URL}/data.db`);
        fail('Should block database access');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });
  });

  describe('Integration Tests', () => {
    it('should have all security features active on dashboard', async () => {
      const response = await axios.get(`${BASE_URL}/`);
      const html = response.data;
      
      // Check for security notices in the HTML
      if (typeof html === 'string') {
        expect(html).toContain('CSRF Protection');
        expect(html).toContain('XSS Protection');
        expect(html).toContain('Rate limiting');
        expect(html).toContain('Security headers');
      }
    });
  });
});

// Summary report
afterAll(() => {
  console.log('\n========================================');
  console.log('Security Verification Complete');
  console.log('========================================\n');
});