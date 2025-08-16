Feature: External Log Integration Workflow
  As a user of the system
  I want to ensure external log integration workflow works correctly
  So that I can rely on the system's functionality

  Scenario: execute In Progress external log integration workflow
    Given the system is initialized
    When I logger id
    And I execution result
    And I execution logs
    And I html content
    And I json content
    And I aggregated logs
    And I post cleanup logs
    And I join
    And I join
    And I join
    And I join
    And I initialize logger
    And I to be
    And I configure
    And I set external logger
    And I log
    And I execute and generate reports
    And I to be defined
    And I to be defined
    And I to be
    And I to be defined
    And I to be greater than
    And I get log history
    And I to be greater than
    And I map
    And I to contain
    And I to contain
    And I to contain
    And I some
    And I includes
    And I includes
    And I to be
    And I map
    And I to contain
    And I find
    And I ends with
    And I to be defined
    And I read file
    And I to contain
    And I to contain
    And I find
    And I ends with
    And I to be defined
    And I read file
    And I parse
    And I to be defined
    And I is array
    And I to be
    And I to be greater than
    And I get log history
    And I for each
    And I find
    And I to be defined
    And I to be
    And I to be greater than
    And I cleanup
    And I get log history
    And I to be
    Then the execute In Progress external log integration workflow should complete successfully

  Scenario: handle external logging for failed scenarios
    Given the system is initialized
    When I logger id
    And I execution result
    And I logs
    And I json content
    And I join
    And I join
    And I initialize logger
    And I configure
    And I set external logger
    And I execute and generate reports
    And I get log history
    And I filter
    And I to be greater than
    And I map
    And I some
    And I includes
    And I includes
    And I to be
    And I read file
    And I parse
    And I to be defined
    And I filter
    And I to be greater than
    Then the handle external logging for failed scenarios should complete successfully

  Scenario: integrate logs across multiple test suites
    Given the system is initialized
    When I logger id1
    And I logger id2
    And I logs1
    And I logs2
    And I logger id
    And I logs
    And I join
    And I join
    And I join
    And I initialize logger
    And I configure
    And I set external logger
    And I execute and generate reports
    And I join
    And I join
    And I join
    And I initialize logger
    And I configure
    And I set external logger
    And I execute and generate reports
    And I get log history
    And I get log history
    And I to be greater than
    And I to be greater than
    And I every
    And I to be
    And I every
    And I to be
    And I map
    And I map
    And I to contain
    And I to contain
    And I to contain
    And I to contain
    And I join
    And I join
    And I initialize logger
    And I configure
    And I set external logger
    And I now
    And I execute and generate reports
    And I now
    And I get log history
    And I filter
    And I includes
    And I includes
    And I includes
    And I to be greater than
    And I to be less than
    And I get time
    And I to be greater than or equal
    And I get time
    Then the integrate logs across multiple test suites should complete successfully

  Scenario: capture performance metrics in external logs
    Given the system is initialized
    When I logger id
    And I logs
    And I join
    And I join
    And I initialize logger
    And I configure
    And I set external logger
    And I now
    And I execute and generate reports
    And I now
    And I get log history
    And I filter
    And I includes
    And I includes
    And I includes
    And I to be greater than
    And I to be less than
    And I get time
    And I to be greater than or equal
    And I get time
    Then the capture performance metrics in external logs should complete successfully
