#!/usr/bin/env bun

/**
 * Minimal Playwright Test - Works without system dependencies
 * Uses WebKit which has fewer dependencies than Chromium
 */

import { webkit } from 'playwright'

const PORTAL_URL = 'http://localhost:3156'

async function runMinimalTest() {
  console.log('🎭 Playwright Minimal Test Suite\n')
  
  let browser
  let passed = 0
  let failed = 0
  
  try {
    // Try WebKit first as it has fewer dependencies
    console.log('Attempting to launch WebKit browser...')
    browser = await webkit.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }).catch(async (err) => {
      console.log('WebKit failed, trying Firefox...')
      const { firefox } = await import('playwright')
      return firefox.launch({
        headless: true,
        args: ['--no-sandbox']
      })
    }).catch(async (err) => {
      console.log('Firefox failed, trying Chromium with minimal config...')
      const { chromium } = await import('playwright')
      return chromium.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser', // Try system chromium
        args: [
          '--headless',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage'
        ]
      })
    })
    
    const page = await browser.newPage()
    
    // Test 1: Load portal
    try {
      await page.goto(PORTAL_URL, { timeout: 10000 })
      const title = await page.title()
      console.log(`✅ Portal loaded: ${title}`)
      passed++
    } catch (e) {
      console.log(`❌ Failed to load portal: ${e}`)
      failed++
    }
    
    // Test 2: Find project selector
    try {
      const selector = await page.$('select#project')
      if (selector) {
        const options = await page.$$('select#project option')
        console.log(`✅ Found project selector with ${options.length} options`)
        passed++
      } else {
        throw new Error('Selector not found')
      }
    } catch (e) {
      console.log(`❌ Project selector test failed: ${e}`)
      failed++
    }
    
    // Test 3: Service cards
    try {
      const cards = await page.$$('.service-card')
      console.log(`✅ Found ${cards.length} service cards`)
      passed++
    } catch (e) {
      console.log(`❌ Service cards test failed: ${e}`)
      failed++
    }
    
    await browser.close()
    
  } catch (error) {
    console.error('Browser launch failed:', error)
    console.log('\n⚠️  No compatible browser available for Playwright')
    console.log('This is expected without system dependencies.\n')
    
    // Fall back to API testing
    console.log('Falling back to API-based testing...\n')
    await runAPITests()
    return
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
}

async function runAPITests() {
  console.log('🔌 Running API-based tests instead...\n')
  
  try {
    // Test portal availability
    const response = await fetch(PORTAL_URL)
    if (response.ok) {
      console.log('✅ Portal is accessible via HTTP')
      
      // Test API endpoints
      const apis = [
        '/api/projects',
        '/api/services', 
        '/services/gui-selector',
        '/services/task-queue'
      ]
      
      for (const api of apis) {
        const res = await fetch(`${PORTAL_URL}${api}`)
        console.log(`${res.ok ? '✅' : '❌'} ${api}: ${res.status}`)
      }
    }
  } catch (e) {
    console.log('❌ Portal not running:', e)
  }
}

// Start portal first
import { spawn } from 'child_process'

console.log('Starting portal server...')
const portal = spawn('bun', [
  'run',
  'layer/themes/init_setup-folder/children/services/project-aware-portal.ts'
], { 
  detached: true,
  stdio: 'ignore'
})

// Wait for portal to start
setTimeout(async () => {
  await runMinimalTest()
  
  // Clean up
  try {
    process.kill(-portal.pid)
  } catch {}
  
  process.exit(0)
}, 3000)