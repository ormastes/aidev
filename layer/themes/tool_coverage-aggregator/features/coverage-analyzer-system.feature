Feature: Coverage Analyzer System
  As a developer
  I want to analyze test coverage across different metrics
  So that I can ensure comprehensive testing

  Background:
    Given a temporary test environment
    And a CoverageAnalyzer instance

  Scenario: Load coverage data from file system
    Given mock coverage data in coverage-final.json
    When I analyze the test results
    Then I should get defined coverage metrics
    And the metrics should include class, branch, line, and method coverage

  Scenario: Handle missing coverage file gracefully
    Given no coverage file exists
    And test results with coverage data
    When I analyze the test results
    Then I should get defined coverage metrics
    And the line total should be greater than 0

  Scenario: Use coverageMap from test results when available
    Given test results with embedded coverageMap
    When I analyze the test results
    Then line coverage should be 100%
    And branch coverage should be 100%

  Scenario: Calculate class coverage accurately
    Given test results with multiple classes
    And some classes have tested methods
    And some classes have no tested methods
    When I analyze the test results
    Then it should detect 3 total classes
    And it should show 1 covered class
    And class coverage percentage should be approximately 33.33%

  Scenario: Handle files with no classes
    Given test results with utility functions only
    When I analyze the test results
    Then class total should be 0
    And class covered should be 0
    And class percentage should be 0%

  Scenario: Calculate branch coverage accurately
    Given test results with various branch scenarios
    And if-else branches with partial coverage
    And switch statements with partial coverage
    And untested conditional branches
    When I analyze the test results
    Then total branches should be 9
    And covered branches should be 5
    And branch coverage percentage should be approximately 55.56%

  Scenario: Handle files with no branches
    Given test results with simple linear code
    When I analyze the test results
    Then branch total should be 0
    And branch covered should be 0
    And branch percentage should be 0%

  Scenario: Calculate line coverage accurately
    Given test results with mixed line execution
    And some lines executed multiple times
    And some lines not executed at all
    When I analyze the test results
    Then line total should be 5
    And line covered should be 3
    And line percentage should be 60%

  Scenario: Handle empty line coverage data
    Given test results with no line data
    When I analyze the test results
    Then line total should be 0
    And line covered should be 0
    And line percentage should be 0%

  Scenario: Calculate method coverage accurately
    Given test results with multiple methods
    And some methods executed multiple times
    And some methods not executed
    When I analyze the test results
    Then method total should be 5
    And method covered should be 3
    And method percentage should be 60%

  Scenario: Handle files with no methods
    Given test results with constants only
    When I analyze the test results
    Then method total should be 0
    And method covered should be 0
    And method percentage should be 0%

  Scenario: Analyze multiple files with complex coverage scenarios
    Given test results from multiple source files
    And ConfigManager file with partial coverage
    And helpers file with good coverage
    And ApiClient file with no coverage
    When I analyze the test results
    Then class coverage should be 50% (1 of 2 classes)
    And line coverage should be approximately 61.54%
    And branch coverage should be 62.5%
    And method coverage should be 50%

  Scenario: Handle perfect coverage scenario
    Given test results with 100% coverage across all metrics
    When I analyze the test results
    Then class percentage should be 100%
    And line percentage should be 100%
    And branch percentage should be 100%
    And method percentage should be 100%

  Scenario: Handle zero coverage scenario
    Given test results with 0% coverage across all metrics
    When I analyze the test results
    Then class percentage should be 0%
    And line percentage should be 0%
    And branch percentage should be 0%
    And method percentage should be 0%

  Scenario: Handle malformed coverage data gracefully
    Given test results with malformed coverage data
    And null or invalid coverage properties
    When I analyze the test results
    Then it should not throw errors
    And all percentage values should be valid numbers

  Scenario: Handle empty test results
    Given completely empty test results
    When I analyze the test results
    Then all coverage percentages should be 0%