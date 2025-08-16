Feature: User Management
  As an administrator
  I want to manage user accounts
  So that I can control system access

  Scenario: Create new user
    Given I am logged in as an administrator
    When I navigate to user management
    And I create a new user with valid details
    Then the user should be created successfully
    And the user should appear in the user list

  Scenario: Delete existing user
    Given I am logged in as an administrator
    And there is an existing user "testuser"
    When I delete the user "testuser"
    Then the user should be removed from the system
    And the user should not appear in the user list