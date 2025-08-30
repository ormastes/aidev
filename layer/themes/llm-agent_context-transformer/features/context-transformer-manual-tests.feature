Feature: Context-transformer LLM Agent Manual Tests
  As an AI system operator
  I want to manually test the context-transformer agent
  So that I can ensure proper AI agent behavior

  @manual @agent-setup
  Scenario: Manual agent configuration verification
    Given the context-transformer agent is configured
    When the tester verifies:
      | Configuration Area        | Verification Points              |
      | Model connection         | API keys and endpoints valid      |
      | Prompt templates         | All prompts properly formatted    |
      | Context limits           | Within model constraints          |
      | Response handlers        | Parsing logic functional          |
    Then agent should be properly configured
    And ready for operation

  @manual @agent-behavior
  Scenario: Manual agent behavior testing
    Given the context-transformer agent is running
    When the tester tests agent responses:
      | Test Scenario            | Expected Behavior                |
      | Simple query             | Appropriate response generated    |
      | Complex task             | Breaks down into steps           |
      | Error condition          | Graceful error handling          |
      | Context overflow         | Manages context window           |
    Then agent should behave correctly
    And responses should be appropriate

  @manual @agent-integration
  Scenario: Manual agent integration testing
    Given multiple agents are available
    When the tester tests coordination:
      | Integration Test         | Expected Result                  |
      | Agent communication      | Messages passed correctly         |
      | Task delegation          | Work distributed appropriately    |
      | Result aggregation       | Outputs combined properly         |
      | Conflict resolution      | Conflicts handled gracefully      |
    Then agents should work together effectively
    And produce coherent results
