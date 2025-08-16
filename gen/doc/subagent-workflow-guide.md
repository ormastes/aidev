# Subagent Workflow Guide

## Complete Workflow for Ollama and Claude Subagent Delegation

### Table of Contents
1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Task Processing Workflow](#task-processing-workflow)
4. [Role Mapping](#role-mapping)
5. [Practical Examples](#practical-examples)
6. [Troubleshooting](#troubleshooting)

## Overview

The subagent delegation system enables automatic task routing to specialized agents based on the chat environment (Claude Code or Ollama) and task type.

### Key Components
- **Task Queue** (`TASK_QUEUE.vf.json`) - Contains tasks with type information
- **Agent Definitions** (`.claude/agents/`) - Specialized agent configurations
- **Delegation Rules** - Automatic routing based on task types
- **Environment Detection** - Determines Claude or Ollama context

## Environment Setup

### 1. Claude Code Environment

```bash
# Claude Code automatically detects agents in:
.claude/agents/        # Project-level agents (highest priority)
~/.claude/agents/      # User-level agents

# List available agents
/agents

# Environment indicator
export CLAUDE_CODE_ACTIVE=true
```

### 2. Ollama Environment

```bash
# Start Ollama service
docker run -d -p 11434:11434 ollama/ollama:latest

# Pull required model
ollama pull codellama:7b

# Environment indicator
export OLLAMA_ACTIVE=true
```

## Task Processing Workflow

### Step 1: Read Task Queue

```javascript
// Load task queue
const taskQueue = require('./TASK_QUEUE.vf.json');
const delegation = taskQueue.metadata.__subagent_delegation;
```

### Step 2: Determine Environment

```javascript
function detectEnvironment() {
  if (process.env.CLAUDE_CODE_ACTIVE) {
    return 'claude';
  } else if (process.env.OLLAMA_ACTIVE) {
    return 'ollama';
  }
  return 'mixed';
}
```

### Step 3: Process Tasks by Type

```javascript
function processTask(task) {
  const env = detectEnvironment();
  
  switch(env) {
    case 'claude':
      return processClaude(task);
    case 'ollama':
      return processOllama(task);
    case 'mixed':
      return processMixed(task);
  }
}
```

### Step 4: Delegate to Appropriate Agent

#### Claude Delegation
```javascript
function processClaude(task) {
  switch(task.type) {
    case 'system_tests_implement':
      // Explicit invocation
      return "Use the test-runner subagent to " + task.content;
    
    case 'code_review':
      return "Use the code-reviewer subagent to review changes";
    
    case 'feature_implementation':
      return "Use the feature-manager subagent to coordinate";
  }
}
```

#### Ollama Delegation
```javascript
function processOllama(task) {
  switch(task.type) {
    case 'system_tests_implement':
      return activateRole('ROLE_TESTER', task);
    
    case 'user_story':
      return activateRole('ROLE_FEATURE_MANAGER', task);
    
    case 'gui_design':
      return activateRole('ROLE_GUI_COORDINATOR', task);
  }
}

async function activateRole(roleName, task) {
  // Send to Ollama API
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'codellama:7b',
      prompt: `As ${roleName}, process task: ${task.content}`,
      stream: false
    })
  });
  return response.json();
}
```

## Role Mapping

### Task Type to Role/Agent Mapping

| Task Type | Claude Agent | Ollama Role | Auto-Delegate |
|-----------|-------------|-------------|---------------|
| `system_tests_implement` | test-runner | ROLE_TESTER | Always |
| `user_story` | feature-manager | ROLE_FEATURE_MANAGER | On demand |
| `scenarios` | test-runner | ROLE_TESTER | On demand |
| `unit_tests` | test-runner | ROLE_TESTER | Always |
| `code_review` | code-reviewer | ROLE_REVIEWER | On completion |
| `gui_design` | - | ROLE_GUI_COORDINATOR | On demand |
| `debug` | debugger | - | On failure |

### Priority Order (from TASK_QUEUE.vf.json)

```json
"priority_order": [
  "adhoc_temp_user_request",    // Highest
  "environment_tests",
  "external_tests",
  "system_tests_implement",
  "integration_tests_implement",
  "unit_tests",
  "integration_tests_verify",
  "system_tests_verify",
  "scenarios",
  "user_story",
  "coverage_duplication",
  "retrospective"               // Lowest
]
```

## Practical Examples

### Example 1: Processing System Test Task in Claude

```bash
# Task in queue
{
  "type": "system_tests_implement",
  "content": "Implement System Tests for Embedded Web Applications"
}

# Claude Code command
"Use the test-runner subagent to implement system tests for embedded web applications"

# Agent response
# test-runner agent activates with tools: Read, Grep, Glob, Bash, Edit
# Follows TDD workflow
# Generates tests with 90% coverage
```

### Example 2: Processing Feature Task in Ollama

```bash
# Task in queue
{
  "type": "user_story",
  "content": "Build Navigation and Search System"
}

# Ollama activation
curl -X POST http://localhost:11434/api/generate \
  -d '{
    "model": "codellama:7b",
    "prompt": "As ROLE_FEATURE_MANAGER, implement: Build Navigation and Search System"
  }'

# Role processes task locally
```

### Example 3: Mixed Environment Auto-Selection

```javascript
// Configuration for mixed environment
const mixed = {
  selectionCriteria: {
    taskComplexity: "high -> claude",
    localProcessing: "required -> ollama",
    default: "ollama"
  }
};

// Complex task → Claude
if (taskComplexity === 'high') {
  return "Use the feature-manager subagent";
}

// Local processing → Ollama
if (requiresLocalProcessing) {
  return activateRole('ROLE_FEATURE_MANAGER');
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Agent Not Found
```bash
# Check agent exists
ls -la .claude/agents/

# Validate agent format
head -10 .claude/agents/test-runner.md

# Should see:
# ---
# name: test-runner
# description: ...
# ---
```

#### 2. Ollama Connection Failed
```bash
# Check Ollama service
docker ps | grep ollama

# Test API
curl http://localhost:11434/api/tags

# Restart if needed
docker restart ollama-container
```

#### 3. Role Not Activating
```bash
# Run validation script
./scripts/validate-subagent-config.sh

# Check configuration
jq '.metadata.__subagent_delegation' TASK_QUEUE.vf.json

# Verify role in template
grep "ROLE_TESTER" layer/themes/infra_filesystem-mcp/schemas/templates/*.template
```

#### 4. Task Not Delegating
```javascript
// Check delegation rules
const rules = template.metadata.subagentDelegation.delegationRules;
console.log(rules.autoDelegate);

// Verify task type matches
const taskType = task.type;
const rule = rules.autoDelegate.find(r => r.taskType === taskType);
```

## Validation Checklist

Run the validation script to ensure proper setup:

```bash
./scripts/validate-subagent-config.sh
```

Expected output:
- ✅ Configuration files present
- ✅ Agent definitions exist
- ✅ Ollama roles configured
- ✅ Task types mapped
- ✅ Documentation complete
- ✅ Tests passing

## Advanced Configuration

### Custom Delegation Rules

Add to template:
```json
{
  "taskType": "custom_task",
  "agent": "custom-agent",
  "condition": "always|on_completion|on_failure"
}
```

### New Role Registration

1. Add to template environments:
```json
"ollama": {
  "roles": ["ROLE_TESTER", "ROLE_NEW_ROLE"]
}
```

2. Create agent definition:
```bash
cat > .claude/agents/new-role.md <<EOF
---
name: new-role
description: Description here
---
Agent prompt here
EOF
```

3. Update task mapping in workflow

## Summary

The subagent delegation system provides:
- **Automatic task routing** based on type
- **Environment-aware delegation** (Claude/Ollama)
- **Fallback mechanisms** for mixed environments
- **Comprehensive error handling**
- **Extensible configuration** for new agents/roles

Use this workflow to efficiently process tasks from TASK_QUEUE.vf.json with appropriate specialized agents in any environment.