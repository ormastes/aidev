/**
 * Visual Regression Tests for AI Dev Portal
 * Captures screenshots for visual comparison
 */

import { test, expect } from '@playwright/test'
import { PortalTestHelper, UserSimulator, TEST_PROJECTS, TEST_SERVICES } from './helpers/test-helpers'

test.describe('Visual Regression Tests', () => {
  let helper: PortalTestHelper
  let simulator: UserSimulator

  test.beforeEach(async ({ page }) => {
    helper = new PortalTestHelper(page)
    simulator = new UserSimulator(page)
    
    await page.goto('http://localhost:3156')
    await page.waitForLoadState('networkidle')
  })

  test('capture portal states', async ({ page }) => {
    // 1. Initial state
    await page.screenshot({ 
      path: 'test-results/visual/01-initial-state.png',
      fullPage: true 
    })

    // 2. Dropdown open
    await page.locator('select#project').click()
    await page.waitForTimeout(100)
    await page.screenshot({ 
      path: 'test-results/visual/02-dropdown-open.png',
      fullPage: true 
    })

    // 3. Project selected
    await helper.selectProject(TEST_PROJECTS.GUI_SELECTOR)
    await helper.waitForServices()
    await page.screenshot({ 
      path: 'test-results/visual/03-project-selected.png',
      fullPage: true 
    })

    // 4. Service hover
    await page.hover('.service-card:has-text("GUI Selector")')
    await page.waitForTimeout(200)
    await page.screenshot({ 
      path: 'test-results/visual/04-service-hover.png',
      fullPage: true 
    })

    // 5. Modal open
    await helper.openService(TEST_SERVICES.GUI_SELECTOR)
    await page.waitForTimeout(500)
    await page.screenshot({ 
      path: 'test-results/visual/05-modal-open.png',
      fullPage: true 
    })

    // 6. Different modal sizes
    await helper.closeModal()
    await helper.openService(TEST_SERVICES.STORY_REPORTER)
    await page.waitForTimeout(500)
    await page.screenshot({ 
      path: 'test-results/visual/06-story-reporter-modal.png',
      fullPage: true 
    })
  })

  test('capture different projects', async ({ page }) => {
    const projects = [
      { name: TEST_PROJECTS.ROOT, file: 'root-project' },
      { name: TEST_PROJECTS.GUI_SELECTOR, file: 'gui-selector-project' },
      { name: TEST_PROJECTS.STORY_REPORTER, file: 'story-reporter-project' },
      { name: TEST_PROJECTS.SECURITY, file: 'security-project' }
    ]

    for (const project of projects) {
      await helper.selectProject(project.name)
      await helper.waitForServices()
      await page.screenshot({ 
        path: `test-results/visual/project-${project.file}.png`,
        fullPage: true 
      })
    }
  })

  test('capture responsive layouts', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-full' },
      { width: 1366, height: 768, name: 'desktop-standard' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 375, height: 667, name: 'mobile-standard' },
      { width: 414, height: 896, name: 'mobile-large' }
    ]

    await helper.selectProject(TEST_PROJECTS.PORTAL_AIDEV)
    await helper.waitForServices()

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(500) // Wait for layout adjustment
      await page.screenshot({ 
        path: `test-results/visual/viewport-${viewport.name}.png`,
        fullPage: true 
      })
    }
  })

  test('capture interaction states', async ({ page }) => {
    await helper.selectProject(TEST_PROJECTS.GUI_SELECTOR)
    await helper.waitForServices()

    // Focus states
    await page.keyboard.press('Tab')
    await page.screenshot({ 
      path: 'test-results/visual/focus-selector.png',
      fullPage: true 
    })

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.screenshot({ 
      path: 'test-results/visual/focus-service.png',
      fullPage: true 
    })

    // Active states
    const card = page.locator('.service-card').first()
    await card.click()
    await page.waitForTimeout(100)
    await page.screenshot({ 
      path: 'test-results/visual/active-click.png',
      fullPage: true 
    })
  })

  test('capture error states', async ({ page }) => {
    // No project selected
    await page.screenshot({ 
      path: 'test-results/visual/no-project.png',
      fullPage: true 
    })

    // Clear after selection
    await helper.selectProject(TEST_PROJECTS.PORTAL_AIDEV)
    await helper.waitForServices()
    await page.locator('select#project').selectOption('')
    await page.waitForTimeout(500)
    await page.screenshot({ 
      path: 'test-results/visual/project-cleared.png',
      fullPage: true 
    })
  })
})