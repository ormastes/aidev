Feature: System Tests Index - infra_filesystem-mcp
  As a test coordinator
  I want to track all system tests for infra_filesystem-mcp
  So that I can ensure comprehensive test coverage

  @manual @system @overview
  Scenario: Review available system tests
    Given the following system tests are available:
      | system-artifact-pattern-detection |
      | system-artifact-validation-demo |
      | system-complete-queue-workflow |
      | system-file-structure-scenarios |
      | system-filesystem-mcp-integration |
      | system-filesystem-mcp-protection |
      | system-freeze-validation |
      | system-mcp-freeze-validation |
      | system-mcp-integration-full |
      | system-mcp-protection-comprehensive |
      | system-name-id-scenarios |
      | system-register-item |
      | system-runnable-comment-simple |
      | system-runnable-comment-step-file |
      | system-step-file-integration |
      | system-task-queue-scenarios |
      | system-test-scenario-entity-manager |
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
