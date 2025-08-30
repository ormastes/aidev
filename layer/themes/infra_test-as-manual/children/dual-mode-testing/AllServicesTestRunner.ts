/**
 * All Services Test Runner
 * Orchestrates running dual-mode tests for all portal services
 */

import * as fs from 'fs/promises'
import * as path from 'path'

// Import all service test implementations
import GuiSelectorDualModeTest from '../../../portal_gui-selector/tests/system/gui-selector-dual-mode.test'
import TaskQueueDualModeTest from '../../../portal_task-queue/tests/system/task-queue-dual-mode.test'
import StoryReporterDualModeTest from '../../../portal_story-reporter/tests/system/story-reporter-dual-mode.test'
import FeatureViewerDualModeTest from '../../../portal_feature-viewer/tests/system/feature-viewer-dual-mode.test'

interface ServiceTestRunner {
  serviceName: string
  testClass: any
  enabled: boolean
}

interface TestSummary {
  service: string
  totalScenarios: number
  passedScenarios: number
  failedScenarios: number
  portModeTests: number
  embedModeTests: number
  duration: number
  reportPath: string
  manualDocPath: string
}

/**
 * Main test orchestrator for all services
 */
export class AllServicesTestRunner {
  private services: ServiceTestRunner[] = [
    {
      serviceName: 'GUI Selector',
      testClass: GuiSelectorDualModeTest,
      enabled: true
    },
    {
      serviceName: 'Task Queue',
      testClass: TaskQueueDualModeTest,
      enabled: true
    },
    {
      serviceName: 'Story Reporter',
      testClass: StoryReporterDualModeTest,
      enabled: true
    },
    {
      serviceName: 'Feature Viewer',
      testClass: FeatureViewerDualModeTest,
      enabled: true
    }
    // Additional services can be added here
  ]
  
  private testSummaries: TestSummary[] = []
  private startTime: Date = new Date()
  
  /**
   * Run tests for all enabled services
   */
  async runAllServiceTests(options: {
    parallel?: boolean
    services?: string[]
    mode?: 'port' | 'embed' | 'both'
  } = {}): Promise<void> {
    console.log('🚀 Starting All Services Test Runner')
    console.log('=' .repeat(50))
    
    // Filter services if specified
    let servicesToTest = this.services.filter(s => s.enabled)
    
    if (options.services && options.services.length > 0) {
      servicesToTest = servicesToTest.filter(s => 
        options.services!.includes(s.serviceName)
      )
    }
    
    console.log(`\n📋 Services to test: ${servicesToTest.length}`)
    servicesToTest.forEach(s => console.log(`  - ${s.serviceName}`))
    console.log('')
    
    if (options.parallel) {
      await this.runParallel(servicesToTest, options)
    } else {
      await this.runSequential(servicesToTest, options)
    }
    
    // Generate consolidated report
    await this.generateConsolidatedReport()
    
    // Show summary
    this.showSummary()
  }
  
  /**
   * Run tests sequentially
   */
  private async runSequential(
    services: ServiceTestRunner[], 
    options: any
  ): Promise<void> {
    for (const service of services) {
      await this.runServiceTest(service, options)
    }
  }
  
  /**
   * Run tests in parallel
   */
  private async runParallel(
    services: ServiceTestRunner[],
    options: any
  ): Promise<void> {
    const promises = services.map(service => 
      this.runServiceTest(service, options)
    )
    await Promise.all(promises)
  }
  
  /**
   * Run test for a single service
   */
  private async runServiceTest(
    service: ServiceTestRunner,
    options: any
  ): Promise<void> {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`🧪 Testing: ${service.serviceName}`)
    console.log(`${'='.repeat(50)}`)
    
    const testStartTime = Date.now()
    
