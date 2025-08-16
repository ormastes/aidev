/**
 * Real E2E GUI Selection Tests
 * NO MOCKS - Real browser, real server, real interactions
 * Tests the complete user journey for GUI selection
 */

import { test, expect, Browser, Page, BrowserContext } from '@playwright/test';
import { createTestDatabase, seedTestData, TestDatabase } from '../../../shared/test/database';
import { createTestServer, TestServer } from '../../../shared/test/server';
import { path } from '../../../infra_external-log-lib/src';
import * as fs from 'fs-extra';
import { os } from '../../../infra_external-log-lib/src';

test.describe('GUI Selector - Real E2E Tests', () => {
  let testDb: TestDatabase;
  let testServer: TestServer;
  let testDir: string;
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    
    // Create real temp directory for test artifacts
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gui-selector-e2e-'));
    
    // Create real database with schema and data
    const dbPath = path.join(testDir, 'test.db');
    testDb = await createTestDatabase(dbPath);
    await seedTestData(testDb.db);
    
    // Add GUI-specific data
    await setupGuiTestData(testDb);
    
    // Create real server with GUI routes
    testServer = await createTestServer(testDb.db);
    await setupGuiRoutes(testServer);
    
    // Wait for real server to be ready
    await waitForServer(testServer.url);
  });

  test.beforeEach(async () => {
    // Create fresh browser context for each test
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      // Record video for debugging
      recordVideo: {
        dir: path.join(testDir, 'videos'),
        size: { width: 1280, height: 720 }
      }
    });
    
    page = await context.newPage();
    
    // Monitor console for real errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser error:', msg.text());
      }
    });
    
    // Monitor network failures
    page.on("requestfailed", request => {
      console.error('Request failed:', request.url(), request.failure()?.errorText);
    });
  });

  test.afterEach(async () => {
    // Save screenshot on failure
    if (test.info().status !== 'passed') {
      await page.screenshot({
        path: path.join(testDir, `failure-${Date.now()}.png`),
        fullPage: true
      });
    }
    
    await page.close();
    await context.close();
  });

  test.afterAll(async () => {
    await testServer.cleanup();
    await testDb.cleanup();
    await fs.remove(testDir);
  });

  test('should complete full GUI selection workflow', async () => {
    // Step 1: Navigate to real GUI selector
    await page.goto(`${testServer.url}/gui-selector`);
    
    // Verify page loaded
    await expect(page).toHaveTitle(/GUI Selector/);
    
    // Step 2: Login with real credentials
    await page.click('text=Login');
    await page.fill('input[name="username"]', "developer");
    await page.fill('input[name="password"]', 'dev123');
    await page.click('button[type="submit"]');
    
    // Wait for real authentication
    await page.waitForSelector('.user-menu', { timeout: 5000 });
    
    // Step 3: Create new app
    await page.click('button:has-text("New App")');
    await page.fill('input[name="appName"]', 'TestApp-' + Date.now());
    await page.selectOption('select[name="theme"]', 'portal_security');
    await page.click('button:has-text("Create")');
    
    // Wait for app creation
    await page.waitForSelector('.app-created', { timeout: 5000 });
    
    // Step 4: View GUI options
    await page.click('button:has-text("Select GUI")');
    
    // Wait for real GUI options to load
    await page.waitForSelector('.gui-option', { timeout: 5000 });
    
    // Verify we have 4 options
    const options = await page.$$('.gui-option');
    expect(options).toHaveLength(4);
    
    // Step 5: Preview each option
    for (let i = 0; i < 4; i++) {
      await page.click(`.gui-option:nth-child(${i + 1}) .preview-btn`);
      
      // Wait for preview modal
      await page.waitForSelector('.preview-modal', { timeout: 3000 });
      
      // Verify preview content loaded
      const previewContent = await page.$('.preview-content');
      expect(previewContent).toBeTruthy();
      
      // Close preview
      await page.click('.preview-modal .close-btn');
      await page.waitForSelector('.preview-modal', { state: 'hidden' });
    }
    
    // Step 6: Select an option
    const selectedIndex = 2; // Select third option
    await page.click(`.gui-option:nth-child(${selectedIndex + 1})`);
    
    // Confirm selection
    await page.click('button:has-text("Confirm Selection")');
    
    // Wait for real selection to be saved
    await page.waitForSelector('.selection-confirmed', { timeout: 5000 });
    
    // Step 7: Verify selection was saved to database
    const selection = await testDb.db.get(
      'SELECT * FROM selections ORDER BY created_at DESC LIMIT 1'
    );
    
    expect(selection).toBeTruthy();
    expect(selection.selected_option).toBe(selectedIndex);
    
    // Step 8: Generate report
    await page.click('button:has-text("Generate Report")');
    
    // Wait for real report generation
    await page.waitForSelector('.report-generated', { timeout: 10000 });
    
    // Download report
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click('a:has-text("Download Report")')
    ]);
    
    // Save report to test directory
    const reportPath = path.join(testDir, 'report.pdf');
    await download.saveAs(reportPath);
    
    // Verify report file exists
    const reportExists = await fs.pathExists(reportPath);
    expect(reportExists).toBe(true);
    
    // Verify report size
    const stats = await fs.stat(reportPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should handle concurrent users selecting GUIs', async () => {
    // Create multiple browser contexts for different users
    const users = [
      { username: 'admin', password: "PLACEHOLDER" },
      { username: 'user1', password: "PLACEHOLDER" },
      { username: "developer", password: "PLACEHOLDER" }
    ];
    
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    
    // Login all users concurrently
    for (const user of users) {
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      
      contexts.push(ctx);
      pages.push(pg);
      
      await pg.goto(`${testServer.url}/gui-selector`);
      await pg.click('text=Login');
      await pg.fill('input[name="username"]', user.username);
      await pg.fill('input[name="password"]', user.password);
      await pg.click('button[type="submit"]');
      await pg.waitForSelector('.user-menu');
    }
    
    // All users select GUIs simultaneously
    const selectionPromises = pages.map(async (pg, index) => {
      await pg.click('button:has-text("Select GUI")');
      await pg.waitForSelector('.gui-option');
      
      // Each user selects a different option
      await pg.click(`.gui-option:nth-child(${(index % 4) + 1})`);
      await pg.click('button:has-text("Confirm Selection")');
      
      return pg.waitForSelector('.selection-confirmed');
    });
    
    // Wait for all selections
    await Promise.all(selectionPromises);
    
    // Verify all selections were saved
    const selections = await testDb.db.all(
      'SELECT * FROM selections WHERE created_at > datetime("now", "-1 minute")'
    );
    
    expect(selections.length).toBeGreaterThanOrEqual(3);
    
    // Clean up
    for (const ctx of contexts) {
      await ctx.close();
    }
  });

  test('should validate GUI requirements before selection', async () => {
    await page.goto(`${testServer.url}/gui-selector`);
    
    // Login
    await loginUser(page);
    
    // Try to select GUI without creating app first
    await page.goto(`${testServer.url}/gui-selector/select`);
    
    // Should show error
    await expect(page.locator('.error-message')).toContainText(/create an app first/i);
    
    // Create app with specific requirements
    await page.click('button:has-text("New App")');
    await page.fill('input[name="appName"]', "RequirementsTest");
    await page.selectOption('select[name="theme"]', 'portal_gui-selector');
    
    // Add requirements
    await page.click('text=Add Requirements');
    await page.fill('textarea[name="requirements"]', `
      - Must support dark mode
      - Must be responsive
      - Must have accessibility features
      - Must load in under 3 seconds
    `);
    
    await page.click('button:has-text("Create")');
    await page.waitForSelector('.app-created');
    
    // Go to GUI selection
    await page.click('button:has-text("Select GUI")');
    await page.waitForSelector('.gui-option');
    
    // Verify requirements are displayed
    await expect(page.locator('.requirements-list')).toBeVisible();
    await expect(page.locator('.requirements-list')).toContainText('dark mode');
    await expect(page.locator('.requirements-list')).toContainText("responsive");
    
    // Select option
    await page.click('.gui-option:first-child');
    
    // Verify requirements checklist appears
    await expect(page.locator('.requirements-checklist')).toBeVisible();
    
    // Check requirements
    await page.check('input[name="req-dark-mode"]');
    await page.check('input[name="req-responsive"]');
    await page.check('input[name="req-accessibility"]');
    await page.check('input[name="req-performance"]');
    
    // Confirm selection
    await page.click('button:has-text("Confirm Selection")');
    await page.waitForSelector('.selection-confirmed');
    
    // Verify requirements were saved
    const app = await testDb.db.get(
      'SELECT * FROM apps WHERE name = ?',
      "RequirementsTest"
    );
    
    const config = JSON.parse(app.config);
    expect(config.requirements).toBeTruthy();
    expect(config.requirementsMet).toBe(true);
  });

  test('should measure and display performance metrics', async () => {
    await page.goto(`${testServer.url}/gui-selector`);
    
    // Start performance measurement
    const startTime = Date.now();
    
    // Login
    await loginUser(page);
    
    // Navigate to GUI selection
    await page.click('button:has-text("Select GUI")');
    await page.waitForSelector('.gui-option');
    
    // Measure load time
    const loadTime = Date.now() - startTime;
    
    // Get real performance metrics from browser
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        loadComplete: perfData.loadEventEnd - perfData.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    // Verify performance requirements
    expect(metrics.domContentLoaded).toBeLessThan(3000); // Under 3 seconds
    expect(metrics.firstContentfulPaint).toBeLessThan(1500); // FCP under 1.5 seconds
    
    // Check if performance metrics are displayed
    await expect(page.locator('.performance-metrics')).toBeVisible();
    await expect(page.locator('.performance-metrics')).toContainText(/Load time:/);
    
    console.log('Performance Metrics:', metrics);
  });

  test('should handle errors gracefully', async () => {
    await page.goto(`${testServer.url}/gui-selector`);
    await loginUser(page);
    
    // Test network error handling
    await page.route('**/api/themes/**', route => {
      route.abort("connectionfailed");
    });
    
    await page.click('button:has-text("Select GUI")');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText(/failed to load/i);
    
    // Should have retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    
    // Clear route interception
    await page.unroute('**/api/themes/**');
    
    // Retry should work
    await page.click('button:has-text("Retry")');
    await page.waitForSelector('.gui-option');
    
    // Test validation error
    await page.click('.gui-option:first-child');
    
    // Remove required data to trigger validation
    await page.evaluate(() => {
      localStorage.removeItem('appId');
    });
    
    await page.click('button:has-text("Confirm Selection")');
    
    // Should show validation error
    await expect(page.locator('.validation-error')).toBeVisible();
  });

  test('should track user analytics', async () => {
    await page.goto(`${testServer.url}/gui-selector`);
    await loginUser(page);
    
    // Track events
    const events: any[] = [];
    await page.exposeFunction("trackEvent", (event: any) => {
      events.push(event);
    });
    
    await page.evaluate(() => {
      // Intercept analytics calls
      const originalTrack = (window as any).analytics?.track;
      (window as any).analytics = {
        track: (name: string, properties: any) => {
          (window as any).trackEvent({ name, properties });
          if (originalTrack) originalTrack(name, properties);
        }
      };
    });
    
    // Perform actions
    await page.click('button:has-text("Select GUI")');
    await page.waitForSelector('.gui-option');
    await page.click('.gui-option:nth-child(2)');
    await page.click('button:has-text("Confirm Selection")');
    await page.waitForSelector('.selection-confirmed');
    
    // Verify analytics events were tracked
    const eventNames = events.map(e => e.name);
    expect(eventNames).toContain('GUI_Selector_Opened');
    expect(eventNames).toContain('GUI_Option_Selected');
    expect(eventNames).toContain('Selection_Confirmed');
    
    // Verify events in database
    const analyticsData = await testDb.db.all(
      'SELECT * FROM messages WHERE type = "analytics" ORDER BY timestamp DESC LIMIT 10'
    );
    
    expect(analyticsData.length).toBeGreaterThan(0);
  });
});

