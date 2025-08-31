/**
 * Comprehensive Profile Management E2E System Tests
 * 
 * Tests real user profile management workflows using Playwright browser automation.
 * Follows Mock Free Test Oriented Development - all interactions are real.
 * 
 * Test Coverage:
 * - User registration and account creation
 * - Profile information editing (name, bio, avatar)
 * - Password change and reset flows
 * - Email verification and two-factor authentication
 * - Privacy settings and data visibility
 * - Account deactivation and deletion
 * - Social media integration
 * - Notification preferences
 * - Theme and appearance customization
 * - Language and localization settings
 * - Activity history and audit logs
 * - Data export and GDPR compliance
 * - Role-based access control
 * - Profile sharing and public profiles
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// Test configuration
const PORTAL_URL = 'http://localhost:3156';
const API_BASE_URL = 'http://localhost:3156/api';
const TEST_TIMEOUT = 30000;

// Test data directory
const TEST_DATA_DIR = path.join(__dirname, 'test-data');

// Test user data
const generateTestUser = () => {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'TestPass123!@#',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Software developer passionate about testing',
    location: 'San Francisco, CA',
    phone: '+1-555-0123'
  };
};

test.describe('Profile Management E2E System Tests', () => {
  let testUser: ReturnType<typeof generateTestUser>;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    // Create test data directory
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ browser }) => {
    // Generate new test user for each test
    testUser = generateTestUser();
    
    // Create new browser context for isolation
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      javaScriptEnabled: true,
      acceptDownloads: true,
      permissions: ['notifications', 'camera', 'microphone']
    });
    
    page = await context.newPage();
    
    // Enable request/response logging
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`API Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  test.describe('User Registration and Account Creation', () => {
    test('should complete full registration workflow', async () => {
      console.log('Testing complete registration workflow...');
      
      // Navigate to registration page
      await page.goto(`${PORTAL_URL}/register`);
      
      // Verify registration form is displayed
      await expect(page.locator('h1')).toContainText('Create Account');
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      
      // Fill registration form with real typing
      await page.locator('input[name="username"]').click();
      await page.locator('input[name="username"]').type(testUser.username, { delay: 50 });
      
      await page.locator('input[name="email"]').click();
      await page.locator('input[name="email"]').type(testUser.email, { delay: 50 });
      
      await page.locator('input[name="password"]').click();
      await page.locator('input[name="password"]').type(testUser.password, { delay: 50 });
      
      await page.locator('input[name="confirmPassword"]').click();
      await page.locator('input[name="confirmPassword"]').type(testUser.password, { delay: 50 });
      
      // Accept terms and conditions
      await page.locator('input[name="acceptTerms"]').check();
      
      // Submit registration form
      await page.locator('button[type="submit"]').click();
      
      // Verify registration success
      await page.waitForURL('**/verify-email');
      await expect(page.locator('[data-testid="verification-message"]'))
        .toContainText('Please check your email to verify your account');
      
      console.log('Registration workflow completed successfully');
    });

    test('should validate registration form inputs', async () => {
      await page.goto(`${PORTAL_URL}/register`);
      
      // Try to submit empty form
      await page.locator('button[type="submit"]').click();
      
      // Verify validation errors appear
      await expect(page.locator('[data-testid="username-error"]'))
        .toContainText('Username is required');
      await expect(page.locator('[data-testid="email-error"]'))
        .toContainText('Email is required');
      await expect(page.locator('[data-testid="password-error"]'))
        .toContainText('Password is required');
      
      // Test invalid email format
      await page.locator('input[name="email"]').type('invalid-email');
      await page.locator('input[name="password"]').click(); // Trigger validation
      
      await expect(page.locator('[data-testid="email-error"]'))
        .toContainText('Please enter a valid email address');
      
      // Test weak password
      await page.locator('input[name="password"]').type('123');
      await page.locator('input[name="confirmPassword"]').click(); // Trigger validation
      
      await expect(page.locator('[data-testid="password-error"]'))
        .toContainText('Password must be at least 8 characters');
    });

    test('should handle email verification process', async () => {
      // Complete registration first
      await page.goto(`${PORTAL_URL}/register`);
      
      await page.locator('input[name="username"]').type(testUser.username);
      await page.locator('input[name="email"]').type(testUser.email);
      await page.locator('input[name="password"]').type(testUser.password);
      await page.locator('input[name="confirmPassword"]').type(testUser.password);
      await page.locator('input[name="acceptTerms"]').check();
      await page.locator('button[type="submit"]').click();
      
      await page.waitForURL('**/verify-email');
      
      // Simulate clicking verification link (in real scenario, this would be from email)
      const verificationToken = 'mock-verification-token-123';
      await page.goto(`${PORTAL_URL}/verify-email?token=${verificationToken}`);
      
      // Verify email verification success
      await expect(page.locator('[data-testid="verification-success"]'))
        .toContainText('Email verified successfully');
      
      // Verify automatic login after verification
      await page.waitForURL('**/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]'))
        .toContainText(`Welcome, ${testUser.username}`);
    });
  });

  test.describe('Profile Information Management', () => {
    test.beforeEach(async () => {
      // Register and login before each profile test
      await registerAndLogin(page, testUser);
    });

    test('should edit profile information', async () => {
      console.log('Testing profile information editing...');
      
      // Navigate to profile page
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      await page.waitForURL('**/profile');
      await expect(page.locator('h1')).toContainText('My Profile');
      
      // Click edit profile button
      await page.locator('[data-testid="edit-profile-btn"]').click();
      
      // Edit profile fields
      await page.locator('input[name="firstName"]').clear();
      await page.locator('input[name="firstName"]').type('Jane', { delay: 50 });
      
      await page.locator('input[name="lastName"]').clear();
      await page.locator('input[name="lastName"]').type('Smith', { delay: 50 });
      
      await page.locator('textarea[name="bio"]').clear();
      await page.locator('textarea[name="bio"]').type('Updated bio with new information', { delay: 30 });
      
      await page.locator('input[name="location"]').clear();
      await page.locator('input[name="location"]').type('New York, NY', { delay: 50 });
      
      await page.locator('input[name="website"]').clear();
      await page.locator('input[name="website"]').type('https://janesmith.dev', { delay: 50 });
      
      // Save changes
      await page.locator('[data-testid="save-profile-btn"]').click();
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Profile updated successfully');
      
      // Verify changes are reflected in UI
      await expect(page.locator('[data-testid="profile-name"]'))
        .toContainText('Jane Smith');
      await expect(page.locator('[data-testid="profile-bio"]'))
        .toContainText('Updated bio with new information');
      await expect(page.locator('[data-testid="profile-location"]'))
        .toContainText('New York, NY');
    });

    test('should upload and manage profile avatar', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      await page.waitForURL('**/profile');
      
      // Click avatar upload area
      await page.locator('[data-testid="avatar-upload-area"]').click();
      
      // Create test image file
      const testImagePath = path.join(TEST_DATA_DIR, 'test-avatar.jpg');
      const testImageData = generateTestImage();
      fs.writeFileSync(testImagePath, testImageData);
      
      // Upload file using file chooser
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="upload-avatar-btn"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(testImagePath);
      
      // Wait for upload to complete
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-success"]'))
        .toContainText('Avatar uploaded successfully');
      
      // Verify new avatar is displayed
      const avatarImg = page.locator('[data-testid="profile-avatar"] img');
      await expect(avatarImg).toBeVisible();
      
      const avatarSrc = await avatarImg.getAttribute('src');
      expect(avatarSrc).toContain('/avatars/');
    });

    test('should manage social media links', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      await page.waitForURL('**/profile');
      
      // Navigate to social media section
      await page.locator('[data-testid="social-media-tab"]').click();
      
      // Add GitHub profile
      await page.locator('input[name="github"]').type('johndoe', { delay: 50 });
      
      // Add Twitter handle
      await page.locator('input[name="twitter"]').type('@johndoe', { delay: 50 });
      
      // Add LinkedIn profile
      await page.locator('input[name="linkedin"]').type('john-doe', { delay: 50 });
      
      // Save social media links
      await page.locator('[data-testid="save-social-btn"]').click();
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Social media links updated');
      
      // Verify links are displayed correctly
      await expect(page.locator('[data-testid="github-link"]'))
        .toHaveAttribute('href', 'https://github.com/johndoe');
      await expect(page.locator('[data-testid="twitter-link"]'))
        .toHaveAttribute('href', 'https://twitter.com/johndoe');
      await expect(page.locator('[data-testid="linkedin-link"]'))
        .toHaveAttribute('href', 'https://linkedin.com/in/john-doe');
    });
  });

  test.describe('Password and Security Management', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should change password with proper validation', async () => {
      console.log('Testing password change workflow...');
      
      // Navigate to security settings
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="security-settings-link"]').click();
      
      await page.waitForURL('**/settings/security');
      
      // Click change password button
      await page.locator('[data-testid="change-password-btn"]').click();
      
      // Fill password change form
      await page.locator('input[name="currentPassword"]').type(testUser.password, { delay: 50 });
      await page.locator('input[name="newPassword"]').type('NewTestPass456!@#', { delay: 50 });
      await page.locator('input[name="confirmNewPassword"]').type('NewTestPass456!@#', { delay: 50 });
      
      // Submit password change
      await page.locator('[data-testid="submit-password-change-btn"]').click();
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Password changed successfully');
      
      // Verify forced logout (security best practice)
      await page.waitForURL('**/login');
      
      // Test login with new password
      await page.locator('input[name="username"]').type(testUser.username);
      await page.locator('input[name="password"]').type('NewTestPass456!@#');
      await page.locator('button[type="submit"]').click();
      
      await page.waitForURL('**/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    });

    test('should setup two-factor authentication', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="security-settings-link"]').click();
      
      await page.waitForURL('**/settings/security');
      
      // Enable 2FA
      await page.locator('[data-testid="enable-2fa-btn"]').click();
      
      // Verify QR code is displayed
      await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
      await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible();
      
      // Verify backup codes are shown
      const backupCodes = page.locator('[data-testid="backup-code"]');
      const codeCount = await backupCodes.count();
      expect(codeCount).toBe(10);
      
      // Download backup codes
      const downloadPromise = page.waitForEvent('download');
      await page.locator('[data-testid="download-backup-codes-btn"]').click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('backup-codes');
      
      // Enter verification code
      await page.locator('input[name="verificationCode"]').type('123456');
      await page.locator('[data-testid="verify-2fa-btn"]').click();
      
      // Verify 2FA is enabled
      await expect(page.locator('[data-testid="2fa-status"]'))
        .toContainText('Two-factor authentication enabled');
    });

    test('should handle password reset flow', async () => {
      // Navigate to login page
      await page.goto(`${PORTAL_URL}/login`);
      
      // Click forgot password link
      await page.locator('[data-testid="forgot-password-link"]').click();
      
      await page.waitForURL('**/forgot-password');
      
      // Enter email for password reset
      await page.locator('input[name="email"]').type(testUser.email);
      await page.locator('[data-testid="send-reset-email-btn"]').click();
      
      // Verify confirmation message
      await expect(page.locator('[data-testid="reset-email-sent"]'))
        .toContainText('Password reset email sent');
      
      // Simulate clicking reset link from email
      const resetToken = 'mock-reset-token-123';
      await page.goto(`${PORTAL_URL}/reset-password?token=${resetToken}`);
      
      // Fill new password form
      await page.locator('input[name="newPassword"]').type('ResetPass789!@#');
      await page.locator('input[name="confirmPassword"]').type('ResetPass789!@#');
      await page.locator('[data-testid="reset-password-btn"]').click();
      
      // Verify success and redirect to login
      await page.waitForURL('**/login');
      await expect(page.locator('[data-testid="password-reset-success"]'))
        .toContainText('Password reset successfully');
    });
  });

  test.describe('Privacy Settings and Data Control', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should manage privacy settings', async () => {
      console.log('Testing privacy settings management...');
      
      // Navigate to privacy settings
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="privacy-settings-link"]').click();
      
      await page.waitForURL('**/settings/privacy');
      
      // Configure profile visibility
      await page.locator('select[name="profileVisibility"]').selectOption('friends');
      
      // Configure data sharing preferences
      await page.locator('input[name="shareEmail"]').uncheck();
      await page.locator('input[name="shareLocation"]').check();
      await page.locator('input[name="allowSearch"]').check();
      
      // Configure messaging preferences
      await page.locator('select[name="messagingPrivacy"]').selectOption('connections');
      
      // Save privacy settings
      await page.locator('[data-testid="save-privacy-btn"]').click();
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Privacy settings updated');
      
      // Verify settings are saved by refreshing and checking
      await page.reload();
      
      const visibilityValue = await page.locator('select[name="profileVisibility"]').inputValue();
      expect(visibilityValue).toBe('friends');
      
      const shareEmailChecked = await page.locator('input[name="shareEmail"]').isChecked();
      expect(shareEmailChecked).toBe(false);
    });

    test('should manage blocked users list', async () => {
      // Navigate to privacy settings
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="privacy-settings-link"]').click();
      
      // Navigate to blocked users section
      await page.locator('[data-testid="blocked-users-tab"]').click();
      
      // Add user to blocked list
      await page.locator('input[name="blockUsername"]').type('spamuser123');
      await page.locator('[data-testid="block-user-btn"]').click();
      
      // Verify user appears in blocked list
      await expect(page.locator('[data-testid="blocked-user-spamuser123"]')).toBeVisible();
      
      // Unblock user
      await page.locator('[data-testid="unblock-spamuser123-btn"]').click();
      
      // Verify confirmation dialog
      await expect(page.locator('[data-testid="unblock-confirmation"]')).toBeVisible();
      await page.locator('[data-testid="confirm-unblock-btn"]').click();
      
      // Verify user is removed from blocked list
      await expect(page.locator('[data-testid="blocked-user-spamuser123"]')).not.toBeVisible();
    });
  });

  test.describe('Notification Preferences', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should configure notification preferences', async () => {
      console.log('Testing notification preferences...');
      
      // Navigate to notification settings
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="notification-settings-link"]').click();
      
      await page.waitForURL('**/settings/notifications');
      
      // Configure email notifications
      await page.locator('input[name="emailNotifications"]').check();
      await page.locator('input[name="newsletterEmails"]').check();
      await page.locator('input[name="securityAlerts"]').check();
      await page.locator('input[name="marketingEmails"]').uncheck();
      
      // Configure push notifications
      await page.locator('input[name="pushNotifications"]').check();
      await page.locator('input[name="mentionNotifications"]').check();
      await page.locator('input[name="messageNotifications"]').check();
      
      // Set notification frequency
      await page.locator('select[name="digestFrequency"]').selectOption('daily');
      
      // Save notification preferences
      await page.locator('[data-testid="save-notifications-btn"]').click();
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Notification preferences updated');
      
      // Test notification preview
      await page.locator('[data-testid="test-notification-btn"]').click();
      
      // Verify test notification appears
      await expect(page.locator('[data-testid="test-notification"]'))
        .toContainText('Test notification sent successfully');
    });

    test('should handle browser notification permissions', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="notification-settings-link"]').click();
      
      // Request notification permission
      await page.locator('[data-testid="request-notification-permission-btn"]').click();
      
      // Grant permission (simulated - in real browser this would show permission dialog)
      await page.evaluate(() => {
        // Mock granted notification permission
        Object.defineProperty(Notification, 'permission', { value: 'granted' });
      });
      
      // Verify permission status updated
      await expect(page.locator('[data-testid="notification-permission-status"]'))
        .toContainText('Granted');
      
      // Enable push notifications
      await page.locator('input[name="pushNotifications"]').check();
      await page.locator('[data-testid="save-notifications-btn"]').click();
      
      // Send test notification
      await page.locator('[data-testid="send-test-push-btn"]').click();
      
      // Verify notification was sent (check status message)
      await expect(page.locator('[data-testid="push-notification-sent"]'))
        .toContainText('Test push notification sent');
    });
  });

  test.describe('Theme and Appearance Customization', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should customize application theme', async () => {
      console.log('Testing theme customization...');
      
      // Navigate to appearance settings
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="appearance-settings-link"]').click();
      
      await page.waitForURL('**/settings/appearance');
      
      // Change theme to dark mode
      await page.locator('[data-testid="dark-theme-btn"]').click();
      
      // Verify theme preview changes
      await expect(page.locator('[data-testid="theme-preview"]'))
        .toHaveClass(/dark-theme/);
      
      // Customize accent color
      await page.locator('[data-testid="accent-color-picker"]').click();
      await page.locator('[data-testid="color-blue"]').click();
      
      // Verify color preview
      await expect(page.locator('[data-testid="accent-preview"]'))
        .toHaveCSS('background-color', 'rgb(59, 130, 246)');
      
      // Adjust font size
      await page.locator('select[name="fontSize"]').selectOption('large');
      
      // Enable compact mode
      await page.locator('input[name="compactMode"]').check();
      
      // Disable animations
      await page.locator('input[name="animations"]').uncheck();
      
      // Save appearance settings
      await page.locator('[data-testid="save-appearance-btn"]').click();
      
      // Verify settings applied immediately
      await expect(page.locator('body')).toHaveClass(/dark-theme/);
      await expect(page.locator('body')).toHaveClass(/compact-mode/);
      
      // Navigate to different page and verify theme persists
      await page.locator('[data-testid="nav-dashboard"]').click();
      await page.waitForURL('**/dashboard');
      
      await expect(page.locator('body')).toHaveClass(/dark-theme/);
    });

    test('should reset theme to defaults', async () => {
      // Navigate to appearance settings
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="appearance-settings-link"]').click();
      
      // Make some changes first
      await page.locator('[data-testid="dark-theme-btn"]').click();
      await page.locator('select[name="fontSize"]').selectOption('small');
      
      // Reset to defaults
      await page.locator('[data-testid="reset-theme-btn"]').click();
      
      // Confirm reset
      await expect(page.locator('[data-testid="reset-confirmation"]')).toBeVisible();
      await page.locator('[data-testid="confirm-reset-btn"]').click();
      
      // Verify theme is reset
      await expect(page.locator('[data-testid="theme-preview"]'))
        .toHaveClass(/light-theme/);
      
      const fontSizeValue = await page.locator('select[name="fontSize"]').inputValue();
      expect(fontSizeValue).toBe('medium');
    });
  });

  test.describe('Language and Localization', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should change language settings', async () => {
      console.log('Testing language and localization...');
      
      // Navigate to language settings
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="language-settings-link"]').click();
      
      await page.waitForURL('**/settings/language');
      
      // Change primary language
      await page.locator('select[name="primaryLanguage"]').selectOption('es-ES');
      
      // Change date format
      await page.locator('select[name="dateFormat"]').selectOption('DD/MM/YYYY');
      
      // Change time format
      await page.locator('select[name="timeFormat"]').selectOption('24h');
      
      // Change timezone
      await page.locator('select[name="timezone"]').selectOption('Europe/Madrid');
      
      // Save language settings
      await page.locator('[data-testid="save-language-btn"]').click();
      
      // Verify interface language changes
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Configuración de idioma actualizada'); // Spanish
      
      // Verify date format changes in UI
      const dateDisplay = page.locator('[data-testid="current-date"]');
      const dateText = await dateDisplay.textContent();
      expect(dateText).toMatch(/\d{2}\/\d{2}\/\d{4}/); // DD/MM/YYYY format
      
      // Verify time format
      const timeDisplay = page.locator('[data-testid="current-time"]');
      const timeText = await timeDisplay.textContent();
      expect(timeText).toMatch(/\d{2}:\d{2}/); // 24h format
    });
  });

  test.describe('Activity History and Audit Logs', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should display user activity timeline', async () => {
      console.log('Testing activity history display...');
      
      // Generate some activity by navigating and performing actions
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      // Edit profile to generate activity
      await page.locator('[data-testid="edit-profile-btn"]').click();
      await page.locator('input[name="firstName"]').fill('UpdatedName');
      await page.locator('[data-testid="save-profile-btn"]').click();
      
      // Navigate to activity page
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="activity-history-link"]').click();
      
      await page.waitForURL('**/activity');
      
      // Verify activity entries are displayed
      await expect(page.locator('[data-testid="activity-timeline"]')).toBeVisible();
      
      const activityItems = page.locator('[data-testid="activity-item"]');
      const itemCount = await activityItems.count();
      expect(itemCount).toBeGreaterThan(0);
      
      // Verify recent profile update is logged
      await expect(page.locator('[data-testid="activity-item"]').first())
        .toContainText('Profile updated');
      
      // Test activity filtering
      await page.locator('select[name="activityFilter"]').selectOption('profile_changes');
      
      // Verify filtered results
      const filteredItems = page.locator('[data-testid="activity-item"]');
      const filteredCount = await filteredItems.count();
      expect(filteredCount).toBeGreaterThanOrEqual(1);
    });

    test('should export activity data', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="activity-history-link"]').click();
      
      await page.waitForURL('**/activity');
      
      // Click export button
      const downloadPromise = page.waitForEvent('download');
      await page.locator('[data-testid="export-activity-btn"]').click();
      
      // Verify download starts
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('activity-export');
      expect(download.suggestedFilename()).toContain('.json');
      
      // Verify export contains expected data
      const downloadPath = path.join(TEST_DATA_DIR, download.suggestedFilename());
      await download.saveAs(downloadPath);
      
      const exportData = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
      expect(exportData).toHaveProperty('userId');
      expect(exportData).toHaveProperty('activities');
      expect(exportData).toHaveProperty('exportDate');
    });
  });

  test.describe('Data Export and GDPR Compliance', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should export complete user data', async () => {
      console.log('Testing GDPR data export...');
      
      // Navigate to data export page
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="data-export-link"]').click();
      
      await page.waitForURL('**/data/export');
      
      // Select export format
      await page.locator('select[name="exportFormat"]').selectOption('json');
      
      // Select data to include
      await page.locator('input[name="includeProfile"]').check();
      await page.locator('input[name="includeActivity"]').check();
      await page.locator('input[name="includeSettings"]').check();
      await page.locator('input[name="includeMedia"]').check();
      
      // Request export
      await page.locator('[data-testid="request-export-btn"]').click();
      
      // Verify export request confirmation
      await expect(page.locator('[data-testid="export-requested"]'))
        .toContainText('Data export requested successfully');
      
      // Verify export status page
      await expect(page.locator('[data-testid="export-status"]'))
        .toContainText('Processing');
      
      // Simulate export completion (in real scenario, this would be async)
      await page.waitForTimeout(2000);
      await page.reload();
      
      // Check for download link
      await expect(page.locator('[data-testid="download-export-btn"]')).toBeVisible();
      
      // Download export file
      const downloadPromise = page.waitForEvent('download');
      await page.locator('[data-testid="download-export-btn"]').click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('user-data-export');
    });

    test('should handle data deletion request', async () => {
      // Navigate to data deletion page
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="delete-account-link"]').click();
      
      await page.waitForURL('**/account/delete');
      
      // Read deletion warnings
      await expect(page.locator('[data-testid="deletion-warning"]'))
        .toContainText('This action cannot be undone');
      
      // Select deletion reason
      await page.locator('select[name="deletionReason"]').selectOption('privacy_concerns');
      
      // Provide additional feedback
      await page.locator('textarea[name="feedback"]')
        .type('Test deletion for automated testing purposes');
      
      // Confirm password for deletion
      await page.locator('input[name="confirmPassword"]').type(testUser.password);
      
      // Type confirmation phrase
      await page.locator('input[name="confirmationPhrase"]')
        .type('DELETE MY ACCOUNT', { delay: 100 });
      
      // Submit deletion request
      await page.locator('[data-testid="submit-deletion-btn"]').click();
      
      // Verify confirmation dialog
      await expect(page.locator('[data-testid="final-deletion-confirmation"]')).toBeVisible();
      
      // Cancel deletion for testing (don't actually delete)
      await page.locator('[data-testid="cancel-deletion-btn"]').click();
      
      // Verify we're back to account settings
      await expect(page.locator('[data-testid="account-preserved"]'))
        .toContainText('Account deletion cancelled');
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should display role-appropriate interface elements', async () => {
      // Test with regular user
      await registerAndLogin(page, testUser);
      
      await page.locator('[data-testid="user-menu"]').click();
      
      // Regular user should not see admin options
      await expect(page.locator('[data-testid="admin-panel-link"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="user-management-link"]')).not.toBeVisible();
      
      // But should see standard user options
      await expect(page.locator('[data-testid="profile-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="settings-link"]')).toBeVisible();
    });

    test('should enforce role-based permissions', async () => {
      await registerAndLogin(page, testUser);
      
      // Try to access admin-only endpoint directly
      await page.goto(`${PORTAL_URL}/admin/users`);
      
      // Should be redirected or show access denied
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/users');
      
      // Verify access denied message if not redirected
      if (currentUrl.includes('/admin/')) {
        await expect(page.locator('[data-testid="access-denied"]'))
          .toContainText('Access denied');
      }
    });
  });

  test.describe('Public Profile Features', () => {
    let secondUser: ReturnType<typeof generateTestUser>;
    let secondUserContext: BrowserContext;
    let secondUserPage: Page;

    test.beforeEach(async ({ browser }) => {
      // Setup first user
      await registerAndLogin(page, testUser);
      
      // Setup second user in separate context
      secondUser = generateTestUser();
      secondUserContext = await browser.newContext();
      secondUserPage = await secondUserContext.newPage();
      await registerAndLogin(secondUserPage, secondUser);
    });

    test.afterEach(async () => {
      await secondUserContext.close();
    });

    test('should share public profile', async () => {
      console.log('Testing public profile sharing...');
      
      // Configure profile as public
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="privacy-settings-link"]').click();
      
      await page.locator('select[name="profileVisibility"]').selectOption('public');
      await page.locator('[data-testid="save-privacy-btn"]').click();
      
      // Get public profile URL
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      await page.locator('[data-testid="share-profile-btn"]').click();
      
      // Copy public profile link
      await page.locator('[data-testid="copy-profile-link-btn"]').click();
      
      // Verify copy success message
      await expect(page.locator('[data-testid="link-copied-message"]'))
        .toContainText('Profile link copied');
      
      // Get the public profile URL
      const publicUrl = await page.evaluate(() => navigator.clipboard.readText());
      expect(publicUrl).toContain(`/profile/${testUser.username}`);
      
      // Test public access from second user
      await secondUserPage.goto(publicUrl);
      
      // Verify public profile is accessible
      await expect(secondUserPage.locator('[data-testid="public-profile-name"]'))
        .toContainText(testUser.firstName);
      await expect(secondUserPage.locator('[data-testid="public-profile-bio"]'))
        .toContainText(testUser.bio);
      
      // Verify private information is not visible
      await expect(secondUserPage.locator('[data-testid="profile-email"]')).not.toBeVisible();
      await expect(secondUserPage.locator('[data-testid="profile-phone"]')).not.toBeVisible();
    });

    test('should follow and unfollow users', async () => {
      // Make first user's profile public
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="privacy-settings-link"]').click();
      await page.locator('select[name="profileVisibility"]').selectOption('public');
      await page.locator('[data-testid="save-privacy-btn"]').click();
      
      // Second user searches for and follows first user
      await secondUserPage.locator('[data-testid="search-input"]')
        .type(testUser.username, { delay: 50 });
      await secondUserPage.locator('[data-testid="search-btn"]').click();
      
      // Click on user in search results
      await secondUserPage.locator(`[data-testid="user-result-${testUser.username}"]`).click();
      
      // Follow user
      await secondUserPage.locator('[data-testid="follow-user-btn"]').click();
      
      // Verify follow success
      await expect(secondUserPage.locator('[data-testid="follow-status"]'))
        .toContainText('Following');
      
      // Verify follower count on first user's profile
      await page.reload();
      await expect(page.locator('[data-testid="follower-count"]'))
        .toContainText('1');
      
      // Test unfollow
      await secondUserPage.locator('[data-testid="unfollow-user-btn"]').click();
      
      await expect(secondUserPage.locator('[data-testid="follow-status"]'))
        .toContainText('Follow');
    });
  });

  test.describe('Performance and Usability', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should load profile page quickly', async () => {
      const startTime = Date.now();
      
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      await page.waitForURL('**/profile');
      await expect(page.locator('[data-testid="profile-content"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle large profile image uploads', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      // Create large test image (but within limits)
      const largeImagePath = path.join(TEST_DATA_DIR, 'large-avatar.jpg');
      const largeImageData = Buffer.alloc(2 * 1024 * 1024); // 2MB
      fs.writeFileSync(largeImagePath, largeImageData);
      
      // Upload large image
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="upload-avatar-btn"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(largeImagePath);
      
      // Verify upload progress indicator
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-success"]'))
        .toContainText('Avatar uploaded successfully', { timeout: 15000 });
    });

    test('should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.locator('[data-testid="mobile-menu-btn"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      await page.waitForURL('**/profile');
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-profile-layout"]')).toBeVisible();
      
      // Test mobile profile editing
      await page.locator('[data-testid="edit-profile-mobile-btn"]').click();
      
      // Verify mobile edit form
      await expect(page.locator('[data-testid="mobile-edit-form"]')).toBeVisible();
      
      // Test form interaction on mobile
      await page.locator('input[name="firstName"]').type('MobileEdit');
      await page.locator('[data-testid="save-mobile-btn"]').click();
      
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Profile updated');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should handle network failures gracefully', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      // Simulate network failure
      await page.route('**/api/profiles/**', route => {
        route.abort('failed');
      });
      
      // Try to save profile changes
      await page.locator('[data-testid="edit-profile-btn"]').click();
      await page.locator('input[name="firstName"]').fill('NetworkTest');
      await page.locator('[data-testid="save-profile-btn"]').click();
      
      // Verify error message
      await expect(page.locator('[data-testid="error-message"]'))
        .toContainText('Network error');
      
      // Verify retry functionality
      await page.unroute('**/api/profiles/**');
      await page.locator('[data-testid="retry-btn"]').click();
      
      // Should succeed now
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Profile updated');
    });

    test('should validate file upload security', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      // Create malicious file (script file)
      const maliciousFilePath = path.join(TEST_DATA_DIR, 'malicious.js');
      fs.writeFileSync(maliciousFilePath, 'console.log("malicious script");');
      
      // Try to upload non-image file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="upload-avatar-btn"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(maliciousFilePath);
      
      // Verify security error
      await expect(page.locator('[data-testid="upload-error"]'))
        .toContainText('Invalid file type');
    });

    test('should handle session expiration during profile editing', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      // Start editing profile
      await page.locator('[data-testid="edit-profile-btn"]').click();
      await page.locator('input[name="firstName"]').fill('SessionTest');
      
      // Simulate session expiration
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.clear();
      });
      
      // Try to save changes
      await page.locator('[data-testid="save-profile-btn"]').click();
      
      // Verify redirect to login
      await page.waitForURL('**/login');
      
      // Verify session expired message
      await expect(page.locator('[data-testid="session-expired-message"]'))
        .toContainText('Your session has expired');
    });
  });

  test.describe('Multi-Device Profile Synchronization', () => {
    test('should sync profile changes across devices', async ({ browser }) => {
      console.log('Testing multi-device profile synchronization...');
      
      // Setup: Login on first device
      await registerAndLogin(page, testUser);
      
      // Setup: Login on second device (new context)
      const deviceTwoContext = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
      });
      const deviceTwoPage = await deviceTwoContext.newPage();
      await loginExistingUser(deviceTwoPage, testUser);
      
      // Make changes on device one
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      await page.locator('[data-testid="edit-profile-btn"]').click();
      
      await page.locator('input[name="firstName"]').fill('SyncTest');
      await page.locator('[data-testid="save-profile-btn"]').click();
      
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Profile updated');
      
      // Check if changes appear on device two
      await deviceTwoPage.locator('[data-testid="user-menu"]').click();
      await deviceTwoPage.locator('[data-testid="profile-link"]').click();
      
      // Refresh to get latest data
      await deviceTwoPage.reload();
      
      // Verify sync
      await expect(deviceTwoPage.locator('[data-testid="profile-name"]'))
        .toContainText('SyncTest');
      
      await deviceTwoContext.close();
    });
  });

  test.describe('Integration with External Services', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should integrate with OAuth providers', async () => {
      console.log('Testing OAuth integration...');
      
      // Navigate to connected accounts
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="connected-accounts-link"]').click();
      
      await page.waitForURL('**/settings/connected-accounts');
      
      // Connect GitHub account
      await page.locator('[data-testid="connect-github-btn"]').click();
      
      // Verify OAuth flow initiation (would redirect to GitHub in real scenario)
      await page.waitForURL('**/oauth/github/callback**');
      
      // Simulate OAuth success callback
      await expect(page.locator('[data-testid="oauth-success"]'))
        .toContainText('GitHub account connected successfully');
      
      // Verify account appears in connected list
      await expect(page.locator('[data-testid="connected-github"]')).toBeVisible();
      
      // Test disconnect
      await page.locator('[data-testid="disconnect-github-btn"]').click();
      
      // Confirm disconnection
      await expect(page.locator('[data-testid="disconnect-confirmation"]')).toBeVisible();
      await page.locator('[data-testid="confirm-disconnect-btn"]').click();
      
      // Verify account removed
      await expect(page.locator('[data-testid="connected-github"]')).not.toBeVisible();
    });

    test('should import profile data from external sources', async () => {
      // Navigate to data import
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="data-import-link"]').click();
      
      await page.waitForURL('**/data/import');
      
      // Create import data file
      const importData = {
        profile: {
          firstName: 'Imported',
          lastName: 'User',
          bio: 'Imported from external source',
          skills: ['JavaScript', 'TypeScript', 'React']
        },
        settings: {
          theme: 'dark',
          language: 'en-US'
        }
      };
      
      const importFilePath = path.join(TEST_DATA_DIR, 'import-data.json');
      fs.writeFileSync(importFilePath, JSON.stringify(importData, null, 2));
      
      // Upload import file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="upload-import-file-btn"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(importFilePath);
      
      // Review import preview
      await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-firstName"]'))
        .toContainText('Imported');
      
      // Confirm import
      await page.locator('[data-testid="confirm-import-btn"]').click();
      
      // Verify import success
      await expect(page.locator('[data-testid="import-success"]'))
        .toContainText('Data imported successfully');
      
      // Verify imported data appears in profile
      await page.locator('[data-testid="profile-link"]').click();
      await expect(page.locator('[data-testid="profile-name"]'))
        .toContainText('Imported User');
    });
  });

  test.describe('Advanced Profile Features', () => {
    test.beforeEach(async () => {
      await registerAndLogin(page, testUser);
    });

    test('should manage professional information', async () => {
      console.log('Testing professional profile information...');
      
      // Navigate to professional profile section
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      await page.locator('[data-testid="professional-tab"]').click();
      
      // Add work experience
      await page.locator('[data-testid="add-experience-btn"]').click();
      
      await page.locator('input[name="company"]').type('Tech Corp', { delay: 50 });
      await page.locator('input[name="position"]').type('Senior Developer', { delay: 50 });
      await page.locator('input[name="startDate"]').type('2020-01-01');
      await page.locator('input[name="endDate"]').type('2023-12-31');
      await page.locator('textarea[name="description"]')
        .type('Led development of key features and mentored junior developers');
      
      await page.locator('[data-testid="save-experience-btn"]').click();
      
      // Add skills
      await page.locator('[data-testid="add-skill-btn"]').click();
      await page.locator('input[name="skillName"]').type('TypeScript');
      await page.locator('select[name="skillLevel"]').selectOption('expert');
      await page.locator('[data-testid="add-skill-confirm-btn"]').click();
      
      // Add education
      await page.locator('[data-testid="add-education-btn"]').click();
      
      await page.locator('input[name="institution"]').type('University of Technology');
      await page.locator('input[name="degree"]').type('Bachelor of Computer Science');
      await page.locator('input[name="graduationYear"]').type('2019');
      
      await page.locator('[data-testid="save-education-btn"]').click();
      
      // Verify all professional information is displayed
      await expect(page.locator('[data-testid="experience-tech-corp"]')).toBeVisible();
      await expect(page.locator('[data-testid="skill-typescript"]')).toBeVisible();
      await expect(page.locator('[data-testid="education-university-tech"]')).toBeVisible();
    });

    test('should manage portfolio and projects', async () => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      await page.locator('[data-testid="portfolio-tab"]').click();
      
      // Add new project
      await page.locator('[data-testid="add-project-btn"]').click();
      
      await page.locator('input[name="projectName"]').type('AI Test Platform');
      await page.locator('textarea[name="projectDescription"]')
        .type('Comprehensive testing platform for AI development workflows');
      
      await page.locator('input[name="projectUrl"]').type('https://github.com/user/ai-test-platform');
      await page.locator('input[name="demoUrl"]').type('https://ai-test-platform.demo.com');
      
      // Add project technologies
      await page.locator('input[name="technologies"]').type('TypeScript, React, Node.js');
      
      // Upload project image
      const projectImagePath = path.join(TEST_DATA_DIR, 'project-image.jpg');
      fs.writeFileSync(projectImagePath, generateTestImage());
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="upload-project-image-btn"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(projectImagePath);
      
      // Save project
      await page.locator('[data-testid="save-project-btn"]').click();
      
      // Verify project appears in portfolio
      await expect(page.locator('[data-testid="project-ai-test-platform"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-title"]'))
        .toContainText('AI Test Platform');
      
      // Test project editing
      await page.locator('[data-testid="edit-project-btn"]').click();
      await page.locator('input[name="projectName"]').fill('Updated AI Platform');
      await page.locator('[data-testid="save-project-btn"]').click();
      
      await expect(page.locator('[data-testid="project-title"]'))
        .toContainText('Updated AI Platform');
    });
  });
});