    try {
      // Create test instance
      const tester = new service.testClass()
      
      // Override mode if specified
      if (options.mode) {
        tester.config.supportedModes = [options.mode]
      }
      
      // Run tests
      await tester.runAllTests()
      
      // Collect summary
      const duration = Date.now() - testStartTime
      const report = tester.generateTestReport()
      
      this.testSummaries.push({
        service: service.serviceName,
        totalScenarios: report.results.length,
        passedScenarios: report.summary.passed,
        failedScenarios: report.summary.failed,
        portModeTests: report.modeBreakdown.port,
        embedModeTests: report.modeBreakdown.embed,
        duration,
        reportPath: `test-results/${service.serviceName.toLowerCase().replace(' ', '-')}-test-report-*.json`,
        manualDocPath: `gen/doc/${service.serviceName.toLowerCase().replace(' ', '-')}-manual-tests-*.md`
      })
      
      console.log(`✅ ${service.serviceName} tests completed in ${duration}ms`)
      
    } catch (error) {
      console.error(`❌ ${service.serviceName} tests failed:`, error)
      
      this.testSummaries.push({
        service: service.serviceName,
        totalScenarios: 0,
        passedScenarios: 0,
        failedScenarios: 0,
        portModeTests: 0,
        embedModeTests: 0,
        duration: Date.now() - testStartTime,
        reportPath: 'N/A',
        manualDocPath: 'N/A'
      })
    }
  }
  
  /**
   * Generate consolidated test report
   */
  private async generateConsolidatedReport(): Promise<void> {
    const report = {
      testRun: {
        timestamp: this.startTime.toISOString(),
        duration: Date.now() - this.startTime.getTime(),
        servicesTest: this.testSummaries.length
      },
      summary: {
        totalServices: this.testSummaries.length,
        totalScenarios: this.testSummaries.reduce((sum, s) => sum + s.totalScenarios, 0),
        totalPassed: this.testSummaries.reduce((sum, s) => sum + s.passedScenarios, 0),
        totalFailed: this.testSummaries.reduce((sum, s) => sum + s.failedScenarios, 0),
        totalPortTests: this.testSummaries.reduce((sum, s) => sum + s.portModeTests, 0),
        totalEmbedTests: this.testSummaries.reduce((sum, s) => sum + s.embedModeTests, 0)
      },
      services: this.testSummaries
    }
    
    // Save consolidated report
    await fs.mkdir('test-results', { recursive: true })
    await fs.writeFile(
      `test-results/all-services-test-report-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    )
    
    // Generate markdown summary
    await this.generateMarkdownSummary(report)
  }
  
  /**
   * Generate markdown summary document
   */
  private async generateMarkdownSummary(report: any): Promise<void> {
    let md = `# All Services Test Report\n\n`
    md += `Generated: ${report.testRun.timestamp}\n`
    md += `Duration: ${(report.testRun.duration / 1000).toFixed(2)}s\n\n`
    
    md += `## Summary\n\n`
    md += `- **Services Tested**: ${report.summary.totalServices}\n`
    md += `- **Total Scenarios**: ${report.summary.totalScenarios}\n`
    md += `- **Passed**: ${report.summary.totalPassed}\n`
    md += `- **Failed**: ${report.summary.totalFailed}\n`
    md += `- **Port Mode Tests**: ${report.summary.totalPortTests}\n`
    md += `- **Embed Mode Tests**: ${report.summary.totalEmbedTests}\n\n`
    
    md += `## Service Results\n\n`
    md += `| Service | Total | Passed | Failed | Port | Embed | Duration | Report | Manual Doc |\n`
    md += `|---------|-------|--------|--------|------|-------|----------|--------|------------|\n`
    
    for (const service of this.testSummaries) {
      md += `| ${service.service} `
      md += `| ${service.totalScenarios} `
      md += `| ${service.passedScenarios} `
      md += `| ${service.failedScenarios} `
      md += `| ${service.portModeTests} `
      md += `| ${service.embedModeTests} `
      md += `| ${(service.duration / 1000).toFixed(2)}s `
      md += `| [JSON](${service.reportPath}) `
      md += `| [MD](${service.manualDocPath}) |\n`
    }
    
    md += `\n## Test Execution Details\n\n`
    md += `### Port Mode\n`
    md += `Tests run directly against service endpoints at \`http://localhost:3156/services/*\`\n\n`
    
    md += `### Embed Mode\n`
    md += `Tests run through portal modal iframe embedding at \`http://localhost:3156\`\n\n`
    
    md += `## Coverage\n\n`
    md += `The following features are tested across all services:\n\n`
    md += `- Basic functionality and CRUD operations\n`
    md += `- Project context handling\n`
    md += `- UI interactions and navigation\n`
    md += `- Data persistence\n`
    md += `- Export/import capabilities (where applicable)\n`
    md += `- Filtering and search\n`
    md += `- Modal iframe embedding\n`
    md += `- Cross-mode feature parity\n\n`
    
    md += `## Next Steps\n\n`
    md += `1. Review failed tests and fix issues\n`
    md += `2. Add tests for remaining services\n`
    md += `3. Integrate with CI/CD pipeline\n`
    md += `4. Set up automated test runs\n`
    
    await fs.mkdir('gen/doc', { recursive: true })
    await fs.writeFile(
      `gen/doc/all-services-test-summary-${Date.now()}.md`,
      md
    )
  }
  
  /**
   * Show test summary in console
   */
  private showSummary(): void {
    const totalDuration = Date.now() - this.startTime.getTime()
    
    console.log(`\n${'='.repeat(50)}`)
    console.log(`📊 TEST SUMMARY`)
    console.log(`${'='.repeat(50)}`)
    
    console.log(`\nOverall Results:`)
    console.log(`  ✅ Services Tested: ${this.testSummaries.length}`)
    console.log(`  ⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    
    console.log(`\nPer Service:`)
    for (const summary of this.testSummaries) {
      const passRate = summary.totalScenarios > 0 
        ? ((summary.passedScenarios / summary.totalScenarios) * 100).toFixed(0)
        : '0'
      
      const icon = summary.failedScenarios === 0 ? '✅' : '⚠️'
      console.log(`  ${icon} ${summary.service}:`)
      console.log(`     Passed: ${summary.passedScenarios}/${summary.totalScenarios} (${passRate}%)`)
      console.log(`     Port: ${summary.portModeTests} | Embed: ${summary.embedModeTests}`)
      console.log(`     Duration: ${(summary.duration / 1000).toFixed(2)}s`)
    }
    
    console.log(`\n📁 Reports Generated:`)
    console.log(`  - test-results/all-services-test-report-*.json`)
    console.log(`  - gen/doc/all-services-test-summary-*.md`)
    console.log(`  - Individual service reports in test-results/`)
    console.log(`  - Manual test docs in gen/doc/`)
    
    console.log(`\n${'='.repeat(50)}`)
    console.log(`✨ All Services Test Run Complete!`)
    console.log(`${'='.repeat(50)}\n`)
  }
}

/**
 * CLI interface for running tests
 */
if (import.meta.main) {
  const runner = new AllServicesTestRunner()
  
  // Parse command line arguments
  const args = process.argv.slice(2)
  const options: any = {}
  
  // Check for parallel flag
  if (args.includes('--parallel') || args.includes('-p')) {
    options.parallel = true
  }
  
  // Check for mode flag
  const modeIndex = args.findIndex(arg => arg === '--mode' || arg === '-m')
  if (modeIndex !== -1 && args[modeIndex + 1]) {
    options.mode = args[modeIndex + 1] as 'port' | 'embed' | 'both'
  }
  
  // Check for specific services
  const servicesIndex = args.findIndex(arg => arg === '--services' || arg === '-s')
  if (servicesIndex !== -1 && args[servicesIndex + 1]) {
    options.services = args[servicesIndex + 1].split(',')
  }
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
All Services Test Runner

Usage: bun run all-services-test-runner.ts [options]

Options:
  -p, --parallel         Run tests in parallel
  -m, --mode <mode>      Test mode: port, embed, or both (default: both)
  -s, --services <list>  Comma-separated list of services to test
  -h, --help            Show this help message

Examples:
  # Run all tests sequentially
  bun run all-services-test-runner.ts
  
  # Run tests in parallel
  bun run all-services-test-runner.ts --parallel
  
  # Test only in port mode
  bun run all-services-test-runner.ts --mode port
  
  # Test specific services
  bun run all-services-test-runner.ts --services "GUI Selector,Task Queue"
`)
    process.exit(0)
  }
  
  // Run tests
  await runner.runAllServiceTests(options)
}

export default AllServicesTestRunner