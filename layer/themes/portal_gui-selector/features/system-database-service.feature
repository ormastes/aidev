Feature: System Test - database-service
  As a system tester
  I want to manually execute system tests for database-service
  So that I can verify end-to-end functionality

  Background:
    Given the test environment is prepared
    And all dependencies are available
    And test data is initialized


  @manual @system
  Scenario: Database Service System Tests
    Given the system is in initial state
    When I execute the test steps for: Database Service System Tests
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: 🚨 Story: User Management
    Given the system is in initial state
    When I execute the test steps for: 🚨 Story: User Management
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should create and retrieve users
    Given the system is in initial state
    When I execute the test steps for: should create and retrieve users
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should handle duplicate username constraint
    Given the system is in initial state
    When I execute the test steps for: should handle duplicate username constraint
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: App Management
    Given the system is in initial state
    When I execute the test steps for: App Management
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should create and manage apps
    Given the system is in initial state
    When I execute the test steps for: should create and manage apps
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Selection Management
    Given the system is in initial state
    When I execute the test steps for: Selection Management
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should create and manage selections
    Given the system is in initial state
    When I execute the test steps for: should create and manage selections
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Requirement Management
    Given the system is in initial state
    When I execute the test steps for: Requirement Management
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should create and manage requirements
    Given the system is in initial state
    When I execute the test steps for: should create and manage requirements
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Session Management
    Given the system is in initial state
    When I execute the test steps for: Session Management
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should manage JWT refresh token sessions
    Given the system is in initial state
    When I execute the test steps for: should manage JWT refresh token sessions
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should handle session cleanup and expiration
    Given the system is in initial state
    When I execute the test steps for: should handle session cleanup and expiration
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Database Schema and Constraints
    Given the system is in initial state
    When I execute the test steps for: Database Schema and Constraints
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should enforce foreign key relationships
    Given the system is in initial state
    When I execute the test steps for: should enforce foreign key relationships
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should handle unique constraints
    Given the system is in initial state
    When I execute the test steps for: should handle unique constraints
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Complex Queries and Joins
    Given the system is in initial state
    When I execute the test steps for: Complex Queries and Joins
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should perform complex multi-table queries
    Given the system is in initial state
    When I execute the test steps for: should perform complex multi-table queries
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
