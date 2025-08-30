Feature: System Tests Index - portal_aidev
  As a test coordinator
  I want to track all system tests for portal_aidev
  So that I can ensure comprehensive test coverage

  @manual @system @overview
  Scenario: Review available system tests
    Given the following system tests are available:
      | system-app-switching-workflow-e2e |
      | system-embedded-web-apps |
      | system-service-health-monitoring-e2e |
      | system-shared-authentication-flow-e2e |
      | system-test-server |
    When I plan the test execution
    Then I should prioritize critical tests
    And allocate appropriate time for each test
    And ensure test environment is ready

  @manual @system @execution-plan
  Scenario: Execute system tests in sequence
    Given I have the test execution plan
    When I execute tests in order:
      | Order | Test Category     | Priority |
      | 1     | Setup tests       | Critical |
      | 2     | Core functionality| Critical |
      | 3     | Integration tests | High     |
      | 4     | Performance tests | Medium   |
      | 5     | Recovery tests    | High     |
    Then all tests should be executed
    And results should be documented
    And issues should be reported
