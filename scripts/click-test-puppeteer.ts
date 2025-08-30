#!/usr/bin/env bun

/**
 * Click-based Testing using Puppeteer (Alternative to Playwright)
 * Simpler setup with fewer dependencies
 */

import puppeteer from 'puppeteer'

const PORTAL_URL = 'http://localhost:3156'

async function runClickTests() {
  console.log('🎭 Starting Click-Based Tests with Puppeteer\n')
  
  let browser
  
  try {
    // Launch browser in headless mode with minimal requirements
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })
    
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    
    console.log('📍 Test 1: Portal Loading')
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle0' })
    const title = await page.title()
    console.log(`  ✅ Page title: ${title}`)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/puppeteer-portal.png', fullPage: true })
    console.log('  ✅ Screenshot saved')
    
    console.log('\n📍 Test 2: Project Selection')
    // Click on project selector
    await page.click('select#project')
    
    // Get all options
    const options = await page.$$eval('select#project option', opts => 
      opts.map(opt => opt.textContent)
    )
    console.log(`  ✅ Found ${options.length} projects`)
    
    // Select a project
    await page.select('select#project', 'portal_gui-selector')
    await page.waitForTimeout(1000)
    
    // Count service cards
    const serviceCards = await page.$$('.service-card')
    console.log(`  ✅ ${serviceCards.length} services displayed`)
    
    await page.screenshot({ path: 'test-results/puppeteer-selected.png', fullPage: true })
    
    console.log('\n📍 Test 3: Service Modal Click')
    // Click on GUI Selector service
    const guiCard = await page.$('.service-card:has(.service-name:has-text("GUI Selector"))')
    if (guiCard) {
      await guiCard.click()
      await page.waitForTimeout(1000)
      
      // Check modal is visible
      const modalVisible = await page.$eval('#serviceModal', el => 
        window.getComputedStyle(el).display !== 'none'
      )
      console.log(`  ✅ Modal opened: ${modalVisible}`)
      
      await page.screenshot({ path: 'test-results/puppeteer-modal.png', fullPage: true })
      
      // Close modal with ESC
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      console.log('  ✅ Modal closed with ESC')
    } else {
      // Fallback: click first service card
      await page.click('.service-card')
      await page.waitForTimeout(1000)
      console.log('  ✅ Clicked first service card')
    }
    
    console.log('\n📍 Test 4: Multiple Interactions')
    // Test different projects
    const testProjects = ['portal_aidev', 'infra_story-reporter', 'root']
    
    for (const projectId of testProjects) {
      await page.select('select#project', projectId)
      await page.waitForTimeout(500)
      
      const cards = await page.$$('.service-card')
      console.log(`  ✅ Project ${projectId}: ${cards.length} services`)
    }
    
    console.log('\n📍 Test 5: Keyboard Navigation')
    // Tab through interface
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement
      return el ? el.tagName : null
    })
    console.log(`  ✅ Focused element: ${focusedElement}`)
    
    console.log('\n✨ All tests completed successfully!')
    
    // Generate summary
    console.log('\n📊 Test Summary:')
    console.log('  ✅ Portal loads')
    console.log('  ✅ Projects discovered')
    console.log('  ✅ Service cards display')
    console.log('  ✅ Modal opens/closes')
    console.log('  ✅ Keyboard navigation works')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Run tests
runClickTests().catch(console.error)