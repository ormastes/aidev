import { test, expect } from '@playwright/test';

test.describe('Mate Dealer Click-Based E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3303');
  });

  test('Complete customer journey with clicks', async ({ page }) => {
    // Step 1: Click on customer role (should be selected by default)
    const customerRadio = page.locator('input[value="customer"]');
    await expect(customerRadio).toBeChecked();
    
    // Step 2: Click email field and type
    await page.click('input[name="email"]');
    await page.type('input[name="email"]', 'test.customer@example.com');
    
    // Step 3: Click password field and type
    await page.click('input[name="password"]');
    await page.type('input[name="password"]', 'demo123');
    
    // Step 4: Click login button
    await page.click('button[type="submit"]');
    
    // Step 5: Wait for dashboard and verify
    await page.waitForURL('**/customer/dashboard');
    await expect(page.locator('h1')).toContainText('Find Your Perfect Mate Dealer');
    
    // Step 6: Click on first dealer card
    const firstDealer = page.locator('.dealer-card').first();
    await firstDealer.click();
    
    // Step 7: Verify dealer details are shown
    await expect(page.locator('.dealer-profile')).toBeVisible();
    
    // Step 8: Click contact dealer button
    await page.click('button:has-text("Contact Dealer")');
    
    // Step 9: Verify contact form or action
    await expect(page.locator('.contact-form, .contact-modal')).toBeVisible();
  });

  test('Complete dealer journey with clicks', async ({ page }) => {
    // Step 1: Click on dealer role radio button
    await page.click('input[value="dealer"]');
    
    // Step 2: Verify dealer is selected
    const dealerRadio = page.locator('input[value="dealer"]');
    await expect(dealerRadio).toBeChecked();
    
    // Step 3: Click and fill email
    await page.click('input[name="email"]');
    await page.type('input[name="email"]', 'test.dealer@example.com');
    
    // Step 4: Click and fill password
    await page.click('input[name="password"]');
    await page.type('input[name="password"]', 'demo123');
    
    // Step 5: Click login button
    await page.click('button[type="submit"]');
    
    // Step 6: Wait for dealer dashboard
    await page.waitForURL('**/dealer/dashboard');
    await expect(page.locator('h1')).toContainText('Dealer Dashboard');
    
    // Step 7: Click on inventory management
    await page.click('a:has-text("Inventory"), button:has-text("Inventory")');
    
    // Step 8: Click add product button
    await page.click('button:has-text("Add Product")');
    
    // Step 9: Fill product form
    await page.click('input[name="productName"]');
    await page.type('input[name="productName"]', 'Premium Yerba Mate');
    
    await page.click('input[name="price"]');
    await page.type('input[name="price"]', '25.99');
    
    // Step 10: Save product
    await page.click('button:has-text("Save Product")');
    
    // Step 11: Verify product was added
    await expect(page.locator('text=Premium Yerba Mate')).toBeVisible();
  });

  test('Navigation between roles with clicks', async ({ page }) => {
    // Start as customer
    await page.click('input[value="customer"]');
    await page.fill('input[name="email"]', 'nav.test@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Verify on customer dashboard
    await expect(page).toHaveURL(/.*customer.*/);
    
    // Click logout
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
    
    // Should be back at login
    await expect(page).toHaveURL('http://localhost:3303');
    
    // Now login as dealer
    await page.click('input[value="dealer"]');
    await page.fill('input[name="email"]', 'nav.dealer@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Verify on dealer dashboard
    await expect(page).toHaveURL(/.*dealer.*/);
  });

  test('Responsive menu clicks on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login
    await page.fill('input[name="email"]', 'mobile@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Click hamburger menu (if exists)
    const hamburger = page.locator('.hamburger-menu, .mobile-menu-toggle');
    if (await hamburger.isVisible()) {
      await hamburger.click();
      
      // Verify menu is open
      await expect(page.locator('.mobile-menu, .nav-menu')).toBeVisible();
      
      // Click a menu item
      await page.click('.mobile-menu a:first-child, .nav-menu a:first-child');
    }
  });

  test('Filter and search dealers with clicks', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', 'search@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('.dealer-card');
    
    // Click on search input
    const searchInput = page.locator('input[placeholder*="Search"], input[name="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.type('Premium');
      
      // Click search button or wait for auto-search
      const searchBtn = page.locator('button:has-text("Search")');
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
      }
      
      // Wait for filtered results
      await page.waitForTimeout(500);
    }
    
    // Click on filter dropdown
    const filterDropdown = page.locator('select[name="filter"], .filter-dropdown');
    if (await filterDropdown.isVisible()) {
      await filterDropdown.click();
      await page.click('option:has-text("Nearest")');
    }
    
    // Verify results updated
    await expect(page.locator('.dealer-card').first()).toBeVisible();
  });

  test('Add to favorites with double-click', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', 'favorites@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Double-click on dealer card to favorite
    const firstDealer = page.locator('.dealer-card').first();
    await firstDealer.dblclick();
    
    // Check if favorite icon appears or changes
    const favoriteIcon = firstDealer.locator('.favorite-icon, .heart-icon');
    await expect(favoriteIcon).toHaveClass(/active|filled/);
  });

  test('Keyboard navigation test', async ({ page }) => {
    // Focus on email field with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.type('keyboard@example.com');
    
    // Tab to password
    await page.keyboard.press('Tab');
    await page.keyboard.type('demo123');
    
    // Tab to submit and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Skip role selection
    await page.keyboard.press('Enter');
    
    // Should navigate to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });
});

test.describe('GUI Selector Integration', () => {
  test('Apply selected template to mate dealer', async ({ page, context }) => {
    // Open GUI selector in new tab
    const guiPage = await context.newPage();
    await guiPage.goto('http://localhost:3456');
    
    // Login to GUI selector
    await guiPage.click('button#auth-btn');
    await guiPage.fill('#login-username', 'admin');
    await guiPage.fill('#login-password', 'admin123');
    await guiPage.click('button[type="submit"]');
    
    // Select Modern template
    await guiPage.click('.template-card:has-text("Modern")');
    await guiPage.click('#select-template-btn');
    
    // Return to mate dealer
    await page.goto('http://localhost:3303');
    
    // Verify modern template styles are applied
    const hasModernStyles = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue('--primary-color') === '#2563eb';
    });
    
    expect(hasModernStyles).toBeTruthy();
  });
});