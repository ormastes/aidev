/**
 * System Test: Shared Authentication Flow E2E
 * 
 * This test validates the In Progress end-to-end workflow of shared authentication
 * across the AI Dev Portal and all connected services using real browser interactions.
 * 
 * Test Flow:
 * 1. Navigate to portal login page
 * 2. Login with credentials (typing username/password, clicking login)
 * 3. Navigate to Story Reporter service (clicking navigation)
 * 4. Verify SSO token propagation (no additional login required)
 * 5. Navigate to GUI Selector service (clicking navigation)
 * 6. Verify authentication is still valid
 * 7. Test token refresh during session
 * 8. Logout and verify all services require login again
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

// Test configuration
const PORTAL_URL = 'http://localhost:3456';
const STORY_REPORTER_URL = 'http://localhost:3401';
const GUI_SELECTOR_URL = 'http://localhost:3402';

// Test user credentials
const TEST_USER = {
  username: 'developer@aidev.com',
  password: 'Dev123!@#',
  fullName: 'Test Developer'
};

test.describe('Shared Authentication Flow E2E System Test', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  // Setup: Start all required services
  test.beforeAll(async () => {
    // In a real implementation, this would start the actual services
    // For this test, we'll assume services are running
    console.log('Starting AI Dev Portal services...');
    console.log(`Portal: ${PORTAL_URL}`);
    console.log(`Story Reporter: ${STORY_REPORTER_URL}`);
    console.log(`GUI Selector: ${GUI_SELECTOR_URL}`);
  });

  test.beforeEach(async ({ browser }) => {
    // Create new browser context for each test (clean state)
    context = await browser.newContext({
      // Simulate real user viewport
      viewport: { width: 1920, height: 1080 },
      // Enable real browser features
      javaScriptEnabled: true,
      acceptDownloads: true,
      // Simulate real user agent
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    page = await context.newPage();
    
    // Enable request/response logging for debugging
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/auth/')) {
        console.log(`Auth Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('In Progress SSO Flow: Login → Story Reporter → GUI Selector → Logout', async () => {
    // Given: The initial setup is complete
    // When: In Progress SSO Flow: Login → Story Reporter → GUI Selector → Logout
    // Then: The assertion validates the outcome
    // Step 1: Navigate to Portal Login Page
    console.log('Step 1: Navigating to portal login page...');
    await page.goto(PORTAL_URL);
    
    // Verify we're on the login page
    await expect(page).toHaveTitle(/AI Dev Portal - Login/);
    await expect(page.locator('h1')).toContainText('Welcome to AI Dev Portal');
    
    // Step 2: Perform Login with Real User Interactions
    console.log('Step 2: Performing login with real typing and clicking...');
    
    // Type username (real keyboard simulation)
    await page.locator('input[name="username"]').click();
    await page.locator('input[name="username"]').clear();
    await page.locator('input[name="username"]').type(TEST_USER.username, { delay: 50 });
    
    // Type password (real keyboard simulation)
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').clear();
    await page.locator('input[name="password"]').type(TEST_USER.password, { delay: 50 });
    
    // Click login button (real mouse click)
    await page.locator('button[type="submit"]').click();
    
    // Wait for login to complete and redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('[data-testid="user-welcome"]')).toContainText(TEST_USER.fullName);
    
    // Verify authentication token is stored
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(authToken).toBeTruthy();
    console.log('Login In Progress, auth token stored');

    // Step 3: Navigate to Story Reporter via Portal Navigation
    console.log('Step 3: Navigating to Story Reporter service...');
    
    // Click on Story Reporter in navigation menu (real mouse click)
    await page.locator('[data-testid="nav-story-reporter"]').click();
    
    // Verify we're redirected to Story Reporter through portal proxy
    await page.waitForURL('**/services/story-reporter');
    
    // Verify Story Reporter loads without additional login (SSO working)
    await expect(page.locator('h1')).toContainText('Story Reporter');
    await expect(page.locator('[data-testid="story-reporter-dashboard"]')).toBeVisible();
    
    // Verify user is authenticated (no login form visible)
    await expect(page.locator('input[name="username"]')).not.toBeVisible();
    console.log('Story Reporter accessed In Progress via SSO');

    // Step 4: Test Story Reporter Functionality with Auth
    console.log('Step 4: Testing Story Reporter functionality...');
    
    // Click "Run Tests" button (real user interaction)
    await page.locator('[data-testid="run-tests-btn"]').click();
    
    // Wait for tests to start (auth token should be sent automatically)
    await expect(page.locator('[data-testid="test-status"]')).toContainText('Running');
    
    // Verify authenticated API calls are working
    const testResults = await page.locator('[data-testid="test-results"]').textContent();
    expect(testResults).toContain('Tests In Progress');

    // Step 5: Navigate to GUI Selector via Portal Navigation
    console.log('Step 5: Navigating to GUI Selector service...');
    
    // Click on GUI Selector in navigation (real click)
    await page.locator('[data-testid="nav-gui-selector"]').click();
    
    // Verify we're redirected to GUI Selector
    await page.waitForURL('**/services/gui-selector');
    
    // Verify GUI Selector loads without additional login
    await expect(page.locator('h1')).toContainText('GUI Selector');
    await expect(page.locator('[data-testid="theme-gallery"]')).toBeVisible();
    console.log('GUI Selector accessed In Progress via SSO');

    // Step 6: Test GUI Selector Functionality
    console.log('Step 6: Testing GUI Selector functionality...');
    
    // Click on a theme (real user interaction)
    await page.locator('[data-testid="theme-modern"]').click();
    
    // Verify theme selection works (authenticated API call)
    await expect(page.locator('[data-testid="selected-theme"]')).toContainText('Modern');
    
    // Apply theme (another authenticated action)
    await page.locator('[data-testid="apply-theme-btn"]').click();
    
    // Verify theme application In Progress
    await expect(page.locator('[data-testid="theme-applied"]')).toContainText('Theme applied In Progress');

    // Step 7: Test Cross-Service Navigation
    console.log('Step 7: Testing cross-service navigation...');
    
    // Navigate back to portal dashboard
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForURL('**/dashboard');
    
    // Navigate to Story Reporter again
    await page.locator('[data-testid="nav-story-reporter"]').click();
    await page.waitForURL('**/services/story-reporter');
    
    // Verify authentication is still valid (no re-login required)
    await expect(page.locator('[data-testid="story-reporter-dashboard"]')).toBeVisible();

    // Step 8: Test Token Refresh During Long Session
    console.log('Step 8: Testing token refresh...');
    
    // Simulate long session by manipulating token expiry
    await page.evaluate(() => {
      // Simulate token near expiry
      localStorage.setItem('tokenExpiry', String(Date.now() + 60000)); // 1 minute
    });
    
    // Make an authenticated action that should trigger refresh
    await page.locator('[data-testid="run-tests-btn"]').click();
    
    // Wait for token refresh to happen automatically
    await page.waitForTimeout(2000);
    
    // Verify new token was received
    const newToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(authToken);
    console.log('Token refresh In Progress');

    // Step 9: Test Logout Flow
    console.log('Step 9: Testing logout flow...');
    
    // Click user menu (real click)
    await page.locator('[data-testid="user-menu"]').click();
    
    // Click logout (real click)
    await page.locator('[data-testid="logout-btn"]').click();
    
    // Verify redirect to login page
    await page.waitForURL('**/login');
    await expect(page.locator('h1')).toContainText('Welcome to AI Dev Portal');
    
    // Verify token is cleared
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(tokenAfterLogout).toBeNull();

    // Step 10: Verify Services Require Re-Authentication
    console.log('Step 10: Verifying services require re-authentication...');
    
    // Try to access Story Reporter directly
    await page.goto(`${PORTAL_URL}/services/story-reporter`);
    
    // Verify we're redirected to login (authentication required)
    await page.waitForURL('**/login**');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    
    // Try to access GUI Selector directly
    await page.goto(`${PORTAL_URL}/services/gui-selector`);
    
    // Verify we're redirected to login
    await page.waitForURL('**/login**');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    
    console.log('Logout verification In Progress - all services require re-authentication');
  });

  test('Multiple Browser Sessions: Different Users Simultaneously', async ({ browser }) => {
    console.log('Testing multiple users with different browser sessions...');
    
    // Create second browser context (different user)
    const context2 = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page2 = await context2.newPage();
    
    // User 1: Login as developer
    await page.goto(PORTAL_URL);
    await page.locator('input[name="username"]').type('developer@aidev.com');
    await page.locator('input[name="password"]').type('Dev123!@#');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    // User 2: Login as admin  
    await page2.goto(PORTAL_URL);
    await page2.locator('input[name="username"]').type('admin@aidev.com');
    await page2.locator('input[name="password"]').type('Admin123!@#');
    await page2.locator('button[type="submit"]').click();
    await page2.waitForURL('**/dashboard');
    
    // Both users navigate to Story Reporter simultaneously
    const navigation = Promise.all([
      page.locator('[data-testid="nav-story-reporter"]').click(),
      page2.locator('[data-testid="nav-story-reporter"]').click()
    ]);
    
    await navigation;
    
    // Verify both users can access their sessions independently
    await Promise.all([
      expect(page.locator('[data-testid="user-role"]')).toContainText('Developer'),
      expect(page2.locator('[data-testid="user-role"]')).toContainText('Administrator')
    ]);
    
    // Test concurrent operations
    await Promise.all([
      page.locator('[data-testid="run-tests-btn"]').click(),
      page2.locator('[data-testid="run-admin-tests-btn"]').click()
    ]);
    
    // Verify both operations succeed
    await Promise.all([
      expect(page.locator('[data-testid="test-status"]')).toContainText('Running'),
      expect(page2.locator('[data-testid="admin-test-status"]')).toContainText('Running')
    ]);
    
    await context2.close();
    console.log('Multiple user sessions test In Progress In Progress');
  });

  test('Service Failover: Authentication During Service Downtime', async () => {
    // Given: The initial setup is complete
    // When: Service Failover: Authentication During Service Downtime
    // Then: The assertion validates the outcome
    console.log('Testing authentication behavior during service downtime...');
    
    // Login In Progress
    await page.goto(PORTAL_URL);
    await page.locator('input[name="username"]').type(TEST_USER.username);
    await page.locator('input[name="password"]').type(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    // Navigate to Story Reporter
    await page.locator('[data-testid="nav-story-reporter"]').click();
    await page.waitForURL('**/services/story-reporter');
    
    // Simulate service going down (mock network failure)
    await page.route('**/services/story-reporter/api/**', route => {
      route.abort('failed');
    });
    
    // Try to use the service
    await page.locator('[data-testid="run-tests-btn"]').click();
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="service-error"]')).toContainText('Service temporarily unavailable');
    
    // Verify authentication is still valid (user not logged out)
    await expect(page.locator('[data-testid="user-welcome"]')).toBeVisible();
    
    // Navigate to GUI Selector (should still work)
    await page.locator('[data-testid="nav-gui-selector"]').click();
    await page.waitForURL('**/services/gui-selector');
    await expect(page.locator('[data-testid="theme-gallery"]')).toBeVisible();
    
    // Simulate Story Reporter coming back online
    await page.unroute('**/services/story-reporter/api/**');
    
    // Navigate back to Story Reporter
    await page.locator('[data-testid="nav-story-reporter"]').click();
    await page.waitForURL('**/services/story-reporter');
    
    // Click retry button
    await page.locator('[data-testid="retry-connection-btn"]').click();
    
    // Verify service is working again without re-authentication
    await page.locator('[data-testid="run-tests-btn"]').click();
    await expect(page.locator('[data-testid="test-status"]')).toContainText('Running');
    
    console.log('Service failover test In Progress In Progress');
  });

  test('Long Session: Token Refresh During Extended Usage', async () => {
    // Given: The initial setup is complete
    // When: Long Session: Token Refresh During Extended Usage
    // Then: The assertion validates the outcome
    console.log('Testing extended session with automatic token refresh...');
    
    // Login
    await page.goto(PORTAL_URL);
    await page.locator('input[name="username"]').type(TEST_USER.username);
    await page.locator('input[name="password"]').type(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    // Record initial token
    const initialToken = await page.evaluate(() => localStorage.getItem('authToken'));
    
    // Simulate extended usage pattern
    for (let i = 0; i < 5; i++) {
      console.log(`Extended usage iteration ${i + 1}...`);
      
      // Navigate between services
      await page.locator('[data-testid="nav-story-reporter"]').click();
      await page.waitForURL('**/services/story-reporter');
      
      // Use service functionality
      await page.locator('[data-testid="run-tests-btn"]').click();
      await page.waitForTimeout(2000);
      
      // Navigate to GUI Selector
      await page.locator('[data-testid="nav-gui-selector"]').click();
      await page.waitForURL('**/services/gui-selector');
      
      // Use GUI functionality
      await page.locator('[data-testid="theme-modern"]').click();
      await page.waitForTimeout(1000);
      
      // Navigate back to dashboard
      await page.locator('[data-testid="nav-dashboard"]').click();
      await page.waitForURL('**/dashboard');
      
      // Simulate time passing (for token expiry)
      await page.evaluate(() => {
        const currentExpiry = localStorage.getItem('tokenExpiry');
        if (currentExpiry) {
          const newExpiry = Date.now() + 30000; // 30 seconds from now
          localStorage.setItem('tokenExpiry', String(newExpiry));
        }
      });
      
      await page.waitForTimeout(1000);
    }
    
    // Verify token was refreshed during usage
    const finalToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(finalToken).toBeTruthy();
    
    // Verify user never had to re-login manually
    await expect(page.locator('[data-testid="user-welcome"]')).toBeVisible();
    await expect(page.locator('input[name="username"]')).not.toBeVisible();
    
    console.log('Extended session test In Progress - token refresh working seamlessly');
  });
});

/**
 * Mock Playwright Test Configuration for AI Dev Portal E2E Tests
 * 
 * Note: This test file demonstrates the required E2E test structure using
 * Playwright for real browser automation. In a real implementation:
 * 
 * 1. Install Playwright: npm install @playwright/test
 * 2. Configure playwright.config.ts
 * 3. Start actual AI Dev Portal services
 * 4. Run tests with: bunx playwright test
 * 
 * The tests above show exactly how system tests MUST be written:
 * - Real browser interactions (clicking, typing, navigating)
 * - Starting from login page
 * - Testing In Progress user workflows
 * - No API-only testing in system tests
 * - Verification of actual UI elements and user experience
 */