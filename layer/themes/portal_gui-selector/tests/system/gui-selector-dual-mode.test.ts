/**
 * GUI Selector Dual Mode System Tests
 * Comprehensive test suite supporting both port and embed modes
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import DualModeTestFramework, {
  ServiceFeature,
  TestScenario,
  ServiceTestConfig,
  ManualStep
} from '../../../infra_test-as-manual/children/dual-mode-testing/DualModeTestFramework'

/**
 * GUI Selector Test Implementation
 */
class GuiSelectorDualModeTest extends DualModeTestFramework {
  constructor() {
    const config: ServiceTestConfig = {
      serviceName: 'GUI Selector',
      serviceId: 'gui-selector',
      portalUrl: 'http://localhost:3156',
      directUrl: 'http://localhost:3156/services/gui-selector',
      defaultProject: 'portal_gui-selector',
      supportedModes: ['port', 'embed', 'both'],
      features: []
    }
    super(config)
    this.config.features = this.getFeatures()
  }

  getFeatures(): ServiceFeature[] {
    return [
      {
        id: 'theme-selection',
        name: 'Theme Selection',
        description: 'Select from 5 pre-configured themes with visual previews',
        testable: true,
        requiredMode: 'both',
        selectors: {
          modernDark: '[data-theme-id="modern-dark"]',
          modernLight: '[data-theme-id="modern-light"]',
          classic: '[data-theme-id="classic-business"]',
          creative: '[data-theme-id="creative-gradient"]',
          accessible: '[data-theme-id="accessible-high-contrast"]'
        }
      },
      {
        id: 'template-selection',
        name: 'Template Selection',
        description: 'Choose from 5 layout templates with component listings',
        testable: true,
        requiredMode: 'both',
        selectors: {
          dashboard: '[data-template-id="dashboard"]',
          landing: '[data-template-id="landing-page"]',
          admin: '[data-template-id="admin-panel"]',
          mobile: '[data-template-id="mobile-app"]',
          ecommerce: '[data-template-id="e-commerce"]'
        }
      },
      {
        id: 'live-preview',
        name: 'Live Preview Generation',
        description: 'Real-time preview of theme and template combinations',
        testable: true,
        requiredMode: 'both',
        selectors: {
          previewContainer: '#preview-container',
          previewTab: '[onclick*="preview"]'
        }
      },
      {
        id: 'customization',
        name: 'Customization Panel',
        description: 'Fine-tune colors, fonts, spacing, and border radius',
        testable: true,
        requiredMode: 'both',
        selectors: {
          customizeTab: '[onclick*="customize"]',
          primaryColor: '#primaryColor',
          fontSize: 'select:has-text("Font Size")',
          borderRadius: 'input[type="range"]',
          spacing: 'select:has-text("Spacing")'
        }
      },
      {
        id: 'save-selection',
        name: 'Save Selection',
        description: 'Save theme and template selections per project',
        testable: true,
        requiredMode: 'both',
        selectors: {
          saveButton: '[onclick*="saveSelection"]'
        }
      },
      {
        id: 'export-config',
        name: 'Export Configuration',
        description: 'Export selection as JSON configuration file',
        testable: true,
        requiredMode: 'port', // Download might not work in iframe
        selectors: {
          exportButton: '[onclick*="exportSelection"]'
        }
      },
      {
        id: 'selection-history',
        name: 'Selection History',
        description: 'View and load previous selections for the project',
        testable: true,
        requiredMode: 'both',
        selectors: {
          historyTab: '[onclick*="history"]',
          historyItem: '.history-item',
          loadButton: '[onclick*="loadSelection"]'
        }
      },
      {
        id: 'tab-navigation',
        name: 'Tab Navigation',
        description: '5-step workflow with tab-based navigation',
        testable: true,
        requiredMode: 'both',
        selectors: {
          themeTab: '[onclick*="themes"]',
          templateTab: '[onclick*="templates"]',
          previewTab: '[onclick*="preview"]',
          customizeTab: '[onclick*="customize"]',
          historyTab: '[onclick*="history"]'
        }
      }
    ]
  }

