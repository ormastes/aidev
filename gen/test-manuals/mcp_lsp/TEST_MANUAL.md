# Test Manual - mcp_lsp

**Generated**: 2025-08-28 00:57:59
**Theme Path**: `layer/themes/mcp_lsp/`

## Overview

This manual documents all tests for the mcp_lsp theme. It provides a comprehensive guide for understanding test coverage, test scenarios, and testing procedures.

## Theme Information

- **Type**: mcp
- **Component**: lsp

## Test Structure

- **Unit Tests**: 4 files
- **Integration Tests**: 2 files
- **System Tests**: 0 files

## Test Documentation

### Unit Tests

## Test File: LSPClient.test.ts

**Path**: `layer/themes/mcp_lsp/tests/unit/LSPClient.test.ts`

### Test Suites

- **LSPClient**
- **initialize**
- **shutdown**
- **openDocument**
- **getLanguageId**
- **normalizeUri**

### Test Cases

#### should start the language server process

**Purpose**: This test verifies that should start the language server process

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle process spawn errors

**Purpose**: This test verifies that should handle process spawn errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not reinitialize if already initialized

**Purpose**: This test verifies that should not reinitialize if already initialized

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should send shutdown request and exit notification

**Purpose**: This test verifies that should send shutdown request and exit notification

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should open a document with provided content

**Purpose**: This test verifies that should open a document with provided content

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should read file content if not provided

**Purpose**: This test verifies that should read file content if not provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return correct language IDs for file extensions

**Purpose**: This test verifies that should return correct language IDs for file extensions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should normalize file paths to URIs

**Purpose**: This test verifies that should normalize file paths to URIs

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: LSPManager.test.ts

**Path**: `layer/themes/mcp_lsp/tests/unit/LSPManager.test.ts`

### Test Suites

- **LSPManager**
- **createInstance**
- **getInstance**
- **setActiveInstance**
- **removeInstance**
- **getInstanceByPath**
- **ensureInstanceForWorkspace**
- **findWorkspaceRoot**
- **shutdownAll**
- **events**

### Test Cases

#### should create a new LSP instance

**Purpose**: This test verifies that should create a new LSP instance

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate unique ID if name conflicts

**Purpose**: This test verifies that should generate unique ID if name conflicts

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use provided ID if specified

**Purpose**: This test verifies that should use provided ID if specified

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error if ID already exists

**Purpose**: This test verifies that should throw error if ID already exists

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should initialize instance in background

**Purpose**: This test verifies that should initialize instance in background

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get instance by ID

**Purpose**: This test verifies that should get instance by ID

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get active instance if no ID provided

**Purpose**: This test verifies that should get active instance if no ID provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null if instance not found

**Purpose**: This test verifies that should return null if instance not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set active instance

**Purpose**: This test verifies that should set active instance

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update last used time

**Purpose**: This test verifies that should update last used time

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error if instance not found

**Purpose**: This test verifies that should throw error if instance not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should remove instance and shutdown client

**Purpose**: This test verifies that should remove instance and shutdown client

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update default instance if removed

**Purpose**: This test verifies that should update default instance if removed

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error if instance not found

**Purpose**: This test verifies that should throw error if instance not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find instance by workspace path

**Purpose**: This test verifies that should find instance by workspace path

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should normalize paths before comparison

**Purpose**: This test verifies that should normalize paths before comparison

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null if not found

**Purpose**: This test verifies that should return null if not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return existing instance if found

**Purpose**: This test verifies that should return existing instance if found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create new instance if not found

**Purpose**: This test verifies that should create new instance if not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find workspace root by package.json

**Purpose**: This test verifies that should find workspace root by package.json

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find workspace root by tsconfig.json

**Purpose**: This test verifies that should find workspace root by tsconfig.json

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should default to file directory if no project files found

**Purpose**: This test verifies that should default to file directory if no project files found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should shutdown all instances

**Purpose**: This test verifies that should shutdown all instances

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should emit instanceCreated event

**Purpose**: This test verifies that should emit instanceCreated event

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should emit activeInstanceChanged event

**Purpose**: This test verifies that should emit activeInstanceChanged event

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should emit instanceRemoved event

**Purpose**: This test verifies that should emit instanceRemoved event

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: RequestMapper.test.ts

**Path**: `layer/themes/mcp_lsp/tests/unit/RequestMapper.test.ts`

### Test Suites

- **RequestMapper**
- **goToDefinition**
- **findReferences**
- **getCompletions**
- **getDocumentSymbols**
- **getHover**
- **rename**

### Test Cases

#### should map LSP definition response to Location array

**Purpose**: This test verifies that should map LSP definition response to Location array

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle array of locations

**Purpose**: This test verifies that should handle array of locations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return empty array when no definition found

**Purpose**: This test verifies that should return empty array when no definition found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find all references including declaration

**Purpose**: This test verifies that should find all references including declaration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should map completion items correctly

**Purpose**: This test verifies that should map completion items correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle completion list format

