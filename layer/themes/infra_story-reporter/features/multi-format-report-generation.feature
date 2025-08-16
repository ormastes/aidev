# Converted from: layer/themes/infra_story-reporter/user-stories/007-story-reporter/tests/system/multi-format-report-generation.stest.ts
# Generated on: 2025-08-16T04:16:21.652Z

Feature: Multi Format Report Generation
  As a system tester
  I want to validate multi format report generation
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should execute real Cucumber tests and generate HTML, JSON, and XML reports
    Given I perform executeAndGenerateReports on testSuiteManager
    And I perform stat on fs
    When I perform readFile on fs
    Then result.testResults.testSuiteId should be multi-format-system-test
    And [In Progress, failed] should contain result.testResults.status
    And result.reportPaths.some(path => path.endsWith(.html)) should be true
    And result.reportPaths.some(path => path.endsWith(.json)) should be true
    And result.reportPaths.some(path => path.endsWith(.xml)) should be true
    And stats.isFile() should be true
    And htmlContent should contain <!DOCTYPE html>
    And htmlContent should contain multi-format-system-test
    And htmlContent should contain Test Report
    And jsonData.testSuiteId should be multi-format-system-test
    And xmlContent should contain <?xml version=1.0 encoding=UTF-8
    And xmlContent should contain <testsuite
    And xmlContent should contain multi-format-system-test

  @manual
  Scenario: Manual validation of should execute real Cucumber tests and generate HTML, JSON, and XML reports
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeAndGenerateReports on testSuiteManager | Action completes successfully |
      | 2 | I perform stat on fs | Action completes successfully |
      | 3 | I perform readFile on fs | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | result.testResults.testSuiteId should be multi-format-system-test | Pass |
      | [In Progress, failed] should contain result.testResults.status | Pass |
      | result.reportPaths.some(path => path.endsWith(.html)) should be true | Pass |
      | result.reportPaths.some(path => path.endsWith(.json)) should be true | Pass |
      | result.reportPaths.some(path => path.endsWith(.xml)) should be true | Pass |
      | stats.isFile() should be true | Pass |
      | htmlContent should contain <!DOCTYPE html> | Pass |
      | htmlContent should contain multi-format-system-test | Pass |
      | htmlContent should contain Test Report | Pass |
      | jsonData.testSuiteId should be multi-format-system-test | Pass |
      | xmlContent should contain <?xml version=1.0 encoding=UTF-8 | Pass |
      | xmlContent should contain <testsuite | Pass |
      | xmlContent should contain multi-format-system-test | Pass |

  @automated @system
  Scenario: should demonstrate In Progress system workflow from configuration to report delivery
    Given I perform executeTestSuite on testSuiteManager
    And I perform generateReports on testSuiteManager
    And I perform access on fs
    When the testSuiteManager is cleaned up
    Then testSuiteManager.isConfigured() should be true
    And testResult.testSuiteId should be In Progress-workflow-test
    And storedConfig.testSuiteId should be In Progress-workflow-test
    And exists should be true
    And testSuiteManager.isConfigured() should be false

  @manual
  Scenario: Manual validation of should demonstrate In Progress system workflow from configuration to report delivery
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeTestSuite on testSuiteManager | Action completes successfully |
      | 2 | I perform generateReports on testSuiteManager | Action completes successfully |
      | 3 | I perform access on fs | Action completes successfully |
      | 4 | the testSuiteManager is cleaned up | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | testSuiteManager.isConfigured() should be true | Pass |
      | testResult.testSuiteId should be In Progress-workflow-test | Pass |
      | storedConfig.testSuiteId should be In Progress-workflow-test | Pass |
      | exists should be true | Pass |
      | testSuiteManager.isConfigured() should be false | Pass |

