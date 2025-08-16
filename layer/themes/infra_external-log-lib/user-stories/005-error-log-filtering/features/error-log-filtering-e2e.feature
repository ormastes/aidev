Feature: Error Log Filtering E2e
  As a user of the system
  I want to ensure error log filtering e2e works correctly
  So that I can rely on the system's functionality

  Scenario: filter error logs from a real application
    Given the system is initialized
    When I process id
    And I on
    And I push
    And I log
    And I log
    And I error
    And I log
    And I error
    And I log
    And I error
    And I log
    And I exit
    And I join
    And I write file sync
    And I start real time monitoring
    And I get monitoring status
    And I to be greater than
    And I to be less than
    And I for each
    And I to be
    And I to contain
    And I to be
    And I map
    And I to contain equal
    And I string containing
    And I to contain equal
    And I string containing
    And I to contain equal
    And I string containing
    And I stop all monitoring
    Then the filter error logs from a real application should complete successfully

  Scenario: support dynamic filter updates in production-like scenario
    Given the system is initialized
    When I process id
    And I on
    And I push
    And I now
    And I log
    And I error
    And I log
    And I log
    And I log
    And I exit
    And I join
    And I write file sync
    And I start real time monitoring
    And I set log level filter
    And I set log level filter
    And I get monitoring status
    And I to be greater than
    And I to be greater than
    And I to be greater than
    And I slice
    And I slice
    And I slice
    And I for each
    And I to be
    And I map
    And I to contain
    And I to contain
    And I map
    And I to be greater than or equal
    And I stop all monitoring
    Then the support dynamic filter updates in production-like scenario should complete successfully

  Scenario: handle multiple concurrent filtered processes
    Given the system is initialized
    When I web server id
    And I on
    And I includes
    And I push
    And I includes
    And I push
    And I includes
    And I push
    And I log
    And I error
    And I exit
    And I log
    And I error
    And I exit
    And I error
    And I log
    And I exit
    And I join
    And I join
    And I join
    And I write file sync
    And I write file sync
    And I write file sync
    And I start real time monitoring
    And I start real time monitoring
    And I start real time monitoring
    And I to be greater than
    And I to be greater than
    And I to be greater than
    And I for each
    And I to be
    And I to be
    And I map
    And I to contain
    And I map
    And I to contain
    And I to contain
    And I stop all monitoring
    Then the handle multiple concurrent filtered processes should complete successfully

  Scenario: handle high-volume filtered logging in production scenario
    Given the system is initialized
    When I now
    And I on
    And I push
    And I now
    And I random
    And I log
    And I error
    And I log
    And I log
    And I exit
    And I join
    And I write file sync
    And I start real time monitoring
    And I get monitoring status
    And I now
    And I to be greater than
    And I to be less than
    And I for each
    And I to be
    And I to contain
    And I to be less than
    And I log
    And I stop all monitoring
    Then the handle high-volume filtered logging in production scenario should complete successfully
