Feature: Task Queue Runnable Execution
  As a developer
  I want to execute runnable tasks from the task queue
  So that automated workflows can be processed

  Background:
    Given a task queue at "./TASK_QUEUE.vf.json"
    And a NAME_ID registry at "./NAME_ID.vf.json"

  Scenario: Execute a simple command task
    Given the working item queue is empty
    When I add a runnable task "List files" with command "ls -la"
    And I pop a task from the queue
    Then the working item should be "List files"
    When I execute the runnable task
    Then the runnable task should execute successfully
    And the task should be marked as completed

  Scenario: Execute a script task
    Given the working item queue is empty
    When I add a runnable task "Run test script" with script "./scripts/test.sh"
    And I pop a task from the queue
    Then the working item should be "Run test script"
    When I execute the runnable task
    Then the runnable task should execute successfully
    And the task should be marked as completed

  Scenario: Task queue priority handling with runnable tasks
    Given the working item queue is empty
    And all other queues are empty
    When I add a task "Low priority task" with priority "low"
    And I add a runnable task "High priority command" with command "echo 'High priority'"
    And I add a task "Medium priority task" with priority "medium"
    Then the "high" priority queue should have 1 items
    And the "medium" priority queue should have 1 items
    And the "low" priority queue should have 1 items
    When I pop a task from the queue
    Then the working item should be "High priority command"

  Scenario: Validate task registration before adding runnable
    Given the working item queue is empty
    When I validate the task "TASK-001" is registered
    And I add a runnable task "Registered task" with command "bun test"
    Then the task should be added successfully

  Scenario: Handle failed runnable task
    Given the working item queue is empty
    When I add a runnable task "Failed command" with command "false"
    And I pop a task from the queue
    And I execute the runnable task
    Then I should get an error "Command failed"