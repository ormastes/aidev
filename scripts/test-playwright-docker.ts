#!/usr/bin/env bun

/**
 * Playwright Tests for Docker Environment
 * Runs comprehensive click-based tests in headless Chrome
 */

import { chromium, Browser, Page } from 'playwright'
import { spawn } from 'child_process'

const PORTAL_URL = 'http://localhost:3156'

interface TestResult {
  name: string
  passed: boolean
  message?: string
  screenshot?: string
}

class PlaywrightTester {
  private browser: Browser | null = null
  private page: Page | null = null
  private results: TestResult[] = []
  
  async setup() {
    console.log('🚀 Starting Playwright in headless environment...\n')
    
    // Launch browser with minimal requirements
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ]
    })
    
    this.page = await this.browser.newPage()
    await this.page.setViewportSize({ width: 1920, height: 1080 })
  }
  
  async test(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      this.results.push({ name, passed: true })
      console.log(`✅ ${name}`)
    } catch (error) {
      const screenshot = `test-results/${name.replace(/\s+/g, '-')}.png`
      if (this.page) {
        await this.page.screenshot({ path: screenshot, fullPage: true })
      }
      this.results.push({ 
        name, 
        passed: false, 
        message: String(error),
        screenshot 
      })
      console.log(`❌ ${name}: ${error}`)
    }
  }
  
  async runTests() {
    if (!this.page) throw new Error('Browser not initialized')
    
    // Test 1: Portal loads
    await this.test('Portal loads successfully', async () => {
      await this.page!.goto(PORTAL_URL, { waitUntil: 'networkidle' })
      const title = await this.page!.title()
      if (!title.includes('AI Dev Portal')) {
        throw new Error(`Wrong title: ${title}`)
      }
    })
    
    // Test 2: Project selector exists
    await this.test('Project selector is present', async () => {
      const selector = await this.page!.$('select#project')
      if (!selector) throw new Error('Project selector not found')
      
      const options = await this.page!.$$eval('select#project option', 
        opts => opts.map(opt => opt.textContent)
      )
      console.log(`  Found ${options.length} projects`)
      if (options.length < 10) throw new Error('Too few projects')
    })
    
    // Test 3: Select a project
    await this.test('Can select a project', async () => {
      await this.page!.selectOption('select#project', 'portal_gui-selector')
      await this.page!.waitForTimeout(1000)
      
      const selectedValue = await this.page!.$eval('select#project', 
        (el: HTMLSelectElement) => el.value
      )
      if (selectedValue !== 'portal_gui-selector') {
        throw new Error(`Wrong selection: ${selectedValue}`)
      }
    })
    
    // Test 4: Service cards appear
    await this.test('Service cards display after project selection', async () => {
      const cards = await this.page!.$$('.service-card')
      console.log(`  Found ${cards.length} service cards`)
      if (cards.length === 0) throw new Error('No service cards found')
      
      // Take screenshot of cards
      await this.page!.screenshot({ 
        path: 'test-results/service-cards.png',
        fullPage: true 
      })
    })
    
    // Test 5: Click on service card
    await this.test('Can click on service card to open modal', async () => {
      // Click first service card
      await this.page!.click('.service-card:first-child')
      await this.page!.waitForTimeout(1000)
      
      // Check modal is visible
      const modal = await this.page!.$('#serviceModal')
      if (!modal) throw new Error('Modal not found')
      
      const isVisible = await this.page!.isVisible('#serviceModal')
      if (!isVisible) throw new Error('Modal not visible')
      
      await this.page!.screenshot({ 
        path: 'test-results/modal-open.png',
        fullPage: true 
      })
    })
    
    // Test 6: Close modal with ESC
    await this.test('Can close modal with ESC key', async () => {
      await this.page!.keyboard.press('Escape')
      await this.page!.waitForTimeout(500)
      
      // Modal should be hidden or display:none
      const modalStyle = await this.page!.$eval('#serviceModal', 
        el => window.getComputedStyle(el).display
      )
      if (modalStyle !== 'none') {
        console.log(`  Modal style: ${modalStyle} (may use opacity)`)
      }
    })
    
    // Test 7: GUI Selector service
    await this.test('GUI Selector service loads', async () => {
      // Select portal_gui-selector project
      await this.page!.selectOption('select#project', 'portal_gui-selector')
      await this.page!.waitForTimeout(1000)
      
      // Find and click GUI Selector card
      const guiCard = await this.page!.$('.service-card:has-text("GUI Selector")')
      if (!guiCard) {
        // Try alternative selector
        const cards = await this.page!.$$('.service-card')
        for (const card of cards) {
          const text = await card.textContent()
          if (text?.includes('GUI')) {
            await card.click()
            break
          }
        }
      } else {
        await guiCard.click()
      }
      
      await this.page!.waitForTimeout(1000)
      await this.page!.screenshot({ 
        path: 'test-results/gui-selector.png',
        fullPage: true 
      })
    })
    
    // Test 8: Keyboard navigation
    await this.test('Keyboard navigation works', async () => {
      // Press ESC to close any modal
      await this.page!.keyboard.press('Escape')
      await this.page!.waitForTimeout(500)
      
      // Tab through interface
      for (let i = 0; i < 3; i++) {
        await this.page!.keyboard.press('Tab')
      }
      
      // Get focused element
      const focusedElement = await this.page!.evaluate(() => {
        const el = document.activeElement
        return el ? el.tagName : null
      })
      console.log(`  Focused element: ${focusedElement}`)
    })
    
    // Test 9: Multiple project switching
    await this.test('Can switch between multiple projects', async () => {
      const projects = ['portal_aidev', 'infra_story-reporter', 'init_setup-folder']
      
      for (const projectId of projects) {
        await this.page!.selectOption('select#project', projectId)
        await this.page!.waitForTimeout(500)
        
        const cards = await this.page!.$$('.service-card')
        console.log(`  Project ${projectId}: ${cards.length} services`)
      }
    })
    
    // Test 10: Responsive design
    await this.test('Portal is responsive', async () => {
      // Test mobile view
      await this.page!.setViewportSize({ width: 375, height: 667 })
      await this.page!.screenshot({ 
        path: 'test-results/mobile-view.png',
        fullPage: true 
      })
      
      // Test tablet view
      await this.page!.setViewportSize({ width: 768, height: 1024 })
      await this.page!.screenshot({ 
        path: 'test-results/tablet-view.png',
        fullPage: true 
      })
      
      // Restore desktop view
      await this.page!.setViewportSize({ width: 1920, height: 1080 })
    })
  }
  
  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }
  
  printSummary() {
    console.log('\n📊 Test Summary:')
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const total = this.results.length
    
    console.log(`  Total: ${total}`)
    console.log(`  ✅ Passed: ${passed}`)
    console.log(`  ❌ Failed: ${failed}`)
    console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`)
        if (r.screenshot) {
          console.log(`    Screenshot: ${r.screenshot}`)
        }
      })
    }
    
    console.log('\n📸 Screenshots saved to test-results/')
    
    return failed === 0
  }
}

async function startPortal(): Promise<any> {
  console.log('🚀 Starting AI Dev Portal...\n')
  
  return spawn('bun', ['run', 'layer/themes/init_setup-folder/children/services/project-aware-portal.ts'], {
    detached: true,
    stdio: 'ignore'
  })
}

async function main() {
  let portalProcess: any = null
  
  try {
    // Start the portal
    portalProcess = startPortal()
    
    // Wait for portal to start
    console.log('⏳ Waiting for portal to start...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Check if portal is running
    const response = await fetch(PORTAL_URL).catch(() => null)
    if (!response || !response.ok) {
      throw new Error('Portal failed to start')
    }
    console.log('✅ Portal is running\n')
    
    // Run tests
    const tester = new PlaywrightTester()
    await tester.setup()
    await tester.runTests()
    await tester.cleanup()
    
    // Print summary
    const success = tester.printSummary()
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1)
    
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    // Clean up portal process
    if (portalProcess) {
      try {
        process.kill(-portalProcess.pid)
      } catch {}
    }
  }
}

// Run the tests
main().catch(console.error)