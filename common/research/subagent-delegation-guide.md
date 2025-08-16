# Subagent Delegation Guide for Task Queue

## Overview

This guide documents how to enable and configure subagent delegation in different chat environments (Claude Code and Ollama) through the TASK_QUEUE.vf.json configuration.

## Key Concepts

### What are Subagents?
- Specialized mini-agents with their own context window
- Custom system prompts for specific tasks
- Optional tool whitelist for security
- Can be triggered implicitly (auto-delegation) or explicitly (by name)

## Configuration Structure

### 1. Environment-Specific Configuration

The task queue template now includes environment-specific subagent configurations:

```json
"subagentDelegation": {
  "enabled": true,
  "environments": {
    "claude": {
      "comment": "When in Claude Code chat space, explicitly invoke Claude subagents",
      "provider": "claude",
      "mode": "explicit",
      "agents": ["test-runner", "code-reviewer", "debugger", "documentation-writer"]
    },
    "ollama": {
      "comment": "When in Ollama chat space, enable Ollama role-based agents",
      "provider": "ollama",
      "mode": "role-based",
      "roles": ["ROLE_TESTER", "ROLE_FEATURE_MANAGER", "ROLE_GUI_COORDINATOR", "ROLE_REVIEWER"]
    }
  }
}
```

### 2. Creating Subagents

#### Interactive Method (Claude Code)
```bash
/agents
# Choose "Create New Agent"
# Write description/system prompt
# Optionally pick tools
```

#### File-based Method
```bash
# Project-level agents (highest priority)
mkdir -p .claude/agents
cat > .claude/agents/test-runner.md <<'MD'
---
name: test-runner
description: Use proactively to run tests and fix failures
# tools: Read, Grep, Glob, Bash   # Optional tool whitelist
---
You are a test automation expert. When code changes, run the right tests,
diagnose failures, apply minimal fixes, and verify.
MD

# User-level agents
mkdir -p ~/.claude/agents
# Add agent files here
```

### 3. Delegation Rules

The configuration includes automatic delegation rules:

```json
"delegationRules": {
  "autoDelegate": [
    {
      "taskType": "system_tests_implement",
      "agent": "test-runner",
      "condition": "always"
    },
    {
      "taskType": "code_review",
      "agent": "code-reviewer",
      "condition": "on_completion"
    }
  ]
}
```

## Usage Patterns

### Implicit Delegation (Auto-selection)
Claude automatically picks a matching subagent based on:
- Request text
- Agent's description
- Current context & available tools

**Tips for aggressive delegation:**
- Add phrases like "use proactively" in agent description
- Use "MUST BE USED" for critical agents

### Explicit Delegation (Manual invocation)
Direct invocation examples:
```
"Use the test-runner subagent to fix the failing tests."
"Ask the debugger subagent to investigate this error."
"Have the code-reviewer subagent look at my latest changes."
```

## Tool Inheritance

- **No tools field**: Subagent inherits all tools (including MCP tools)
- **Specific tools listed**: Limited to those tools only

## Agent Management Commands

- `/agents` - List, create, edit, delete agents
- `/agents create` - Create new agent interactively
- Check active agent when duplicates exist

## Best Practices

1. **Single Purpose**: Keep each agent focused on one task
2. **Detailed Prompts**: Write comprehensive system prompts
3. **Tool Limits**: Restrict tools when needed for security
4. **Version Control**: Track project agents in git
5. **Naming Convention**: Use descriptive names (e.g., `test-runner`, `code-reviewer`)

## Integration with Task Queue

When processing tasks from TASK_QUEUE.vf.json:

1. **Check environment**: Determine if Claude or Ollama
2. **Apply delegation rules**: Auto-delegate based on task type
3. **Enable explicit calls**: Allow manual agent invocation
4. **Track agent usage**: Log which agents handle which tasks

## Example Agent Definitions

### Test Runner Agent
```markdown
---
name: test-runner
description: Use proactively to run tests and fix failures
tools: Read, Grep, Glob, Bash, Edit
---
You are a test automation expert focused on the AI Development Platform.
When code changes, automatically:
1. Identify relevant test files
2. Run appropriate test commands
3. Diagnose failures with detailed analysis
4. Apply minimal fixes preserving code style
5. Verify all tests pass
```

### Code Reviewer Agent
```markdown
---
name: code-reviewer
description: MUST BE USED after significant code changes
tools: Read, Grep, Glob
---
You are a code quality expert. Review code for:
1. Adherence to project conventions
2. Security vulnerabilities
3. Performance issues
4. Test coverage
5. Documentation completeness
Provide actionable feedback with specific line references.
```

### Ollama Role Agent
```markdown
---
name: ollama-tester
description: Ollama-specific test automation role
provider: ollama
model: codellama:latest
---
Focus on Mock Free Test Oriented Development.
Follow RED-GREEN-REFACTOR cycle strictly.
Ensure 90% coverage minimum.
```

## Environment Detection

The system should detect the current environment and apply appropriate configuration:

```javascript
// Pseudo-code for environment detection
function getActiveEnvironment() {
  if (process.env.CLAUDE_CODE_ACTIVE) {
    return 'claude';
  } else if (process.env.OLLAMA_ACTIVE) {
    return 'ollama';
  } else {
    return 'mixed';
  }
}
```

## Practical Examples for Task Queue Processing

### Example 1: Processing System Test Implementation
```bash
# Task from TASK_QUEUE.vf.json
{
  "id": "task-test-embedded-apps",
  "type": "system_tests_implement",
  "content": "Implement System Tests for Embedded Web Applications"
}

# Claude Code approach:
"Use the test-runner subagent to implement system tests for embedded web applications from the task queue"

# Ollama approach:
"Activate ROLE_TESTER to process system test implementation task"
```

### Example 2: Code Review After Feature Implementation
```bash
# After completing a feature:
# Claude Code:
"Use the code-reviewer subagent to review the changes I just made"

# Ollama:
"Enable ROLE_REVIEWER for code quality check"
```

### Example 3: Feature Coordination
```bash
# For complex feature management:
# Claude Code:
"Use the feature-manager subagent to coordinate the log aggregation service implementation"

# Ollama:
"Activate ROLE_FEATURE_MANAGER for feature coordination"
```

## Agent Files Created

The following agents have been created in `.claude/agents/`:

1. **test-runner.md** - Test automation specialist
2. **code-reviewer.md** - Code quality enforcement
3. **ollama-tester.md** - Ollama-specific test agent
4. **feature-manager.md** - Feature coordination

## Task Queue Integration Points

The TASK_QUEUE.vf.json has been updated with:
- Subagent delegation metadata
- Environment-specific comments
- Auto-delegation triggers

## References

- [Claude Code Agents Documentation](https://docs.anthropic.com/en/docs/claude-code/agents)
- [MCP Integration Guide](../llm_rules/ROLE_FEATURE_MANAGER.md)
- [Task Queue Schema](../layer/themes/infra_filesystem-mcp/schemas/templates/TASK_QUEUE.vf.json.template)
- [Agent Definitions](../.claude/agents/)