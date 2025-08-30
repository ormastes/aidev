/**
 * Task Queue Dual Mode System Tests
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
 * Task Queue Test Implementation
 */
class TaskQueueDualModeTest extends DualModeTestFramework {
  constructor() {
    const config: ServiceTestConfig = {
      serviceName: 'Task Queue',
      serviceId: 'task-queue',
      portalUrl: 'http://localhost:3156',
      directUrl: 'http://localhost:3156/services/task-queue',
      defaultProject: 'portal_task-queue',
      supportedModes: ['port', 'embed', 'both'],
      features: []
    }
    super(config)
    this.config.features = this.getFeatures()
  }

  getFeatures(): ServiceFeature[] {
    return [
      {
        id: 'task-list',
        name: 'Task List Display',
        description: 'View all tasks from TASK_QUEUE.vf.json',
        testable: true,
        requiredMode: 'both',
        selectors: {
          taskList: '.task-list',
          taskItem: '.task-item',
          taskTitle: '.task-title',
          taskStatus: '.task-status'
        }
      },
      {
        id: 'task-creation',
        name: 'Task Creation',
        description: 'Add new tasks to the queue',
        testable: true,
        requiredMode: 'both',
        selectors: {
          addButton: '[data-action="add-task"]',
          taskInput: '#task-input',
          prioritySelect: '#task-priority',
          submitButton: '[data-action="submit-task"]'
        }
      },
      {
        id: 'task-update',
        name: 'Task Status Update',
        description: 'Change task status (pending, in_progress, completed)',
        testable: true,
        requiredMode: 'both',
        selectors: {
          statusDropdown: '.task-status-dropdown',
          statusOption: '[data-status]',
          updateButton: '[data-action="update-status"]'
        }
      },
      {
        id: 'task-priority',
        name: 'Priority Management',
        description: 'Set and view task priorities (high, medium, low)',
        testable: true,
        requiredMode: 'both',
        selectors: {
          priorityBadge: '.priority-badge',
          priorityFilter: '#priority-filter'
        }
      },
      {
        id: 'task-filtering',
        name: 'Task Filtering',
        description: 'Filter tasks by status, priority, or search',
        testable: true,
        requiredMode: 'both',
        selectors: {
          searchBox: '#task-search',
          statusFilter: '#status-filter',
          clearFilter: '[data-action="clear-filters"]'
        }
      },
      {
        id: 'task-deletion',
        name: 'Task Deletion',
        description: 'Remove completed or cancelled tasks',
        testable: true,
        requiredMode: 'both',
        selectors: {
          deleteButton: '[data-action="delete-task"]',
          confirmDelete: '[data-action="confirm-delete"]'
        }
      },
      {
        id: 'bulk-operations',
        name: 'Bulk Operations',
        description: 'Select and operate on multiple tasks',
        testable: true,
        requiredMode: 'port', // May not work well in iframe
        selectors: {
          selectAll: '#select-all',
          taskCheckbox: '.task-checkbox',
          bulkAction: '#bulk-action-select',
          applyBulk: '[data-action="apply-bulk"]'
        }
      },
      {
        id: 'project-context',
        name: 'Project Context',
        description: 'Load and save tasks for specific projects',
        testable: true,
        requiredMode: 'both',
        selectors: {
          projectName: '.project-name',
          projectPath: '.project-path'
        }
      }
    ]
  }

