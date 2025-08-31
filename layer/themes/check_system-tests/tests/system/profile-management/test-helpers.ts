/**
 * Test Helpers for Profile Management System Tests
 * 
 * Utility functions for Mock Free Test Oriented Development approach
 * to profile management testing. Provides real implementations without mocks.
 */

import { Page, expect } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { createHash, randomBytes } from 'crypto';
import * as FormData from 'form-data';

// Configuration
export const TEST_CONFIG = {
  PORTAL_URL: 'http://localhost:3156',
  API_URL: 'http://localhost:3156/api',
  TEST_DATA_DIR: path.join(__dirname, 'test-data'),
  UPLOAD_DIR: path.join(__dirname, 'test-uploads'),
  DEFAULT_TIMEOUT: 30000
};

// Types
export interface TestUser {
  id?: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  authToken?: string;
  profileId?: string;
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  bio?: string;
  location?: string;
  website?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  occupation?: string;
  company?: string;
  skills?: Array<{
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    yearsExperience?: number;
  }>;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
  };
  workExperience?: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string | null;
    description?: string;
    technologies?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    startYear?: number;
    graduationYear: number;
    gpa?: number;
    honors?: string[];
  }>;
}

// User Management Helpers

/**
 * Generate unique test user data
 */
export function generateTestUser(role: string = 'user'): TestUser {
  const timestamp = Date.now();
  const randomId = randomBytes(4).toString('hex');
  
  return {
    username: `testuser_${timestamp}_${randomId}`,
    email: `test_${timestamp}_${randomId}@aidev-test.com`,
    password: 'TestPass123!@#',
    firstName: 'Test',
    lastName: 'User',
    role
  };
}

/**
 * Register a new user via API
 */
export async function registerUser(user: TestUser): Promise<TestUser> {
  const registerResponse = await axios.post(`${TEST_CONFIG.API_URL}/auth/register`, {
    username: user.username,
    email: user.email,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    skipEmailVerification: true // For testing
  });
  
  if (registerResponse.status === 201) {
    user.id = registerResponse.data.userId;
    return user;
  }
  
  throw new Error(`Failed to register user: ${registerResponse.status}`);
}

/**
 * Authenticate user and get auth token
 */
export async function authenticateUser(user: TestUser): Promise<TestUser> {
  const loginResponse = await axios.post(`${TEST_CONFIG.API_URL}/auth/login`, {
    email: user.email,
    password: user.password
  });
  
  if (loginResponse.status === 200) {
    user.authToken = loginResponse.data.token;
    return user;
  }
  
  throw new Error(`Failed to authenticate user: ${loginResponse.status}`);
}

/**
 * Complete user setup (register + authenticate)
 */
export async function setupTestUser(role: string = 'user'): Promise<TestUser> {
  const user = generateTestUser(role);
  await registerUser(user);
  await authenticateUser(user);
  return user;
}

// Browser Interaction Helpers

/**
 * Register and login user via browser UI
 */
export async function registerAndLoginViaBrowser(page: Page, user: TestUser): Promise<void> {
  // Navigate to registration page
  await page.goto(`${TEST_CONFIG.PORTAL_URL}/register`);
  
  // Fill registration form
  await page.locator('input[name="username"]').fill(user.username);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('input[name="confirmPassword"]').fill(user.password);
  
  // Accept terms
  await page.locator('input[name="acceptTerms"]').check();
  
  // Submit registration
  await page.locator('button[type="submit"]').click();
  
  // Skip email verification for testing
  await page.goto(`${TEST_CONFIG.PORTAL_URL}/login`);
  
  // Login
  await page.locator('input[name="username"]').fill(user.username);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  
  // Wait for dashboard
  await page.waitForURL('**/dashboard');
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
}

/**
 * Login existing user via browser UI
 */
export async function loginViaBrowser(page: Page, user: TestUser): Promise<void> {
  await page.goto(`${TEST_CONFIG.PORTAL_URL}/login`);
  
  await page.locator('input[name="username"]').fill(user.username);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  
  await page.waitForURL('**/dashboard');
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
}

/**
 * Navigate to profile page via UI
 */
export async function navigateToProfile(page: Page): Promise<void> {
  await page.locator('[data-testid="user-menu"]').click();
  await page.locator('[data-testid="profile-link"]').click();
  await page.waitForURL('**/profile');
  await expect(page.locator('[data-testid="profile-content"]')).toBeVisible();
}

/**
 * Navigate to specific settings page
 */
