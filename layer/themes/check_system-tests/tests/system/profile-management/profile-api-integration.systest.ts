/**
 * Profile Management API Integration System Tests
 * 
 * Comprehensive Mock Free Test Oriented Development tests for profile management APIs.
 * These tests complement the E2E tests by focusing on API behavior, data persistence,
 * and integration points without browser automation.
 * 
 * Coverage:
 * - Real database operations
 * - Data validation and constraints
 * - Security and authorization
 * - Performance and scalability
 * - Error handling and edge cases
 * - Data consistency and integrity
 */

import { test, expect } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import * as FormData from 'form-data';

// Test configuration
const API_URL = 'http://localhost:3156/api';
const TEST_DATA_DIR = path.join(__dirname, 'test-data-api');

// Database connection for direct validation
let dbConnection: any;

// Test users for different scenarios
interface TestUser {
  id?: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  authToken?: string;
}

const generateTestUser = (role: string = 'user'): TestUser => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return {
    username: `testuser_${timestamp}_${randomId}`,
    email: `test_${timestamp}_${randomId}@example.com`,
    password: 'TestPass123!@#',
    firstName: 'Test',
    lastName: 'User',
    role
  };
};

test.describe('Profile Management API Integration System Tests', () => {
  let testUsers: TestUser[] = [];
  let adminUser: TestUser;
  let regularUser: TestUser;
  let premiumUser: TestUser;

  test.beforeAll(async () => {
    console.log('Setting up Profile Management API Integration Tests...');
    
    // Create test data directory
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }

    // Create test users with different roles
    adminUser = generateTestUser('admin');
    regularUser = generateTestUser('user');
    premiumUser = generateTestUser('premium');
    
    testUsers = [adminUser, regularUser, premiumUser];
    
    // Register and authenticate all test users
    for (const user of testUsers) {
      await registerUser(user);
      await authenticateUser(user);
    }
    
    console.log(`Created ${testUsers.length} test users for testing`);
  });

  test.afterAll(async () => {
    console.log('Cleaning up Profile Management API Integration Tests...');
    
    // Cleanup test users
    for (const user of testUsers) {
      if (user.authToken && user.id) {
        try {
          await axios.delete(`${API_URL}/users/${user.id}`, {
            headers: { Authorization: `Bearer ${user.authToken}` }
          });
        } catch (error) {
          console.warn(`Failed to cleanup user ${user.username}:`, error);
        }
      }
    }

    // Cleanup test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  test.beforeEach(async () => {
    // Rate limiting protection
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Profile CRUD Operations with Real Database', () => {
    test('should create comprehensive user profile with database persistence', async () => {
      const profileData = {
        firstName: 'John',
        lastName: 'Developer',
        bio: 'Full-stack developer with 10+ years experience in enterprise applications',
        location: 'San Francisco, CA, USA',
        website: 'https://johndeveloper.com',
        phoneNumber: '+1-555-0123',
        dateOfBirth: '1990-05-15',
        gender: 'prefer_not_to_say',
        occupation: 'Senior Software Engineer',
        company: 'Tech Innovations Inc.',
        skills: [
          { name: 'JavaScript', level: 'expert', yearsExperience: 10 },
          { name: 'TypeScript', level: 'expert', yearsExperience: 8 },
          { name: 'React', level: 'advanced', yearsExperience: 7 },
          { name: 'Node.js', level: 'advanced', yearsExperience: 9 },
          { name: 'Python', level: 'intermediate', yearsExperience: 5 }
        ],
        languages: [
          { language: 'English', proficiency: 'native' },
          { language: 'Spanish', proficiency: 'conversational' },
          { language: 'French', proficiency: 'basic' }
        ],
        interests: ['Machine Learning', 'DevOps', 'Open Source', 'Photography'],
        socialLinks: {
          github: 'https://github.com/johndeveloper',
          linkedin: 'https://linkedin.com/in/john-developer',
          twitter: 'https://twitter.com/johndev',
          instagram: 'https://instagram.com/john.developer'
        },
        workExperience: [
          {
            company: 'Tech Innovations Inc.',
            position: 'Senior Software Engineer',
            startDate: '2020-01-15',
            endDate: null, // Current position
            description: 'Lead development of microservices architecture and mentor junior developers',
            technologies: ['TypeScript', 'React', 'Node.js', 'Docker', 'Kubernetes']
          },
          {
            company: 'StartupCorp',
            position: 'Full Stack Developer',
            startDate: '2018-03-01',
            endDate: '2019-12-31',
            description: 'Built MVP for fintech startup, grew from concept to 100k users',
            technologies: ['JavaScript', 'Vue.js', 'Python', 'PostgreSQL']
          }
        ],
        education: [
          {
            institution: 'University of California, Berkeley',
            degree: 'Bachelor of Science in Computer Science',
            startYear: 2014,
            graduationYear: 2018,
            gpa: 3.8,
            honors: ['Magna Cum Laude', 'Dean\'s List']
          }
        ],
        certifications: [
          {
            name: 'AWS Certified Solutions Architect',
            issuer: 'Amazon Web Services',
            issueDate: '2022-06-15',
            expiryDate: '2025-06-15',
            credentialId: 'AWS-CSA-123456'
          },
          {
            name: 'Google Cloud Professional Developer',
            issuer: 'Google Cloud',
            issueDate: '2021-09-20',
            expiryDate: '2024-09-20',
            credentialId: 'GCP-PD-789012'
          }
        ]
      };

      const response = await axios.post(`${API_URL}/profiles`, profileData, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });

      expect(response.status).toBe(201);
      expect(response.data.profileId).toBeDefined();
      expect(response.data.firstName).toBe(profileData.firstName);
      expect(response.data.skills).toHaveLength(5);
      expect(response.data.workExperience).toHaveLength(2);
      expect(response.data.certifications).toHaveLength(2);
      
      // Verify database persistence by retrieving profile
      const retrieveResponse = await axios.get(`${API_URL}/profiles/${regularUser.id}`, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });
      
      expect(retrieveResponse.status).toBe(200);
      expect(retrieveResponse.data.bio).toBe(profileData.bio);
      expect(retrieveResponse.data.socialLinks.github).toBe(profileData.socialLinks.github);
      expect(retrieveResponse.data.workExperience[0].company).toBe('Tech Innovations Inc.');
    });

    test('should handle complex profile updates with transaction integrity', async () => {
      // Create initial profile
      const initialProfile = {
        firstName: 'Jane',
        lastName: 'Engineer',
        bio: 'Initial bio',
        skills: [{ name: 'JavaScript', level: 'beginner', yearsExperience: 1 }]
      };

      await axios.post(`${API_URL}/profiles`, initialProfile, {
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });

      // Perform complex update with multiple related entities
      const complexUpdate = {
        firstName: 'Jane',
        lastName: 'Senior Engineer',
        bio: 'Updated bio with extensive experience details',
        skills: [
          { name: 'JavaScript', level: 'expert', yearsExperience: 8 },
          { name: 'TypeScript', level: 'advanced', yearsExperience: 6 },
          { name: 'Python', level: 'intermediate', yearsExperience: 4 }
        ],
        workExperience: [
          {
            company: 'Enterprise Corp',
            position: 'Technical Lead',
            startDate: '2020-01-01',
            endDate: null,
            description: 'Leading team of 8 developers on enterprise platform',
            technologies: ['TypeScript', 'React', 'PostgreSQL', 'Docker']
          }
        ],
        certifications: [
          {
            name: 'Certified Kubernetes Administrator',
            issuer: 'Cloud Native Computing Foundation',
            issueDate: '2023-03-15',
            expiryDate: '2026-03-15',
            credentialId: 'CKA-CNFC-456789'
          }
        ]
      };

      const updateResponse = await axios.patch(`${API_URL}/profiles/${premiumUser.id}`, complexUpdate, {
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });

      expect(updateResponse.status).toBe(200);
      
      // Verify all updates were applied atomically
      const verifyResponse = await axios.get(`${API_URL}/profiles/${premiumUser.id}`, {
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });
      
      const updatedProfile = verifyResponse.data;
      expect(updatedProfile.lastName).toBe('Senior Engineer');
      expect(updatedProfile.skills).toHaveLength(3);
      expect(updatedProfile.workExperience).toHaveLength(1);
      expect(updatedProfile.certifications).toHaveLength(1);
      expect(updatedProfile.workExperience[0].company).toBe('Enterprise Corp');
    });

    test('should validate profile data constraints and business rules', async () => {
      const invalidProfileData = {
        firstName: '', // Required field
        lastName: 'A'.repeat(101), // Too long
        email: 'not-an-email', // Invalid format
        website: 'not-a-url', // Invalid URL
        phoneNumber: '123', // Invalid phone format
        dateOfBirth: '2030-01-01', // Future date
        bio: 'A'.repeat(1001), // Exceeds character limit
        skills: Array(101).fill({ name: 'Skill', level: 'beginner' }), // Too many skills
        socialLinks: {
          github: 'not-a-github-url',
          linkedin: 'invalid-linkedin',
          twitter: 'invalid-twitter'
        }
      };

      try {
        await axios.post(`${API_URL}/profiles`, invalidProfileData, {
          headers: { Authorization: `Bearer ${regularUser.authToken}` }
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        const errors = error.response.data.errors;
        
        expect(errors).toContain('First name is required');
        expect(errors).toContain('Last name exceeds maximum length');
        expect(errors).toContain('Invalid email format');
        expect(errors).toContain('Invalid website URL');
        expect(errors).toContain('Invalid phone number format');
        expect(errors).toContain('Date of birth cannot be in the future');
        expect(errors).toContain('Bio exceeds maximum character limit');
        expect(errors).toContain('Too many skills (maximum 50)');
        expect(errors).toContain('Invalid GitHub URL format');
      }
    });

    test('should handle concurrent profile updates with optimistic locking', async () => {
      // Create initial profile
      const initialProfile = {
        firstName: 'Concurrent',
        lastName: 'Test',
        bio: 'Initial bio for concurrency testing',
        version: 1
      };

      const createResponse = await axios.post(`${API_URL}/profiles`, initialProfile, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });
      
      const profileId = createResponse.data.profileId;
      const currentVersion = createResponse.data.version;

      // Simulate concurrent updates
      const update1 = {
        bio: 'Updated by process 1',
        version: currentVersion
      };
      
      const update2 = {
        bio: 'Updated by process 2',
        version: currentVersion
      };

      // Execute concurrent updates
      const [result1, result2] = await Promise.allSettled([
        axios.patch(`${API_URL}/profiles/${profileId}`, update1, {
          headers: { Authorization: `Bearer ${regularUser.authToken}` }
        }),
        axios.patch(`${API_URL}/profiles/${profileId}`, update2, {
          headers: { Authorization: `Bearer ${regularUser.authToken}` }
        })
      ]);

      // One should succeed, one should fail with version conflict
      const successes = [result1, result2].filter(r => r.status === 'fulfilled');
      const failures = [result1, result2].filter(r => r.status === 'rejected');
      
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      
      // Verify the failed update has proper conflict error
      const failedResult = failures[0] as PromiseRejectedResult;
      const error = failedResult.reason as any;
      expect(error.response.status).toBe(409); // Conflict
      expect(error.response.data.error).toContain('Version conflict');
    });
  });

  describe('Advanced Security and Authorization', () => {
    test('should enforce fine-grained permissions', async () => {
      // Test regular user cannot access admin-only profile features
      try {
        await axios.get(`${API_URL}/profiles/admin/system-stats`, {
          headers: { Authorization: `Bearer ${regularUser.authToken}` }
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toBe('Insufficient permissions');
      }

      // Test user cannot modify other users' profiles
      try {
        await axios.patch(`${API_URL}/profiles/${adminUser.id}`, {
          firstName: 'Hacked'
        }, {
          headers: { Authorization: `Bearer ${regularUser.authToken}` }
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toBe('Cannot modify another user\'s profile');
      }

      // Test admin can access admin features
      const adminStatsResponse = await axios.get(`${API_URL}/profiles/admin/system-stats`, {
        headers: { Authorization: `Bearer ${adminUser.authToken}` }
      });
      
      expect(adminStatsResponse.status).toBe(200);
      expect(adminStatsResponse.data).toHaveProperty('totalUsers');
      expect(adminStatsResponse.data).toHaveProperty('activeUsers');
      expect(adminStatsResponse.data).toHaveProperty('profileCompletionRate');
    });

    test('should implement secure password management', async () => {
      // Test password change with proper validation
      const passwordChangeData = {
        currentPassword: regularUser.password,
        newPassword: 'NewSecurePass456!@#',
        confirmPassword: 'NewSecurePass456!@#'
      };

      const changeResponse = await axios.post(`${API_URL}/auth/change-password`, passwordChangeData, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });

      expect(changeResponse.status).toBe(200);
      expect(changeResponse.data.message).toBe('Password changed successfully');
      
      // Verify old password no longer works
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: regularUser.email,
          password: regularUser.password // Old password
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Invalid credentials');
      }

      // Verify new password works
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: regularUser.email,
        password: passwordChangeData.newPassword
      });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.token).toBeDefined();
      
      // Update test user password for cleanup
      regularUser.password = passwordChangeData.newPassword;
    });

    test('should implement two-factor authentication workflow', async () => {
      // Setup 2FA
      const setupResponse = await axios.post(`${API_URL}/security/2fa/setup`, {}, {
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });

      expect(setupResponse.status).toBe(200);
      expect(setupResponse.data.secret).toBeDefined();
      expect(setupResponse.data.qrCode).toBeDefined();
      expect(setupResponse.data.backupCodes).toHaveLength(10);
      
      const { secret, backupCodes } = setupResponse.data;

      // Verify 2FA with simulated TOTP code
      const verifyResponse = await axios.post(`${API_URL}/security/2fa/verify`, {
        code: generateTOTPCode(secret), // Simulated TOTP generation
        secret: secret
      }, {
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.enabled).toBe(true);

      // Test login with 2FA enabled
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: premiumUser.email,
        password: premiumUser.password
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.requires2FA).toBe(true);
      expect(loginResponse.data.tempToken).toBeDefined();
      
      // Complete 2FA login
      const complete2FAResponse = await axios.post(`${API_URL}/auth/2fa/complete`, {
        tempToken: loginResponse.data.tempToken,
        code: generateTOTPCode(secret)
      });

      expect(complete2FAResponse.status).toBe(200);
      expect(complete2FAResponse.data.token).toBeDefined();
      
      // Test backup code usage
      const backupLoginResponse = await axios.post(`${API_URL}/auth/2fa/complete`, {
        tempToken: loginResponse.data.tempToken,
        backupCode: backupCodes[0]
      });

      expect(backupLoginResponse.status).toBe(200);
      
      // Verify backup code is consumed (single use)
      try {
        await axios.post(`${API_URL}/auth/2fa/complete`, {
          tempToken: loginResponse.data.tempToken,
          backupCode: backupCodes[0] // Same backup code
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('Invalid or used backup code');
      }
    });
  });

  describe('Privacy and Data Protection', () => {
    test('should implement comprehensive privacy controls', async () => {
      // Set detailed privacy settings
      const privacySettings = {
        profileVisibility: 'friends', // public, friends, private
        allowSearch: true,
        showInDirectory: false,
        dataProcessingConsent: {
          analytics: true,
          marketing: false,
          thirdPartySharing: false,
          researchParticipation: true
        },
        visibilitySettings: {
          showEmail: false,
          showPhoneNumber: false,
          showLocation: true,
          showWorkHistory: 'connections',
          showEducation: 'public',
          showSkills: 'public',
          showSocialLinks: 'friends'
        },
        contactSettings: {
          allowDirectMessages: 'connections',
          allowConnectionRequests: true,
          allowProfileViewing: 'registered_users',
          blockAnonymousViewing: true
        },
        dataRetention: {
          activityLogRetentionDays: 365,
          mediaRetentionDays: 1095, // 3 years
          automaticDeletion: false
        }
      };

      const response = await axios.put(`${API_URL}/profiles/${regularUser.id}/privacy`, privacySettings, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.profileVisibility).toBe('friends');
      expect(response.data.dataProcessingConsent.marketing).toBe(false);
      expect(response.data.visibilitySettings.showEmail).toBe(false);
      
      // Verify privacy settings are enforced
      const publicViewResponse = await axios.get(`${API_URL}/profiles/${regularUser.id}/public`);
      
      expect(publicViewResponse.data.email).toBeUndefined();
      expect(publicViewResponse.data.phoneNumber).toBeUndefined();
      expect(publicViewResponse.data.education).toBeDefined(); // Set to public
      expect(publicViewResponse.data.socialLinks).toBeUndefined(); // Set to friends only
    });

    test('should implement data anonymization for deleted users', async () => {
      // Create profile with personal data
      const profileWithPII = {
        firstName: 'ToBeDeleted',
        lastName: 'User',
        bio: 'This profile will be deleted for testing',
        email: 'delete.me@example.com',
        phoneNumber: '+1-555-DELETE',
        socialSecurityNumber: '123-45-6789', // Sensitive data
        workExperience: [
          {
            company: 'Personal Company',
            position: 'Owner',
            description: 'Contains personal identifying information'
          }
        ]
      };

      const createResponse = await axios.post(`${API_URL}/profiles`, profileWithPII, {
        headers: { Authorization: `Bearer ${adminUser.authToken}` }
      });
      
      const profileId = createResponse.data.profileId;

      // Request account deletion
      const deletionResponse = await axios.post(`${API_URL}/users/${adminUser.id}/delete`, {
        reason: 'Testing data anonymization',
        immediate: true // For testing, skip grace period
      }, {
        headers: { Authorization: `Bearer ${adminUser.authToken}` }
      });

      expect(deletionResponse.status).toBe(200);
      expect(deletionResponse.data.anonymized).toBe(true);
      
      // Verify profile data is anonymized, not just deleted
      const anonymizedResponse = await axios.get(`${API_URL}/profiles/${profileId}/anonymized`, {
        headers: { Authorization: `Bearer ${adminUser.authToken}` }
      });
      
      const anonymizedProfile = anonymizedResponse.data;
      expect(anonymizedProfile.firstName).toBe('[DELETED]');
      expect(anonymizedProfile.lastName).toBe('[DELETED]');
      expect(anonymizedProfile.email).toBe('[DELETED]');
      expect(anonymizedProfile.phoneNumber).toBe('[DELETED]');
      expect(anonymizedProfile.socialSecurityNumber).toBeUndefined();
      
      // Verify statistical data is preserved for analytics
      expect(anonymizedProfile.createdAt).toBeDefined();
      expect(anonymizedProfile.deletedAt).toBeDefined();
      expect(anonymizedProfile.profileCompletionPercentage).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle bulk profile operations efficiently', async () => {
      console.log('Testing bulk profile operations performance...');
      
      const startTime = Date.now();
      
      // Create multiple profiles concurrently
      const bulkProfiles = Array(20).fill(null).map((_, index) => ({
        firstName: `Bulk${index}`,
        lastName: `User${index}`,
        bio: `Bulk created user ${index} for performance testing`,
        email: `bulk${index}.${Date.now()}@example.com`
      }));

      const bulkCreatePromises = bulkProfiles.map(profile => 
        axios.post(`${API_URL}/profiles`, profile, {
          headers: { Authorization: `Bearer ${adminUser.authToken}` }
        })
      );

      const results = await Promise.allSettled(bulkCreatePromises);
      const successfulCreations = results.filter(r => r.status === 'fulfilled');
      
      const duration = Date.now() - startTime;
      
      expect(successfulCreations.length).toBeGreaterThan(15); // Allow some failures
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`Created ${successfulCreations.length} profiles in ${duration}ms`);
      
      // Test bulk search performance
      const searchStartTime = Date.now();
      
      const searchResponse = await axios.get(`${API_URL}/profiles/search`, {
        params: {
          q: 'Bulk',
          limit: 50,
          includeSkills: true,
          includeWorkHistory: true
        },
        headers: { Authorization: `Bearer ${adminUser.authToken}` }
      });
      
      const searchDuration = Date.now() - searchStartTime;
      
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.results.length).toBeGreaterThan(10);
      expect(searchDuration).toBeLessThan(2000); // Search should be fast
      
      console.log(`Search completed in ${searchDuration}ms`);
    });

    test('should efficiently handle profile analytics queries', async () => {
      // Generate profile activity data
      await generateProfileActivity(regularUser);
      
      const analyticsStartTime = Date.now();
      
      // Query comprehensive analytics
      const analyticsResponse = await axios.get(`${API_URL}/profiles/${regularUser.id}/analytics`, {
        params: {
          period: '30d',
          includeViews: true,
          includeEngagement: true,
          includeGrowth: true,
          granularity: 'daily'
        },
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });
      
      const analyticsDuration = Date.now() - analyticsStartTime;
      
      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.data).toHaveProperty('profileViews');
      expect(analyticsResponse.data).toHaveProperty('engagementMetrics');
      expect(analyticsResponse.data).toHaveProperty('growthMetrics');
      expect(analyticsResponse.data.profileViews).toHaveProperty('total');
      expect(analyticsResponse.data.profileViews).toHaveProperty('byDate');
      
      expect(analyticsDuration).toBeLessThan(3000); // Analytics should be fast
      
      console.log(`Analytics query completed in ${analyticsDuration}ms`);
    });

    test('should optimize profile image processing and storage', async () => {
      // Test various image formats and sizes
      const imageTests = [
        { name: 'small.jpg', size: 100 * 1024, format: 'JPEG' },
        { name: 'medium.png', size: 500 * 1024, format: 'PNG' },
        { name: 'large.webp', size: 1 * 1024 * 1024, format: 'WebP' }
      ];

      for (const imageTest of imageTests) {
        const imagePath = path.join(TEST_DATA_DIR, imageTest.name);
        const imageData = generateTestImageWithFormat(imageTest.format, imageTest.size);
        fs.writeFileSync(imagePath, imageData);
        
        const form = new FormData();
        form.append('avatar', fs.createReadStream(imagePath));
        
        const uploadStartTime = Date.now();
        
        const uploadResponse = await axios.post(`${API_URL}/profiles/${regularUser.id}/avatar`, form, {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${regularUser.authToken}`
          }
        });
        
        const uploadDuration = Date.now() - uploadStartTime;
        
        expect(uploadResponse.status).toBe(200);
        expect(uploadResponse.data.avatarUrl).toBeDefined();
        expect(uploadResponse.data.variants).toBeDefined(); // Should include multiple sizes
        expect(uploadResponse.data.variants).toHaveProperty('thumbnail');
        expect(uploadResponse.data.variants).toHaveProperty('medium');
        expect(uploadResponse.data.variants).toHaveProperty('large');
        
        // Verify processing time is reasonable
        expect(uploadDuration).toBeLessThan(5000);
        
        console.log(`${imageTest.format} upload (${imageTest.size} bytes) completed in ${uploadDuration}ms`);
      }
    });
  });

  describe('Data Integrity and Backup', () => {
    test('should maintain data consistency during complex operations', async () => {
      // Create complex profile with relationships
      const complexProfile = {
        firstName: 'Complex',
        lastName: 'User',
        bio: 'Testing complex data relationships',
        skills: [
          { name: 'Leadership', level: 'advanced', yearsExperience: 5 },
          { name: 'Project Management', level: 'expert', yearsExperience: 8 }
        ],
        workExperience: [
          {
            company: 'Data Corp',
            position: 'Data Architect',
            startDate: '2019-01-01',
            endDate: null,
            technologies: ['PostgreSQL', 'Redis', 'MongoDB']
          }
        ],
        projects: [
          {
            name: 'Data Migration Platform',
            description: 'Enterprise data migration and synchronization platform',
            technologies: ['TypeScript', 'Docker', 'Kubernetes'],
            status: 'completed'
          }
        ]
      };

      const createResponse = await axios.post(`${API_URL}/profiles`, complexProfile, {
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });
      
      const profileId = createResponse.data.profileId;
      
      // Perform complex update that affects multiple tables
      const complexUpdate = {
        bio: 'Updated bio after promotion',
        workExperience: [
          {
            id: createResponse.data.workExperience[0].id,
            company: 'Data Corp',
            position: 'Senior Data Architect', // Promotion
            startDate: '2019-01-01',
            endDate: null,
            technologies: ['PostgreSQL', 'Redis', 'MongoDB', 'Kafka'] // Added technology
          }
        ],
        skills: [
          { name: 'Leadership', level: 'expert', yearsExperience: 6 }, // Advancement
          { name: 'Project Management', level: 'expert', yearsExperience: 8 },
          { name: 'Data Architecture', level: 'advanced', yearsExperience: 4 } // New skill
        ]
      };

      const updateResponse = await axios.patch(`${API_URL}/profiles/${profileId}`, complexUpdate, {
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });

      expect(updateResponse.status).toBe(200);
      
      // Verify all related data was updated consistently
      const verifyResponse = await axios.get(`${API_URL}/profiles/${profileId}`, {
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });
      
      const verifiedProfile = verifyResponse.data;
      expect(verifiedProfile.workExperience[0].position).toBe('Senior Data Architect');
      expect(verifiedProfile.skills).toHaveLength(3);
      expect(verifiedProfile.skills.find(s => s.name === 'Leadership').level).toBe('expert');
      expect(verifiedProfile.skills.find(s => s.name === 'Data Architecture')).toBeDefined();
    });

    test('should handle profile data export with complete referential integrity', async () => {
      // Create comprehensive profile with all data types
      await createCompleteProfile(regularUser);
      
      // Request comprehensive data export
      const exportResponse = await axios.post(`${API_URL}/data/export/comprehensive`, {
        format: 'json',
        includeMedia: true,
        includeAnalytics: true,
        includeAuditLog: true,
        validateIntegrity: true
      }, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.data.exportId).toBeDefined();
      
      // Poll for export completion
      let exportStatus = 'processing';
      let attempts = 0;
      const maxAttempts = 30;
      
      while (exportStatus === 'processing' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await axios.get(`${API_URL}/data/export/${exportResponse.data.exportId}`, {
          headers: { Authorization: `Bearer ${regularUser.authToken}` }
        });
        
        exportStatus = statusResponse.data.status;
        attempts++;
      }
      
      expect(exportStatus).toBe('completed');
      
      // Download and verify export data
      const downloadResponse = await axios.get(`${API_URL}/data/export/${exportResponse.data.exportId}/download`, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` },
        responseType: 'arraybuffer'
      });
      
      expect(downloadResponse.status).toBe(200);
      
      // Save and parse export data
      const exportPath = path.join(TEST_DATA_DIR, 'comprehensive-export.json');
      fs.writeFileSync(exportPath, downloadResponse.data);
      
      const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      
      // Verify data integrity
      expect(exportData).toHaveProperty('metadata');
      expect(exportData).toHaveProperty('profile');
      expect(exportData).toHaveProperty('skills');
      expect(exportData).toHaveProperty('workExperience');
      expect(exportData).toHaveProperty('education');
      expect(exportData).toHaveProperty('projects');
      expect(exportData).toHaveProperty('activityLog');
      expect(exportData).toHaveProperty('privacySettings');
      expect(exportData).toHaveProperty('mediaFiles');
      
      // Verify referential integrity
      expect(exportData.metadata.userId).toBe(regularUser.id);
      expect(exportData.metadata.exportDate).toBeDefined();
      expect(exportData.metadata.integrityChecksum).toBeDefined();
      
      // Verify all related records reference correct user
      exportData.skills.forEach((skill: any) => {
        expect(skill.userId).toBe(regularUser.id);
      });
      
      exportData.workExperience.forEach((exp: any) => {
        expect(exp.userId).toBe(regularUser.id);
      });
    });
  });

  describe('Audit Logging and Compliance', () => {
    test('should maintain comprehensive audit trail', async () => {
      console.log('Testing audit logging for compliance...');
      
      // Perform various profile operations
      const operations = [
        () => axios.post(`${API_URL}/profiles`, {
          firstName: 'Audit',
          lastName: 'Test',
          bio: 'Testing audit logging'
        }, { headers: { Authorization: `Bearer ${regularUser.authToken}` } }),
        
        () => axios.patch(`${API_URL}/profiles/${regularUser.id}`, {
          bio: 'Updated bio for audit testing'
        }, { headers: { Authorization: `Bearer ${regularUser.authToken}` } }),
        
        () => axios.put(`${API_URL}/profiles/${regularUser.id}/privacy`, {
          profileVisibility: 'private'
        }, { headers: { Authorization: `Bearer ${regularUser.authToken}` } }),
        
        () => axios.post(`${API_URL}/profiles/${regularUser.id}/avatar`, createFormData('avatar.jpg'), {
          headers: { Authorization: `Bearer ${regularUser.authToken}` }
        })
      ];

      // Execute operations sequentially
      for (const operation of operations) {
        await operation();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for audit logging
      }

      // Retrieve audit log
      const auditResponse = await axios.get(`${API_URL}/audit/profile/${regularUser.id}`, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.data.auditEntries).toHaveLength(4);
      
      const auditEntries = auditResponse.data.auditEntries;
      
      // Verify audit entry structure
      auditEntries.forEach((entry: any) => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('userId');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('ipAddress');
        expect(entry).toHaveProperty('userAgent');
        expect(entry).toHaveProperty('changes');
        expect(entry).toHaveProperty('previousValues');
        expect(entry).toHaveProperty('newValues');
      });
      
      // Verify specific operations are logged
      const profileCreateEntry = auditEntries.find((e: any) => e.action === 'PROFILE_CREATE');
      const profileUpdateEntry = auditEntries.find((e: any) => e.action === 'PROFILE_UPDATE');
      const privacyUpdateEntry = auditEntries.find((e: any) => e.action === 'PRIVACY_UPDATE');
      const avatarUploadEntry = auditEntries.find((e: any) => e.action === 'AVATAR_UPLOAD');
      
      expect(profileCreateEntry).toBeDefined();
      expect(profileUpdateEntry).toBeDefined();
      expect(privacyUpdateEntry).toBeDefined();
      expect(avatarUploadEntry).toBeDefined();
      
      // Verify change tracking details
      expect(profileUpdateEntry.changes).toContain('bio');
      expect(profileUpdateEntry.previousValues).toHaveProperty('bio');
      expect(profileUpdateEntry.newValues).toHaveProperty('bio');
    });

    test('should support GDPR compliance reporting', async () => {
      // Generate GDPR compliance report
      const complianceResponse = await axios.get(`${API_URL}/compliance/gdpr/profile/${regularUser.id}`, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });

      expect(complianceResponse.status).toBe(200);
      
      const complianceData = complianceResponse.data;
      
      // Verify GDPR compliance data structure
      expect(complianceData).toHaveProperty('dataSubject'); // User information
      expect(complianceData).toHaveProperty('dataCategories'); // Types of data collected
      expect(complianceData).toHaveProperty('processingPurposes'); // Why data is processed
      expect(complianceData).toHaveProperty('legalBases'); // Legal basis for processing
      expect(complianceData).toHaveProperty('retentionPeriods'); // How long data is kept
      expect(complianceData).toHaveProperty('thirdPartySharing'); // Data sharing info
      expect(complianceData).toHaveProperty('consentHistory'); // Consent tracking
      expect(complianceData).toHaveProperty('dataPortability'); // Export capabilities
      expect(complianceData).toHaveProperty('rightToErasure'); // Deletion capabilities
      
      // Verify specific GDPR requirements
      expect(complianceData.dataCategories).toContain('personal_information');
      expect(complianceData.dataCategories).toContain('professional_information');
      expect(complianceData.processingPurposes).toContain('profile_management');
      expect(complianceData.legalBases).toContain('consent');
    });
  });

  describe('Real-Time Features and WebSocket Integration', () => {
    test('should handle real-time profile updates', async () => {
      // This test would require WebSocket setup
      // For now, we'll test the HTTP endpoints that support real-time features
      
      // Subscribe to profile change notifications
      const subscribeResponse = await axios.post(`${API_URL}/notifications/subscribe`, {
        types: ['profile_update', 'privacy_change', 'security_alert'],
        delivery: 'websocket'
      }, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });
      
      expect(subscribeResponse.status).toBe(200);
      expect(subscribeResponse.data.subscriptionId).toBeDefined();
      
      // Make profile change that should trigger notification
      await axios.patch(`${API_URL}/profiles/${regularUser.id}`, {
        firstName: 'RealTimeTest'
      }, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });
      
      // Check for notification delivery (HTTP polling for testing)
      const notificationsResponse = await axios.get(`${API_URL}/notifications/pending`, {
        headers: { Authorization: `Bearer ${regularUser.authToken}` }
      });
      
      expect(notificationsResponse.status).toBe(200);
      expect(notificationsResponse.data.notifications).toHaveLength(1);
      expect(notificationsResponse.data.notifications[0].type).toBe('profile_update');
    });

    test('should handle profile activity streaming', async () => {
      // Generate activity to stream
      await generateProfileActivity(premiumUser);
      
      // Request activity stream
      const streamResponse = await axios.get(`${API_URL}/profiles/${premiumUser.id}/activity/stream`, {
        params: {
          since: new Date(Date.now() - 3600000).toISOString(), // Last hour
          realtime: true
        },
        headers: { Authorization: `Bearer ${premiumUser.authToken}` }
      });
      
      expect(streamResponse.status).toBe(200);
      expect(streamResponse.data.activities).toBeDefined();
      expect(streamResponse.data.streamId).toBeDefined();
      expect(streamResponse.data.lastUpdateTimestamp).toBeDefined();
      
      // Verify streaming endpoint structure
      if (streamResponse.data.activities.length > 0) {
        const activity = streamResponse.data.activities[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('data');
      }
    });
  });
});

