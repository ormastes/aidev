# Test Manual - llm-agent_coordinator-claude

**Generated**: 2025-08-28 00:57:51
**Theme Path**: `layer/themes/llm-agent_coordinator-claude/`

## Overview

This manual documents all tests for the llm-agent_coordinator-claude theme. It provides a comprehensive guide for understanding test coverage, test scenarios, and testing procedures.

## Theme Information

- **Type**: llm-agent
- **Component**: coordinator-claude

## Test Structure

- **Unit Tests**: 6 files
- **Integration Tests**: 4 files
- **System Tests**: 4 files

## Test Documentation

### Unit Tests

## Test File: coordinator-claude-agent-core.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/tests/unit/coordinator-claude-agent-core.test.ts`

### Test Suites

- **Coordinator Claude Agent Theme - Core Functionality**
- **pipe gateway**
- **claude API integration**
- **session management**
- **streaming responses**
- **error handling**
- **task coordination**
- **permission management**

### Test Cases

#### should export theme functionality through pipe

**Purpose**: This test verifies that should export theme functionality through pipe

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle API authentication

**Purpose**: This test verifies that should handle API authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should format messages for Claude API

**Purpose**: This test verifies that should format messages for Claude API

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle API request construction

**Purpose**: This test verifies that should handle API request construction

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse API responses

**Purpose**: This test verifies that should parse API responses

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create and manage conversation sessions

**Purpose**: This test verifies that should create and manage conversation sessions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session context limits

**Purpose**: This test verifies that should handle session context limits

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle streaming JSON responses

**Purpose**: This test verifies that should handle streaming JSON responses

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should accumulate streaming content

**Purpose**: This test verifies that should accumulate streaming content

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle API rate limiting

**Purpose**: This test verifies that should handle API rate limiting

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle network errors gracefully

**Purpose**: This test verifies that should handle network errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should coordinate with task queue system

**Purpose**: This test verifies that should coordinate with task queue system

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent requests

**Purpose**: This test verifies that should handle concurrent requests

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle dangerous operations safely

**Purpose**: This test verifies that should handle dangerous operations safely

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: claude-api-client.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/unit/claude-api-client.test.ts`

### Test Suites

- **ClaudeAPIClient Unit Tests**
- **Non-streaming messages**
- **Streaming messages**
- **Retry logic**
- **Session and metadata**

### Test Cases

#### should send a message In Progress

**Purpose**: This test verifies that should send a message In Progress

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle API errors

**Purpose**: This test verifies that should handle API errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle network errors

**Purpose**: This test verifies that should handle network errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle timeouts

**Purpose**: This test verifies that should handle timeouts

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should stream messages In Progress

**Purpose**: This test verifies that should stream messages In Progress

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle stream abortion

**Purpose**: This test verifies that should handle stream abortion

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retry on server errors

**Purpose**: This test verifies that should retry on server errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not retry on client errors

**Purpose**: This test verifies that should not retry on client errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include metadata in requests

**Purpose**: This test verifies that should include metadata in requests

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: claude-auth.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/unit/claude-auth.test.ts`

### Test Suites

- **ClaudeAuthManager**
- **API Key Authentication**
- **Local Claude Authentication**
- **Authentication Priority**
- **Validation Methods**
- **Cache Management**

### Test Cases

#### should use API key when provided

**Purpose**: This test verifies that should use API key when provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should report api-key auth type

**Purpose**: This test verifies that should report api-key auth type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should load local credentials when no API key provided

**Purpose**: This test verifies that should load local credentials when no API key provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should detect expired tokens

**Purpose**: This test verifies that should detect expired tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing credentials file

**Purpose**: This test verifies that should handle missing credentials file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle invalid credentials format

**Purpose**: This test verifies that should handle invalid credentials format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use custom credentials path

**Purpose**: This test verifies that should use custom credentials path

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should prefer API key over local credentials

**Purpose**: This test verifies that should prefer API key over local credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate API key authentication

**Purpose**: This test verifies that should validate API key authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate local authentication

**Purpose**: This test verifies that should validate local authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should fail validation with no auth

**Purpose**: This test verifies that should fail validation with no auth

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should cache loaded credentials

**Purpose**: This test verifies that should cache loaded credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should clear cache on demand