export async function navigateToSettings(page: Page, settingsType: string): Promise<void> {
  await page.locator('[data-testid="user-menu"]').click();
  await page.locator(`[data-testid="${settingsType}-settings-link"]`).click();
  await page.waitForURL(`**/settings/${settingsType}`);
}

// Profile Data Helpers

/**
 * Create comprehensive profile data via API
 */
export async function createCompleteProfile(user: TestUser, profileData?: Partial<ProfileData>): Promise<any> {
  const defaultProfile: ProfileData = {
    firstName: user.firstName,
    lastName: user.lastName,
    bio: 'Comprehensive test profile with all features',
    location: 'Test City, TC, USA',
    website: 'https://testuser.dev',
    phoneNumber: '+1-555-TEST-USER',
    occupation: 'Software Developer',
    company: 'Test Corporation',
    skills: [
      { name: 'JavaScript', level: 'expert', yearsExperience: 8 },
      { name: 'TypeScript', level: 'advanced', yearsExperience: 5 },
      { name: 'React', level: 'advanced', yearsExperience: 6 },
      { name: 'Node.js', level: 'intermediate', yearsExperience: 4 }
    ],
    socialLinks: {
      github: 'https://github.com/testuser',
      linkedin: 'https://linkedin.com/in/test-user',
      twitter: 'https://twitter.com/testuser'
    },
    workExperience: [
      {
        company: 'Tech Innovations Ltd.',
        position: 'Senior Software Developer',
        startDate: '2020-01-15',
        endDate: null,
        description: 'Lead development of enterprise web applications using modern JavaScript frameworks',
        technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker']
      },
      {
        company: 'StartupCo',
        position: 'Full Stack Developer',
        startDate: '2018-06-01',
        endDate: '2019-12-31',
        description: 'Built MVP for fintech startup, responsible for both frontend and backend development',
        technologies: ['JavaScript', 'Vue.js', 'Python', 'MongoDB']
      }
    ],
    education: [
      {
        institution: 'Technology University',
        degree: 'Bachelor of Science in Computer Science',
        graduationYear: 2018,
        gpa: 3.7,
        honors: ['Dean\'s List', 'Programming Contest Winner']
      }
    ]
  };
  
  const finalProfile = { ...defaultProfile, ...profileData };
  
  const response = await axios.post(`${TEST_CONFIG.API_URL}/profiles`, finalProfile, {
    headers: { Authorization: `Bearer ${user.authToken}` }
  });
  
  if (response.status === 201) {
    user.profileId = response.data.profileId;
    return response.data;
  }
  
  throw new Error(`Failed to create profile: ${response.status}`);
}

/**
 * Upload test avatar for user
 */
