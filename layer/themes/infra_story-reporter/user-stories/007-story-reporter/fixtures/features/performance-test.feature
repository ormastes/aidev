Feature: Performance Testing
  Testing system performance under various conditions

  Scenario: Fast operation test
    Given the system is ready
    When I perform a quick operation
    Then the operation should complete within 100ms

  Scenario: Normal operation test
    Given the system is ready
    When I perform a standard operation
    Then the operation should complete within 500ms

  Scenario: Slow operation test
    Given the system is ready
    When I perform a complex operation
    Then the operation should complete within 2000ms