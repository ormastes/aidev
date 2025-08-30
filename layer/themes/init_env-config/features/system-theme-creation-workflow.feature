Feature: System Test - theme-creation-workflow
  As a system tester
  I want to manually execute system tests for theme-creation-workflow
  So that I can verify end-to-end functionality

  Background:
    Given the test environment is prepared
    And all dependencies are available
    And test data is initialized


  @manual @system
  Scenario: 🚨 Story: Theme Creation Workflow System Test
    Given the system is in initial state
    When I execute the test steps for: 🚨 Story: Theme Creation Workflow System Test
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should create new theme with automatic port allocation
    Given the system is in initial state
    When I execute the test steps for: should create new theme with automatic port allocation
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should prevent port conflicts when creating multiple themes
    Given the system is in initial state
    When I execute the test steps for: should prevent port conflicts when creating multiple themes
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should handle different environment types correctly
    Given the system is in initial state
    When I execute the test steps for: should handle different environment types correctly
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system @validation
  Scenario: Manual validation of test execution
    Given I have executed all test scenarios above
    When I review the test results
    Then I should document:
      | Item                    | Details Required                |
      | Test execution status   | Pass/Fail for each scenario    |
      | Performance metrics     | Response times and resource use |
      | Error logs             | Any errors encountered          |
      | Screenshots/Evidence    | Visual proof of test execution  |
      | Environment details     | Test environment configuration  |
    And create a test report with findings

  @manual @system @cleanup
  Scenario: Post-test cleanup
    Given all tests have been executed
    When I perform cleanup activities
    Then I should:
      | Cleanup Task           | Action                          |
      | Remove test data       | Delete temporary test files      |
      | Reset environment      | Restore original configuration   |
      | Close connections      | Terminate test connections       |
      | Archive results        | Save test reports and logs       |