export async function uploadTestAvatar(user: TestUser, imageSize: number = 200 * 1024): Promise<string> {
  const avatarPath = path.join(TEST_CONFIG.TEST_DATA_DIR, `avatar-${user.username}.jpg`);
  const avatarData = generateTestImage('JPEG', imageSize);
  fs.writeFileSync(avatarPath, avatarData);
  
  const form = new FormData();
  form.append('avatar', fs.createReadStream(avatarPath));
  
  const response = await axios.post(`${TEST_CONFIG.API_URL}/profiles/${user.id}/avatar`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${user.authToken}`
    }
  });
  
  if (response.status === 200) {
    return response.data.avatarUrl;
  }
  
  throw new Error(`Failed to upload avatar: ${response.status}`);
}

// File and Media Helpers

/**
 * Generate test image with specific format and size
 */
export function generateTestImage(format: string, size: number): Buffer {
  let header: Buffer;
  let footer: Buffer = Buffer.alloc(0);
  
  switch (format.toUpperCase()) {
    case 'JPEG':
      header = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
      ]);
      footer = Buffer.from([0xFF, 0xD9]);
      break;
      
    case 'PNG':
      header = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x70, 0xE2, 0x95, 0x54
      ]);
      break;
      
    case 'WEBP':
      header = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20
      ]);
      break;
      
    default:
      header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      footer = Buffer.from([0xFF, 0xD9]);
  }
  
  const dataSize = Math.max(size - header.length - footer.length, 100);
  const data = Buffer.alloc(dataSize);
  
  // Generate realistic image-like data
  for (let i = 0; i < dataSize; i++) {
    // Create patterns that look like compressed image data
    const patternValue = Math.sin(i / 100) * 127 + 128;
    data[i] = Math.floor(patternValue + Math.random() * 32 - 16);
  }
  
  return Buffer.concat([header, data, footer]);
}

/**
 * Create form data for file upload
 */
export function createFormDataForUpload(filename: string, fileData?: Buffer): FormData {
  const form = new FormData();
  const filePath = path.join(TEST_CONFIG.TEST_DATA_DIR, filename);
  
  if (fileData) {
    fs.writeFileSync(filePath, fileData);
  } else if (!fs.existsSync(filePath)) {
    // Create default test file
    const defaultData = generateTestImage('JPEG', 100 * 1024);
    fs.writeFileSync(filePath, defaultData);
  }
  
  form.append('file', fs.createReadStream(filePath));
  return form;
}

// UI Interaction Helpers

/**
 * Wait for element and verify it's interactive
 */
export async function waitForInteractiveElement(page: Page, selector: string, timeout: number = TEST_CONFIG.DEFAULT_TIMEOUT): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  await element.waitFor({ state: 'attached', timeout });
  
  // Verify element is not disabled
  const isDisabled = await element.isDisabled();
  expect(isDisabled).toBe(false);
}

/**
 * Type text with realistic human-like delays
 */
export async function typeWithDelay(page: Page, selector: string, text: string, delay: number = 50): Promise<void> {
  const element = page.locator(selector);
  await element.click();
  await element.clear();
  await element.type(text, { delay });
}

/**
 * Upload file via file chooser with real file interaction
 */
export async function uploadFileViaBrowser(page: Page, triggerSelector: string, filePath: string): Promise<void> {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator(triggerSelector).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
}

/**
 * Verify success message appears and then disappears
 */
export async function verifySuccessMessage(page: Page, expectedText: string, timeout: number = 10000): Promise<void> {
  const successMessage = page.locator('[data-testid="success-message"]');
  
  // Wait for message to appear
  await expect(successMessage).toContainText(expectedText, { timeout });
  
  // Optionally wait for it to disappear (auto-hide)
  try {
    await expect(successMessage).not.toBeVisible({ timeout: 5000 });
  } catch {
    // Message might not auto-hide, which is also acceptable
  }
}

/**
 * Verify error message appears
 */
export async function verifyErrorMessage(page: Page, expectedText: string, timeout: number = 10000): Promise<void> {
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toContainText(expectedText, { timeout });
}

// API Validation Helpers

/**
 * Verify profile data in database via API
 */
export async function verifyProfileInDatabase(user: TestUser, expectedData: Partial<ProfileData>): Promise<void> {
  const response = await axios.get(`${TEST_CONFIG.API_URL}/profiles/${user.id}`, {
    headers: { Authorization: `Bearer ${user.authToken}` }
  });
  
  expect(response.status).toBe(200);
  
  const profileData = response.data;
  
  Object.keys(expectedData).forEach(key => {
    expect(profileData[key]).toEqual((expectedData as any)[key]);
  });
}

/**
 * Verify user permissions via API
 */
export async function verifyUserPermissions(user: TestUser, expectedPermissions: string[]): Promise<void> {
  const response = await axios.get(`${TEST_CONFIG.API_URL}/users/${user.id}/permissions`, {
    headers: { Authorization: `Bearer ${user.authToken}` }
  });
  
  expect(response.status).toBe(200);
  
  const userPermissions = response.data.permissions;
  
  expectedPermissions.forEach(permission => {
    expect(userPermissions).toContain(permission);
  });
}

/**
 * Verify audit log entry exists
 */
export async function verifyAuditLogEntry(user: TestUser, action: string, withinMinutes: number = 5): Promise<void> {
  const response = await axios.get(`${TEST_CONFIG.API_URL}/audit/profile/${user.id}`, {
    params: {
      since: new Date(Date.now() - withinMinutes * 60 * 1000).toISOString(),
      actions: action
    },
    headers: { Authorization: `Bearer ${user.authToken}` }
  });
  
  expect(response.status).toBe(200);
  
  const auditEntries = response.data.auditEntries;
  const matchingEntry = auditEntries.find((entry: any) => entry.action === action);
  
  expect(matchingEntry).toBeDefined();
  expect(matchingEntry.userId).toBe(user.id);
  expect(matchingEntry.timestamp).toBeDefined();
}

// Data Generation Helpers

/**
 * Generate realistic profile data
 */
export function generateRealisticProfileData(): ProfileData {
  const firstNames = ['John', 'Jane', 'Alex', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const cities = ['San Francisco', 'New York', 'Los Angeles', 'Chicago', 'Boston', 'Seattle', 'Austin', 'Denver'];
  const companies = ['TechCorp', 'InnovateLtd', 'DataSystems', 'CloudSolutions', 'DevTools Inc.', 'StartupCo'];
  const positions = ['Software Engineer', 'Senior Developer', 'Tech Lead', 'Product Manager', 'DevOps Engineer'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const position = positions[Math.floor(Math.random() * positions.length)];
  
  return {
    firstName,
    lastName,
    bio: `Experienced ${position.toLowerCase()} passionate about building scalable software solutions`,
    location: `${city}, CA, USA`,
    website: `https://${firstName.toLowerCase()}${lastName.toLowerCase()}.dev`,
    phoneNumber: `+1-555-${Math.floor(Math.random() * 9000 + 1000)}`,
    occupation: position,
    company,
    skills: [
      { name: 'JavaScript', level: 'expert', yearsExperience: Math.floor(Math.random() * 10 + 5) },
      { name: 'TypeScript', level: 'advanced', yearsExperience: Math.floor(Math.random() * 8 + 3) },
      { name: 'React', level: 'advanced', yearsExperience: Math.floor(Math.random() * 7 + 2) }
    ],
    socialLinks: {
      github: `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      twitter: `https://twitter.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`
    },
    workExperience: [
      {
        company,
        position,
        startDate: '2020-01-01',
        endDate: null,
        description: `Leading development initiatives at ${company}`,
        technologies: ['TypeScript', 'React', 'Node.js']
      }
    ],
    education: [
      {
        institution: 'State University',
        degree: 'Bachelor of Computer Science',
        graduationYear: 2019,
        gpa: 3.6
      }
    ]
  };
}

