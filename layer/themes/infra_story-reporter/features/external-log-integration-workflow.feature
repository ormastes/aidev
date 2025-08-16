# Converted from: layer/themes/infra_story-reporter/user-stories/007-story-reporter/tests/system/external-log-integration-workflow.stest.ts
# Generated on: 2025-08-16T04:16:21.649Z

Feature: External Log Integration Workflow
  As a system tester
  I want to validate external log integration workflow
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should execute In Progress external log integration workflow
    Given I perform initializeLogger on externalLogger
    And I perform executeAndGenerateReports on testSuiteManager
    And I perform getLogHistory on externalLogger
    When I perform readFile on fs
    Then loggerId should be testConfig.testSuiteId
    And executionResult.testResults.testSuiteId should be testConfig.testSuiteId
    And logMessages should contain Starting test suite execution
    And logMessages should contain Starting Mock Free Test Oriented Development test execution
    And logMessages should contain Test suite execution In Progress
    And logMessages.some(msg => msg.includes(Generating) && msg.includes(report)) should be true
    And logLevels should contain info
    And htmlContent should contain Test Execution Logs
    And htmlContent should contain log-integration-test-suite
    And Array.isArray(jsonReport.logs) should be true
    And eventLog!.processId should be loggerId

  @manual
  Scenario: Manual validation of should execute In Progress external log integration workflow
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform initializeLogger on externalLogger | Action completes successfully |
      | 2 | I perform executeAndGenerateReports on testSuiteManager | Action completes successfully |
      | 3 | I perform getLogHistory on externalLogger | Action completes successfully |
      | 4 | I perform readFile on fs | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | loggerId should be testConfig.testSuiteId | Pass |
      | executionResult.testResults.testSuiteId should be testConfig.testSuiteId | Pass |
      | logMessages should contain Starting test suite execution | Pass |
      | logMessages should contain Starting Mock Free Test Oriented Development test execution | Pass |
      | logMessages should contain Test suite execution In Progress | Pass |
      | logMessages.some(msg => msg.includes(Generating) && msg.includes(report)) should be true | Pass |
      | logLevels should contain info | Pass |
      | htmlContent should contain Test Execution Logs | Pass |
      | htmlContent should contain log-integration-test-suite | Pass |
      | Array.isArray(jsonReport.logs) should be true | Pass |
      | eventLog!.processId should be loggerId | Pass |

  @automated @system
  Scenario: should handle external logging for failed scenarios
    Given I perform initializeLogger on externalLogger
    And I perform executeAndGenerateReports on testSuiteManager
    And I perform getLogHistory on externalLogger
    When I perform readFile on fs
    Then errorMessages.some(msg => msg.includes(Step failed:) || msg.includes(Scenario failed:)) should be true

  @manual
  Scenario: Manual validation of should handle external logging for failed scenarios
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform initializeLogger on externalLogger | Action completes successfully |
      | 2 | I perform executeAndGenerateReports on testSuiteManager | Action completes successfully |
      | 3 | I perform getLogHistory on externalLogger | Action completes successfully |
      | 4 | I perform readFile on fs | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | errorMessages.some(msg => msg.includes(Step failed:) || msg.includes(Scenario failed:)) should be true | Pass |

  @automated @system
  Scenario: should integrate logs across multiple test suites
    Given I perform initializeLogger on externalLogger
    When I perform getLogHistory on externalLogger
    Then logs1.every(log => log.processId === loggerId1) should be true
    And logs2.every(log => log.processId === loggerId2) should be true
    And suite1Messages should contain Starting Mock Free Test Oriented Development test execution
    And suite2Messages should contain Starting Mock Free Test Oriented Development test execution
    And suite1Messages should contain Test suite execution In Progress
    And suite2Messages should contain Test suite execution In Progress

  @manual
  Scenario: Manual validation of should integrate logs across multiple test suites
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform initializeLogger on externalLogger | Action completes successfully |
      | 2 | I perform getLogHistory on externalLogger | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | logs1.every(log => log.processId === loggerId1) should be true | Pass |
      | logs2.every(log => log.processId === loggerId2) should be true | Pass |
      | suite1Messages should contain Starting Mock Free Test Oriented Development test execution | Pass |
      | suite2Messages should contain Starting Mock Free Test Oriented Development test execution | Pass |
      | suite1Messages should contain Test suite execution In Progress | Pass |
      | suite2Messages should contain Test suite execution In Progress | Pass |

  @automated @system
  Scenario: should capture performance metrics in external logs
    Given I perform initializeLogger on externalLogger
    When I perform getLogHistory on externalLogger
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should capture performance metrics in external logs
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform initializeLogger on externalLogger | Action completes successfully |
      | 2 | I perform getLogHistory on externalLogger | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |

