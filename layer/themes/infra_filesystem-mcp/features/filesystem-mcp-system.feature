Feature: File System MCP Operations
  As a developer
  I want to test virtual file system operations
  So that I can ensure .vf.json file handling works correctly

  Background:
    Given I have a test directory at "/tmp/test-virtual-files"
    And the portal is running at "http://localhost:3000"

  @automated @system
  Scenario: Create and read virtual file
    Given I navigate to the portal
    When I create a new .vf.json file with content:
      """
      {
        "name": "test-virtual",
        "type": "virtual",
        "content": "test content"
      }
      """
    Then the file should be created successfully
    And I should be able to read the file content

  @manual
  Scenario: Manual validation of virtual file creation
    Given the tester has access to the portal interface
    When the tester creates a new virtual file through the UI:
      | Field   | Value         |
      | Name    | test-virtual  |
      | Type    | virtual       |
      | Content | test content  |
    Then verify the file appears in the file system view
    And verify the file content can be accessed

  @automated @system
  Scenario: Update virtual file content
    Given I have an existing .vf.json file
    When I update the file content to:
      """
      {
        "name": "test-virtual",
        "type": "virtual",
        "content": "updated content"
      }
      """
    Then the file should be updated successfully
    And the new content should be readable

  @manual
  Scenario: Manual validation of file update
    Given the tester has an existing virtual file
    When the tester updates the file through the UI:
      | Field   | Value           |
      | Content | updated content |
    Then verify the changes are saved
    And verify the timestamp is updated

  @automated @system
  Scenario: Delete virtual file
    Given I have an existing .vf.json file
    When I delete the file
    Then the file should be removed from the system
    And attempting to read it should return an error

  @manual
  Scenario: Manual validation of file deletion
    Given the tester has an existing virtual file
    When the tester deletes the file through the UI
    Then verify the file is removed from the file list
    And verify the file cannot be accessed anymore

  @automated @system
  Scenario: Handle invalid JSON format
    When I try to create a .vf.json file with invalid JSON
    Then an appropriate error should be returned
    And the file should not be created

  @manual
  Scenario: Manual validation of error handling
    Given the tester is on the file creation page
    When the tester enters invalid JSON content:
      """
      { invalid json }
      """
    Then verify an error message is displayed
    And verify the file is not created