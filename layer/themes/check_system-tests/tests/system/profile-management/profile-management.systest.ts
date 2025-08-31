/**
 * System Tests for Profile Management
 * Tests comprehensive user profile and settings management
 */

import { test, expect } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import * as FormData from 'form-data';

test.describe('Profile Management System Tests', () => {
  const API_URL = 'http://localhost:3462/api';
  const TEST_DATA_DIR = path.join(__dirname, 'test-data');
  let authToken: string;
  let userId: string;

  test.beforeAll(async () => {
    // Create test data directory
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }

    // Create test user and authenticate
    const testUser = {
      username: 'testuser_' + Date.now(),
      email: `test_${Date.now()}@example.com`,
      password: process.env.PASSWORD || "test-secret"
    };

    const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
    userId = registerResponse.data.userId;
    
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    authToken = loginResponse.data.token;
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }

    // Delete test user
    if (authToken && userId) {
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }
  });

  test.beforeEach(async () => {
    // Reset rate limits between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('User Profile CRUD Operations', () => {
    test('should create user profile', async () => {
      const profile = {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software developer passionate about testing',
        location: 'San Francisco, CA',
        website: 'https://johndoe.dev',
        social: {
          twitter: '@johndoe',
          github: 'johndoe',
          linkedin: 'john-doe'
        }
      };

      const response = await axios.post(`${API_URL}/profiles`, profile, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(201);
      expect(response.data.profileId).toBeDefined();
      expect(response.data.firstName).toBe(profile.firstName);
      expect(response.data.social.github).toBe(profile.social.github);
    });

    test('should retrieve user profile', async () => {
      const response = await axios.get(`${API_URL}/profiles/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.userId).toBe(userId);
      expect(response.data.firstName).toBeDefined();
      expect(response.data.createdAt).toBeDefined();
    });

    test('should update user profile', async () => {
      const updates = {
        bio: 'Updated bio with new information',
        location: 'New York, NY',
        skills: ['JavaScript', 'TypeScript', 'Python', 'Rust']
      };

      const response = await axios.patch(`${API_URL}/profiles/${userId}`, updates, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.bio).toBe(updates.bio);
      expect(response.data.location).toBe(updates.location);
      expect(response.data.skills).toEqual(updates.skills);
    });

    test('should handle partial updates', async () => {
      const partialUpdate = {
        website: 'https://newsite.com'
      };

      const response = await axios.patch(`${API_URL}/profiles/${userId}`, partialUpdate, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.website).toBe(partialUpdate.website);
      // Other fields should remain unchanged
      expect(response.data.firstName).toBeDefined();
      expect(response.data.bio).toBeDefined();
    });

    test('should validate profile data', async () => {
      const invalidProfile = {
        email: 'not-an-email',
        website: 'not-a-url',
        age: -5
      };

      try {
        await axios.patch(`${API_URL}/profiles/${userId}`, invalidProfile, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.errors).toBeDefined();
        expect(error.response.data.errors).toContain('Invalid email format');
        expect(error.response.data.errors).toContain('Invalid URL');
        expect(error.response.data.errors).toContain('Age must be positive');
      }
    });
  });

  describe('Avatar and Media Management', () => {
    test('should upload profile avatar', async () => {
      // Create test image
      const imageBuffer = Buffer.from('fake-image-data');
      const imagePath = path.join(TEST_DATA_DIR, 'avatar.jpg');
      fs.writeFileSync(imagePath, imageBuffer);

      const form = new FormData();
      form.append('avatar', fs.createReadStream(imagePath));

      const response = await axios.post(`${API_URL}/profiles/${userId}/avatar`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.avatarUrl).toBeDefined();
      expect(response.data.avatarUrl).toContain('/avatars/');
    });

    test('should validate image format and size', async () => {
      // Create oversized file
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const largePath = path.join(TEST_DATA_DIR, 'large.jpg');
      fs.writeFileSync(largePath, largeBuffer);

      const form = new FormData();
      form.append('avatar', fs.createReadStream(largePath));

      try {
        await axios.post(`${API_URL}/profiles/${userId}/avatar`, form, {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('File too large');
      }
    });

    test('should delete profile avatar', async () => {
      const response = await axios.delete(`${API_URL}/profiles/${userId}/avatar`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.avatarUrl).toBeNull();
    });

    test('should manage cover photo', async () => {
      const coverBuffer = Buffer.from('fake-cover-data');
      const coverPath = path.join(TEST_DATA_DIR, 'cover.jpg');
      fs.writeFileSync(coverPath, coverBuffer);

      const form = new FormData();
      form.append('cover', fs.createReadStream(coverPath));

      const response = await axios.post(`${API_URL}/profiles/${userId}/cover`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.coverPhotoUrl).toBeDefined();
    });
  });

  describe('Privacy Settings', () => {
    test('should update privacy settings', async () => {
      const privacySettings = {
        profileVisibility: 'friends',
        showEmail: false,
        showLocation: true,
        allowMessaging: 'connections',
        searchable: true
      };

      const response = await axios.put(`${API_URL}/profiles/${userId}/privacy`, privacySettings, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.profileVisibility).toBe('friends');
      expect(response.data.showEmail).toBe(false);
      expect(response.data.allowMessaging).toBe('connections');
    });

    test('should respect privacy settings in profile retrieval', async () => {
      // Set profile to private
      await axios.put(`${API_URL}/profiles/${userId}/privacy`, {
        profileVisibility: 'private'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Try to access without auth (should fail)
      try {
        await axios.get(`${API_URL}/profiles/${userId}/public`);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toBe('Profile is private');
      }
    });

    test('should handle blocked users', async () => {
      const blockedUserId = 'blocked-user-123';
      
      // Block user
      const blockResponse = await axios.post(`${API_URL}/profiles/${userId}/block`, {
        blockedUserId
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(blockResponse.status).toBe(200);

      // Get blocked list
      const blockedList = await axios.get(`${API_URL}/profiles/${userId}/blocked`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(blockedList.data).toContain(blockedUserId);

      // Unblock user
      const unblockResponse = await axios.delete(`${API_URL}/profiles/${userId}/block/${blockedUserId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(unblockResponse.status).toBe(200);
    });
  });

  describe('Account Settings', () => {
    test('should update email preferences', async () => {
      const emailPrefs = {
        newsletter: true,
        productUpdates: false,
        securityAlerts: true,
        marketingEmails: false,
        frequency: 'weekly'
      };

      const response = await axios.put(`${API_URL}/settings/email`, emailPrefs, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.newsletter).toBe(true);
      expect(response.data.marketingEmails).toBe(false);
      expect(response.data.frequency).toBe('weekly');
    });

    test('should update notification settings', async () => {
      const notificationSettings = {
        push: {
          enabled: true,
          mentions: true,
          messages: true,
          updates: false
        },
        email: {
          enabled: true,
          digest: 'daily',
          instant: ['security', 'mentions']
        },
        sms: {
          enabled: false
        }
      };

      const response = await axios.put(`${API_URL}/settings/notifications`, notificationSettings, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.push.enabled).toBe(true);
      expect(response.data.email.digest).toBe('daily');
      expect(response.data.sms.enabled).toBe(false);
    });

    test('should manage application themes', async () => {
      const themeSettings = {
        theme: 'dark',
        accentColor: '#6366f1',
        fontSize: 'medium',
        compactMode: false,
        animations: true
      };

      const response = await axios.put(`${API_URL}/settings/appearance`, themeSettings, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.theme).toBe('dark');
      expect(response.data.accentColor).toBe('#6366f1');
    });

    test('should handle language preferences', async () => {
      const languageSettings = {
        primary: 'en-US',
        secondary: 'es-ES',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        timezone: 'America/New_York'
      };

      const response = await axios.put(`${API_URL}/settings/language`, languageSettings, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.primary).toBe('en-US');
      expect(response.data.timezone).toBe('America/New_York');
    });
  });

  describe('Security Settings', () => {
    test('should enable two-factor authentication', async () => {
      // Request 2FA setup
      const setupResponse = await axios.post(`${API_URL}/security/2fa/setup`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(setupResponse.status).toBe(200);
      expect(setupResponse.data.secret).toBeDefined();
      expect(setupResponse.data.qrCode).toBeDefined();
      expect(setupResponse.data.backupCodes).toHaveLength(10);

      // Verify 2FA with code
      const verifyResponse = await axios.post(`${API_URL}/security/2fa/verify`, {
        code: '123456' // Simulated TOTP code
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.enabled).toBe(true);
    });

    test('should manage API keys', async () => {
      // Create API key
      const createResponse = await axios.post(`${API_URL}/security/api-keys`, {
        name: 'Test API Key',
        permissions: ['read:profile', 'write:profile'],
        expiresIn: '30d'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.apiKey).toBeDefined();
      expect(createResponse.data.keyId).toBeDefined();
      
      const apiKeyId = createResponse.data.keyId;

      // List API keys
      const listResponse = await axios.get(`${API_URL}/security/api-keys`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(listResponse.data.length).toBeGreaterThan(0);
      expect(listResponse.data[0].name).toBe('Test API Key');

      // Revoke API key
      const revokeResponse = await axios.delete(`${API_URL}/security/api-keys/${apiKeyId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(revokeResponse.status).toBe(200);
    });

    test('should track login sessions', async () => {
      const response = await axios.get(`${API_URL}/security/sessions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.activeSessions).toBeDefined();
      expect(response.data.activeSessions.length).toBeGreaterThan(0);
      
      const session = response.data.activeSessions[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('device');
      expect(session).toHaveProperty('ip');
      expect(session).toHaveProperty('location');
      expect(session).toHaveProperty('lastActive');
    });

    test('should terminate specific session', async () => {
      // Get sessions
      const sessionsResponse = await axios.get(`${API_URL}/security/sessions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const sessionId = sessionsResponse.data.activeSessions[0].id;

      // Terminate session
      const terminateResponse = await axios.delete(`${API_URL}/security/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(terminateResponse.status).toBe(200);
      expect(terminateResponse.data.terminated).toBe(true);
    });

    test('should change password', async () => {
      const passwordChange = {
        currentPassword: 'TestPass123!@#',
        newPassword: 'NewTestPass456!@#',
        confirmPassword: 'NewTestPass456!@#'
      };

      const response = await axios.post(`${API_URL}/security/change-password`, passwordChange, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Password changed successfully');

      // Verify can login with new password
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: `test_${userId}@example.com`,
        password: passwordChange.newPassword
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.token).toBeDefined();
    });
  });

  describe('Data Export and Import', () => {
    test('should export user data', async () => {
      const response = await axios.post(`${API_URL}/data/export`, {
        format: 'json',
        includeMedia: false
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.exportId).toBeDefined();
      expect(response.data.status).toBe('processing');

      // Check export status
      const statusResponse = await axios.get(`${API_URL}/data/export/${response.data.exportId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(statusResponse.data.status).toBeDefined();
      if (statusResponse.data.status === 'completed') {
        expect(statusResponse.data.downloadUrl).toBeDefined();
      }
    });

    test('should import user data', async () => {
      const importData = {
        profile: {
          firstName: 'Imported',
          lastName: 'User',
          bio: 'Imported bio'
        },
        settings: {
          theme: 'light'
        }
      };

      const importPath = path.join(TEST_DATA_DIR, 'import.json');
      fs.writeFileSync(importPath, JSON.stringify(importData));

      const form = new FormData();
      form.append('data', fs.createReadStream(importPath));

      const response = await axios.post(`${API_URL}/data/import`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.imported).toBe(true);
      expect(response.data.itemsProcessed).toBeGreaterThan(0);
    });

    test('should handle GDPR data deletion request', async () => {
      const response = await axios.post(`${API_URL}/data/delete-request`, {
        reason: 'User requested account deletion',
        immediate: false
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.requestId).toBeDefined();
      expect(response.data.scheduledDate).toBeDefined();
      expect(response.data.gracePeriodDays).toBe(30);
    });
  });

  describe('Activity and Analytics', () => {
    test('should track profile views', async () => {
      // Simulate profile view
      await axios.post(`${API_URL}/analytics/profile-view`, {
        viewedUserId: userId,
        source: 'search'
      });

      // Get profile analytics
      const response = await axios.get(`${API_URL}/profiles/${userId}/analytics`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.totalViews).toBeGreaterThan(0);
      expect(response.data.viewsBySource).toHaveProperty('search');
      expect(response.data.viewsOverTime).toBeDefined();
    });

    test('should get activity timeline', async () => {
      const response = await axios.get(`${API_URL}/profiles/${userId}/activity`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          limit: 20,
          offset: 0
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.activities).toBeDefined();
      expect(Array.isArray(response.data.activities)).toBe(true);
      
      if (response.data.activities.length > 0) {
        const activity = response.data.activities[0];
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('details');
      }
    });

    test('should generate activity reports', async () => {
      const response = await axios.post(`${API_URL}/analytics/generate-report`, {
        type: 'monthly',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.reportId).toBeDefined();
      expect(response.data.metrics).toBeDefined();
      expect(response.data.metrics).toHaveProperty('profileViews');
      expect(response.data.metrics).toHaveProperty('interactions');
      expect(response.data.metrics).toHaveProperty('engagement');
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent profile updates', async () => {
      const updates = Array(10).fill(null).map((_, i) => ({
        bio: `Update ${i} at ${Date.now()}`
      }));

      const startTime = Date.now();
      
      const results = await Promise.allSettled(
        updates.map(update => 
          axios.patch(`${API_URL}/profiles/${userId}`, update, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        )
      );

      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // All updates within 5 seconds
    });

    test('should efficiently search profiles', async () => {
      const searchQueries = ['john', 'developer', 'san francisco', 'javascript'];
      
      const startTime = Date.now();
      
      const results = await Promise.all(
        searchQueries.map(query => 
          axios.get(`${API_URL}/profiles/search`, {
            params: { q: query, limit: 10 }
          })
        )
      );

      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(4);
      expect(duration).toBeLessThan(2000); // All searches within 2 seconds
      
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.data.results).toBeDefined();
      });
    });

    test('should paginate large result sets', async () => {
      const pageSize = 20;
      let offset = 0;
      let hasMore = true;
      const allResults: any[] = [];

      while (hasMore && offset < 100) {
        const response = await axios.get(`${API_URL}/profiles`, {
          params: { limit: pageSize, offset }
        });

        allResults.push(...response.data.profiles);
        hasMore = response.data.hasMore;
        offset += pageSize;
      }

      expect(allResults.length).toBeGreaterThanOrEqual(0);
      // Verify no duplicates
      const ids = allResults.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Error Handling', () => {
    test('should handle unauthorized access', async () => {
      try {
        await axios.get(`${API_URL}/profiles/${userId}/private`);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Authentication required');
      }
    });

    test('should handle invalid tokens', async () => {
      try {
        await axios.get(`${API_URL}/profiles/${userId}`, {
          headers: { Authorization: 'Bearer invalid-token' }
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Invalid token');
      }
    });

    test('should handle rate limiting', async () => {
      const requests = Array(50).fill(null).map(() => 
        axios.get(`${API_URL}/profiles/${userId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(err => err.response)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r?.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      if (rateLimited.length > 0) {
        expect(rateLimited[0].data.error).toContain('Rate limit exceeded');
        expect(rateLimited[0].headers['x-ratelimit-remaining']).toBeDefined();
      }
    });

    test('should handle profile not found', async () => {
      try {
        await axios.get(`${API_URL}/profiles/non-existent-user`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBe('Profile not found');
      }
    });
  });
});

// Helper function to generate test avatar
function generateTestAvatar(): Buffer {
  const size = 100;
  const canvas = Buffer.alloc(size * size * 4);
  
  // Generate simple pattern
  for (let i = 0; i < size * size * 4; i += 4) {
    canvas[i] = Math.floor(Math.random() * 256);     // R
    canvas[i + 1] = Math.floor(Math.random() * 256); // G
    canvas[i + 2] = Math.floor(Math.random() * 256); // B
    canvas[i + 3] = 255;                              // A
  }
  
  return canvas;
}