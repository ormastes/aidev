/**
 * Test Helpers for Playwright Click-Based Tests
 */

import { Page, Locator } from '@playwright/test'

export class PortalTestHelper {
  constructor(private page: Page) {}

  /**
   * Select a project from the dropdown
   */
  async selectProject(projectName: string | RegExp) {
    const selector = this.page.locator('select#project')
    await selector.selectOption({ label: projectName })
    await this.page.waitForTimeout(1000) // Wait for UI update
  }

  /**
   * Open a service modal by clicking its card
   */
  async openService(serviceName: string) {
    const card = this.page.locator('.service-card', { hasText: serviceName })
    await card.click()
    await this.page.waitForSelector('#serviceModal', { state: 'visible' })
  }

  /**
   * Close the currently open modal
   */
  async closeModal(method: 'button' | 'escape' | 'background' = 'escape') {
    const modal = this.page.locator('#serviceModal')
    
    switch (method) {
      case 'button':
        await this.page.locator('.close-btn').click()
        break
      case 'escape':
        await this.page.keyboard.press('Escape')
        break
      case 'background':
        await modal.click({ position: { x: 10, y: 10 } })
        break
    }
    
    await modal.waitFor({ state: 'hidden' })
  }

  /**
   * Get all visible service cards
   */
  async getServiceCards(): Promise<string[]> {
    const cards = await this.page.locator('.service-card .service-name').allTextContents()
    return cards
  }

  /**
   * Check if modal is open
   */
  async isModalOpen(): Promise<boolean> {
    const modal = this.page.locator('#serviceModal')
    return await modal.isVisible()
  }

  /**
   * Get iframe content from modal
   */
  async getModalIframeContent(): Promise<string | null> {
    const frame = this.page.frameLocator('#modalBody iframe').first()
    try {
      const content = await frame.locator('body').textContent()
      return content
    } catch {
      return null
    }
  }

  /**
   * Take a named screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/${name}.png`,
      fullPage: true 
    })
  }

  /**
   * Wait for services to load after project selection
   */
  async waitForServices(expectedCount: number = 8) {
    await this.page.waitForSelector('.service-card', { state: 'visible' })
    await this.page.waitForFunction(
      (count) => document.querySelectorAll('.service-card').length === count,
      expectedCount,
      { timeout: 5000 }
    )
  }
}

/**
 * Utility to simulate user interactions
 */
export class UserSimulator {
  constructor(private page: Page) {}

  /**
   * Simulate slow typing
   */
  async slowType(selector: string, text: string, delay: number = 100) {
    const input = this.page.locator(selector)
    await input.click()
    await input.type(text, { delay })
  }

  /**
   * Simulate mouse movement to element
   */
  async moveToElement(selector: string) {
    const element = this.page.locator(selector)
    const box = await element.boundingBox()
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    }
  }

  /**
   * Simulate click with delay
   */
  async clickWithDelay(selector: string, delay: number = 500) {
    await this.moveToElement(selector)
    await this.page.waitForTimeout(delay)
    await this.page.click(selector)
  }

  /**
   * Simulate user browsing pattern
   */
  async browseServices(services: string[], helper: PortalTestHelper) {
    for (const service of services) {
      // Move to service card
      await this.moveToElement(`.service-card:has-text("${service}")`)
      await this.page.waitForTimeout(300)
      
      // Click to open
      await helper.openService(service)
      await this.page.waitForTimeout(1000)
      
      // Take screenshot
      await helper.screenshot(`browse-${service.toLowerCase().replace(' ', '-')}`)
      
      // Close modal
      await helper.closeModal('escape')
      await this.page.waitForTimeout(500)
    }
  }
}

/**
 * Project data for testing
 */
export const TEST_PROJECTS = {
  GUI_SELECTOR: /Portal Gui Selector/i,
  STORY_REPORTER: /Infra Story Reporter/i,
  PORTAL_AIDEV: /Portal Aidev/i,
  ROOT: /AI Dev Platform \(Root\)/i,
  SECURITY: /Portal Security/i
}

export const TEST_SERVICES = {
  TASK_QUEUE: 'Task Queue Manager',
  FEATURE_VIEWER: 'Feature Viewer',
  GUI_SELECTOR: 'GUI Selector',
  STORY_REPORTER: 'Story Reporter',
  LOG_VIEWER: 'Log Viewer',
  TEST_RUNNER: 'Test Runner',
  COVERAGE: 'Coverage Report',
  SECURITY: 'Security Config'
}

/**
 * Wait utilities
 */
export async function waitForAnimation(page: Page) {
  await page.waitForTimeout(300) // Standard CSS animation time
}

export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle')
}

/**
 * Assertion helpers
 */
export async function expectModalToContain(page: Page, text: string) {
  const frame = page.frameLocator('#modalBody iframe').first()
  const content = await frame.locator('body').textContent()
  if (!content?.includes(text)) {
    throw new Error(`Modal does not contain text: ${text}`)
  }
}