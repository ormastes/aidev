Feature: User Authentication System
  As a registered user
  I want to securely login to the application
  So that I can access my personalized dashboard

  Background:
    Given the application is running
    And the database is connected
    And test data is loaded

  @smoke @critical @security
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter username "alice@example.com"
    And I enter password "SecurePass123!"
    And I click the "Login" button
    Then I should be redirected to "/dashboard"
    And I should see "Welcome back, Alice!" message
    And my session should be active

  @negative @security
  Scenario: Failed login with invalid password
    Given I am on the login page
    When I enter username "alice@example.com"
    And I enter password "wrongpassword"
    And I click the "Login" button
    Then I should remain on the login page
    And I should see error "Invalid username or password"
    And no session should be created

  @negative @validation
  Scenario: Login attempt with empty credentials
    Given I am on the login page
    When I click the "Login" button
    Then I should see error "Username is required"
    And I should see error "Password is required"
    And the login button should be disabled

  @security @timeout
  Scenario: Account lockout after multiple failed attempts
    Given I am on the login page
    When I enter username "alice@example.com"
    And I enter incorrect password 5 times
    Then my account should be locked for 15 minutes
    And I should see error "Account temporarily locked due to multiple failed login attempts"
    And an email notification should be sent to "alice@example.com"

  @integration @sso
  Scenario: Login using Single Sign-On
    Given I am on the login page
    When I click the "Sign in with Google" button
    And I authorize the application in Google
    Then I should be redirected to "/dashboard"
    And my profile should be populated from Google account

  @accessibility
  Scenario: Login using keyboard navigation only
    Given I am on the login page
    When I press Tab to focus on username field
    And I type "alice@example.com"
    And I press Tab to focus on password field
    And I type "SecurePass123!"
    And I press Tab to focus on login button
    And I press Enter
    Then I should be successfully logged in
    And focus should be on the dashboard main content

  @mobile @responsive
  Scenario Outline: Login on different devices
    Given I am using a <device> device
    When I navigate to the login page
    Then the login form should be <layout>
    And all elements should be <visibility>
    
    Examples:
      | device    | layout     | visibility |
      | mobile    | vertical   | visible    |
      | tablet    | centered   | visible    |
      | desktop   | centered   | visible    |
      | wearable  | simplified | partial    |

  @performance
  Scenario: Login page load time
    When I navigate to the login page
    Then the page should load within 2 seconds
    And all resources should load within 5 seconds
    And the login form should be interactive within 1 second

  @data_validation
  Scenario Outline: Email validation on login
    Given I am on the login page
    When I enter username "<email>"
    And I enter password "anypassword"
    And I click the "Login" button
    Then I should see error "<error_message>"
    
    Examples:
      | email                  | error_message                    |
      | notanemail            | Please enter a valid email       |
      | @example.com          | Please enter a valid email       |
      | user@                 | Please enter a valid email       |
      | user@.com             | Please enter a valid email       |
      | user with spaces@test.com | Please enter a valid email  |

  @2fa @security
  Scenario: Two-factor authentication login
    Given I have 2FA enabled on my account
    And I am on the login page
    When I enter username "alice@example.com"
    And I enter password "SecurePass123!"
    And I click the "Login" button
    Then I should be redirected to "/auth/2fa"
    And I should see "Enter verification code"
    When I enter the correct 6-digit code from my authenticator app
    And I click "Verify"
    Then I should be redirected to "/dashboard"
    And I should see "Welcome back, Alice!"