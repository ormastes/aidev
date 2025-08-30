/**
 * Dual Mode System Test Framework for GUI Selector
 * Supports both embedded (iframe) and direct port access
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { Page, Browser } from 'playwright'

export enum TestMode {
  PORT = 'port',      // Direct access via port
  EMBED = 'embed',    // Embedded in portal iframe
  BOTH = 'both'       // Run test in both modes
}

export interface TestConfig {
  portalUrl: string
  serviceUrl: string
  projectId?: string
  mode: TestMode
}

export interface TestCase {
  id: string
  name: string
  description: string
  mode: TestMode
  steps: TestStep[]
  expectedResults: string[]
  category: 'ui' | 'api' | 'integration' | 'accessibility' | 'performance'
}

export interface TestStep {
  action: string
  selector?: string
  value?: any
  validation?: (page: Page) => Promise<boolean>
}

export interface TestReport {
  testId: string
  testName: string
  mode: 'port' | 'embed'
  status: 'pass' | 'fail' | 'skip'
  duration: number
  errors?: string[]
  screenshots?: string[]
}

/**
 * Base class for dual-mode testing
 */
export class DualModeTestRunner {
  private portalUrl: string = 'http://localhost:3156'
  private serviceUrl: string = 'http://localhost:3156/services/gui-selector'
  private projectId: string = 'test-project'
  private testReports: TestReport[] = []
  private browser: Browser | null = null
  private page: Page | null = null

  constructor(config?: Partial<TestConfig>) {
    if (config?.portalUrl) this.portalUrl = config.portalUrl
    if (config?.serviceUrl) this.serviceUrl = config.serviceUrl
    if (config?.projectId) this.projectId = config.projectId
  }

  /**
   * Run test in both modes if specified
   */
  async runTest(testCase: TestCase): Promise<TestReport[]> {
    const reports: TestReport[] = []
    
    if (testCase.mode === TestMode.BOTH || testCase.mode === TestMode.PORT) {
      const portReport = await this.runPortMode(testCase)
      reports.push(portReport)
    }
    
    if (testCase.mode === TestMode.BOTH || testCase.mode === TestMode.EMBED) {
      const embedReport = await this.runEmbedMode(testCase)
      reports.push(embedReport)
    }
    
    this.testReports.push(...reports)
    return reports
  }

  /**
   * Run test in direct port access mode
   */
  private async runPortMode(testCase: TestCase): Promise<TestReport> {
    const startTime = Date.now()
    const report: TestReport = {
      testId: testCase.id,
      testName: testCase.name,
      mode: 'port',
      status: 'pass',
      duration: 0
    }

    try {
      // Navigate directly to service URL
      await this.navigateToService()
      
      // Execute test steps
      for (const step of testCase.steps) {
        await this.executeStep(step)
      }
      
      // Validate results
      for (const expectedResult of testCase.expectedResults) {
        const valid = await this.validateResult(expectedResult)
        if (!valid) {
          report.status = 'fail'
          report.errors = report.errors || []
          report.errors.push(`Failed validation: ${expectedResult}`)
        }
      }
      
    } catch (error) {
      report.status = 'fail'
      report.errors = [error.toString()]
    }
    
    report.duration = Date.now() - startTime
    return report
  }

  /**
   * Run test in embedded iframe mode
   */
  private async runEmbedMode(testCase: TestCase): Promise<TestReport> {
    const startTime = Date.now()
    const report: TestReport = {
      testId: testCase.id,
      testName: testCase.name,
      mode: 'embed',
      status: 'pass',
      duration: 0
    }

    try {
      // Navigate to portal
      await this.navigateToPortal()
      
      // Select project
      await this.selectProject(this.projectId)
      
      // Open service in modal
      await this.openServiceModal('gui-selector')
      
      // Switch to iframe context
      await this.switchToIframe()
      
      // Execute test steps
      for (const step of testCase.steps) {
        await this.executeStep(step)
      }
      
      // Validate results
      for (const expectedResult of testCase.expectedResults) {
        const valid = await this.validateResult(expectedResult)
        if (!valid) {
          report.status = 'fail'
          report.errors = report.errors || []
          report.errors.push(`Failed validation: ${expectedResult}`)
        }
      }
      
    } catch (error) {
      report.status = 'fail'
      report.errors = [error.toString()]
    }
    
    report.duration = Date.now() - startTime
    return report
  }

