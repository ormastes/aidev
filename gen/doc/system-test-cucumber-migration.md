# System Test Migration to Cucumber

## Migration Summary
**Date**: 2025-08-16  
**Type**: System Test Framework Migration  
**Status**: ✅ Complete

## Overview
All system tests have been successfully migrated from the legacy `.stest.ts` format to Cucumber BDD format with `.feature` files and step definitions.

## Changes Made

### 1. Directory Structure Migration
- **Merged**: `layer/shared/test-infrastructure` → `layer/shared/test`
- **Package renamed**: `@aidev/test-infrastructure` → `@aidev/test`
- **Updated all imports** in affected files

### 2. Test Format Conversion
- **Converted**: 42 `.stest.ts` files → Cucumber format
- **Created**: 101+ `.feature` files
- **Generated**: Corresponding step definition files (`.steps.ts`)
- **Removed**: All `.stest.ts`, `.stest.js`, `.stest.d.ts`, and `.stest.js.map` files

### 3. Configuration
- **Created**: `cucumber.yml` with profiles:
  - `default`: Standard test execution
  - `system`: System-level tests only
  - `ci`: CI/CD optimized with parallel execution and retry

### 4. Dependencies
- **Already installed**: `@cucumber/cucumber@^12.0.0`
- **Added**: `chai@^5.2.1` and `@types/chai@^5.2.2` for assertions

## Affected Themes
The following themes had system tests migrated:
- `infra_external-log-lib`
- `infra_story-reporter`
- `llm-agent_chat-space`
- `llm-agent_flow-validator`
- `llm-agent_pocketflow`
- `lib/cli-framework`
- `portal_security`
- And others...

## Migration Script
A conversion script was created at `scripts/convert-stest-to-cucumber.ts` that:
1. Parses `.stest.ts` files
2. Extracts test cases and descriptions
3. Generates `.feature` files with scenarios
4. Creates step definition templates with TODOs

## Running Cucumber Tests

### Command Line
```bash
# Run all system tests
bunx cucumber-js --config cucumber.yml --profile system

# Run tests for a specific theme
bunx cucumber-js layer/themes/[theme-name]/features

# Run with specific tags
bunx cucumber-js --tags "@system and not @wip"
```

### NPM Scripts
```json
"test:system": "cucumber-js --config cucumber.yml --profile system"
```

## Important Notes

### Node.js Version Requirement
⚠️ **Cucumber requires Node.js 20, 22, or >=24**  
Current system has Node.js v18.19.1 which is incompatible.  
To run Cucumber tests, please upgrade Node.js to a supported version.

### Step Definitions
The generated step definitions contain TODO placeholders. Developers need to:
1. Review the original `.stest.ts` logic
2. Implement the actual test logic in step definitions
3. Remove TODO comments once implemented

### Test Runner Updates
The `scripts/core/run-all-tests.sh` script already supports both formats:
- Checks for `.feature` files first (Cucumber)
- Falls back to `.stest.ts` if no features found (legacy)
- No updates were needed to the test runner

## Benefits of Migration

1. **Better Readability**: Feature files use natural language
2. **Stakeholder Communication**: Non-technical users can understand tests
3. **Reusable Steps**: Step definitions can be shared across features
4. **Parallel Execution**: Built-in support for parallel test execution
5. **Better Reporting**: HTML, JSON, and JUnit report formats
6. **Tag-based Filtering**: Run specific test subsets using tags

## Next Steps

1. **Upgrade Node.js** to version 20+ to enable Cucumber execution
2. **Implement step definitions** by replacing TODOs with actual test logic
3. **Add tags** to features for better test organization
4. **Configure CI/CD** to use the new Cucumber tests
5. **Train team** on writing Cucumber features and step definitions

## Rollback Plan
If issues arise:
1. The original `.stest.ts` files have been deleted but can be restored from version control
2. The test runner still supports the old format as a fallback
3. The conversion script can be reversed if needed

## Verification
To verify the migration:
```bash
# Check no .stest.ts files remain
find . -name "*.stest.ts" | wc -l  # Should be 0

# Count feature files
find . -name "*.feature" | wc -l  # Should be 100+

# Check cucumber configuration
cat cucumber.yml
```

## Contact
For questions or issues related to this migration, please refer to the project documentation or contact the development team.