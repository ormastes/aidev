/**
 * Story Reporter Dual Mode System Tests
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
 * Story Reporter Test Implementation
 */
class StoryReporterDualModeTest extends DualModeTestFramework {
  constructor() {
    const config: ServiceTestConfig = {
      serviceName: 'Story Reporter',
      serviceId: 'story-reporter',
      portalUrl: 'http://localhost:3156',
      directUrl: 'http://localhost:3156/services/story-reporter',
      defaultProject: 'infra_story-reporter',
      supportedModes: ['port', 'embed', 'both'],
      features: []
    }
    super(config)
    this.config.features = this.getFeatures()
  }

  getFeatures(): ServiceFeature[] {
    return [
      {
        id: 'story-list',
        name: 'User Story Listing',
        description: 'Display all user stories from the project',
        testable: true,
        requiredMode: 'both',
        selectors: {
          storyList: '.story-list',
          storyCard: '.story-card',
          storyTitle: '.story-title',
          storyPoints: '.story-points'
        }
      },
      {
        id: 'story-details',
        name: 'Story Details View',
        description: 'View detailed information about a user story',
        testable: true,
        requiredMode: 'both',
        selectors: {
          detailsPanel: '.story-details',
          acceptanceCriteria: '.acceptance-criteria',
          storyDescription: '.story-description',
          taskList: '.story-tasks'
        }
      },
      {
        id: 'story-creation',
        name: 'Create New Story',
        description: 'Add new user stories to the project',
        testable: true,
        requiredMode: 'both',
        selectors: {
          createButton: '[data-action="create-story"]',
          titleInput: '#story-title',
          descriptionInput: '#story-description',
          pointsSelect: '#story-points',
          submitButton: '[data-action="submit-story"]'
        }
      },
      {
        id: 'story-status',
        name: 'Story Status Tracking',
        description: 'Update and track story progress',
        testable: true,
        requiredMode: 'both',
        selectors: {
          statusColumn: '.status-column',
          statusDropdown: '.story-status-select',
          progressBar: '.story-progress',
          moveCard: '[data-action="move-story"]'
        }
      },
      {
        id: 'sprint-planning',
        name: 'Sprint Planning View',
        description: 'Organize stories into sprints',
        testable: true,
        requiredMode: 'both',
        selectors: {
          sprintBoard: '.sprint-board',
          sprintSelector: '#sprint-select',
          backlogColumn: '.backlog-column',
          dragHandle: '.story-drag-handle'
        }
      },
      {
        id: 'story-filtering',
        name: 'Story Filtering',
        description: 'Filter stories by various criteria',
        testable: true,
        requiredMode: 'both',
        selectors: {
          searchInput: '#story-search',
          labelFilter: '.label-filter',
          assigneeFilter: '#assignee-filter',
          statusFilter: '#story-status-filter'
        }
      },
      {
        id: 'report-generation',
        name: 'Report Generation',
        description: 'Generate sprint and velocity reports',
        testable: true,
        requiredMode: 'port', // File download may not work in iframe
        selectors: {
          reportButton: '[data-action="generate-report"]',
          reportType: '#report-type',
          dateRange: '.date-range-picker',
          downloadButton: '[data-action="download-report"]'
        }
      },
      {
        id: 'story-export',
        name: 'Story Export',
        description: 'Export stories in various formats',
        testable: true,
        requiredMode: 'port', // File operations limited in iframe
        selectors: {
          exportButton: '[data-action="export-stories"]',
          formatSelect: '#export-format',
          exportOptions: '.export-options'
        }
      }
    ]
  }

