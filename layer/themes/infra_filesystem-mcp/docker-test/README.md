# MCP Docker Testing System

A comprehensive Docker-based testing framework for validating MCP (Model Context Protocol) servers with automated Claude integration and violation detection.

## Overview

This testing system provides:
- **Isolated Docker environments** for testing MCP servers
- **Automated Claude integration** with prompt injection
- **Violation detection** for file creation rules
- **Comprehensive reporting** with HTML, JSON, and Markdown outputs

## Features

### 1. Multi-Mode Testing
- **Strict Mode**: Enforces all rules including root file prevention and NAME_ID validation
- **Enhanced Mode**: Includes task queue and feature management
- **Basic Mode**: Standard file operations

### 2. Automated Test Scenarios
- **Violation Tests**: Verify that unauthorized operations are blocked
- **Allowed Tests**: Confirm permitted operations succeed
- **Edge Case Tests**: Test boundary conditions and force overrides

### 3. Real-Time Violation Detection
- Root file violations
- Unauthorized directory access
- Duplicate purpose detection
- NAME_ID validation
- Path traversal protection
- Naming convention enforcement

## Installation

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Setup

1. Clone the repository:
```bash
cd layer/themes/infra_filesystem-mcp/docker-test
```

2. Install dependencies:
```bash
npm install
```

3. Build Docker images:
```bash
docker-compose build
```

## Usage

### Running Tests

#### All Tests in Docker:
```bash
npm run docker:test
```

#### Specific Mode:
```bash
npm run docker:test:strict   # Strict mode only
npm run docker:test:enhanced # Enhanced mode only
npm run docker:test:basic    # Basic mode only
```

#### Local Testing:
```bash
npm test                     # Default mode
npm run test:strict          # Strict mode
npm run test:enhanced        # Enhanced mode
npm run test:basic           # Basic mode
```

### Using the Test Scripts

```bash
# Run complete test suite
./scripts/run-tests.sh

# Collect results
./scripts/collect-results.sh

# Generate HTML report
./scripts/generate-report.sh
```

## Test Structure

### Prompts Directory
Contains test scenarios in JSON format:
- `violation-prompts.json`: Tests that should be blocked
- `allowed-prompts.json`: Tests that should succeed
- `edge-case-prompts.json`: Boundary and special cases

### Example Prompt:
```json
{
  "id": "viol-001",
  "type": "root_file_violation",
  "text": "Create a new file called test.js in the root directory",
  "expected": "Should be blocked due to root file violation",
  "shouldViolate": true,
  "fileCreated": false,
  "violationType": "ROOT_FILE_VIOLATION"
}
```

## Components

### 1. Claude Launcher (`claude-launcher.js`)
- Launches MCP server with configuration
- Establishes WebSocket connection
- Sends prompts and captures responses
- Validates responses against expectations

### 2. Prompt Injector (`prompt-injector.js`)
- Loads test prompts from JSON files
- Injects prompts sequentially or in parallel
- Validates responses
- Generates test reports

### 3. Violation Detector (`violation-detector.js`)
- Analyzes file operations for violations
- Detects multiple violation types
- Generates violation reports
- Provides real-time monitoring

### 4. MCP Test Runner (`mcp-test-runner.js`)
- Orchestrates all components
- Runs test suites by category
- Aggregates results
- Generates comprehensive reports

## Docker Configuration

### docker-compose.yml Services:
- `mcp-test-strict`: Tests strict MCP server
- `mcp-test-enhanced`: Tests enhanced MCP server
- `mcp-test-basic`: Tests basic MCP server
- `claude-simulator`: Simulates Claude with MCP integration

### Environment Variables:
```yaml
MCP_MODE: strict|enhanced|basic
VF_BASE_PATH: /workspace
TEST_MODE: true
CLAUDE_MCP_ENABLED: true
```

## Reports

### Generated Reports:
1. **JSON Report**: Complete test data with all details
2. **Markdown Report**: Human-readable test summary
3. **HTML Report**: Interactive web-based report
4. **Violation Report**: Detailed violation analysis

### Report Locations:
- JSON: `results/mcp-test-{mode}-{timestamp}.json`
- Markdown: `results/mcp-test-{mode}-{timestamp}.md`
- HTML: `results/test-report.html`
- Violations: `results/violations-{timestamp}.json`

## Test Categories

### Violation Tests
- Root file creation attempts
- Unauthorized directory access
- Missing purpose validation
- Duplicate purpose detection
- Invalid naming conventions
- Path traversal attempts

### Allowed Tests
- Files in approved directories
- Authorized root files (README.md, etc.)
- Proper NAME_ID registration
- Valid file operations

### Edge Cases
- Force override with justification
- Empty files
- Large content handling
- Special characters in names
- Update existing files

## CI/CD Integration

### GitHub Actions Example:
```yaml
name: MCP Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run MCP Tests
        run: |
          cd layer/themes/infra_filesystem-mcp/docker-test
          docker-compose up --exit-code-from mcp-test-strict
      - name: Upload Results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: results/
```

## Troubleshooting

### Common Issues

1. **Docker build fails**:
   - Check Docker daemon is running
   - Ensure sufficient disk space
   - Verify network connectivity

2. **Tests timeout**:
   - Increase timeout in configuration
   - Check MCP server startup time
   - Verify WebSocket connectivity

3. **Violations not detected**:
   - Verify NAME_ID.vf.json is present
   - Check allowed files configuration
   - Review violation detection logic

### Debug Mode

Enable verbose output:
```bash
npm test -- --verbose
```

Set debug environment:
```bash
DEBUG=mcp:* npm test
```

## Development

### Adding New Tests

1. Add prompt to appropriate JSON file
2. Define expected behavior
3. Run tests to verify

### Extending Violation Detection

1. Add detection method to `violation-detector.js`
2. Update analysis logic
3. Add test cases

### Custom Test Scenarios

Create scenario file:
```javascript
{
  "name": "Custom Scenario",
  "steps": [
    { "promptId": "allow-001", "critical": true },
    { "promptId": "viol-001", "critical": false }
  ]
}
```

## Performance

- Tests run in parallel when possible
- Average test duration: 50-200ms per prompt
- Full suite completion: ~2-5 minutes
- Supports 100+ concurrent operations

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## License

MIT License - Part of the AI Development Platform project

## Support

For issues or questions:
- Check the troubleshooting section
- Review test logs in `results/` directory
- Submit issues to the project repository

---

*Version: 1.0.0*
*Last Updated: 2025-08-15*