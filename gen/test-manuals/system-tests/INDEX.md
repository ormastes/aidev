# System Test Documentation Index

**Generated**: 2025-08-28 01:03:35
**Total Themes with System Tests**: 11

## Overview

This index provides access to detailed system test documentation for themes that include system-level testing. Each manual contains comprehensive information about test scenarios, execution procedures, and troubleshooting guides.

## Theme System Test Manuals

| Theme | Manual | Description |
|-------|--------|-------------|
| infra_docker | [View Manual](infra_docker_SYSTEM_TEST_MANUAL.md) | infra - docker system tests |
| infra_external-log-lib | [View Manual](infra_external-log-lib_SYSTEM_TEST_MANUAL.md) | infra - external-log-lib system tests |
| infra_filesystem-mcp | [View Manual](infra_filesystem-mcp_SYSTEM_TEST_MANUAL.md) | infra - filesystem-mcp system tests |
| infra_python-env | [View Manual](infra_python-env_SYSTEM_TEST_MANUAL.md) | infra - python-env system tests |
| infra_realtime | [View Manual](infra_realtime_SYSTEM_TEST_MANUAL.md) | infra - realtime system tests |
| init_env-config | [View Manual](init_env-config_SYSTEM_TEST_MANUAL.md) | init - env-config system tests |
| llm-agent_coordinator-claude | [View Manual](llm-agent_coordinator-claude_SYSTEM_TEST_MANUAL.md) | llm-agent - coordinator-claude system tests |
| llm-agent_pocketflow | [View Manual](llm-agent_pocketflow_SYSTEM_TEST_MANUAL.md) | llm-agent - pocketflow system tests |
| portal_aidev | [View Manual](portal_aidev_SYSTEM_TEST_MANUAL.md) | portal - aidev system tests |
| portal_aiide | [View Manual](portal_aiide_SYSTEM_TEST_MANUAL.md) | portal - aiide system tests |
| portal_gui-selector | [View Manual](portal_gui-selector_SYSTEM_TEST_MANUAL.md) | portal - gui-selector system tests |

## System Test Categories

### Infrastructure Tests
- Network communication
- Service integration
- Database operations
- File system operations
- Performance benchmarks

### Portal Tests
- User interface workflows
- Authentication flows
- Data visualization
- User interactions

### Agent Tests
- AI model integration
- Multi-agent coordination
- Context management
- Response validation

## Using System Test Documentation

1. **Select a theme** from the table above
2. **Review test scenarios** to understand coverage
3. **Follow execution guide** to run tests
4. **Use troubleshooting section** for issues
5. **Apply best practices** for test maintenance

## Quick Commands

### Run All System Tests
```bash
npm run test:system
```

### Generate Updated Documentation
```bash
./scripts/enhance-system-tests-documentation.sh
```

### View Test Coverage
```bash
npm run test:system:coverage
```

---
*System Test Documentation powered by test-as-manual*
