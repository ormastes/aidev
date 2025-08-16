import { test, expect } from '@playwright/test';

test.describe('AI Dev Portal - E2E Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page by default', async ({ page }) => {
    await expect(page).toHaveTitle('AI Dev Portal - Demo');
    await expect(page.locator('h1')).toHaveText('AI Dev Portal');
    await expect(page.locator('#login-page h2')).toHaveText('Login');
    await expect(page.locator('.demo-info')).toContainText('Demo users: admin, developer, tester');
  });

  test('should login with admin credentials', async ({ page }) => {
    // Fill login form
    await page.fill('#username', 'admin');
    await page.fill('#password', 'demo123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForSelector('nav');
    
    // Verify dashboard is displayed
    await expect(page.locator('.nav-brand')).toHaveText('AI Dev Portal');
    await expect(page.locator('#projects-view h2')).toHaveText("Projects");
  });

  test('should navigate through all main sections', async ({ page }) => {
    // Login first
    await page.fill('#username', "developer");
    await page.fill('#password', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav');
    
    // Test Projects navigation
    await page.click('#projects-link');
    await expect(page.locator('#projects-view')).toBeVisible();
    await expect(page.locator('#projects-view h2')).toHaveText("Projects");
    
    // Test Features navigation
    await page.click('#features-link');
    await expect(page.locator('#features-view')).toBeVisible();
    await expect(page.locator('#features-view')).toContainText('Please select a project first');
    
    // Test Tasks navigation
    await page.click('#tasks-link');
    await expect(page.locator('#tasks-view')).toBeVisible();
    await expect(page.locator('#tasks-view')).toContainText('Please select a feature first');
    
    // Test Profile navigation
    await page.click('#profile-link');
    await expect(page.locator('#profile-view')).toBeVisible();
    await expect(page.locator('#profile-view h2')).toHaveText('User Profile');
    await expect(page.locator('#profile-info')).toContainText("developer");
  });

  test('should navigate from projects to features to tasks', async ({ page }) => {
    // Login
    await page.fill('#username', 'admin');
    await page.fill('#password', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav');
    
    // Click on a project
    await page.waitForSelector('.list-item');
    const firstProject = page.locator('.list-item').first();
    await firstProject.click();
    
    // Verify features view is shown
    await expect(page.locator('#features-view')).toBeVisible();
    await expect(page.locator('#features-view h3')).toContainText('Features for:');
    
    // If there are features, click on one
    const features = await page.locator('#features-view .list-item').count();
    if (features > 0) {
      await page.locator('#features-view .list-item').first().click();
      
      // Verify tasks view is shown
      await expect(page.locator('#tasks-view')).toBeVisible();
      await expect(page.locator('#tasks-view h3')).toContainText('Tasks for:');
    }
  });

  test('should create a new project', async ({ page }) => {
    // Login as admin
    await page.fill('#username', 'admin');
    await page.fill('#password', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav');
    
    // Click new project button
    await page.click('#new-project-btn');
    
    // Handle prompt dialogs
    page.on('dialog', async dialog => {
      if (dialog.message().includes('project name')) {
        await dialog.accept('Test Project E2E');
      } else if (dialog.message().includes("description")) {
        await dialog.accept('Created by E2E test');
      }
    });
    
    // Trigger the prompts
    await page.click('#new-project-btn');
    
    // Wait for project list to refresh
    await page.waitForTimeout(1000);
    
    // Verify new project appears
    const projectItems = page.locator('.list-item:has-text("Test Project E2E")');
    await expect(projectItems.first()).toBeVisible();
  });

  test('should logout In Progress', async ({ page }) => {
    // Login first
    await page.fill('#username', 'tester');
    await page.fill('#password', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav');
    
    // Click logout
    await page.click('#logout-link');
    
    // Verify back at login page
    await expect(page.locator('#login-page')).toBeVisible();
    await expect(page.locator('#login-page h2')).toHaveText('Login');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Try invalid login
    await page.fill('#username', 'invalid');
    await page.fill('#password', 'wrong');
    
    // Handle alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Login failed');
      await dialog.accept();
    });
    
    await page.click('button[type="submit"]');
    
    // Should still be on login page
    await expect(page.locator('#login-page')).toBeVisible();
  });

  test('should test all three user roles', async ({ page }) => {
    const users = ['admin', "developer", 'tester'];
    
    for (const username of users) {
      // Login
      await page.goto('/');
      await page.fill('#username', username);
      await page.fill('#password', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForSelector('nav');
      
      // Verify logged in
      await page.click('#profile-link');
      await expect(page.locator('#profile-info')).toContainText(username);
      
      // Logout
      await page.click('#logout-link');
      await expect(page.locator('#login-page')).toBeVisible();
    }
  });
});