/**
 * Generate test data for specific scenarios
 */
export function generateScenarioTestData(scenario: string): any {
  switch (scenario) {
    case 'privacy_test':
      return {
        profileVisibility: 'private',
        allowSearch: false,
        showEmail: false,
        showPhone: false,
        allowMessaging: 'disabled'
      };
      
    case 'public_profile':
      return {
        profileVisibility: 'public',
        allowSearch: true,
        showLocation: true,
        showWorkHistory: true,
        allowMessaging: 'everyone'
      };
      
    case 'professional_profile':
      return {
        occupation: 'Senior Software Architect',
        company: 'Enterprise Solutions Inc.',
        showProfessionalInfo: true,
        skills: [
          { name: 'System Design', level: 'expert', yearsExperience: 12 },
          { name: 'Microservices', level: 'expert', yearsExperience: 8 },
          { name: 'Cloud Architecture', level: 'advanced', yearsExperience: 6 }
        ]
      };
      
    case 'student_profile':
      return {
        occupation: 'Computer Science Student',
        education: [
          {
            institution: 'Technology Institute',
            degree: 'Bachelor of Computer Science',
            graduationYear: new Date().getFullYear() + 1,
            gpa: 3.8
          }
        ],
        skills: [
          { name: 'Python', level: 'intermediate', yearsExperience: 2 },
          { name: 'Java', level: 'beginner', yearsExperience: 1 }
        ]
      };
      
    default:
      return generateRealisticProfileData();
  }
}

// Validation Helpers

/**
 * Validate profile data structure
 */
export function validateProfileDataStructure(profileData: any): void {
  // Required fields
  expect(profileData).toHaveProperty('id');
  expect(profileData).toHaveProperty('userId');
  expect(profileData).toHaveProperty('firstName');
  expect(profileData).toHaveProperty('lastName');
  expect(profileData).toHaveProperty('createdAt');
  expect(profileData).toHaveProperty('updatedAt');
  
  // Optional but structured fields
  if (profileData.skills) {
    expect(Array.isArray(profileData.skills)).toBe(true);
    profileData.skills.forEach((skill: any) => {
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('level');
      expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(skill.level);
    });
  }
  
  if (profileData.workExperience) {
    expect(Array.isArray(profileData.workExperience)).toBe(true);
    profileData.workExperience.forEach((exp: any) => {
      expect(exp).toHaveProperty('company');
      expect(exp).toHaveProperty('position');
      expect(exp).toHaveProperty('startDate');
    });
  }
  
  if (profileData.socialLinks) {
    expect(typeof profileData.socialLinks).toBe('object');
  }
}

/**
 * Validate privacy settings structure
 */
export function validatePrivacySettings(privacyData: any): void {
  expect(privacyData).toHaveProperty('profileVisibility');
  expect(['public', 'friends', 'private']).toContain(privacyData.profileVisibility);
  
  expect(privacyData).toHaveProperty('allowSearch');
  expect(typeof privacyData.allowSearch).toBe('boolean');
  
  if (privacyData.visibilitySettings) {
    expect(typeof privacyData.visibilitySettings).toBe('object');
  }
  
  if (privacyData.contactSettings) {
    expect(typeof privacyData.contactSettings).toBe('object');
  }
}

