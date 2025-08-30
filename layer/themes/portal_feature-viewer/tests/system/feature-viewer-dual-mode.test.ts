/**
 * Feature Viewer Dual Mode System Tests
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
 * Feature Viewer Test Implementation
 */
class FeatureViewerDualModeTest extends DualModeTestFramework {
  constructor() {
    const config: ServiceTestConfig = {
      serviceName: 'Feature Viewer',
      serviceId: 'feature-viewer',
      portalUrl: 'http://localhost:3156',
      directUrl: 'http://localhost:3156/services/feature-viewer',
      defaultProject: 'portal_feature-viewer',
      supportedModes: ['port', 'embed', 'both'],
      features: []
    }
    super(config)
    this.config.features = this.getFeatures()
  }

  getFeatures(): ServiceFeature[] {
    return [
      {
        id: 'feature-tree',
        name: 'Feature Tree Display',
        description: 'Hierarchical view of all features from FEATURE.vf.json',
        testable: true,
        requiredMode: 'both',
        selectors: {
          featureTree: '.feature-tree',
          treeNode: '.tree-node',
          expandButton: '.expand-toggle',
          featureName: '.feature-name'
        }
      },
      {
        id: 'feature-details',
        name: 'Feature Details Panel',
        description: 'View detailed information about selected feature',
        testable: true,
        requiredMode: 'both',
        selectors: {
          detailsPanel: '.feature-details',
          featureStatus: '.feature-status',
          featurePriority: '.feature-priority',
          featureDescription: '.feature-description',
          dependencies: '.feature-dependencies'
        }
      },
      {
        id: 'feature-search',
        name: 'Feature Search',
        description: 'Search and filter features',
        testable: true,
        requiredMode: 'both',
        selectors: {
          searchBox: '#feature-search',
          searchResults: '.search-results',
          highlightedMatch: '.search-highlight'
        }
      },
      {
        id: 'status-tracking',
        name: 'Implementation Status',
        description: 'Track feature implementation progress',
        testable: true,
        requiredMode: 'both',
        selectors: {
          statusBadge: '.status-badge',
          progressBar: '.feature-progress',
          completionPercentage: '.completion-percentage'
        }
      },
      {
        id: 'dependency-graph',
        name: 'Dependency Visualization',
        description: 'View feature dependencies as graph',
        testable: true,
        requiredMode: 'both',
        selectors: {
          graphView: '.dependency-graph',
          graphNode: '.graph-node',
          graphEdge: '.graph-edge',
          viewToggle: '[data-view="graph"]'
        }
      },
      {
        id: 'feature-timeline',
        name: 'Feature Timeline',
        description: 'View features on timeline by target date',
        testable: true,
        requiredMode: 'both',
        selectors: {
          timelineView: '.feature-timeline',
          timelineItem: '.timeline-item',
          dateMarker: '.date-marker',
          viewToggle: '[data-view="timeline"]'
        }
      },
      {
        id: 'export-features',
        name: 'Export Features',
        description: 'Export feature list in various formats',
        testable: true,
        requiredMode: 'port', // File download limited in iframe
        selectors: {
          exportButton: '[data-action="export"]',
          formatSelect: '#export-format',
          downloadLink: '.download-link'
        }
      },
      {
        id: 'feature-editing',
        name: 'Feature Editing',
        description: 'Edit feature details and status',
        testable: true,
        requiredMode: 'both',
        selectors: {
          editButton: '[data-action="edit-feature"]',
          editForm: '.feature-edit-form',
          saveButton: '[data-action="save-feature"]',
          cancelButton: '[data-action="cancel-edit"]'
        }
      }
    ]
  }

