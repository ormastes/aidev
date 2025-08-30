Feature: System Test - freeze-validation
  As a system tester
  I want to manually execute system tests for freeze-validation
  So that I can verify end-to-end functionality

  Background:
    Given the test environment is prepared
    And all dependencies are available
    And test data is initialized


  @manual @system
  Scenario: Freeze Validation System Test
    Given the system is in initial state
    When I execute the test steps for: Freeze Validation System Test
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Root directory freeze validation
    Given the system is in initial state
    When I execute the test steps for: Root directory freeze validation
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should block file creation at root level
    Given the system is in initial state
    When I execute the test steps for: should block file creation at root level
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should allow platform-specific files at root
    Given the system is in initial state
    When I execute the test steps for: should allow platform-specific files at root
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should allow required root files
    Given the system is in initial state
    When I execute the test steps for: should allow required root files
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should allow files in gen/doc/
    Given the system is in initial state
    When I execute the test steps for: should allow files in gen/doc/
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should return helpful freeze message
    Given the system is in initial state
    When I execute the test steps for: should return helpful freeze message
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Theme directory freeze validation
    Given the system is in initial state
    When I execute the test steps for: Theme directory freeze validation
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should block direct file creation in theme root
    Given the system is in initial state
    When I execute the test steps for: should block direct file creation in theme root
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should allow files in theme subdirectories
    Given the system is in initial state
    When I execute the test steps for: should allow files in theme subdirectories
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: Direct wrapper usage
    Given the system is in initial state
    When I execute the test steps for: Direct wrapper usage
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should validate freeze when using VFFileStructureWrapper directly
    Given the system is in initial state
    When I execute the test steps for: should validate freeze when using VFFileStructureWrapper directly
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should include allowed structure in validation message
    Given the system is in initial state
    When I execute the test steps for: should include allowed structure in validation message
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: vf_write_validated endpoint
    Given the system is in initial state
    When I execute the test steps for: vf_write_validated endpoint
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should enforce freeze validation
    Given the system is in initial state
    When I execute the test steps for: should enforce freeze validation
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system
  Scenario: should allow valid paths
    Given the system is in initial state
    When I execute the test steps for: should allow valid paths
    Then the expected outcome should be observed
    And no errors should occur

  @manual @system @validation
  Scenario: Manual validation of test execution
    Given I have executed all test scenarios above
    When I review the test results
    Then I should document:
      | Item                    | Details Required                |
      | Test execution status   | Pass/Fail for each scenario    |
      | Performance metrics     | Response times and resource use |
      | Error logs             | Any errors encountered          |
      | Screenshots/Evidence    | Visual proof of test execution  |
      | Environment details     | Test environment configuration  |
    And create a test report with findings

  @manual @system @cleanup
  Scenario: Post-test cleanup
    Given all tests have been executed
    When I perform cleanup activities
    Then I should:
      | Cleanup Task           | Action                          |
      | Remove test data       | Delete temporary test files      |
      | Reset environment      | Restore original configuration   |
      | Close connections      | Terminate test connections       |
      | Archive results        | Save test reports and logs       |
