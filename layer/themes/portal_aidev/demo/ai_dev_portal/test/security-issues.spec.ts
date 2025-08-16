import { test, expect, Dialog } from '@playwright/test';

test.describe('Security and Edge Case Tests', () => {
  
  test('should handle XSS attempts in login', async ({ page }) => {
    await page.goto('/');
    
    // Try XSS in username
    await page.fill('#username', '<script>alert("XSS")</script>');
    await page.fill('#password', 'test');
    
    page.on('dialog', async (dialog: Dialog) => {
      // Check if it's an XSS alert (not a legitimate error message)
      if (dialog.message() === 'XSS') {
        throw new Error('XSS vulnerability detected!');
      }
      // Dismiss legitimate error alerts
      await dialog.dismiss();
    });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Should show error, not execute script
    await expect(page.locator('#login-page')).toBeVisible();
    
    // Also check that the script tag is not in the DOM
    const content = await page.content();
    expect(content).not.toContain('<script>alert("XSS")</script>');
  });

  test('should handle SQL injection attempts', async ({ page }) => {
    await page.goto('/');
    
    // Try SQL injection
    await page.fill('#username', "admin' OR '1'='1");
    await page.fill('#password', "' OR '1'='1");
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Should not log in
    await expect(page.locator('#login-page')).toBeVisible();
  });

  test('should enforce authentication on API endpoints', async ({ request }) => {
    // Try to access protected endpoint without token
    const response = await request.get('/api/projects');
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Access denied');
  });

  test('should handle very long inputs', async ({ page }) => {
    await page.goto('/');
    
    const longString = 'a'.repeat(10000);
    await page.fill('#username', longString);
    await page.fill('#password', longString);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Should handle gracefully
    await expect(page.locator('#login-page')).toBeVisible();
  });

  test('should handle concurrent login attempts', async ({ page, context }) => {
    const page2 = await context.newPage();
    
    await page.goto('/');
    await page2.goto('/');
    
    // Login on both pages simultaneously
    await Promise.all([
      page.fill('#username', 'admin'),
      page2.fill('#username', "developer")
    ]);
    
    await Promise.all([
      page.fill('#password', 'demo123'),
      page2.fill('#password', 'demo123')
    ]);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page2.click('button[type="submit"]')
    ]);
    
    // Both should succeed
    await expect(page.locator('nav')).toBeVisible();
    await expect(page2.locator('nav')).toBeVisible();
    
    await page2.close();
  });

  test('should handle rapid navigation clicks', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav');
    
    // Rapid clicks on navigation
    for (let i = 0; i < 10; i++) {
      await page.click('#projects-link');
      await page.click('#features-link');
      await page.click('#tasks-link');
      await page.click('#profile-link');
    }
    
    // Should still be UPDATING
    await expect(page.locator('nav')).toBeVisible();
    // Check that exactly one view is visible
    await expect(page.locator('.view:visible')).toHaveCount(1);
  });

  test('should handle missing form fields gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Try submitting without filling fields
    await page.click('button[type="submit"]');
    
    // Browser validation should prevent submission
    const usernameValid = await page.locator('#username').evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(usernameValid).toBe(false);
  });

  test('should maintain session across page refresh', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('#username', "developer");
    await page.fill('#password', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav');
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('nav')).toBeVisible();
    await page.click('#profile-link');
    await expect(page.locator('#profile-info')).toContainText("developer");
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Login first
    await page.goto('/');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav');
    
    // Block API calls
    await context.route('**/api/projects', route => route.abort());
    
    // Try to load projects
    await page.click('#projects-link');
    
    // Should still show UI, just no data
    await expect(page.locator('#projects-view')).toBeVisible();
  });
});