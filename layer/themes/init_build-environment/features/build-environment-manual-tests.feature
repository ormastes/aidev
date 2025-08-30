Feature: Build-environment Initialization Manual Tests
  As a system administrator
  I want to manually test build-environment initialization
  So that I can ensure proper system setup

  @manual @prerequisites
  Scenario: Manual prerequisite verification
    Given a fresh environment
    When the tester checks prerequisites:
      | Prerequisite              | Verification Method              |
      | System requirements       | Check OS and dependencies        |
      | Available resources       | Verify disk/memory/CPU           |
      | Network access           | Test required connections         |
      | Permission levels        | Verify user permissions           |
    Then all prerequisites should be met
    And initialization can proceed

  @manual @initialization
  Scenario: Manual initialization process testing
    Given prerequisites are satisfied
    When the tester performs initialization:
      | Init Step                 | Expected Outcome                 |
      | Run init scripts         | Scripts execute without errors    |
      | Create directories       | All paths created correctly       |
      | Set permissions          | Correct permissions applied       |
      | Install dependencies     | All packages installed            |
    Then initialization should complete successfully
    And system should be ready for use

  @manual @validation
  Scenario: Post-initialization manual validation
    Given initialization is complete
    When the tester validates the setup:
      | Validation Area           | Check Method                     |
      | File structure           | Verify all files present          |
      | Service status           | Check all services running        |
      | Configuration            | Validate all settings             |
      | Test execution           | Run sample tests                  |
    Then all validations should pass
    And system should be fully operational
