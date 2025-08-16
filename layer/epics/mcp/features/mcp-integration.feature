Feature: MCP Server Integration
  As a system integrator
  I want to test MCP (Model Context Protocol) server connections
  So that I can ensure proper tool delegation and agent routing

  Background:
    Given the MCP server is running at "ws://localhost:8765"
    And the portal is accessible at "http://localhost:3000"

  @automated @integration
  Scenario: Establish WebSocket connection to MCP server
    When I connect to the MCP server
    Then the WebSocket connection should be established
    And the connection state should be "open"

  @manual
  Scenario: Manual validation of MCP server connection
    Given the tester has access to the MCP server console
    When the tester initiates a connection from the portal:
      | Action               | Expected Result           |
      | Open portal          | Portal loads successfully |
      | Check MCP status     | Status shows "Connected"  |
      | View connection logs | No errors in console      |
    Then verify the WebSocket connection is active
    And verify bidirectional communication works

  @automated @integration
  Scenario: MCP handshake protocol
    Given I have an established WebSocket connection
    When I send a handshake message:
      """
      {
        "type": "handshake",
        "version": "1.0",
        "capabilities": ["tools", "agents"]
      }
      """
    Then I should receive a handshake response
    And the response should confirm the protocol version

  @manual
  Scenario: Manual validation of handshake protocol
    Given the tester has an active MCP connection
    When the tester monitors the handshake process:
      | Step                | Verification                    |
      | Initial handshake   | Check protocol version matches  |
      | Capability exchange | Verify supported features       |
      | Session ID          | Confirm unique session created  |
    Then verify all handshake steps complete successfully

  @automated @integration
  Scenario: Tool delegation through MCP
    Given I have a connected MCP session
    When I request tool execution:
      """
      {
        "type": "tool_request",
        "tool": "file_reader",
        "params": {
          "path": "/test/sample.txt"
        }
      }
      """
    Then the tool should be executed
    And I should receive the execution result

  @manual
  Scenario: Manual validation of tool delegation
    Given the tester has access to the MCP tool interface
    When the tester executes various tools:
      | Tool         | Parameters        | Expected Output         |
      | file_reader  | /test/sample.txt  | File content displayed  |
      | code_runner  | python script     | Execution results shown |
      | data_analyzer| dataset.csv       | Analysis complete       |
    Then verify each tool executes correctly
    And verify results are properly formatted

  @automated @integration
  Scenario: Agent routing through MCP
    Given I have a connected MCP session
    When I send an agent request:
      """
      {
        "type": "agent_request",
        "agent": "code_reviewer",
        "task": "Review the latest commit"
      }
      """
    Then the request should be routed to the correct agent
    And I should receive the agent's response

  @manual
  Scenario: Manual validation of agent routing
    Given the tester has access to multiple MCP agents
    When the tester sends requests to different agents:
      | Agent          | Task                    | Expected Behavior        |
      | code_reviewer  | Review pull request     | Code analysis provided   |
      | test_runner    | Run test suite          | Test results displayed   |
      | doc_generator  | Generate documentation  | Docs created and shown   |
    Then verify requests are routed correctly
    And verify agent responses are appropriate

  @automated @error-handling
  Scenario: Handle connection failures gracefully
    Given the MCP server is unavailable
    When I attempt to connect
    Then an appropriate error message should be displayed
    And the system should attempt reconnection

  @manual
  Scenario: Manual validation of error recovery
    Given the tester can control the MCP server
    When the tester simulates various failure scenarios:
      | Scenario            | Action                  | Expected Recovery         |
      | Server crash        | Stop MCP server         | Auto-reconnect attempts   |
      | Network timeout     | Block network traffic   | Timeout error displayed   |
      | Invalid message     | Send malformed data     | Error logged, continues   |
      | Rate limiting       | Send many requests      | Throttling activated      |
    Then verify proper error handling for each scenario
    And verify the system remains stable