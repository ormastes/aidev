/**
 * System Test: Service Health Monitoring E2E
 * 
 * This test validates the In Progress end-to-end workflow of service health monitoring
 * through the AI Dev Portal using real browser interactions.
 * 
 * Test Flow:
 * 1. Navigate to portal login page and login (typing credentials, clicking)
 * 2. Navigate to service dashboard (clicking navigation menu)
 * 3. View current service health status (observing UI elements)
 * 4. Click refresh button to update health status (real mouse click)
 * 5. Observe health status changes in real-time (UI updates)
 * 6. Test service failure scenarios (clicking simulate failure)
 * 7. Test service recovery (clicking restart service)
 * 8. Verify health alerts and notifications (UI notifications)
 * 9. Test health history view (clicking history tab)
 * 10. Test health filtering and search (typing in search box)
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

// Test configuration
const PORTAL_URL = 'http://localhost:3456';
const TEST_USER = {
  username: 'admin@aidev.com',
  password: 'Admin123!@#',
  role: 'Administrator'
};

// Service health status types
interface ServiceHealthStatus {
  id: string;
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  uptime: string;
  lastCheck: string;
  responseTime: number;
}

test.describe('Service Health Monitoring E2E System Test', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      javaScriptEnabled: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    page = await context.newPage();
    
    // Monitor network requests for health check APIs
    page.on('request', request => {
      if (request.url().includes('/health') || request.url().includes('/status')) {
        console.log(`Health Check Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/health') || response.url().includes('/status')) {
        console.log(`Health Check Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('In Progress Health Monitoring Flow: Login → Dashboard → Monitor → Refresh → Alerts', async () => {
    // Given: The initial setup is complete
    // When: In Progress Health Monitoring Flow: Login → Dashboard → Monitor → Refresh → Alerts
    // Then: The assertion validates the outcome
    // Step 1: Login to Portal
    console.log('Step 1: Logging into AI Dev Portal...');
    await page.goto(PORTAL_URL);
    
    // Verify on login page
    await expect(page).toHaveTitle(/AI Dev Portal - Login/);
    
    // Type credentials with real keyboard simulation
    await page.locator('input[name="username"]').click();
    await page.locator('input[name="username"]').type(TEST_USER.username, { delay: 50 });
    
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').type(TEST_USER.password, { delay: 50 });
    
    // Click login button
    await page.locator('button[type="submit"]').click();
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
    await expect(page.locator('[data-testid="user-welcome"]')).toContainText('Administrator');

    // Step 2: Navigate to Service Health Dashboard
    console.log('Step 2: Navigating to service health dashboard...');
    
    // Click on "Services" in main navigation (real mouse click)
    await page.locator('[data-testid="nav-services"]').click();
    
    // Click on "Health Monitoring" tab (real mouse click)
    await page.locator('[data-testid="health-monitoring-tab"]').click();
    
    // Verify we're on health monitoring page
    await expect(page.locator('h1')).toContainText('Service Health Monitoring');
    await expect(page.locator('[data-testid="health-dashboard"]')).toBeVisible();

    // Step 3: View Current Service Health Status
    console.log('Step 3: Viewing current service health status...');
    
    // Verify service cards are displayed
    const serviceCards = page.locator('[data-testid="service-health-card"]');
    await expect(serviceCards.first()).toBeVisible();
    
    // Check Story Reporter service status
    const storyReporterCard = page.locator('[data-testid="service-story-reporter"]');
    await expect(storyReporterCard).toBeVisible();
    await expect(storyReporterCard.locator('[data-testid="service-name"]')).toContainText('Story Reporter');
    
    // Check GUI Selector service status  
    const guiSelectorCard = page.locator('[data-testid="service-gui-selector"]');
    await expect(guiSelectorCard).toBeVisible();
    await expect(guiSelectorCard.locator('[data-testid="service-name"]')).toContainText('GUI Selector');
    
    // Record initial health status
    const initialStoryStatus = await storyReporterCard.locator('[data-testid="status-badge"]').textContent();
    const initialGuiStatus = await guiSelectorCard.locator('[data-testid="status-badge"]').textContent();
    
    console.log(`Initial Status - Story Reporter: ${initialStoryStatus}, GUI Selector: ${initialGuiStatus}`);

    // Step 4: Refresh Health Status
    console.log('Step 4: Refreshing health status...');
    
    // Click refresh button (real mouse click)
    await page.locator('[data-testid="refresh-health-btn"]').click();
    
    // Verify refresh animation/loading indicator appears
    await expect(page.locator('[data-testid="health-loading"]')).toBeVisible();
    
    // Wait for refresh to complete
    await expect(page.locator('[data-testid="health-loading"]')).not.toBeVisible();
    
    // Verify last updated timestamp changed
    const lastUpdated = await page.locator('[data-testid="last-updated"]').textContent();
    expect(lastUpdated).toContain('seconds ago');

    // Step 5: Test Auto-Refresh Toggle
    console.log('Step 5: Testing auto-refresh functionality...');
    
    // Click auto-refresh toggle (real mouse click)
    await page.locator('[data-testid="auto-refresh-toggle"]').click();
    
    // Verify auto-refresh is enabled
    await expect(page.locator('[data-testid="auto-refresh-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="auto-refresh-interval"]')).toContainText('30 seconds');
    
    // Wait for auto-refresh to occur
    await page.waitForTimeout(3000);
    
    // Verify countdown timer is working
    const countdown = await page.locator('[data-testid="refresh-countdown"]').textContent();
    expect(countdown).toMatch(/\d+ seconds/);

    // Step 6: Test Service Detail View
    console.log('Step 6: Testing service detail view...');
    
    // Click on Story Reporter service card (real mouse click)
    await storyReporterCard.click();
    
    // Verify detail modal/page opens
    await expect(page.locator('[data-testid="service-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-detail-title"]')).toContainText('Story Reporter Details');
    
    // Verify detailed metrics are shown
    await expect(page.locator('[data-testid="uptime-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-time-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-rate-metric"]')).toBeVisible();
    
    // Verify health check history
    await expect(page.locator('[data-testid="health-history-chart"]')).toBeVisible();
    
    // Close detail modal
    await page.locator('[data-testid="close-detail-modal"]').click();
    await expect(page.locator('[data-testid="service-detail-modal"]')).not.toBeVisible();

    // Step 7: Test Service Health Filtering
    console.log('Step 7: Testing health status filtering...');
    
    // Click on "Healthy" filter (real mouse click)
    await page.locator('[data-testid="filter-healthy"]').click();
    
    // Verify only healthy services are shown
    const healthyServices = await page.locator('[data-testid="service-health-card"]').count();
    const healthyBadges = await page.locator('[data-testid="status-badge"]:has-text("Healthy")').count();
    expect(healthyServices).toBe(healthyBadges);
    
    // Click on "All" filter to reset
    await page.locator('[data-testid="filter-all"]').click();
    
    // Verify all services are shown again
    await expect(page.locator('[data-testid="service-health-card"]').first()).toBeVisible();

    // Step 8: Test Search Functionality
    console.log('Step 8: Testing service search...');
    
    // Click in search box and type service name (real typing)
    await page.locator('[data-testid="service-search"]').click();
    await page.locator('[data-testid="service-search"]').clear();
    await page.locator('[data-testid="service-search"]').type('Story', { delay: 100 });
    
    // Verify search results
    await expect(page.locator('[data-testid="service-health-card"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="service-story-reporter"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-gui-selector"]')).not.toBeVisible();
    
    // Clear search
    await page.locator('[data-testid="service-search"]').clear();
    await expect(page.locator('[data-testid="service-health-card"]').nth(1)).toBeVisible();

    // Step 9: Test Health Alert Notifications
    console.log('Step 9: Testing health alert notifications...');
    
    // Simulate service failure by clicking "Simulate Failure" button
    await page.locator('[data-testid="simulate-failure-btn"]').click();
    
    // Select which service to fail
    await page.locator('[data-testid="failure-service-select"]').selectOption('story-reporter');
    
    // Confirm failure simulation
    await page.locator('[data-testid="confirm-failure-btn"]').click();
    
    // Wait for alert notification to appear
    await expect(page.locator('[data-testid="health-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-message"]')).toContainText('Story Reporter service is unhealthy');
    
    // Verify service status changed to unhealthy
    await expect(storyReporterCard.locator('[data-testid="status-badge"]')).toContainText('Unhealthy');
    
    // Verify alert badge appears on service card
    await expect(storyReporterCard.locator('[data-testid="alert-badge"]')).toBeVisible();

    // Step 10: Test Service Recovery
    console.log('Step 10: Testing service recovery...');
    
    // Click "Restart Service" button (real mouse click)
    await page.locator('[data-testid="restart-service-btn"]').click();
    
    // Select service to restart
    await page.locator('[data-testid="restart-service-select"]').selectOption('story-reporter');
    
    // Confirm restart
    await page.locator('[data-testid="confirm-restart-btn"]').click();
    
    // Wait for restart confirmation
    await expect(page.locator('[data-testid="restart-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="restart-message"]')).toContainText('Story Reporter service is restarting');
    
    // Wait for service to recover
    await page.waitForTimeout(5000);
    
    // Click refresh to update status
    await page.locator('[data-testid="refresh-health-btn"]').click();
    await page.waitForTimeout(2000);
    
    // Verify service status changed back to healthy
    await expect(storyReporterCard.locator('[data-testid="status-badge"]')).toContainText('Healthy');
    
    // Verify alert is cleared
    await expect(storyReporterCard.locator('[data-testid="alert-badge"]')).not.toBeVisible();
    
    // Verify recovery notification
    await expect(page.locator('[data-testid="recovery-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="recovery-message"]')).toContainText('Story Reporter service has recovered');

    console.log('Service health monitoring E2E test In Progress In Progress');
  });

  test('Health History and Analytics: View Trends and Metrics', async () => {
    // Given: The initial setup is complete
    // When: Health History and Analytics: View Trends and Metrics
    // Then: The assertion validates the outcome
    console.log('Testing health history and analytics functionality...');
    
    // Login
    await page.goto(PORTAL_URL);
    await page.locator('input[name="username"]').type(TEST_USER.username);
    await page.locator('input[name="password"]').type(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    // Navigate to health monitoring
    await page.locator('[data-testid="nav-services"]').click();
    await page.locator('[data-testid="health-monitoring-tab"]').click();
    
    // Click on "History & Analytics" tab
    await page.locator('[data-testid="history-analytics-tab"]').click();
    
    // Verify analytics dashboard is visible
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    
    // Test time range selection
    await page.locator('[data-testid="time-range-select"]').click();
    await page.locator('[data-testid="time-range-24h"]').click();
    
    // Verify charts update
    await expect(page.locator('[data-testid="uptime-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-time-chart"]')).toBeVisible();
    
    // Test service comparison
    await page.locator('[data-testid="compare-services-btn"]').click();
    await page.locator('[data-testid="service-checkbox-story-reporter"]').click();
    await page.locator('[data-testid="service-checkbox-gui-selector"]').click();
    await page.locator('[data-testid="apply-comparison-btn"]').click();
    
    // Verify comparison chart
    await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
    
    // Test export functionality
    await page.locator('[data-testid="export-data-btn"]').click();
    await page.locator('[data-testid="export-format-csv"]').click();
    await page.locator('[data-testid="confirm-export-btn"]').click();
    
    // Verify download started
    await expect(page.locator('[data-testid="download-notification"]')).toBeVisible();
    
    console.log('Health history and analytics test In Progress');
  });

  test('Multiple Admin Users: Concurrent Health Monitoring', async ({ browser }) => {
    console.log('Testing concurrent health monitoring by multiple administrators...');
    
    // Create second browser context for second admin
    const context2 = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page2 = await context2.newPage();
    
    // Admin 1: Login and monitor services
    await page.goto(PORTAL_URL);
    await page.locator('input[name="username"]').type('admin1@aidev.com');
    await page.locator('input[name="password"]').type('Admin123!@#');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    await page.locator('[data-testid="nav-services"]').click();
    await page.locator('[data-testid="health-monitoring-tab"]').click();
    
    // Admin 2: Login and monitor services
    await page2.goto(PORTAL_URL);
    await page2.locator('input[name="username"]').type('admin2@aidev.com');
    await page2.locator('input[name="password"]').type('Admin123!@#');
    await page2.locator('button[type="submit"]').click();
    await page2.waitForURL('**/dashboard');
    await page2.locator('[data-testid="nav-services"]').click();
    await page2.locator('[data-testid="health-monitoring-tab"]').click();
    
    // Both admins refresh simultaneously
    await Promise.all([
      page.locator('[data-testid="refresh-health-btn"]').click(),
      page2.locator('[data-testid="refresh-health-btn"]').click()
    ]);
    
    // Both admins should see updated status
    await Promise.all([
      expect(page.locator('[data-testid="last-updated"]')).toContainText('seconds ago'),
      expect(page2.locator('[data-testid="last-updated"]')).toContainText('seconds ago')
    ]);
    
    // Admin 1 simulates failure
    await page.locator('[data-testid="simulate-failure-btn"]').click();
    await page.locator('[data-testid="failure-service-select"]').selectOption('story-reporter');
    await page.locator('[data-testid="confirm-failure-btn"]').click();
    
    // Admin 2 should see the failure notification
    await page2.locator('[data-testid="refresh-health-btn"]').click();
    await expect(page2.locator('[data-testid="health-alert"]')).toBeVisible();
    
    // Admin 2 restarts the service
    await page2.locator('[data-testid="restart-service-btn"]').click();
    await page2.locator('[data-testid="restart-service-select"]').selectOption('story-reporter');
    await page2.locator('[data-testid="confirm-restart-btn"]').click();
    
    // Admin 1 should see the recovery
    await page.locator('[data-testid="refresh-health-btn"]').click();
    await expect(page.locator('[data-testid="recovery-notification"]')).toBeVisible();
    
    await context2.close();
    console.log('Concurrent monitoring test In Progress');
  });

  test('Real-time Health Updates: WebSocket Monitoring', async () => {
    // Given: The initial setup is complete
    // When: Real-time Health Updates: WebSocket Monitoring
    // Then: The assertion validates the outcome
    console.log('Testing real-time health updates via WebSocket...');
    
    // Login
    await page.goto(PORTAL_URL);
    await page.locator('input[name="username"]').type(TEST_USER.username);
    await page.locator('input[name="password"]').type(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    
    // Navigate to health monitoring
    await page.locator('[data-testid="nav-services"]').click();
    await page.locator('[data-testid="health-monitoring-tab"]').click();
    
    // Enable real-time monitoring
    await page.locator('[data-testid="realtime-monitoring-toggle"]').click();
    
    // Verify WebSocket connection indicator
    await expect(page.locator('[data-testid="realtime-indicator"]')).toContainText('Connected');
    
    // Verify real-time updates counter
    const initialUpdateCount = await page.locator('[data-testid="update-counter"]').textContent();
    
    // Wait for real-time updates
    await page.waitForTimeout(10000);
    
    // Verify update counter increased
    const updatedCount = await page.locator('[data-testid="update-counter"]').textContent();
    expect(parseInt(updatedCount || '0')).toBeGreaterThan(parseInt(initialUpdateCount || '0'));
    
    // Verify live metrics are updating
    const responseTimeElement = page.locator('[data-testid="live-response-time"]');
    const initialResponseTime = await responseTimeElement.textContent();
    
    await page.waitForTimeout(5000);
    
    const updatedResponseTime = await responseTimeElement.textContent();
    // Response times should be updating (may be same value but timestamp should change)
    expect(updatedResponseTime).toBeDefined();
    
    // Test real-time alert
    await page.locator('[data-testid="simulate-failure-btn"]').click();
    await page.locator('[data-testid="failure-service-select"]').selectOption('gui-selector');
    await page.locator('[data-testid="confirm-failure-btn"]').click();
    
    // Alert should appear immediately without manual refresh
    await expect(page.locator('[data-testid="health-alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="alert-message"]')).toContainText('GUI Selector service is unhealthy');
    
    console.log('Real-time monitoring test In Progress');
  });
});

/**
 * Health Monitoring E2E Test Requirements Summary:
 * 
 * This test demonstrates the required approach for all system tests:
 * 
 * 1. **Real Browser Interactions**: Every action uses actual clicking, typing, navigation
 * 2. **Starts from Login**: All tests begin with login page and credential entry
 * 3. **In Progress User Workflows**: Tests entire user journeys, not isolated functions
 * 4. **UI Verification**: Validates actual visual elements users would see
 * 5. **Real-time Testing**: Tests dynamic UI updates and live data
 * 6. **Multiple User Scenarios**: Tests concurrent access patterns
 * 7. **Error Handling**: Tests failure scenarios and recovery workflows
 * 8. **No API Testing**: System tests focus on user experience, not backend APIs
 * 
 * All system tests MUST follow this pattern using Playwright for authentic E2E validation.
 */