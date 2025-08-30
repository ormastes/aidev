Feature: System Test - runnable-comment-simple
  As a system tester
  I want to manually execute system tests for runnable-comment-simple
  So that I can verify end-to-end functionality

  Background:
    Given the test environment is prepared
    And all dependencies are available
    And test data is initialized


  @manual @system
  Scenario: System Test: Simple Runnable Comment Scripts
    Given the system is in initial state
    When I execute the test steps for: System Test: Simple Runnable Comment Scripts
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute write_a__file_.js script
    Given the system is in initial state
    When I execute the test steps for: should execute write_a__file_.js script
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute validate__type__format.js script
    Given the system is in initial state
    When I execute the test steps for: should execute validate__type__format.js script
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute verify__type__implementation.js script
    Given the system is in initial state
    When I execute the test steps for: should execute verify__type__implementation.js script
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute check__type__requirements.js script
    Given the system is in initial state
    When I execute the test steps for: should execute check__type__requirements.js script
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should execute conduct__type__retrospective.js script
    Given the system is in initial state
    When I execute the test steps for: should execute conduct__type__retrospective.js script
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should handle script execution with ScriptMatcher
    Given the system is in initial state
    When I execute the test steps for: should handle script execution with ScriptMatcher
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
