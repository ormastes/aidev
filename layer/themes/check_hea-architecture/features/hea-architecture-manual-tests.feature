Feature: Hea-architecture Check Manual Tests
  As a quality assurance engineer
  I want to manually verify hea-architecture compliance
  So that I can ensure code quality standards are met

  @manual @setup
  Scenario: Verify hea-architecture environment setup
    Given the tester has access to the hea-architecture module
    When the tester performs initial setup verification:
      | Check Point                 | Expected Result                |
      | Module structure           | Follows HEA architecture        |
      | Configuration files        | All configs present and valid   |
      | Dependencies               | All dependencies installed       |
      | Documentation              | README and guides available      |
    Then all setup checks should pass
    And the environment should be ready for testing

  @manual @functionality
  Scenario: Manual verification of hea-architecture functionality
    Given the hea-architecture system is operational
    When the tester manually validates:
      | Test Area                  | Verification Steps              |
      | Core functionality         | Execute main features manually   |
      | Edge cases                 | Test boundary conditions         |
      | Error handling            | Verify error messages            |
      | Performance               | Check response times             |
    Then all manual checks should pass
    And document any issues found

  @manual @integration
  Scenario: Manual integration testing
    Given multiple components are available
    When the tester verifies integration with:
      | Component                   | Integration Point               |
      | Other check modules        | Shared validation logic          |
      | Reporting system          | Result aggregation               |
      | CI/CD pipeline            | Automated execution              |
    Then all integrations should work correctly
    And no conflicts should be detected
