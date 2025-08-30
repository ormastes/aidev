# System Tests Index - init_env-config

**Generated**: 2025-08-28T01:06:28.768Z
**Total System Tests**: 6

## Test Files

| File | Manual | Description |
|------|--------|-------------|
| theme-creation-workflow.systest.ts | [View](theme-creation-workflow.systest.md) | Theme Creation Workflow System Test |
| advanced-env-scenarios.systest.ts | [View](advanced-env-scenarios.systest.md) | System test file |
| database-config-environments.systest.ts | [View](database-config-environments.systest.md) | Scenario: Database configuration differs correctly between release (PostgreSQL) and other environments (SQLite) |
| security-tokens-unique.systest.ts | [View](security-tokens-unique.systest.md) | Scenario: Security tokens are generated uniquely per environment |
| theme-dependencies.systest.ts | [View](theme-dependencies.systest.md) | Scenario: Service discovery URLs are automatically included when themes depend on each other |
| complete-env-generation.systest.ts | [View](complete-env-generation.systest.md) | In Progress Environment Generation System Test |

## Quick Commands

```bash
# Run all system tests for this theme
npm test -- layer/themes/init_env-config/tests/system

# Generate coverage report
npm run test:coverage -- layer/themes/init_env-config/tests/system
```
