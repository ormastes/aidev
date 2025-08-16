Feature: Failing Test Scenarios
  Testing failure handling and error logging

  Scenario: Network timeout failure
    Given the system is running
    When I make a request that times out
    Then the request should fail with timeout error

  Scenario: Validation failure
    Given I have invalid input data
    When I submit the form
    Then validation should fail
    And I should see validation errors

  Scenario: Permission denied failure
    Given I am logged in as a regular user
    When I try to access admin features
    Then access should be denied
    And I should see a permission error