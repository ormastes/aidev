Feature: System Test - step-file-integration
  As a system tester
  I want to manually execute system tests for step-file-integration
  So that I can verify end-to-end functionality

  Background:
    Given the test environment is prepared
    And all dependencies are available
    And test data is initialized


  @manual @system
  Scenario: System Test: Step File Integration
    Given the system is in initial state
    When I execute the test steps for: System Test: Step File Integration
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Step File Execution
    Given the system is in initial state
    When I execute the test steps for: Step File Execution
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute step_file scripts by name
    Given the system is in initial state
    When I execute the test steps for: should execute step_file scripts by name
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute register scripts with parameters
    Given the system is in initial state
    When I execute the test steps for: should execute register scripts with parameters
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should handle missing step_file gracefully
    Given the system is in initial state
    When I execute the test steps for: should handle missing step_file gracefully
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute message type steps
    Given the system is in initial state
    When I execute the test steps for: should execute message type steps
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Multiple Step Execution
    Given the system is in initial state
    When I execute the test steps for: Multiple Step Execution
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute multiple steps in sequence
    Given the system is in initial state
    When I execute the test steps for: should execute multiple steps in sequence
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should stop on first runnable failure
    Given the system is in initial state
    When I execute the test steps for: should stop on first runnable failure
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Script Validation
    Given the system is in initial state
    When I execute the test steps for: Script Validation
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should check if step files exist
    Given the system is in initial state
    When I execute the test steps for: should check if step files exist
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