  getTestScenarios(): TestScenario[] {
    return [
      {
        id: 'tq-basic-display',
        name: 'Basic Task Display',
        description: 'Test task list loading and display',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        preconditions: [
          'Portal is running',
          'Task Queue service is accessible',
          'Project has TASK_QUEUE.vf.json file'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'wait',
            value: 2000,
            description: 'Wait for tasks to load'
          },
          {
            id: 'step-2',
            action: 'validate',
            target: '.task-list',
            description: 'Verify task list container exists'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.task-item',
            description: 'Verify at least one task is displayed'
          }
        ],
        expectedResults: [
          'Task list is displayed',
          'Tasks show title and status',
          'Priority badges are visible'
        ],
        manualSteps: [
          {
            step: 1,
            instruction: 'Open Task Queue service',
            expectedResult: 'Task list should load automatically',
            screenshot: true
          },
          {
            step: 2,
            instruction: 'Verify task items are displayed',
            expectedResult: 'Each task should show title, status, and priority',
            screenshot: false
          }
        ]
      },
      {
        id: 'tq-create-task',
        name: 'Create New Task',
        description: 'Test task creation functionality',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        preconditions: [
          'Task list is displayed'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '[data-action="add-task"]',
            description: 'Click Add Task button'
          },
          {
            id: 'step-2',
            action: 'type',
            target: '#task-input',
            value: 'Test Task from System Test',
            description: 'Enter task description'
          },
          {
            id: 'step-3',
            action: 'select',
            target: '#task-priority',
            value: 'high',
            description: 'Set priority to high'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '[data-action="submit-task"]',
            description: 'Submit new task'
          },
          {
            id: 'step-5',
            action: 'wait',
            value: 1000,
            description: 'Wait for task to be added'
          },
          {
            id: 'step-6',
            action: 'validate',
            target: '.task-item:has-text("Test Task")',
            description: 'Verify new task appears in list'
          }
        ],
        expectedResults: [
          'Add task form opens',
          'Task is created with entered details',
          'New task appears in the list',
          'Task shows correct priority'
        ]
      },
      {
        id: 'tq-update-status',
        name: 'Update Task Status',
        description: 'Test changing task status',
        mode: 'both',
        priority: 'high',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '.task-item:first-child .task-status-dropdown',
            description: 'Click status dropdown on first task'
          },
          {
            id: 'step-2',
            action: 'click',
            target: '[data-status="in_progress"]',
            description: 'Select In Progress status'
          },
          {
            id: 'step-3',
            action: 'click',
            target: '[data-action="update-status"]',
            description: 'Apply status change'
          },
          {
            id: 'step-4',
            action: 'wait',
            value: 1000,
            description: 'Wait for update'
          },
          {
            id: 'step-5',
            action: 'validate',
            target: '.task-item:first-child .task-status:has-text("In Progress")',
            description: 'Verify status changed'
          }
        ],
        expectedResults: [
          'Status dropdown shows options',
          'Status updates successfully',
          'Task shows new status',
          'Change is persisted'
        ]
      },
      {
        id: 'tq-filter-tasks',
        name: 'Filter Tasks',
        description: 'Test task filtering capabilities',
        mode: 'both',
        priority: 'medium',
        category: 'functional',
        steps: [
          {
            id: 'step-1',
            action: 'type',
            target: '#task-search',
            value: 'test',
            description: 'Search for test tasks'
          },
          {
            id: 'step-2',
            action: 'wait',
            value: 500,
            description: 'Wait for filter to apply'
          },
          {
            id: 'step-3',
            action: 'validate',
            target: '.task-item',
            description: 'Verify filtered results'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '[data-action="clear-filters"]',
            description: 'Clear filters'
          },
          {
            id: 'step-5',
            action: 'select',
            target: '#status-filter',
            value: 'pending',
            description: 'Filter by pending status'
          }
        ],
        expectedResults: [
          'Search filters tasks in real-time',
          'Status filter shows only matching tasks',
          'Clear filter restores all tasks',
          'Multiple filters can be combined'
        ]
      },
      {
        id: 'tq-delete-task',
        name: 'Delete Task',
        description: 'Test task deletion',
        mode: 'both',
        priority: 'medium',
        category: 'functional',
        preconditions: [
          'At least one completed task exists'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '.task-item:has(.task-status:has-text("Completed")) [data-action="delete-task"]',
            description: 'Click delete on completed task'
          },
          {
            id: 'step-2',
            action: 'click',
            target: '[data-action="confirm-delete"]',
            description: 'Confirm deletion'
          },
          {
            id: 'step-3',
            action: 'wait',
            value: 1000,
            description: 'Wait for deletion'
          }
        ],
        expectedResults: [
          'Confirmation dialog appears',
          'Task is removed from list',
          'Task count updates',
          'Change is persisted to file'
        ]
      },
      {
        id: 'tq-bulk-operations',
        name: 'Bulk Task Operations',
        description: 'Test bulk selection and operations',
        mode: 'port', // Complex interactions may not work in iframe
        priority: 'low',
        category: 'functional',
        preconditions: [
          'Multiple tasks exist'
        ],
        steps: [
          {
            id: 'step-1',
            action: 'click',
            target: '#select-all',
            description: 'Select all tasks'
          },
          {
            id: 'step-2',
            action: 'validate',
            target: '.task-checkbox:checked',
            description: 'Verify all checkboxes checked'
          },
          {
            id: 'step-3',
            action: 'select',
            target: '#bulk-action-select',
            value: 'complete',
            description: 'Select bulk complete action'
          },
          {
            id: 'step-4',
            action: 'click',
            target: '[data-action="apply-bulk"]',
            description: 'Apply bulk action'
          }
        ],
        expectedResults: [
          'All tasks can be selected',
          'Bulk actions menu appears',
          'Selected action applies to all checked tasks',
          'UI updates to reflect changes'
        ]
      },
      {
        id: 'tq-embed-specific',
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
            target: '.project-name',
            description: 'Verify project context is shown'
          },
          {
            id: 'step-3',
            action: 'screenshot',
            description: 'Capture embedded view'
          }
        ],
        expectedResults: [
          'Service loads correctly in modal iframe',
          'Project context is received and displayed',
          'Tasks load for the selected project',
          'All CRUD operations work within iframe'
        ],
        manualSteps: [
          {
            step: 1,
            instruction: 'Open portal and select a project',
            expectedResult: 'Project is selected in dropdown'
          },
          {
            step: 2,
            instruction: 'Click on Task Queue service card',
            expectedResult: 'Modal opens with Task Queue in iframe',
            screenshot: true
          },
          {
            step: 3,
            instruction: 'Verify tasks are for selected project',
            expectedResult: 'Tasks shown match the selected project\'s TASK_QUEUE.vf.json'
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
    
    console.log(`Running ${scenarios.length} test scenarios for Task Queue...`)
    
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
      `test-results/task-queue-test-report-${Date.now()}.json`,
      JSON.stringify(testReport, null, 2)
    )
    
    // Save manual test documentation
    await fs.writeFile(
      `gen/doc/task-queue-manual-tests-${Date.now()}.md`,
      manualDoc
    )
    
    console.log('\n✅ Test execution complete!')
    console.log(`📊 JSON Report: test-results/task-queue-test-report-*.json`)
    console.log(`📝 Manual Docs: gen/doc/task-queue-manual-tests-*.md`)
    
    await this.cleanup()
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const tester = new TaskQueueDualModeTest()
  await tester.runAllTests()
}

export default TaskQueueDualModeTest