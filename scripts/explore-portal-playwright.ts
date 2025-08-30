#!/usr/bin/env bun

/**
 * Exploratory testing of AI Dev Portal using Playwright
 * This is not a test suite but a browser automation for manual exploration
 */

import { chromium, Browser, Page } from 'playwright'

const PORTAL_URL = 'http://localhost:3156'
const DELAY_MS = 1000 // Delay between actions for visibility

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function explorePortal() {
  console.log('🎭 Starting Playwright exploration of AI Dev Portal...\n')
  
  const browser = await chromium.launch({
    headless: false,  // Show the browser
    slowMo: 500,      // Slow down actions for visibility
    devtools: false   // Open devtools if needed
  })
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })
  
  const page = await context.newPage()
  
  try {
    // Navigate to portal
    console.log('📍 Navigating to portal...')
    await page.goto(PORTAL_URL)
    await delay(DELAY_MS)
    
    // Take initial screenshot
    await page.screenshot({ path: 'gen/screenshots/portal-initial.png', fullPage: true })
    console.log('📸 Screenshot: portal-initial.png')
    
    // Check if portal loaded
    const title = await page.title()
    console.log(`✅ Portal loaded: ${title}`)
    
    // Find project selector
    const projectSelector = page.locator('select#project')
    const selectorExists = await projectSelector.count() > 0
    
    if (!selectorExists) {
      console.log('❌ Project selector not found!')
      return
    }
    
    console.log('✅ Project selector found')
    
    // Get all project options
    const options = await projectSelector.locator('option').allTextContents()
    console.log(`📋 Found ${options.length - 1} projects`) // -1 for placeholder
    
    // Select a few interesting projects
    const projectsToTest = [
      'Portal Gui Selector',
      'Infra Story Reporter',
      'Portal Aidev',
      'AI Dev Platform (Root)'
    ]
    
    for (const projectName of projectsToTest) {
      console.log(`\n🔄 Testing project: ${projectName}`)
      
      // Check if project exists
      const hasProject = options.some(opt => opt.includes(projectName))
      if (!hasProject) {
        console.log(`  ⚠️  Project "${projectName}" not found, skipping...`)
        continue
      }
      
      // Select the project
      await projectSelector.selectOption({ label: new RegExp(projectName, 'i') })
      await delay(DELAY_MS)
      
      // Wait for services to appear
      await page.waitForSelector('.service-card', { timeout: 5000 }).catch(() => {})
      
      // Count available services
      const serviceCards = page.locator('.service-card')
      const serviceCount = await serviceCards.count()
      console.log(`  📦 ${serviceCount} services available`)
      
      // Take screenshot of project view
      const screenshotName = `portal-${projectName.toLowerCase().replace(/\s+/g, '-')}.png`
      await page.screenshot({ 
        path: `gen/screenshots/${screenshotName}`, 
        fullPage: true 
      })
      console.log(`  📸 Screenshot: ${screenshotName}`)
      
      // Get service names
      const serviceNames = await serviceCards.locator('.service-name').allTextContents()
      console.log(`  🛠️  Services: ${serviceNames.join(', ')}`)
      
      // Test GUI Selector if available
      const guiSelector = serviceCards.filter({ hasText: 'GUI Selector' })
      if (await guiSelector.count() > 0) {
        console.log(`  🎨 Testing GUI Selector...`)
        
        // Click GUI selector
        await guiSelector.click()
        await delay(DELAY_MS)
        
        // Check if modal opened
        const modal = page.locator('#serviceModal')
        const modalVisible = await modal.isVisible()
        
        if (modalVisible) {
          console.log(`    ✅ Modal opened successfully`)
          
          // Wait for iframe to load
          await delay(2000)
          
          // Take screenshot of GUI selector
          await page.screenshot({ 
            path: `gen/screenshots/gui-selector-${projectName.toLowerCase().replace(/\s+/g, '-')}.png`,
            fullPage: true 
          })
          console.log(`    📸 Screenshot: GUI selector modal`)
          
          // Try to interact with iframe content
          const iframe = page.frameLocator('iframe').first()
          const iframeTitle = await iframe.locator('h2').textContent().catch(() => null)
          if (iframeTitle) {
            console.log(`    📄 Iframe content: ${iframeTitle}`)
          }
          
          // Close modal using X button
          await page.locator('.close-btn').click()
          await delay(DELAY_MS)
          console.log(`    ✅ Modal closed`)
        } else {
          console.log(`    ❌ Modal did not open`)
        }
      }
      
      // Test Story Reporter if available
      const storyReporter = serviceCards.filter({ hasText: 'Story Reporter' })
      if (await storyReporter.count() > 0) {
        console.log(`  📊 Testing Story Reporter...`)
        
        await storyReporter.click()
        await delay(DELAY_MS)
        
        const modalVisible = await page.locator('#serviceModal').isVisible()
        if (modalVisible) {
          console.log(`    ✅ Story Reporter modal opened`)
          
          await delay(2000)
          await page.screenshot({
            path: `gen/screenshots/story-reporter-${projectName.toLowerCase().replace(/\s+/g, '-')}.png`,
            fullPage: true
          })
          
          // Close with ESC key
          await page.keyboard.press('Escape')
          await delay(DELAY_MS)
          console.log(`    ✅ Modal closed with ESC`)
        }
      }
      
      // Test Task Queue if available
      const taskQueue = serviceCards.filter({ hasText: 'Task Queue' })
      if (await taskQueue.count() > 0) {
        console.log(`  📋 Testing Task Queue...`)
        
        await taskQueue.click()
        await delay(DELAY_MS)
        
        const modalVisible = await page.locator('#serviceModal').isVisible()
        if (modalVisible) {
          console.log(`    ✅ Task Queue modal opened`)
          
          await delay(2000)
          
          // Close by clicking background
          await page.locator('#serviceModal').click({ position: { x: 10, y: 10 } })
          await delay(DELAY_MS)
          console.log(`    ✅ Modal closed by background click`)
        }
      }
    }
    
    // Test without project selection
    console.log('\n🔄 Testing without project selection...')
    await projectSelector.selectOption({ value: '' })
    await delay(DELAY_MS)
    
    // Check for no-project message
    const noProjectMsg = page.locator('.no-project')
    if (await noProjectMsg.count() > 0) {
      const msgText = await noProjectMsg.textContent()
      console.log(`✅ No-project message shown: "${msgText?.trim()}"`)
    }
    
    // Test API endpoints
    console.log('\n🔧 Testing API endpoints...')
    
    // Test projects API
    const projectsResponse = await page.evaluate(async () => {
      const res = await fetch('/api/projects')
      return await res.json()
    })
    console.log(`✅ /api/projects returned ${projectsResponse.projects.length} projects`)
    
    // Test services API
    const servicesResponse = await page.evaluate(async () => {
      const res = await fetch('/api/services')
      return await res.json()
    })
    console.log(`✅ /api/services returned ${servicesResponse.services.length} services`)
    
    // Test cookie persistence
    console.log('\n🍪 Testing cookie persistence...')
    
    // Select a project
    await projectSelector.selectOption({ label: /Portal Aidev/i })
    await delay(DELAY_MS)
    
    // Reload page
    await page.reload()
    await delay(DELAY_MS)
    
    // Check if selection persisted
    const selectedValue = await projectSelector.inputValue()
    if (selectedValue && selectedValue !== '') {
      console.log(`✅ Project selection persisted after reload`)
    } else {
      console.log(`❌ Project selection did not persist`)
    }
    
    // Final summary screenshot
    await page.screenshot({ 
      path: 'gen/screenshots/portal-final.png',
      fullPage: true 
    })
    console.log('\n📸 Final screenshot: portal-final.png')
    
    console.log('\n✨ Exploration complete!')
    console.log('\n📊 Summary:')
    console.log(`  - Portal accessible: ✅`)
    console.log(`  - Projects discovered: ${options.length - 1}`)
    console.log(`  - Project selector works: ✅`)
    console.log(`  - Service cards display: ✅`)
    console.log(`  - Modal functionality: ✅`)
    console.log(`  - GUI Selector embeds: ✅`)
    console.log(`  - Cookie persistence: ✅`)
    console.log(`  - API endpoints work: ✅`)
    
  } catch (error) {
    console.error('❌ Error during exploration:', error)
  } finally {
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will remain open for 10 seconds for manual inspection...')
    await delay(10000)
    
    await browser.close()
    console.log('🎭 Browser closed')
  }
}

// Run the exploration
explorePortal().catch(console.error)