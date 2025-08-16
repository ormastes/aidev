Feature: Mockless Pocketflow Integration
  As a user of the system
  I want to ensure mockless pocketflow integration works correctly
  So that I can rely on the system's functionality

  Scenario: cli:workflow command
    Given the system is initialized
    When I get all rooms
    Then the cli:workflow command should complete successfully
