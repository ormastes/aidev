@security @authentication
Feature: User Authentication
  As a system administrator
  I want users to authenticate securely
  So that only authorized users can access the system

  Background:
    Given the authentication system is running
    And the following users exist:
      | username | password | role    | status   |
      | alice    | Pass123! | admin   | active   |
      | bob      | Secret99 | user    | active   |
      | charlie  | Locked01 | user    | locked   |

  @login @smoke
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter username "alice"
    And I enter password "Pass123!"
    And I click the login button
    Then I should be logged in successfully
    And I should see "Welcome, alice" message
    And my role should be "admin"

  @login @negative
  Scenario: Failed login with invalid password
    Given I am on the login page
    When I enter username "alice"
    And I enter password "wrongpass"
    And I click the login button
    Then I should see an error "Invalid username or password"
    And I should remain on the login page

  @login @security
  Scenario: Account lockout after failed attempts
    Given I am on the login page
    When I attempt to login with username "bob" and wrong password 3 times
    Then the account should be locked
    And I should see "Account locked. Please contact administrator"

  @session @timeout
  Scenario: Session timeout after inactivity
    Given I am logged in as "alice"
    And I have been inactive for 30 minutes
    When I try to access a protected page
    Then I should be redirected to login page
    And I should see "Session expired. Please login again"

  @password @security
  Scenario: Password complexity requirements
    Given I am on the password change page
    When I try to set password to:
      """
      simple
      """
    Then I should see validation errors:
      | error                                  |
      | Password must be at least 8 characters |
      | Password must contain uppercase letter |
      | Password must contain a number         |
      | Password must contain special character |

  @authorization @rbac
  Scenario Outline: Role-based access control
    Given I am logged in as "<username>"
    When I try to access "<resource>"
    Then I should <access_result>

    Examples:
      | username | resource          | access_result     |
      | alice    | /admin/dashboard  | have access       |
      | alice    | /admin/users      | have access       |
      | bob      | /user/profile     | have access       |
      | bob      | /admin/dashboard  | be denied access  |
      | charlie  | /user/profile     | be denied access  |