  getTestScenarios(): TestScenario[] {
    return [
      {
        id: 'sr-story-listing',
        name: 'Story List Display',
        description: 'Test loading and displaying user stories',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        preconditions: [
          'Portal is running',
          'Story Reporter service is accessible',
          'Project has user stories defined'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'wait',
            value: 2000,
            description: 'Wait for stories to load'
          },
          {
            id: 'step-2',
            action: 'validate',
            target: '.story-list',
            description: 'Verify story list container exists'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.story-card',
            description: 'Verify story cards are displayed'
          },
          {
            id: 'step-4',
            action: 'screenshot',
            description: 'Capture story list view'
          }
        ],
        expectedResults: [
          'Story list loads automatically',
          'Stories display title and points',
          'Status indicators are visible',
          'Stories are grouped by status'
        ],
        manualSteps: [
          {
            step: 1,
            instruction: 'Open Story Reporter service',
            expectedResult: 'Story board should load with all stories',
            screenshot: true
          },
          {
            step: 2,
            instruction: 'Verify story cards show required information',
            expectedResult: 'Each card shows title, points, status, and assignee',
            screenshot: false
          }
        ]
      },
      {
        id: 'sr-story-details',
        name: 'View Story Details',
        description: 'Test opening and viewing story details',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '.story-card:first-child',
            description: 'Click on first story card'
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
            target: '.story-details',
            description: 'Verify details panel opened'
          },
          {
            id: 'step-4',
            action: 'validate',
            target: '.acceptance-criteria',
            description: 'Verify acceptance criteria shown'
          }
        ],
        expectedResults: [
          'Details panel opens',
          'Full story description is shown',
          'Acceptance criteria are listed',
          'Related tasks are displayed'
        ]
      },
      {
        id: 'sr-create-story',
        name: 'Create New Story',
        description: 'Test creating a new user story',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[data-action="create-story"]',
            description: 'Click Create Story button'
          },
          {
            id: 'step-2',
            action: 'type',
            target: '#story-title',
            value: 'As a user, I want to test story creation',
            description: 'Enter story title'
          },
          {
            id: 'step-3',
            action: 'type',
            target: '#story-description',
            value: 'This story tests the creation functionality',
            description: 'Enter description'
          },
          {
            id: 'step-4',
            action: 'select',
            target: '#story-points',
            value: '5',
            description: 'Select story points'
          },
          {
            id: 'step-5',
            action: 'click',
            target: '[data-action="submit-story"]',
            description: 'Submit new story'
          },
          {
            id: 'step-6',
            action: 'wait',
            value: 1000,
            description: 'Wait for story creation'
          }
        ],
        expectedResults: [
          'Story creation form opens',
          'Form validates required fields',
          'New story appears in backlog',
          'Story shows entered details'
        ]
      },
      {
        id: 'sr-update-status',
        name: 'Update Story Status',
        description: 'Test changing story status',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '.story-card:first-child .story-status-select',
            description: 'Click status dropdown'
          },
          {
            id: 'step-2',
            action: 'select',
            target: '.story-status-select',
            value: 'in-progress',
            description: 'Select In Progress'
          },
          {
            id: 'step-3',
            action: 'wait',
            value: 1000,
            description: 'Wait for status update'
          },
          {
            id: 'step-4',
            action: 'validate',
            target: '.status-column[data-status="in-progress"] .story-card',
            description: 'Verify story moved to correct column'
          }
        ],
        expectedResults: [
          'Status dropdown shows options',
          'Story moves to new status column',
          'Progress indicators update',
          'Change is persisted'
        ]
      },
      {
        id: 'sr-sprint-planning',
        name: 'Sprint Planning',
        description: 'Test sprint planning functionality',
        mode: 'both',
        priority: 'medium',
        category: 'functional',
        preconditions: [
          'Stories exist in backlog'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[data-view="sprint-planning"]',
            description: 'Switch to sprint planning view'
          },
          {
            id: 'step-2',
            action: 'select',
            target: '#sprint-select',
            value: 'Sprint 1',
            description: 'Select sprint'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '.backlog-column .story-card:first-child',
            description: 'Select story from backlog'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '[data-action="add-to-sprint"]',
            description: 'Add story to sprint'
          }
        ],
        expectedResults: [
          'Sprint planning view loads',
          'Backlog stories are shown',
          'Stories can be added to sprint',
          'Sprint capacity is calculated'
        ]
      },
      {
        id: 'sr-filtering',
        name: 'Filter Stories',
        description: 'Test story filtering capabilities',
        mode: 'both',
        priority: 'medium',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'type',
            target: '#story-search',
            value: 'login',
            description: 'Search for login stories'
          },
          {
            id: 'step-2',
            action: 'wait',
            value: 500,
            description: 'Wait for filter'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.story-card:visible',
            description: 'Verify filtered results'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '.label-filter[data-label="frontend"]',
            description: 'Filter by frontend label'
          }
        ],
        expectedResults: [
          'Search filters stories in real-time',
          'Label filters work correctly',
          'Multiple filters combine properly',
          'Clear filter restores all stories'
        ]
      },
      {
        id: 'sr-report-generation',
        name: 'Generate Reports',
        description: 'Test report generation',
        mode: 'port', // Download functionality
        priority: 'low',
        category: 'integration',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[data-action="generate-report"]',
            description: 'Open report dialog'
          },
          {
            id: 'step-2',
            action: 'select',
            target: '#report-type',
            value: 'velocity',
            description: 'Select velocity report'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '[data-action="generate"]',
            description: 'Generate report'
          },
          {
            id: 'step-4',
            action: 'wait',
            value: 2000,
            description: 'Wait for generation'
          },
          {
            id: 'step-5',
            action: 'validate',
            target: '.report-preview',
            description: 'Verify report preview'
          }
        ],
        expectedResults: [
          'Report dialog opens',
          'Report generates successfully',
          'Preview shows chart/data',
          'Download option available'
        ]
      },
      {
        id: 'sr-embed-specific',
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
            target: '.project-context',
            description: 'Verify project context shown'
          },
          {
            id: 'step-3',
            action: 'screenshot',
            description: 'Capture embedded view'
          }
        ],
        expectedResults: [
          'Service loads in modal iframe',
          'Project stories are loaded',
          'All interactions work in iframe',
          'Project context is maintained'
        ],
        manualSteps: [
          {
            step: 1,
            instruction: 'Open portal and select infra_story-reporter project',
            expectedResult: 'Project selected in dropdown'
          },
          {
            step: 2,
            instruction: 'Click Story Reporter service card',
            expectedResult: 'Modal opens with Story Reporter loaded',
            screenshot: true
          },
          {
            step: 3,
            instruction: 'Verify stories are from selected project',
            expectedResult: 'Stories match the selected project\'s data'
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
    
    console.log(`Running ${scenarios.length} test scenarios for Story Reporter...`)
    
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
      `test-results/story-reporter-test-report-${Date.now()}.json`,
      JSON.stringify(testReport, null, 2)
    )
    
    // Save manual test documentation
    await fs.writeFile(
      `gen/doc/story-reporter-manual-tests-${Date.now()}.md`,
      manualDoc
    )
    
    console.log('\n✅ Test execution complete!')
    console.log(`📊 JSON Report: test-results/story-reporter-test-report-*.json`)
    console.log(`📝 Manual Docs: gen/doc/story-reporter-manual-tests-*.md`)
    
    await this.cleanup()
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const tester = new StoryReporterDualModeTest()
  await tester.runAllTests()
}

export default StoryReporterDualModeTest