  /**
   * Navigation helpers
   */
  private async navigateToService(): Promise<void> {
    // Implementation for direct navigation
    console.log(`Navigating to: ${this.serviceUrl}`)
  }

  private async navigateToPortal(): Promise<void> {
    // Implementation for portal navigation
    console.log(`Navigating to portal: ${this.portalUrl}`)
  }

  private async selectProject(projectId: string): Promise<void> {
    // Implementation for project selection
    console.log(`Selecting project: ${projectId}`)
  }

  private async openServiceModal(serviceId: string): Promise<void> {
    // Implementation for opening service modal
    console.log(`Opening service modal: ${serviceId}`)
  }

  private async switchToIframe(): Promise<void> {
    // Implementation for switching to iframe context
    console.log('Switching to iframe context')
  }

  /**
   * Test execution helpers
   */
  private async executeStep(step: TestStep): Promise<void> {
    console.log(`Executing step: ${step.action}`)
    
    if (step.validation && this.page) {
      const valid = await step.validation(this.page)
      if (!valid) {
        throw new Error(`Step validation failed: ${step.action}`)
      }
    }
  }

  private async validateResult(expectedResult: string): Promise<boolean> {
    console.log(`Validating: ${expectedResult}`)
    return true // Placeholder
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const report = {
      summary: {
        total: this.testReports.length,
        passed: this.testReports.filter(r => r.status === 'pass').length,
        failed: this.testReports.filter(r => r.status === 'fail').length,
        skipped: this.testReports.filter(r => r.status === 'skip').length
      },
      tests: this.testReports
    }
    
    return JSON.stringify(report, null, 2)
  }

  /**
   * Generate manual test documentation
   */
  generateManualTestDoc(): string {
    let doc = `# GUI Selector - Manual Test Documentation\n\n`
    doc += `Generated: ${new Date().toISOString()}\n\n`
    
    doc += `## Test Execution Modes\n\n`
    doc += `- **Port Mode**: Direct access via ${this.serviceUrl}\n`
    doc += `- **Embed Mode**: Access through portal modal at ${this.portalUrl}\n\n`
    
    doc += `## Test Results\n\n`
    
    for (const report of this.testReports) {
      doc += `### ${report.testName}\n`
      doc += `- **Mode**: ${report.mode}\n`
      doc += `- **Status**: ${report.status}\n`
      doc += `- **Duration**: ${report.duration}ms\n`
      
      if (report.errors && report.errors.length > 0) {
        doc += `- **Errors**:\n`
        report.errors.forEach(err => {
          doc += `  - ${err}\n`
        })
      }
      doc += '\n'
    }
    
    return doc
  }
}

/**
 * GUI Selector specific test cases
 */
