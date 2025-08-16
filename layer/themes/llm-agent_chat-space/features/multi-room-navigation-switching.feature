# Converted from: layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/system/multi-room-navigation-switching.stest.ts
# Generated on: 2025-08-16T04:16:21.653Z

Feature: Multi Room Navigation Switching
  As a system tester
  I want to validate multi room navigation switching
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should create multiple rooms and navigate between them
    Given I perform executeCommand on system
    Then room1Result.success should be true
    And room1Data.success should be true
    And room1Data.data.roomName should be general
    And room2Result.success should be true
    And room2Data.success should be true
    And room2Data.data.roomName should be dev
    And room3Result.success should be true
    And room3Data.success should be true
    And room3Data.data.roomName should be random
    And listResult.success should be true
    And listData.success should be true
    And listData.data.rooms.map((r: any) => r.name) should equal expect.arrayContaining([general, dev, random]
    And joinResult.success should be true
    And joinData.success should be true
    And switchResult.success should be true
    And switchData.success should be true
    And whereResult.success should be true
    And whereData.success should be true
    And whereData.data.roomName should be dev
    And whereData.data.roomHistory should contain room1Data.data.roomId
    And backResult.success should be true
    And backData.success should be true
    And whereAfterBackData.data.roomName should be general

  @manual
  Scenario: Manual validation of should create multiple rooms and navigate between them
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | room1Result.success should be true | Pass |
      | room1Data.success should be true | Pass |
      | room1Data.data.roomName should be general | Pass |
      | room2Result.success should be true | Pass |
      | room2Data.success should be true | Pass |
      | room2Data.data.roomName should be dev | Pass |
      | room3Result.success should be true | Pass |
      | room3Data.success should be true | Pass |
      | room3Data.data.roomName should be random | Pass |
      | listResult.success should be true | Pass |
      | listData.success should be true | Pass |
      | listData.data.rooms.map((r: any) => r.name) should equal expect.arrayContaining([general, dev, random] | Pass |
      | joinResult.success should be true | Pass |
      | joinData.success should be true | Pass |
      | switchResult.success should be true | Pass |
      | switchData.success should be true | Pass |
      | whereResult.success should be true | Pass |
      | whereData.success should be true | Pass |
      | whereData.data.roomName should be dev | Pass |
      | whereData.data.roomHistory should contain room1Data.data.roomId | Pass |
      | backResult.success should be true | Pass |
      | backData.success should be true | Pass |
      | whereAfterBackData.data.roomName should be general | Pass |

  @automated @system
  Scenario: should isolate messages between rooms
    Given I perform executeCommand on system
    Then room2HistoryResult.success should be true
    And room2History.success should be true
    And room1HistoryResult.success should be true
    And room1History.success should be true

  @manual
  Scenario: Manual validation of should isolate messages between rooms
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | room2HistoryResult.success should be true | Pass |
      | room2History.success should be true | Pass |
      | room1HistoryResult.success should be true | Pass |
      | room1History.success should be true | Pass |

  @automated @system
  Scenario: should track room history and navigation state
    Given I perform executeCommand on system
    Then whereData.success should be true
    And whereData.data.roomName should be end
    And recentResult.success should be true
    And recentData.success should be true
    And recentRoomNames should equal expect.arrayContaining([start, middle, end]
    And currentRoomInRecent.roomName should be end

  @manual
  Scenario: Manual validation of should track room history and navigation state
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | whereData.success should be true | Pass |
      | whereData.data.roomName should be end | Pass |
      | recentResult.success should be true | Pass |
      | recentData.success should be true | Pass |
      | recentRoomNames should equal expect.arrayContaining([start, middle, end] | Pass |
      | currentRoomInRecent.roomName should be end | Pass |

  @automated @system
  Scenario: should handle room navigation commands properly
    Given I perform executeCommand on system
    Then whereEmptyResult.success should be true
    And whereEmpty.success should be true
    And whereInRoomResult.success should be true
    And whereInRoom.success should be true
    And whereInRoom.data.roomName should be test1
    And infoResult.success should be true
    And infoData.success should be true
    And infoData.data.room.name should be test1
    And infoData.data.room.metadata.description should be Test room 1
    And infoData.data.isCurrent should be true
    And infoResult2.success should be true
    And infoData2.success should be true
    And infoData2.data.room.name should be test2
    And infoData2.data.isCurrent should be false
    And whoResult.success should be true
    And whoData.success should be true
    And whoData.data.users[0].username should be CommandTester
    And backEmptyResult.success should be true
    And backEmpty.success should be false
    And backEmpty.error should be NO_PREVIOUS_ROOM

  @manual
  Scenario: Manual validation of should handle room navigation commands properly
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | whereEmptyResult.success should be true | Pass |
      | whereEmpty.success should be true | Pass |
      | whereInRoomResult.success should be true | Pass |
      | whereInRoom.success should be true | Pass |
      | whereInRoom.data.roomName should be test1 | Pass |
      | infoResult.success should be true | Pass |
      | infoData.success should be true | Pass |
      | infoData.data.room.name should be test1 | Pass |
      | infoData.data.room.metadata.description should be Test room 1 | Pass |
      | infoData.data.isCurrent should be true | Pass |
      | infoResult2.success should be true | Pass |
      | infoData2.success should be true | Pass |
      | infoData2.data.room.name should be test2 | Pass |
      | infoData2.data.isCurrent should be false | Pass |
      | whoResult.success should be true | Pass |
      | whoData.success should be true | Pass |
      | whoData.data.users[0].username should be CommandTester | Pass |
      | backEmptyResult.success should be true | Pass |
      | backEmpty.success should be false | Pass |
      | backEmpty.error should be NO_PREVIOUS_ROOM | Pass |

  @automated @system
  Scenario: should handle multiple users in multiple rooms
    Given I perform executeCommand on system
    And I perform executeCommand on system2
    And the system2 is initialized
    When the system2 is cleaned up
    Then aliceHistory.success should be true
    And aliceHistory.data.messages.some((m: any) => m.content === Hello from Alice) should be true
    And bobHistory.success should be true
    And bobHistory.data.messages.some((m: any) => m.content === Hello from Bob) should be true
    And aliceWho.data.users[0].username should be Alice
    And bobWho.data.users[0].username should be Bob

  @manual
  Scenario: Manual validation of should handle multiple users in multiple rooms
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
      | 2 | I perform executeCommand on system2 | Action completes successfully |
      | 3 | the system2 is initialized | Action completes successfully |
      | 4 | the system2 is cleaned up | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | aliceHistory.success should be true | Pass |
      | aliceHistory.data.messages.some((m: any) => m.content === Hello from Alice) should be true | Pass |
      | bobHistory.success should be true | Pass |
      | bobHistory.data.messages.some((m: any) => m.content === Hello from Bob) should be true | Pass |
      | aliceWho.data.users[0].username should be Alice | Pass |
      | bobWho.data.users[0].username should be Bob | Pass |

  @automated @system
  Scenario: should handle room switching edge cases
    Given I perform executeCommand on system
    Then joinBadData.success should be false
    And joinBadData.error should be ROOM_NOT_FOUND
    And switchBadData.success should be false
    And switchBadData.error should be ROOM_NOT_FOUND
    And sendNoRoom.success should be false
    And sendNoRoom.error should be NOT_IN_ROOM
    And historyNoRoom.success should be false
    And historyNoRoom.error should be NOT_IN_ROOM
    And whoNoRoom.success should be false
    And whoNoRoom.error should be NOT_IN_ROOM
    And leaveNoRoom.success should be false
    And leaveNoRoom.error should be NOT_IN_ROOM
    And createEmpty.success should be false
    And createEmpty.error should be MISSING_ROOM_NAME
    And createDupe.success should be false
    And createDupe.error should be ROOM_CREATION_FAILED

  @manual
  Scenario: Manual validation of should handle room switching edge cases
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | joinBadData.success should be false | Pass |
      | joinBadData.error should be ROOM_NOT_FOUND | Pass |
      | switchBadData.success should be false | Pass |
      | switchBadData.error should be ROOM_NOT_FOUND | Pass |
      | sendNoRoom.success should be false | Pass |
      | sendNoRoom.error should be NOT_IN_ROOM | Pass |
      | historyNoRoom.success should be false | Pass |
      | historyNoRoom.error should be NOT_IN_ROOM | Pass |
      | whoNoRoom.success should be false | Pass |
      | whoNoRoom.error should be NOT_IN_ROOM | Pass |
      | leaveNoRoom.success should be false | Pass |
      | leaveNoRoom.error should be NOT_IN_ROOM | Pass |
      | createEmpty.success should be false | Pass |
      | createEmpty.error should be MISSING_ROOM_NAME | Pass |
      | createDupe.success should be false | Pass |
      | createDupe.error should be ROOM_CREATION_FAILED | Pass |

  @automated @system
  Scenario: should maintain room state during complex navigation patterns
    Given I perform executeCommand on system
    Then whereData.data.roomName should be beta
    And betaHistory.success should be true
    And alphaHistory.success should be true
    And recentData.success should be true
    And recentNames should contain room

  @manual
  Scenario: Manual validation of should maintain room state during complex navigation patterns
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | whereData.data.roomName should be beta | Pass |
      | betaHistory.success should be true | Pass |
      | alphaHistory.success should be true | Pass |
      | recentData.success should be true | Pass |
      | recentNames should contain room | Pass |

  @automated @system
  Scenario: should handle concurrent room operations
    Given I perform executeCommand on system
    Then data.success should be true
    And historyData.success should be true
    And listData.success should be true

  @manual
  Scenario: Manual validation of should handle concurrent room operations
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | data.success should be true | Pass |
      | historyData.success should be true | Pass |
      | listData.success should be true | Pass |

  @automated @system
  Scenario: should provide comprehensive room information and status
    Given I perform executeCommand on system
    Then listData.success should be true
    And alphaRoomInfo.messages should be 2
    And alphaRoomInfo.current should be false
    And betaRoomInfo.messages should be 1
    And betaRoomInfo.current should be true
    And alphaDetailData.success should be true
    And alphaDetailData.data.room.metadata.description should be Project Alpha development
    And alphaDetailData.data.room.metadata.priority should be high
    And alphaDetailData.data.room.metadata.team should be frontend
    And alphaDetailData.data.isCurrent should be false
    And betaDetailData.success should be true
    And betaDetailData.data.room.metadata.description should be Project Beta testing
    And betaDetailData.data.isCurrent should be true
    And whereData.success should be true
    And whereData.data.roomName should be project-beta

  @manual
  Scenario: Manual validation of should provide comprehensive room information and status
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | listData.success should be true | Pass |
      | alphaRoomInfo.messages should be 2 | Pass |
      | alphaRoomInfo.current should be false | Pass |
      | betaRoomInfo.messages should be 1 | Pass |
      | betaRoomInfo.current should be true | Pass |
      | alphaDetailData.success should be true | Pass |
      | alphaDetailData.data.room.metadata.description should be Project Alpha development | Pass |
      | alphaDetailData.data.room.metadata.priority should be high | Pass |
      | alphaDetailData.data.room.metadata.team should be frontend | Pass |
      | alphaDetailData.data.isCurrent should be false | Pass |
      | betaDetailData.success should be true | Pass |
      | betaDetailData.data.room.metadata.description should be Project Beta testing | Pass |
      | betaDetailData.data.isCurrent should be true | Pass |
      | whereData.success should be true | Pass |
      | whereData.data.roomName should be project-beta | Pass |

