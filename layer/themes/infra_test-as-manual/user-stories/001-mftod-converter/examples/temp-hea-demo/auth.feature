
Feature: User Authentication with HEA Architecture
  As a user of the system
  I want to be able to authenticate securely
  So that I can access my personal data

  @auth @critical
  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message

  @auth @security
  Scenario: Failed login with invalid password
    Given I am on the login page
    When I enter a valid username
    And I enter an invalid password
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  @auth @security
  Scenario: Account lockout after multiple failures
    Given I am on the login page
    When I attempt to login 5 times with invalid credentials
    Then my account should be locked
    And I should see "Account locked. Please contact support."

  @auth @startup
  Scenario: Initialize authentication system
    Given the authentication service is not running
    When I start the authentication service
    Then the service should be available
    And all security certificates should be loaded

  Scenario Outline: Password validation rules
    Given I am on the password reset page
    When I enter a password "<password>"
    Then I should see validation result "<result>"

    Examples:
      | password     | result                                    |
      | abc         | Password must be at least 8 characters    |
      | abcdefgh    | Password must contain uppercase letter    |
      | Abcdefgh    | Password must contain a number           |
      | Abcdefgh1   | Valid password                           |