**Purpose**: This test verifies that should clear cache on demand

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: coordinator.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/unit/coordinator.test.ts`

### Test Suites

- **Coordinator Unit Tests**
- **start/stop lifecycle**
- **session management**
- **dangerous mode**
- **task management**
- **integrations**
- **error handling**
- **state management**

### Test Cases

#### should start coordinator In Progress

**Purpose**: This test verifies that should start coordinator In Progress

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should stop coordinator gracefully

**Purpose**: This test verifies that should stop coordinator gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should prevent double start

**Purpose**: This test verifies that should prevent double start

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle interrupt

**Purpose**: This test verifies that should handle interrupt

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create new session on start

**Purpose**: This test verifies that should create new session on start

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should resume existing session

**Purpose**: This test verifies that should resume existing session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw on invalid session resume

**Purpose**: This test verifies that should throw on invalid session resume

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should enable dangerous mode

**Purpose**: This test verifies that should enable dangerous mode

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should disable dangerous mode

**Purpose**: This test verifies that should disable dangerous mode

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should enable dangerous mode on startup if configured

**Purpose**: This test verifies that should enable dangerous mode on startup if configured

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should add tasks

**Purpose**: This test verifies that should add tasks

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should process tasks automatically

**Purpose**: This test verifies that should process tasks automatically

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing chat-space gracefully

**Purpose**: This test verifies that should handle missing chat-space gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing PocketFlow gracefully

**Purpose**: This test verifies that should handle missing PocketFlow gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle startup errors

**Purpose**: This test verifies that should handle startup errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track error statistics

**Purpose**: This test verifies that should track error statistics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track message statistics

**Purpose**: This test verifies that should track message statistics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track workflow executions

**Purpose**: This test verifies that should track workflow executions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: claude-api-client.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/unit/core/claude-api-client.test.ts`

### Test Suites

- **ClaudeAPIClient**
- **constructor**
- **createMessage**
- **abortStream**
- **abortAllStreams**
- **getActiveStreamCount**
- **isStreamActive**
- **createMessageWithRetry**
- **authentication methods**
- **parseSSEStream**

### Test Cases

#### should initialize with default values

**Purpose**: This test verifies that should initialize with default values

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should initialize with custom config

**Purpose**: This test verifies that should initialize with custom config

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create non-streaming message successfully

**Purpose**: This test verifies that should create non-streaming message successfully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create streaming message

**Purpose**: This test verifies that should create streaming message

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle API errors

**Purpose**: This test verifies that should handle API errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle network errors

**Purpose**: This test verifies that should handle network errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle timeout errors

**Purpose**: This test verifies that should handle timeout errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle auth errors

**Purpose**: This test verifies that should handle auth errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle JSON parse errors

**Purpose**: This test verifies that should handle JSON parse errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include metadata in request

**Purpose**: This test verifies that should include metadata in request

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should abort active stream

**Purpose**: This test verifies that should abort active stream

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return false for non-existent stream

**Purpose**: This test verifies that should return false for non-existent stream

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should abort all active streams

**Purpose**: This test verifies that should abort all active streams

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return correct stream count

**Purpose**: This test verifies that should return correct stream count

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return true for active stream

**Purpose**: This test verifies that should return true for active stream

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return false for inactive stream

**Purpose**: This test verifies that should return false for inactive stream

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should succeed on first attempt

**Purpose**: This test verifies that should succeed on first attempt

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retry on server errors

**Purpose**: This test verifies that should retry on server errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not retry on client errors

**Purpose**: This test verifies that should not retry on client errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw after max retries

**Purpose**: This test verifies that should throw after max retries

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should apply exponential backoff

**Purpose**: This test verifies that should apply exponential backoff

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should check if authenticated

**Purpose**: This test verifies that should check if authenticated

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get auth type

**Purpose**: This test verifies that should get auth type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get auth info

**Purpose**: This test verifies that should get auth info

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle stream end correctly

**Purpose**: This test verifies that should handle stream end correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse valid JSON events

**Purpose**: This test verifies that should parse valid JSON events

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle invalid JSON gracefully