// Helper Functions

async function registerUser(user: TestUser): Promise<void> {
  const registerResponse = await axios.post(`${API_URL}/auth/register`, {
    username: user.username,
    email: user.email,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  });
  
  user.id = registerResponse.data.userId;
}

async function authenticateUser(user: TestUser): Promise<void> {
  const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    email: user.email,
    password: user.password
  });
  
  user.authToken = loginResponse.data.token;
}

async function generateProfileActivity(user: TestUser): Promise<void> {
  // Generate various activities
  const activities = [
    () => axios.patch(`${API_URL}/profiles/${user.id}`, {
      bio: `Updated bio at ${Date.now()}`
    }, { headers: { Authorization: `Bearer ${user.authToken}` } }),
    
    () => axios.put(`${API_URL}/profiles/${user.id}/privacy`, {
      profileVisibility: 'public'
    }, { headers: { Authorization: `Bearer ${user.authToken}` } }),
    
    () => axios.post(`${API_URL}/profiles/${user.id}/skills`, {
      name: 'ActivityTestSkill',
      level: 'intermediate'
    }, { headers: { Authorization: `Bearer ${user.authToken}` } })
  ];
  
  for (const activity of activities) {
    await activity();
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function createCompleteProfile(user: TestUser): Promise<void> {
  const completeProfile = {
    firstName: 'Complete',
    lastName: 'Profile',
    bio: 'Comprehensive profile with all data types for export testing',
    location: 'Global Remote',
    website: 'https://completeprofile.dev',
    phoneNumber: '+1-555-COMPLETE',
    skills: [
      { name: 'Full Stack Development', level: 'expert', yearsExperience: 10 },
      { name: 'DevOps', level: 'advanced', yearsExperience: 6 }
    ],
    workExperience: [
      {
        company: 'Complete Systems',
        position: 'Senior Engineer',
        startDate: '2020-01-01',
        endDate: null,
        description: 'Leading complete system implementations'
      }
    ],
    education: [
      {
        institution: 'Complete University',
        degree: 'Master of Computer Science',
        graduationYear: 2019
      }
    ]
  };
  
  await axios.post(`${API_URL}/profiles`, completeProfile, {
    headers: { Authorization: `Bearer ${user.authToken}` }
  });
}

function generateTOTPCode(secret: string): string {
  // Simulated TOTP code generation
  // In real implementation, this would use actual TOTP algorithm
  return '123456';
}

function generateTestImageWithFormat(format: string, size: number): Buffer {
  let header: Buffer;
  
  switch (format) {
    case 'JPEG':
      header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      break;
    case 'PNG':
      header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      break;
    case 'WebP':
      header = Buffer.from([0x52, 0x49, 0x46, 0x46]);
      break;
    default:
      header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  }
  
  const dataSize = size - header.length - 2;
  const data = Buffer.alloc(dataSize);
  for (let i = 0; i < dataSize; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  
  const footer = format === 'JPEG' ? Buffer.from([0xFF, 0xD9]) : Buffer.alloc(0);
  
  return Buffer.concat([header, data, footer]);
}

function createFormData(filename: string): FormData {
  const form = new FormData();
  const imagePath = path.join(TEST_DATA_DIR, filename);
  
  if (!fs.existsSync(imagePath)) {
    const imageData = generateTestImageWithFormat('JPEG', 100 * 1024);
    fs.writeFileSync(imagePath, imageData);
  }
  
  form.append('file', fs.createReadStream(imagePath));
  return form;
}