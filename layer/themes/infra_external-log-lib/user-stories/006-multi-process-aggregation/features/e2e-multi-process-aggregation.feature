Feature: E2e Multi Process Aggregation
  As a user of the system
  I want to ensure e2e multi process aggregation works correctly
  So that I can rely on the system's functionality

  Scenario: capture, aggregate, and query logs from a In Progress multi-process application
    Given the system is initialized
    When I db process id
    And I web process id
    And I worker process id
    And I cache process id
    And I monitor process id
    And I gateway process id
    And I on
    And I push
    And I add log
    And I on
    And I push
    And I mark process complete
    And I on
    And I push
    And I mark process complete
    And I log
    And I start real time monitoring
    And I log
    And I log
    And I log
    And I log
    And I exit
    And I start real time monitoring
    And I log
    And I log
    And I log
    And I log
    And I exit
    And I start real time monitoring
    And I log
    And I log
    And I log
    And I log
    And I log
    And I exit
    And I start real time monitoring
    And I log
    And I log
    And I log
    And I log
    And I exit
    And I start real time monitoring
    And I log
    And I log
    And I error
    And I log
    And I error
    And I exit
    And I start real time monitoring
    And I log
    And I log
    And I log
    And I log
    And I exit
    And I log
    And I log
    And I to be
    And I map
    And I for each
    And I to contain
    And I filter
    And I filter
    And I to be
    And I to be
    And I to be
    And I to be greater than or equal
    And I filter
    And I includes
    And I filter
    And I includes
    And I filter
    And I includes
    And I filter
    And I includes
    And I filter
    And I includes
    And I filter
    And I includes
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I get statistics
    And I to be
    And I to be
    And I to be
    And I to be
    And I to be greater than or equal
    And I get aggregated logs
    And I to be
    And I every
    And I to be
    And I get aggregated logs
    And I to be greater than or equal
    And I every
    And I includes
    And I to be
    And I get aggregated logs
    And I get aggregated logs
    And I to be
    And I to be greater than or equal
    And I map
    And I map
    And I filter
    And I includes
    And I to be
    And I for each
    And I get process logs
    And I to be greater than or equal
    And I every
    And I to be
    And I get process metadata
    And I to be defined
    And I to be
    And I to contain
    And I to be
    And I get aggregated logs
    And I to be greater than or equal
    And I to be
    And I for each
    And I set
    And I get
    And I get
    And I to be greater than
    And I get
    And I to be greater than
    And I get
    And I to be greater than
    And I get
    And I to be greater than
    And I for each
    And I set
    And I get
    And I get
    And I to be greater than
    And I get
    And I to be greater than
    And I get time
    And I get time
    And I get aggregated logs
    And I to be greater than
    And I to be less than
    And I log
    And I log
    And I log
    Then the capture, aggregate, and query logs from a In Progress multi-process application should complete successfully

  Scenario: handle high-throughput multi-process log aggregation under load
    Given the system is initialized
    When I process id
    And I on
    And I push
    And I add log
    And I on
    And I mark process complete
    And I set
    And I log
    And I start real time monitoring
    And I log
    And I log
    And I error
    And I log
    And I log
    And I exit
    And I push
    And I log
    And I log
    And I to be
    And I for each
    And I has
    And I to be
    And I get
    And I to be
    And I to be greater than or equal
    And I get statistics
    And I to be
    And I to be
    And I to be greater than or equal
    And I get aggregated logs
    And I to be
    And I to be
    And I for each
    And I get process logs
    And I to be greater than or equal
    And I every
    And I to be
    And I some
    And I includes
    And I to be
    And I get aggregated logs
    And I get aggregated logs
    And I get aggregated logs
    And I get aggregated logs
    And I to be greater than
    And I to be greater than
    And I to be greater than
    And I to be greater than
    And I log
    And I log
    Then the handle high-throughput multi-process log aggregation under load should complete successfully

  Scenario: maintain data consistency during concurrent process lifecycle events
    Given the system is initialized
    When I quick process id
    And I long process id
    And I crash process id
    And I on
    And I push
    And I on
    And I push
    And I mark process complete
    And I on
    And I push
    And I mark process complete
    And I on
    And I push
    And I on
    And I push
    And I add log
    And I log
    And I start real time monitoring
    And I log
    And I log
    And I exit
    And I start real time monitoring
    And I log
    And I log
    And I start real time monitoring
    And I log
    And I error
    And I exit
    And I stop monitoring
    And I mark process stopped
    And I log
    And I filter
    And I filter
    And I filter
    And I filter
    And I to be
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I get process metadata
    And I get process metadata
    And I get process metadata
    And I to be
    And I to be
    And I to be
    And I get process logs
    And I get process logs
    And I get process logs
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I get statistics
    And I to be
    And I to be
    And I to be
    And I to be
    And I to be
    And I get aggregated logs
    And I to be
    And I log
    And I log
    Then the maintain data consistency during concurrent process lifecycle events should complete successfully
