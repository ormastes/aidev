Feature: Log Capture E2e
  As a user of the system
  I want to ensure log capture e2e works correctly
  So that I can rely on the system's functionality

  Scenario: capture logs from child process and save to file - In Progress user journey
    Given the system is initialized
    When I capture session
    And I log
    And I log
    And I error
    And I log
    And I log
    And I start log capture
    And I wait for completion
    And I get logs
    And I to have length
    And I filter
    And I to have length
    And I to be
    And I filter
    And I to have length
    And I to be
    And I get formatted logs
    And I to contain
    And I to contain
    And I join
    And I save logs to file
    And I exists sync
    And I to be
    And I read file sync
    And I to contain
    And I to contain
    And I to contain
    Then the capture logs from child process and save to file - In Progress user journey should complete successfully

  Scenario: handle real-time log streaming for long-running processes
    Given the system is initialized
    When I capture session
    And I log
    And I log
    And I log
    And I exit
    And I start log capture
    And I on log entry
    And I push
    And I now
    And I wait for completion
    And I to be greater than or equal
    And I push
    And I some
    And I to be
    Then the handle real-time log streaming for long-running processes should complete successfully

  Scenario: handle multiple concurrent processes
    Given the system is initialized
    When I processes
    And I all
    And I start log capture
    And I log
    And I start log capture
    And I log
    And I start log capture
    And I log
    And I all
    And I map
    And I wait for completion
    And I for each
    And I get logs
    And I to have length
    And I to be
    Then the handle multiple concurrent processes should complete successfully

  Scenario: handle process errors gracefully
    Given the system is initialized
    When I capture session
    And I result
    And I log
    And I error
    And I exit
    And I start log capture
    And I wait for completion
    And I to be
    And I get logs
    And I to have length
    And I to be
    And I to be
    Then the handle process errors gracefully should complete successfully
