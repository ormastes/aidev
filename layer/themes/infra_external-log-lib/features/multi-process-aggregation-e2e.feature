# Converted from: layer/themes/infra_external-log-lib/user-stories/006-multi-process-aggregation/tests/system/multi-process-aggregation-e2e.stest.ts
# Generated on: 2025-08-16T04:16:21.667Z

Feature: Multi Process Aggregation E2e
  As a system tester
  I want to validate multi process aggregation e2e
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should capture and aggregate logs from multiple concurrent processes in production-like scenario
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should capture and aggregate logs from multiple concurrent processes in production-like scenario
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should handle high-volume concurrent logging from multiple processes
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle high-volume concurrent logging from multiple processes
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should maintain data integrity during process lifecycle changes
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should maintain data integrity during process lifecycle changes
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