// Performance Helpers

/**
 * Measure operation performance
 */
export async function measureOperationTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;
  
  return { result, duration };
}

/**
 * Generate load for performance testing
 */
export async function generateConcurrentLoad(
  operation: () => Promise<any>,
  concurrency: number,
  iterations: number
): Promise<{ results: any[]; totalDuration: number; averageResponseTime: number }> {
  const startTime = Date.now();
  const results: any[] = [];
  
  for (let batch = 0; batch < iterations; batch++) {
    const batchPromises = Array(concurrency).fill(null).map(() => operation());
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const totalDuration = Date.now() - startTime;
  const successfulResults = results.filter(r => r.status === 'fulfilled');
  const averageResponseTime = totalDuration / results.length;
  
  return {
    results: successfulResults.map(r => (r as PromiseFulfilledResult<any>).value),
    totalDuration,
    averageResponseTime
  };
}

// Cleanup Helpers

/**
 * Cleanup test user data
 */
export async function cleanupTestUser(user: TestUser): Promise<void> {
  try {
    if (user.authToken && user.id) {
      await axios.delete(`${TEST_CONFIG.API_URL}/users/${user.id}`, {
        headers: { Authorization: `Bearer ${user.authToken}` }
      });
    }
  } catch (error) {
    console.warn(`Failed to cleanup user ${user.username}:`, error);
  }
}

/**
 * Cleanup test files for specific user
 */
export function cleanupUserTestFiles(user: TestUser): void {
  const userFiles = [
    path.join(TEST_CONFIG.TEST_DATA_DIR, `avatar-${user.username}.jpg`),
    path.join(TEST_CONFIG.TEST_DATA_DIR, `cover-${user.username}.jpg`),
    path.join(TEST_CONFIG.TEST_DATA_DIR, `export-${user.username}.json`)
  ];
  
  userFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  });
}

// Utility Functions

/**
 * Generate unique identifier
 */
export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`;
}

/**
 * Create checksum for data integrity validation
 */
export function createDataChecksum(data: any): string {
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(dataString).digest('hex');
}

/**
 * Wait with exponential backoff
 */
export async function waitWithBackoff(
  condition: () => Promise<boolean>,
  maxAttempts: number = 10,
  initialDelay: number = 1000
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (await condition()) {
      return;
    }
    
    if (attempt === maxAttempts) {
      throw new Error(`Condition not met after ${maxAttempts} attempts`);
    }
    
    const delay = initialDelay * Math.pow(2, attempt - 1);
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));
  }
}

/**
 * Generate TOTP code for 2FA testing
 */
export function generateTOTPCode(secret: string, timeStep: number = 30): string {
  // Simplified TOTP generation for testing
  // In production, use a proper TOTP library like 'speakeasy'
  const timeCounter = Math.floor(Date.now() / 1000 / timeStep);
  const hash = createHash('sha1').update(secret + timeCounter.toString()).digest('hex');
  const code = parseInt(hash.substring(0, 6), 16) % 1000000;
  return code.toString().padStart(6, '0');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Mock Data Generators

/**
 * Generate mock OAuth response
 */
export function generateMockOAuthResponse(provider: string, userData: any): any {
  const baseResponse = {
    provider,
    id: `mock_${provider}_${Date.now()}`,
    connectedAt: new Date().toISOString()
  };
  
  switch (provider) {
    case 'github':
      return {
        ...baseResponse,
        username: userData.username || 'test-github-user',
        name: userData.name || 'Test GitHub User',
        email: userData.email || 'github@example.com',
        avatar_url: userData.avatar_url || 'https://github.com/avatar/test.jpg',
        public_repos: userData.public_repos || 42,
        followers: userData.followers || 123
      };
      
    case 'linkedin':
      return {
        ...baseResponse,
        firstName: userData.firstName || 'Test',
        lastName: userData.lastName || 'LinkedIn User',
        emailAddress: userData.emailAddress || 'linkedin@example.com',
        headline: userData.headline || 'Software Developer',
        pictureUrl: userData.pictureUrl || 'https://linkedin.com/avatar/test.jpg'
      };
      
    case 'google':
      return {
        ...baseResponse,
        sub: userData.sub || 'test-google-user-123',
        name: userData.name || 'Test Google User',
        email: userData.email || 'google@example.com',
        picture: userData.picture || 'https://google.com/avatar/test.jpg',
        email_verified: true
      };
      
    default:
      return baseResponse;
  }
}

// TEST_CONFIG already exported above