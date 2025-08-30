Feature: Web-scraper Tool Manual Tests
  As a tool user
  I want to manually test the web-scraper tool
  So that I can ensure proper tool functionality

  @manual @cli-testing
  Scenario: Manual CLI tool testing
    Given the web-scraper tool is installed
    When the tester executes commands:
      | Command Type             | Test Coverage                    |
      | Basic commands           | All primary functions            |
      | Options and flags        | Various combinations             |
      | Input validation         | Invalid inputs handling          |
      | Output formats           | Different output types           |
    Then tool should execute correctly
    And produce expected outputs

  @manual @performance
  Scenario: Manual performance testing
    Given test data is prepared
    When the tester measures:
      | Performance Metric       | Acceptance Criteria              |
      | Execution time           | Within acceptable limits         |
      | Memory usage             | No memory leaks                  |
      | CPU utilization          | Reasonable resource usage        |
      | Concurrent operations    | Handles parallel execution       |
    Then performance should meet requirements
    And tool should handle load efficiently

  @manual @error-handling
  Scenario: Manual error handling verification
    Given various error conditions
    When the tester triggers errors:
      | Error Type               | Expected Handling                |
      | Invalid input            | Clear error message              |
      | Missing dependencies     | Helpful diagnostic info          |
      | Network failures         | Graceful degradation             |
      | Permission issues        | Appropriate error codes          |
    Then errors should be handled properly
    And recovery should be possible
