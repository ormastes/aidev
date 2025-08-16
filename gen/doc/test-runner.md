# Comprehensive Test Runner Documentation

## Overview

The Test Runner is a comprehensive testing solution that allows running all unit, integration, and system tests for themes/epics from the project root. It provides two execution modes:
- **Normal mode** (`run-all-tests.sh`) - Direct execution
- **Virtual environment mode** (`run-all-tests-with-virtual-environment.sh`) - Safe, isolated execution

## Features

- **Comprehensive Test Coverage**: Runs unit, integration, and system tests
- **Virtual Environment Support**: Safe testing mode that isolates dangerous operations
- **Flexible Configuration**: Control test types, themes, and execution modes
- **Parallel Execution**: Speed up test runs with parallel processing
- **Coverage Reports**: Generate detailed coverage metrics
- **CI/CD Ready**: Built-in safe mode for continuous integration

## Installation

The test runner is already installed in the project. No additional setup required.

## Usage

### Basic Commands

```bash
# Run all tests for all themes
bun run test:all

# Run tests in virtual environment (recommended)
bun run test:all:virtual

# Safe mode for CI/CD (virtual + skip dangerous)
bun run test:all:safe

# Run specific test types
bun run test:all:unit        # Unit tests only
bun run test:all:integration # Integration tests only
bun run test:all:system      # System tests only

# Generate coverage report
bun run test:all:coverage

# Run tests in parallel
bun run test:all:parallel

# CI/CD optimized run
bun run test:all:ci
```

### Advanced Options

```bash
# Run tests for specific theme
./scripts/run-all-tests.sh --theme portal

# Combine multiple options
./scripts/run-all-tests.sh --virtual --coverage --parallel

# Run specific test types with coverage
./scripts/run-all-tests.sh --type unit,integration --coverage

# Verbose output for debugging
./scripts/run-all-tests.sh --verbose

# Stop on first failure
./scripts/run-all-tests.sh --fail-fast

# Virtual environment with custom options
./scripts/run-all-tests-with-virtual-environment.sh --allow-dangerous
./scripts/run-all-tests-with-virtual-environment.sh --no-virtual  # Disable virtual mode
```

## Virtual Environment Modes

### Normal Mode (Default)
- Runs tests directly on the host system
- Faster execution
- May affect system state
- Use for local development

### Virtual Mode (--virtual)
- Runs tests in isolated environment
- Uses Docker containers when available
- Falls back to subprocess isolation
- Safer for system tests
- Recommended for CI/CD

### Skip Dangerous Mode (--skip-dangerous)
- Skips tests containing potentially dangerous operations
- Checks for: sudo, rm -rf, systemctl, docker, qemu
- Can be combined with virtual mode
- Maximum safety for production environments

## Test Types

### Unit Tests
- Files: `*.test.ts`, `*.test.js`
- Location: `*/tests/unit/`
- Fast, isolated component tests
- No external dependencies

### Integration Tests
- Files: `*.itest.ts`, `*.itest.js`
- Location: `*/tests/integration/`
- Test component interactions
- May use test databases/services

### System Tests
- Files: `*.feature` (Cucumber), `*.stest.ts` (legacy)
- Location: `*/tests/system/`, `*/features/`
- End-to-end tests with Playwright
- Test complete user workflows
- Requires virtual mode for safety

## Configuration

Configuration file: `config/test-runner.config.json`

```json
{
  "testRunner": {
    "virtual": {
      "enabled": true,
      "provider": "docker",
      "dangerousPatterns": ["sudo", "rm -rf", ...]
    },
    "themes": {
      "skipList": [],
      "priorityList": ["portal_security", ...]
    },
    "coverage": {
      "threshold": {
        "global": {
          "branches": 80,
          "functions": 80,
          "lines": 80,
          "statements": 80
        }
      }
    }
  }
}
```

## Reports

Test reports are generated in: `gen/doc/test-reports/`

- **Markdown Reports**: Human-readable test results
- **Coverage Reports**: HTML coverage visualization
- **JSON Reports**: Machine-readable results for CI/CD

## Best Practices

1. **Always use virtual mode for system tests** to prevent system modifications
2. **Run tests in parallel** for faster feedback in development
3. **Use fail-fast mode** in CI/CD to save resources
4. **Generate coverage reports** to track test quality
5. **Filter by theme** when working on specific features

## Troubleshooting

### Docker not available
- The runner will fall back to subprocess isolation
- Install Docker for better isolation

### Tests timing out
- Increase timeout in Jest configuration
- Check for infinite loops in tests
- Use --verbose flag for debugging

### Coverage not generating
- Ensure all test files have proper extensions
- Check that source files are instrumented
- Verify Jest coverage configuration

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run All Tests
  run: bun run test:all:ci
```

### GitLab CI Example

```yaml
test:
  script:
    - bun run test:all:safe
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
```

## Migration Guide

If you have existing test scripts:

1. Ensure tests follow naming conventions:
   - Unit: `*.test.ts`
   - Integration: `*.itest.ts`
   - System: `*.feature` or `*.stest.ts`

2. Place tests in correct directories:
   - `theme/tests/unit/`
   - `theme/tests/integration/`
   - `theme/tests/system/`

3. Update dangerous operations to check for `VIRTUAL_ENV` variable

## Future Enhancements

- [ ] Test result caching
- [ ] Distributed test execution
- [ ] Visual regression testing
- [ ] Performance benchmarking
- [ ] Automatic test generation
- [ ] Test impact analysis