  getTestScenarios(): TestScenario[] {
    return [
      {
        id: 'fv-feature-tree',
        name: 'Feature Tree Navigation',
        description: 'Test feature tree display and navigation',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        preconditions: [
          'Portal is running',
          'Feature Viewer service is accessible',
          'Project has FEATURE.vf.json file'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'wait',
            value: 2000,
            description: 'Wait for features to load'
          },
          {
            id: 'step-2',
            action: 'validate',
            target: '.feature-tree',
            description: 'Verify feature tree exists'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '.tree-node:first-child .expand-toggle',
            description: 'Expand first feature node'
          },
          {
            id: 'step-4',
            action: 'validate',
            target: '.tree-node.expanded',
            description: 'Verify node expanded'
          }
        ],
        expectedResults: [
          'Feature tree loads with all features',
          'Features show hierarchical structure',
          'Nodes can be expanded/collapsed',
          'Status badges are visible'
        ],
        manualSteps: [
          {
            step: 1,
            instruction: 'Open Feature Viewer service',
            expectedResult: 'Feature tree should load automatically',
            screenshot: true
          },
          {
            step: 2,
            instruction: 'Click expand toggle on parent features',
            expectedResult: 'Child features should be revealed',
            screenshot: false
          }
        ]
      },
      {
        id: 'fv-feature-details',
        name: 'View Feature Details',
        description: 'Test feature detail panel',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '.tree-node:first-child .feature-name',
            description: 'Click on first feature'
          },
          {
            id: 'step-2',
            action: 'wait',
            value: 1000,
            description: 'Wait for details to load'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.feature-details',
            description: 'Verify details panel shown'
          },
          {
            id: 'step-4',
            action: 'validate',
            target: '.feature-status',
            description: 'Verify status is displayed'
          }
        ],
        expectedResults: [
          'Details panel opens on selection',
          'All feature properties shown',
          'Dependencies are listed',
          'Implementation notes displayed'
        ]
      },
      {
        id: 'fv-search-features',
        name: 'Search Features',
        description: 'Test feature search functionality',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'type',
            target: '#feature-search',
            value: 'authentication',
            description: 'Search for authentication features'
          },
          {
            id: 'step-2',
            action: 'wait',
            value: 500,
            description: 'Wait for search results'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.search-results',
            description: 'Verify search results shown'
          },
          {
            id: 'step-4',
            action: 'validate',
            target: '.search-highlight',
            description: 'Verify matches are highlighted'
          }
        ],
        expectedResults: [
          'Search filters tree in real-time',
          'Matching text is highlighted',
          'Tree expands to show matches',
          'Clear search restores full tree'
        ]
      },
      {
        id: 'fv-dependency-graph',
        name: 'View Dependency Graph',
        description: 'Test dependency visualization',
        mode: 'both',
        priority: 'medium',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[data-view="graph"]',
            description: 'Switch to graph view'
          },
          {
            id: 'step-2',
            action: 'wait',
            value: 2000,
            description: 'Wait for graph to render'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.dependency-graph',
            description: 'Verify graph container exists'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '.graph-node:first-child',
            description: 'Click on a graph node'
          }
        ],
        expectedResults: [
          'Graph view renders correctly',
          'Nodes represent features',
          'Edges show dependencies',
          'Nodes are interactive'
        ]
      },
      {
        id: 'fv-timeline-view',
        name: 'Feature Timeline',
        description: 'Test timeline visualization',
        mode: 'both',
        priority: 'medium',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[data-view="timeline"]',
            description: 'Switch to timeline view'
          },
          {
            id: 'step-2',
            action: 'wait',
            value: 1500,
            description: 'Wait for timeline to render'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.feature-timeline',
            description: 'Verify timeline exists'
          },
          {
            id: 'step-4',
            action: 'validate',
            target: '.timeline-item',
            description: 'Verify timeline items shown'
          }
        ],
        expectedResults: [
          'Timeline view displays correctly',
          'Features positioned by date',
          'Date markers are visible',
          'Items show feature status'
        ]
      },
      {
        id: 'fv-edit-feature',
        name: 'Edit Feature',
        description: 'Test feature editing capabilities',
        mode: 'both',
        priority: 'medium',
        category: 'functional',
        preconditions: [
          'A feature is selected'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '.tree-node:first-child',
            description: 'Select a feature'
          },
          {
            id: 'step-2',
            action: 'click',
            target: '[data-action="edit-feature"]',
            description: 'Click edit button'
          },
          {
            id: 'step-3',
            action: 'type',
            target: '#feature-description',
            value: ' - Updated',
            description: 'Update description'
          },
          {
            id: 'step-4',
            action: 'select',
            target: '#feature-status',
            value: 'in-progress',
            description: 'Change status'
          },
          {
            id: 'step-5',
            action: 'click',
            target: '[data-action="save-feature"]',
            description: 'Save changes'
          }
        ],
        expectedResults: [
          'Edit form opens',
          'Fields are pre-populated',
          'Changes can be saved',
          'Tree updates with new data'
        ]
      },
      {
        id: 'fv-export-features',
        name: 'Export Features',
        description: 'Test feature export functionality',
        mode: 'port', // File download
        priority: 'low',
        category: 'integration',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[data-action="export"]',
            description: 'Click export button'
          },
          {
            id: 'step-2',
            action: 'select',
            target: '#export-format',
            value: 'json',
            description: 'Select JSON format'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '[data-action="download"]',
            description: 'Download file'
          },
          {
            id: 'step-4',
            action: 'wait',
            value: 1000,
            description: 'Wait for download'
          }
        ],
        expectedResults: [
          'Export dialog opens',
          'Format options available',
          'File downloads successfully',
          'Export contains all features'
        ]
      },
      {
        id: 'fv-embed-specific',
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
            target: '.project-header',
            description: 'Verify project context shown'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.feature-tree',
            description: 'Verify features loaded for project'
          },
          {
            id: 'step-4',
            action: 'screenshot',
            description: 'Capture embedded view'
          }
        ],
        expectedResults: [
          'Service loads in modal iframe',
          'Project features are loaded',
          'All views work in iframe',
          'Interactions function properly'
        ],
        manualSteps: [
          {
            step: 1,
            instruction: 'Open portal and select a project',
            expectedResult: 'Project selected in dropdown'
          },
          {
            step: 2,
            instruction: 'Click Feature Viewer service card',
            expectedResult: 'Modal opens with Feature Viewer loaded',
            screenshot: true
          },
          {
            step: 3,
            instruction: 'Verify features match selected project',
            expectedResult: 'Features from project\'s FEATURE.vf.json are shown'
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
    
    console.log(`Running ${scenarios.length} test scenarios for Feature Viewer...`)
    
    for (const scenario of scenarios) {
      console.log(`\nExecuting: ${scenario.name} (${scenario.mode} mode)`)
      await this.runScenario(scenario)
    }
    
    // Generate reports
    const testReport = this.generateTestReport()
    const manualDoc = this.generateManualTestDoc(scenarios)
    
    // Save reports
    const fs = await import('fs/promises')
    
    // Create directories if they don't exist
    await fs.mkdir('test-results', { recursive: true })
    await fs.mkdir('gen/doc', { recursive: true })
    
    // Save JSON report
    await fs.writeFile(
      `test-results/feature-viewer-test-report-${Date.now()}.json`,
      JSON.stringify(testReport, null, 2)
    )
    
    // Save manual test documentation
    await fs.writeFile(
      `gen/doc/feature-viewer-manual-tests-${Date.now()}.md`,
      manualDoc
    )
    
    console.log('\n✅ Test execution complete!')
    console.log(`📊 JSON Report: test-results/feature-viewer-test-report-*.json`)
    console.log(`📝 Manual Docs: gen/doc/feature-viewer-manual-tests-*.md`)
    
    await this.cleanup()
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const tester = new FeatureViewerDualModeTest()
  await tester.runAllTests()
}

export default FeatureViewerDualModeTest