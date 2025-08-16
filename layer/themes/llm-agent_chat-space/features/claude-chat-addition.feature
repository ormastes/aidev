# Converted from: layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/system/claude-chat-addition.stest.ts
# Generated on: 2025-08-16T04:16:21.663Z

Feature: Claude Chat Addition
  As a system tester
  I want to validate claude chat addition
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should correctly answer: ${question}
    Given I perform askAddition on chatSystem
    Then result should be expected

  @manual
  Scenario: Manual validation of should correctly answer: ${question}
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform askAddition on chatSystem | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | result should be expected | Pass |

  @automated @system
  Scenario: should handle a greeting and then do math
    Given I perform askComplexQuestion on chatSystem
    When I perform askAddition on chatSystem
    Then greeting should contain help
    And mathResult should be 16

  @manual
  Scenario: Manual validation of should handle a greeting and then do math
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform askComplexQuestion on chatSystem | Action completes successfully |
      | 2 | I perform askAddition on chatSystem | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | greeting should contain help | Pass |
      | mathResult should be 16 | Pass |

  @automated @system
  Scenario: should explain how to do addition
    Given I perform askComplexQuestion on chatSystem
    Then explanation.toLowerCase() should contain addition
    And explanation should contain =

  @manual
  Scenario: Manual validation of should explain how to do addition
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform askComplexQuestion on chatSystem | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | explanation.toLowerCase() should contain addition | Pass |
      | explanation should contain = | Pass |

  @automated @system
  Scenario: should handle multiple additions in one question
    Then response should contain 3 + 4 = 7
    And response should contain 10 + 20 = 30
    And response should contain 100 + 50 = 150

  @manual
  Scenario: Manual validation of should handle multiple additions in one question
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | response should contain 3 + 4 = 7 | Pass |
      | response should contain 10 + 20 = 30 | Pass |
      | response should contain 100 + 50 = 150 | Pass |

  @automated @system
  Scenario: should maintain conversation history
    Given I perform getChatHistory on chatSystem
    When the chatSystem is initialized
    Then userMessages.length should be 3
    And assistantMessages.length should be 3
    And assistantMessages[0].content should contain 10
    And assistantMessages[2].content should contain 50

  @manual
  Scenario: Manual validation of should maintain conversation history
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform getChatHistory on chatSystem | Action completes successfully |
      | 2 | the chatSystem is initialized | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | userMessages.length should be 3 | Pass |
      | assistantMessages.length should be 3 | Pass |
      | assistantMessages[0].content should contain 10 | Pass |
      | assistantMessages[2].content should contain 50 | Pass |

  @automated @system
  Scenario: should check Claude availability
    Given I perform isAvailable on claudeConnector
    Then isAvailable should be true

  @manual
  Scenario: Manual validation of should check Claude availability
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform isAvailable on claudeConnector | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | isAvailable should be true | Pass |

  @automated @system
  Scenario: should get correct answer from Claude connector
    Given I perform askClaude on claudeConnector
    Then response should contain 42

  @manual
  Scenario: Manual validation of should get correct answer from Claude connector
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform askClaude on claudeConnector | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | response should contain 42 | Pass |

