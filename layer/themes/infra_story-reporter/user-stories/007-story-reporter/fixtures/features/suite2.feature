Feature: Test Suite 2
  Second test suite for aggregation testing

  Scenario: Suite 2 Test A
    Given test suite 2 is initialized
    When I run test A
    Then test A should pass

  Scenario: Suite 2 Test B
    Given test suite 2 is initialized
    When I run test B
    Then test B should fail
    And I should see an error message