  getTestScenarios(): TestScenario[] {
    return [
      {
        id: 'gui-basic-selection',
        name: 'Basic Theme and Template Selection',
        description: 'Test the core selection functionality',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        preconditions: [
          'Portal is running',
          'GUI Selector service is accessible'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[data-theme-id="modern-dark"]',
            description: 'Select Modern Dark theme'
          },
          {
            id: 'step-2',
            action: 'validate',
            target: '.theme-card.selected[data-theme-id="modern-dark"]',
            description: 'Verify theme is selected'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '[onclick*="templates"]',
            description: 'Navigate to Templates tab'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '[data-template-id="dashboard"]',
            description: 'Select Dashboard template'
          },
          {
            id: 'step-5',
            action: 'validate',
            target: '.template-card.selected[data-template-id="dashboard"]',
            description: 'Verify template is selected'
          }
        ],
        expectedResults: [
          'Theme card shows selected state with blue border',
          'Template card shows selected state',
          'Both selections are retained when switching tabs'
        ],
        manualSteps: [
          {
            step: 1,
            instruction: 'Click on the Modern Dark theme card',
            expectedResult: 'Theme card should be highlighted with blue border and light blue background',
            screenshot: true
          },
          {
            step: 2,
            instruction: 'Click on the "2. Select Template" tab',
            expectedResult: 'Template selection panel should be displayed',
            screenshot: false
          },
          {
            step: 3,
            instruction: 'Click on the Dashboard Layout template',
            expectedResult: 'Template card should be highlighted with blue border',
            screenshot: true
          }
        ]
      },
      {
        id: 'gui-preview-generation',
        name: 'Live Preview Generation',
        description: 'Test preview generation with different combinations',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        preconditions: [
          'Theme and template are selected'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[onclick*="preview"]',
            description: 'Navigate to Preview tab'
          },
          {
            id: 'step-2',
            action: 'wait',
            value: 1000,
            description: 'Wait for preview to generate'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '#preview-container',
            description: 'Verify preview container has content'
          },
          {
            id: 'step-4',
            action: 'screenshot',
            description: 'Capture preview screenshot'
          }
        ],
        expectedResults: [
          'Preview shows selected theme colors',
          'Preview displays template structure',
          'Preview updates when selections change'
        ]
      },
      {
        id: 'gui-customization',
        name: 'Customization Options',
        description: 'Test customization panel functionality',
        mode: 'embed', // Test in embed mode to ensure it works in iframe
        priority: 'medium',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[onclick*="customize"]',
            description: 'Open customization panel'
          },
          {
            id: 'step-2',
            action: 'type',
            target: '#primaryColor',
            value: '#FF5733',
            description: 'Change primary color'
          },
          {
            id: 'step-3',
            action: 'select',
            target: 'select:has-text("Font Size")',
            value: 'Large (18px)',
            description: 'Change font size'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '[onclick*="applyCustomizations"]',
            description: 'Apply customizations'
          }
        ],
        expectedResults: [
          'Color picker accepts custom color',
          'Font size dropdown changes value',
          'Customizations are applied to preview'
        ]
      },
      {
        id: 'gui-save-export',
        name: 'Save and Export Configuration',
        description: 'Test saving selections and exporting configuration',
        mode: 'port', // Export might not work in iframe
        priority: 'medium',
        category: 'integration',
        preconditions: [
          'Theme and template are selected'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[onclick*="saveSelection"]',
            description: 'Save current selection'
          },
          {
            id: 'step-2',
            action: 'wait',
            value: 1000,
            description: 'Wait for save confirmation'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '[onclick*="exportSelection"]',
            description: 'Export configuration'
          }
        ],
        expectedResults: [
          'Selection is saved successfully',
          'Alert confirms save',
          'JSON file is downloaded with configuration'
        ]
      },
      {
        id: 'gui-history',
        name: 'Selection History',
        description: 'Test history functionality',
        mode: 'both',
        priority: 'low',
        category: 'functional',
        preconditions: [
          'At least one selection has been saved'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[onclick*="history"]',
            description: 'Open history tab'
          },
          {
            id: 'step-2',
            action: 'validate',
            target: '.history-item',
            description: 'Verify history items exist'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '.history-item button',
            description: 'Load previous selection',
            optional: true
          }
        ],
        expectedResults: [
          'History tab shows saved selections',
          'Each history item shows theme and template names',
          'Load button restores previous selection'
        ]
      },
      {
        id: 'gui-tab-navigation',
        name: 'Tab Navigation Flow',
        description: 'Test navigation between all tabs',
        mode: 'both',
        priority: 'low',
        category: 'ui',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[onclick*="themes"]',
            description: 'Navigate to Themes'
          },
          {
            id: 'step-2',
            action: 'click',
            target: '[onclick*="templates"]',
            description: 'Navigate to Templates'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '[onclick*="preview"]',
            description: 'Navigate to Preview'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '[onclick*="customize"]',
            description: 'Navigate to Customize'
          },
          {
            id: 'step-5',
            action: 'click',
            target: '[onclick*="history"]',
            description: 'Navigate to History'
          }
        ],
        expectedResults: [
          'All tabs are clickable',
          'Active tab is highlighted',
          'Content changes for each tab'
        ]
      },
      {
        id: 'gui-embed-specific',
        name: 'Embed Mode Specific Tests',
        description: 'Test features specific to embedded mode',
        mode: 'embed',
        priority: 'high',
        category: 'integration',
        steps: [
          {
            id: 'step-1',
            action: 'validate',
            target: '#modalFrame',
            description: 'Verify service loads in iframe'
          },
          {
            id: 'step-2',
            action: 'validate',
            target: '.container',
            description: 'Verify GUI selector UI is rendered'
          },
          {
            id: 'step-3',
            action: 'screenshot',
            description: 'Capture embedded view'
          }
        ],
        expectedResults: [
          'Service loads correctly in modal iframe',
          'Project context is passed to service',
          'All features work within iframe constraints'
        ],
        manualSteps: [
          {
            step: 1,
            instruction: 'Open portal and select a project',
            expectedResult: 'Project dropdown shows selected project'
          },
          {
            step: 2,
            instruction: 'Click on GUI Selector service card',
            expectedResult: 'Modal opens with GUI Selector loaded in iframe',
            screenshot: true
          },
          {
            step: 3,
            instruction: 'Verify project name is shown in GUI Selector',
            expectedResult: 'Selected project name appears in GUI Selector header'
          }
        ]
      }
    ]
  }

  /**
   * Run all tests and generate documentation
   */
  async runAllTests(): Promise<void> {
    await this.initialize()
    
    const scenarios = this.getTestScenarios()
    
    console.log(`Running ${scenarios.length} test scenarios for GUI Selector...`)
    
    for (const scenario of scenarios) {
      console.log(`\nExecuting: ${scenario.name} (${scenario.mode} mode)`)
      await this.runScenario(scenario)
    }
    
    // Generate reports
    const testReport = this.generateTestReport()
    const manualDoc = this.generateManualTestDoc(scenarios)
    
    // Save reports
    const fs = await import('fs/promises')
    
    // Save JSON report
    await fs.writeFile(
      `test-results/gui-selector-test-report-${Date.now()}.json`,
      JSON.stringify(testReport, null, 2)
    )
    
    // Save manual test documentation
    await fs.writeFile(
      `gen/doc/gui-selector-manual-tests-${Date.now()}.md`,
      manualDoc
    )
    
    console.log('\n✅ Test execution complete!')
    console.log(`📊 JSON Report: test-results/gui-selector-test-report-*.json`)
    console.log(`📝 Manual Docs: gen/doc/gui-selector-manual-tests-*.md`)
    
    await this.cleanup()
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const tester = new GuiSelectorDualModeTest()
  await tester.runAllTests()
}

export default GuiSelectorDualModeTest