Feature: Structured Log Parsing
  As a user of the system
  I want to ensure structured log parsing works correctly
  So that I can rely on the system's functionality

  Scenario: capture and parse JSON logs from Node.js application
    Given the system is initialized
    When I on
    And I to string
    And I split
    And I filter
    And I trim
    And I for each
    And I parse log line
    And I push
    And I on
    And I to string
    And I split
    And I filter
    And I trim
    And I for each
    And I parse log line
    And I push
    And I on
    And I on
    And I to be greater than
    And I to be greater than
    And I filter
    And I keys
    And I to be greater than or equal
    And I find
    And I to be defined
    And I to be
    And I to be
    And I to be
    And I to be instance of
    And I find
    And I to be defined
    And I to be
    And I to equal
    And I find
    And I to be defined
    And I to equal
    And I find
    And I to be defined
    And I to be
    And I to equal
    And I filter
    And I to be greater than or equal
    And I find
    And I to be defined
    And I to be
    And I to be
    And I to be
    And I to contain
    And I find
    And I to be defined
    And I to be
    And I to equal
    And I to be
    And I find
    And I to be defined
    And I to equal
    And I find
    And I to be defined
    And I to be
    Then the capture and parse JSON logs from Node.js application should complete successfully

  Scenario: \n
    Given the system is initialized
    When I parse log line
    And I push
    Then the \n should complete successfully

  Scenario: \n
    Given the system is initialized
    When I parse log line
    And I push
    Then the \n should complete successfully

  Scenario: validate logs against JSON schema
    Given the system is initialized
    When I on
    And I to string
    And I split
    And I filter
    And I trim
    And I for each
    And I parse log line
    And I push
    And I push
    And I on
    And I on
    And I filter
    And I to be greater than
    And I find
    And I to be defined
    And I to be
    And I to be
    Then the validate logs against JSON schema should complete successfully

  Scenario: \n
    Given the system is initialized
    When I parse log line
    And I push
    And I push
    Then the \n should complete successfully

  Scenario: provide metadata querying capabilities
    Given the system is initialized
    When I on
    And I to string
    And I split
    And I filter
    And I trim
    And I for each
    And I parse log line
    And I push
    And I on
    And I to string
    And I split
    And I filter
    And I trim
    And I for each
    And I parse log line
    And I push
    And I on
    And I on
    And I filter by metadata
    And I to be greater than
    And I for each
    And I to be
    And I extract metadata field
    And I to contain
    And I to contain
    And I group by metadata
    And I keys
    And I to be greater than
    And I to be greater than
    And I get statistics
    And I to be greater than
    And I to be greater than
    And I to be greater than
    And I to be greater than
    And I to contain
    And I to contain
    Then the provide metadata querying capabilities should complete successfully

  Scenario: \n
    Given the system is initialized
    When I parse log line
    And I push
    Then the \n should complete successfully

  Scenario: \n
    Given the system is initialized
    When I parse log line
    And I push
    Then the \n should complete successfully

  Scenario: handle format auto-detection correctly
    Given the system is initialized
    When I on
    And I to string
    And I split
    And I filter
    And I trim
    And I for each
    And I parse log line
    And I push
    And I on
    And I on
    And I filter
    And I keys
    And I to be greater than
    And I find
    And I to be defined
    And I to be
    And I find
    And I to be defined
    And I to be
    And I find
    And I to be defined
    And I keys
    And I to have length
    Then the handle format auto-detection correctly should complete successfully

  Scenario: \n
    Given the system is initialized
    When I parse log line
    And I push
    Then the \n should complete successfully

  Scenario: handle concurrent log streams correctly
    Given the system is initialized
    When I on
    And I to string
    And I split
    And I filter
    And I trim
    And I for each
    And I parse log line
    And I push
    And I on
    And I to string
    And I split
    And I filter
    And I trim
    And I for each
    And I parse log line
    And I push
    And I on
    And I on
    And I to be greater than
    And I to be greater than
    And I for each
    And I to be
    And I for each
    And I to be
    And I filter
    And I to be greater than
    And I filter
    And I to be
    Then the handle concurrent log streams correctly should complete successfully

  Scenario: \n
    Given the system is initialized
    When I parse log line
    And I push
    Then the \n should complete successfully

  Scenario: \n
    Given the system is initialized
    When I parse log line
    And I push
    Then the \n should complete successfully
