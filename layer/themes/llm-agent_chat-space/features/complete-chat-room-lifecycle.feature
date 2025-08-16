# Converted from: layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/system/complete-chat-room-lifecycle.stest.ts
# Generated on: 2025-08-16T04:16:21.655Z

Feature: Complete Chat Room Lifecycle
  As a system tester
  I want to validate complete chat room lifecycle
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should In Progress full user journey: login -> create room -> join -> send message -> leave
    Given I perform executeCommand on system
    And I perform getRooms on system
    When I perform getMessages on system
    Then loginResult.success should be true
    And loginData.success should be true
    And loginData.message should contain Welcome Alice
    And createResult.success should be true
    And createData.success should be true
    And createData.message should contain Room \general\ created
    And joinResult.success should be true
    And joinData.success should be true
    And joinData.message should contain Joined room \general\
    And sendResult.success should be true
    And sendData.success should be true
    And sendData.message should be Message sent
    And leaveResult.success should be true
    And leaveData.success should be true
    And leaveData.message should be Left the room
    And rooms[0].name should be general
    And rooms[0].messageCount should be 1
    And messages[0].content should be Hello everyone!
    And messages[0].username should be Alice

  @manual
  Scenario: Manual validation of should In Progress full user journey: login -> create room -> join -> send message -> leave
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
      | 2 | I perform getRooms on system | Action completes successfully |
      | 3 | I perform getMessages on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | loginResult.success should be true | Pass |
      | loginData.success should be true | Pass |
      | loginData.message should contain Welcome Alice | Pass |
      | createResult.success should be true | Pass |
      | createData.success should be true | Pass |
      | createData.message should contain Room \general\ created | Pass |
      | joinResult.success should be true | Pass |
      | joinData.success should be true | Pass |
      | joinData.message should contain Joined room \general\ | Pass |
      | sendResult.success should be true | Pass |
      | sendData.success should be true | Pass |
      | sendData.message should be Message sent | Pass |
      | leaveResult.success should be true | Pass |
      | leaveData.success should be true | Pass |
      | leaveData.message should be Left the room | Pass |
      | rooms[0].name should be general | Pass |
      | rooms[0].messageCount should be 1 | Pass |
      | messages[0].content should be Hello everyone! | Pass |
      | messages[0].username should be Alice | Pass |

  @automated @system
  Scenario: should handle multiple users through separate CLI instances
    Given I perform executeCommand on system
    Then sendResult1.success should be true

  @manual
  Scenario: Manual validation of should handle multiple users through separate CLI instances
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | sendResult1.success should be true | Pass |

  @automated @system
  Scenario: should handle room switching
    Given I perform executeCommand on system
    Then send1Result.success should be true
    And join2Result.success should be true
    And join2Data.success should be true
    And send2Result.success should be true
    And listResult.success should be true
    And listData.success should be true
    And generalHistoryResult.success should be true
    And generalHistory.success should be true
    And generalHistory.data.messages.some((m: any) => m.content === Message in general) should be true
    And devHistoryResult.success should be true
    And devHistory.success should be true
    And devHistory.data.messages.some((m: any) => m.content === Message in dev) should be true
    And generalHistory.data.messages.some((m: any) => m.content === Message in dev) should be false
    And devHistory.data.messages.some((m: any) => m.content === Message in general) should be false

  @manual
  Scenario: Manual validation of should handle room switching
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | send1Result.success should be true | Pass |
      | join2Result.success should be true | Pass |
      | join2Data.success should be true | Pass |
      | send2Result.success should be true | Pass |
      | listResult.success should be true | Pass |
      | listData.success should be true | Pass |
      | generalHistoryResult.success should be true | Pass |
      | generalHistory.success should be true | Pass |
      | generalHistory.data.messages.some((m: any) => m.content === Message in general) should be true | Pass |
      | devHistoryResult.success should be true | Pass |
      | devHistory.success should be true | Pass |
      | devHistory.data.messages.some((m: any) => m.content === Message in dev) should be true | Pass |
      | generalHistory.data.messages.some((m: any) => m.content === Message in dev) should be false | Pass |
      | devHistory.data.messages.some((m: any) => m.content === Message in general) should be false | Pass |

  @automated @system
  Scenario: should handle error scenarios gracefully
    Given I perform executeCommand on system
    Then noLoginResult.success should be true
    And noLoginData.success should be false
    And noLoginData.error should be NOT_LOGGED_IN
    And joinBadResult.success should be true
    And joinBadData.success should be false
    And joinBadData.error should be ROOM_NOT_FOUND
    And sendNoRoomResult.success should be true
    And sendNoRoomData.success should be false
    And sendNoRoomData.error should be NOT_IN_ROOM
    And duplicateResult.success should be true
    And duplicateData.success should be false
    And duplicateData.error should be ROOM_EXISTS
    And leaveNoRoomResult.success should be true
    And leaveNoRoomData.success should be false
    And leaveNoRoomData.error should be NOT_IN_ROOM
    And emptyMessageResult.success should be true
    And emptyMessageData.success should be false
    And emptyMessageData.error should be EMPTY_MESSAGE

  @manual
  Scenario: Manual validation of should handle error scenarios gracefully
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | noLoginResult.success should be true | Pass |
      | noLoginData.success should be false | Pass |
      | noLoginData.error should be NOT_LOGGED_IN | Pass |
      | joinBadResult.success should be true | Pass |
      | joinBadData.success should be false | Pass |
      | joinBadData.error should be ROOM_NOT_FOUND | Pass |
      | sendNoRoomResult.success should be true | Pass |
      | sendNoRoomData.success should be false | Pass |
      | sendNoRoomData.error should be NOT_IN_ROOM | Pass |
      | duplicateResult.success should be true | Pass |
      | duplicateData.success should be false | Pass |
      | duplicateData.error should be ROOM_EXISTS | Pass |
      | leaveNoRoomResult.success should be true | Pass |
      | leaveNoRoomData.success should be false | Pass |
      | leaveNoRoomData.error should be NOT_IN_ROOM | Pass |
      | emptyMessageResult.success should be true | Pass |
      | emptyMessageData.success should be false | Pass |
      | emptyMessageData.error should be EMPTY_MESSAGE | Pass |

  @automated @system
  Scenario: should maintain data consistency across operations
    Given I perform executeCommand on system
    And I perform getRooms on system
    When I perform getMessages on system
    Then createResult.success should be true
    And room!.messageCount should be 5
    And historyResult.success should be true
    And historyData.success should be true
    And cliMessages[i].content should be `Message ${i + 1}`
    And cliMessages[i].username should be Alice
    And messages[i].content should be `Message ${i + 1}`
    And messages[i].username should be Alice

  @manual
  Scenario: Manual validation of should maintain data consistency across operations
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
      | 2 | I perform getRooms on system | Action completes successfully |
      | 3 | I perform getMessages on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | createResult.success should be true | Pass |
      | room!.messageCount should be 5 | Pass |
      | historyResult.success should be true | Pass |
      | historyData.success should be true | Pass |
      | cliMessages[i].content should be `Message ${i + 1}` | Pass |
      | cliMessages[i].username should be Alice | Pass |
      | messages[i].content should be `Message ${i + 1}` | Pass |
      | messages[i].username should be Alice | Pass |

  @automated @system
  Scenario: should demonstrate workspace integration through file operations
    Given I perform getRooms on system
    When I perform getMessages on system
    Then await fs.access(contextFile).then(() => true).catch(() => false) should be true
    And contextData.workspace should be Chat Room AIdev Workspace
    And workspaceRoom!.messageCount should be 1
    And messages[0].content should be Testing workspace integration

  @manual
  Scenario: Manual validation of should demonstrate workspace integration through file operations
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform getRooms on system | Action completes successfully |
      | 2 | I perform getMessages on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | await fs.access(contextFile).then(() => true).catch(() => false) should be true | Pass |
      | contextData.workspace should be Chat Room AIdev Workspace | Pass |
      | workspaceRoom!.messageCount should be 1 | Pass |
      | messages[0].content should be Testing workspace integration | Pass |

  @automated @system
  Scenario: should handle concurrent operations through parallel script execution
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle concurrent operations through parallel script execution
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should handle room lifecycle edge cases
    Given I perform executeCommand on system
    Then createSpecialResult.success should be true
    And createSpecialData.success should be true
    And createEmptyResult.success should be true
    And createEmptyData.success should be false
    And sendEmptyResult.success should be true
    And sendEmptyData.success should be false
    And sendEmptyData.error should be EMPTY_MESSAGE
    And sendWhitespaceResult.success should be true
    And sendWhitespaceData.success should be false
    And sendWhitespaceData.error should be EMPTY_MESSAGE
    And sendValidResult.success should be true
    And sendValidData.success should be true

  @manual
  Scenario: Manual validation of should handle room lifecycle edge cases
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | createSpecialResult.success should be true | Pass |
      | createSpecialData.success should be true | Pass |
      | createEmptyResult.success should be true | Pass |
      | createEmptyData.success should be false | Pass |
      | sendEmptyResult.success should be true | Pass |
      | sendEmptyData.success should be false | Pass |
      | sendEmptyData.error should be EMPTY_MESSAGE | Pass |
      | sendWhitespaceResult.success should be true | Pass |
      | sendWhitespaceData.success should be false | Pass |
      | sendWhitespaceData.error should be EMPTY_MESSAGE | Pass |
      | sendValidResult.success should be true | Pass |
      | sendValidData.success should be true | Pass |

  @automated @system
  Scenario: should maintain event ordering through file timestamps
    Given I perform readdir on fs
    And I perform readFile on fs
    And I perform getRooms on system
    When I perform getMessages on system
    Then sequenceRoom!.messageCount should be 2
    And messages[0].content should be First message
    And messages[1].content should be Second message

  @manual
  Scenario: Manual validation of should maintain event ordering through file timestamps
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform readdir on fs | Action completes successfully |
      | 2 | I perform readFile on fs | Action completes successfully |
      | 3 | I perform getRooms on system | Action completes successfully |
      | 4 | I perform getMessages on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | sequenceRoom!.messageCount should be 2 | Pass |
      | messages[0].content should be First message | Pass |
      | messages[1].content should be Second message | Pass |