**Purpose**: This test verifies that should handle completion list format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle SymbolInformation array

**Purpose**: This test verifies that should handle SymbolInformation array

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle DocumentSymbol hierarchy

**Purpose**: This test verifies that should handle DocumentSymbol hierarchy

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should extract hover content from string

**Purpose**: This test verifies that should extract hover content from string

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should extract hover content from MarkupContent

**Purpose**: This test verifies that should extract hover content from MarkupContent

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle array of contents

**Purpose**: This test verifies that should handle array of contents

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null when no hover info

**Purpose**: This test verifies that should return null when no hover info

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should map workspace edit correctly

**Purpose**: This test verifies that should map workspace edit correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return empty edit when rename fails

**Purpose**: This test verifies that should return empty edit when rename fails

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: TypeAnalyzer.test.ts

**Path**: `layer/themes/mcp_lsp/tests/unit/TypeAnalyzer.test.ts`

### Test Suites

- **TypeAnalyzer**
- **getTypeAtPosition**
- **parseTypeInfo**
- **error handling**

### Test Cases

#### should return type info from hover

**Purpose**: This test verifies that should return type info from hover

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse const declarations

**Purpose**: This test verifies that should parse const declarations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse class declarations

**Purpose**: This test verifies that should parse class declarations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse interface declarations

**Purpose**: This test verifies that should parse interface declarations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should try signature help if hover fails

**Purpose**: This test verifies that should try signature help if hover fails

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should try definition if hover and signature fail

**Purpose**: This test verifies that should try definition if hover and signature fail

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null if all methods fail

**Purpose**: This test verifies that should return null if all methods fail

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse function signatures

**Purpose**: This test verifies that should parse function signatures

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse property declarations

**Purpose**: This test verifies that should parse property declarations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse let/var declarations

**Purpose**: This test verifies that should parse let/var declarations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle complex markdown content

**Purpose**: This test verifies that should handle complex markdown content

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors gracefully

**Purpose**: This test verifies that should handle errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle malformed responses

**Purpose**: This test verifies that should handle malformed responses

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

### Integration Tests

## Test File: lsp-mcp.integration.test.ts

**Path**: `layer/themes/mcp_lsp/tests/integration/lsp-mcp.integration.test.ts`

### Test Suites

- **LSP-MCP Integration Tests**
- **Basic Workflow**
- **Workspace Management**
- **Document Management**
- **Error Handling**

### Test Cases

#### should get type information for a position

**Purpose**: This test verifies that should get type information for a position

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find references across files

**Purpose**: This test verifies that should find references across files

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get code completions

**Purpose**: This test verifies that should get code completions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should open and close workspace

**Purpose**: This test verifies that should open and close workspace

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should manage document lifecycle

**Purpose**: This test verifies that should manage document lifecycle

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle LSP server crashes

**Purpose**: This test verifies that should handle LSP server crashes

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle malformed LSP responses

**Purpose**: This test verifies that should handle malformed LSP responses

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: multi-instance.integration.test.ts

**Path**: `layer/themes/mcp_lsp/tests/integration/multi-instance.integration.test.ts`

### Test Suites

- **Multi-Instance LSP-MCP Integration**
- **Instance Management**
- **Instance-specific Operations**
- **Instance Lifecycle**

### Test Cases

#### should create multiple instances for different projects

**Purpose**: This test verifies that should create multiple instances for different projects

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should switch between instances

**Purpose**: This test verifies that should switch between instances

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should auto-create instance based on file location

**Purpose**: This test verifies that should auto-create instance based on file location

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use specific instance when provided

**Purpose**: This test verifies that should use specific instance when provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle workspace-specific operations

**Purpose**: This test verifies that should handle workspace-specific operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle instance removal properly

**Purpose**: This test verifies that should handle instance removal properly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent operations on different instances

**Purpose**: This test verifies that should handle concurrent operations on different instances

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

### System Tests


## Testing Procedures

### Environment Setup

1. Install dependencies: `npm install`
2. Configure environment variables
3. Initialize test database (if applicable)
4. Start required services

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run system tests
npm run test:system

# Run with coverage
npm run test:coverage
```

### Test Data Management

- Test data location: `tests/fixtures/`
- Mock data: `tests/mocks/`
- Test configuration: `tests/config/`

### Continuous Integration

Tests are automatically run on:
- Pull request creation
- Push to main branch
- Nightly builds

## Coverage Requirements

- **Unit Test Coverage**: Minimum 90%
- **Integration Test Coverage**: Minimum 80%
- **System Test Coverage**: Critical paths only

## Troubleshooting

### Common Issues

1. **Test Timeout**
   - Increase timeout in test configuration
   - Check network connectivity
   - Verify service availability

2. **Test Data Issues**
   - Reset test database
   - Clear test cache
   - Regenerate fixtures

3. **Environment Issues**
   - Verify environment variables
   - Check service configurations
   - Review dependency versions

---
*Generated by test-as-manual documentation system*
