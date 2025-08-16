Feature: Test Suite 3
  Third test suite for aggregation testing

  Scenario: Suite 3 Test A
    Given test suite 3 is initialized
    When I run test A
    Then test A should be skipped

  Scenario: Suite 3 Test B
    Given test suite 3 is initialized
    When I run test B
    Then test B should be pending