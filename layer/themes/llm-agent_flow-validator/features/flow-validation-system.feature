# Converted from: layer/themes/llm-agent_flow-validator/user-stories/009-flow-validation/tests/system/flow-validation-system.stest.ts
# Generated on: 2025-08-16T04:16:21.644Z

Feature: Flow Validation System
  As a system tester
  I want to validate flow validation system
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should validate and execute a complete flow
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should validate and execute a complete flow
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should handle validation errors properly
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle validation errors properly
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should stream flow execution events via WebSocket
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should stream flow execution events via WebSocket
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should import flows from various formats
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should import flows from various formats
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should export flows in different formats
    Given I perform json on jsonExport
    When I perform text on yamlExport
    Then jsonExport.status should be 200
    And jsonContent.id should be flow.id
    And yamlExport.status should be 200
    And yamlContent should contain id: export-test
    And yamlContent should contain type: trigger

  @manual
  Scenario: Manual validation of should export flows in different formats
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform json on jsonExport | Action completes successfully |
      | 2 | I perform text on yamlExport | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | jsonExport.status should be 200 | Pass |
      | jsonContent.id should be flow.id | Pass |
      | yamlExport.status should be 200 | Pass |
      | yamlContent should contain id: export-test | Pass |
      | yamlContent should contain type: trigger | Pass |

  @automated @system
  Scenario: should handle concurrent flow executions
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle concurrent flow executions
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should enforce rate limiting
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should enforce rate limiting
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should maintain flow version history
    Given I perform json on historyResponse
    Then history.versions[0].version should be 1.0.0
    And history.versions[1].version should be 2.0.0

  @manual
  Scenario: Manual validation of should maintain flow version history
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform json on historyResponse | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | history.versions[0].version should be 1.0.0 | Pass |
      | history.versions[1].version should be 2.0.0 | Pass |

  @automated @system
  Scenario: should recover from node failures
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should recover from node failures
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

