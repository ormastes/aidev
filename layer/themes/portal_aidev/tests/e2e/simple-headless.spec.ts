/**
 * Simple Headless Test for AI Dev Portal
 * Minimal test to verify Playwright setup works
 */

import { test, expect } from '@playwright/test'

test('portal loads successfully', async ({ page }) => {
  // Navigate to portal
  await page.goto('http://localhost:3156', { waitUntil: 'domcontentloaded' })
  
  // Check page title contains expected text
  const title = await page.title()
  expect(title).toContain('AI Dev Portal')
  
  // Check main heading exists
  const heading = await page.locator('h1').first().textContent()
  expect(heading).toContain('AI Dev Portal')
  
  // Check project selector exists
  const selector = await page.locator('select#project').isVisible()
  expect(selector).toBe(true)
  
  console.log('✅ Portal loaded successfully')
})