**Purpose**: This test verifies that should handle invalid JSON gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: session-manager.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/unit/session-manager.test.ts`

### Test Suites

- **SessionManager Unit Tests**
- **Session lifecycle**
- **Conversation management**
- **Permission management**
- **Checkpoint management**
- **Session listing and filtering**
- **Auto-save functionality**
- **Error handling**
- **Events**

### Test Cases

#### should create a new session

**Purpose**: This test verifies that should create a new session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create session with custom permissions

**Purpose**: This test verifies that should create session with custom permissions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should save and load session

**Purpose**: This test verifies that should save and load session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session interruption

**Purpose**: This test verifies that should handle session interruption

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should resume interrupted session

**Purpose**: This test verifies that should resume interrupted session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should close session

**Purpose**: This test verifies that should close session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should add conversation entries

**Purpose**: This test verifies that should add conversation entries

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include metadata in conversation entries

**Purpose**: This test verifies that should include metadata in conversation entries

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update permissions

**Purpose**: This test verifies that should update permissions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track permission history

**Purpose**: This test verifies that should track permission history

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create checkpoint

**Purpose**: This test verifies that should create checkpoint

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should restore from checkpoint

**Purpose**: This test verifies that should restore from checkpoint

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should limit checkpoint count

**Purpose**: This test verifies that should limit checkpoint count

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should list all sessions

**Purpose**: This test verifies that should list all sessions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter sessions by state

**Purpose**: This test verifies that should filter sessions by state

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter sessions by date

**Purpose**: This test verifies that should filter sessions by date

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should auto-save sessions

**Purpose**: This test verifies that should auto-save sessions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should continue auto-save after interrupt

**Purpose**: This test verifies that should continue auto-save after interrupt

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing session

**Purpose**: This test verifies that should handle missing session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw on operations with missing session

**Purpose**: This test verifies that should throw on operations with missing session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should emit error events

**Purpose**: This test verifies that should emit error events

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should emit lifecycle events

**Purpose**: This test verifies that should emit lifecycle events

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

### Integration Tests

## Test File: pipe-integration.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/tests/integration/pipe-integration.test.ts`

### Test Suites

- **coordinator-claude-agent pipe integration**
- **module exports**
- **pipe gateway**
- **theme isolation**
- **coordinator-claude-agent theme integration**

### Test Cases

#### should export pipe module

**Purpose**: This test verifies that should export pipe module

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should have correct export structure

**Purpose**: This test verifies that should have correct export structure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should provide controlled access to theme functionality

**Purpose**: This test verifies that should provide controlled access to theme functionality

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not expose internal implementation details

**Purpose**: This test verifies that should not expose internal implementation details

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be accessible through theme architecture

**Purpose**: This test verifies that should be accessible through theme architecture

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should follow HEA architecture principles

**Purpose**: This test verifies that should follow HEA architecture principles

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: auth-integration.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/integration/auth-integration.test.ts`

### Test Suites

- **Authentication Integration Tests**
- **Local Credentials Integration**
- **Authentication Priority**
- **Real-world Scenarios**

### Test Cases

#### should create client with local credentials

**Purpose**: This test verifies that should create client with local credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should fall back to API key when local auth fails

**Purpose**: This test verifies that should fall back to API key when local auth fails

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle expired local credentials

**Purpose**: This test verifies that should handle expired local credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should prefer API key when both are available

**Purpose**: This test verifies that should prefer API key when both are available

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should work with environment variable API key

**Purpose**: This test verifies that should work with environment variable API key

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should detect actual Claude CLI credentials if present

**Purpose**: This test verifies that should detect actual Claude CLI credentials if present

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: coordinator-integration.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/integration/coordinator-integration.test.ts`

### Test Suites

- **Coordinator Integration Tests**
- **Task Queue Integration**
- **Chat-Space Integration**
- **PocketFlow Integration**
- **Session Persistence Integration**
- **End-to-End Scenarios**

### Test Cases

#### should load tasks from TASK_QUEUE.md on start

**Purpose**: This test verifies that should load tasks from TASK_QUEUE.md on start

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should process tasks with dependencies

**Purpose**: This test verifies that should process tasks with dependencies

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update task queue file when tasks In Progress

**Purpose**: This test verifies that should update task queue file when tasks In Progress

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should connect to chat-space via event bus

**Purpose**: This test verifies that should connect to chat-space via event bus

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle chat messages

**Purpose**: This test verifies that should handle chat messages

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should send task updates to chat

**Purpose**: This test verifies that should send task updates to chat

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should connect to PocketFlow via event bus

**Purpose**: This test verifies that should connect to PocketFlow via event bus

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should trigger workflows

**Purpose**: This test verifies that should trigger workflows

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle workflow action requests

**Purpose**: This test verifies that should handle workflow action requests

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should save session with integrated state

**Purpose**: This test verifies that should save session with integrated state

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should restore integrated state on resume

**Purpose**: This test verifies that should restore integrated state on resume

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle In Progress task automation flow

**Purpose**: This test verifies that should handle In Progress task automation flow

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle interrupt and resume with all integrations

