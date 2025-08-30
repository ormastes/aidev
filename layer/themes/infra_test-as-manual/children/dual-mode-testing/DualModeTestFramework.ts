/**
 * Dual Mode Test Library
 * Reusable test framework for web apps supporting both port and embed modes
 */

import type { Page, Browser, BrowserContext } from 'playwright'
import { chromium, firefox, webkit } from 'playwright'

export interface ServiceTestConfig {
  serviceName: string
  serviceId: string
  portalUrl?: string
  directUrl?: string
  defaultProject?: string
  supportedModes: ('port' | 'embed' | 'both')[]
  features: ServiceFeature[]
}

export interface ServiceFeature {
  id: string
  name: string
  description: string
  testable: boolean
  requiredMode?: 'port' | 'embed' | 'both'
  selectors?: Record<string, string>
  validations?: Record<string, (page: Page) => Promise<boolean>>
}

export interface TestScenario {
  id: string
  name: string
  description: string
  mode: 'port' | 'embed' | 'both'
  priority: 'high' | 'medium' | 'low'
  category: 'functional' | 'ui' | 'api' | 'integration' | 'accessibility' | 'performance'
  preconditions?: string[]
  steps: TestStep[]
  expectedResults: string[]
  manualSteps?: ManualStep[]
}

export interface TestStep {
  id: string
  action: 'navigate' | 'click' | 'type' | 'select' | 'wait' | 'validate' | 'screenshot'
  target?: string
  value?: any
  description: string
  optional?: boolean
}

export interface ManualStep {
  step: number
  instruction: string
  expectedResult: string
  screenshot?: boolean
}

export interface TestResult {
  scenarioId: string
  scenarioName: string
  mode: 'port' | 'embed'
  status: 'pass' | 'fail' | 'skip' | 'partial'
  startTime: Date
  endTime: Date
  duration: number
  stepsCompleted: number
  totalSteps: number
  errors: string[]
  warnings: string[]
  screenshots: string[]
  metadata?: Record<string, any>
}

/**
 * Base Dual Mode Test Framework
 */
export abstract class DualModeTestFramework {
  protected config: ServiceTestConfig
  protected browser: Browser | null = null
  protected context: BrowserContext | null = null
  protected page: Page | null = null
  protected results: TestResult[] = []
  protected currentMode: 'port' | 'embed' | null = null

  constructor(config: ServiceTestConfig) {
    this.config = {
      portalUrl: 'http://localhost:3156',
      directUrl: `http://localhost:3156/services/${config.serviceId}`,
      defaultProject: 'default',
      ...config
    }
  }