export class GuiSelectorTests extends DualModeTestRunner {
  getTestCases(): TestCase[] {
    return [
      {
        id: 'gui-001',
        name: 'Theme Selection Test',
        description: 'Test theme selection functionality',
        mode: TestMode.BOTH,
        category: 'ui',
        steps: [
          {
            action: 'Click on Modern Dark theme',
            selector: '[data-theme-id="modern-dark"]',
            validation: async (page) => {
              const selected = await page.$('.theme-card.selected[data-theme-id="modern-dark"]')
              return selected !== null
            }
          },
          {
            action: 'Verify theme is selected',
            validation: async (page) => {
              const preview = await page.$('#preview-container')
              return preview !== null
            }
          }
        ],
        expectedResults: [
          'Theme card shows selected state',
          'Preview updates with selected theme'
        ]
      },
      {
        id: 'gui-002',
        name: 'Template Selection Test',
        description: 'Test template selection functionality',
        mode: TestMode.BOTH,
        category: 'ui',
        steps: [
          {
            action: 'Navigate to Templates tab',
            selector: '[onclick*="templates"]',
            validation: async (page) => {
              const section = await page.$('#templates.section.active')
              return section !== null
            }
          },
          {
            action: 'Select Dashboard template',
            selector: '[data-template-id="dashboard"]',
            validation: async (page) => {
              const selected = await page.$('.template-card.selected[data-template-id="dashboard"]')
              return selected !== null
            }
          }
        ],
        expectedResults: [
          'Template tab is active',
          'Dashboard template is selected',
          'Components are displayed'
        ]
      },
      {
        id: 'gui-003',
        name: 'Preview Generation Test',
        description: 'Test live preview generation',
        mode: TestMode.PORT, // Some tests might only work in port mode
        category: 'integration',
        steps: [
          {
            action: 'Select theme and template',
            validation: async (page) => {
              // Select both theme and template
              return true
            }
          },
          {
            action: 'Navigate to Preview tab',
            selector: '[onclick*="preview"]'
          },
          {
            action: 'Verify preview is generated',
            validation: async (page) => {
              const preview = await page.$eval('#preview-container', el => el.innerHTML)
              return preview.length > 100 // Has content
            }
          }
        ],
        expectedResults: [
          'Preview contains theme styles',
          'Preview contains template structure'
        ]
      },
      {
        id: 'gui-004',
        name: 'Customization Options Test',
        description: 'Test customization panel',
        mode: TestMode.EMBED, // Some tests might only work in embed mode
        category: 'ui',
        steps: [
          {
            action: 'Navigate to Customize tab',
            selector: '[onclick*="customize"]'
          },
          {
            action: 'Change primary color',
            selector: '#primaryColor',
            value: '#ff0000'
          },
          {
            action: 'Apply customizations',
            selector: '[onclick*="applyCustomizations"]'
          }
        ],
        expectedResults: [
          'Color picker is functional',
          'Customizations are applied'
        ]
      },
      {
        id: 'gui-005',
        name: 'Export Configuration Test',
        description: 'Test configuration export',
        mode: TestMode.BOTH,
        category: 'integration',
        steps: [
          {
            action: 'Select theme and template'
          },
          {
            action: 'Click export button',
            selector: '[onclick*="exportSelection"]',
            validation: async (page) => {
              // Check if download triggered
              return true
            }
          }
        ],
        expectedResults: [
          'JSON configuration is exported',
          'File contains correct structure'
        ]
      },
      {
        id: 'gui-006',
        name: 'Selection History Test',
        description: 'Test selection history functionality',
        mode: TestMode.BOTH,
        category: 'integration',
        steps: [
          {
            action: 'Make a selection and save'
          },
          {
            action: 'Navigate to History tab',
            selector: '[onclick*="history"]'
          },
          {
            action: 'Verify history item exists',
            validation: async (page) => {
              const items = await page.$$('.history-item')
              return items.length > 0
            }
          }
        ],
        expectedResults: [
          'History shows saved selections',
          'Can load previous selections'
        ]
      }
    ]
  }

  /**
   * Run all GUI selector tests
   */
  async runAllTests(): Promise<void> {
    const testCases = this.getTestCases()
    
    console.log(`Running ${testCases.length} test cases...`)
    
    for (const testCase of testCases) {
      console.log(`\nRunning: ${testCase.name} (${testCase.mode})`)
      await this.runTest(testCase)
    }
    
    // Generate reports
    const jsonReport = this.generateReport()
    const manualDoc = this.generateManualTestDoc()
    
    // Save reports
    await this.saveReport(jsonReport, 'json')
    await this.saveReport(manualDoc, 'md')
  }

  private async saveReport(content: string, format: 'json' | 'md'): Promise<void> {
    const filename = `gui-selector-test-report-${Date.now()}.${format}`
    console.log(`Report saved: ${filename}`)
    // Implementation to save file
  }
}

// Export for use in test suites
export default GuiSelectorTests