**Purpose**: This test verifies that should handle interrupt and resume with all integrations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

### System Tests

## Test File: coordinator-comprehensive-system.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/system/coordinator-comprehensive-system.test.ts`

### Test Suites

- **Coordinator Comprehensive System Tests**
- **Core Coordinator Functionality**
- **Task Management through UI**
- **Session Management through UI**
- **Dangerous Mode through UI**
- **🚨 Story: Integration Workflow Tests**

### Test Cases

#### should initialize coordinator through web interface

**Purpose**: This test verifies that should initialize coordinator through web interface

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should start coordinator and create new session through UI

**Purpose**: This test verifies that should start coordinator and create new session through UI

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create and resume session through UI

**Purpose**: This test verifies that should create and resume session through UI

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should add tasks through web interface

**Purpose**: This test verifies that should add tasks through web interface

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle multiple task priorities

**Purpose**: This test verifies that should handle multiple task priorities

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create multiple sessions

**Purpose**: This test verifies that should create multiple sessions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should toggle dangerous mode

**Purpose**: This test verifies that should toggle dangerous mode

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle In Progress coordinator workflow

**Purpose**: This test verifies that should handle In Progress coordinator workflow

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: coordinator-e2e.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/system/coordinator-e2e.test.ts`

### Test Suites


### Test Cases

#### should start coordinator via CLI

**Purpose**: This test verifies that should start coordinator via CLI

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle interactive commands in terminal

**Purpose**: This test verifies that should handle interactive commands in terminal

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should resume interrupted session

**Purpose**: This test verifies that should resume interrupted session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export session data

**Purpose**: This test verifies that should export session data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should integrate with chat-space theme

**Purpose**: This test verifies that should integrate with chat-space theme

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: coordinator-realtime-system.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/system/coordinator-realtime-system.test.ts`

### Test Suites

- **Coordinator Real-time System Tests**
- **Real-time Event Streaming through UI**
- **Multi-Agent Coordination through UI**
- **Performance Monitoring through UI**
- **Session Continuity through UI**
- **Event Streaming Integration Tests**

### Test Cases

#### should stream coordinator lifecycle events in correct order

**Purpose**: This test verifies that should stream coordinator lifecycle events in correct order

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should stream task events in real-time

**Purpose**: This test verifies that should stream task events in real-time

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle message streaming

**Purpose**: This test verifies that should handle message streaming

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should coordinate multiple agents with different roles

**Purpose**: This test verifies that should coordinate multiple agents with different roles

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should provide real-time performance metrics

**Purpose**: This test verifies that should provide real-time performance metrics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain session continuity across interruptions

**Purpose**: This test verifies that should maintain session continuity across interruptions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle In Progress real-time workflow

**Purpose**: This test verifies that should handle In Progress real-time workflow

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain event ordering and timing

**Purpose**: This test verifies that should maintain event ordering and timing

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: coordinator-integration-system.test.ts

**Path**: `layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent/tests/system/coordinator-integration-system.test.ts`

### Test Suites


### Test Cases

#### should connect to chat-space and join rooms

**Purpose**: This test verifies that should connect to chat-space and join rooms

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should broadcast coordinator status to chat-space

**Purpose**: This test verifies that should broadcast coordinator status to chat-space

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should coordinate tasks through chat messages

**Purpose**: This test verifies that should coordinate tasks through chat messages

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should connect to pocketflow and register actions

**Purpose**: This test verifies that should connect to pocketflow and register actions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should trigger workflows based on task events

**Purpose**: This test verifies that should trigger workflows based on task events

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle workflow results and update tasks

**Purpose**: This test verifies that should handle workflow results and update tasks

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should coordinate between chat-space and pocketflow

**Purpose**: This test verifies that should coordinate between chat-space and pocketflow

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle agent collaboration across themes

**Purpose**: This test verifies that should handle agent collaboration across themes

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle theme connection failures gracefully

**Purpose**: This test verifies that should handle theme connection failures gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should recover from temporary theme disconnections

**Purpose**: This test verifies that should recover from temporary theme disconnections

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should test graceful degradation

**Purpose**: This test verifies that should test graceful degradation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain performance with all integrations active

**Purpose**: This test verifies that should maintain performance with all integrations active

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle stress testing of integrations

**Purpose**: This test verifies that should handle stress testing of integrations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle complete integration workflow

**Purpose**: This test verifies that should handle complete integration workflow

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---


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
