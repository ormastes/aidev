/**
 * System Test: App Switching Workflow E2E
 * 
 * This test validates the In Progress end-to-end workflow of creating applications
 * and switching between them using real browser interactions.
 * 
 * Test Flow:
 * 1. Login to portal (typing credentials, clicking login)
 * 2. Create first application (clicking New App, filling form, selecting services)
 * 3. Create second application (repeating app creation process)
 * 4. Switch between apps using app switcher (clicking dropdown, selecting apps)
 * 5. Navigate to services within each app (clicking service links)
 * 6. Verify context switching works correctly (different data per app)
 * 7. Test rapid app switching (multiple quick switches)
 * 8. Test app-specific service configurations (different settings per app)
 * 9. Test app deletion and cleanup (clicking delete, confirming)
 * 10. Verify URL routing and bookmarking works correctly
 */

import { test, expect } from '@playwright/test';

// Test configuration
const PORTAL_URL = 'http://localhost:3456';
const TEST_USER = {
  username: 'developer@aidev.com',
  password: 'Dev123!@#',
  fullName: 'Test Developer'
};

// Application configurations for testing
const TEST_APPS = [
  {
    name: 'E-Commerce Platform',
    description: 'Online shopping application with full feature set',
    template: 'react-ecommerce',
    services: ['story-reporter', 'gui-selector', 'external-log-lib'],
    theme: 'modern'
  },
  {
    name: 'Analytics Dashboard',
    description: 'Real-time analytics and reporting system',
    template: 'react-dashboard',
    services: ['story-reporter', 'external-log-lib'],
    theme: 'professional'
  },
  {
    name: 'Chat Application',
    description: 'Real-time messaging with collaboration features',
    template: 'react-chat',
    services: ['chat-space', 'pocketflow', 'external-log-lib'],
    theme: 'creative'
  }
];

