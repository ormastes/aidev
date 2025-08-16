import { test, expect } from '@playwright/test';

test.describe('Mate Dealer Complete E2E Tests - Click Based', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3303');
  });

  test('Complete customer journey with navigation clicks', async ({ page }) => {
    // Step 1: Verify login page loads
    await expect(page.locator('.login-title')).toContainText('Mate Dealer');
    
    // Step 2: Click on customer role (should be selected by default)
    const customerRadio = page.locator('input[value="customer"]');
    await expect(customerRadio).toBeChecked();
    
    // Step 3: Click email field and type
    await page.click('input[name="email"]');
    await page.fill('input[name="email"]', ''); // Clear first
    await page.type('input[name="email"]', 'demo@example.com');
    
    // Step 4: Click password field and type
    await page.click('input[name="password"]');
    await page.fill('input[name="password"]', ''); // Clear first
    await page.type('input[name="password"]', 'demo123');
    
    // Step 5: Click login button
    await page.click('button[type="submit"]');
    
    // Step 6: Wait for dashboard and verify navigation loaded
    await page.waitForURL('**/customer/dashboard');
    await expect(page.locator('h1')).toContainText('Find Your Perfect Mate Dealer');
    await expect(page.locator('.navigation')).toBeVisible();
    
    // Step 7: Test search functionality with clicks
    await page.click('.search-input');
    await page.type('.search-input', 'Traditional');
    await page.waitForTimeout(500); // Wait for debounced search
    
    // Step 8: Click filter button
    await page.click('.filter-toggle');
    await expect(page.locator('.filter-panel')).toBeVisible();
    
    // Step 9: Adjust distance filter
    await page.click('input[type="range"]');
    
    // Step 10: Click rating filter
    await page.click('.rating-btn:has-text("4+")');
    
    // Step 11: Clear filters
    await page.click('.clear-filters-btn');
    
    // Step 12: Click on a dealer card
    const dealerCard = page.locator('.dealer-card').first();
    await dealerCard.click();
    
    // Step 13: Click favorite button
    await page.click('.favorite-button').first();
    
    // Step 14: Navigate to other pages via sidebar
    await page.click('.nav-link:has-text("My Orders")');
    await expect(page).toHaveURL('**/customer/orders');
    await expect(page.locator('.placeholder-page')).toContainText('Orders - Coming Soon');
    
    // Step 15: Click Favorites nav
    await page.click('.nav-link:has-text("Favorites")');
    await expect(page).toHaveURL('**/customer/favorites');
    
    // Step 16: Click Profile nav
    await page.click('.nav-link:has-text("Profile")');
    await expect(page).toHaveURL('**/customer/profile');
    
    // Step 17: Go back to dashboard
    await page.click('.nav-link:has-text("Find Dealers")');
    await expect(page).toHaveURL('**/customer/dashboard');
    
    // Step 18: Click logout
    await page.click('.nav-logout');
    await expect(page).toHaveURL('**/login');
  });

  test('Complete dealer journey with all navigation clicks', async ({ page }) => {
    // Step 1: Click on dealer role radio button
    await page.click('input[value="dealer"]');
    
    // Step 2: Verify dealer is selected
    const dealerRadio = page.locator('input[value="dealer"]');
    await expect(dealerRadio).toBeChecked();
    
    // Step 3: Login with demo credentials
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Step 4: Wait for dealer dashboard
    await page.waitForURL('**/dealer/dashboard');
    await expect(page.locator('h1')).toContainText('Dealer Dashboard');
    
    // Step 5: Verify metrics cards are clickable
    await page.click('.metric-card.clickable');
    
    // Step 6: Click through all tabs
    await page.click('.tab:has-text("Products")');
    await expect(page.locator('.products-section')).toBeVisible();
    
    await page.click('.tab:has-text("Customers")');
    await expect(page.locator('.customers-section')).toBeVisible();
    
    await page.click('.tab:has-text("Analytics")');
    await expect(page.locator('.analytics-section')).toBeVisible();
    
    await page.click('.tab:has-text("Overview")');
    await expect(page.locator('.overview-section')).toBeVisible();
    
    // Step 7: Click quick action buttons
    await page.click('.action-button:has-text("Add New Product")');
    await page.click('.action-button:has-text("View Orders")');
    await page.click('.action-button:has-text("Export Data")');
    
    // Step 8: Navigate through sidebar
    await page.click('.nav-link:has-text("Products")');
    await expect(page).toHaveURL('**/dealer/products');
    
    await page.click('.nav-link:has-text("Orders")');
    await expect(page).toHaveURL('**/dealer/orders');
    
    await page.click('.nav-link:has-text("Customers")');
    await expect(page).toHaveURL('**/dealer/customers');
    
    await page.click('.nav-link:has-text("Analytics")');
    await expect(page).toHaveURL('**/dealer/analytics');
    
    await page.click('.nav-link:has-text("Profile")');
    await expect(page).toHaveURL('**/dealer/profile');
    
    // Step 9: Return to dashboard
    await page.click('.nav-link:has-text("Dashboard")');
    
    // Step 10: Logout
    await page.click('.nav-logout');
    await expect(page).toHaveURL('**/login');
  });

  test('Mobile responsive navigation with clicks', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as customer
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for mobile header
    await page.waitForSelector('.mobile-nav-header');
    
    // Click hamburger menu
    await page.click('.mobile-nav-toggle');
    
    // Verify mobile menu overlay is visible
    await expect(page.locator('.mobile-nav-overlay')).toBeVisible();
    
    // Click navigation items
    await page.click('.nav-link:has-text("My Orders")');
    await expect(page).toHaveURL('**/customer/orders');
    
    // Menu should auto-close on navigation
    await expect(page.locator('.mobile-nav-overlay')).not.toBeVisible();
    
    // Open menu again
    await page.click('.mobile-nav-toggle');
    
    // Click outside to close
    await page.click('.mobile-nav-overlay');
    await expect(page.locator('.mobile-nav-overlay')).not.toBeVisible();
  });

  test('Enhanced search and filter with all click interactions', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('.dealer-card');
    
    // Test search with suggestions
    await page.click('.search-input');
    await page.type('.search-input', 'Tra');
    
    // Wait for suggestions to appear
    await page.waitForSelector('.search-suggestions');
    
    // Click a suggestion
    await page.click('.suggestion-item:first-child');
    
    // Clear search
    await page.click('.clear-search');
    
    // Open filters
    await page.click('.filter-toggle');
    
    // Test price range slider
    const priceSlider = page.locator('.range-slider').first();
    await priceSlider.click();
    
    // Test distance slider
    const distanceSlider = page.locator('input[type="range"]').nth(2);
    await distanceSlider.click();
    
    // Click rating buttons
    await page.click('.rating-btn:has-text("3+")');
    await page.click('.rating-btn:has-text("5+")');
    
    // Select categories
    await page.click('.checkbox-label:has-text("Traditional")');
    await page.click('.checkbox-label:has-text("Organic")');
    
    // Select availability
    await page.click('.radio-label:has-text("Available")');
    
    // Verify filter badge count
    await expect(page.locator('.filter-badge')).toBeVisible();
    
    // Clear all filters
    await page.click('.clear-filters-btn');
    
    // Close filter panel
    await page.click('.filter-toggle');
    await expect(page.locator('.filter-panel')).not.toBeVisible();
  });

  test('Debug panel toggle with keyboard shortcut', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Press Ctrl+Shift+D to open debug panel
    await page.keyboard.press('Control+Shift+D');
    
    // Verify debug panel is visible
    await expect(page.locator('.overlay')).toBeVisible();
    await expect(page.locator('h2:has-text("Debug Panel")')).toBeVisible();
    
    // Click through tabs
    await page.click('.tab:has-text("Performance")');
    await expect(page.locator('.performance-container')).toBeVisible();
    
    await page.click('.tab:has-text("Network")');
    await expect(page.locator('.network-container')).toBeVisible();
    
    await page.click('.tab:has-text("Logs")');
    
    // Toggle auto-refresh
    await page.click('input[type="checkbox"]');
    
    // Clear logs
    await page.click('.clear-button');
    
    // Close debug panel
    await page.click('.close-button');
    await expect(page.locator('.overlay')).not.toBeVisible();
  });

  test('Error handling and validation clicks', async ({ page }) => {
    // Try login with empty fields
    await page.click('button[type="submit"]');
    
    // Fill only email
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Try invalid credentials
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should see error message
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('Double-click and keyboard interactions', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Double-click dealer card
    const dealerCard = page.locator('.dealer-card').first();
    await dealerCard.dblclick();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Use arrow keys in navigation
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  });

  test('All placeholder pages are accessible', async ({ page }) => {
    // Login as customer
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Check all customer pages
    const customerPages = ['orders', 'favorites', 'profile'];
    for (const pageName of customerPages) {
      await page.click(`.nav-link[href="/customer/${pageName}"]`);
      await expect(page).toHaveURL(`**/customer/${pageName}`);
      await expect(page.locator('.placeholder-page')).toBeVisible();
    }
    
    // Logout and login as dealer
    await page.click('.nav-logout');
    await page.click('input[value="dealer"]');
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Check all dealer pages
    const dealerPages = ['products', 'orders', 'customers', 'analytics', 'profile'];
    for (const pageName of dealerPages) {
      await page.click(`.nav-link[href="/dealer/${pageName}"]`);
      await expect(page).toHaveURL(`**/dealer/${pageName}`);
      await expect(page.locator('.placeholder-page')).toBeVisible();
    }
  });
});