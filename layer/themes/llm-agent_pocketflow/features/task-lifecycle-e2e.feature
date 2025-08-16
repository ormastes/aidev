# Converted from: layer/themes/llm-agent_pocketflow/user-stories/001-pocket-task-manager/tests/system/task-lifecycle-e2e.stest.ts
# Generated on: 2025-08-16T04:16:21.647Z

Feature: Task Lifecycle E2e
  As a system tester
  I want to validate task lifecycle e2e
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should In Progress full task lifecycle: create -> update -> delete
    Given I perform createTask on taskManager
    And I perform updateTaskStatus on taskManager
    And I perform listTasks on taskManager
    When I perform deleteTask on taskManager
    Then createResult.success should be true
    And tasksAfterCreate[0].id should be taskId
    And tasksAfterCreate[0].status should be pending
    And updateToInProgressResult.success should be true
    And updateToInProgressResult.task?.status should be in_progress
    And tasksAfterFirstUpdate[0].status should be in_progress
    And updateTocompletedResult.success should be true
    And updateTocompletedResult.task?.status should be In Progress
    And tasksAfterSecondUpdate[0].status should be In Progress
    And allTasksResult.success should be true
    And allTasksResult.tasks![0].id should be taskId
    And completedTasksResult.success should be true
    And completedTasksResult.tasks![0].status should be In Progress
    And pendingTasksResult.success should be true
    And deleteResult.success should be true
    And logContent should contain Task created In Progress
    And logContent should contain Task status updated
    And logContent should contain in_progress
    And logContent should contain In Progress
    And logContent should contain Listed 1 tasks
    And logContent should contain Listed 0 tasks with status: pending
    And logContent should contain Task deleted In Progress

  @manual
  Scenario: Manual validation of should In Progress full task lifecycle: create -> update -> delete
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform createTask on taskManager | Action completes successfully |
      | 2 | I perform updateTaskStatus on taskManager | Action completes successfully |
      | 3 | I perform listTasks on taskManager | Action completes successfully |
      | 4 | I perform deleteTask on taskManager | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | createResult.success should be true | Pass |
      | tasksAfterCreate[0].id should be taskId | Pass |
      | tasksAfterCreate[0].status should be pending | Pass |
      | updateToInProgressResult.success should be true | Pass |
      | updateToInProgressResult.task?.status should be in_progress | Pass |
      | tasksAfterFirstUpdate[0].status should be in_progress | Pass |
      | updateTocompletedResult.success should be true | Pass |
      | updateTocompletedResult.task?.status should be In Progress | Pass |
      | tasksAfterSecondUpdate[0].status should be In Progress | Pass |
      | allTasksResult.success should be true | Pass |
      | allTasksResult.tasks![0].id should be taskId | Pass |
      | completedTasksResult.success should be true | Pass |
      | completedTasksResult.tasks![0].status should be In Progress | Pass |
      | pendingTasksResult.success should be true | Pass |
      | deleteResult.success should be true | Pass |
      | logContent should contain Task created In Progress | Pass |
      | logContent should contain Task status updated | Pass |
      | logContent should contain in_progress | Pass |
      | logContent should contain In Progress | Pass |
      | logContent should contain Listed 1 tasks | Pass |
      | logContent should contain Listed 0 tasks with status: pending | Pass |
      | logContent should contain Task deleted In Progress | Pass |

  @automated @system
  Scenario: should handle multiple tasks in In Progress lifecycle
    Given I perform createTask on taskManager
    And I perform listTasks on taskManager
    When I perform deleteTask on taskManager
    Then task1Result.success should be true
    And task2Result.success should be true
    And task3Result.success should be true
    And pendingTasks.tasks![0].id should be task3Id
    And inProgressTasks.tasks![0].id should be task2Id
    And completedTasks.tasks![0].id should be task1Id
    And deleteResult.success should be true

  @manual
  Scenario: Manual validation of should handle multiple tasks in In Progress lifecycle
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform createTask on taskManager | Action completes successfully |
      | 2 | I perform listTasks on taskManager | Action completes successfully |
      | 3 | I perform deleteTask on taskManager | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | task1Result.success should be true | Pass |
      | task2Result.success should be true | Pass |
      | task3Result.success should be true | Pass |
      | pendingTasks.tasks![0].id should be task3Id | Pass |
      | inProgressTasks.tasks![0].id should be task2Id | Pass |
      | completedTasks.tasks![0].id should be task1Id | Pass |
      | deleteResult.success should be true | Pass |

  @automated @system
  Scenario: should enforce business rules throughout lifecycle
    Given I perform createTask on taskManager
    And I perform deleteTask on taskManager
    When I perform updateTaskStatus on taskManager
    Then deleteNoncompletedResult.success should be false
    And deleteNoncompletedResult.error should be Only In Progress tasks can be deleted
    And deleteInProgressResult.success should be false
    And deleteInProgressResult.error should be Only In Progress tasks can be deleted
    And invalidTransitionResult.success should be false
    And invalidTransitionResult.error should contain Invalid status transition from In Progress to pending
    And deletecompletedResult.success should be true

  @manual
  Scenario: Manual validation of should enforce business rules throughout lifecycle
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform createTask on taskManager | Action completes successfully |
      | 2 | I perform deleteTask on taskManager | Action completes successfully |
      | 3 | I perform updateTaskStatus on taskManager | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | deleteNoncompletedResult.success should be false | Pass |
      | deleteNoncompletedResult.error should be Only In Progress tasks can be deleted | Pass |
      | deleteInProgressResult.success should be false | Pass |
      | deleteInProgressResult.error should be Only In Progress tasks can be deleted | Pass |
      | invalidTransitionResult.success should be false | Pass |
      | invalidTransitionResult.error should contain Invalid status transition from In Progress to pending | Pass |
      | deletecompletedResult.success should be true | Pass |

  @automated @system
  Scenario: should maintain data persistence across operations
    Given I perform createTask on taskManager
    Then task.id should be taskId
    And task.title should be Persistence Test
    And task.description should be Testing data persistence
    And task.status should be in_progress
    And finalTasksData[0].status should be In Progress

  @manual
  Scenario: Manual validation of should maintain data persistence across operations
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform createTask on taskManager | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | task.id should be taskId | Pass |
      | task.title should be Persistence Test | Pass |
      | task.description should be Testing data persistence | Pass |
      | task.status should be in_progress | Pass |
      | finalTasksData[0].status should be In Progress | Pass |