test.describe('🚨 Story: App Switching Workflow E2E System Test', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor app switching requests
    page.on('request', request => {
      if (request.url().includes('/api/apps/') || request.url().includes('/switch-app/')) {
        console.log(`App Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/apps/')) {
        console.log(`App Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('In Progress App Switching Flow: Login → Create Apps → Switch → Navigate → Delete', async ({ page }) => {
    // Step 1: Login to Portal
    console.log('Step 1: Logging into AI Dev Portal...');
    await page.goto(PORTAL_URL);
    
    // Verify on login page and login with real typing
    await expect(page).toHaveTitle(/AI Dev Portal - Login/);
    await page.locator('input[name="username"]').click();
    await page.locator('input[name="username"]').type(TEST_USER.username, { delay: 50 });
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').type(TEST_USER.password, { delay: 50 });
    await page.locator('button[type="submit"]').click();
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard*');
    await expect(page.locator('[data-testid="user-welcome"]')).toContainText(TEST_USER.fullName);

    // Step 2: Create First Application (E-Commerce Platform)
    console.log('Step 2: Creating first application (E-Commerce Platform)...');
    
    // Click "New Application" button (real mouse click)
    await page.locator('[data-testid="new-app-btn"]').click();
    
    // Verify create app modal opens
    await expect(page.locator('[data-testid="create-app-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Create New Application');
    
    // Fill application form with real typing
    await page.locator('input[name="appName"]').click();
    await page.locator('input[name="appName"]').type(TEST_APPS[0].name, { delay: 30 });
    
    await page.locator('textarea[name="appDescription"]').click();
    await page.locator('textarea[name="appDescription"]').type(TEST_APPS[0].description, { delay: 20 });
    
    // Select template from dropdown
    await page.locator('[data-testid="template-select"]').selectOption(TEST_APPS[0].template);
    
    // Select services with checkboxes (real clicking)
    for (const service of TEST_APPS[0].services) {
      await page.locator(`[data-testid="service-${service}"]`).click();
    }
    
    // Submit form and wait for redirect to app dashboard
    await page.locator('[data-testid="create-app-submit"]').click();
    
    // Verify we're redirected to the new app's dashboard
    await page.waitForURL('**/apps/*/dashboard*');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="app-title"]')).toContainText('E-Commerce Platform');
    
    // Record first app ID from URL
    const firstAppUrl = page.url();
    const firstAppId = firstAppUrl.match(/\/apps\/([^\/]+)\//)?.[1];
    expect(firstAppId).toBeTruthy();

    // Step 3: Create Second Application (Analytics Dashboard)
    console.log('Step 3: Creating second application (Analytics Dashboard)...');
    
    // Click "New App" in app switcher (real click)
    await page.locator('[data-testid="app-switcher"]').click();
    await page.locator('[data-testid="new-app-option"]').click();
    
    // Fill second app form
    await page.locator('input[name="appName"]').click();
    await page.locator('input[name="appName"]').clear();
    await page.locator('input[name="appName"]').type(TEST_APPS[1].name, { delay: 30 });
    
    await page.locator('textarea[name="appDescription"]').click();
    await page.locator('textarea[name="appDescription"]').clear();
    await page.locator('textarea[name="appDescription"]').type(TEST_APPS[1].description, { delay: 20 });
    
    // Select different template and services
    await page.locator('[data-testid="template-select"]').selectOption(TEST_APPS[1].template);
    
    for (const service of TEST_APPS[1].services) {
      await page.locator(`[data-testid="service-${service}"]`).click();
    }
    
    // Submit second app and wait for redirect
    await page.locator('[data-testid="create-app-submit"]').click();
    await page.waitForURL('**/apps/*/dashboard*');
    await expect(page.locator('[data-testid="app-title"]')).toContainText('Analytics Dashboard');
    
    // Record second app ID
    const secondAppUrl = page.url();
    const secondAppId = secondAppUrl.match(/\/apps\/([^\/]+)\//)?.[1];
    expect(secondAppId).toBeTruthy();
    expect(secondAppId).not.toBe(firstAppId);

    // Step 4: Test App Switching
    console.log('Step 4: Testing app switching functionality...');
    
    // Open app switcher dropdown (real click)
    await page.locator('[data-testid="app-switcher"]').click();
    
    // Verify both apps are listed
    await expect(page.locator('[data-testid="app-list"]')).toBeVisible();
    await expect(page.locator(`[data-testid="app-option-${firstAppId}"]`)).toContainText('E-Commerce Platform');
    await expect(page.locator(`[data-testid="app-option-${secondAppId}"]`)).toContainText('Analytics Dashboard');
    
    // Switch to second app (Analytics Dashboard) instead since we should be on first app already
    await page.locator(`[data-testid="app-option-${secondAppId}"]`).click();
    
    // Verify we switched to second app
    await page.waitForURL(`**/apps/${secondAppId}/dashboard`);
    await expect(page.locator('[data-testid="app-title"]')).toContainText('Analytics Dashboard');
    
    // Verify app-specific content is loaded
    await expect(page.locator('[data-testid="app-services-count"]')).toContainText('2 services'); // Analytics has 2 services

    // Step 5: Test Service Navigation Within Apps
    console.log('Step 5: Testing service navigation within apps...');
    
    // Navigate to Story Reporter in first app (real click)
    await page.locator('[data-testid="service-story-reporter"]').click();
    
    // Verify we're in Story Reporter for E-Commerce app
    await page.waitForURL(`**/apps/${firstAppId}/services/story-reporter`);
    await expect(page.locator('[data-testid="app-context"]')).toContainText('E-Commerce Platform');
    await expect(page.locator('[data-testid="service-title"]')).toContainText('Story Reporter');
    
    // Verify app-specific test configurations are loaded
    await expect(page.locator('[data-testid="test-config"]')).toContainText('E-commerce Test Suite');
    
    // Navigate to GUI Selector in first app
    await page.locator('[data-testid="nav-gui-selector"]').click();
    await page.waitForURL(`**/apps/${firstAppId}/services/gui-selector`);
    await expect(page.locator('[data-testid="app-context"]')).toContainText('E-Commerce Platform');
    await expect(page.locator('[data-testid="current-theme"]')).toContainText('modern'); // E-commerce uses modern theme

    // Step 6: Switch Apps and Compare Context
    console.log('Step 6: Switching apps and comparing context...');
    
    // Switch to second app while in GUI Selector
    await page.locator('[data-testid="app-switcher"]').click();
    await page.locator(`[data-testid="app-option-${secondAppId}"]`).click();
    
    // Verify we're in Analytics Dashboard context
    await page.waitForURL(`**/apps/${secondAppId}/dashboard`);
    await expect(page.locator('[data-testid="app-title"]')).toContainText('Analytics Dashboard');
    
    // Navigate to Story Reporter in second app
    await page.locator('[data-testid="service-story-reporter"]').click();
    await page.waitForURL(`**/apps/${secondAppId}/services/story-reporter`);
    
    // Verify different app context and configurations
    await expect(page.locator('[data-testid="app-context"]')).toContainText('Analytics Dashboard');
    await expect(page.locator('[data-testid="test-config"]')).toContainText('Analytics Test Suite');
    
    // Verify GUI Selector is not available (Analytics app doesn't have it)
    await expect(page.locator('[data-testid="nav-gui-selector"]')).not.toBeVisible();

    // Step 7: Test Rapid App Switching
    console.log('Step 7: Testing rapid app switching...');
    
    // Perform rapid switches between apps
    for (let i = 0; i < 3; i++) {
      // Switch to first app
      await page.locator('[data-testid="app-switcher"]').click();
      await page.locator(`[data-testid="app-option-${firstAppId}"]`).click();
      await page.waitForTimeout(500);
      
      // Verify quick context switch
      await expect(page.locator('[data-testid="app-title"]')).toContainText('E-Commerce Platform');
      
      // Switch to second app
      await page.locator('[data-testid="app-switcher"]').click();
      await page.locator(`[data-testid="app-option-${secondAppId}"]`).click();
      await page.waitForTimeout(500);
      
      // Verify quick context switch
      await expect(page.locator('[data-testid="app-title"]')).toContainText('Analytics Dashboard');
    }

    // Step 8: Test URL Routing and Direct Access
    console.log('Step 8: Testing URL routing and direct access...');
    
    // Navigate directly to first app's Story Reporter via URL
    await page.goto(`${PORTAL_URL}/apps/${firstAppId}/services/story-reporter`);
    
    // Verify correct app and service context
    await expect(page.locator('[data-testid="app-context"]')).toContainText('E-Commerce Platform');
    await expect(page.locator('[data-testid="service-title"]')).toContainText('Story Reporter');
    
    // Navigate directly to second app's dashboard via URL
    await page.goto(`${PORTAL_URL}/apps/${secondAppId}/dashboard`);
    
    // Verify correct app context
    await expect(page.locator('[data-testid="app-title"]')).toContainText('Analytics Dashboard');

    // Step 9: Test App-Specific Settings and Configurations
    console.log('Step 9: Testing app-specific settings and configurations...');
    
    // Go to first app settings
    await page.goto(`${PORTAL_URL}/apps/${firstAppId}/settings`);
    
    // Verify app-specific settings
    await expect(page.locator('[data-testid="app-settings-title"]')).toContainText('E-Commerce Platform Settings');
    
    // Change app theme (real interaction)
    await page.locator('[data-testid="theme-select"]').selectOption('classic');
    await page.locator('[data-testid="save-settings-btn"]').click();
    
    // Verify settings saved
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
    
    // Switch to second app and verify different settings
    await page.locator('[data-testid="app-switcher"]').click();
    await page.locator(`[data-testid="app-option-${secondAppId}"]`).click();
    await page.locator('[data-testid="nav-settings"]').click();
    
    // Verify second app has different theme (unchanged)
    await expect(page.locator('[data-testid="current-theme"]')).toContainText('professional');

    // Step 10: Test App Deletion and Cleanup
    console.log('Step 10: Testing app deletion and cleanup...');
    
    // Go to second app settings for deletion
    await page.locator('[data-testid="nav-settings"]').click();
    await page.locator('[data-testid="danger-zone-tab"]').click();
    
    // Click delete app button (real click)
    await page.locator('[data-testid="delete-app-btn"]').click();
    
    // Confirm deletion in modal
    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
    await page.locator('input[name="confirmAppName"]').type('Analytics Dashboard');
    await page.locator('[data-testid="confirm-delete-btn"]').click();
    
    // Verify deletion and redirect
    await page.waitForURL('**/dashboard*');
    
    // Verify app is removed from switcher
    await page.locator('[data-testid="app-switcher"]').click();
    await expect(page.locator(`[data-testid="app-option-${secondAppId}"]`)).not.toBeVisible();
    await expect(page.locator(`[data-testid="app-option-${firstAppId}"]`)).toBeVisible();
    
    // Try to access deleted app via direct URL
    await page.goto(`${PORTAL_URL}/apps/${secondAppId}/dashboard`);
    
    // Verify 404 or redirect to dashboard
    await expect(page.locator('[data-testid="app-not-found"]')).toBeVisible();

    console.log('App switching workflow E2E test In Progress In Progress');
  });

  test('Multiple Developer Collaboration: Shared App Access', async ({ browser }) => {
    console.log('Testing multiple developers working on shared applications...');
    
    // Create two contexts for two developers
    const context1 = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page1 = await context1.newPage();
    
    const context2 = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page2 = await context2.newPage();
    
    // Developer 1: Login and create shared app
    await page1.goto(PORTAL_URL);
    await page1.locator('input[name="username"]').type('dev1@aidev.com');
    await page1.locator('input[name="password"]').type('Dev123!@#');
    await page1.locator('button[type="submit"]').click();
    await page1.waitForURL('**/dashboard*');
    
    // Create shared app
    await page1.locator('[data-testid="new-app-btn"]').click();
    await page1.locator('input[name="appName"]').type('Shared Team Project');
    await page1.locator('textarea[name="appDescription"]').type('Collaboration project for team');
    await page1.locator('[data-testid="template-select"]').selectOption('react-app');
    await page1.locator('[data-testid="service-story-reporter"]').click();
    await page1.locator('[data-testid="service-gui-selector"]').click();
    
    // Add team member
    await page1.locator('[data-testid="add-team-member-btn"]').click();
    await page1.locator('input[name="memberEmail"]').type('dev2@aidev.com');
    await page1.locator('[data-testid="member-role-select"]').selectOption('developer');
    await page1.locator('[data-testid="add-member-btn"]').click();
    
    await page1.locator('[data-testid="create-app-submit"]').click();
    await page1.waitForURL('**/apps/*/dashboard*');
    
    // Get app ID
    const sharedAppUrl = page1.url();
    const sharedAppId = sharedAppUrl.match(/\/apps\/([^\/]+)\//)?.[1];
    
    // Developer 2: Login and access shared app
    await page2.goto(PORTAL_URL);
    await page2.locator('input[name="username"]').type('dev2@aidev.com');
    await page2.locator('input[name="password"]').type('Dev123!@#');
    await page2.locator('button[type="submit"]').click();
    await page2.waitForURL('**/dashboard*');
    
    // Verify shared app appears in Developer 2's app list
    await page2.locator('[data-testid="app-switcher"]').click();
    await expect(page2.locator(`[data-testid="app-option-${sharedAppId}"]`)).toContainText('Shared Team Project');
    
    // Switch to shared app
    await page2.locator(`[data-testid="app-option-${sharedAppId}"]`).click();
    await page2.waitForURL(`**/apps/${sharedAppId}/dashboard`);
    
    // Both developers work simultaneously
    // Dev 1: Works on Story Reporter
    await page1.locator('[data-testid="service-story-reporter"]').click();
    await page1.locator('[data-testid="run-tests-btn"]').click();
    
    // Dev 2: Works on GUI Selector
    await page2.locator('[data-testid="service-gui-selector"]').click();
    await page2.locator('[data-testid="theme-modern"]').click();
    
    // Verify both can work without conflicts
    await Promise.all([
      expect(page1.locator('[data-testid="test-status"]')).toContainText('Running'),
      expect(page2.locator('[data-testid="selected-theme"]')).toContainText('Modern')
    ]);
    
    await context1.close();
    await context2.close();
    console.log('Collaborative app access test In Progress');
  });

  test('App Performance: Large Number of Apps and Quick Switching', async ({ page }) => {
    console.log('Testing app performance with multiple apps...');
    
    // Login
    await page.goto(PORTAL_URL);
    await page.locator('input[name="username"]').type(TEST_USER.username);
    await page.locator('input[name="password"]').type(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard*');
    
    // Create multiple apps quickly
    const appIds: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="new-app-btn"]').click();
      await page.locator('input[name="appName"]').type(`Performance Test App ${i + 1}`);
      await page.locator('textarea[name="appDescription"]').type(`Test app ${i + 1} for performance testing`);
      await page.locator('[data-testid="template-select"]').selectOption('react-app');
      await page.locator('[data-testid="service-story-reporter"]').click();
      await page.locator('[data-testid="create-app-submit"]').click();
      
      await page.waitForURL('**/apps/*/dashboard*');
      const appUrl = page.url();
      const appId = appUrl.match(/\/apps\/([^\/]+)\//)?.[1];
      if (appId) appIds.push(appId);
    }
    
    // Test rapid switching between all apps
    const startTime = Date.now();
    
    for (const appId of appIds) {
      await page.locator('[data-testid="app-switcher"]').click();
      await page.locator(`[data-testid="app-option-${appId}"]`).click();
      await page.waitForURL(`**/apps/${appId}/dashboard`);
      
      // Verify app loads quickly
      await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Performance assertion: Should switch between 5 apps in under 10 seconds
    expect(totalTime).toBeLessThan(10000);
    
    console.log(`App switching performance: ${totalTime}ms for 5 apps`);
    
    // Cleanup: Delete test apps
    for (const appId of appIds) {
      await page.goto(`${PORTAL_URL}/apps/${appId}/settings`);
      await page.locator('[data-testid="danger-zone-tab"]').click();
      await page.locator('[data-testid="delete-app-btn"]').click();
      await page.locator('input[name="confirmAppName"]').type(`Performance Test App ${appIds.indexOf(appId) + 1}`);
      await page.locator('[data-testid="confirm-delete-btn"]').click();
      await page.waitForURL('**/dashboard*');
    }
    
    console.log('App performance test In Progress');
  });

  test('App State Persistence: Context Preservation Across Sessions', async ({ browser }) => {
    console.log('Testing app state persistence across browser sessions...');
    
    // Create first context
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    // Login and create app
    await page1.goto(PORTAL_URL);
    await page1.locator('input[name="username"]').type(TEST_USER.username);
    await page1.locator('input[name="password"]').type(TEST_USER.password);
    await page1.locator('button[type="submit"]').click();
    await page1.waitForURL('**/dashboard*');
    
    // Create app with specific configuration
    await page1.locator('[data-testid="new-app-btn"]').click();
    await page1.locator('input[name="appName"]').type('Persistence Test App');
    await page1.locator('textarea[name="appDescription"]').type('Testing state persistence');
    await page1.locator('[data-testid="template-select"]').selectOption('react-app');
    await page1.locator('[data-testid="service-story-reporter"]').click();
    await page1.locator('[data-testid="service-gui-selector"]').click();
    await page1.locator('[data-testid="create-app-submit"]').click();
    
    await page1.waitForURL('**/apps/*/dashboard*');
    const appUrl = page1.url();
    const appId = appUrl.match(/\/apps\/([^\/]+)\//)?.[1];
    
    // Configure app settings
    await page1.locator('[data-testid="nav-settings"]').click();
    await page1.locator('[data-testid="theme-select"]').selectOption('creative');
    await page1.locator('[data-testid="save-settings-btn"]').click();
    
    // Navigate to Story Reporter and configure tests
    await page1.locator('[data-testid="nav-story-reporter"]').click();
    await page1.locator('[data-testid="test-config-btn"]').click();
    await page1.locator('input[name="testSuite"]').type('Custom Test Suite');
    await page1.locator('[data-testid="save-test-config-btn"]').click();
    
    // Close browser and reopen (simulate session end)
    await context1.close();
    
    // Create new context (new session)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Login again
    await page2.goto(PORTAL_URL);
    await page2.locator('input[name="username"]').type(TEST_USER.username);
    await page2.locator('input[name="password"]').type(TEST_USER.password);
    await page2.locator('button[type="submit"]').click();
    await page2.waitForURL('**/dashboard*');
    
    // Navigate to the same app
    await page2.locator('[data-testid="app-switcher"]').click();
    await page2.locator(`[data-testid="app-option-${appId}"]`).click();
    await page2.waitForURL(`**/apps/${appId}/dashboard`);
    
    // Verify app settings persisted
    await page2.locator('[data-testid="nav-settings"]').click();
    await expect(page2.locator('[data-testid="current-theme"]')).toContainText('creative');
    
    // Verify service configuration persisted
    await page2.locator('[data-testid="nav-story-reporter"]').click();
    await page2.locator('[data-testid="test-config-btn"]').click();
    await expect(page2.locator('input[name="testSuite"]')).toHaveValue('Custom Test Suite');
    
    await context2.close();
    console.log('App state persistence test In Progress');
  });
});

/**
 * App Switching E2E Test Requirements Summary:
 * 
 * This test demonstrates comprehensive app workflow testing:
 * 
 * 1. **Full App Lifecycle**: Create → Configure → Use → Switch → Delete
 * 2. **Real User Interactions**: All actions via clicking, typing, navigation
 * 3. **Context Switching**: Verifies app-specific data and configurations
 * 4. **Multi-User Scenarios**: Collaborative app access and permissions
 * 5. **Performance Testing**: Rapid switching and large app counts
 * 6. **State Persistence**: Configuration survival across sessions
 * 7. **URL Routing**: Direct access and bookmarking functionality
 * 8. **Error Handling**: App deletion and access control
 * 
 * This test pattern must be followed for all system-level testing,
 * ensuring real user experience validation through browser automation.
 */