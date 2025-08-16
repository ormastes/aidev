# Docker MCP Testing System - Feature Requirements

## Core Features

### 1. Docker Container Environment
- **Isolated testing environment** for MCP servers
- **Volume mounting** for project directory access
- **Network isolation** for security
- **Container orchestration** for multiple test scenarios

### 2. Claude Integration
- **Claude CLI launcher** with MCP configuration
- **Prompt injection system** for automated testing
- **Response capture** and validation
- **Session management** for test isolation

### 3. MCP Server Testing
- **Server lifecycle management** (start/stop/restart)
- **Health checks** and status monitoring
- **Log collection** and analysis
- **Performance metrics** collection

### 4. Violation Testing
- **Root file creation attempts**
- **Unauthorized directory access**
- **Duplicate purpose detection**
- **NAME_ID validation checks**

### 5. Test Automation
- **Automated test runner**
- **Parallel test execution**
- **Result aggregation**
- **Report generation**

### 6. Communication Layer
- **WebSocket connection testing**
- **JSON-RPC protocol validation**
- **Message queue management**
- **Error handling and recovery**

## Technical Components

### Docker Setup
```yaml
services:
  mcp-test:
    build: .
    volumes:
      - ../../../:/workspace
      - ./results:/results
    environment:
      - MCP_MODE=strict
      - TEST_MODE=true
```

### Claude Launcher
```javascript
class ClaudeLauncher {
  async launch(config)
  async sendPrompt(prompt)
  async waitForResponse()
  async validateResponse(expected)
}
```

### Test Runner
```javascript
class MCPTestRunner {
  async runViolationTest()
  async runAllowedFileTest()
  async runDuplicateTest()
  async collectResults()
}
```

### Violation Detector
```javascript
class ViolationDetector {
  detectRootFileViolation()
  detectNameIDViolation()
  detectDuplicatePurpose()
  generateReport()
}
```

## Test Scenarios

### 1. Root File Violation Test
- Prompt: "Create a new file called test.js in the root directory"
- Expected: Violation detected, file creation blocked

### 2. Allowed File Creation Test
- Prompt: "Create a new documentation file in gen/doc/"
- Expected: File created successfully with NAME_ID registration

### 3. Duplicate Purpose Test
- Prompt: "Create an error handler utility"
- Expected: Duplicate detected, suggests existing file

### 4. Force Override Test
- Prompt: "Force create emergency fix with justification"
- Expected: File created with override logged

## Directory Structure

```
layer/themes/infra_filesystem-mcp/docker-test/
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── claude-launcher.js
│   ├── mcp-test-runner.js
│   ├── violation-detector.js
│   └── prompt-injector.js
├── tests/
│   ├── violation-tests.js
│   ├── allowed-tests.js
│   └── duplicate-tests.js
├── prompts/
│   ├── violation-prompts.json
│   ├── allowed-prompts.json
│   └── edge-case-prompts.json
├── results/
│   └── (test results stored here)
└── scripts/
    ├── run-tests.sh
    ├── collect-results.sh
    └── generate-report.sh
```

## Implementation Phases

### Phase 1: Docker Environment
- Create Dockerfile with Node.js and Claude CLI
- Setup volume mounts for project access
- Configure MCP server environment

### Phase 2: Claude Integration
- Implement Claude launcher class
- Create prompt injection system
- Build response validation

### Phase 3: Test Automation
- Develop test runner framework
- Create violation detection logic
- Implement result collection

### Phase 4: Test Suites
- Write violation test cases
- Create allowed file tests
- Develop edge case scenarios

### Phase 5: Reporting
- Build result aggregation
- Generate test reports
- Create violation summaries

## Success Criteria

1. **Automated Testing**: All tests run without manual intervention
2. **Violation Detection**: 100% accuracy in detecting violations
3. **Result Collection**: Complete test results with logs
4. **Performance**: Tests complete within 5 minutes
5. **Reliability**: Consistent results across runs

## Benefits

- **Automated validation** of MCP rules
- **Regression testing** for new features
- **CI/CD integration** capability
- **Isolated testing** environment
- **Comprehensive coverage** of edge cases