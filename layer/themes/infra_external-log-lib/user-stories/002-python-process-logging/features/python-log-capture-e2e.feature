Feature: Python Log Capture E2e
  As a user of the system
  I want to ensure python log capture e2e works correctly
  So that I can rely on the system's functionality

  Scenario: capture and parse logs from Python script with logging module - In Progress flow
    Given the system is initialized
    When I session
    And I result
    And I basic config
    And I get logger
    And I info
    And I debug
    And I info
    And I sleep
    And I warning
    And I error
    And I exception
    And I info
    And I join
    And I write file sync
    And I start python log capture
    And I wait for completion
    And I to be
    And I get logs
    And I filter
    And I filter
    And I filter
    And I filter
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I some
    And I includes
    And I to be
    And I some
    And I includes
    And I to be
    And I some
    And I includes
    And I to be
    And I join
    And I save logs to file
    And I exists sync
    And I to be
    And I read file sync
    And I to contain
    And I to contain
    Then the capture and parse logs from Python script with logging module - In Progress flow should complete successfully

  Scenario: handle mixed print and logging output from Python
    Given the system is initialized
    When I session
    And I basic config
    And I get logger
    And I info
    And I error
    And I write
    And I join
    And I write file sync
    And I start python log capture
    And I wait for completion
    And I get logs
    And I filter
    And I includes
    And I filter
    And I includes
    And I filter
    And I includes
    And I to be
    And I to be
    And I to be
    And I find
    And I includes
    And I to be
    Then the handle mixed print and logging output from Python should complete successfully

  Scenario: capture and parse Python tracebacks correctly
    Given the system is initialized
    When I session
    And I print_exc
    And I join
    And I write file sync
    And I start python log capture
    And I wait for completion
    And I get logs
    And I filter
    And I to be greater than
    And I find
    And I includes
    And I find
    And I includes
    And I to be defined
    And I to be defined
    And I map
    And I join
    And I to contain
    And I to contain
    And I to contain
    Then the capture and parse Python tracebacks correctly should complete successfully

  Scenario: handle real-time streaming of Python logs
    Given the system is initialized
    When I session
    And I basic config
    And I get logger
    And I info
    And I flush
    And I flush
    And I sleep
    And I info
    And I join
    And I write file sync
    And I start python log capture
    And I on log entry
    And I push
    And I now
    And I wait for completion
    And I to be greater than or equal
    And I filter
    And I includes
    And I to be
    And I to be greater than
    Then the handle real-time streaming of Python logs should complete successfully

  Scenario: parse JSON-formatted Python logs
    Given the system is initialized
    When I session
    And I utcnow
    And I isoformat
    And I dumps
    And I join
    And I write file sync
    And I start python log capture
    And I wait for completion
    And I get logs
    And I find
    And I find
    And I find
    And I find
    And I to be
    And I to be
    And I to be
    And I to be
    Then the parse JSON-formatted Python logs should complete successfully

  Scenario: handle Python subprocess that crashes
    Given the system is initialized
    When I session
    And I result
    And I exit
    And I join
    And I write file sync
    And I start python log capture
    And I wait for completion
    And I get logs
    And I some
    And I includes
    And I to be
    And I to be
    Then the handle Python subprocess that crashes should complete successfully
