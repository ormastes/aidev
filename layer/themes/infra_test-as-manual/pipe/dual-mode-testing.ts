/**
 * Dual Mode Testing Pipe Interface
 * Exposes dual-mode testing capabilities for web applications
 * Part of the test-as-manual theme infrastructure
 */

export { 
  default as DualModeTestFramework,
  ServiceFeature,
  TestScenario,
  ServiceTestConfig,
  TestStep,
  ManualStep,
  TestResult,
  TestReport
} from '../children/dual-mode-testing/DualModeTestFramework'

export { 
  default as AllServicesTestRunner,
  ServiceTestRunner,
  TestSummary
} from '../children/dual-mode-testing/AllServicesTestRunner'

// Re-export specific service testers
export { default as GuiSelectorDualModeTest } from '../../portal_gui-selector/tests/system/gui-selector-dual-mode.test'
export { default as TaskQueueDualModeTest } from '../../portal_task-queue/tests/system/task-queue-dual-mode.test'
export { default as StoryReporterDualModeTest } from '../../portal_story-reporter/tests/system/story-reporter-dual-mode.test'
export { default as FeatureViewerDualModeTest } from '../../portal_feature-viewer/tests/system/feature-viewer-dual-mode.test'

/**
 * Factory function to create a dual-mode test for a service
 */
export function createDualModeTest(config: {
  serviceName: string
  serviceId: string
  portalUrl?: string
  directUrl?: string
  defaultProject?: string
  supportedModes?: ('port' | 'embed' | 'both')[]
}) {
  const DualModeTestFramework = require('../children/dual-mode-testing/DualModeTestFramework').default
  
  class CustomDualModeTest extends DualModeTestFramework {
    constructor() {
      super({
        ...config,
        features: []
      })
    }
    
    getFeatures() {
      return []
    }
    
    getTestScenarios() {
      return []
    }
  }
  
  return CustomDualModeTest
}

/**
 * Run all service tests with a single function call
 */
export async function runAllDualModeTests(options?: {
  parallel?: boolean
  services?: string[]
  mode?: 'port' | 'embed' | 'both'
}): Promise<void> {
  const runner = new AllServicesTestRunner()
  await runner.runAllServiceTests(options)
}

/**
 * Generate manual test documentation for a specific service
 */
export async function generateManualTestDoc(
  serviceId: string,
  scenarios: any[]
): Promise<string> {
  const DualModeTestFramework = require('../children/dual-mode-testing/DualModeTestFramework').default
  
  // Create a temporary test instance to use the doc generation
  const testInstance = new class extends DualModeTestFramework {
    constructor() {
      super({
        serviceName: serviceId,
        serviceId: serviceId,
        supportedModes: ['both'],
        features: []
      })
    }
    getFeatures() { return [] }
    getTestScenarios() { return scenarios }
  }()
  
  return testInstance.generateManualTestDoc(scenarios)
}