  /**
   * Initialize browser and page
   */
  async initialize(browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium'): Promise<void> {
    const browsers = { chromium, firefox, webkit }
    this.browser = await browsers[browserType].launch({
      headless: process.env.HEADLESS !== 'false'
    })
    this.context = await this.browser.newContext()
    this.page = await this.context.newPage()
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.page) await this.page.close()
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()
  }

  /**
   * Run a test scenario in specified mode(s)
   */
  async runScenario(scenario: TestScenario): Promise<TestResult[]> {
    const results: TestResult[] = []

    if (scenario.mode === 'both') {
      // Run in both modes
      if (this.config.supportedModes.includes('port')) {
        const portResult = await this.executeScenario(scenario, 'port')
        results.push(portResult)
      }
      if (this.config.supportedModes.includes('embed')) {
        const embedResult = await this.executeScenario(scenario, 'embed')
        results.push(embedResult)
      }
    } else {
      // Run in single mode
      if (this.config.supportedModes.includes(scenario.mode)) {
        const result = await this.executeScenario(scenario, scenario.mode)
        results.push(result)
      }
    }

    this.results.push(...results)
    return results
  }

  /**
   * Execute scenario in specific mode
   */
  protected async executeScenario(scenario: TestScenario, mode: 'port' | 'embed'): Promise<TestResult> {
    const result: TestResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      mode,
      status: 'pass',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      stepsCompleted: 0,
      totalSteps: scenario.steps.length,
      errors: [],
      warnings: [],
      screenshots: []
    }

    this.currentMode = mode

    try {
      // Setup based on mode
      await this.setupMode(mode)

      // Execute preconditions
      if (scenario.preconditions) {
        for (const precondition of scenario.preconditions) {
          await this.executePrecondition(precondition)
        }
      }

      // Execute test steps
      for (const step of scenario.steps) {
        try {
          await this.executeStep(step)
          result.stepsCompleted++
        } catch (error) {
          if (!step.optional) {
            result.errors.push(`Step ${step.id}: ${error.message}`)
            result.status = 'fail'
            break
          } else {
            result.warnings.push(`Optional step ${step.id} failed: ${error.message}`)
          }
        }
      }

      // Validate expected results
      for (const expectedResult of scenario.expectedResults) {
        const valid = await this.validateExpectedResult(expectedResult)
        if (!valid) {
          result.errors.push(`Validation failed: ${expectedResult}`)
          result.status = result.status === 'pass' ? 'partial' : result.status
        }
      }

    } catch (error) {
      result.errors.push(`Scenario execution failed: ${error.message}`)
      result.status = 'fail'
    }

    result.endTime = new Date()
    result.duration = result.endTime.getTime() - result.startTime.getTime()

    return result
  }

  /**
   * Setup test mode (port or embed)
   */
  protected async setupMode(mode: 'port' | 'embed'): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    if (mode === 'port') {
      // Direct navigation to service
      await this.page.goto(this.config.directUrl!)
    } else {
      // Navigate through portal
      await this.page.goto(this.config.portalUrl!)
      
      // Select project if needed
      if (this.config.defaultProject) {
        await this.selectProject(this.config.defaultProject)
      }
      
      // Open service in modal
      await this.openServiceInModal(this.config.serviceId)
      
      // Switch to iframe context
      await this.switchToIframe()
    }
  }

  /**
   * Portal-specific operations
   */
  protected async selectProject(projectId: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')
    
    await this.page.selectOption('#project', projectId)
    await this.page.waitForTimeout(1000) // Wait for UI update
  }

  protected async openServiceInModal(serviceId: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')
    
    // Click on service card
    await this.page.click(`.service-card:has(.service-name:has-text("${this.config.serviceName}"))`)
    
    // Wait for modal to open
    await this.page.waitForSelector('#serviceModal.show', { timeout: 5000 })
  }

  protected async switchToIframe(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')
    
    const frameElement = await this.page.waitForSelector('#modalFrame')
    const frame = await frameElement.contentFrame()
    
    if (frame) {
      // Use frame as the page context for subsequent operations
      // This is a simplification - actual implementation would need proper frame handling
      console.log('Switched to iframe context')
    }
  }

  /**
   * Execute individual test step
   */
  protected async executeStep(step: TestStep): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    switch (step.action) {
      case 'navigate':
        await this.page.goto(step.value)
        break
        
      case 'click':
        await this.page.click(step.target!)
        break
        
      case 'type':
        await this.page.fill(step.target!, step.value)
        break
        
      case 'select':
        await this.page.selectOption(step.target!, step.value)
        break
        
      case 'wait':
        if (step.target) {
          await this.page.waitForSelector(step.target)
        } else if (step.value) {
          await this.page.waitForTimeout(step.value)
        }
        break
        
      case 'validate':
        const valid = await this.validateSelector(step.target!)
        if (!valid) throw new Error(`Validation failed for ${step.target}`)
        break
        
      case 'screenshot':
        const screenshotPath = await this.takeScreenshot(step.id)
        console.log(`Screenshot saved: ${screenshotPath}`)
        break
        
      default:
        throw new Error(`Unknown action: ${step.action}`)
    }
  }

  /**
   * Validation helpers
   */
  protected async validateSelector(selector: string): Promise<boolean> {
    if (!this.page) return false
    const element = await this.page.$(selector)
    return element !== null
  }

  protected async validateExpectedResult(expectedResult: string): Promise<boolean> {
    // Override in specific implementations
    return true
  }

  protected async executePrecondition(precondition: string): Promise<void> {
    // Override in specific implementations
    console.log(`Executing precondition: ${precondition}`)
  }

  /**
   * Take screenshot
   */
  protected async takeScreenshot(name: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized')
    
    const timestamp = Date.now()
    const filename = `${this.config.serviceId}-${name}-${timestamp}.png`
    await this.page.screenshot({ path: `test-results/${filename}`, fullPage: true })
    return filename
  }

  /**
   * Generate test reports
   */
  generateTestReport(): TestReport {
    const report: TestReport = {
      service: this.config.serviceName,
      serviceId: this.config.serviceId,
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'pass').length,
        failed: this.results.filter(r => r.status === 'fail').length,
        partial: this.results.filter(r => r.status === 'partial').length,
        skipped: this.results.filter(r => r.status === 'skip').length
      },
      modeBreakdown: {
        port: this.results.filter(r => r.mode === 'port').length,
        embed: this.results.filter(r => r.mode === 'embed').length
      },
      results: this.results,
      features: this.config.features
    }
    
    return report
  }

  /**
   * Generate manual test documentation
   */
  generateManualTestDoc(scenarios: TestScenario[]): string {
    let doc = `# ${this.config.serviceName} - Manual Test Documentation\n\n`
    doc += `Generated: ${new Date().toISOString()}\n\n`
    
    // Service overview
    doc += `## Service Overview\n\n`
    doc += `- **Service ID**: ${this.config.serviceId}\n`
    doc += `- **Portal URL**: ${this.config.portalUrl}\n`
    doc += `- **Direct URL**: ${this.config.directUrl}\n`
    doc += `- **Supported Modes**: ${this.config.supportedModes.join(', ')}\n\n`
    
    // Features
    doc += `## Features\n\n`
    for (const feature of this.config.features) {
      doc += `### ${feature.name}\n`
      doc += `- **ID**: ${feature.id}\n`
      doc += `- **Description**: ${feature.description}\n`
      doc += `- **Testable**: ${feature.testable ? 'Yes' : 'No'}\n`
      if (feature.requiredMode) {
        doc += `- **Required Mode**: ${feature.requiredMode}\n`
      }
      doc += '\n'
    }
    
    // Test scenarios
    doc += `## Test Scenarios\n\n`
    
    // Group by category
    const categories = [...new Set(scenarios.map(s => s.category))]
    
    for (const category of categories) {
      doc += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Tests\n\n`
      
      const categoryScenarios = scenarios.filter(s => s.category === category)
      
      for (const scenario of categoryScenarios) {
        doc += `#### ${scenario.name}\n`
        doc += `- **ID**: ${scenario.id}\n`
        doc += `- **Priority**: ${scenario.priority}\n`
        doc += `- **Mode**: ${scenario.mode}\n`
        doc += `- **Description**: ${scenario.description}\n\n`
        
        if (scenario.preconditions && scenario.preconditions.length > 0) {
          doc += `**Preconditions**:\n`
          scenario.preconditions.forEach((pre, i) => {
            doc += `${i + 1}. ${pre}\n`
          })
          doc += '\n'
        }
        
        // Manual steps if provided
        if (scenario.manualSteps && scenario.manualSteps.length > 0) {
          doc += `**Manual Test Steps**:\n\n`
          for (const step of scenario.manualSteps) {
            doc += `${step.step}. ${step.instruction}\n`
            doc += `   - **Expected**: ${step.expectedResult}\n`
            if (step.screenshot) {
              doc += `   - **Screenshot**: Required\n`
            }
            doc += '\n'
          }
        } else {
          // Auto-generate from test steps
          doc += `**Test Steps**:\n\n`
          scenario.steps.forEach((step, i) => {
            doc += `${i + 1}. ${step.description}\n`
            if (step.target) {
              doc += `   - **Target**: ${step.target}\n`
            }
            if (step.value) {
              doc += `   - **Value**: ${step.value}\n`
            }
            doc += '\n'
          })
        }
        
        doc += `**Expected Results**:\n`
        scenario.expectedResults.forEach((result, i) => {
          doc += `${i + 1}. ${result}\n`
        })
        doc += '\n---\n\n'
      }
    }
    
    // Test results if available
    if (this.results.length > 0) {
      doc += `## Test Execution Results\n\n`
      
      for (const result of this.results) {
        doc += `### ${result.scenarioName} (${result.mode} mode)\n`
        doc += `- **Status**: ${result.status}\n`
        doc += `- **Duration**: ${result.duration}ms\n`
        doc += `- **Steps Completed**: ${result.stepsCompleted}/${result.totalSteps}\n`
        
        if (result.errors.length > 0) {
          doc += `- **Errors**:\n`
          result.errors.forEach(err => {
            doc += `  - ${err}\n`
          })
        }
        
        if (result.warnings.length > 0) {
          doc += `- **Warnings**:\n`
          result.warnings.forEach(warn => {
            doc += `  - ${warn}\n`
          })
        }
        doc += '\n'
      }
    }
    
    return doc
  }

  /**
   * Abstract methods to be implemented by specific services
   */
  abstract getFeatures(): ServiceFeature[]
  abstract getTestScenarios(): TestScenario[]
}

/**
 * Test report interface
 */
interface TestReport {
  service: string
  serviceId: string
  timestamp: string
  summary: {
    total: number
    passed: number
    failed: number
    partial: number
    skipped: number
  }
  modeBreakdown: {
    port: number
    embed: number
  }
  results: TestResult[]
  features: ServiceFeature[]
}

export default DualModeTestFramework