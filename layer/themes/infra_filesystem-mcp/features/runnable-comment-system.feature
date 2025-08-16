Feature: Runnable Comment System
  As a developer
  I want to execute code comments as runnable commands
  So that I can maintain executable documentation

  Background:
    Given a filesystem MCP environment
    And a temporary test directory

  Scenario: Execute simple runnable comments
    Given a file with runnable comments
    And the comments contain basic shell commands
    When I process the runnable comments
    Then the commands should be executed successfully
    And the output should be captured
    And the results should be documented

  Scenario: Handle complex runnable comment blocks
    Given a file with multi-line runnable comments
    And the comments contain complex command sequences
    When I process the runnable comments
    Then each command in the sequence should execute
    And the execution order should be preserved
    And all outputs should be captured

  Scenario: Process TypeScript runnable comments
    Given a TypeScript file with runnable comments
    And the comments contain TypeScript code snippets
    When I process the runnable comments
    Then the TypeScript should be compiled and executed
    And type checking should be performed
    And execution results should be captured

  Scenario: Handle runnable comment errors gracefully
    Given a file with runnable comments
    And some comments contain invalid commands
    When I process the runnable comments
    Then valid commands should execute successfully
    And invalid commands should be reported as errors
    And the process should continue with remaining comments

  Scenario: Support environment variable substitution
    Given a file with runnable comments
    And the comments reference environment variables
    When I process the runnable comments with environment context
    Then environment variables should be substituted
    And the commands should execute with correct values

  Scenario: Process conditional runnable comments
    Given a file with conditional runnable comments
    And the conditions are based on environment or context
    When I process the runnable comments
    Then only applicable comments should execute
    And skipped comments should be logged

  Scenario: Handle runnable comments with dependencies
    Given a file with runnable comments
    And some comments depend on previous comment results
    When I process the runnable comments in sequence
    Then dependencies should be resolved correctly
    And dependent commands should receive proper input

  Scenario: Support runnable comment metadata
    Given a file with runnable comments
    And the comments include metadata tags
    When I process the runnable comments
    Then metadata should be parsed and respected
    And execution should follow metadata directives

  Scenario: Execute runnable comments in isolated environments
    Given a file with runnable comments
    And isolation requirements are specified
    When I process the runnable comments
    Then each comment should execute in isolation
    And side effects should not affect other comments

  Scenario: Generate execution reports
    Given a file with runnable comments
    When I process the runnable comments
    Then an execution report should be generated
    And the report should include success/failure status
    And execution timing should be recorded
    And output should be included in the report

  Scenario: Support different comment formats
    Given files with various comment formats
    And runnable comments in different styles
    When I process the files
    Then all supported comment formats should be recognized
    And execution should work regardless of format

  Scenario: Handle timeout for long-running commands
    Given a file with runnable comments
    And some comments contain long-running commands
    When I process the runnable comments with timeout settings
    Then long-running commands should timeout appropriately
    And timeout events should be logged
    And remaining comments should continue processing

  Scenario: Support runnable comment caching
    Given a file with runnable comments
    And caching is enabled
    When I process the same comments multiple times
    Then cached results should be used when appropriate
    And cache invalidation should work correctly

  Scenario: Integrate with version control
    Given a file with runnable comments under version control
    When changes are made to the file
    Then only affected runnable comments should be re-executed
    And version control integration should track changes

  Scenario: Handle nested runnable comment structures
    Given a file with nested runnable comment blocks
    When I process the nested structure
    Then nesting should be respected
    And execution order should follow nesting hierarchy
    And scope isolation should be maintained