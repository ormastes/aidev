Feature: Multi Process Aggregation E2e
  As a user of the system
  I want to ensure multi process aggregation e2e works correctly
  So that I can rely on the system's functionality

  Scenario: capture and aggregate logs from multiple concurrent processes in production-like scenario
    Given the system is initialized
    When I web server id
    And I worker id
    And I scheduler id
    And I on
    And I push
    And I log
    And I log
    And I floor
    And I random
    And I floor
    And I random
    And I floor
    And I random
    And I floor
    And I random
    And I log
    And I error
    And I log
    And I exit
    And I log
    And I log
    And I floor
    And I random
    And I random
    And I to string
    And I substring
    And I log
    And I random
    And I error
    And I log
    And I log
    And I exit
    And I log
    And I for each
    And I log
    And I log
    And I random
    And I error
    And I log
    And I push
    And I log
    And I for each
    And I exit
    And I join
    And I join
    And I join
    And I write file sync
    And I write file sync
    And I write file sync
    And I now
    And I start real time monitoring
    And I set
    And I start real time monitoring
    And I set
    And I start real time monitoring
    And I set
    And I on
    And I get
    And I get monitoring status
    And I now
    And I to be greater than
    And I filter
    And I includes
    And I filter
    And I includes
    And I filter
    And I includes
    And I to be greater than
    And I to be greater than
    And I to be greater than
    And I for each
    And I to have property
    And I to have property
    And I to have property
    And I to have property
    And I to have property
    And I to have property
    And I to contain
    And I get time
    And I get time
    And I to be greater than or equal
    And I filter
    And I to be greater than
    And I for each
    And I to be defined
    And I get time
    And I to be greater than
    And I get time
    And I log
    And I log
    And I log
    And I log
    And I log
    And I log
    And I log
    Then the capture and aggregate logs from multiple concurrent processes in production-like scenario should complete successfully

  Scenario: handle high-volume concurrent logging from multiple processes
    Given the system is initialized
    When I process id
    And I on
    And I push
    And I set
    And I get
    And I log
    And I random
    And I error
    And I log
    And I log
    And I exit
    And I map
    And I join
    And I to lower case
    And I write file sync
    And I now
    And I start real time monitoring
    And I push
    And I get monitoring status
    And I now
    And I reduce
    And I to be greater than or equal
    And I to be
    And I for each
    And I get
    And I to be greater than or equal
    And I for each
    And I to be truthy
    And I to be greater than
    And I to be truthy
    And I to contain
    And I log
    And I log
    And I log
    And I log
    And I round
    Then the handle high-volume concurrent logging from multiple processes should complete successfully

  Scenario: maintain data integrity during process lifecycle changes
    Given the system is initialized
    When I normal id
    And I crash id
    And I long id
    And I on
    And I push
    And I on
    And I push
    And I on
    And I push
    And I on
    And I push
    And I log
    And I log
    And I log
    And I exit
    And I log
    And I error
    And I log
    And I error
    And I exit
    And I log
    And I log
    And I join
    And I join
    And I join
    And I write file sync
    And I write file sync
    And I write file sync
    And I start real time monitoring
    And I start real time monitoring
    And I start real time monitoring
    And I stop monitoring
    And I filter
    And I filter
    And I filter
    And I to be
    And I to be greater than or equal
    And I to be greater than or equal
    And I filter
    And I includes
    And I filter
    And I includes
    And I filter
    And I includes
    And I to be greater than or equal
    And I to be greater than or equal
    And I to be greater than or equal
    And I for each
    And I to be truthy
    And I to contain
    And I to be truthy
    And I get time
    And I to be greater than
    And I get monitoring status
    And I to be
    Then the maintain data integrity during process lifecycle changes should complete successfully
