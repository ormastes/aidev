/**
 * Click-based Tests for AI Dev Portal
 * Tests all user interactions through actual clicks and keyboard input
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration
const PORTAL_URL = 'http://localhost:3156'
const WAIT_TIMEOUT = 5000

test.describe('AI Dev Portal - Click-Based Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto(PORTAL_URL)
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.describe('Portal Loading', () => {
    test('should load portal homepage', async () => {
      // Check title
      await expect(page).toHaveTitle(/AI Dev Portal/)
      
      // Check main heading is visible
      const heading = page.locator('h1:has-text("AI Dev Portal")')
      await expect(heading).toBeVisible()
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/portal-homepage.png' })
    })

    test('should display project selector', async () => {
      // Find project selector
      const selector = page.locator('select#project')
      await expect(selector).toBeVisible()
      
      // Click to open dropdown
      await selector.click()
      
      // Check it has options
      const options = await selector.locator('option').count()
      expect(options).toBeGreaterThan(1) // More than just placeholder
    })
  })

  test.describe('Project Selection', () => {
    test('should select a project and show services', async () => {
      // Click project selector
      const selector = page.locator('select#project')
      await selector.click()
      
      // Select "Portal Gui Selector" project
      await selector.selectOption({ label: /Portal Gui Selector/i })
      
      // Wait for page to update
      await page.waitForTimeout(1000)
      
      // Check service cards appear
      await expect(page.locator('.service-card')).toHaveCount(8, { timeout: WAIT_TIMEOUT })
      
      // Take screenshot of selected project
      await page.screenshot({ path: 'test-results/project-selected.png' })
    })

    test('should persist project selection on reload', async () => {
      // Select a project
      const selector = page.locator('select#project')
      await selector.selectOption({ label: /Portal Aidev/i })
      
      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Check project is still selected
      const selectedValue = await selector.inputValue()
      expect(selectedValue).toBe('portal_aidev')
    })

    test('should show no-project message when cleared', async () => {
      // First select a project
      const selector = page.locator('select#project')
      await selector.selectOption({ label: /Portal Aidev/i })
      await page.waitForTimeout(500)
      
      // Then clear selection
      await selector.selectOption({ value: '' })
      await page.waitForTimeout(500)
      
      // Check for no-project message
      const noProjectMsg = page.locator('.no-project')
      await expect(noProjectMsg).toBeVisible()
      await expect(noProjectMsg).toContainText('Please select a project')
    })
  })

  test.describe('Service Cards', () => {
    test.beforeEach(async () => {
      // Select a project for all service tests
      const selector = page.locator('select#project')
      await selector.selectOption({ label: /Portal Gui Selector/i })
      await page.waitForTimeout(1000)
    })

    test('should display all service cards', async () => {
      // Check specific services are visible
      const services = [
        'Task Queue Manager',
        'Feature Viewer',
        'GUI Selector',
        'Story Reporter',
        'Test Runner',
        'Coverage Report'
      ]
      
      for (const serviceName of services) {
        const card = page.locator('.service-card', { hasText: serviceName })
        await expect(card).toBeVisible()
      }
    })

    test('should have clickable service cards', async () => {
      // Find GUI Selector card
      const guiCard = page.locator('.service-card', { hasText: 'GUI Selector' })
      
      // Check it's visible and clickable
      await expect(guiCard).toBeVisible()
      await expect(guiCard).toHaveCSS('cursor', 'pointer')
      
      // Hover over it
      await guiCard.hover()
      
      // Take screenshot of hover state
      await page.screenshot({ path: 'test-results/service-card-hover.png' })
    })
  })

  test.describe('Modal Interactions', () => {
    test.beforeEach(async () => {
      // Select project
      const selector = page.locator('select#project')
      await selector.selectOption({ label: /Portal Gui Selector/i })
      await page.waitForTimeout(1000)
    })

    test('should open modal when clicking service', async () => {
      // Click GUI Selector card
      const guiCard = page.locator('.service-card', { hasText: 'GUI Selector' })
      await guiCard.click()
      
      // Check modal is visible
      const modal = page.locator('#serviceModal')
      await expect(modal).toBeVisible({ timeout: WAIT_TIMEOUT })
      
      // Check modal has content
      const modalTitle = page.locator('#modalTitle')
      await expect(modalTitle).toBeVisible()
      
      // Check iframe is loaded
      const iframe = page.locator('#modalBody iframe')
      await expect(iframe).toBeVisible()
      
      // Take screenshot of open modal
      await page.screenshot({ path: 'test-results/modal-open.png', fullPage: true })
    })

    test('should close modal with X button', async () => {
      // Open modal
      const guiCard = page.locator('.service-card', { hasText: 'GUI Selector' })
      await guiCard.click()
      
      // Wait for modal
      const modal = page.locator('#serviceModal')
      await expect(modal).toBeVisible()
      
      // Click close button
      const closeBtn = page.locator('.close-btn')
      await closeBtn.click()
      
      // Check modal is hidden
      await expect(modal).not.toBeVisible()
    })

    test('should close modal with ESC key', async () => {
      // Open modal
      const storyCard = page.locator('.service-card', { hasText: 'Story Reporter' })
      await storyCard.click()
      
      // Wait for modal
      const modal = page.locator('#serviceModal')
      await expect(modal).toBeVisible()
      
      // Press ESC key
      await page.keyboard.press('Escape')
      
      // Check modal is hidden
      await expect(modal).not.toBeVisible()
    })

    test('should close modal by clicking background', async () => {
      // Open modal
      const taskCard = page.locator('.service-card', { hasText: 'Task Queue' })
      await taskCard.click()
      
      // Wait for modal
      const modal = page.locator('#serviceModal')
      await expect(modal).toBeVisible()
      
      // Click on modal background (outside content)
      await modal.click({ position: { x: 10, y: 10 } })
      
      // Check modal is hidden
      await expect(modal).not.toBeVisible()
    })
  })

  test.describe('GUI Selector Service', () => {
    test('should show GUI selector content in modal', async () => {
      // Select project and open GUI selector
      const selector = page.locator('select#project')
      await selector.selectOption({ label: /Portal Gui Selector/i })
      await page.waitForTimeout(1000)
      
      const guiCard = page.locator('.service-card', { hasText: 'GUI Selector' })
      await guiCard.click()
      
      // Wait for modal and iframe
      await expect(page.locator('#serviceModal')).toBeVisible()
      
      // Try to interact with iframe content
      const frame = page.frameLocator('#modalBody iframe').first()
      
      // Check for GUI selector content in iframe
      const iframeTitle = frame.locator('h1, h2').first()
      await expect(iframeTitle).toBeVisible({ timeout: WAIT_TIMEOUT })
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/gui-selector-content.png', fullPage: true })
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should navigate with Tab key', async () => {
      // Start from beginning
      await page.keyboard.press('Tab')
      
      // Should focus project selector
      const selector = page.locator('select#project')
      await expect(selector).toBeFocused()
      
      // Tab again after selecting project
      await selector.selectOption({ label: /Portal Aidev/i })
      await page.waitForTimeout(1000)
      
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should focus on first service card
      const firstCard = page.locator('.service-card').first()
      
      // Press Enter to activate
      await page.keyboard.press('Enter')
      
      // Modal should open
      const modal = page.locator('#serviceModal')
      await expect(modal).toBeVisible({ timeout: WAIT_TIMEOUT })
    })
  })

  test.describe('Multiple Service Tests', () => {
    test('should open different services sequentially', async () => {
      // Select project
      const selector = page.locator('select#project')
      await selector.selectOption({ label: /Infra Story Reporter/i })
      await page.waitForTimeout(1000)
      
      const servicesToTest = [
        { name: 'Task Queue', expectedTitle: /Task Queue/ },
        { name: 'Story Reporter', expectedTitle: /Story Reporter/ },
        { name: 'Feature Viewer', expectedTitle: /Feature/ }
      ]
      
      for (const service of servicesToTest) {
        // Click service
        const card = page.locator('.service-card', { hasText: service.name })
        await card.click()
        
        // Check modal opens
        const modal = page.locator('#serviceModal')
        await expect(modal).toBeVisible()
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/service-${service.name.toLowerCase().replace(' ', '-')}.png`,
          fullPage: true 
        })
        
        // Close modal
        await page.keyboard.press('Escape')
        await expect(modal).not.toBeVisible()
        
        // Wait before next service
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('Responsive Behavior', () => {
    test('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Check portal still loads
      await page.goto(PORTAL_URL)
      await expect(page.locator('h1:has-text("AI Dev Portal")')).toBeVisible()
      
      // Select project on mobile
      const selector = page.locator('select#project')
      await selector.selectOption({ label: /Portal Aidev/i })
      
      // Check services display
      await expect(page.locator('.service-card')).toHaveCount(8, { timeout: WAIT_TIMEOUT })
      
      // Take mobile screenshot
      await page.screenshot({ path: 'test-results/portal-mobile.png', fullPage: true })
    })

    test('should work on tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.goto(PORTAL_URL)
      const selector = page.locator('select#project')
      await selector.selectOption({ label: /Portal Security/i })
      
      // Check layout
      await expect(page.locator('.service-card')).toHaveCount(8)
      
      await page.screenshot({ path: 'test-results/portal-tablet.png', fullPage: true })
    })
  })
})