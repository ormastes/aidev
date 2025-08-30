Feature: System Test - service-health-monitoring-e2e
  As a system tester
  I want to manually execute system tests for service-health-monitoring-e2e
  So that I can verify end-to-end functionality

  Background:
    Given the test environment is prepared
    And all dependencies are available
    And test data is initialized


  @manual @system
  Scenario: Service Health Monitoring E2E System Test
    Given the system is in initial state
    When I execute the test steps for: Service Health Monitoring E2E System Test
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: In Progress Health Monitoring Flow: Login → Dashboard → Monitor → Refresh → Alerts
    Given the system is in initial state
    When I execute the test steps for: In Progress Health Monitoring Flow: Login → Dashboard → Monitor → Refresh → Alerts
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Health History and Analytics: View Trends and Metrics
    Given the system is in initial state
    When I execute the test steps for: Health History and Analytics: View Trends and Metrics
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Multiple Admin Users: Concurrent Health Monitoring
    Given the system is in initial state
    When I execute the test steps for: Multiple Admin Users: Concurrent Health Monitoring
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Real-time Health Updates: WebSocket Monitoring
    Given the system is in initial state
    When I execute the test steps for: Real-time Health Updates: WebSocket Monitoring
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