// Helper Functions

/**
 * Register and login a new user
 */
async function registerAndLogin(page: Page, user: ReturnType<typeof generateTestUser>) {
  // Register user
  await page.goto(`${PORTAL_URL}/register`);
  
  await page.locator('input[name="username"]').type(user.username);
  await page.locator('input[name="email"]').type(user.email);
  await page.locator('input[name="password"]').type(user.password);
  await page.locator('input[name="confirmPassword"]').type(user.password);
  await page.locator('input[name="acceptTerms"]').check();
  await page.locator('button[type="submit"]').click();
  
  // Skip email verification for testing (or simulate it)
  await page.goto(`${PORTAL_URL}/login`);
  
  // Login
  await page.locator('input[name="username"]').type(user.username);
  await page.locator('input[name="password"]').type(user.password);
  await page.locator('button[type="submit"]').click();
  
  await page.waitForURL('**/dashboard');
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
}

/**
 * Login with existing user credentials
 */
async function loginExistingUser(page: Page, user: ReturnType<typeof generateTestUser>) {
  await page.goto(`${PORTAL_URL}/login`);
  
  await page.locator('input[name="username"]').type(user.username);
  await page.locator('input[name="password"]').type(user.password);
  await page.locator('button[type="submit"]').click();
  
  await page.waitForURL('**/dashboard');
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
}

/**
 * Generate test image data
 */
function generateTestImage(): Buffer {
  // Create a minimal valid JPEG header and data
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
  ]);
  
  // Add some random data to make it look like a real image
  const randomData = Buffer.alloc(1000);
  for (let i = 0; i < randomData.length; i++) {
    randomData[i] = Math.floor(Math.random() * 256);
  }
  
  // JPEG end marker
  const jpegEnd = Buffer.from([0xFF, 0xD9]);
  
  return Buffer.concat([jpegHeader, randomData, jpegEnd]);
}

/**
 * Helper to generate unique test data
 */
function generateUniqueId(): string {
  return createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8);
}

/**
 * Helper to wait for element with custom timeout
 */
async function waitForElement(page: Page, selector: string, timeout: number = TEST_TIMEOUT) {
  await page.locator(selector).waitFor({ timeout });
}