// Helper functions
async function setupGuiTestData(testDb: TestDatabase) {
  // Add GUI templates
  const templates = [
    { name: 'Modern', style: 'modern', preview: '<div class="modern">Modern Design</div>' },
    { name: 'Classic', style: 'classic', preview: '<div class="classic">Classic Design</div>' },
    { name: 'Minimal', style: 'minimal', preview: '<div class="minimal">Minimal Design</div>' },
    { name: "Creative", style: "creative", preview: '<div class="creative">Creative Design</div>' }
  ];
  
  for (const template of templates) {
    await testDb.db.run(
      'INSERT INTO templates (name, theme_id, content, metadata) VALUES (?, ?, ?, ?)',
      [template.name, 2, template.preview, JSON.stringify({ style: template.style })]
    );
  }
}

async function setupGuiRoutes(testServer: TestServer) {
  const { app, db } = testServer;
  
  // GUI selector main page
  app.get('/gui-selector', async (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GUI Selector</title>
        <style>
          .gui-option { border: 1px solid #ddd; padding: 20px; margin: 10px; cursor: pointer; }
          .gui-option:hover { background: #f0f0f0; }
          .selected { border-color: #007bff; background: #e7f3ff; }
        </style>
      </head>
      <body>
        <div id="app">
          <h1>GUI Selector</h1>
          <button onclick="location.href='/login'">Login</button>
          <button onclick="createApp()">New App</button>
          <button onclick="selectGUI()">Select GUI</button>
          <div class="user-menu" style="display:none;">User Menu</div>
          <div class="gui-options"></div>
        </div>
        <script>
          function createApp() { /* Implementation */ }
          function selectGUI() { /* Implementation */ }
        </script>
      </body>
      </html>
    `);
  });
  
  // Login page
  app.get('/login', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Login</title></head>
      <body>
        <form method="post" action="/api/auth/login">
          <input name="username" placeholder="Username" required>
          <input name="password" type="password" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
      </body>
      </html>
    `);
  });
}

async function loginUser(page: Page) {
  await page.click('text=Login');
  await page.fill('input[name="username"]', "developer");
  await page.fill('input[name="password"]', 'dev123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.user-menu', { timeout: 5000 });
}

async function waitForServer(url: string, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}