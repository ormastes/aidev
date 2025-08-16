# Converted from: common/tests-system/system/runnable-comment-system.stest.ts
# Generated on: 2025-08-16T04:16:21.630Z

Feature: Runnable Comment System
  As a system tester
  I want to validate runnable comment system
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should create demo_queue.vf.json with runnable comments and validate schema
    Then demoQueue.working_item should be null
    And fs.existsSync(demoQueuePath) should be true
    And content.queues.adhoc_temp_user_request.pop_comment.text should be write a <file>
    And content.queues.adhoc_temp_user_request.pop_comment.parameters should equal [temp/pop.txt]
    And content.queues.user_story.insert_comment.text should be write a <file>
    And content.queues.user_story.insert_comment.parameters should equal [temp/insert.txt]

  @manual
  Scenario: Manual validation of should create demo_queue.vf.json with runnable comments and validate schema
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | demoQueue.working_item should be null | Pass |
      | fs.existsSync(demoQueuePath) should be true | Pass |
      | content.queues.adhoc_temp_user_request.pop_comment.text should be write a <file> | Pass |
      | content.queues.adhoc_temp_user_request.pop_comment.parameters should equal [temp/pop.txt] | Pass |
      | content.queues.user_story.insert_comment.text should be write a <file> | Pass |
      | content.queues.user_story.insert_comment.parameters should equal [temp/insert.txt] | Pass |

  @automated @system
  Scenario: should match runnable comment to script filename
    Then scriptName should be expected

  @manual
  Scenario: Manual validation of should match runnable comment to script filename
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | scriptName should be expected | Pass |

  @automated @system
  Scenario: should execute runnable comments and create files
    Given I perform execute on matcher
    Then popResult.success should be true
    And fs.existsSync(popFilePath) should be true
    And popContent should contain Pop operation executed at
    And insertResult.success should be true
    And fs.existsSync(insertFilePath) should be true
    And insertContent should contain Insert operation executed at

  @manual
  Scenario: Manual validation of should execute runnable comments and create files
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform execute on matcher | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | popResult.success should be true | Pass |
      | fs.existsSync(popFilePath) should be true | Pass |
      | popContent should contain Pop operation executed at | Pass |
      | insertResult.success should be true | Pass |
      | fs.existsSync(insertFilePath) should be true | Pass |
      | insertContent should contain Insert operation executed at | Pass |

  @automated @system
  Scenario: should handle missing scripts gracefully
    Given I perform execute on matcher
    Then result.success should be false
    And result.error should contain No script found for

  @manual
  Scenario: Manual validation of should handle missing scripts gracefully
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform execute on matcher | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | result.success should be false | Pass |
      | result.error should contain No script found for | Pass |

  @automated @system
  Scenario: should process queue with runnable comments integration
    Then result.success should be true
    And fs.existsSync(popFilePath) should be true
    And fs.existsSync(insertFilePath) should be true

  @manual
  Scenario: Manual validation of should process queue with runnable comments integration
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | result.success should be true | Pass |
      | fs.existsSync(popFilePath) should be true | Pass |
      | fs.existsSync(insertFilePath) should be true | Pass |

