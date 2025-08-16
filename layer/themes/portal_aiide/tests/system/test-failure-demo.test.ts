/**
 * Test Failure Demonstration
 * This test demonstrates that our tests properly fail when expected elements change
 */

import { test, expect } from '@playwright/test';

test.describe('Test Failure Verification', () => {
  test('should fail when expected element is missing', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // This should pass - the app exists
    await page.waitForSelector('.aiide-app', { timeout: 5000 });
    console.log('✓ Found .aiide-app');
    
    // This should FAIL - we don't have this data-testid
    try {
      await page.waitForSelector('[data-testid="non-existent-button"]', { timeout: 3000 });
      console.log('✗ PROBLEM: Found non-existent element (test should have failed!)');
    } catch (error) {
      console.log('✓ Correctly failed to find non-existent element');
      throw error; // Re-throw to make test fail as expected
    }
  });

  test('should fail when element text doesn\'t match', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.aiide-app', { timeout: 5000 });
    
    // Try to find text that doesn't exist
    const toolbar = page.locator('.toolbar');
    
    // This should fail because the text doesn't match
    await expect(toolbar).toContainText('This text definitely does not exist');
  });

  test('should fail when element property doesn\'t match', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.aiide-app', { timeout: 5000 });
    
    // Check if a button is disabled when it's actually enabled
    const firstButton = page.locator('button').first();
    
    // This should fail if the button is not disabled
    await expect(firstButton).toBeDisabled();
  });
});