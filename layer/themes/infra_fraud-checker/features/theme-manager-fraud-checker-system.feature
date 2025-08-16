Feature: ThemeManager and FraudChecker System Integration
  As a quality assurance engineer
  I want to validate theme configurations and detect test fraud
  So that I can ensure high-quality testing standards

  Background:
    Given a temporary test directory
    And the original working directory is saved

  Scenario: Load theme configuration from file system
    Given a test theme configuration file
    And the theme has production test criteria
    And the theme has demo test criteria
    When I create a ThemeManager instance
    And I request production criteria for the test theme
    Then class coverage minimum should be 95%
    And class coverage target should be 98%
    And duplication max percentage should be 5%
    And fraud check should be enabled with minimum score 95
    When I request demo criteria for the test theme
    Then class coverage minimum should be 75%
    And class coverage target should be 80%
    And duplication max percentage should be 20%
    And fraud check minimum score should be 75

  Scenario: Return default criteria when theme config not found
    Given a ThemeManager instance
    When I request criteria for a non-existent theme
    And I use production environment
    Then production defaults should apply
    And class coverage minimum should be 95%
    And fraud check minimum score should be 90
    When I request criteria for demo environment
    Then demo defaults should apply
    And class coverage minimum should be 70%
    And fraud check minimum score should be 70

  Scenario: Return default criteria when testCriteria missing from config
    Given an incomplete theme configuration
    And the configuration lacks testCriteria field
    When I request production criteria for the incomplete theme
    Then default production values should be used
    And class coverage minimum should be 95%
    And fraud check minimum score should be 90

  Scenario: Get epic information from theme config
    Given a theme configuration with epic information
    And the theme has multiple epics with user stories
    When I request epic information for the theme
    Then epic information should be defined
    And it should have the correct theme ID and name
    And it should have 2 epics
    And the first epic should have 2 user stories
    And the second epic should have 1 user story
    And user stories should have acceptance criteria

  Scenario: Return undefined for epic info when not available
    Given a ThemeManager instance
    When I request epic info for a non-existent theme
    Then it should return undefined

  Scenario: List available themes
    Given multiple theme configuration files
    And some non-theme files in the directory
    When I request the list of available themes
    Then it should return 3 themes
    And the list should contain "theme-a", "theme-b", "theme-c"
    And it should not contain non-theme files

  Scenario: Return empty array when themes directory does not exist
    Given an empty directory without themes
    When I request the list of themes
    Then it should return an empty array

  Scenario: Cache theme configurations
    Given a theme configuration file
    When I request criteria for the first time
    And I modify the configuration file
    And I request criteria for the second time
    Then the second request should use cached version
    And should not reflect the file changes

  Scenario: Detect empty tests
    Given test files with empty test bodies
    When I run the fraud checker
    Then it should fail the fraud check
    And it should detect fake-assertions violations
    And violations should contain "Empty test found"
    And violations should have high severity

  Scenario: Detect skipped and only tests
    Given test files with .skip and .only modifiers
    When I run the fraud checker
    Then it should fail the fraud check
    And it should detect disabled-tests violations for skipped tests
    And it should detect test-manipulation violations for .only tests
    And .only violations should have high severity

  Scenario: Detect always-true assertions
    Given test files with always-true assertions
    And legitimate tests mixed in
    When I run the fraud checker
    Then it should detect fake-assertions violations
    And violations should mention "Always-true"
    And violations should have critical severity

  Scenario: Detect coverage manipulation
    Given test files that manipulate global.__coverage__
    When I run the fraud checker
    Then it should detect coverage-bypass violations
    And violations should mention "Direct coverage manipulation"
    And violations should have critical severity

  Scenario: Detect commented out tests
    Given test files with commented out test blocks
    When I run the fraud checker
    Then it should detect disabled-tests violations
    And violations should mention "Commented out"
    And violations should have low severity

  Scenario: Detect coverage ignore comments
    Given test files with istanbul or c8 ignore comments
    When I run the fraud checker
    Then it should detect coverage-bypass violations
    And violations should mention "Coverage ignore"
    And violations should have medium severity

  Scenario: Calculate fraud score correctly
    Given test files with mixed violations of different severities
    And critical, high, medium, and low severity violations
    When I run the fraud checker
    Then it should fail the fraud check
    And the score should be less than 100
    And the score should be greater than or equal to 0
    And it should have violations for each severity level

  Scenario: Return perfect score for clean tests
    Given test files with legitimate, clean tests
    When I run the fraud checker
    Then it should pass the fraud check
    And the score should be 100
    And there should be no violations

  Scenario: Handle various test file extensions and locations
    Given test files in different directories
    And files with different extensions (.test.ts, .spec.ts, etc.)
    When I run the fraud checker
    Then it should find violations in all test locations
    And it should check __tests__, spec, and nested test directories

  Scenario: Handle non-existent test directories gracefully
    Given an empty directory with no test files
    When I run the fraud checker
    Then it should pass the fraud check
    And the score should be 100
    And there should be no violations

  Scenario: Integrate ThemeManager with FraudChecker criteria
    Given a theme with strict fraud checking criteria
    And test files with fraudulent patterns
    When I get criteria from ThemeManager
    And I run fraud checking against those criteria
    Then the fraud score should be below the minimum threshold
    And the fraud check should fail
    And the criteria should specify minimum score of 95