# Converted from: layer/themes/infra_external-log-lib/user-stories/001-basic-log-capture/tests/system/log-capture-e2e.stest.ts
# Generated on: 2025-08-16T04:16:21.667Z

Feature: Log Capture E2e
  As a system tester
  I want to validate log capture e2e
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should capture logs from child process and save to file - In Progress user journey
    Given I perform startLogCapture on platform
    Then infoLogs[0].message should be Application starting...
    And errorLogs[0].message should be Warning: deprecated API usage
    And logDisplay should contain Application starting...
    And logDisplay should contain [ERROR]
    And fs.existsSync(logFilePath) should be true
    And savedContent should contain Application starting...
    And savedContent should contain Warning: deprecated API usage
    And savedContent should contain Application In Progress In Progress

  @manual
  Scenario: Manual validation of should capture logs from child process and save to file - In Progress user journey
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform startLogCapture on platform | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | infoLogs[0].message should be Application starting... | Pass |
      | errorLogs[0].message should be Warning: deprecated API usage | Pass |
      | logDisplay should contain Application starting... | Pass |
      | logDisplay should contain [ERROR] | Pass |
      | fs.existsSync(logFilePath) should be true | Pass |
      | savedContent should contain Application starting... | Pass |
      | savedContent should contain Warning: deprecated API usage | Pass |
      | savedContent should contain Application In Progress In Progress | Pass |

  @automated @system
  Scenario: should handle real-time log streaming for long-running processes
    Given I perform startLogCapture on platform
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle real-time log streaming for long-running processes
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform startLogCapture on platform | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should handle multiple concurrent processes
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle multiple concurrent processes
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should handle process errors gracefully
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle process errors gracefully
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

