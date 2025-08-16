Feature: User Authentication
  As a user of the system
  I want to be able to log in and manage my account
  So that I can access protected features

  Background:
    Given I am on the login page
    And the system is running properly

  @smoke @critical
  Scenario: Successful login with valid credentials
    Given I have a valid username "test@example.com"
    And I have a valid password "SecurePass123"
    When I enter my credentials
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message "Welcome back!"

  @negative
  Scenario: Failed login with invalid credentials
    Given I have an invalid username "wrong@example.com"
    And I have an invalid password "WrongPass"
    When I enter my credentials
    And I click the login button
    Then I should remain on the login page
    And I should see an error message "Invalid credentials"

  @recovery
  Scenario Outline: Password recovery for different user types
    Given I am a <user_type> user
    And I have forgotten my password
    When I click "Forgot Password"
    And I enter my email "<email>"
    And I submit the recovery form
    Then I should see "<message>"
    And I should receive a recovery email within <wait_time> minutes

    Examples:
      | user_type | email              | message                          | wait_time |
      | regular   | user@example.com   | Recovery email sent              | 5         |
      | premium   | premium@example.com| Priority recovery email sent     | 2         |
      | admin     | admin@example.com  | Admin recovery process initiated | 1         |

  Scenario: Account lockout after multiple failed attempts
    Given I have made 2 failed login attempts
    When I make a 3rd failed login attempt
    Then my account should be locked
    And I should see "Account locked due to multiple failed attempts"
    And I should receive a security notification email