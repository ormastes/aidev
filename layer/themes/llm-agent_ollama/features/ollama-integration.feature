Feature: Ollama LLM Integration and Configuration
  As an AI system administrator
  I want to configure and test Ollama integration
  So that I can enable LLM capabilities in the system

  Background:
    Given Ollama is installed on the system
    And the Ollama service is running on port 11434

  @automated @integration
  Scenario: Configure Ollama role and permissions
    Given I have Ollama configuration access
    When I set the following configuration:
      """
      {
        "model": "llama2",
        "temperature": 0.7,
        "max_tokens": 2048,
        "roles": ["code_reviewer", "assistant"]
      }
      """
    Then the configuration should be saved successfully
    And Ollama should respond with the configured model

  @manual
  Scenario: Manual validation of Ollama configuration
    Given the tester has access to Ollama settings
    When the tester configures Ollama:
      | Setting          | Value              | Verification                |
      | Model selection  | llama2/codellama   | Model loads successfully    |
      | Temperature      | 0.1 to 1.0         | Response variability changes|
      | Context window   | 2048/4096/8192     | Long contexts handled       |
      | System prompt    | Custom instructions| Behavior reflects prompt    |
    Then verify all settings take effect
    And verify model behavior matches configuration

  @automated @integration
  Scenario: Test Ollama chat space functionality
    Given I have an active Ollama session
    When I send a chat message:
      """
      {
        "role": "user",
        "content": "Explain the concept of recursion"
      }
      """
    Then I should receive a response from Ollama
    And the response should be coherent and relevant

  @manual
  Scenario: Manual validation of chat interactions
    Given the tester has access to the chat interface
    When the tester tests various interactions:
      | Message Type      | Test Input                  | Expected Response Type    |
      | Code explanation  | Explain this Python code    | Technical explanation     |
      | Code generation   | Write a sorting algorithm   | Working code provided     |
      | Debugging help    | Fix this error message      | Solution suggested        |
      | Documentation     | Document this function      | Clear documentation       |
    Then verify responses are appropriate
    And verify conversation context is maintained

  @automated @roles
  Scenario: Enable and test Ollama role-based responses
    Given Ollama has multiple roles configured
    When I request a response with role "code_reviewer":
      """
      {
        "role": "code_reviewer",
        "task": "Review this pull request",
        "code": "function add(a, b) { return a + b; }"
      }
      """
    Then the response should follow code review format
    And include specific feedback points

  @manual
  Scenario: Manual validation of role-based behavior
    Given the tester can switch between Ollama roles
    When the tester tests different roles:
      | Role            | Task                      | Expected Behavior           |
      | code_reviewer   | Review code quality       | Detailed code analysis      |
      | test_generator  | Create test cases         | Comprehensive test suite    |
      | doc_writer      | Generate documentation    | Well-formatted docs         |
      | bug_analyzer    | Analyze error logs        | Root cause identification   |
    Then verify each role behaves distinctly
    And verify role-specific expertise is demonstrated

  @automated @performance
  Scenario: Test Ollama response time and throughput
    When I send 10 concurrent requests to Ollama
    Then all requests should complete within 30 seconds
    And the average response time should be under 3 seconds
    And all responses should be valid

  @manual
  Scenario: Manual performance testing
    Given the tester has performance monitoring tools
    When the tester conducts load tests:
      | Test Type         | Load Level       | Success Criteria           |
      | Response time     | Single request   | < 2 seconds                |
      | Concurrent users  | 10 simultaneous  | All complete < 30s         |
      | Sustained load    | 100 requests/min | No degradation             |
      | Memory usage      | Extended session | Stable memory footprint    |
    Then verify performance meets requirements
    And verify no memory leaks occur

  @automated @error-handling
  Scenario: Handle Ollama service failures gracefully
    Given Ollama service is stopped
    When I attempt to send a request
    Then an appropriate error message should be returned
    And the system should attempt to reconnect

  @manual
  Scenario: Manual validation of error handling
    Given the tester can control Ollama service
    When the tester simulates failure scenarios:
      | Failure Type      | Simulation Method         | Expected Recovery         |
      | Service crash     | Kill Ollama process       | Auto-restart attempted    |
      | Network issue     | Block port 11434          | Timeout and retry         |
      | Model not found   | Request invalid model     | Clear error message       |
      | Out of memory     | Large context overflow    | Graceful degradation      |
    Then verify proper error handling
    And verify system stability is maintained

  @automated @context
  Scenario: Test context window management
    Given I have a conversation with multiple messages
    When the context exceeds 2048 tokens
    Then older messages should be truncated
    And the conversation should remain coherent

  @manual
  Scenario: Manual validation of context management
    Given the tester has a long conversation thread
    When the tester tests context handling:
      | Test Case           | Action                    | Verification              |
      | Long conversation   | 50+ message exchanges     | Context maintained        |
      | Code snippets       | Large code blocks         | Full code processed       |
      | Multi-turn tasks    | Complex multi-step work   | Task continuity preserved |
      | Context reset       | Clear conversation        | Fresh start confirmed     |
    Then verify context is properly managed
    And verify no information is lost inappropriately