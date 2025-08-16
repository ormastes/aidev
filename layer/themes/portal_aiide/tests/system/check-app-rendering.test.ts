/**
 * Check if app is rendering and identify any errors
 */

import { test, expect } from '@playwright/test';

test('debug: check app rendering and console errors', async ({ page }) => {
  // Listen for console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  // Listen for page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  // Navigate to the app
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');
  
  // Wait a bit for any async rendering
  await page.waitForTimeout(2000);
  
  // Check what's actually on the page
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('Body HTML length:', bodyHTML.length);
  console.log('First 500 chars:', bodyHTML.substring(0, 500));
  
  // Check for specific elements
  const hasRoot = await page.locator('#root').count();
  console.log('Has #root element:', hasRoot > 0);
  
  const hasAiideApp = await page.locator('.aiide-app').count();
  console.log('Has .aiide-app element:', hasAiideApp > 0);
  
  // Check for any error messages on page
  const errorElements = await page.locator('text=/error/i').count();
  console.log('Error elements found:', errorElements);
  
  // Log console messages
  if (consoleMessages.length > 0) {
    console.log('\nConsole messages:');
    consoleMessages.forEach(msg => console.log('  ', msg));
  }
  
  // Log page errors
  if (pageErrors.length > 0) {
    console.log('\nPage errors:');
    pageErrors.forEach(err => console.log('  ', err));
  }
  
  // Try to take a screenshot for debugging
  await page.screenshot({ path: 'debug-screenshot.png' });
  console.log('\nScreenshot saved as debug-screenshot.png');
  
  // This test should pass if the page loads at all
  expect(hasRoot).toBeGreaterThan(0);
});