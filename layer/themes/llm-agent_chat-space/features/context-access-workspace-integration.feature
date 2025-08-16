# Converted from: layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/system/context-access-workspace-integration.stest.ts
# Generated on: 2025-08-16T04:16:21.659Z

Feature: Context Access Workspace Integration
  As a system tester
  I want to validate context access workspace integration
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should pass
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should pass
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should integrate chat with workspace context on login
    Given I perform executeCommand on system
    Then loginResult.success should be true
    And parsedResult.success should be true
    And parsedResult.message should contain AI Development Workspace
    And parsedResult.data.workspace should be AI Development Workspace
    And contextResult.success should be true
    And contextData.success should be true
    And contextData.data.workspace should be AI Development Workspace
    And contextData.data.themes should be 2
    And contextData.data.activeThemes should be 2

  @manual
  Scenario: Manual validation of should integrate chat with workspace context on login
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | loginResult.success should be true | Pass |
      | parsedResult.success should be true | Pass |
      | parsedResult.message should contain AI Development Workspace | Pass |
      | parsedResult.data.workspace should be AI Development Workspace | Pass |
      | contextResult.success should be true | Pass |
      | contextData.success should be true | Pass |
      | contextData.data.workspace should be AI Development Workspace | Pass |
      | contextData.data.themes should be 2 | Pass |
      | contextData.data.activeThemes should be 2 | Pass |

  @automated @system
  Scenario: should access workspace context through chat commands
    Given I perform executeCommand on system
    Then contextResult.success should be true
    And contextData.success should be true
    And contextData.data.workspace should be AI Development Workspace
    And contextData.data.themes should be 2
    And contextData.data.activeThemes should be 2
    And workspaceResult.success should be true
    And workspaceData.success should be true
    And workspaceData.data.project.name should be aidev-workspace
    And workspaceData.data.project.version should be 1.0.0

  @manual
  Scenario: Manual validation of should access workspace context through chat commands
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | contextResult.success should be true | Pass |
      | contextData.success should be true | Pass |
      | contextData.data.workspace should be AI Development Workspace | Pass |
      | contextData.data.themes should be 2 | Pass |
      | contextData.data.activeThemes should be 2 | Pass |
      | workspaceResult.success should be true | Pass |
      | workspaceData.success should be true | Pass |
      | workspaceData.data.project.name should be aidev-workspace | Pass |
      | workspaceData.data.project.version should be 1.0.0 | Pass |

  @automated @system
  Scenario: should list and access themes through chat
    Given I perform executeCommand on system
    Then themesResult.success should be true
    And themesData.success should be true
    And themeIds should contain pocketflow
    And themeIds should contain chat-space
    And themeResult.success should be true
    And themeData.success should be true
    And themeData.data.theme.id should be pocketflow
    And themeData.data.theme.enabled should be true
    And themeData.data.theme.configuration.maxConcurrentFlows should be 5

  @manual
  Scenario: Manual validation of should list and access themes through chat
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | themesResult.success should be true | Pass |
      | themesData.success should be true | Pass |
      | themeIds should contain pocketflow | Pass |
      | themeIds should contain chat-space | Pass |
      | themeResult.success should be true | Pass |
      | themeData.success should be true | Pass |
      | themeData.data.theme.id should be pocketflow | Pass |
      | themeData.data.theme.enabled should be true | Pass |
      | themeData.data.theme.configuration.maxConcurrentFlows should be 5 | Pass |

  @automated @system
  Scenario: should access configuration through chat
    Given I perform executeCommand on system
    Then fullConfigResult.success should be true
    And fullConfigData.success should be true
    And fullConfigData.data.configuration.logLevel should be info
    And fullConfigData.data.configuration.features.crossThemeIntegration should be true
    And logLevelResult.success should be true
    And logLevelData.success should be true
    And logLevelData.data.configuration should be info
    And nestedResult.success should be true
    And nestedData.success should be true
    And nestedData.data.configuration should be true

  @manual
  Scenario: Manual validation of should access configuration through chat
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | fullConfigResult.success should be true | Pass |
      | fullConfigData.success should be true | Pass |
      | fullConfigData.data.configuration.logLevel should be info | Pass |
      | fullConfigData.data.configuration.features.crossThemeIntegration should be true | Pass |
      | logLevelResult.success should be true | Pass |
      | logLevelData.success should be true | Pass |
      | logLevelData.data.configuration should be info | Pass |
      | nestedResult.success should be true | Pass |
      | nestedData.success should be true | Pass |
      | nestedData.data.configuration should be true | Pass |

  @automated @system
  Scenario: should read and share files from workspace
    Given I perform executeCommand on system
    And I perform getRooms on system
    When I perform getMessages on system
    Then fileResult.success should be true
    And fileData.success should be true
    And fileData.data.content should contain AI Development Workspace
    And contextMessages[0].content should contain Shared file: src/index.ts
    And contextMessages[0].contextData?.fileName should be src/index.ts

  @manual
  Scenario: Manual validation of should read and share files from workspace
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
      | 2 | I perform getRooms on system | Action completes successfully |
      | 3 | I perform getMessages on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | fileResult.success should be true | Pass |
      | fileData.success should be true | Pass |
      | fileData.data.content should contain AI Development Workspace | Pass |
      | contextMessages[0].content should contain Shared file: src/index.ts | Pass |
      | contextMessages[0].contextData?.fileName should be src/index.ts | Pass |

  @automated @system
  Scenario: should list files in workspace directories
    Given I perform executeCommand on system
    Then rootResult.success should be true
    And rootData.success should be true
    And rootData.data.files should contain package.json
    And rootData.data.files should contain workspace.json
    And rootData.data.files should contain src
    And srcResult.success should be true
    And srcData.success should be true
    And srcData.data.files should contain index.ts

  @manual
  Scenario: Manual validation of should list files in workspace directories
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | rootResult.success should be true | Pass |
      | rootData.success should be true | Pass |
      | rootData.data.files should contain package.json | Pass |
      | rootData.data.files should contain workspace.json | Pass |
      | rootData.data.files should contain src | Pass |
      | srcResult.success should be true | Pass |
      | srcData.success should be true | Pass |
      | srcData.data.files should contain index.ts | Pass |

  @automated @system
  Scenario: should share context information in chat rooms
    Given I perform executeCommand on system
    And I perform getRooms on system
    When I perform getMessages on system
    Then shareThemeResult.success should be true
    And shareThemeData.success should be true
    And shareThemeData.data.contextType should be theme
    And shareConfigResult.success should be true
    And shareConfigData.success should be true
    And shareConfigData.data.contextType should be config
    And shareWorkspaceResult.success should be true
    And shareWorkspaceData.success should be true
    And shareWorkspaceData.data.contextType should be workspace
    And messages.filter(m => m.content.includes(🎨 Shared theme)).length should be 1
    And messages.filter(m => m.content.includes(⚙️ Shared configuration)).length should be 1
    And messages.filter(m => m.content.includes(📁 Shared workspace)).length should be 1

  @manual
  Scenario: Manual validation of should share context information in chat rooms
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
      | 2 | I perform getRooms on system | Action completes successfully |
      | 3 | I perform getMessages on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | shareThemeResult.success should be true | Pass |
      | shareThemeData.success should be true | Pass |
      | shareThemeData.data.contextType should be theme | Pass |
      | shareConfigResult.success should be true | Pass |
      | shareConfigData.success should be true | Pass |
      | shareConfigData.data.contextType should be config | Pass |
      | shareWorkspaceResult.success should be true | Pass |
      | shareWorkspaceData.success should be true | Pass |
      | shareWorkspaceData.data.contextType should be workspace | Pass |
      | messages.filter(m => m.content.includes(🎨 Shared theme)).length should be 1 | Pass |
      | messages.filter(m => m.content.includes(⚙️ Shared configuration)).length should be 1 | Pass |
      | messages.filter(m => m.content.includes(📁 Shared workspace)).length should be 1 | Pass |

  @automated @system
  Scenario: should sync workspace changes
    Given I perform executeCommand on system
    When I perform getWorkspaceContext on system
    Then initialContext.success should be true
    And syncResult.success should be true
    And syncData.success should be true
    And syncData.message should be Workspace synchronized
    And configResult.success should be true
    And configData.data.configuration should be debug

  @manual
  Scenario: Manual validation of should sync workspace changes
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
      | 2 | I perform getWorkspaceContext on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | initialContext.success should be true | Pass |
      | syncResult.success should be true | Pass |
      | syncData.success should be true | Pass |
      | syncData.message should be Workspace synchronized | Pass |
      | configResult.success should be true | Pass |
      | configData.data.configuration should be debug | Pass |

  @automated @system
  Scenario: should search workspace files
    Given I perform executeCommand on system
    Then searchResult.success should be true
    And searchData.success should be true
    And searchData.data.results[0].file should be src/index.ts
    And searchData.data.results[0].content should contain console

  @manual
  Scenario: Manual validation of should search workspace files
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | searchResult.success should be true | Pass |
      | searchData.success should be true | Pass |
      | searchData.data.results[0].file should be src/index.ts | Pass |
      | searchData.data.results[0].content should contain console | Pass |

  @automated @system
  Scenario: should extract context from messages
    Given I perform executeCommand on system
    And I perform getRooms on system
    When I perform getMessages on system
    Then fileRefResult.success should be true
    And fileRefData.success should be true
    And themeRefResult.success should be true
    And themeRefData.success should be true
    And fileRefMessage?.contextData?.fileName should be index.ts
    And fileRefMessage?.contextData?.lineNumber should be 10
    And themeRefMessage?.contextData?.themeId should be pocketflow

  @manual
  Scenario: Manual validation of should extract context from messages
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
      | 2 | I perform getRooms on system | Action completes successfully |
      | 3 | I perform getMessages on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | fileRefResult.success should be true | Pass |
      | fileRefData.success should be true | Pass |
      | themeRefResult.success should be true | Pass |
      | themeRefData.success should be true | Pass |
      | fileRefMessage?.contextData?.fileName should be index.ts | Pass |
      | fileRefMessage?.contextData?.lineNumber should be 10 | Pass |
      | themeRefMessage?.contextData?.themeId should be pocketflow | Pass |

  @automated @system
  Scenario: should create workspace-aware rooms
    Given I perform executeCommand on system
    When I perform getRooms on system
    Then createResult.success should be true
    And createData.success should be true
    And createData.message should contain AI Development Workspace
    And room.metadata.workspaceName should be AI Development Workspace
    And room.metadata.purpose should be development
    And room.metadata.project should be aidev

  @manual
  Scenario: Manual validation of should create workspace-aware rooms
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
      | 2 | I perform getRooms on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | createResult.success should be true | Pass |
      | createData.success should be true | Pass |
      | createData.message should contain AI Development Workspace | Pass |
      | room.metadata.workspaceName should be AI Development Workspace | Pass |
      | room.metadata.purpose should be development | Pass |
      | room.metadata.project should be aidev | Pass |

  @automated @system
  Scenario: should handle file and configuration errors gracefully
    Given I perform executeCommand on system
    Then fileResult.success should be true
    And fileData.success should be false
    And fileData.error should be FILE_READ_ERROR
    And themeResult.success should be true
    And themeData.success should be false
    And themeData.error should be THEME_NOT_FOUND
    And shareResult.success should be true
    And shareData.success should be false
    And shareData.error should be NOT_IN_ROOM
    And searchResult.success should be true
    And searchData.success should be false
    And searchData.error should be MISSING_QUERY

  @manual
  Scenario: Manual validation of should handle file and configuration errors gracefully
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform executeCommand on system | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | fileResult.success should be true | Pass |
      | fileData.success should be false | Pass |
      | fileData.error should be FILE_READ_ERROR | Pass |
      | themeResult.success should be true | Pass |
      | themeData.success should be false | Pass |
      | themeData.error should be THEME_NOT_FOUND | Pass |
      | shareResult.success should be true | Pass |
      | shareData.success should be false | Pass |
      | shareData.error should be NOT_IN_ROOM | Pass |
      | searchResult.success should be true | Pass |
      | searchData.success should be false | Pass |
      | searchData.error should be MISSING_QUERY | Pass |

