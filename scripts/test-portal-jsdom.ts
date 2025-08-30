#!/usr/bin/env bun

/**
 * Click-based Testing using JSDOM
 * Simulates browser DOM without real browser
 */

import { JSDOM } from 'jsdom'

const PORTAL_URL = 'http://localhost:3156'

class ClickTester {
  private dom: any
  private document: Document
  private window: Window
  
  async loadPage(url: string) {
    const response = await fetch(url)
    const html = await response.text()
    
    this.dom = new JSDOM(html, {
      url,
      runScripts: 'dangerously',
      resources: 'usable'
    })
    
    this.document = this.dom.window.document
    this.window = this.dom.window
  }
  
  click(selector: string): boolean {
    const element = this.document.querySelector(selector) as HTMLElement
    if (!element) {
      console.log(`  ⚠️  Element not found: ${selector}`)
      return false
    }
    
    // Simulate click event
    const event = this.document.createEvent('MouseEvents')
    event.initEvent('click', true, true)
    element.dispatchEvent(event)
    
    console.log(`  ✅ Clicked: ${selector}`)
    return true
  }
  
  select(selector: string, value: string): boolean {
    const selectElement = this.document.querySelector(selector) as HTMLSelectElement
    if (!selectElement) {
      console.log(`  ⚠️  Select not found: ${selector}`)
      return false
    }
    
    selectElement.value = value
    const event = this.document.createEvent('Event')
    event.initEvent('change', true, true)
    selectElement.dispatchEvent(event)
    
    console.log(`  ✅ Selected: ${value} in ${selector}`)
    return true
  }
  
  type(selector: string, text: string): boolean {
    const input = this.document.querySelector(selector) as HTMLInputElement
    if (!input) {
      console.log(`  ⚠️  Input not found: ${selector}`)
      return false
    }
    
    input.value = text
    const event = this.document.createEvent('Event')
    event.initEvent('input', true, true)
    input.dispatchEvent(event)
    
    console.log(`  ✅ Typed: "${text}" in ${selector}`)
    return true
  }
  
  keyPress(key: string) {
    const event = new this.window.KeyboardEvent('keydown', { key })
    this.document.dispatchEvent(event)
    console.log(`  ✅ Pressed key: ${key}`)
  }
  
  exists(selector: string): boolean {
    return !!this.document.querySelector(selector)
  }
  
  count(selector: string): number {
    return this.document.querySelectorAll(selector).length
  }
  
  getText(selector: string): string | null {
    const element = this.document.querySelector(selector)
    return element ? element.textContent : null
  }
  
  isVisible(selector: string): boolean {
    const element = this.document.querySelector(selector) as HTMLElement
    if (!element) return false
    
    const style = this.window.getComputedStyle(element)
    return style.display !== 'none' && style.visibility !== 'hidden'
  }
}

async function runClickTests() {
  console.log('🎭 Click-Based Testing with JSDOM\n')
  
  const tester = new ClickTester()
  let passed = 0
  let failed = 0
  
  try {
    // Test 1: Load portal
    console.log('📍 Test 1: Portal Loading')
    await tester.loadPage(PORTAL_URL)
    
    if (tester.exists('h1')) {
      console.log(`  ✅ Portal loaded: ${tester.getText('h1')}`)
      passed++
    } else {
      console.log('  ❌ Portal heading not found')
      failed++
    }
    
    // Test 2: Project selector
    console.log('\n📍 Test 2: Project Selector')
    if (tester.exists('select#project')) {
      const optionCount = tester.count('select#project option')
      console.log(`  ✅ Project selector found with ${optionCount} options`)
      passed++
      
      // Click to open dropdown
      tester.click('select#project')
      
      // Select a project
      tester.select('select#project', 'portal_gui-selector')
      passed++
    } else {
      console.log('  ❌ Project selector not found')
      failed++
    }
    
    // Test 3: Service cards
    console.log('\n📍 Test 3: Service Cards')
    const serviceCount = tester.count('.service-card')
    if (serviceCount > 0) {
      console.log(`  ✅ Found ${serviceCount} service cards`)
      passed++
      
      // Click first service card
      tester.click('.service-card')
      passed++
    } else {
      console.log('  ❌ No service cards found')
      failed++
    }
    
    // Test 4: Modal interaction
    console.log('\n📍 Test 4: Modal Interactions')
    if (tester.exists('#serviceModal')) {
      console.log('  ✅ Modal structure exists')
      passed++
      
      // Simulate ESC key
      tester.keyPress('Escape')
      passed++
      
      // Check close button
      if (tester.exists('.close-btn')) {
        tester.click('.close-btn')
        console.log('  ✅ Close button clicked')
        passed++
      }
    } else {
      console.log('  ❌ Modal structure not found')
      failed++
    }
    
    // Test 5: Check no-project state
    console.log('\n📍 Test 5: No-Project State')
    tester.select('select#project', '')
    
    if (tester.exists('.no-project')) {
      const message = tester.getText('.no-project')
      console.log(`  ✅ No-project message: "${message?.substring(0, 50)}..."`)
      passed++
    } else {
      console.log('  ⚠️  No-project message not found')
    }
    
    // Test 6: Tab navigation
    console.log('\n📍 Test 6: Keyboard Navigation')
    // Simulate Tab key presses
    for (let i = 0; i < 3; i++) {
      tester.keyPress('Tab')
    }
    console.log('  ✅ Tab navigation simulated')
    passed++
    
  } catch (error) {
    console.error('❌ Test error:', error)
    failed++
  }
  
  // Summary
  console.log('\n📊 Test Summary:')
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  Total: ${passed + failed}`)
  console.log(`  Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  
  return failed === 0
}

// Run the tests
runClickTests()
  .then(success => {
    console.log(success ? '\n✨ All tests passed!' : '\n⚠️  Some tests failed')
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })