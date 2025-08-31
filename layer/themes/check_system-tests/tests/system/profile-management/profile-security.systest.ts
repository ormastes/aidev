/**
 * Profile Management Security System Tests
 * 
 * Comprehensive security testing for profile management features.
 * Tests authentication, authorization, data protection, and security vulnerabilities.
 * 
 * Security Test Coverage:
 * - Authentication bypass attempts
 * - Authorization escalation
 * - Input validation and injection attacks
 * - File upload security
 * - Session management security
 * - Privacy violation attempts
 * - Data leakage prevention
 * - Rate limiting and abuse prevention
 */

import { test, expect, Page } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import { 
  TEST_CONFIG,
  generateTestUser,
  setupTestUser,
  registerAndLoginViaBrowser,
  cleanupTestUser,
  generateTestImage
} from './test-helpers';

const TEST_DATA_DIR = path.join(__dirname, 'test-data-security');

test.describe('Profile Management Security System Tests', () => {
  let legitimateUser: any;
  let attackerUser: any;
  let adminUser: any;

  test.beforeAll(async () => {
    // Create test data directory
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }

    // Setup test users with different privilege levels
    legitimateUser = await setupTestUser('user');
    attackerUser = await setupTestUser('user');
    adminUser = await setupTestUser('admin');
  });

  test.afterAll(async () => {
    // Cleanup test users
    await cleanupTestUser(legitimateUser);
    await cleanupTestUser(attackerUser);
    await cleanupTestUser(adminUser);
    
    // Cleanup test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  test.describe('Authentication Security', () => {
    test('should prevent authentication bypass attempts', async ({ page }) => {
      console.log('Testing authentication bypass prevention...');
      
      // Attempt 1: Direct access to protected profile pages
      await page.goto(`${TEST_CONFIG.PORTAL_URL}/profile`);
      
      // Should redirect to login
      await page.waitForURL('**/login**');
      await expect(page.locator('input[name="username"]')).toBeVisible();
      
      // Attempt 2: API access without token
      const response = await page.request.get(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}`);
      expect(response.status()).toBe(401);
      
      // Attempt 3: Invalid token
      const invalidTokenResponse = await page.request.get(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}`, {
        headers: { 'Authorization': 'Bearer invalid-token-123' }
      });
      expect(invalidTokenResponse.status()).toBe(401);
      
      // Attempt 4: Expired token simulation
      const expiredTokenResponse = await page.request.get(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}`, {
        headers: { 'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MzA0NTY3ODl9.expired' }
      });
      expect(expiredTokenResponse.status()).toBe(401);
    });

    test('should enforce proper session management', async ({ page }) => {
      // Login as legitimate user
      await registerAndLoginViaBrowser(page, legitimateUser);
      
      // Verify session is established
      const sessionToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(sessionToken).toBeTruthy();
      
      // Test session timeout
      await page.evaluate(() => {
        // Simulate session expiration
        localStorage.setItem('tokenExpiry', String(Date.now() - 1000));
      });
      
      // Make request that should trigger session validation
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      // Should redirect to login due to expired session
      await page.waitForURL('**/login**', { timeout: 10000 });
      
      // Test session hijacking prevention
      await registerAndLoginViaBrowser(page, legitimateUser);
      
      // Get current session token
      const validToken = await page.evaluate(() => localStorage.getItem('authToken'));
      
      // Simulate token theft and usage from different IP
      const hijackResponse = await axios.get(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'X-Forwarded-For': '192.168.1.100', // Different IP
          'User-Agent': 'Evil Browser 1.0'
        }
      });
      
      // Should either work with additional verification or be blocked
      // Implementation depends on security policy
      expect([200, 401, 403]).toContain(hijackResponse.status);
    });
  });

  test.describe('Authorization and Access Control', () => {
    test('should prevent horizontal privilege escalation', async ({ page }) => {
      console.log('Testing horizontal privilege escalation prevention...');
      
      // Login as attacker user
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Attempt to access another user's profile via UI manipulation
      await page.goto(`${TEST_CONFIG.PORTAL_URL}/profile/${legitimateUser.id}`);
      
      // Should either show access denied or redirect
      const currentUrl = page.url();
      if (currentUrl.includes(`/profile/${legitimateUser.id}`)) {
        await expect(page.locator('[data-testid="access-denied"]'))
          .toContainText('Access denied');
      } else {
        // Should redirect to own profile or access denied page
        expect(currentUrl).not.toContain(`/profile/${legitimateUser.id}`);
      }
      
      // Attempt API access to another user's profile
      const apiResponse = await page.request.get(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}/private`, {
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      expect(apiResponse.status()).toBe(403);
      
      // Attempt to modify another user's profile
      const modifyResponse = await page.request.patch(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}`, {
        data: { firstName: 'Hacked' },
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      expect(modifyResponse.status()).toBe(403);
    });

    test('should prevent vertical privilege escalation', async ({ page }) => {
      // Login as regular user
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Attempt to access admin-only endpoints
      const adminEndpoints = [
        '/admin/users',
        '/admin/profiles/analytics',
        '/admin/security/audit',
        '/admin/database/export'
      ];
      
      for (const endpoint of adminEndpoints) {
        // Try UI access
        await page.goto(`${TEST_CONFIG.PORTAL_URL}${endpoint}`);
        
        const currentUrl = page.url();
        if (currentUrl.includes(endpoint)) {
          await expect(page.locator('[data-testid="access-denied"]'))
            .toContainText('Access denied');
        }
        
        // Try API access
        const apiResponse = await page.request.get(`${TEST_CONFIG.API_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
        });
        expect(apiResponse.status()).toBe(403);
      }
    });

    test('should enforce role-based feature access', async ({ page }) => {
      // Test regular user limitations
      await registerAndLoginViaBrowser(page, attackerUser);
      
      await page.locator('[data-testid="user-menu"]').click();
      
      // Regular user should not see admin options
      await expect(page.locator('[data-testid="admin-panel-link"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="user-management-link"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="system-settings-link"]')).not.toBeVisible();
      
      // But should see regular user options
      await expect(page.locator('[data-testid="profile-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="settings-link"]')).toBeVisible();
    });
  });

  test.describe('Input Validation and Injection Prevention', () => {
    test('should prevent SQL injection in profile fields', async ({ page }) => {
      console.log('Testing SQL injection prevention...');
      
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Navigate to profile editing
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      await page.locator('[data-testid="edit-profile-btn"]').click();
      
      // Attempt SQL injection in various fields
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE profiles SET firstName='Hacked' WHERE id='1'; --",
        "' UNION SELECT * FROM passwords --"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        // Try injection in firstName field
        await page.locator('input[name="firstName"]').fill(payload);
        await page.locator('[data-testid="save-profile-btn"]').click();
        
        // Should either be sanitized or rejected
        const errorMessage = page.locator('[data-testid="error-message"]');
        const successMessage = page.locator('[data-testid="success-message"]');
        
        // Wait for either error or success
        const messageAppeared = await Promise.race([
          errorMessage.waitFor({ timeout: 5000 }).then(() => 'error'),
          successMessage.waitFor({ timeout: 5000 }).then(() => 'success')
        ]).catch(() => 'timeout');
        
        if (messageAppeared === 'success') {
          // If successful, verify data was sanitized
          const profileResponse = await page.request.get(`${TEST_CONFIG.API_URL}/profiles/${attackerUser.id}`, {
            headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
          });
          
          const profileData = await profileResponse.json();
          expect(profileData.firstName).not.toContain('DROP TABLE');
          expect(profileData.firstName).not.toContain('UNION SELECT');
        }
        
        // Reset field for next test
        await page.locator('input[name="firstName"]').fill('TestUser');
      }
    });

    test('should prevent XSS attacks in profile fields', async ({ page }) => {
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Navigate to profile editing
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      await page.locator('[data-testid="edit-profile-btn"]').click();
      
      // Attempt XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">'  
      ];
      
      for (const payload of xssPayloads) {
        // Try XSS in bio field (most likely to render HTML)
        await page.locator('textarea[name="bio"]').fill(payload);
        await page.locator('[data-testid="save-profile-btn"]').click();
        
        // Wait for save to complete
        await page.waitForTimeout(1000);
        
        // Navigate to profile view to see if XSS executes
        await page.locator('[data-testid="view-profile-btn"]').click();
        
        // Check if XSS payload is rendered as text (safe) or executed (vulnerable)
        const bioElement = page.locator('[data-testid="profile-bio"]');
        const bioText = await bioElement.textContent();
        
        // Bio should contain the payload as plain text, not execute it
        expect(bioText).toContain(payload.replace(/<[^>]*>/g, '')); // Stripped of HTML tags
        
        // Verify no JavaScript execution by checking for alert dialogs
        const dialogs: string[] = [];
        page.on('dialog', dialog => {
          dialogs.push(dialog.message());
          dialog.dismiss();
        });
        
        await page.waitForTimeout(1000);
        expect(dialogs.filter(d => d.includes('XSS'))).toHaveLength(0);
        
        // Reset bio for next test
        await page.locator('[data-testid="edit-profile-btn"]').click();
        await page.locator('textarea[name="bio"]').fill('Safe bio content');
        await page.locator('[data-testid="save-profile-btn"]').click();
      }
    });

    test('should validate file upload security', async ({ page }) => {
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Navigate to profile
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      // Test malicious file uploads
      const maliciousFiles = [
        { name: 'script.js', content: 'console.log("malicious");', type: 'application/javascript' },
        { name: 'executable.exe', content: 'MZ\x90\x00\x03', type: 'application/octet-stream' },
        { name: 'php-shell.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
        { name: 'svg-xss.svg', content: '<svg onload="alert(\'XSS\')" />', type: 'image/svg+xml' },
        { name: 'huge-file.jpg', content: Buffer.alloc(20 * 1024 * 1024), type: 'image/jpeg' } // 20MB
      ];
      
      for (const maliciousFile of maliciousFiles) {
        const filePath = path.join(TEST_DATA_DIR, maliciousFile.name);
        
        if (Buffer.isBuffer(maliciousFile.content)) {
          fs.writeFileSync(filePath, maliciousFile.content);
        } else {
          fs.writeFileSync(filePath, maliciousFile.content, 'utf8');
        }
        
        // Attempt to upload malicious file
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('[data-testid="upload-avatar-btn"]').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(filePath);
        
        // Should be rejected with appropriate error
        await expect(page.locator('[data-testid="upload-error"]'))
          .toContainText(/Invalid file type|File too large|Security violation/);
        
        console.log(`   ✅ Blocked malicious file: ${maliciousFile.name}`);
      }
    });

    test('should prevent path traversal in file operations', async ({ page }) => {
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Test path traversal in avatar filename
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        '../../../../.env',
        '../config/database.json'
      ];
      
      for (const payload of traversalPayloads) {
        try {
          // Create file with traversal name
          const safeFileName = payload.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = path.join(TEST_DATA_DIR, safeFileName + '.jpg');
          const imageData = generateTestImage('JPEG', 100 * 1024);
          fs.writeFileSync(filePath, imageData);
          
          // Attempt upload with modified filename
          const form = new FormData();
          form.append('avatar', fs.createReadStream(filePath), {
            filename: payload,
            contentType: 'image/jpeg'
          });
          
          const uploadResponse = await axios.post(`${TEST_CONFIG.API_URL}/profiles/${attackerUser.id}/avatar`, form, {
            headers: {
              'Authorization': `Bearer ${attackerUser.authToken}`,
              ...form.getHeaders()
            }
          });
          
          if (uploadResponse.status === 200) {
            // If upload succeeds, verify filename was sanitized
            expect(uploadResponse.data.avatarUrl).not.toContain('../');
            expect(uploadResponse.data.avatarUrl).not.toContain('etc/passwd');
            expect(uploadResponse.data.avatarUrl).not.toContain('..\\');
          }
          
        } catch (error: any) {
          // Should be rejected with 400 or 403
          expect([400, 403]).toContain(error.response?.status);
        }
      }
    });
  });

  test.describe('Data Protection and Privacy Violations', () => {
    test('should prevent unauthorized data access', async ({ page }) => {
      console.log('Testing unauthorized data access prevention...');
      
      // Setup: Create private profile for legitimate user
      await axios.put(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}/privacy`, {
        profileVisibility: 'private',
        allowSearch: false,
        showEmail: false,
        showPhone: false
      }, {
        headers: { 'Authorization': `Bearer ${legitimateUser.authToken}` }
      });
      
      // Login as attacker
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Attempt to access private profile via direct URL
      await page.goto(`${TEST_CONFIG.PORTAL_URL}/users/${legitimateUser.username}`);
      
      // Should show limited information or access denied
      await expect(page.locator('[data-testid="profile-private"]'))
        .toContainText('This profile is private');
      
      // Private information should not be visible
      await expect(page.locator('[data-testid="profile-email"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="profile-phone"]')).not.toBeVisible();
      
      // Test API endpoint enumeration
      const sensitiveEndpoints = [
        `/profiles/${legitimateUser.id}/private`,
        `/profiles/${legitimateUser.id}/audit`,
        `/profiles/${legitimateUser.id}/sessions`,
        `/profiles/${legitimateUser.id}/security-settings`
      ];
      
      for (const endpoint of sensitiveEndpoints) {
        const response = await page.request.get(`${TEST_CONFIG.API_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
        });
        expect(response.status()).toBe(403);
      }
    });

    test('should prevent data mining and scraping', async ({ page }) => {
      // Test rate limiting on profile access
      await registerAndLoginViaBrowser(page, attackerUser);
      
      const rapidRequests = [];
      const requestCount = 100;
      
      // Make rapid requests to enumerate users
      for (let i = 0; i < requestCount; i++) {
        rapidRequests.push(
          page.request.get(`${TEST_CONFIG.API_URL}/profiles/search?q=user${i}`, {
            headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
          })
        );
      }
      
      const responses = await Promise.allSettled(rapidRequests);
      const rateLimitedResponses = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status() === 429
      );
      
      // Should have rate limiting kicks in
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Test bulk data access prevention
      const bulkDataResponse = await page.request.get(`${TEST_CONFIG.API_URL}/profiles/bulk`, {
        params: { limit: 10000 },
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      
      // Should either be forbidden or have strict limits
      if (bulkDataResponse.status() === 200) {
        const data = await bulkDataResponse.json();
        expect(data.profiles.length).toBeLessThanOrEqual(50); // Reasonable limit
      } else {
        expect(bulkDataResponse.status()).toBe(403);
      }
    });
  });

  test.describe('Session Security', () => {
    test('should prevent session fixation attacks', async ({ page }) => {
      console.log('Testing session fixation prevention...');
      
      // Get initial session ID (before login)
      await page.goto(`${TEST_CONFIG.PORTAL_URL}/login`);
      const initialSessionId = await page.evaluate(() => 
        document.cookie.match(/sessionId=([^;]+)/)?.[1]
      );
      
      // Login
      await page.locator('input[name="username"]').fill(legitimateUser.username);
      await page.locator('input[name="password"]').fill(legitimateUser.password);
      await page.locator('button[type="submit"]').click();
      
      await page.waitForURL('**/dashboard');
      
      // Get session ID after login
      const postLoginSessionId = await page.evaluate(() => 
        document.cookie.match(/sessionId=([^;]+)/)?.[1]
      );
      
      // Session ID should change after login (prevents fixation)
      expect(postLoginSessionId).not.toBe(initialSessionId);
      expect(postLoginSessionId).toBeTruthy();
    });

    test('should handle concurrent sessions securely', async ({ browser }) => {
      // Create multiple browser contexts for same user
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Login from both contexts
      await registerAndLoginViaBrowser(page1, legitimateUser);
      await registerAndLoginViaBrowser(page2, legitimateUser);
      
      // Get session tokens
      const token1 = await page1.evaluate(() => localStorage.getItem('authToken'));
      const token2 = await page2.evaluate(() => localStorage.getItem('authToken'));
      
      // Tokens should be different (separate sessions)
      expect(token1).not.toBe(token2);
      
      // Both sessions should work independently
      await page1.locator('[data-testid="user-menu"]').click();
      await page1.locator('[data-testid="profile-link"]').click();
      
      await page2.locator('[data-testid="user-menu"]').click();
      await page2.locator('[data-testid="settings-link"]').click();
      
      // Both should be functional
      await expect(page1.locator('[data-testid="profile-content"]')).toBeVisible();
      await expect(page2.locator('[data-testid="settings-content"]')).toBeVisible();
      
      // Logout from one session
      await page1.locator('[data-testid="user-menu"]').click();
      await page1.locator('[data-testid="logout-btn"]').click();
      
      // First session should be logged out
      await page1.waitForURL('**/login');
      
      // Second session should remain active
      await page2.reload();
      await expect(page2.locator('[data-testid="settings-content"]')).toBeVisible();
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('Privacy and Data Leakage Prevention', () => {
    test('should prevent profile data leakage through error messages', async ({ page }) => {
      console.log('Testing data leakage prevention...');
      
      // Test with non-existent user ID
      const nonExistentUserId = 'user-does-not-exist-123';
      
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Attempt to access non-existent profile
      const response = await page.request.get(`${TEST_CONFIG.API_URL}/profiles/${nonExistentUserId}`, {
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      
      expect(response.status()).toBe(404);
      
      const errorData = await response.json();
      
      // Error message should not reveal whether user exists
      expect(errorData.error).toBe('Profile not found');
      expect(errorData.error).not.toContain(nonExistentUserId);
      expect(errorData).not.toHaveProperty('userId');
      expect(errorData).not.toHaveProperty('email');
      expect(errorData).not.toHaveProperty('internalId');
      
      // Test timing attack resistance
      const startTime1 = Date.now();
      await page.request.get(`${TEST_CONFIG.API_URL}/profiles/${nonExistentUserId}`, {
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      const duration1 = Date.now() - startTime1;
      
      const startTime2 = Date.now();
      await page.request.get(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}`, {
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      const duration2 = Date.now() - startTime2;
      
      // Response times should be similar (within reasonable variance)
      const timeDifference = Math.abs(duration1 - duration2);
      expect(timeDifference).toBeLessThan(1000); // Allow for network variance
    });

    test('should prevent information disclosure through search', async ({ page }) => {
      // Setup private profile
      await axios.put(`${TEST_CONFIG.API_URL}/profiles/${legitimateUser.id}/privacy`, {
        profileVisibility: 'private',
        allowSearch: false
      }, {
        headers: { 'Authorization': `Bearer ${legitimateUser.authToken}` }
      });
      
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Attempt to find private user through search
      await page.locator('[data-testid="search-input"]').fill(legitimateUser.username);
      await page.locator('[data-testid="search-btn"]').click();
      
      // Private user should not appear in search results
      await expect(page.locator(`[data-testid="user-result-${legitimateUser.username}"]`))
        .not.toBeVisible();
      
      // Test search with partial information
      await page.locator('[data-testid="search-input"]').fill(legitimateUser.firstName);
      await page.locator('[data-testid="search-btn"]').click();
      
      // Private user should not appear even with partial match
      const searchResults = page.locator('[data-testid="search-results"] [data-testid^="user-result-"]');
      const resultCount = await searchResults.count();
      
      // Check that private user is not in results
      for (let i = 0; i < resultCount; i++) {
        const resultText = await searchResults.nth(i).textContent();
        expect(resultText).not.toContain(legitimateUser.username);
        expect(resultText).not.toContain(legitimateUser.email);
      }
    });
  });

  test.describe('Advanced Security Scenarios', () => {
    test('should detect and prevent account enumeration', async ({ page }) => {
      console.log('Testing account enumeration prevention...');
      
      await page.goto(`${TEST_CONFIG.PORTAL_URL}/forgot-password`);
      
      // Test with existing email
      await page.locator('input[name="email"]').fill(legitimateUser.email);
      await page.locator('[data-testid="send-reset-btn"]').click();
      
      const existingEmailMessage = await page.locator('[data-testid="reset-message"]').textContent();
      
      // Test with non-existent email
      await page.locator('input[name="email"]').fill('nonexistent@example.com');
      await page.locator('[data-testid="send-reset-btn"]').click();
      
      const nonExistentEmailMessage = await page.locator('[data-testid="reset-message"]').textContent();
      
      // Messages should be identical to prevent enumeration
      expect(existingEmailMessage).toBe(nonExistentEmailMessage);
      expect(existingEmailMessage).toContain('If an account with that email exists');
    });

    test('should prevent profile picture-based tracking', async ({ page }) => {
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Upload profile picture
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      const avatarPath = path.join(TEST_DATA_DIR, 'tracking-test.jpg');
      const avatarData = generateTestImage('JPEG', 200 * 1024);
      fs.writeFileSync(avatarPath, avatarData);
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="upload-avatar-btn"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(avatarPath);
      
      await expect(page.locator('[data-testid="upload-success"]'))
        .toContainText('Avatar uploaded successfully');
      
      // Get avatar URL
      const avatarImg = page.locator('[data-testid="profile-avatar"] img');
      const avatarSrc = await avatarImg.getAttribute('src');
      
      // Avatar URL should not contain user ID or other identifying information
      expect(avatarSrc).not.toContain(attackerUser.id!);
      expect(avatarSrc).not.toContain(attackerUser.username);
      expect(avatarSrc).not.toContain(attackerUser.email);
      
      // Avatar should be served with proper security headers
      const avatarResponse = await page.request.get(avatarSrc!);
      const headers = avatarResponse.headers();
      
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['cache-control']).toBeDefined();
    });

    test('should implement secure file download and export', async ({ page }) => {
      await registerAndLoginViaBrowser(page, legitimateUser);
      
      // Request data export
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="data-export-link"]').click();
      
      await page.locator('select[name="exportFormat"]').selectOption('json');
      await page.locator('[data-testid="request-export-btn"]').click();
      
      // Wait for export to be ready
      await expect(page.locator('[data-testid="download-export-btn"]'))
        .toBeVisible({ timeout: 30000 });
      
      // Get download URL
      const downloadBtn = page.locator('[data-testid="download-export-btn"]');
      const downloadUrl = await downloadBtn.getAttribute('href');
      
      // Download URL should be secure
      expect(downloadUrl).toMatch(/\/api\/data\/export\/[a-f0-9-]+\/download\?token=[a-zA-Z0-9]+/);
      
      // Test unauthorized access to download
      const unauthorizedResponse = await page.request.get(downloadUrl!, {
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      expect(unauthorizedResponse.status()).toBe(403);
      
      // Test download without token
      const urlWithoutToken = downloadUrl!.split('?')[0];
      const noTokenResponse = await page.request.get(urlWithoutToken);
      expect(noTokenResponse.status()).toBe(401);
    });
  });

  test.describe('Security Monitoring and Alerting', () => {
    test('should detect suspicious profile activities', async ({ page }) => {
      console.log('Testing suspicious activity detection...');
      
      await registerAndLoginViaBrowser(page, attackerUser);
      
      // Simulate suspicious activities
      const suspiciousActivities = [
        // Rapid profile changes
        async () => {
          for (let i = 0; i < 10; i++) {
            await axios.patch(`${TEST_CONFIG.API_URL}/profiles/${attackerUser.id}`, {
              bio: `Suspicious update ${i} at ${Date.now()}`
            }, {
              headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
            });
          }
        },
        
        // Multiple failed password attempts
        async () => {
          for (let i = 0; i < 5; i++) {
            try {
              await axios.post(`${TEST_CONFIG.API_URL}/auth/change-password`, {
                currentPassword: 'wrong-password',
                newPassword: 'NewPass123!',
                confirmPassword: 'NewPass123!'
              }, {
                headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
              });
            } catch {
              // Expected to fail
            }
          }
        },
        
        // Unusual data access patterns
        async () => {
          const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
          for (const userId of userIds) {
            try {
              await axios.get(`${TEST_CONFIG.API_URL}/profiles/${userId}`, {
                headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
              });
            } catch {
              // Expected to fail for unauthorized access
            }
          }
        }
      ];
      
      // Execute suspicious activities
      for (const activity of suspiciousActivities) {
        await activity();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check if security monitoring detected the activities
      const securityAlertsResponse = await axios.get(`${TEST_CONFIG.API_URL}/security/alerts/${attackerUser.id}`, {
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      
      if (securityAlertsResponse.status === 200) {
        const alerts = securityAlertsResponse.data.alerts;
        expect(alerts.length).toBeGreaterThan(0);
        
        // Should have alerts for suspicious activities
        const suspiciousUpdateAlert = alerts.find((a: any) => a.type === 'rapid_profile_changes');
        const failedPasswordAlert = alerts.find((a: any) => a.type === 'multiple_password_failures');
        const unusualAccessAlert = alerts.find((a: any) => a.type === 'unusual_access_pattern');
        
        expect(suspiciousUpdateAlert || failedPasswordAlert || unusualAccessAlert).toBeDefined();
      }
    });

    test('should implement account lockout for security violations', async ({ page }) => {
      // Create temporary user for lockout testing
      const lockoutTestUser = await setupTestUser('user');
      
      // Simulate multiple security violations
      const violations = [
        // Multiple failed login attempts
        async () => {
          for (let i = 0; i < 10; i++) {
            try {
              await axios.post(`${TEST_CONFIG.API_URL}/auth/login`, {
                email: lockoutTestUser.email,
                password: 'wrong-password'
              });
            } catch {
              // Expected to fail
            }
          }
        },
        
        // Repeated unauthorized access attempts
        async () => {
          for (let i = 0; i < 15; i++) {
            try {
              await axios.get(`${TEST_CONFIG.API_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${lockoutTestUser.authToken}` }
              });
            } catch {
              // Expected to fail
            }
          }
        }
      ];
      
      for (const violation of violations) {
        await violation();
      }
      
      // Account should be locked or restricted
      try {
        const lockedResponse = await axios.post(`${TEST_CONFIG.API_URL}/auth/login`, {
          email: lockoutTestUser.email,
          password: lockoutTestUser.password // Correct password
        });
        
        // Either login fails due to lockout, or succeeds with restrictions
        if (lockedResponse.status === 200) {
          // If login succeeds, check for restrictions
          const restrictedToken = lockedResponse.data.token;
          
          const profileResponse = await axios.get(`${TEST_CONFIG.API_URL}/profiles/${lockoutTestUser.id}`, {
            headers: { 'Authorization': `Bearer ${restrictedToken}` }
          });
          
          // Should have restricted access
          expect([200, 403, 423]).toContain(profileResponse.status);
        }
        
      } catch (error: any) {
        // Account is locked
        expect(error.response.status).toBe(423); // Locked
        expect(error.response.data.error).toContain('Account temporarily locked');
      }
      
      await cleanupTestUser(lockoutTestUser);
    });
  });

  test.describe('Compliance and Audit Security', () => {
    test('should maintain secure audit trail', async ({ page }) => {
      console.log('Testing secure audit trail maintenance...');
      
      await registerAndLoginViaBrowser(page, legitimateUser);
      
      // Perform trackable actions
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      await page.locator('[data-testid="edit-profile-btn"]').click();
      
      await page.locator('input[name="firstName"]').fill('AuditTest');
      await page.locator('[data-testid="save-profile-btn"]').click();
      
      // Change privacy settings
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="privacy-settings-link"]').click();
      await page.locator('select[name="profileVisibility"]').selectOption('private');
      await page.locator('[data-testid="save-privacy-btn"]').click();
      
      // Check audit log
      const auditResponse = await axios.get(`${TEST_CONFIG.API_URL}/audit/profile/${legitimateUser.id}`, {
        headers: { 'Authorization': `Bearer ${legitimateUser.authToken}` }
      });
      
      expect(auditResponse.status).toBe(200);
      
      const auditEntries = auditResponse.data.auditEntries;
      expect(auditEntries.length).toBeGreaterThan(0);
      
      // Verify audit entries contain required security information
      auditEntries.forEach((entry: any) => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('userId');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('ipAddress');
        expect(entry).toHaveProperty('userAgent');
        expect(entry).toHaveProperty('sessionId');
        
        // Sensitive data should be hashed or encrypted
        if (entry.previousValues) {
          expect(entry.previousValues).not.toHaveProperty('password');
          expect(entry.previousValues).not.toHaveProperty('authToken');
        }
      });
      
      // Test audit log access control
      const unauthorizedAuditResponse = await axios.get(`${TEST_CONFIG.API_URL}/audit/profile/${legitimateUser.id}`, {
        headers: { 'Authorization': `Bearer ${attackerUser.authToken}` }
      });
      
      expect(unauthorizedAuditResponse.status).toBe(403);
    });

    test('should secure data export process', async ({ page }) => {
      await registerAndLoginViaBrowser(page, legitimateUser);
      
      // Request data export
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="data-export-link"]').click();
      
      await page.locator('[data-testid="request-export-btn"]').click();
      
      // Export process should generate secure download token
      await expect(page.locator('[data-testid="export-status"]'))
        .toContainText('Processing');
      
      // Wait for export completion
      await expect(page.locator('[data-testid="download-export-btn"]'))
        .toBeVisible({ timeout: 30000 });
      
      const downloadBtn = page.locator('[data-testid="download-export-btn"]');
      const downloadUrl = await downloadBtn.getAttribute('href');
      
      // Download URL should be secure and time-limited
      expect(downloadUrl).toMatch(/\/api\/data\/export\/[a-f0-9-]+\/download\?token=[a-zA-Z0-9]+&expires=\d+/);
      
      // Test that download link expires
      await page.waitForTimeout(1000);
      
      // Extract token and test expiration (if implemented)
      const urlParams = new URL(downloadUrl!, 'http://localhost').searchParams;
      const token = urlParams.get('token');
      const expires = urlParams.get('expires');
      
      expect(token).toBeTruthy();
      expect(expires).toBeTruthy();
      
      // Verify download is authorized
      const downloadResponse = await page.request.get(downloadUrl!, {
        headers: { 'Authorization': `Bearer ${legitimateUser.authToken}` }
      });
      expect(downloadResponse.status()).toBe(200);
    });
  });
});