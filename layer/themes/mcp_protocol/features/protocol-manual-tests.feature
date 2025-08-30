Feature: mcp_protocol Manual Tests
  As a tester
  I want to manually test mcp_protocol functionality
  So that I can ensure system quality

  @manual @smoke
  Scenario: Manual smoke testing
    Given the mcp_protocol system is deployed
    When the tester performs smoke tests:
      | Test Area                | Basic Checks                     |
      | System startup           | Services start correctly         |
      | Basic functionality      | Core features work               |
      | Data flow                | Data processes correctly         |
      | UI responsiveness        | Interface responds to input      |
    Then all smoke tests should pass
    And system should be stable

  @manual @regression
  Scenario: Manual regression testing
    Given previous functionality is documented
    When the tester verifies:
      | Regression Area          | Verification Method              |
      | Existing features        | Test all documented features     |
      | Bug fixes                | Verify fixes still work          |
      | Performance              | Compare with baselines           |
      | Integration points       | Check all connections            |
    Then no regressions should be found
    And system should maintain quality

  @manual @exploratory
  Scenario: Manual exploratory testing
    Given the tester has system knowledge
    When the tester explores:
      | Exploration Focus        | Testing Approach                 |
      | Edge cases               | Try unusual inputs               |
      | User workflows           | Follow real user paths           |
      | Error conditions         | Intentionally cause errors       |
      | Performance limits       | Push system boundaries           |
    Then document all findings
    And report any issues discovered
