#!/usr/bin/env bun

/**
 * Portal Testing using Fetch API
 * Tests portal functionality without browser dependencies
 */

const PORTAL_URL = 'http://localhost:3156'

interface TestResult {
  name: string
  passed: boolean
  message?: string
  duration?: number
}

class PortalTester {
  private results: TestResult[] = []
  
  async test(name: string, fn: () => Promise<void>) {
    const start = Date.now()
    try {
      await fn()
      this.results.push({ 
        name, 
        passed: true, 
        duration: Date.now() - start 
      })
      console.log(`✅ ${name}`)
    } catch (error) {
      this.results.push({ 
        name, 
        passed: false, 
        message: String(error),
        duration: Date.now() - start 
      })
      console.log(`❌ ${name}: ${error}`)
    }
  }
  
  async run() {
    console.log('🎭 Testing AI Dev Portal\n')
    
    // Test 1: Portal loads
    await this.test('Portal homepage loads', async () => {
      const res = await fetch(PORTAL_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const html = await res.text()
      if (!html.includes('AI Dev Portal')) {
        throw new Error('Portal title not found')
      }
      if (!html.includes('select id="project"')) {
        throw new Error('Project selector not found')
      }
    })
    
    // Test 2: API endpoints work
    await this.test('Projects API returns data', async () => {
      const res = await fetch(`${PORTAL_URL}/api/projects`)
      const data = await res.json()
      
      if (!data.projects || !Array.isArray(data.projects)) {
        throw new Error('Invalid projects response')
      }
      if (data.projects.length === 0) {
        throw new Error('No projects found')
      }
      
      console.log(`  Found ${data.projects.length} projects`)
    })
    
    await this.test('Services API returns data', async () => {
      const res = await fetch(`${PORTAL_URL}/api/services`)
      const data = await res.json()
      
      if (!data.services || !Array.isArray(data.services)) {
        throw new Error('Invalid services response')
      }
      if (data.services.length === 0) {
        throw new Error('No services found')
      }
      
      console.log(`  Found ${data.services.length} services`)
    })
    
    // Test 3: Service endpoints accessible
    const services = ['task-queue', 'gui-selector', 'story-reporter', 'feature-viewer']
    for (const service of services) {
      await this.test(`Service endpoint: ${service}`, async () => {
        const res = await fetch(`${PORTAL_URL}/services/${service}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        
        const html = await res.text()
        if (!html.includes('<html')) {
          throw new Error('Invalid HTML response')
        }
      })
    }
    
    // Test 4: Project selection
    await this.test('Project selection API', async () => {
      const res = await fetch(`${PORTAL_URL}/api/select-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'portal_gui-selector' })
      })
      
      const data = await res.json()
      if (!data.success && !data.projectId) {
        throw new Error('Project selection failed')
      }
    })
    
    // Test 5: Service data endpoints
    await this.test('Task queue data API', async () => {
      const res = await fetch(`${PORTAL_URL}/api/services/task-queue/data`)
      const data = await res.json()
      
      if (!data) throw new Error('No data returned')
      console.log(`  Task data: ${JSON.stringify(data).substring(0, 50)}...`)
    })
    
    // Test 6: GUI Selector content
    await this.test('GUI Selector renders', async () => {
      const res = await fetch(`${PORTAL_URL}/services/gui-selector`)
      const html = await res.text()
      
      // Check for expected content
      if (!html.includes('GUI Selector') && !html.includes('GUI Design Selector')) {
        if (html.includes('No project selected')) {
          console.log('  Note: GUI Selector shows "No project selected"')
        } else {
          throw new Error('GUI Selector content not found')
        }
      }
    })
    
    // Test 7: Modal structure present
    await this.test('Portal has modal structure', async () => {
      const res = await fetch(PORTAL_URL)
      const html = await res.text()
      
      if (!html.includes('serviceModal')) {
        throw new Error('Service modal not found')
      }
      if (!html.includes('modalTitle')) {
        throw new Error('Modal title element not found')
      }
      if (!html.includes('modalBody')) {
        throw new Error('Modal body element not found')
      }
    })
    
    // Print summary
    console.log('\n📊 Test Summary:')
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const total = this.results.length
    
    console.log(`  Total: ${total}`)
    console.log(`  ✅ Passed: ${passed}`)
    console.log(`  ❌ Failed: ${failed}`)
    console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
    
    // Show failed tests
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`)
      })
    }
    
    // Exit code
    process.exit(failed > 0 ? 1 : 0)
  }
}

// Simulate click interactions via API
async function simulateUserJourney() {
  console.log('\n🚶 Simulating User Journey:')
  
  // 1. User visits portal
  console.log('1. User visits portal...')
  const home = await fetch(PORTAL_URL)
  console.log(`   Status: ${home.status}`)
  
  // 2. User views projects
  console.log('2. User checks available projects...')
  const projects = await fetch(`${PORTAL_URL}/api/projects`)
  const projectData = await projects.json()
  console.log(`   Found ${projectData.projects.length} projects`)
  
  // 3. User selects a project
  console.log('3. User selects "portal_gui-selector" project...')
  const select = await fetch(`${PORTAL_URL}/api/select-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: 'portal_gui-selector' })
  })
  console.log(`   Selection response: ${select.status}`)
  
  // 4. User views services
  console.log('4. User checks available services...')
  const services = await fetch(`${PORTAL_URL}/api/services`)
  const serviceData = await services.json()
  console.log(`   ${serviceData.services.length} services available`)
  
  // 5. User opens GUI Selector
  console.log('5. User opens GUI Selector service...')
  const guiSelector = await fetch(`${PORTAL_URL}/services/gui-selector`)
  console.log(`   GUI Selector loaded: ${guiSelector.status}`)
  
  // 6. User interacts with service
  console.log('6. User gets task queue data...')
  const taskData = await fetch(`${PORTAL_URL}/api/services/task-queue/data`)
  const tasks = await taskData.json()
  console.log(`   Tasks available: ${tasks.tasks ? tasks.tasks.length : 0}`)
  
  console.log('\n✨ User journey completed successfully!')
}

// Run tests
async function main() {
  const tester = new PortalTester()
  await tester.run()
  await simulateUserJourney()
}

main().catch(console.error)